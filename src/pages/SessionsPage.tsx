import { useState, useEffect, useCallback, useRef } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getAthleteById } from '../api/athletes'
import type { Athlete } from '../api/athletes'
import {
    getSessionsByAthlete, getSessionById, createSession, deleteSession,
    uploadSessionVideo, analyzeSession, getSessionResults,
    updatePhaseAnnotations,exportSessionPdf,
    GESTURE_LABELS, STATUS_LABELS, STATUS_COLORS, PHASE_KEYS, PHASE_LABELS,
} from '../api/sessions'
import type { Session, SessionResults, GestureType, SessionStatus } from '../api/sessions'
import SessionResultsPanel from '../components/sessions/SessionResultsPanel'
import FrameCandidatesPanel from '../components/sessions/FrameCandidatesPanel'
import { useToast } from '../contexts/ToastContext'

const card   = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' } as const
const inner  = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' } as const
const accent = { background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' } as const

function StatusBadge({ status }: { status: SessionStatus }) {
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

export default function SessionsPage() {
    const { athleteId } = useParams<{ athleteId: string }>()
    const navigate      = useNavigate()
    const { showToast } = useToast()

    const [athlete, setAthlete]               = useState<Athlete | null>(null)
    const [sessions, setSessions]             = useState<Session[]>([])
    const [isLoading, setIsLoading]           = useState(true)
    const [sidebarOpen, setSidebarOpen]       = useState(true)

    const [active, setActive]                 = useState<Session | null>(null)
    const [results, setResults]               = useState<SessionResults | null>(null)
    const [resultsLoading, setResultsLoading] = useState(false)

    const [showCreate, setShowCreate]         = useState(false)
    const [createGesture, setCreateGesture]   = useState<GestureType>('service')
    const [createLoading, setCreateLoading]   = useState(false)

    const [uploadProgress, setUploadProgress] = useState<number | null>(null)
    const fileRef = useRef<HTMLInputElement>(null)
    const pollRef = useRef<ReturnType<typeof setInterval> | null>(null)

    const [analyzeLoading, setAnalyzeLoading] = useState(false)
    const [analyzeHint, setAnalyzeHint]       = useState<string | null>(null)
    const [showCandidates, setShowCandidates] = useState(false)

    const [annotations, setAnnotations]       = useState<Record<string, string>>({})
    const [annotSaving, setAnnotSaving]       = useState(false)

    const [deleteTarget, setDeleteTarget]     = useState<Session | null>(null)
    const [deleteLoading, setDeleteLoading]   = useState(false)
    const [pdfLoading, setPdfLoading] = useState(false)
    // ── Data ────────────────────────────────────────────────
    const fetchData = useCallback(async () => {
        if (!athleteId) return
        try {
            const [ath, sessResp] = await Promise.all([
                getAthleteById(athleteId),
                getSessionsByAthlete(athleteId),
            ])
            setAthlete(ath)
            setSessions(sessResp.data)
        } catch {
            showToast('Erreur de chargement', 'error')
        } finally {
            setIsLoading(false)
        }
    }, [athleteId, showToast])

    useEffect(() => {
        const run = async () => { await fetchData() }
        void run()
    }, [fetchData])

    const openSession = useCallback(async (s: Session) => {
        setActive(s)
        setResults(null)
        setAnalyzeHint(null)
        setShowCandidates(false)
        // Collapse sidebar when a session is opened (more space for detail)
        setSidebarOpen(false)

        const keys = PHASE_KEYS[s.gesture_type as GestureType] ?? []
        const existing = s.phase_annotations ?? {}
        const init: Record<string, string> = {}
        keys.forEach(k => { init[k] = existing[k]?.toString() ?? '' })
        setAnnotations(init)

        if (s.status === 'completed') {
            setResultsLoading(true)
            try {
                const r = await getSessionResults(s.id)
                setResults(r)
            } catch {
                setResults(null)
            } finally {
                setResultsLoading(false)
            }
        }
    }, [])

    const closeDetail = () => {
        setActive(null); setResults(null)
        setAnalyzeHint(null); setUploadProgress(null)
        setSidebarOpen(true); setShowCandidates(false)
    }

    const handleCreate = async () => {
        if (!athleteId) return
        setCreateLoading(true)
        try {
            const s = await createSession({ athlete_id: athleteId, gesture_type: createGesture })
            showToast('Session créée')
            setShowCreate(false)
            await fetchData()
            openSession(s)
        } catch {
            showToast('Erreur lors de la création', 'error')
        } finally { setCreateLoading(false) }
    }

    const handleUpload = async (file: File) => {
        if (!active) return
        setUploadProgress(0)
        try {
            const resp = await uploadSessionVideo(active.id, file, (p) => setUploadProgress(p))
            showToast('Vidéo uploadée')
            const updated = { ...active, video_url: resp.video_url, status: resp.status as SessionStatus }
            setActive(updated)
            await fetchData()
        } catch {
            showToast("Erreur lors de l'upload", 'error')
        } finally { setUploadProgress(null) }
    }

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const f = e.target.files?.[0]; if (f) handleUpload(f)
    }
    const onDrop = (e: React.DragEvent) => {
        e.preventDefault(); const f = e.dataTransfer.files?.[0]; if (f) handleUpload(f)
    }

    const stopPolling = useCallback(() => {
        if (pollRef.current) { clearInterval(pollRef.current); pollRef.current = null }
    }, [])

    // Nettoyer le polling si on quitte la page
    useEffect(() => () => stopPolling(), [stopPolling])

    const handleAnalyze = async () => {
        if (!active) return
        setAnalyzeLoading(true); setAnalyzeHint(null)
        try {
            // 1. Lancer l'analyse — le backend répond immédiatement (202)
            const resp = await analyzeSession(active.id)
            if (resp.hint) setAnalyzeHint(resp.hint)

            // Mettre à jour le badge de statut localement
            setActive(prev => prev ? { ...prev, status: 'processing' } : prev)
            await fetchData()

            // 2. Poller GET /sessions/{id} toutes les 3s jusqu'à fin du pipeline
            stopPolling()
            pollRef.current = setInterval(async () => {
                try {
                    const refreshed = await getSessionById(active.id)
                    setActive(refreshed)

                    // Mettre à jour la liste sidebar aussi
                    setSessions(prev => prev.map(s => s.id === refreshed.id ? refreshed : s))

                    if (refreshed.status === 'completed') {
                        stopPolling()
                        setAnalyzeLoading(false)
                        showToast(resp.has_annotations ? 'Analyse complète terminée ✓' : 'Passe 1 terminée — annotez les phases')
                        if (!resp.has_annotations) setShowCandidates(true)
                        // Charger les résultats si passe 2
                        if (resp.has_annotations) {
                            setResultsLoading(true)
                            try {
                                const r = await getSessionResults(refreshed.id)
                                setResults(r)
                            } catch { setResults(null) }
                            finally { setResultsLoading(false) }
                        }
                    } else if (refreshed.status === 'error') {
                        stopPolling()
                        setAnalyzeLoading(false)
                        showToast('Erreur pipeline — consultez les logs serveur', 'error')
                    }
                } catch {
                    // Erreur réseau passagère — on continue à poller
                }
            }, 3000)

        } catch (err: unknown) {
            setAnalyzeLoading(false)
            const axiosErr = err as { response?: { data?: { detail?: string } } }
            showToast(axiosErr?.response?.data?.detail ?? 'Erreur pipeline', 'error')
        }
        // Note : setAnalyzeLoading(false) est appelé dans le poller, pas ici
    }

    const handleSaveAnnotations = async () => {
        if (!active) return
        const parsed: Record<string, number> = {}
        for (const [key, val] of Object.entries(annotations)) {
            if (!val.trim()) continue
            const n = parseInt(val, 10)
            if (isNaN(n) || n < 0) { showToast(`Frame invalide pour ${PHASE_LABELS[key] ?? key}`, 'error'); return }
            parsed[key] = n
        }
        if (Object.keys(parsed).length === 0) { showToast('Saisissez au moins une frame clé', 'error'); return }
        setAnnotSaving(true)
        try {
            await updatePhaseAnnotations(active.id, parsed)
            showToast('Annotations sauvegardées')
            await fetchData()
            const refreshed = (await getSessionsByAthlete(athleteId!)).data.find(s => s.id === active.id)
            if (refreshed) {
                setActive(refreshed)
                const keys = PHASE_KEYS[refreshed.gesture_type as GestureType] ?? []
                const existing = refreshed.phase_annotations ?? {}
                const init: Record<string, string> = {}
                keys.forEach(k => { init[k] = existing[k]?.toString() ?? '' })
                setAnnotations(init)
            }
        } catch {
            showToast('Erreur lors de la sauvegarde', 'error')
        } finally { setAnnotSaving(false) }
    }

    const handleDelete = async () => {
        if (!deleteTarget) return
        setDeleteLoading(true)
        try {
            await deleteSession(deleteTarget.id)
            showToast('Session supprimée')
            setDeleteTarget(null)
            if (active?.id === deleteTarget.id) closeDetail()
            await fetchData()
        } catch {
            showToast('Erreur lors de la suppression', 'error')
        } finally { setDeleteLoading(false) }
    }

    const handleExportPdf = async () => {
        if (!active) return
        setPdfLoading(true)
        try {
            await exportSessionPdf(active.id)
            showToast('Rapport PDF téléchargé ✓')
        } catch {
            showToast('Erreur lors de la génération du PDF', 'error')
        } finally {
            setPdfLoading(false)
        }
    }

    const phaseKeys      = active ? (PHASE_KEYS[active.gesture_type as GestureType] ?? []) : []
    const hasAnnotations = active?.phase_annotations && Object.keys(active.phase_annotations).length > 0
    const canAnalyze     = active && active.video_url && ['ready', 'completed', 'error'].includes(active.status)

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
                        Sessions — {athlete?.name ?? '…'}
                    </h1>
                    <p className="text-xs mt-0.5" style={{ color: '#64748B' }}>
                        {sessions.length} session{sessions.length !== 1 ? 's' : ''}
                        {athlete && <> · {athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'} · {athlete.age} ans</>}
                    </p>
                </div>
                <button
                    onClick={() => setShowCreate(true)}
                    className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                    style={accent}
                >
                    + Nouvelle session
                </button>
            </div>

            {/* ── Create form ── */}
            {showCreate && (
                <div className="rounded-xl p-4" style={card}>
                    <p className="text-xs font-medium text-white mb-3">Type de geste</p>
                    <div className="flex flex-wrap gap-2 mb-4">
                        {(Object.keys(GESTURE_LABELS) as GestureType[]).map((g) => (
                            <button
                                key={g}
                                onClick={() => setCreateGesture(g)}
                                className="px-4 py-2 rounded-lg text-sm transition-all"
                                style={createGesture === g
                                    ? { backgroundColor: '#38BDF815', color: '#38BDF8', border: '0.5px solid #38BDF850' }
                                    : { ...inner, color: '#94A3B8' }}
                            >
                                {GESTURE_LABELS[g]}
                            </button>
                        ))}
                    </div>
                    <div className="flex gap-2">
                        <button onClick={handleCreate} disabled={createLoading}
                                className="px-4 py-2 rounded-lg text-sm font-medium"
                                style={{ ...accent, opacity: createLoading ? 0.6 : 1 }}>
                            {createLoading ? 'Création…' : 'Créer'}
                        </button>
                        <button onClick={() => setShowCreate(false)}
                                className="px-4 py-2 rounded-lg text-sm"
                                style={{ ...inner, color: '#94A3B8' }}>
                            Annuler
                        </button>
                    </div>
                </div>
            )}

            {/* ── Main layout ── */}
            <div className="flex gap-4 items-start">

                {/* ── Sidebar collapsible ── */}
                <div
                    className="flex-shrink-0 transition-all duration-200"
                    style={{ width: sidebarOpen ? 260 : 48 }}
                >
                    {/* Toggle button */}
                    <button
                        onClick={() => setSidebarOpen(!sidebarOpen)}
                        className="w-full flex items-center justify-between mb-2 px-2 py-1.5 rounded-lg text-xs transition-all hover:opacity-80"
                        style={{ color: '#64748B', ...inner }}
                    >
                        {sidebarOpen && <span>Sessions</span>}
                        <span>{sidebarOpen ? '◀' : '▶'}</span>
                    </button>

                    {/* Session list */}
                    <div className="space-y-1.5">
                        {sessions.length === 0 && sidebarOpen ? (
                            <div className="rounded-xl py-10 text-center" style={card}>
                                <p className="text-xl mb-2">🎬</p>
                                <p className="text-xs text-white">Aucune session</p>
                            </div>
                        ) : (
                            sessions.map((s) => {
                                const isAct = active?.id === s.id
                                const c = STATUS_COLORS[s.status as SessionStatus] ?? STATUS_COLORS.created
                                return (
                                    <button
                                        key={s.id}
                                        onClick={() => openSession(s)}
                                        className="w-full text-left rounded-xl transition-all"
                                        style={{
                                            backgroundColor: isAct ? '#162A45' : '#0F2035',
                                            border: `0.5px solid ${isAct ? '#38BDF850' : '#1E3A5F'}`,
                                            padding: sidebarOpen ? '10px 12px' : '10px',
                                        }}
                                        title={!sidebarOpen ? `${GESTURE_LABELS[s.gesture_type as GestureType]} — ${STATUS_LABELS[s.status as SessionStatus]}` : undefined}
                                    >
                                        {sidebarOpen ? (
                                            <>
                                                <div className="flex items-center justify-between mb-1">
                                                    <span className="text-xs font-medium text-white truncate mr-2">
                                                        {GESTURE_LABELS[s.gesture_type as GestureType] ?? s.gesture_type}
                                                    </span>
                                                    <StatusBadge status={s.status as SessionStatus} />
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <p className="text-xs" style={{ color: '#64748B' }}>
                                                        {new Date(s.created_at).toLocaleDateString('fr-CA', { day: 'numeric', month: 'short' })}
                                                    </p>
                                                    <span
                                                        onClick={(e) => { e.stopPropagation(); setDeleteTarget(s) }}
                                                        className="text-xs cursor-pointer hover:opacity-100 transition-opacity"
                                                        style={{ color: '#475569', opacity: 0.5 }}
                                                    >🗑</span>
                                                </div>
                                            </>
                                        ) : (
                                            /* Collapsed: just a colored dot */
                                            <div className="flex justify-center">
                                                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: c.text }} />
                                            </div>
                                        )}
                                    </button>
                                )
                            })
                        )}
                    </div>
                </div>

                {/* ── Detail panel ── */}
                <div className="flex-1 min-w-0 space-y-4">
                    {!active ? (
                        <div className="rounded-xl py-24 text-center" style={card}>
                            <p className="text-3xl mb-3">📋</p>
                            <p className="text-sm text-white mb-1">Sélectionnez une session</p>
                            <p className="text-xs" style={{ color: '#94A3B8' }}>Ou créez-en une ci-dessus.</p>
                        </div>
                    ) : (
                        <>
                            {/* ── Session header ── */}
                            <div className="rounded-xl px-4 py-3 flex items-center justify-between" style={card}>
                                <div className="flex items-center gap-3">
                                    <h2 className="text-sm font-medium text-white">
                                        {GESTURE_LABELS[active.gesture_type as GestureType] ?? active.gesture_type}
                                    </h2>
                                    <StatusBadge status={active.status as SessionStatus} />
                                    <span className="text-xs" style={{ color: '#64748B' }}>
                                        FPS {active.fps}
                                        {active.total_frames && <> · {active.total_frames} frames</>}
                                    </span>
                                </div>
                                <button onClick={closeDetail} className="text-xs hover:opacity-80" style={{ color: '#64748B' }}>✕</button>
                            </div>

                            {/* ── Upload zone (created) ── */}
                            {active.status === 'created' && (
                                <div
                                    className="rounded-xl p-10 text-center cursor-pointer transition-all"
                                    style={{ ...inner, borderStyle: 'dashed' }}
                                    onClick={() => fileRef.current?.click()}
                                    onDragOver={(e) => e.preventDefault()}
                                    onDrop={onDrop}
                                >
                                    <input ref={fileRef} type="file" accept=".mp4,.mov,.avi,.mkv" className="hidden" onChange={onFileChange} />
                                    {uploadProgress !== null ? (
                                        <div>
                                            <p className="text-sm text-white mb-3">Upload en cours…</p>
                                            <div className="w-48 mx-auto h-1.5 rounded-full overflow-hidden" style={{ backgroundColor: '#1E3A5F' }}>
                                                <div className="h-full rounded-full transition-all" style={{ width: `${uploadProgress}%`, background: 'linear-gradient(90deg, #38BDF8, #10F5A0)' }} />
                                            </div>
                                            <p className="text-xs mt-2" style={{ color: '#64748B' }}>{uploadProgress}%</p>
                                        </div>
                                    ) : (
                                        <>
                                            <p className="text-3xl mb-3">📹</p>
                                            <p className="text-sm font-medium text-white mb-1">Glissez la vidéo ici</p>
                                            <p className="text-xs" style={{ color: '#94A3B8' }}>ou cliquez · MP4, MOV, AVI, MKV</p>
                                        </>
                                    )}
                                </div>
                            )}

                            {/* ── Analyze + Annotations côte à côte ── */}
                            {active.status !== 'created' && (
                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">

                                    {/* Analyze block */}
                                    {canAnalyze && (
                                        <div className="rounded-xl p-4" style={card}>
                                            <p className="text-xs font-medium text-white mb-1">Lancer l'analyse</p>
                                            <p className="text-xs mb-4" style={{ color: '#94A3B8' }}>
                                                {hasAnnotations
                                                    ? 'Annotations définies — comparaison normative complète (Passe 2).'
                                                    : 'Sans annotation — mode exploration (Passe 1).'}
                                            </p>
                                            <button
                                                onClick={handleAnalyze}
                                                disabled={analyzeLoading}
                                                className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
                                                style={{ ...accent, opacity: analyzeLoading ? 0.6 : 1 }}
                                            >
                                                {analyzeLoading ? '⏳ Analyse en cours…'
                                                    : hasAnnotations ? '🚀 Lancer l\'analyse complète'
                                                        : '🔍 Passe exploratoire'}
                                            </button>
                                            {active.status === 'error' && (
                                                <p className="text-xs mt-2" style={{ color: '#FCA5A5' }}>Analyse précédente échouée.</p>
                                            )}
                                            {analyzeHint && (
                                                <p className="text-xs mt-2 rounded-lg px-3 py-2" style={{ color: '#FAC775', backgroundColor: '#EF9F2710' }}>
                                                    💡 {analyzeHint}
                                                </p>
                                            )}
                                        </div>
                                    )}

                                    {/* FrameCandidatesPanel — Passe 1 terminée */}
                                    {showCandidates && active.status !== 'processing' && (
                                        <div className="lg:col-span-2">
                                            <FrameCandidatesPanel
                                                sessionId={active.id}
                                                onAcceptAll={(annots) => {
                                                    // Pré-remplit tous les champs annotation
                                                    const strAnnots: Record<string, string> = {}
                                                    Object.entries(annots).forEach(([k, v]) => { strAnnots[k] = String(v) })
                                                    setAnnotations(strAnnots)
                                                    setShowCandidates(false)
                                                }}
                                                onAcceptOne={(phase, frame) => {
                                                    setAnnotations(prev => ({ ...prev, [phase]: String(frame) }))
                                                }}
                                            />
                                        </div>
                                    )}

                                    {/* Annotation block */}
                                    {phaseKeys.length > 0 && (
                                        <div className="rounded-xl p-4" style={card}>
                                            <p className="text-xs font-medium text-white mb-1">Annotation des phases</p>
                                            <p className="text-xs mb-3" style={{ color: '#94A3B8' }}>
                                                Frames clés pour la comparaison normative (Passe 2).
                                            </p>
                                            <div className="space-y-2">
                                                {phaseKeys.map((key) => (
                                                    <div key={key} className="flex items-center gap-2">
                                                        <label className="text-xs flex-shrink-0 w-32" style={{ color: '#94A3B8' }}>
                                                            {PHASE_LABELS[key] ?? key}
                                                        </label>
                                                        <input
                                                            type="number" min="0"
                                                            placeholder="n° frame"
                                                            value={annotations[key] ?? ''}
                                                            onChange={(e) => setAnnotations(prev => ({ ...prev, [key]: e.target.value }))}
                                                            className="flex-1 rounded-lg px-3 py-1.5 text-xs text-white outline-none"
                                                            style={inner}
                                                            onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
                                                            onBlur={(e)  => (e.target.style.borderColor = '#1E3A5F')}
                                                        />
                                                    </div>
                                                ))}
                                            </div>
                                            <div className="flex gap-2 mt-3 flex-wrap">
                                                <button
                                                    onClick={handleSaveAnnotations}
                                                    disabled={annotSaving}
                                                    className="flex-1 py-2 rounded-lg text-xs font-medium"
                                                    style={{ backgroundColor: '#38BDF815', color: '#38BDF8', border: '0.5px solid #38BDF830', opacity: annotSaving ? 0.6 : 1 }}
                                                >
                                                    {annotSaving ? 'Sauvegarde…' : 'Sauvegarder'}
                                                </button>
                                                {hasAnnotations && active.status !== 'processing' && (
                                                    <button
                                                        onClick={handleAnalyze}
                                                        disabled={analyzeLoading}
                                                        className="flex-1 py-2 rounded-lg text-xs font-medium"
                                                        style={{ ...accent, opacity: analyzeLoading ? 0.6 : 1 }}
                                                    >
                                                        {analyzeLoading ? '⏳' : '🚀 Passe 2'}
                                                    </button>
                                                )}
                                                {!showCandidates && (
                                                    <button
                                                        onClick={() => setShowCandidates(true)}
                                                        className="flex-1 py-2 rounded-lg text-xs font-medium"
                                                        style={{ backgroundColor: '#6366F115', color: '#A5B4FC', border: '0.5px solid #6366F130' }}
                                                    >
                                                        🔍 Suggestions IA
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    )}

                                    {/* If completed but no canAnalyze, show relaunch in annotation block area */}
                                    {!canAnalyze && active.status === 'completed' && hasAnnotations && phaseKeys.length === 0 && (
                                        <div className="rounded-xl p-4" style={card}>
                                            <button
                                                onClick={handleAnalyze}
                                                disabled={analyzeLoading}
                                                className="w-full py-2.5 rounded-lg text-sm font-medium"
                                                style={{ ...accent, opacity: analyzeLoading ? 0.6 : 1 }}
                                            >
                                                {analyzeLoading ? '⏳ Analyse…' : '🚀 Relancer (Passe 2)'}
                                            </button>
                                        </div>
                                    )}
                                </div>
                            )}

                            {/* ── Results ── */}
                            {active.status === 'completed' && (
                                <>
                                    {resultsLoading ? (
                                        <div className="rounded-xl py-10 text-center" style={card}>
                                            <p className="text-sm" style={{ color: '#94A3B8' }}>Chargement des résultats…</p>
                                        </div>
                                    ) : results ? (
                                        <SessionResultsPanel results={results} onExportPdf={handleExportPdf}/>
                                    ) : (
                                        <div className="rounded-xl p-4" style={card}>
                                            <p className="text-xs font-medium text-white mb-1">Analyse exploratoire terminée</p>
                                            <p className="text-xs" style={{ color: '#94A3B8' }}>
                                                Annotez les phases ci-dessus, puis relancez pour obtenir la comparaison normative.
                                            </p>
                                        </div>
                                    )}
                                </>
                            )}
                        </>
                    )}
                </div>
            </div>

            {/* ── Delete modal ── */}
            {deleteTarget && (
                <div className="fixed inset-0 flex items-center justify-center z-50"
                     style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                     onClick={() => setDeleteTarget(null)}
                >
                    <div className="rounded-2xl p-6 w-full max-w-sm mx-4" style={card} onClick={(e) => e.stopPropagation()}>
                        <h3 className="text-base font-medium text-white mb-2">Supprimer la session</h3>
                        <p className="text-sm mb-5" style={{ color: '#94A3B8' }}>
                            Supprimer <span className="text-white font-medium">
                                {GESTURE_LABELS[deleteTarget.gesture_type as GestureType] ?? deleteTarget.gesture_type}
                            </span> ? Toutes les frames et métriques seront perdues.
                        </p>
                        <div className="flex gap-3">
                            <button onClick={() => setDeleteTarget(null)}
                                    className="flex-1 py-2 rounded-lg text-sm" style={{ ...inner, color: '#94A3B8' }}>
                                Annuler
                            </button>
                            <button onClick={handleDelete} disabled={deleteLoading}
                                    className="flex-1 py-2 rounded-lg text-sm font-medium"
                                    style={{ backgroundColor: '#EF444415', color: '#FCA5A5', border: '0.5px solid #EF444430', opacity: deleteLoading ? 0.6 : 1 }}>
                                {deleteLoading ? 'Suppression…' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
