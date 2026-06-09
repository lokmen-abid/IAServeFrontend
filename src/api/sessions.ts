import client from './client'

// ── Types ────────────────────────────────────────────────────

export type GestureType = 'service' | 'coup_droit' | 'revers'
export type SessionStatus = 'created' | 'processing' | 'completed' | 'error'

export interface Session {
    id: string
    athlete_id: string
    specialist_id: string
    gesture_type: GestureType
    status: SessionStatus
    fps: number
    total_frames: number | null
    video_url: string
    phase_annotations: Record<string, number> | null
    created_at: string
}

export interface SessionCreate {
    athlete_id: string
    gesture_type: GestureType
    fps?: number
    phase_annotations?: Record<string, number>
}

export interface SessionUpdate {
    fps?: number
    phase_annotations?: Record<string, number>
}

export interface SessionListResponse {
    total: number
    skip: number
    limit: number
    data: Session[]
}

// Résultats pipeline IA
export interface JointMetric {
    min: number
    max: number
    mean: number
    std: number
}

export interface ClinicalAlert {
    joint: string
    value: number
    threshold: number
    reference: string
    severity: 'warning' | 'critical'
}

export interface SessionResults {
    session_id: string
    gesture_type: string
    pipeline_mode: string
    total_frames: number
    phases_detected: Record<string, number>
    phase_annotations: Record<string, number> | null
    joint_metrics: Record<string, JointMetric>
    normative_comparison: Record<string, number>
    alerts: ClinicalAlert[]
    computed_at: string | null
}

export interface AnalyzeResponse {
    message: string
    session_id: string
    phases_used: Record<string, number> | null
    has_annotations: boolean
    hint: string | null
}

// ── CRUD de base ─────────────────────────────────────────────

// Créer une session
export const createSession = async (data: SessionCreate): Promise<Session> => {
    const response = await client.post<{ session: Session }>('/api/sessions/', data)
    return response.data.session
}

// Lister mes sessions (paginé + filtres optionnels)
export const getSessions = async (params?: {
    skip?: number
    limit?: number
    gesture_type?: GestureType
    status?: SessionStatus
}): Promise<SessionListResponse> => {
    const response = await client.get<SessionListResponse>('/api/sessions/', { params })
    return response.data
}

// Détail d'une session
export const getSessionById = async (id: string): Promise<Session> => {
    const response = await client.get<Session>(`/api/sessions/${id}`)
    return response.data
}

// Modifier fps ou annotations
export const updateSession = async (id: string, data: SessionUpdate): Promise<Session> => {
    const response = await client.put<{ session: Session }>(`/api/sessions/${id}`, data)
    return response.data.session
}

// Supprimer une session (cascade frames + metrics)
export const deleteSession = async (id: string): Promise<{ message: string }> => {
    const response = await client.delete(`/api/sessions/${id}`)
    return response.data
}

// Historique sessions d'un athlète
export const getSessionsByAthlete = async (
    athleteId: string,
    params?: { skip?: number; limit?: number }
): Promise<SessionListResponse> => {
    const response = await client.get<SessionListResponse>(
        `/api/sessions/athlete/${athleteId}`,
        { params }
    )
    return response.data
}

// ── Upload + pipeline ────────────────────────────────────────

// Uploader la vidéo d'une session
export const uploadSessionVideo = async (
    sessionId: string,
    file: File,
    onProgress?: (percent: number) => void
): Promise<{ message: string; video_url: string; status: SessionStatus }> => {
    const formData = new FormData()
    formData.append('file', file)

    const response = await client.post(
        `/api/sessions/${sessionId}/upload`,
        formData,
        {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (e) => {
                if (onProgress && e.total) {
                    onProgress(Math.round((e.loaded * 100) / e.total))
                }
            },
        }
    )
    return response.data
}

// Lancer l'analyse IA
export const analyzeSession = async (sessionId: string): Promise<AnalyzeResponse> => {
    const response = await client.post<AnalyzeResponse>(`/api/sessions/${sessionId}/analyze`)
    return response.data
}

// Récupérer les résultats (métriques + alertes)
export const getSessionResults = async (sessionId: string): Promise<SessionResults> => {
    const response = await client.get<SessionResults>(`/api/sessions/${sessionId}/results`)
    return response.data
}

// ── Annotations de phase ─────────────────────────────────────

// Sauvegarder les frames clés annotées par le spécialiste
export const updatePhaseAnnotations = async (
    sessionId: string,
    annotations: Record<string, number>
): Promise<{ message: string; phase_annotations: Record<string, number>; next_step: string }> => {
    const response = await client.put(`/api/sessions/${sessionId}/annotations`, annotations)
    return response.data
}

// ── Helpers UI ───────────────────────────────────────────────

// Labels français pour l'affichage
export const GESTURE_LABELS: Record<GestureType, string> = {
    service:    'Service',
    coup_droit: 'Coup droit',
    revers:     'Revers',
}

export const STATUS_LABELS: Record<SessionStatus, string> = {
    created:    'Créée',
    processing: 'En cours',
    completed:  'Terminée',
    error:      'Erreur',
}

// Couleurs Tailwind-safe pour les badges de statut
export const STATUS_COLORS: Record<SessionStatus, { bg: string; text: string; border: string }> = {
    created:    { bg: '#1E3A5F20', text: '#38BDF8', border: '#38BDF830' },
    processing: { bg: '#EF9F2720', text: '#FAC775', border: '#EF9F2730' },
    completed:  { bg: '#1D9E7520', text: '#10F5A0', border: '#1D9E7530' },
    error:      { bg: '#E24B4A20', text: '#F09595', border: '#E24B4A30' },
}

// Phases attendues selon le type de geste (pour le formulaire d'annotation)
export const PHASE_KEYS: Record<GestureType, string[]> = {
    service:    ['trophy_position', 'racket_low_point', 'ball_impact'],
    coup_droit: ['preparation', 'acceleration', 'follow_through'],
    revers:     ['preparation', 'racket_low_point', 'ball_impact'],
}

export const PHASE_LABELS: Record<string, string> = {
    trophy_position: 'Trophy position',
    racket_low_point: 'Racket low point',
    ball_impact:     'Ball impact',
    preparation:     'Préparation',
    acceleration:    'Accélération',
    follow_through:  'Suivi',
}
// ── Candidats de phase (Option 2) ───────────────────────────

export interface PhaseCandidate {
    frame:      number
    score:      number
    confidence: 'HIGH' | 'MEDIUM' | 'LOW' | 'UNRELIABLE'
}

export interface PhaseResult {
    suggested_frame: number | null
    confidence:      'HIGH' | 'MEDIUM' | 'LOW' | 'UNRELIABLE'
    screenshot_b64:  string       // JPEG base64, vide si pas de vidéo
    key_angles:      Record<string, number>
    top3:            PhaseCandidate[]
}

export interface CandidatesResponse {
    session_id:   string
    gesture:      string
    total_frames: number
    fps:          number
    best:         Record<string, number> | null  // {phase: frame_number}
    has_video:    boolean
    phases:       Record<string, PhaseResult>
}

export const getSessionCandidates = async (sessionId: string): Promise<CandidatesResponse> => {
    const response = await client.get<CandidatesResponse>(`/api/sessions/${sessionId}/candidates`)
    return response.data
}