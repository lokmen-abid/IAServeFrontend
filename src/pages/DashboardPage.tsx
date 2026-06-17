import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'
import { getAthletes } from '../api/athletes'
import { getSessions, GESTURE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../api/sessions'
import { getAthleteEvolution } from '../api/sessions'
import type { Athlete } from '../api/athletes'
import type { Session } from '../api/sessions'
import {
    PieChart, Pie, Cell, Tooltip as ReTooltip,
    ResponsiveContainer, Legend,
} from 'recharts'

// ── Styles ──────────────────────────────────────────────────
const card  = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' } as const
const inner = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' } as const

const DONUT_COLORS: Record<string, string> = {
    service:    '#38BDF8',
    coup_droit: '#10F5A0',
    revers:     '#6366F1',
}

// ── Tooltip donut ────────────────────────────────────────────
function DonutTooltip({ active, payload }: any) {
    if (!active || !payload?.length) return null
    const { name, value } = payload[0]
    return (
        <div className="rounded-xl px-3 py-2 text-xs"
             style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}>
            <span className="text-white font-medium">{name}</span>
            <span className="ml-2" style={{ color: '#94A3B8' }}>{value} session{value > 1 ? 's' : ''}</span>
        </div>
    )
}

// ── Page ─────────────────────────────────────────────────────
export default function DashboardPage() {
    const { user }    = useAuth()
    const navigate    = useNavigate()

    const [athletes,  setAthletes]  = useState<Athlete[]>([])
    const [sessions,  setSessions]  = useState<Session[]>([])
    const [alertsMap, setAlertsMap] = useState<Record<string, number>>({})  // athleteId → nb alertes
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const load = async () => {
            try {
                // 1. Athlètes + toutes les sessions en parallèle
                const [athleteResp, sessionResp] = await Promise.all([
                    getAthletes(),
                    getSessions({ limit: 100 }),
                ])
                if (cancelled) return

                const athList = Array.isArray(athleteResp)
                    ? athleteResp
                    : (athleteResp as { data: Athlete[] }).data ?? []
                const sesList = sessionResp.data ?? []

                setAthletes(athList)
                setSessions(sesList)

                // 2. Charger l'évolution de chaque athlète pour extraire les alertes
                //    On fait ça uniquement pour les athlètes ayant des sessions completed
                const athleteIdsWithCompleted = [
                    ...new Set(
                        sesList
                            .filter(s => s.status === 'completed')
                            .map(s => s.athlete_id)
                    )
                ]

                const evoResults = await Promise.allSettled(
                    athleteIdsWithCompleted.map(id => getAthleteEvolution(id))
                )

                if (cancelled) return

                const map: Record<string, number> = {}
                evoResults.forEach((res, i) => {
                    if (res.status === 'fulfilled') {
                        const total = res.value.series.reduce(
                            (acc, pt) => acc + pt.alerts_count, 0
                        )
                        if (total > 0) map[athleteIdsWithCompleted[i]] = total
                    }
                })
                setAlertsMap(map)

            } catch {
                console.error('Erreur chargement dashboard')
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        void load()
        return () => { cancelled = true }
    }, [])

    // ── Calculs ──────────────────────────────────────────────
    const completedSessions  = sessions.filter(s => s.status === 'completed').length
    const totalAlerts        = Object.values(alertsMap).reduce((a, b) => a + b, 0)
    const firstName          = user?.full_name?.split(' ')[0] ?? 'Spécialiste'

    // Sessions récentes (5 dernières, toutes confondues)
    const recentSessions = [...sessions]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 5)

    // Athlètes par ID (lookup rapide)
    const athleteById = Object.fromEntries(athletes.map(a => [a.id, a]))

    // Données donut — répartition par geste
    const gesteCounts = sessions.reduce<Record<string, number>>((acc, s) => {
        acc[s.gesture_type] = (acc[s.gesture_type] ?? 0) + 1
        return acc
    }, {})
    const donutData = Object.entries(gesteCounts).map(([key, value]) => ({
        name:  GESTURE_LABELS[key as keyof typeof GESTURE_LABELS] ?? key,
        value,
        key,
    }))

    // Athlètes avec alertes (section clinique)
    const athletesWithAlerts = Object.entries(alertsMap)
        .map(([id, count]) => ({ athlete: athleteById[id], count }))
        .filter(x => x.athlete)
        .sort((a, b) => b.count - a.count)

    // ── Squelette de chargement ──────────────────────────────
    const Skeleton = ({ h = 14, w = 'full' }: { h?: number; w?: string }) => (
        <div className={`h-${h} w-${w} rounded-lg animate-pulse`}
             style={{ backgroundColor: '#1E3A5F' }} />
    )

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* ── Header ── */}
            <div>
                <h1 className="text-2xl font-medium text-white">
                    Bonjour, {firstName} 👋
                </h1>
                <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
                    Voici un résumé de votre activité
                </p>
            </div>

            {/* ── Section 1 : Stats globales ── */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { label: 'Athlètes',           value: athletes.length,   color: '#10F5A0' },
                    { label: 'Sessions totales',    value: sessions.length,   color: '#38BDF8' },
                    { label: 'Analyses complétées', value: completedSessions, color: '#6366F1' },
                    { label: 'Alertes cliniques',   value: totalAlerts,       color: totalAlerts > 0 ? '#EF9F27' : '#94A3B8' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-5" style={card}>
                        {isLoading
                            ? <Skeleton h={8} w="12" />
                            : <p className="text-3xl font-medium" style={{ color: stat.color }}>
                                {stat.value}
                            </p>
                        }
                        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Section 2 : Sessions récentes + Donut ── */}
            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Sessions récentes avec nom athlète */}
                <div className="rounded-2xl p-6" style={card}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-medium text-white">Sessions récentes</h2>
                        <button
                            onClick={() => navigate('/athletes')}
                            className="text-xs hover:opacity-80 transition-opacity"
                            style={{ color: '#38BDF8' }}
                        >
                            Voir les athlètes →
                        </button>
                    </div>

                    {isLoading ? (
                        <div className="space-y-2">
                            {[1,2,3].map(i => <div key={i} className="rounded-xl h-14 animate-pulse" style={{ backgroundColor: '#0A1628' }} />)}
                        </div>
                    ) : recentSessions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-2xl mb-2">🎬</p>
                            <p className="text-sm" style={{ color: '#94A3B8' }}>Aucune session encore.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {recentSessions.map(s => {
                                const ath    = athleteById[s.athlete_id]
                                const colors = STATUS_COLORS[s.status]
                                const initials = ath
                                    ? ath.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                                    : '?'
                                return (
                                    <div
                                        key={s.id}
                                        className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
                                        style={inner}
                                        onClick={() => ath && navigate(`/athletes/${ath.id}`)}
                                    >
                                        {/* Avatar */}
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                                            style={{ backgroundColor: '#10F5A015', color: '#10F5A0' }}
                                        >
                                            {initials}
                                        </div>

                                        {/* Infos */}
                                        <div className="min-w-0 flex-1">
                                            <p className="text-sm font-medium text-white truncate">
                                                {ath?.name ?? '—'}
                                            </p>
                                            <p className="text-xs" style={{ color: '#64748B' }}>
                                                {GESTURE_LABELS[s.gesture_type as keyof typeof GESTURE_LABELS] ?? s.gesture_type}
                                                {' · '}
                                                {new Date(s.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                            </p>
                                        </div>

                                        {/* Statut */}
                                        <span
                                            className="text-xs px-2 py-0.5 rounded-full flex-shrink-0"
                                            style={{
                                                backgroundColor: colors.bg,
                                                color: colors.text,
                                                border: `0.5px solid ${colors.border}`,
                                            }}
                                        >
                                            {STATUS_LABELS[s.status]}
                                        </span>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Section 3 : Donut répartition par geste */}
                <div className="rounded-2xl p-6" style={card}>
                    <h2 className="text-base font-medium text-white mb-1">
                        Répartition par geste
                    </h2>
                    <p className="text-xs mb-4" style={{ color: '#64748B' }}>
                        Distribution de toutes les sessions
                    </p>

                    {isLoading ? (
                        <div className="flex items-center justify-center h-48">
                            <div className="w-32 h-32 rounded-full animate-pulse" style={{ backgroundColor: '#1E3A5F' }} />
                        </div>
                    ) : donutData.length === 0 ? (
                        <div className="text-center py-12">
                            <p className="text-2xl mb-2">🎾</p>
                            <p className="text-sm" style={{ color: '#94A3B8' }}>
                                Aucune session pour afficher le graphique.
                            </p>
                        </div>
                    ) : (
                        <ResponsiveContainer width="100%" height={220}>
                            <PieChart>
                                <Pie
                                    data={donutData}
                                    cx="50%"
                                    cy="50%"
                                    innerRadius={55}
                                    outerRadius={85}
                                    paddingAngle={3}
                                    dataKey="value"
                                >
                                    {donutData.map(entry => (
                                        <Cell
                                            key={entry.key}
                                            fill={DONUT_COLORS[entry.key] ?? '#94A3B8'}
                                            stroke="transparent"
                                        />
                                    ))}
                                </Pie>
                                <ReTooltip content={<DonutTooltip />} />
                                <Legend
                                    iconType="circle"
                                    iconSize={8}
                                    wrapperStyle={{ fontSize: 12, color: '#94A3B8', paddingTop: 12 }}
                                    formatter={(value) => (
                                        <span style={{ color: '#94A3B8' }}>{value}</span>
                                    )}
                                />
                            </PieChart>
                        </ResponsiveContainer>
                    )}
                </div>

            </div>

            {/* ── Section 4 : Athlètes avec alertes cliniques ── */}
            {!isLoading && athletesWithAlerts.length > 0 && (
                <div className="rounded-2xl p-6" style={card}>
                    <div className="flex items-center gap-2 mb-1">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: '#EF9F27' }} />
                        <h2 className="text-base font-medium text-white">
                            Alertes cliniques
                        </h2>
                        <span
                            className="ml-1 text-xs px-2 py-0.5 rounded-full"
                            style={{ backgroundColor: '#EF9F2720', color: '#EF9F27', border: '0.5px solid #EF9F2740' }}
                        >
                            {athletesWithAlerts.length} athlète{athletesWithAlerts.length > 1 ? 's' : ''}
                        </span>
                    </div>
                    <p className="text-xs mb-4" style={{ color: '#64748B' }}>
                        Athlètes présentant des déviations biomécaniques significatives
                    </p>

                    <div className="space-y-2">
                        {athletesWithAlerts.map(({ athlete, count }) => {
                            const initials = athlete.name
                                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            return (
                                <div
                                    key={athlete.id}
                                    className="flex items-center justify-between rounded-xl px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
                                    style={inner}
                                    onClick={() => navigate(`/athletes/${athlete.id}`)}
                                >
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                                            style={{ backgroundColor: '#EF9F2715', color: '#EF9F27', border: '0.5px solid #EF9F2730' }}
                                        >
                                            {initials}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{athlete.name}</p>
                                            <p className="text-xs" style={{ color: '#64748B' }}>
                                                {athlete.age} ans · {athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <span
                                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                                            style={{ backgroundColor: '#EF9F2720', color: '#EF9F27', border: '0.5px solid #EF9F2740' }}
                                        >
                                            {count} alerte{count > 1 ? 's' : ''}
                                        </span>
                                        <span className="text-xs" style={{ color: '#475569' }}>→</span>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>
            )}

            {/* ── Derniers athlètes ── */}
            <div className="rounded-2xl p-6" style={card}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-base font-medium text-white">Derniers athlètes</h2>
                    <button
                        onClick={() => navigate('/athletes')}
                        className="text-xs hover:opacity-80 transition-opacity"
                        style={{ color: '#38BDF8' }}
                    >
                        Voir tout →
                    </button>
                </div>

                {isLoading ? (
                    <div className="space-y-2">
                        {[1,2,3].map(i => <div key={i} className="rounded-xl h-14 animate-pulse" style={{ backgroundColor: '#0A1628' }} />)}
                    </div>
                ) : athletes.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-2xl mb-2">🎾</p>
                        <p className="text-sm" style={{ color: '#94A3B8' }}>Aucun athlète encore.</p>
                        <button
                            onClick={() => navigate('/athletes')}
                            className="text-xs mt-2 inline-block hover:opacity-80"
                            style={{ color: '#38BDF8' }}
                        >
                            + Ajouter un athlète
                        </button>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                        {athletes.slice(0, 6).map(athlete => {
                            const initials = athlete.name
                                .split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
                            const hasAlerts = alertsMap[athlete.id] > 0
                            return (
                                <div
                                    key={athlete.id}
                                    className="flex items-center gap-3 rounded-xl px-4 py-3 cursor-pointer hover:opacity-90 transition-opacity"
                                    style={inner}
                                    onClick={() => navigate(`/athletes/${athlete.id}`)}
                                >
                                    <div
                                        className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0"
                                        style={{ backgroundColor: '#10F5A015', color: '#10F5A0' }}
                                    >
                                        {initials}
                                    </div>
                                    <div className="min-w-0 flex-1">
                                        <p className="text-sm font-medium text-white truncate">{athlete.name}</p>
                                        <p className="text-xs" style={{ color: '#94A3B8' }}>
                                            {athlete.age} ans · {athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'}
                                        </p>
                                    </div>
                                    {hasAlerts && (
                                        <span
                                            className="w-2 h-2 rounded-full flex-shrink-0"
                                            style={{ backgroundColor: '#EF9F27' }}
                                            title={`${alertsMap[athlete.id]} alerte(s)`}
                                        />
                                    )}
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    )
}
