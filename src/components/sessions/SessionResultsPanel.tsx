import { useMemo, useState } from 'react'
import type { SessionResults, ClinicalAlert } from '../../api/sessions'
import {
    BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
    ResponsiveContainer, ReferenceLine, Cell, Legend,
} from 'recharts'

// ── Labels ──────────────────────────────────────────────────

const JOINT_LABELS: Record<string, string> = {
    knee_flexion_right:       'Flexion genou D',
    knee_flexion_left:        'Flexion genou G',
    trunk_inclination:        'Inclinaison tronc',
    trunk_rotation:           'Rotation tronc',
    shoulder_rotation_right:  'Rotation épaule D',
    shoulder_elevation_right: 'Élévation épaule D',
    elbow_right:              'Flexion coude D',
    elbow_left:               'Flexion coude G',
    hip_right:                'Hanche D',
    hip_left:                 'Hanche G',
    pelvis_rotation:          'Rotation bassin',
    shoulder_separation:      'Séparation épaules',
    wrist_extension_right:    'Extension poignet D',
    wrist_extension_left:     'Extension poignet G',
    shoulder_elevation_left:  'Élévation épaule G',
}

const label = (key: string) => JOINT_LABELS[key] ?? key.replace(/_/g, ' ')

const SEVERITY_STYLES = {
    warning:  { bg: '#EF9F2715', border: '#EF9F2740', text: '#FAC775', icon: '⚠️' },
    critical: { bg: '#EF444415', border: '#EF444440', text: '#FCA5A5', icon: '🔴' },
}

type Tab = 'chart' | 'metrics' | 'deltas'

interface Props {
    results: SessionResults
    onExportPdf?: () => void
}

export default function SessionResultsPanel({ results, onExportPdf }: Props) {
    const [tab, setTab] = useState<Tab>('chart')

    const card = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }

    // ── Data ────────────────────────────────────────────────
    const normChartData = useMemo(() => {
        type NormComp = { measured_mean: number; normative_mean: number; within_1std: boolean; delta_degrees: number; source: string }
        return Object.entries(results.normative_comparison ?? {}).map(([joint, comp]) => {
            const c = comp as unknown as NormComp
            return {
                joint:      label(joint),
                measured:   c.measured_mean  != null ? +c.measured_mean.toFixed(1)  : 0,
                normative:  c.normative_mean != null ? +c.normative_mean.toFixed(1) : 0,
                within1std: c.within_1std    ?? false,
                delta:      c.delta_degrees  != null ? +c.delta_degrees.toFixed(1)  : 0,
                source:     c.source         ?? '',
            }
        })
    }, [results.normative_comparison])

    const metricsRows = useMemo(() => {
        return Object.entries(results.joint_metrics ?? {}).map(([joint, m]) => ({
            joint,
            label: label(joint),
            min:  m.min?.toFixed(1),
            max:  m.max?.toFixed(1),
            mean: m.mean?.toFixed(1),
            std:  m.std?.toFixed(1),
        }))
    }, [results.joint_metrics])

    const tabs: { id: Tab; label: string }[] = [
        { id: 'chart',   label: 'Comparaison normative' },
        { id: 'metrics', label: 'Métriques articulaires' },
        { id: 'deltas',  label: `Écarts Δ (${normChartData.length})` },
    ]

    return (
        <div className="space-y-4">

            {/* ── Top bar: stats + phases + export ── */}
            <div className="rounded-xl p-4" style={card}>
                <div className="flex items-center justify-between mb-3">
                    {/* Stats inline */}
                    <div className="flex items-center gap-4 flex-wrap">
                        {[
                            { label: 'Pipeline', value: results.pipeline_mode ?? '—' },
                            { label: 'Frames',   value: results.total_frames?.toString() ?? '—' },
                            { label: 'Geste',    value: results.gesture_type ?? '—' },
                        ].map((s) => (
                            <div key={s.label} className="flex items-center gap-1.5">
                                <span className="text-xs" style={{ color: '#64748B' }}>{s.label}</span>
                                <span className="text-xs font-medium text-white">{s.value}</span>
                            </div>
                        ))}
                        {/* Alertes count */}
                        {results.alerts && results.alerts.length > 0 && (
                            <span
                                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
                                style={{ backgroundColor: '#EF444415', color: '#FCA5A5', border: '0.5px solid #EF444430' }}
                            >
                                ⚠️ {results.alerts.length} alerte{results.alerts.length > 1 ? 's' : ''}
                            </span>
                        )}
                    </div>
                    {onExportPdf && (
                        <button
                            onClick={onExportPdf}
                            className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 flex-shrink-0"
                            style={{ backgroundColor: '#6366F120', color: '#A5B4FC', border: '0.5px solid #6366F140' }}
                        >
                            Exporter PDF
                        </button>
                    )}
                </div>

                {/* Phase badges */}
                {results.phase_annotations && Object.keys(results.phase_annotations).length > 0 && (
                    <div className="flex flex-wrap gap-2">
                        {Object.entries(results.phase_annotations).map(([phase, frame]) => (
                            <span
                                key={phase}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                                style={{ backgroundColor: '#38BDF808', color: '#38BDF8', border: '0.5px solid #38BDF825' }}
                            >
                                {phase.replace(/_/g, ' ')}
                                <span className="font-medium" style={{ color: '#64748B' }}>#{frame}</span>
                            </span>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Alertes cliniques (si présentes) ── */}
            {results.alerts && results.alerts.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {results.alerts.map((alert: ClinicalAlert, i: number) => {
                        const s = SEVERITY_STYLES[alert.severity] ?? SEVERITY_STYLES.warning
                        return (
                            <div
                                key={i}
                                className="rounded-xl px-4 py-3 flex items-start gap-3"
                                style={{ backgroundColor: s.bg, border: `0.5px solid ${s.border}` }}
                            >
                                <span className="text-sm flex-shrink-0">{s.icon}</span>
                                <div className="flex-1 min-w-0">
                                    <p className="text-xs font-medium" style={{ color: s.text }}>{label(alert.joint)}</p>
                                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                                        {alert.value?.toFixed(1)}° · seuil {alert.threshold?.toFixed(1)}°
                                        {alert.reference && <span className="ml-1">({alert.reference})</span>}
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}

            {/* ── Tabs ── */}
            <div className="rounded-xl overflow-hidden" style={card}>
                {/* Tab bar */}
                <div className="flex" style={{ borderBottom: '0.5px solid #1E3A5F' }}>
                    {tabs.map((t) => (
                        <button
                            key={t.id}
                            onClick={() => setTab(t.id)}
                            className="flex-1 py-3 text-xs font-medium transition-all"
                            style={{
                                color:           tab === t.id ? '#38BDF8' : '#64748B',
                                backgroundColor: tab === t.id ? '#38BDF808' : 'transparent',
                                borderBottom:    tab === t.id ? '2px solid #38BDF8' : '2px solid transparent',
                            }}
                        >
                            {t.label}
                        </button>
                    ))}
                </div>

                {/* Tab content */}
                <div className="p-5">

                    {/* ── Tab 1: Comparaison normative ── */}
                    {tab === 'chart' && normChartData.length > 0 && (
                        <div>
                            <div style={{ width: '100%', height: normChartData.length * 52 + 60, minHeight: 280 }}>
                                <ResponsiveContainer>
                                    <BarChart
                                        data={normChartData}
                                        layout="vertical"
                                        margin={{ top: 5, right: 30, left: 10, bottom: 5 }}
                                    >
                                        <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                                        <XAxis type="number" tick={{ fill: '#94A3B8', fontSize: 11 }} unit="°" />
                                        <YAxis
                                            type="category"
                                            dataKey="joint"
                                            tick={{ fill: '#94A3B8', fontSize: 11 }}
                                            width={130}
                                        />
                                        <Tooltip
                                            contentStyle={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F', borderRadius: 8, fontSize: 12 }}
                                            labelStyle={{ color: '#fff', fontWeight: 500 }}
                                            itemStyle={{ color: '#94A3B8' }}
                                            formatter={(value: number, name: string) => [`${value}°`, name === 'measured' ? 'Mesuré' : 'Normative']}
                                        />
                                        <Legend
                                            formatter={(value: string) => value === 'measured' ? 'Mesuré' : 'Normative'}
                                            wrapperStyle={{ fontSize: 12, color: '#94A3B8' }}
                                        />
                                        <ReferenceLine x={0} stroke="#1E3A5F" />
                                        <Bar dataKey="normative" fill="#6366F155" radius={[0, 4, 4, 0]} barSize={12} />
                                        <Bar dataKey="measured" radius={[0, 4, 4, 0]} barSize={12}>
                                            {normChartData.map((entry, index) => (
                                                <Cell key={index} fill={entry.within1std ? '#10F5A0' : '#EF4444'} />
                                            ))}
                                        </Bar>
                                    </BarChart>
                                </ResponsiveContainer>
                            </div>
                            <div className="flex items-center gap-4 mt-2">
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#10F5A0' }} />
                                    <span className="text-xs" style={{ color: '#94A3B8' }}>Dans 1σ</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF4444' }} />
                                    <span className="text-xs" style={{ color: '#94A3B8' }}>Hors 1σ</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* ── Tab 2: Métriques articulaires ── */}
                    {tab === 'metrics' && metricsRows.length > 0 && (
                        <div className="overflow-x-auto">
                            <table className="w-full text-left text-xs">
                                <thead>
                                <tr style={{ borderBottom: '0.5px solid #1E3A5F' }}>
                                    {['Articulation', 'Min', 'Max', 'Moy', 'Écart-type'].map((h) => (
                                        <th key={h} className="pb-2.5 pr-5 font-medium" style={{ color: '#64748B' }}>{h}</th>
                                    ))}
                                </tr>
                                </thead>
                                <tbody>
                                {metricsRows.map((row) => (
                                    <tr key={row.joint} style={{ borderBottom: '0.5px solid #0A1628' }}>
                                        <td className="py-2 pr-5 text-white">{row.label}</td>
                                        <td className="py-2 pr-5" style={{ color: '#94A3B8' }}>{row.min}°</td>
                                        <td className="py-2 pr-5" style={{ color: '#94A3B8' }}>{row.max}°</td>
                                        <td className="py-2 pr-5 font-medium" style={{ color: '#38BDF8' }}>{row.mean}°</td>
                                        <td className="py-2 pr-5" style={{ color: '#64748B' }}>±{row.std}°</td>
                                    </tr>
                                ))}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* ── Tab 3: Écarts Δ ── */}
                    {tab === 'deltas' && normChartData.length > 0 && (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                            {normChartData.map((d) => {
                                const ok = d.within1std
                                return (
                                    <div
                                        key={d.joint}
                                        className="rounded-lg px-3 py-2.5 flex items-center justify-between gap-3"
                                        style={{
                                            backgroundColor: ok ? '#10F5A008' : '#EF444408',
                                            border: `0.5px solid ${ok ? '#10F5A022' : '#EF444422'}`,
                                        }}
                                    >
                                        <div className="min-w-0">
                                            <p className="text-xs text-white truncate">{d.joint}</p>
                                            <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>
                                                {d.measured}° vs {d.normative}°
                                                {d.source && <span className="ml-1">({d.source})</span>}
                                            </p>
                                        </div>
                                        <span
                                            className="text-sm font-medium tabular-nums flex-shrink-0"
                                            style={{ color: ok ? '#10F5A0' : '#EF4444' }}
                                        >
                                            {d.delta > 0 ? '+' : ''}{d.delta}°
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}
