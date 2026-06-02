import { useState, useEffect } from 'react'
import { useAuth } from '../contexts/AuthContext'
import { getAthletes } from '../api/athletes'
import { getSessions, GESTURE_LABELS, STATUS_LABELS, STATUS_COLORS } from '../api/sessions'
import type { Athlete } from '../api/athletes'
import type { Session } from '../api/sessions'

export default function DashboardPage() {
    const { user } = useAuth()
    const [athletes, setAthletes]   = useState<Athlete[]>([])
    const [sessions, setSessions]   = useState<Session[]>([])
    const [isLoading, setIsLoading] = useState(true)

    useEffect(() => {
        let cancelled = false

        const loadData = async () => {
            try {
                const [athleteData, sessionData] = await Promise.all([
                    getAthletes(),
                    getSessions({ limit: 5 }),
                ])
                if (cancelled) return
                setAthletes(Array.isArray(athleteData) ? athleteData : (athleteData as { data: Athlete[] }).data ?? [])
                setSessions(sessionData.data)
            } catch {
                console.error('Erreur chargement dashboard')
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }

        void loadData()

        return () => { cancelled = true }
    }, [])

    const completedSessions  = sessions.filter((s) => s.status === 'completed').length
    const processingSessions = sessions.filter((s) => s.status === 'processing').length
    const firstName = user?.full_name?.split(' ')[0] ?? 'Spécialiste'
    const cardStyle = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-medium text-white">Bonjour, {firstName} 👋</h1>
                <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>Voici un résumé de votre activité</p>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                {[
                    { label: 'Athlètes',       value: athletes.length,      color: '#10F5A0' },
                    { label: 'Sessions',        value: sessions.length,      color: '#38BDF8' },
                    { label: 'Analyses faites', value: completedSessions,    color: '#6366F1' },
                    { label: 'En cours',        value: processingSessions,   color: '#FBBF24' },
                ].map((stat) => (
                    <div key={stat.label} className="rounded-xl p-5" style={cardStyle}>
                        {isLoading
                            ? <div className="h-8 w-12 rounded mb-1" style={{ backgroundColor: '#1E3A5F' }} />
                            : <p className="text-3xl font-medium" style={{ color: stat.color }}>{stat.value}</p>
                        }
                        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>{stat.label}</p>
                    </div>
                ))}
            </div>

            <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">

                {/* Athlètes récents */}
                <div className="rounded-2xl p-6" style={cardStyle}>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-base font-medium text-white">Derniers athlètes</h2>
                        <a href="/athletes" className="text-xs hover:opacity-80" style={{ color: '#38BDF8' }}>Voir tout →</a>
                    </div>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1,2,3].map((i) => <div key={i} className="rounded-xl h-14" style={{ backgroundColor: '#0A1628' }} />)}
                        </div>
                    ) : athletes.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-2xl mb-2">🎾</p>
                            <p className="text-sm" style={{ color: '#94A3B8' }}>Aucun athlète encore.</p>
                            <a href="/athletes" className="text-xs mt-2 inline-block" style={{ color: '#38BDF8' }}>+ Ajouter un athlète</a>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {athletes.slice(0, 5).map((athlete) => {
                                const initials = athlete.name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)
                                return (
                                    <div key={athlete.id} className="flex items-center gap-3 rounded-xl px-4 py-3" style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}>
                                        <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-medium flex-shrink-0" style={{ backgroundColor: '#10F5A015', color: '#10F5A0' }}>
                                            {initials}
                                        </div>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">{athlete.name}</p>
                                            <p className="text-xs" style={{ color: '#94A3B8' }}>
                                                {athlete.age} ans · {athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'}
                                            </p>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>

                {/* Sessions récentes */}
                <div className="rounded-2xl p-6" style={cardStyle}>
                    <h2 className="text-base font-medium text-white mb-4">Sessions récentes</h2>
                    {isLoading ? (
                        <div className="space-y-2">
                            {[1,2,3].map((i) => <div key={i} className="rounded-xl h-14" style={{ backgroundColor: '#0A1628' }} />)}
                        </div>
                    ) : sessions.length === 0 ? (
                        <div className="text-center py-8">
                            <p className="text-2xl mb-2">🎬</p>
                            <p className="text-sm" style={{ color: '#94A3B8' }}>Aucune session encore.</p>
                        </div>
                    ) : (
                        <div className="space-y-2">
                            {sessions.map((session) => {
                                const colors = STATUS_COLORS[session.status]
                                return (
                                    <div key={session.id} className="flex items-center justify-between rounded-xl px-4 py-3" style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}>
                                        <div className="min-w-0">
                                            <p className="text-sm font-medium text-white truncate">
                                                {GESTURE_LABELS[session.gesture_type as keyof typeof GESTURE_LABELS] ?? session.gesture_type}
                                            </p>
                                            <p className="text-xs" style={{ color: '#94A3B8' }}>
                                                {new Date(session.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                                {session.fps ? ` · ${session.fps} fps` : ''}
                                            </p>
                                        </div>
                                        <span
                                            className="text-xs px-2.5 py-1 rounded-full font-medium flex-shrink-0"
                                            style={{ backgroundColor: colors.bg, color: colors.text, border: `0.5px solid ${colors.border}` }}
                                        >
                                            {STATUS_LABELS[session.status]}
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