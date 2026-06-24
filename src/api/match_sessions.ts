import client from './client'

// ══════════════════════════════════════════════════════════════
// TYPES — miroir exact des modèles Python
// ══════════════════════════════════════════════════════════════

export type MatchStatus = 'created' | 'ready' | 'processing' | 'completed' | 'error'
export type SurfaceType = 'hard' | 'clay' | 'grass'
export type MatchFormat = 'best_of_3' | 'best_of_5' | 'pro_set'
export type GestureType = 'forehand' | 'backhand' | 'serve' | 'volley' | 'unknown'
export type RallyOutcome = 'winner' | 'unforced_error' | 'forced_error' | 'unknown'
export type PointWinner = 'player' | 'opponent' | 'unknown'

// ── MatchSession (document principal) ────────────────────────

export interface MatchSession {
    id: string
    athlete_id: string
    specialist_id: string
    video_url: string
    status: MatchStatus
    fps: number
    total_frames: number | null
    duration_seconds: number | null
    surface: SurfaceType
    match_format: MatchFormat
    opponent_name: string | null
    location: string | null
    notes: string | null
    created_at: string
    error_message: string | null
}

export interface MatchSessionCreate {
    athlete_id: string
    surface?: SurfaceType
    match_format?: MatchFormat
    opponent_name?: string
    location?: string
    notes?: string
}

export interface MatchSessionUpdate {
    surface?: SurfaceType
    match_format?: MatchFormat
    opponent_name?: string
    location?: string
    notes?: string
}

export interface MatchSessionListResponse {
    total: number
    skip: number
    limit: number
    data: MatchSession[]
}

// ── Résultats pipeline ────────────────────────────────────────

export interface GestureEvent {
    frame_number: number
    timestamp_ms: number
    gesture_type: GestureType
    confidence: number
    set_number: number
    point_number: number
    rally_stroke: number
    player_x: number | null
    player_y: number | null
}

export interface RallyStats {
    point_number: number
    set_number: number
    winner: PointWinner
    duration_frames: number
    duration_seconds: number
    stroke_count: number
    gesture_sequence: GestureType[]
    outcome: RallyOutcome
}

export interface SetStats {
    set_number: number
    points_won: number
    points_lost: number
    gesture_counts: Record<GestureType, number>
    gesture_pct: Record<GestureType, number>
    total_rallies: number
    avg_rally_length: number
    avg_strokes_per_rally: number
    short_rally_wins: number
    medium_rally_wins: number
    long_rally_wins: number
    dominant_gesture: GestureType
}

export interface StrengthWeakness {
    aspect: string
    detail: string
    value: number | string
}

export interface MatchMetrics {
    match_session_id: string
    athlete_id: string
    total_frames_analyzed: number
    total_points_detected: number
    total_rallies_detected: number
    sets_detected: number
    gesture_events: GestureEvent[]
    rallies: RallyStats[]
    sets: Record<string, SetStats>         // clé = "1", "2", "3"
    overall_gesture_counts: Record<GestureType, number>
    overall_gesture_pct: Record<GestureType, number>
    dominant_gesture_match: GestureType
    avg_rally_length_seconds: number
    avg_strokes_per_rally: number
    strengths: StrengthWeakness[]
    weaknesses: StrengthWeakness[]
    pipeline_version: string
    computed_at: string
}

// ══════════════════════════════════════════════════════════════
// LABELS UI — pour les composants React
// ══════════════════════════════════════════════════════════════

export const SURFACE_LABELS: Record<SurfaceType, string> = {
    hard:  'Dur',
    clay:  'Terre battue',
    grass: 'Gazon',
}

export const FORMAT_LABELS: Record<MatchFormat, string> = {
    best_of_3: 'Meilleur des 3',
    best_of_5: 'Meilleur des 5',
    pro_set:   'Pro set',
}

export const GESTURE_LABELS: Record<GestureType, string> = {
    forehand: 'Coup droit',
    backhand: 'Revers',
    serve:    'Service',
    volley:   'Volée',
    unknown:  'Inconnu',
}

export const GESTURE_COLORS: Record<GestureType, string> = {
    forehand: '#38BDF8',
    backhand: '#10F5A0',
    serve:    '#6366F1',
    volley:   '#F59E0B',
    unknown:  '#475569',
}

export const STATUS_LABELS: Record<MatchStatus, string> = {
    created:    'Créée',
    ready:      'Prête',
    processing: 'En analyse',
    completed:  'Terminée',
    error:      'Erreur',
}

export const STATUS_COLORS: Record<MatchStatus, { bg: string; text: string; border: string }> = {
    created:    { bg: '#1E3A5F',   text: '#94A3B8', border: '#2D4F7A' },
    ready:      { bg: '#0F3460',   text: '#38BDF8', border: '#1E5080' },
    processing: { bg: '#1C2A1A',   text: '#10F5A0', border: '#2A4028' },
    completed:  { bg: '#0F2D20',   text: '#10F5A0', border: '#1A4530' },
    error:      { bg: '#2D1A1A',   text: '#FCA5A5', border: '#4A2828' },
}

// ══════════════════════════════════════════════════════════════
// FONCTIONS API
// ══════════════════════════════════════════════════════════════

// ── CRUD ─────────────────────────────────────────────────────

export async function createMatchSession(data: MatchSessionCreate): Promise<{ match_session: MatchSession }> {
    return client.post('/api/match-sessions/', data)
}

export async function getMatchSessionsByAthlete(
    athleteId: string,
    params?: { skip?: number; limit?: number }
): Promise<MatchSessionListResponse> {
    const query = new URLSearchParams({ athlete_id: athleteId })
    if (params?.skip !== undefined)  query.set('skip',  String(params.skip))
    if (params?.limit !== undefined) query.set('limit', String(params.limit))
    return client.get(`/api/match-sessions/?${query}`)
}

export async function getMatchSessionById(matchId: string): Promise<MatchSession> {
    return client.get(`/api/match-sessions/${matchId}`)
}

export async function updateMatchSession(
    matchId: string,
    data: MatchSessionUpdate
): Promise<{ match_session: MatchSession }> {
    return client.patch(`/api/match-sessions/${matchId}`, data)
}

export async function deleteMatchSession(matchId: string): Promise<{ message: string }> {
    return client.delete(`/api/match-sessions/${matchId}`)
}

// ── Upload vidéo ──────────────────────────────────────────────

export async function uploadMatchVideo(
    matchId: string,
    file: File,
    onProgress?: (pct: number) => void
): Promise<{ video_url: string; status: MatchStatus }> {
    return new Promise((resolve, reject) => {
        const formData = new FormData()
        formData.append('file', file)

        const xhr = new XMLHttpRequest()

        if (onProgress) {
            xhr.upload.addEventListener('progress', (e) => {
                if (e.lengthComputable) onProgress(Math.round((e.loaded / e.total) * 100))
            })
        }

        xhr.addEventListener('load', () => {
            if (xhr.status >= 200 && xhr.status < 300) {
                resolve(JSON.parse(xhr.responseText))
            } else {
                try {
                    reject(new Error(JSON.parse(xhr.responseText).detail ?? 'Upload échoué'))
                } catch {
                    reject(new Error('Upload échoué'))
                }
            }
        })

        xhr.addEventListener('error', () => reject(new Error('Erreur réseau pendant l\'upload')))

        const token = localStorage.getItem('access_token')
        xhr.open('POST', `/api/match-sessions/${matchId}/upload`)
        if (token) xhr.setRequestHeader('Authorization', `Bearer ${token}`)
        xhr.send(formData)
    })
}

// ── Pipeline ──────────────────────────────────────────────────

export async function analyzeMatch(matchId: string): Promise<{ message: string; status: MatchStatus }> {
    return client.post(`/api/match-sessions/${matchId}/analyze`, {})
}

export async function getMatchResults(matchId: string): Promise<MatchMetrics> {
    return client.get(`/api/match-sessions/${matchId}/results`)
}

// ── Polling (même pattern que sessions.ts) ────────────────────

export function pollMatchStatus(
    matchId: string,
    onUpdate: (match: MatchSession) => void,
    onComplete: (match: MatchSession) => void,
    onError: (match: MatchSession) => void,
    intervalMs = 3000
): () => void {
    const interval = setInterval(async () => {
        try {
            const match = await getMatchSessionById(matchId)
            onUpdate(match)
            if (match.status === 'completed') {
                clearInterval(interval)
                onComplete(match)
            } else if (match.status === 'error') {
                clearInterval(interval)
                onError(match)
            }
        } catch {
            // Silencieux — le polling réessaie au prochain tick
        }
    }, intervalMs)

    return () => clearInterval(interval)  // retourne une fonction stop()
}

// ══════════════════════════════════════════════════════════════
// HELPERS CALCUL (utilisés dans les composants React)
// ══════════════════════════════════════════════════════════════

/** Retourne le set avec le plus grand nombre de points joués. */
export function getLongestSet(metrics: MatchMetrics): SetStats | null {
    const sets = Object.values(metrics.sets)
    if (!sets.length) return null
    return sets.reduce((a, b) => (a.total_rallies > b.total_rallies ? a : b))
}

/** Calcule le % de points gagnés sur tout le match. */
export function getWinRate(metrics: MatchMetrics): number {
    const won  = Object.values(metrics.sets).reduce((s, v) => s + v.points_won,  0)
    const lost = Object.values(metrics.sets).reduce((s, v) => s + v.points_lost, 0)
    const total = won + lost
    return total > 0 ? Math.round((won / total) * 100) : 0
}

/** Trie les gestes par fréquence décroissante. */
export function sortedGestures(
    counts: Record<string, number>
): { gesture: string; count: number; pct: number }[] {
    const total = Object.values(counts).reduce((s, v) => s + v, 0)
    return Object.entries(counts)
        .map(([gesture, count]) => ({
            gesture,
            count,
            pct: total > 0 ? Math.round((count / total) * 1000) / 10 : 0,
        }))
        .sort((a, b) => b.count - a.count)
}