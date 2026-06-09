import { useState, useEffect } from 'react'
import { getSessionCandidates } from '../../api/sessions'
import type { CandidatesResponse, PhaseCandidate } from '../../api/sessions'
import { PHASE_LABELS } from '../../api/sessions'

// ── Confidence config ────────────────────────────────────────

const CONF = {
    HIGH:       { color: '#10F5A0', bg: '#10F5A012', border: '#10F5A030', label: 'Haute',      stars: '★★★★' },
    MEDIUM:     { color: '#38BDF8', bg: '#38BDF812', border: '#38BDF830', label: 'Moyenne',    stars: '★★★☆' },
    LOW:        { color: '#FAC775', bg: '#FAC77512', border: '#FAC77530', label: 'Faible',     stars: '★★☆☆' },
    UNRELIABLE: { color: '#FCA5A5', bg: '#FCA5A512', border: '#FCA5A530', label: 'Non fiable', stars: '★☆☆☆' },
}

type Confidence = keyof typeof CONF

// ── Props ────────────────────────────────────────────────────

interface Props {
    sessionId:    string
    onAcceptAll:  (annotations: Record<string, number>) => void
    onAcceptOne:  (phase: string, frame: number) => void
}

// ── Component ────────────────────────────────────────────────

export default function FrameCandidatesPanel({
                                                 sessionId, onAcceptAll, onAcceptOne,
                                             }: Props) {
    const [data, setData]         = useState<CandidatesResponse | null>(null)
    const [loading, setLoading]   = useState(true)
    const [error, setError]       = useState<string | null>(null)
    const [expanded, setExpanded] = useState<string | null>(null) // phase avec top3 déroulé

    const card  = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }
    const inner = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true)
            setError(null)
            try {
                const resp = await getSessionCandidates(sessionId)
                if (!cancelled) setData(resp)
            } catch (err: unknown) {
                if (!cancelled) {
                    const e = err as { response?: { data?: { detail?: string } } }
                    setError(e?.response?.data?.detail ?? 'Erreur chargement des candidats')
                }
            } finally {
                if (!cancelled) setLoading(false)
            }
        }
        void load()
        return () => { cancelled = true }
    }, [sessionId])

    if (loading) return (
        <div className="rounded-xl py-10 text-center" style={card}>
            <p className="text-sm animate-pulse" style={{ color: '#94A3B8' }}>
                Analyse des frames candidates…
            </p>
        </div>
    )

    if (error) return (
        <div className="rounded-xl px-4 py-4" style={{ backgroundColor: '#EF444410', border: '0.5px solid #EF444430' }}>
            <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>Candidats indisponibles</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{error}</p>
        </div>
    )

    if (!data) return null

    const phases       = Object.entries(data.phases)
    const allHigh      = phases.every(([, p]) => p.confidence === 'HIGH')
    const hasUnreliable = phases.some(([, p]) => p.confidence === 'UNRELIABLE')
    const allHaveSuggestion = phases.every(([, p]) => p.suggested_frame != null)

    const handleAcceptAll = () => {
        if (!data.best) return
        onAcceptAll(data.best)
    }

    return (
        <div className="space-y-4">

            {/* ── Header ── */}
            <div className="rounded-xl p-4" style={card}>
                <div className="flex items-center justify-between mb-2">
                    <div>
                        <h3 className="text-sm font-medium text-white">Frames candidates</h3>
                        <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                            {data.total_frames} frames analysées · {data.fps} FPS
                            {!data.has_video && (
                                <span className="ml-2" style={{ color: '#FAC775' }}>· Vidéo indisponible (screenshots non générés)</span>
                            )}
                        </p>
                    </div>
                    {allHaveSuggestion && data.best && (
                        <button
                            onClick={handleAcceptAll}
                            className="px-4 py-2 rounded-lg text-xs font-medium transition-opacity hover:opacity-90"
                            style={{
                                background: 'linear-gradient(90deg, #38BDF8, #10F5A0)',
                                color: '#0A1628',
                            }}
                        >
                            Accepter toutes les suggestions
                        </button>
                    )}
                </div>

                {/* Confidence summary */}
                <div className="flex flex-wrap gap-2">
                    {phases.map(([phase, p]) => {
                        const c = CONF[p.confidence as Confidence] ?? CONF.UNRELIABLE
                        return (
                            <span
                                key={phase}
                                className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs"
                                style={{ backgroundColor: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}
                            >
                                {PHASE_LABELS[phase] ?? phase.replace(/_/g, ' ')}
                                <span className="opacity-70">{c.stars}</span>
                            </span>
                        )
                    })}
                </div>

                {/* Contextual message */}
                {allHigh && (
                    <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#10F5A010', color: '#10F5A0', border: '0.5px solid #10F5A025' }}>
                        Toutes les phases ont une confiance élevée — vous pouvez accepter toutes les suggestions directement.
                    </p>
                )}
                {hasUnreliable && (
                    <p className="text-xs mt-3 px-3 py-2 rounded-lg" style={{ backgroundColor: '#FCA5A510', color: '#FCA5A5', border: '0.5px solid #FCA5A525' }}>
                        Une ou plusieurs phases sont non fiables — vérification manuelle recommandée.
                    </p>
                )}
            </div>

            {/* ── Phase cards ── */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                {phases.map(([phase, p]) => {
                    const c    = CONF[p.confidence as Confidence] ?? CONF.UNRELIABLE
                    const isEx = expanded === phase

                    return (
                        <div key={phase} className="rounded-xl overflow-hidden" style={card}>

                            {/* Screenshot */}
                            <div
                                className="relative w-full"
                                style={{ backgroundColor: '#060E1A', minHeight: 160 }}
                            >
                                {p.screenshot_b64 ? (
                                    <img
                                        src={`data:image/jpeg;base64,${p.screenshot_b64}`}
                                        alt={`${phase} frame ${p.suggested_frame}`}
                                        className="w-full object-cover"
                                        style={{ display: 'block' }}
                                    />
                                ) : (
                                    <div className="flex items-center justify-center" style={{ height: 160 }}>
                                        <p className="text-xs text-center px-4" style={{ color: '#475569' }}>
                                            Screenshot indisponible
                                        </p>
                                    </div>
                                )}

                                {/* Confidence badge overlay */}
                                <div
                                    className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium"
                                    style={{ backgroundColor: 'rgba(0,0,0,0.75)', color: c.color, border: `0.5px solid ${c.border}` }}
                                >
                                    {c.stars} {c.label}
                                </div>
                            </div>

                            {/* Phase info */}
                            <div className="p-3">
                                <div className="flex items-center justify-between mb-2">
                                    <p className="text-xs font-medium text-white">
                                        {PHASE_LABELS[phase] ?? phase.replace(/_/g, ' ')}
                                    </p>
                                    {p.suggested_frame != null && (
                                        <span
                                            className="text-xs font-medium tabular-nums px-2 py-0.5 rounded"
                                            style={{ backgroundColor: '#38BDF810', color: '#38BDF8', border: '0.5px solid #38BDF830' }}
                                        >
                                            #{p.suggested_frame}
                                        </span>
                                    )}
                                </div>

                                {/* Key angles */}
                                {Object.keys(p.key_angles).length > 0 && (
                                    <div className="space-y-1 mb-3">
                                        {Object.entries(p.key_angles).slice(0, 3).map(([joint, val]) => (
                                            <div key={joint} className="flex justify-between text-xs">
                                                <span style={{ color: '#64748B' }}>{joint}</span>
                                                <span style={{ color: '#94A3B8' }}>{val}°</span>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Accept button */}
                                {p.suggested_frame != null && (
                                    <button
                                        onClick={() => onAcceptOne(phase, p.suggested_frame!)}
                                        className="w-full py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-90 mb-2"
                                        style={{ backgroundColor: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}
                                    >
                                        Utiliser frame #{p.suggested_frame}
                                    </button>
                                )}

                                {/* Top 3 toggle */}
                                {p.top3.length > 1 && (
                                    <button
                                        onClick={() => setExpanded(isEx ? null : phase)}
                                        className="w-full py-1 text-xs transition-opacity hover:opacity-80"
                                        style={{ color: '#475569' }}
                                    >
                                        {isEx ? '▲ Masquer' : `▼ Voir ${p.top3.length} candidats`}
                                    </button>
                                )}

                                {/* Top 3 list */}
                                {isEx && (
                                    <div className="mt-2 space-y-1">
                                        {p.top3.map((cand: PhaseCandidate, i: number) => {
                                            const cc = CONF[cand.confidence as Confidence] ?? CONF.UNRELIABLE
                                            return (
                                                <div
                                                    key={cand.frame}
                                                    className="flex items-center justify-between px-2 py-1.5 rounded-lg cursor-pointer transition-opacity hover:opacity-80"
                                                    style={inner}
                                                    onClick={() => onAcceptOne(phase, cand.frame)}
                                                >
                                                    <span className="text-xs" style={{ color: '#64748B' }}>
                                                        {i === 0 ? '★' : `${i + 1}.`} Frame #{cand.frame}
                                                    </span>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-xs" style={{ color: cc.color }}>{cc.stars}</span>
                                                        <span className="text-xs tabular-nums" style={{ color: '#475569' }}>{cand.score.toFixed(3)}</span>
                                                    </div>
                                                </div>
                                            )
                                        })}
                                    </div>
                                )}
                            </div>
                        </div>
                    )
                })}
            </div>
        </div>
    )
}
