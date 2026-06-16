import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import {
    getAthleteById, updateAthlete, deleteAthlete,
} from '../api/athletes'
import type { Athlete, AthleteUpdate } from '../api/athletes'
import { getSessionsByAthlete } from '../api/sessions'
import type { Session, GestureType } from '../api/sessions'
import { getAthleteEvolution } from '../api/sessions'
import type { EvolutionPoint } from '../api/sessions'
import AthleteForm from '../components/athletes/AthleteForm'
import { useToast } from '../contexts/ToastContext'
import {
    LineChart, Line, XAxis, YAxis, CartesianGrid,
    Tooltip, ResponsiveContainer, Legend,
} from 'recharts'

// ── Constantes visuelles ────────────────────────────────────
const card   = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' } as const
const inner  = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' } as const
const accent = { background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' } as const

const GESTURE_LABELS: Record<string, string> = {
    service:    'Service',
    coup_droit: 'Coup droit',
    revers:     'Revers',
}

const STATUS_COLORS: Record<string, string> = {
    completed:  '#10F5A0',
    processing: '#38BDF8',
    error:      '#FCA5A5',
    created:    '#94A3B8',
    ready:      '#94A3B8',
}

// Joints à afficher dans les graphiques (les plus pertinents)
const CHART_JOINTS: { key: string; label: string; color: string }[] = [
    { key: 'knee_flexion_right',       label: 'Flexion genou D',   color: '#38BDF8' },
    { key: 'shoulder_elevation_right', label: 'Élévation épaule D', color: '#10F5A0' },
    { key: 'elbow_right',              label: 'Flexion coude D',    color: '#6366F1' },
    { key: 'trunk_inclination',        label: 'Inclinaison tronc',  color: '#EF9F27' },
    { key: 'shoulder_rotation_right',  label: 'Rotation épaule D',  color: '#F472B6' },
    { key: 'trunk_rotation',           label: 'Rotation tronc',     color: '#A78BFA' },
]

// ── Composant tooltip recharts ───────────────────────────────
function CustomTooltip({ active, payload, label }: any) {
    if (!active || !payload?.length) return null
    return (
        <div className="rounded-xl px-4 py-3 text-xs space-y-1"
             style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}>
            <p className="font-medium text-white mb-2">{label}</p>
            {payload.map((p: any) => (
                <div key={p.dataKey} className="flex items-center gap-2">
                    <span className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: p.color }} />
                    <span style={{ color: '#94A3B8' }}>{p.name}</span>
                    <span className="font-medium text-white ml-auto pl-4">
                        {p.value != null ? `${p.value}°` : '—'}
                    </span>
                </div>
            ))}
        </div>
    )
}

// ── Page principale ─────────────────────────────────────────
export default function AthleteProfilePage() {
    const { athleteId } = useParams<{ athleteId: string }>()
    const navigate      = useNavigate()
    const { showToast } = useToast()

    const [athlete,      setAthlete]      = useState<Athlete | null>(null)
    const [sessions,     setSessions]     = useState<Session[]>([])
    const [evolution,    setEvolution]    = useState<EvolutionPoint[]>([])
    const [isLoading,    setIsLoading]    = useState(true)
    const [showEdit,     setShowEdit]     = useState(false)
    const [editLoading,  setEditLoading]  = useState(false)
    const [editError,    setEditError]    = useState('')
    const [showDelete,   setShowDelete]   = useState(false)
    const [deleteLoading,setDeleteLoading]= useState(false)
    const [activeJoints, setActiveJoints] = useState<Set<string>>(
        new Set(['knee_flexion_right', 'shoulder_elevation_right', 'elbow_right'])
    )

    // ── Chargement ───────────────────────────────────────────
    const fetchAll = useCallback(async () => {
        if (!athleteId) return
        setIsLoading(true)
        try {
            const [ath, sessResp, evo] = await Promise.all([
                getAthleteById(athleteId),
                getSessionsByAthlete(athleteId, { limit: 50 }),
                getAthleteEvolution(athleteId),
            ])
            setAthlete(ath)
            setSessions(sessResp.data)
            setEvolution(evo.series)
        } catch {
            showToast('Erreur de chargement', 'error')
        } finally {
            setIsLoading(false)
        }
    }, [athleteId, showToast])

    useEffect(() => { void fetchAll() }, [fetchAll])

    // ── Actions ──────────────────────────────────────────────
    const handleEdit = async (data: any) => {
        if (!athlete) return
        setEditLoading(true); setEditError('')
        try {
            const updated = await updateAthlete(athlete.id, data as AthleteUpdate)
            setAthlete(updated)
            setShowEdit(false)
            showToast('Athlète modifié')
        } catch {
            setEditError('Erreur lors de la modification.')
        } finally { setEditLoading(false) }
    }

    const handleDelete = async () => {
        if (!athlete) return
        setDeleteLoading(true)
        try {
            await deleteAthlete(athlete.id)
            showToast(`${athlete.name} supprimé`)
            navigate('/athletes')
        } catch {
            showToast('Erreur lors de la suppression', 'error')
        } finally { setDeleteLoading(false) }
    }

    const toggleJoint = (key: string) => {
        setActiveJoints(prev => {
            const next = new Set(prev)
            if (next.has(key)) { if (next.size > 1) next.delete(key) }
            else next.add(key)
            return next
        })
    }

    // ── Stats rapides ────────────────────────────────────────
    const completed  = sessions.filter(s => s.status === 'completed').length
    const lastDate   = sessions.length
        ? new Date(sessions[sessions.length - 1].created_at).toLocaleDateString('fr-CA')
        : '—'
    const totalAlerts = evolution.reduce((acc, p) => acc + p.alerts_count, 0)

    // ── Données graphique ────────────────────────────────────
    const chartData = evolution.map(pt => {
        const row: Record<string, any> = { date: pt.date.slice(5) } // MM-DD
        CHART_JOINTS.forEach(j => {
            if (activeJoints.has(j.key)) {
                row[j.key] = pt.joints[j.key]?.mean ?? null
            }
        })
        return row
    })

    // ── Rendu ────────────────────────────────────────────────
    if (isLoading) return (
        <div className="max-w-5xl mx-auto py-20 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>Chargement...</p>
        </div>
    )

    if (!athlete) return (
        <div className="max-w-5xl mx-auto py-20 text-center">
            <p className="text-sm" style={{ color: '#FCA5A5' }}>Athlète introuvable.</p>
        </div>
    )

    const initials = athlete.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)

    return (
        <div className="max-w-5xl mx-auto space-y-6">

            {/* ── Breadcrumb ── */}
            <button
                onClick={() => navigate('/athletes')}
                className="text-xs flex items-center gap-1 hover:opacity-80 transition-opacity"
                style={{ color: '#64748B' }}
            >
                ← Retour aux athlètes
            </button>

            {/* ── En-tête profil ── */}
            {showEdit ? (
                <AthleteForm
                    athlete={athlete}
                    onSubmit={handleEdit}
                    onCancel={() => setShowEdit(false)}
                    isLoading={editLoading}
                    error={editError}
                />
            ) : (
                <div className="rounded-2xl p-6" style={card}>
                    <div className="flex items-start justify-between gap-4">
                        {/* Avatar + infos */}
                        <div className="flex items-center gap-5">
                            <div
                                className="w-16 h-16 rounded-2xl flex items-center justify-center text-xl font-medium flex-shrink-0"
                                style={{ backgroundColor: '#10F5A015', color: '#10F5A0', border: '0.5px solid #10F5A030' }}
                            >
                                {initials}
                            </div>
                            <div>
                                <h1 className="text-2xl font-medium text-white">{athlete.name}</h1>
                                <div className="flex flex-wrap items-center gap-3 mt-1.5">
                                    <span className="text-sm" style={{ color: '#94A3B8' }}>
                                        {athlete.age} ans
                                    </span>
                                    <span style={{ color: '#1E3A5F' }}>·</span>
                                    <span className="text-sm" style={{ color: '#94A3B8' }}>
                                        {athlete.sex === 'male' ? 'Homme' : 'Femme'}
                                    </span>
                                    <span style={{ color: '#1E3A5F' }}>·</span>
                                    <span className="text-sm" style={{ color: '#94A3B8' }}>
                                        {athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'}
                                    </span>
                                </div>
                                {athlete.medical_notes && (
                                    <p className="text-sm mt-2 max-w-xl"
                                       style={{ color: '#64748B', fontStyle: 'italic' }}>
                                        {athlete.medical_notes}
                                    </p>
                                )}
                            </div>
                        </div>

                        {/* Boutons actions */}
                        <div className="flex items-center gap-2 flex-shrink-0">
                            <button
                                onClick={() => navigate(`/athletes/${athlete.id}/sessions`)}
                                className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                                style={accent}
                            >
                                Sessions →
                            </button>
                            <button
                                onClick={() => { setShowEdit(true); setEditError('') }}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: '#38BDF810', color: '#38BDF8', border: '0.5px solid #38BDF830' }}
                            >
                                Modifier
                            </button>
                            <button
                                onClick={() => setShowDelete(true)}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: '#EF444415', color: '#FCA5A5', border: '0.5px solid #EF444430' }}
                            >
                                Supprimer
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Stats rapides ── */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                {[
                    { label: 'Sessions totales',    value: sessions.length.toString(),  color: '#38BDF8' },
                    { label: 'Sessions complétées', value: completed.toString(),         color: '#10F5A0' },
                    { label: 'Alertes cliniques',   value: totalAlerts.toString(),       color: totalAlerts > 0 ? '#EF9F27' : '#94A3B8' },
                    { label: 'Dernière session',    value: lastDate,                     color: '#94A3B8' },
                ].map(stat => (
                    <div key={stat.label} className="rounded-xl p-4" style={card}>
                        <p className="text-2xl font-medium" style={{ color: stat.color }}>
                            {stat.value}
                        </p>
                        <p className="text-xs mt-1" style={{ color: '#64748B' }}>{stat.label}</p>
                    </div>
                ))}
            </div>

            {/* ── Graphique évolution ── */}
            {evolution.length >= 2 ? (
                <div className="rounded-2xl p-6" style={card}>
                    <div className="flex items-center justify-between mb-4">
                        <div>
                            <h2 className="text-sm font-medium text-white">
                                Évolution des angles
                            </h2>
                            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                                {evolution.length} sessions avec métriques
                            </p>
                        </div>
                    </div>

                    {/* Sélecteur de joints */}
                    <div className="flex flex-wrap gap-2 mb-5">
                        {CHART_JOINTS.map(j => (
                            <button
                                key={j.key}
                                onClick={() => toggleJoint(j.key)}
                                className="px-3 py-1 rounded-lg text-xs transition-all"
                                style={{
                                    backgroundColor: activeJoints.has(j.key)
                                        ? `${j.color}20` : '#0A162840',
                                    color:  activeJoints.has(j.key) ? j.color : '#475569',
                                    border: `0.5px solid ${activeJoints.has(j.key) ? j.color + '50' : '#1E3A5F'}`,
                                }}
                            >
                                {j.label}
                            </button>
                        ))}
                    </div>

                    <ResponsiveContainer width="100%" height={260}>
                        <LineChart data={chartData} margin={{ top: 4, right: 8, left: -10, bottom: 0 }}>
                            <CartesianGrid strokeDasharray="3 3" stroke="#1E3A5F" strokeOpacity={0.6} />
                            <XAxis
                                dataKey="date"
                                tick={{ fill: '#64748B', fontSize: 11 }}
                                axisLine={{ stroke: '#1E3A5F' }}
                                tickLine={false}
                            />
                            <YAxis
                                unit="°"
                                tick={{ fill: '#64748B', fontSize: 11 }}
                                axisLine={false}
                                tickLine={false}
                            />
                            <Tooltip content={<CustomTooltip />} />
                            <Legend
                                wrapperStyle={{ fontSize: 11, color: '#94A3B8', paddingTop: 12 }}
                            />
                            {CHART_JOINTS.filter(j => activeJoints.has(j.key)).map(j => (
                                <Line
                                    key={j.key}
                                    type="monotone"
                                    dataKey={j.key}
                                    name={j.label}
                                    stroke={j.color}
                                    strokeWidth={2}
                                    dot={{ fill: j.color, r: 4, strokeWidth: 0 }}
                                    activeDot={{ r: 6, strokeWidth: 0 }}
                                    connectNulls
                                />
                            ))}
                        </LineChart>
                    </ResponsiveContainer>
                </div>
            ) : evolution.length === 1 ? (
                <div className="rounded-2xl p-6 text-center" style={card}>
                    <p className="text-2xl mb-2">📈</p>
                    <p className="text-sm text-white">1 session avec métriques</p>
                    <p className="text-xs mt-1" style={{ color: '#64748B' }}>
                        Le graphique d'évolution s'affiche à partir de 2 sessions complétées.
                    </p>
                </div>
            ) : null}

            {/* ── Liste des sessions ── */}
            <div className="rounded-2xl p-6" style={card}>
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-sm font-medium text-white">Sessions</h2>
                    <button
                        onClick={() => navigate(`/athletes/${athlete.id}/sessions`)}
                        className="text-xs hover:opacity-80 transition-opacity"
                        style={{ color: '#38BDF8' }}
                    >
                        Gérer les sessions →
                    </button>
                </div>

                {sessions.length === 0 ? (
                    <div className="text-center py-8">
                        <p className="text-2xl mb-2">📋</p>
                        <p className="text-sm" style={{ color: '#94A3B8' }}>Aucune session</p>
                        <button
                            onClick={() => navigate(`/athletes/${athlete.id}/sessions`)}
                            className="mt-3 px-4 py-2 rounded-lg text-xs font-medium"
                            style={accent}
                        >
                            Créer une session
                        </button>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {sessions.slice().reverse().map(s => (
                            <div
                                key={s.id}
                                className="rounded-xl px-4 py-3 flex items-center justify-between cursor-pointer hover:opacity-90 transition-opacity"
                                style={inner}
                                onClick={() => navigate(`/athletes/${athlete.id}/sessions`)}
                            >
                                <div className="flex items-center gap-3">
                                    {/* Dot statut */}
                                    <span
                                        className="w-2 h-2 rounded-full flex-shrink-0"
                                        style={{ backgroundColor: STATUS_COLORS[s.status] ?? '#94A3B8' }}
                                    />
                                    <div>
                                        <p className="text-sm text-white">
                                            {GESTURE_LABELS[s.gesture_type as GestureType] ?? s.gesture_type}
                                        </p>
                                        <p className="text-xs mt-0.5" style={{ color: '#475569' }}>
                                            {new Date(s.created_at).toLocaleDateString('fr-CA')}
                                            {s.total_frames && ` · ${s.total_frames} frames`}
                                            {s.fps && ` · ${s.fps} FPS`}
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <span
                                        className="text-xs px-2 py-0.5 rounded-full"
                                        style={{
                                            backgroundColor: `${STATUS_COLORS[s.status] ?? '#94A3B8'}15`,
                                            color: STATUS_COLORS[s.status] ?? '#94A3B8',
                                            border: `0.5px solid ${STATUS_COLORS[s.status] ?? '#94A3B8'}30`,
                                        }}
                                    >
                                        {s.status}
                                    </span>
                                    <span className="text-xs" style={{ color: '#475569' }}>→</span>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* ── Modal suppression ── */}
            {showDelete && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: 'rgba(0,0,0,0.75)' }}
                    onClick={() => setShowDelete(false)}
                >
                    <div
                        className="rounded-2xl p-6 w-full max-w-sm mx-4"
                        style={card}
                        onClick={e => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-medium text-white mb-2">
                            Supprimer l'athlète
                        </h3>
                        <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
                            Supprimer{' '}
                            <span className="text-white font-medium">{athlete.name}</span> ?
                            Toutes les sessions et analyses associées seront définitivement perdues.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={() => setShowDelete(false)}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                style={{ ...inner, color: '#94A3B8' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete}
                                disabled={deleteLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                                style={{
                                    backgroundColor: '#EF444415',
                                    color: '#FCA5A5',
                                    border: '0.5px solid #EF444430',
                                    opacity: deleteLoading ? 0.6 : 1,
                                }}
                            >
                                {deleteLoading ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
