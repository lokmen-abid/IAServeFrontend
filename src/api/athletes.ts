import client from './client'

export interface Athlete {
    id: string
    specialist_id: string
    name: string
    age: number
    sex: 'male' | 'female'
    dominant_hand: 'right' | 'left'
    medical_notes?: string
    created_at: string
}

export interface AthleteCreate {
    name: string
    age: number
    sex: 'male' | 'female'
    dominant_hand: 'right' | 'left'
    medical_notes?: string
}

export interface AthleteUpdate {
    name?: string
    age?: number
    sex?: 'male' | 'female'
    dominant_hand?: 'right' | 'left'
    medical_notes?: string
}

// Créer un athlète
export const createAthlete = async (data: AthleteCreate): Promise<Athlete> => {
    const response = await client.post<Athlete>('/api/athletes/', data)
    return response.data
}

// Lister mes athlètes
export const getAthletes = async (): Promise<Athlete[]> => {
    const response = await client.get<Athlete[]>('/api/athletes/')
    return response.data
}

// Consulter un athlète par ID
export const getAthleteById = async (id: string): Promise<Athlete> => {
    const response = await client.get<Athlete>(`/api/athletes/${id}`)
    return response.data
}

// Modifier un athlète (partiel)
export const updateAthlete = async (id: string, data: AthleteUpdate): Promise<Athlete> => {
    const response = await client.put<Athlete>(`/api/athletes/${id}`, data)
    return response.data
}

// Supprimer un athlète
export const deleteAthlete = async (id: string): Promise<{ message: string }> => {
    const response = await client.delete(`/api/athletes/${id}`)
    return response.data
}