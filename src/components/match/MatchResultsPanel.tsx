import { useState } from 'react'
import {
    ResponsiveContainer, PieChart, Pie, Cell, Tooltip,
    BarChart, Bar, XAxis, YAxis, CartesianGrid,
} from 'recharts'
import type { MatchMetrics, SetStats, GestureType } from '../../api/match-sessions'
import { GESTURE_LABELS, GESTURE_COLORS, sortedGestures, getWinRate } from '../../api/match-sessions'

// ── Design tokens ────────────────────────────────────────────
const card   = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' } as const
const inner  = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' } as const

// ── Tooltip Recharts ─────────────────────────────────────────
function ChartTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl px-3 py-2 text-xs" style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}>
            {label && <p className="text-white font-medium mb-1">{label}</p>}
            {payload.map((p: any, i: number) => (
                <p key={i} style={{ color: p.color ?? '#94A3B8' }}>
                    {p.name} : <span className="font-medium">{p.value}</span>
                </p>
            ))}
        </div>
    )
}

// ── Court 2D SVG ─────────────────────────────────────────────
function TennisCourt({ events }: { events: MatchMetrics['gesture_events'] }) {
    const CW = 260, CH = 160  // court width/height en px SVG

    // Filtrer les events avec position connue
    const withPos = events.filter(e => e.player_x !== null && e.player_y !== null)

    const gestureColors: Record<string, string> = {
        forehand: '#38BDF8',
        backhand: '#10F5A0',
        serve:    '#6366F1',
        volley:   '#F59E0B',
        unknown:  '#475569',
    }

    return (
        <svg
            viewBox={`0 0 ${CW + 60} ${CH + 40}`}
            style={{ width: '100%', maxWidth: 360 }}
            role="img"
            aria-label="Court de tennis vue du dessus avec positions des frappes"
        >
            {/* Fond court */}
            <rect x="30" y="10" width={CW} height={CH} fill="#0A2040" stroke="#1E3A5F" strokeWidth="1" rx="2" />

            {/* Lignes du court */}
            {/* Ligne de fond */}
            <line x1="30" y1="10"  x2={30 + CW} y2="10"       stroke="#1E5A8A" strokeWidth="1" />
            <line x1="30" y1={10 + CH} x2={30 + CW} y2={10 + CH} stroke="#1E5A8A" strokeWidth="1" />
            {/* Lignes de côté */}
            <line x1="30"       y1="10" x2="30"       y2={10 + CH} stroke="#1E5A8A" strokeWidth="1" />
            <line x1={30 + CW}  y1="10" x2={30 + CW}  y2={10 + CH} stroke="#1E5A8A" strokeWidth="1" />
            {/* Filet */}
            <line x1="30" y1={10 + CH / 2} x2={30 + CW} y2={10 + CH / 2} stroke="#38BDF850" strokeWidth="1.5" strokeDasharray="4 2" />
            {/* Lignes de service */}
            <line x1="30"      y1={10 + CH * 0.25} x2={30 + CW}     y2={10 + CH * 0.25} stroke="#1E5A8A" strokeWidth="0.5" />
            <line x1="30"      y1={10 + CH * 0.75} x2={30 + CW}     y2={10 + CH * 0.75} stroke="#1E5A8A" strokeWidth="0.5" />
            {/* Ligne centrale */}
            <line x1={30 + CW / 2} y1="10" x2={30 + CW / 2} y2={10 + CH} stroke="#1E5A8A" strokeWidth="0.5" />

            {/* Label filet */}
            <text x={30 + CW + 6} y={10 + CH / 2 + 3} fontSize="8" fill="#38BDF870">Filet</text>

            {/* Points de frappe */}
            {withPos.map((e, i) => {
                const x = 30 + (e.player_x ?? 0.5) * CW
                const y = 10 + (e.player_y ?? 0.5) * CH
                const color = gestureColors[e.gesture_type] ?? '#475569'
                return (
                    <circle
                        key={i}
                        cx={x} cy={y}
                        r={3}
                        fill={color}
                        fillOpacity={0.7}
                        stroke={color}
                        strokeWidth="0.5"
                    />
                )
            })}

            {/* Légende */}
            {[['forehand','#38BDF8','Coup droit'], ['backhand','#10F5A0','Revers'], ['serve','#6366F1','Service']].map(([key, color, label], i) => (
                <g key={key} transform={`translate(30, ${10 + CH + 14 + i * 0})`}>
                    <circle cx={i * 88} cy="0" r="3" fill={color} />
                    <text x={i * 88 + 7} y="3" fontSize="8" fill="#64748B">{label}</text>
                </g>
            ))}
        </svg>
    )
}

// ── Stat card ────────────────────────────────────────────────
function StatCard({ label, value, sub, color }: { label: string; value: string | number; sub?: string; color?: string }) {
    return (
        <div className="rounded-xl p-3" style={inner}>
            <p className="text-xs mb-1" style={{ color: '#64748B' }}>{label}</p>
            <p className="text-xl font-medium" style={{ color: color ?? '#fff' }}>{value}</p>
            {sub && <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{sub}</p>}
        </div>
    )
}

// ── SetTab ───────────────────────────────────────────────────
function SetTab({ setStats }: { setStats: SetStats }) {
    const total = setStats.points_won + setStats.points_lost
    const winPct = total > 0 ? Math.round((setStats.points_won / total) * 100) : 0

    const gestureSorted = sortedGestures(setStats.gesture_counts)

    const barData = gestureSorted.map(({ gesture, count }) => ({
        name: GESTURE_LABELS[gesture as GestureType] ?? gesture,
        count,
        color: GESTURE_COLORS[gesture as GestureType] ?? '#475569',
    }))

    return (
        <div className="space-y-4">

            {/* Stats résumé set */}
            <div className="grid grid-cols-4 gap-2">
                <StatCard label="Points gagnés" value={setStats.points_won} color="#10F5A0" />
                <StatCard label="Points perdus" value={setStats.points_lost} color="#EF4444" />
                <StatCard label="Win rate" value={`${winPct}%`} color={winPct >= 50 ? '#10F5A0' : '#F97316'} />
                <StatCard label="Échanges" value={setStats.total_rallies} />
            </div>

            <div className="grid grid-cols-2 gap-2">
                <StatCard
                    label="Durée moy. échange"
                    value={`${setStats.avg_rally_length.toFixed(1)}s`}
                    sub={`${setStats.avg_strokes_per_rally.toFixed(1)} frappes / échange`}
                />
                <StatCard
                    label="Geste dominant"
                    value={GESTURE_LABELS[setStats.dominant_gesture as GestureType] ?? setStats.dominant_gesture}
                    color={GESTURE_COLORS[setStats.dominant_gesture as GestureType] ?? '#fff'}
                />
            </div>

            {/* Distribution gestes par set */}
            <div className="rounded-xl p-4" style={inner}>
                <p className="text-xs font-medium text-white mb-3">Distribution des gestes</p>
                <div className="space-y-2">
                    {gestureSorted.map(({ gesture, count, pct }) => (
                        <div key={gesture}>
                            <div className="flex justify-between text-xs mb-1">
                                <span style={{ color: GESTURE_COLORS[gesture as GestureType] ?? '#94A3B8' }}>
                                    {GESTURE_LABELS[gesture as GestureType] ?? gesture}
                                </span>
                                <span style={{ color: '#64748B' }}>{count} frappes · {pct}%</span>
                            </div>
                            <div className="w-full rounded-full h-1" style={{ backgroundColor: '#1E3A5F' }}>
                                <div
                                    className="h-1 rounded-full transition-all"
                                    style={{
                                        width: `${pct}%`,
                                        backgroundColor: GESTURE_COLORS[gesture as GestureType] ?? '#475569',
                                    }}
                                />
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Longueur des échanges */}
            <div className="rounded-xl p-4" style={inner}>
                <p className="text-xs font-medium text-white mb-3">Points gagnés par longueur d'échange</p>
                <div className="grid grid-cols-3 gap-3 text-center">
                    {[
                        { label: 'Courts (1–3)', val: setStats.short_rally_wins,  color: '#38BDF8' },
                        { label: 'Moyens (4–8)',  val: setStats.medium_rally_wins, color: '#10F5A0' },
                        { label: 'Longs (9+)',    val: setStats.long_rally_wins,   color: '#6366F1' },
                    ].map(({ label, val, color }) => (
                        <div key={label} className="rounded-xl p-3" style={{ backgroundColor: '#0A1628' }}>
                            <p className="text-lg font-medium" style={{ color }}>{val}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#475569' }}>{label}</p>
                        </div>
                    ))}
                </div>
            </div>

        </div>
    )
}

// ══════════════════════════════════════════════════════════════
// PANEL PRINCIPAL
// ══════════════════════════════════════════════════════════════

interface Props {
    metrics: MatchMetrics
}

export default function MatchResultsPanel({ metrics }: Props) {
    const setNumbers = Object.keys(metrics.sets).sort()
    const [activeSet, setActiveSet] = useState<string>(setNumbers[0] ?? '1')

    const winRate   = getWinRate(metrics)
    const gestures  = sortedGestures(metrics.overall_gesture_counts)

    const pieData = gestures.map(({ gesture, count }) => ({
        name: GESTURE_LABELS[gesture as GestureType] ?? gesture,
        value: count,
        color: GESTURE_COLORS[gesture as GestureType] ?? '#475569',
    }))

    const hasPositions = metrics.gesture_events.some(e => e.player_x !== null)

    return (
        <div className="space-y-4">

            {/* ── Stats globales ── */}
            <div className="rounded-xl p-5" style={card}>
                <p className="text-xs font-medium mb-3" style={{ color: '#64748B' }}>Vue d'ensemble du match</p>
                <div className="grid grid-cols-4 gap-2">
                    <StatCard label="Win rate" value={`${winRate}%`} color={winRate >= 50 ? '#10F5A0' : '#F97316'} />
                    <StatCard label="Sets" value={metrics.sets_detected} />
                    <StatCard label="Points détectés" value={metrics.total_points_detected} />
                    <StatCard
                        label="Échange moyen"
                        value={`${metrics.avg_rally_length_seconds.toFixed(1)}s`}
                        sub={`${metrics.avg_strokes_per_rally.toFixed(1)} frappes`}
                    />
                </div>
            </div>

            {/* ── Gestes + court 2D ── */}
            <div className="grid grid-cols-2 gap-4">

                {/* Donut gestes globaux */}
                <div className="rounded-xl p-4" style={card}>
                    <p className="text-xs font-medium text-white mb-1">Gestes — match entier</p>
                    <p className="text-xs mb-3" style={{ color: '#475569' }}>
                        Geste dominant : <span style={{ color: GESTURE_COLORS[metrics.dominant_gesture_match as GestureType] ?? '#fff' }}>
                            {GESTURE_LABELS[metrics.dominant_gesture_match as GestureType] ?? metrics.dominant_gesture_match}
                        </span>
                    </p>
                    <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                            <Pie
                                data={pieData}
                                cx="50%"
                                cy="50%"
                                innerRadius={38}
                                outerRadius={58}
                                dataKey="value"
                                strokeWidth={0}
                            >
                                {pieData.map((entry, i) => (
                                    <Cell key={i} fill={entry.color} />
                                ))}
                            </Pie>
                            <Tooltip content={<ChartTooltip />} />
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="space-y-1.5 mt-2">
                        {gestures.map(({ gesture, count, pct }) => (
                            <div key={gesture} className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5">
                                    <span
                                        className="w-2 h-2 rounded-sm flex-shrink-0"
                                        style={{ backgroundColor: GESTURE_COLORS[gesture as GestureType] ?? '#475569' }}
                                    />
                                    <span className="text-xs" style={{ color: '#94A3B8' }}>
                                        {GESTURE_LABELS[gesture as GestureType] ?? gesture}
                                    </span>
                                </div>
                                <span className="text-xs font-medium text-white">{pct}%</span>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Court 2D */}
                <div className="rounded-xl p-4" style={card}>
                    <p className="text-xs font-medium text-white mb-1">Positions des frappes</p>
                    <p className="text-xs mb-3" style={{ color: '#475569' }}>
                        {hasPositions
                            ? `${metrics.gesture_events.filter(e => e.player_x !== null).length} frappes localisées`
                            : 'Positions non disponibles — caméra non calibrée'}
                    </p>
                    {hasPositions ? (
                        <TennisCourt events={metrics.gesture_events} />
                    ) : (
                        <div
                            className="rounded-xl flex items-center justify-center text-center py-8"
                            style={{ ...inner, borderStyle: 'dashed' }}
                        >
                            <div>
                                <p className="text-xs" style={{ color: '#475569' }}>
                                    Nécessite une caméra fixe
                                </p>
                                <p className="text-xs mt-1" style={{ color: '#334155' }}>
                                    et une homographie du court
                                </p>
                            </div>
                        </div>
                    )}
                </div>
            </div>

            {/* ── Points forts / faibles ── */}
            {(metrics.strengths.length > 0 || metrics.weaknesses.length > 0) && (
                <div className="grid grid-cols-2 gap-4">
                    {metrics.strengths.length > 0 && (
                        <div className="rounded-xl p-4" style={{ ...card }}>
                            <p className="text-xs font-medium mb-3" style={{ color: '#10F5A0' }}>Points forts</p>
                            <div className="space-y-2">
                                {metrics.strengths.map((s, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: '#10F5A0' }}>↑</span>
                                        <div>
                                            <p className="text-xs font-medium text-white">{s.aspect}</p>
                                            <p className="text-xs" style={{ color: '#64748B' }}>{s.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                    {metrics.weaknesses.length > 0 && (
                        <div className="rounded-xl p-4" style={{ ...card }}>
                            <p className="text-xs font-medium mb-3" style={{ color: '#F97316' }}>Points à améliorer</p>
                            <div className="space-y-2">
                                {metrics.weaknesses.map((w, i) => (
                                    <div key={i} className="flex items-start gap-2">
                                        <span className="text-xs mt-0.5 flex-shrink-0" style={{ color: '#F97316' }}>↓</span>
                                        <div>
                                            <p className="text-xs font-medium text-white">{w.aspect}</p>
                                            <p className="text-xs" style={{ color: '#64748B' }}>{w.detail}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* ── Détail par set ── */}
            {setNumbers.length > 0 && (
                <div className="rounded-xl p-4" style={card}>
                    {/* Tabs sets */}
                    <div className="flex items-center gap-2 mb-4">
                        <p className="text-xs font-medium text-white mr-2">Détail par set</p>
                        {setNumbers.map(sn => (
                            <button
                                key={sn}
                                onClick={() => setActiveSet(sn)}
                                className="px-3 py-1 rounded-lg text-xs transition-all"
                                style={
                                    activeSet === sn
                                        ? { backgroundColor: '#38BDF815', color: '#38BDF8', border: '0.5px solid #38BDF840' }
                                        : { ...inner, color: '#64748B' }
                                }
                            >
                                Set {sn}
                            </button>
                        ))}
                    </div>

                    {metrics.sets[activeSet] && (
                        <SetTab setStats={metrics.sets[activeSet]} />
                    )}
                </div>
            )}

            {/* ── Barre gestes par set ── */}
            {setNumbers.length > 1 && (
                <div className="rounded-xl p-4" style={card}>
                    <p className="text-xs font-medium text-white mb-4">Gestes par set — évolution</p>
                    <ResponsiveContainer width="100%" height={160}>
                        <BarChart
                            data={setNumbers.map(sn => {
                                const s = metrics.sets[sn]
                                return {
                                    set: `Set ${sn}`,
                                    'Coup droit': s.gesture_counts['forehand'] ?? 0,
                                    'Revers':     s.gesture_counts['backhand'] ?? 0,
                                    'Service':    s.gesture_counts['serve'] ?? 0,
                                }
                            })}
                            barCategoryGap="30%"
                        >
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" />
                            <XAxis dataKey="set" tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <YAxis tick={{ fontSize: 10, fill: '#64748B' }} axisLine={false} tickLine={false} />
                            <Tooltip content={<ChartTooltip />} />
                            <Bar dataKey="Coup droit" fill="#38BDF8" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Revers"     fill="#10F5A0" radius={[3, 3, 0, 0]} />
                            <Bar dataKey="Service"    fill="#6366F1"  radius={[3, 3, 0, 0]} />
                        </BarChart>
                    </ResponsiveContainer>
                    {/* Légende manuelle */}
                    <div className="flex gap-4 mt-2 justify-center">
                        {[['Coup droit','#38BDF8'],['Revers','#10F5A0'],['Service','#6366F1']].map(([label, color]) => (
                            <div key={label} className="flex items-center gap-1.5">
                                <span className="w-2 h-2 rounded-sm" style={{ backgroundColor: color }} />
                                <span className="text-xs" style={{ color: '#64748B' }}>{label}</span>
                            </div>
                        ))}
                    </div>
                </div>
            )}

        </div>
    )
}
