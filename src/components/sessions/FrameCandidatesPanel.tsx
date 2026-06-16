import { useState, useEffect, useCallback } from 'react'
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

// ── Types ────────────────────────────────────────────────────

interface ModalState {
    phase:     string
    candidates: PhaseCandidate[]
    activeIdx:  number
}

interface Props {
    sessionId:   string
    onAcceptAll: (annotations: Record<string, number>) => void
    onAcceptOne: (phase: string, frame: number) => void
}

// ── Modal ────────────────────────────────────────────────────

function CandidateModal({
                            modal, onClose, onUse,
                        }: {
    modal:   ModalState
    onClose: () => void
    onUse:   (phase: string, frame: number) => void
}) {
    const { phase, candidates, activeIdx } = modal
    const [idx, setIdx] = useState(activeIdx)
    const cand = candidates[idx]
    const c    = CONF[cand.confidence as Confidence] ?? CONF.UNRELIABLE

    const prev = useCallback(() => setIdx(i => Math.max(0, i - 1)), [])
    const next = useCallback(() => setIdx(i => Math.min(candidates.length - 1, i + 1)), [candidates.length])

    // Clavier ← →
    useEffect(() => {
        const handler = (e: KeyboardEvent) => {
            if (e.key === 'ArrowLeft')  prev()
            if (e.key === 'ArrowRight') next()
            if (e.key === 'Escape')     onClose()
        }
        window.addEventListener('keydown', handler)
        return () => window.removeEventListener('keydown', handler)
    }, [prev, next, onClose])

    return (
        <div
            className="fixed inset-0 z-50 flex items-center justify-center p-4"
            style={{ backgroundColor: 'rgba(0,0,0,0.85)' }}
            onClick={onClose}
        >
            <div
                className="relative w-full max-w-2xl rounded-2xl overflow-hidden"
                style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
                onClick={e => e.stopPropagation()}
            >
                {/* ── Header ── */}
                <div className="flex items-center justify-between px-5 py-3" style={{ borderBottom: '0.5px solid #1E3A5F' }}>
                    <div className="flex items-center gap-3">
                        <p className="text-sm font-medium text-white">
                            {PHASE_LABELS[phase] ?? phase.replace(/_/g, ' ')}
                        </p>
                        <span
                            className="text-xs px-2 py-0.5 rounded-lg"
                            style={{ backgroundColor: c.bg, color: c.color, border: `0.5px solid ${c.border}` }}
                        >
                            {c.stars} {c.label}
                        </span>
                    </div>
                    <button onClick={onClose} className="text-lg leading-none hover:opacity-60 transition-opacity" style={{ color: '#64748B' }}>✕</button>
                </div>

                {/* ── Screenshot ── */}
                <div className="relative" style={{ backgroundColor: '#060E1A' }}>
                    {cand.screenshot_b64 ? (
                        <img
                            src={`data:image/jpeg;base64,${cand.screenshot_b64}`}
                            alt={`Frame ${cand.frame}`}
                            className="w-full object-contain"
                            style={{ maxHeight: 420, display: 'block' }}
                        />
                    ) : (
                        <div className="flex items-center justify-center" style={{ height: 280 }}>
                            <p className="text-sm" style={{ color: '#475569' }}>Screenshot indisponible</p>
                        </div>
                    )}

                    {/* Navigation ← → */}
                    {idx > 0 && (
                        <button
                            onClick={prev}
                            className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
                            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '0.5px solid #1E3A5F' }}
                        >
                            ‹
                        </button>
                    )}
                    {idx < candidates.length - 1 && (
                        <button
                            onClick={next}
                            className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full flex items-center justify-center transition-opacity hover:opacity-90"
                            style={{ backgroundColor: 'rgba(0,0,0,0.7)', color: 'white', border: '0.5px solid #1E3A5F' }}
                        >
                            ›
                        </button>
                    )}

                    {/* Indicateur candidat */}
                    <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5">
                        {candidates.map((_, i) => (
                            <button
                                key={i}
                                onClick={() => setIdx(i)}
                                className="w-2 h-2 rounded-full transition-all"
                                style={{ backgroundColor: i === idx ? '#38BDF8' : '#1E3A5F' }}
                            />
                        ))}
                    </div>
                </div>

                {/* ── Infos + angles ── */}
                <div className="px-5 py-4">
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <span className="text-sm font-medium text-white">Frame #{cand.frame}</span>
                            <span className="text-xs ml-3" style={{ color: '#64748B' }}>Score {cand.score.toFixed(3)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-xs" style={{ color: '#64748B' }}>
                            {idx + 1} / {candidates.length}
                            <span className="ml-1 opacity-50">← → pour naviguer</span>
                        </div>
                    </div>

                    {/* Angles clés */}
                    {Object.keys(cand.key_angles).length > 0 && (
                        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 mb-4">
                            {Object.entries(cand.key_angles).map(([joint, val]) => (
                                <div
                                    key={joint}
                                    className="rounded-lg px-3 py-2"
                                    style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}
                                >
                                    <p className="text-xs mb-0.5" style={{ color: '#64748B' }}>{joint}</p>
                                    <p className="text-sm font-medium text-white">{val}°</p>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Bouton utiliser */}
                    <button
                        onClick={() => { onUse(phase, cand.frame); onClose() }}
                        className="w-full py-2.5 rounded-xl text-sm font-medium transition-opacity hover:opacity-90"
                        style={{ background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' }}
                    >
                        Utiliser frame #{cand.frame}
                    </button>
                </div>

                {/* ── Miniatures des autres candidats ── */}
                {candidates.length > 1 && (
                    <div className="px-5 pb-4 flex gap-2">
                        {candidates.map((c2, i) => {
                            const cc = CONF[c2.confidence as Confidence] ?? CONF.UNRELIABLE
                            return (
                                <button
                                    key={c2.frame}
                                    onClick={() => setIdx(i)}
                                    className="flex-1 rounded-lg overflow-hidden transition-all"
                                    style={{
                                        border: i === idx
                                            ? `1.5px solid #38BDF8`
                                            : '0.5px solid #1E3A5F',
                                        opacity: i === idx ? 1 : 0.55,
                                    }}
                                >
                                    {c2.screenshot_b64 ? (
                                        <img
                                            src={`data:image/jpeg;base64,${c2.screenshot_b64}`}
                                            alt={`Candidat ${i + 1}`}
                                            className="w-full object-cover"
                                            style={{ height: 56, display: 'block' }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center" style={{ height: 56, backgroundColor: '#0A1628' }}>
                                            <span className="text-xs" style={{ color: '#475569' }}>#{c2.frame}</span>
                                        </div>
                                    )}
                                    <div className="py-0.5 text-center" style={{ backgroundColor: '#0A1628' }}>
                                        <span className="text-xs" style={{ color: cc.color }}>{cc.stars}</span>
                                    </div>
                                </button>
                            )
                        })}
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Main component ───────────────────────────────────────────

export default function FrameCandidatesPanel({ sessionId, onAcceptAll, onAcceptOne }: Props) {
    const [data, setData]       = useState<CandidatesResponse | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError]     = useState<string | null>(null)
    const [modal, setModal]     = useState<ModalState | null>(null)

    const card = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }

    useEffect(() => {
        let cancelled = false
        const load = async () => {
            setLoading(true); setError(null)
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
            <p className="text-sm animate-pulse" style={{ color: '#94A3B8' }}>Analyse des frames candidates…</p>
        </div>
    )
    if (error) return (
        <div className="rounded-xl px-4 py-4" style={{ backgroundColor: '#EF444410', border: '0.5px solid #EF444430' }}>
            <p className="text-xs font-medium" style={{ color: '#FCA5A5' }}>Candidats indisponibles</p>
            <p className="text-xs mt-1" style={{ color: '#94A3B8' }}>{error}</p>
        </div>
    )
    if (!data) return null

    const phases            = Object.entries(data.phases)
    const allHaveSuggestion = phases.every(([, p]) => p.suggested_frame != null)
    const hasUnreliable     = phases.some(([, p]) => p.confidence === 'UNRELIABLE')
    const allHigh           = phases.every(([, p]) => p.confidence === 'HIGH')

    const openModal = (phase: string, candidates: PhaseCandidate[], startIdx = 0) => {
        setModal({ phase, candidates, activeIdx: startIdx })
    }

    const handleUse = (phase: string, frame: number) => {
        onAcceptOne(phase, frame)
    }

    return (
        <>
            {/* Modal */}
            {modal && (
                <CandidateModal
                    modal={modal}
                    onClose={() => setModal(null)}
                    onUse={handleUse}
                />
            )}

            <div className="space-y-4">

                {/* ── Header ── */}
                <div className="rounded-xl p-4" style={card}>
                    <div className="flex items-center justify-between mb-3">
                        <div>
                            <h3 className="text-sm font-medium text-white">Frames candidates</h3>
                            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>
                                {data.total_frames} frames · {data.fps} FPS · Cliquez sur une phase pour explorer
                                {!data.has_video && <span className="ml-2" style={{ color: '#FAC775' }}>· Vidéo indisponible</span>}
                            </p>
                        </div>
                        {allHaveSuggestion && data.best && (
                            <button
                                onClick={() => onAcceptAll(data.best!)}
                                className="px-4 py-2 rounded-lg text-xs font-medium hover:opacity-90 transition-opacity"
                                style={{ background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' }}
                            >
                                Accepter toutes les suggestions
                            </button>
                        )}
                    </div>

                    {/* Badges confiance */}
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

                {/* ── Phase cards — cliquer ouvre le modal ── */}
                <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                    {phases.map(([phase, p]) => {
                        const c = CONF[p.confidence as Confidence] ?? CONF.UNRELIABLE
                        return (
                            <div
                                key={phase}
                                className="rounded-xl overflow-hidden cursor-pointer transition-all hover:opacity-90"
                                style={{ ...card, border: `0.5px solid ${c.border}` }}
                                onClick={() => openModal(phase, p.top3, 0)}
                            >
                                {/* Screenshot miniature */}
                                <div className="relative" style={{ backgroundColor: '#060E1A' }}>
                                    {p.screenshot_b64 ? (
                                        <img
                                            src={`data:image/jpeg;base64,${p.screenshot_b64}`}
                                            alt={`${phase}`}
                                            className="w-full object-cover"
                                            style={{ height: 170, display: 'block' }}
                                        />
                                    ) : (
                                        <div className="flex items-center justify-center" style={{ height: 170 }}>
                                            <p className="text-xs" style={{ color: '#475569' }}>Screenshot indisponible</p>
                                        </div>
                                    )}

                                    {/* Badge confiance */}
                                    <div
                                        className="absolute top-2 left-2 px-2 py-1 rounded-lg text-xs font-medium"
                                        style={{ backgroundColor: 'rgba(0,0,0,0.78)', color: c.color, border: `0.5px solid ${c.border}` }}
                                    >
                                        {PHASE_LABELS[phase] ?? phase.replace(/_/g, ' ')}
                                    </div>

                                    {/* Badge frame */}
                                    {p.suggested_frame != null && (
                                        <div
                                            className="absolute top-2 right-2 px-2 py-1 rounded-lg text-xs font-medium tabular-nums"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.78)', color: '#38BDF8' }}
                                        >
                                            #{p.suggested_frame}
                                        </div>
                                    )}

                                    {/* Nombre de candidats */}
                                    {p.top3.length > 1 && (
                                        <div
                                            className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-xs"
                                            style={{ backgroundColor: 'rgba(0,0,0,0.78)', color: '#94A3B8' }}
                                        >
                                            {p.top3.length} candidats
                                        </div>
                                    )}
                                </div>

                                {/* Angles clés + hint clic */}
                                <div className="px-3 py-2.5">
                                    <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
                                        {Object.entries(p.key_angles).slice(0, 3).map(([joint, val]) => (
                                            <span key={joint} className="text-xs">
                                                <span style={{ color: '#64748B' }}>{joint} </span>
                                                <span style={{ color: '#94A3B8' }}>{val}°</span>
                                            </span>
                                        ))}
                                    </div>
                                    <p className="text-xs" style={{ color: '#334155' }}>
                                        Cliquer pour explorer les {p.top3.length} candidats →
                                    </p>
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>
        </>
    )
}
