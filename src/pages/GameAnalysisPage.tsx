import  React from 'react'
import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAthleteById } from '../api/athletes'
import type { Athlete } from '../api/athletes'
import {
    createMatchSession, getMatchSessionsByAthlete, getMatchSessionById,
    deleteMatchSession, uploadMatchVideo, analyzeMatch, getMatchResults,
    SURFACE_LABELS, FORMAT_LABELS, STATUS_LABELS, STATUS_COLORS,
} from '../api/match_sessions'
import type {
    MatchSession, MatchMetrics, MatchStatus,
    SurfaceType, MatchFormat,
} from '../api/match_sessions'
import MatchResultsPanel from '../components/match/MatchResultsPanel'
import { useToast } from '../contexts/ToastContext'

// ── Design tokens (identiques à SessionsPage) ────────────────
const card   = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' } as const
const inner  = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' } as const
const accent = { background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' } as const

// ── StatusBadge ──────────────────────────────────────────────
function StatusBadge({ status }: { status: MatchStatus }) {
    const c = STATUS_COLORS[status] ?? STATUS_COLORS.created
    return (
        <span
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium"
            style={{ backgroundColor: c.bg, color: c.text, border: `0.5px solid ${c.border}` }}
        >
            <span className="w-1.5 h-1.5 rounded-full flex-shrink-0" style={{ backgroundColor: c.text }} />
            {STATUS_LABELS[status] ?? status}
        </span>
    )
}

// ── SurfaceDot ───────────────────────────────────────────────
const SURFACE_COLORS: Record<SurfaceType, string> = {
    hard:  '#38BDF8',
    clay:  '#F97316',
    grass: '#10F5A0',
}

function SurfaceDot({ surface }: { surface: SurfaceType }) {
    return (
        <span className="inline-flex items-center gap-1 text-xs" style={{ color: '#64748B' }}>
            <span
                className="w-1.5 h-1.5 rounded-full"
                style={{ backgroundColor: SURFACE_COLORS[surface] }}
            />
            {SURFACE_LABELS[surface]}
        </span>
    )
}

// ── MatchCard (item dans la sidebar) ─────────────────────────
function MatchCard({
                       match, active, onClick, onDelete,
                   }: {
    match: MatchSession
    active: boolean
    onClick: () => void
    onDelete: (e: React.MouseEvent) => void
}) {
    const date = new Date(match.created_at).toLocaleDateString('fr-CA', {
        day: '2-digit', month: 'short',
    })

    return (
        <button
            onClick={onClick}
            className="w-full text-left rounded-xl p-3 transition-all group"
            style={
                active
                    ? { backgroundColor: '#38BDF810', border: '0.5px solid #38BDF840' }
                    : { ...inner, borderColor: '#1E3A5F' }
            }
        >
            <div className="flex items-start justify-between gap-2">
                <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium text-white truncate">
                        {match.opponent_name ? `vs ${match.opponent_name}` : 'Match sans adversaire'}
                    </p>
                    <p className="text-xs mt-0.5 truncate" style={{ color: '#64748B' }}>
                        {match.location ?? 'Lieu non renseigné'} · {date}
                    </p>
                    <div className="flex items-center gap-2 mt-1.5">
                        <SurfaceDot surface={match.surface} />
                        <span className="text-xs" style={{ color: '#475569' }}>
                            {FORMAT_LABELS[match.match_format]}
                        </span>
                    </div>
                </div>
                <div className="flex flex-col items-end gap-1 flex-shrink-0">
                    <StatusBadge status={match.status} />
                    <button
                        onClick={onDelete}
                        className="opacity-0 group-hover:opacity-100 transition-opacity text-xs px-1.5 py-0.5 rounded"
                        style={{ color: '#EF4444', backgroundColor: '#EF444410' }}
                    >
                        ✕
                    </button>
                </div>
            </div>
        </button>
    )
}


export default function GameAnalysisPage() {
    const { athleteId } = useParams<{ athleteId: string }>()
    const navigate      = useNavigate()
    const { showToast } = useToast()

    // ── State data ───────────────────────────────────────────
    const [athlete,   setAthlete]   = useState<Athlete | null>(null)
    const [matches,   setMatches]   = useState<MatchSession[]>([])
    const [isLoading, setIsLoading] = useState(true)

    // ── State UI ─────────────────────────────────────────────
    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [active,      setActive]      = useState<MatchSession | null>(null)
    const [results,     setResults]     = useState<MatchMetrics | null>(null)
    const [resultsLoading, setResultsLoading] = useState(false)

    // ── State création ───────────────────────────────────────
    const [showCreate,    setShowCreate]    = useState(false)
    const [createLoading, setCreateLoading] = useState(false)
    const [form, setForm] = useState<{
        surface: SurfaceType
        match_format: MatchFormat
        opponent_name: string
        location: string
        notes: string
    }>({
        surface:      'hard',
        match_format: 'best_of_3',
        opponent_name: '',
        location:     '',
        notes:        '',
    })

    // ── State upload ─────────────────────────────────────────
    const [uploadProgress, setUploadProgress] = useState<number | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)

    // ── State analyse ────────────────────────────────────────
    const [analyzeLoading, setAnalyzeLoading] = useState(false)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    // ── State delete ─────────────────────────────────────────
    const [deleteTarget,  setDeleteTarget]  = useState<MatchSession | null>(null)
    const [deleteLoading, setDeleteLoading] = useState(false)

    // ── Filtres ──────────────────────────────────────────────
    const [filterStatus, setFilterStatus] = useState<MatchStatus | 'all'>('all')
    const [sortDesc,     setSortDesc]     = useState(true)

    // ══════════════════════════════════════════════════════════
    // DATA
    // ══════════════════════════════════════════════════════════

    const fetchData = useCallback(async () => {
        if (!athleteId) return
        try {
            const [ath, resp] = await Promise.all([
                getAthleteById(athleteId),
                getMatchSessionsByAthlete(athleteId, { limit: 100 }),
            ])
            setAthlete(ath)
            setMatches(resp.data)
        } catch {
            showToast('Erreur de chargement', 'error')
        } finally {
            setIsLoading(false)
        }
    }, [athleteId, showToast])

    useEffect(() => {
        // eslint-disable-next-line react-hooks/set-state-in-effect
        void fetchData()
    }, [fetchData])

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }, [])

    useEffect(() => () => stopPolling(), [stopPolling])

    const startPolling = useCallback((matchId: string) => {
        stopPolling()
        pollRef.current = setInterval(async () => {
            try {
                const refreshed = await getMatchSessionById(matchId)
                setActive(refreshed)
                setMatches(prev => prev.map(m => m.id === refreshed.id ? refreshed : m))
                if (refreshed.status === 'completed') {
                    stopPolling()
                    setAnalyzeLoading(false)
                    showToast('Analyse terminée ✓')
                    setResultsLoading(true)
                    try {
                        const r = await getMatchResults(refreshed.id)
                        setResults(r)
                    } catch { setResults(null) }
                    finally { setResultsLoading(false) }
                } else if (refreshed.status === 'error') {
                    stopPolling()
                    setAnalyzeLoading(false)
                    showToast(refreshed.error_message?.slice(0, 80) ?? 'Erreur pipeline', 'error')
                }
            } catch {
                // réseau passager
            }
        }, 3000)
    }, [stopPolling, showToast])

    // ── Ouvrir un match ──────────────────────────────────────
    const openMatch = useCallback(async (m: MatchSession) => {
        setActive(m)
        setResults(null)
        setSidebarOpen(false)
        stopPolling()

        if (m.status === 'completed') {
            setResultsLoading(true)
            try {
                const r = await getMatchResults(m.id)
                setResults(r)
            } catch {
                setResults(null)
            } finally {
                setResultsLoading(false)
            }
        } else if (m.status === 'processing') {
            startPolling(m.id)
        }
    }, [stopPolling, startPolling])

    const closeDetail = () => {
        stopPolling()
        setActive(null)
        setResults(null)
        setUploadProgress(null)
        setSidebarOpen(true)
    }

    // ── Création ─────────────────────────────────────────────
    const handleCreate = async () => {
        if (!athleteId) return
        setCreateLoading(true)
        try {
            const resp = await createMatchSession({ athlete_id: athleteId, ...form })
            showToast('Match créé')
            setShowCreate(false)
            setForm({ surface: 'hard', match_format: 'best_of_3', opponent_name: '', location: '', notes: '' })
            await fetchData()
            void openMatch(resp.match_session)
        } catch {
            showToast('Erreur lors de la création', 'error')
        } finally {
            setCreateLoading(false)
        }
    }

    // ── Upload ───────────────────────────────────────────────
    const handleUpload = async (file: File) => {
        if (!active) return
        setUploadProgress(0)
        try {
            const resp = await uploadMatchVideo(active.id, file, (p) => setUploadProgress(p))
            showToast('Vidéo uploadée')
            const updated: MatchSession = { ...active, video_url: resp.video_url, status: resp.status }
            setActive(updated)
            setMatches(prev => prev.map(m => m.id === updated.id ? updated : m))
        } catch {
            showToast("Erreur lors de l'upload", 'error')
        } finally {
            setUploadProgress(null)
        }
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]
        if (f) void handleUpload(f)
        e.target.value = ''
    }

    const onDrop = (e: React.DragEvent) => {
        e.preventDefault()
        const f = e.dataTransfer.files?.[0]
        if (f) void handleUpload(f)
    }


    // ── Analyser ─────────────────────────────────────────────
    const handleAnalyze = async () => {
        if (!active) return
        setAnalyzeLoading(true)
        try {
            await analyzeMatch(active.id)
            setActive(prev => prev ? { ...prev, status: 'processing' } : prev)
            setMatches(prev => prev.map(m => m.id === active.id ? { ...m, status: 'processing' } : m))
            startPolling(active.id)
        } catch (err: unknown) {
            setAnalyzeLoading(false)
            const e = err as { response?: { data?: { detail?: string } } }
            showToast(e?.response?.data?.detail ?? 'Erreur pipeline', 'error')
        }
    }

    // ── Supprimer ────────────────────────────────────────────
    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            await deleteMatchSession(deleteTarget.id)
            showToast('Match supprimé')
            setDeleteTarget(null)
            if (active?.id === deleteTarget.id) closeDetail()
            await fetchData()
        } catch {
            showToast('Erreur lors de la suppression', 'error')
        } finally {
            setDeleteLoading(false)
        }
    }

    // ── Filtres + tri ────────────────────────────────────────
    const filtered = matches
        .filter(m => filterStatus === 'all' || m.status === filterStatus)
        .sort((a, b) => {
            const ta = new Date(a.created_at).getTime()
            const tb = new Date(b.created_at).getTime()
            return sortDesc ? tb - ta : ta - tb
        })

    const canAnalyze = active?.video_url && ['ready', 'completed', 'error'].includes(active.status ?? '')

    // ══════════════════════════════════════════════════════════
    // RENDER
    // ══════════════════════════════════════════════════════════

    if (isLoading) return (
        <div className="max-w-6xl mx-auto py-20 text-center">
            <p className="text-sm" style={{ color: '#94A3B8' }}>Chargement...</p>
        </div>
    )

    return (
        <div className="max-w-6xl mx-auto space-y-5">

            {/* ── Header ── */}
            <div className="flex items-center justify-between">
                <div>
                    <button
                        onClick={() => navigate('/athletes')}
                        className="text-xs mb-2 flex items-center gap-1 hover:opacity-80 transition-opacity"
                        style={{ color: '#64748B' }}
                    >
                        ← Retour aux athlètes
                    </button>
                    <h1 className="text-xl font-medium text-white">
                        Analyse de jeu — {athlete?.name ?? '…'}
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        {filtered.length} match{filtered.length !== 1 ? 's' : ''}
                        {filtered.length !== matches.length && ` (${matches.length} au total)`}
                        {athlete && <> · {athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'} · {athlete.age} ans</>}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                    style={accent}
                >
                    + Nouveau match
                </button>
            </div>

            {/* ── Formulaire création ── */}
            {showCreate && (
                <div className="rounded-xl p-5 space-y-4" style={card}>
                    <p className="text-sm font-medium text-white">Nouveau match</p>

                    {/* Surface */}
                    <div>
                        <p className="text-xs mb-2" style={{ color: '#64748B' }}>Surface</p>
                        <div className="flex gap-2">
                            {(['hard', 'clay', 'grass'] as SurfaceType[]).map((s) => (
                                <button
                                    key={s}
                                    onClick={() => setForm(f => ({ ...f, surface: s }))}
                                    className="px-4 py-2 rounded-lg text-sm transition-all"
                                    style={form.surface === s
                                        ? { backgroundColor: `${SURFACE_COLORS[s]}15`, color: SURFACE_COLORS[s], border: `0.5px solid ${SURFACE_COLORS[s]}50` }
                                        : { ...inner, color: '#94A3B8' }}
                                >
                                    {SURFACE_LABELS[s]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Format */}
                    <div>
                        <p className="text-xs mb-2" style={{ color: '#64748B' }}>Format</p>
                        <div className="flex gap-2 flex-wrap">
                            {(['best_of_3', 'best_of_5', 'pro_set'] as MatchFormat[]).map((f) => (
                                <button
                                    key={f}
                                    onClick={() => setForm(fm => ({ ...fm, match_format: f }))}
                                    className="px-4 py-2 rounded-lg text-sm transition-all"
                                    style={form.match_format === f
                                        ? { backgroundColor: '#38BDF815', color: '#38BDF8', border: '0.5px solid #38BDF850' }
                                        : { ...inner, color: '#94A3B8' }}
                                >
                                    {FORMAT_LABELS[f]}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Champs texte */}
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Adversaire</p>
                            <input
                                type="text"
                                placeholder="Nom de l'adversaire"
                                value={form.opponent_name}
                                onChange={e => setForm(f => ({ ...f, opponent_name: e.target.value }))}
                                className="w-full rounded-lg px-3 py-2 text-sm outline-none text-white"
                                style={{ ...inner }}
                            />
                        </div>
                        <div>
                            <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Lieu</p>
                            <input
                                type="text"
                                placeholder="Club, ville…"
                                value={form.location}
                                onChange={e => setForm(f => ({ ...f, location: e.target.value }))}
                                className="w-full rounded-lg px-3 py-2 text-sm outline-none text-white"
                                style={{ ...inner }}
                            />
                        </div>
                    </div>

                    <div>
                        <p className="text-xs mb-1.5" style={{ color: '#64748B' }}>Notes (optionnel)</p>
                        <textarea
                            rows={2}
                            placeholder="Contexte, conditions…"
                            value={form.notes}
                            onChange={e => setForm(f => ({ ...f, notes: e.target.value }))}
                            className="w-full rounded-lg px-3 py-2 text-sm outline-none text-white resize-none"
                            style={{ ...inner }}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={() => void handleCreate()}
                            disabled={createLoading}
                            className="px-4 py-2 rounded-lg text-sm font-medium"
                            style={{ ...accent, opacity: createLoading ? 0.6 : 1 }}
                        >
                            {createLoading ? 'Création…' : 'Créer'}
                        </button>
                        <button
                            onClick={() => setShowCreate(false)}
                            className="px-4 py-2 rounded-lg text-sm"
                            style={{ ...inner, color: '#94A3B8' } as React.CSSProperties}
                        >
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* ── Layout principal ── */}
            <div className="flex gap-4 items-start">

                {/* ── Sidebar ── */}
                <div
                    className="flex-shrink-0 transition-all duration-200"
                    style={{ width: sidebarOpen ? 260 : 48 }}
                >
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-full flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{ color: '#64748B', ...inner }}
                    >
                        {sidebarOpen && <span>Matchs</span>}
                        <span>{sidebarOpen ? '◀' : '▶'}</span>
                    </button>

                    {sidebarOpen && (
                        <>
                            {/* Filtres */}
                            <div className="space-y-1.5 mb-2">
                                <select
                                    value={filterStatus}
                                    onChange={e => setFilterStatus(e.target.value as MatchStatus | 'all')}
                                    className="w-full rounded-lg px-2 py-1.5 text-xs outline-none"
                                    style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F', color: '#94A3B8' }}
                                >
                                    <option value="all">Tous les statuts</option>
                                    <option value="created">Créé</option>
                                    <option value="ready">Prêt</option>
                                    <option value="processing">En analyse</option>
                                    <option value="completed">Terminé</option>
                                    <option value="error">Erreur</option>
                                </select>
                                <button
                                    onClick={() => setSortDesc(p => !p)}
                                    className="w-full flex items-center justify-between rounded-lg px-2 py-1.5 text-xs transition-opacity hover:opacity-80"
                                    style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F', color: '#64748B' }}
                                >
                                    <span>Date</span>
                                    <span>{sortDesc ? '↓ Plus récent' : '↑ Plus ancien'}</span>
                                </button>
                            </div>

                            {/* Liste matchs */}
                            <div className="space-y-1.5 overflow-y-auto" style={{ maxHeight: 'calc(100vh - 280px)' }}>
                                {filtered.length === 0 ? (
                                    <p className="text-xs text-center py-4" style={{ color: '#475569' }}>
                                        Aucun match
                                    </p>
                                ) : filtered.map(m => (
                                    <MatchCard
                                        key={m.id}
                                        match={m}
                                        active={active?.id === m.id}
                                        onClick={() => void openMatch(m)}
                                        onDelete={(e) => { e.stopPropagation(); setDeleteTarget(m) }}
                                    />
                                ))}
                            </div>
                        </>
                    )}
                </div>

                {/* ── Zone détail ── */}
                <div className="flex-1 min-w-0">
                    {!active ? (
                        /* État vide */
                        <div
                            className="rounded-xl flex flex-col items-center justify-center text-center py-20"
                            style={card}
                        >
                            <div
                                className="w-12 h-12 rounded-full flex items-center justify-center mb-4 text-xl"
                                style={{ backgroundColor: '#38BDF810', border: '0.5px solid #38BDF830' }}
                            >
                                🎾
                            </div>
                            <p className="text-sm font-medium text-white mb-1">Sélectionnez un match</p>
                            <p className="text-xs" style={{ color: '#475569' }}>
                                ou créez une nouvelle analyse de jeu
                            </p>
                        </div>
                    ) : (
                        /* Détail match actif */
                        <div className="space-y-4">

                            {/* Header détail */}
                            <div className="rounded-xl p-4" style={card}>
                                <div className="flex items-start justify-between gap-4">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-3 mb-1">
                                            <button
                                                onClick={closeDetail}
                                                className="text-xs hover:opacity-70 transition-opacity"
                                                style={{ color: '#64748B' }}
                                            >
                                                ← Retour
                                            </button>
                                            <StatusBadge status={active.status} />
                                        </div>
                                        <h2 className="text-base font-medium text-white">
                                            {active.opponent_name ? `vs ${active.opponent_name}` : 'Match'}
                                        </h2>
                                        <div className="flex items-center gap-3 mt-1 flex-wrap">
                                            <SurfaceDot surface={active.surface} />
                                            <span className="text-xs" style={{ color: '#475569' }}>
                                                {FORMAT_LABELS[active.match_format]}
                                            </span>
                                            {active.location && (
                                                <span className="text-xs" style={{ color: '#475569' }}>
                                                    📍 {active.location}
                                                </span>
                                            )}
                                            <span className="text-xs" style={{ color: '#475569' }}>
                                                {new Date(active.created_at).toLocaleDateString('fr-CA', {
                                                    day: '2-digit', month: 'long', year: 'numeric',
                                                })}
                                            </span>
                                        </div>
                                        {active.notes && (
                                            <p className="text-xs mt-2 italic" style={{ color: '#64748B' }}>
                                                {active.notes}
                                            </p>
                                        )}
                                    </div>

                                    {/* Actions */}
                                    <div className="flex gap-2 flex-shrink-0">
                                        {canAnalyze && (
                                            <button
                                                onClick={() => void handleAnalyze()}
                                                disabled={analyzeLoading}
                                                className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
                                                style={{ ...accent, opacity: analyzeLoading ? 0.6 : 1 }}
                                            >
                                                {analyzeLoading ? '⏳ Analyse…' : '▶ Analyser'}
                                            </button>
                                        )}
                                        <button
                                            onClick={() => setDeleteTarget(active)}
                                            className="px-3 py-1.5 rounded-lg text-xs transition-all"
                                            style={{ color: '#EF4444', backgroundColor: '#EF444410', border: '0.5px solid #EF444430' }}
                                        >
                                            Supprimer
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Zone upload vidéo */}
                            {!active.video_url && (
                                <div
                                    className="rounded-xl p-6 text-center cursor-pointer transition-all"
                                    style={{ ...card, borderStyle: 'dashed' }}
                                    onClick={() => fileRef.current?.click()}
                                    onDrop={onDrop}
                                    onDragOver={e => e.preventDefault()}
                                >
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={onFileChange}
                                    />
                                    {uploadProgress !== null ? (
                                        <div className="space-y-2">
                                            <p className="text-sm text-white">Upload en cours… {uploadProgress}%</p>
                                            <div className="w-full rounded-full h-1.5" style={{ backgroundColor: '#1E3A5F' }}>
                                                <div
                                                    className="h-1.5 rounded-full transition-all"
                                                    style={{
                                                        width: `${uploadProgress}%`,
                                                        background: 'linear-gradient(90deg, #38BDF8, #10F5A0)',
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-sm font-medium text-white mb-1">
                                                Déposer la vidéo du match
                                            </p>
                                            <p className="text-xs" style={{ color: '#475569' }}>
                                                MP4, MOV, AVI · max 2 GB · caméra fixe recommandée
                                            </p>
                                            <button
                                                className="mt-3 px-4 py-2 rounded-lg text-xs font-medium"
                                                style={accent}
                                            >
                                                Parcourir
                                            </button>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* Upload fait mais pas encore analysé */}
                            {active.video_url && active.status === 'ready' && (
                                <div className="rounded-xl p-4" style={card}>
                                    <div className="flex items-center justify-between">
                                        <div>
                                            <p className="text-sm font-medium text-white">Vidéo prête</p>
                                            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                                                Lancez l'analyse pour détecter les gestes et statistiques
                                            </p>
                                        </div>
                                        <div
                                            className="w-8 h-8 rounded-full flex items-center justify-center"
                                            style={{ backgroundColor: '#10F5A015', border: '0.5px solid #10F5A030' }}
                                        >
                                            <span style={{ color: '#10F5A0', fontSize: 14 }}>✓</span>
                                        </div>
                                    </div>
                                    <button
                                        onClick={() => fileRef.current?.click()}
                                        className="mt-3 text-xs"
                                        style={{ color: '#38BDF8' }}
                                    >
                                        Remplacer la vidéo
                                    </button>
                                    <input
                                        ref={fileRef}
                                        type="file"
                                        accept="video/*"
                                        className="hidden"
                                        onChange={onFileChange}
                                    />
                                </div>
                            )}

                            {/* Traitement en cours */}
                            {active.status === 'processing' && (
                                <div className="rounded-xl p-5" style={card}>
                                    <div className="flex items-center gap-3">
                                        <div
                                            className="w-8 h-8 rounded-full flex-shrink-0 animate-pulse"
                                            style={{ background: 'linear-gradient(135deg, #38BDF820, #10F5A020)', border: '0.5px solid #38BDF840' }}
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-white">Analyse en cours…</p>
                                            <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                                                Détection des gestes, segmentation des points, calcul des stats
                                            </p>
                                        </div>
                                    </div>
                                    {/* Barre de progression animée */}
                                    <div className="mt-4 w-full rounded-full h-1" style={{ backgroundColor: '#1E3A5F' }}>
                                        <div
                                            className="h-1 rounded-full animate-pulse"
                                            style={{ width: '60%', background: 'linear-gradient(90deg, #38BDF8, #10F5A0)' }}
                                        />
                                    </div>
                                </div>
                            )}

                            {/* Erreur pipeline */}
                            {active.status === 'error' && active.error_message && (
                                <div
                                    className="rounded-xl p-4"
                                    style={{ backgroundColor: '#2D1A1A', border: '0.5px solid #4A2828' }}
                                >
                                    <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>
                                        Erreur pipeline
                                    </p>
                                    <p className="text-xs mt-1 font-mono" style={{ color: '#EF4444' }}>
                                        {active.error_message}
                                    </p>
                                </div>
                            )}

                            {/* Résultats */}
                            {active.status === 'completed' && (
                                resultsLoading ? (
                                    <div className="rounded-xl p-8 text-center" style={card}>
                                        <p className="text-sm" style={{ color: '#94A3B8' }}>
                                            Chargement des résultats…
                                        </p>
                                    </div>
                                ) : results ? (
                                    <MatchResultsPanel metrics={results} />
                                ) : (
                                    <div className="rounded-xl p-8 text-center" style={card}>
                                        <p className="text-sm" style={{ color: '#EF4444' }}>
                                            Résultats introuvables
                                        </p>
                                    </div>
                                )
                            )}

                        </div>
                    )}
                </div>
            </div>

            {/* ── Modal suppression ── */}
            {deleteTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center"
                     style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}>
                    <div className="rounded-2xl p-6 w-80 space-y-4" style={card}>
                        <p className="text-sm font-medium text-white">Supprimer ce match ?</p>
                        <p className="text-xs" style={{ color: '#94A3B8' }}>
                            {deleteTarget.opponent_name
                                ? `Match vs ${deleteTarget.opponent_name}`
                                : 'Ce match'} et toutes ses données d'analyse seront supprimés définitivement.
                        </p>
                        <div className="flex gap-2">
                            <button
                                onClick={() => void handleDelete()}
                                disabled={deleteLoading}
                                className="flex-1 py-2 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: '#EF4444', color: 'white', opacity: deleteLoading ? 0.6 : 1 }}
                            >
                                {deleteLoading ? 'Suppression…' : 'Supprimer'}
                            </button>
                            <button
                                onClick={() => setDeleteTarget(null)}
                                className="flex-1 py-2 rounded-lg text-sm"
                                style={{ ...inner, color: '#94A3B8' } as React.CSSProperties}
                            >
                                Annuler
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}
