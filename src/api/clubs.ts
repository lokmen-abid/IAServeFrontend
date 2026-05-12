import client from './client'

export interface ClubOverview {
    id: string | null
    name: string
    city: string | null
    specialist_count: number
    athlete_count: number
}

export interface ClubCreate {
    name: string
    city: string | null
}

// Liste clubs pour le register (public)
export const getClubs = async () => {
    const response = await client.get('/api/clubs/')
    return response.data
}

// Vue admin — clubs + stats
export const getClubsOverview = async (): Promise<ClubOverview[]> => {
    const response = await client.get<ClubOverview[]>('/api/clubs/overview')
    return response.data
}

// Créer un club (admin)
export const createClub = async (data: ClubCreate) => {
    const response = await client.post('/api/clubs/', data)
    return response.data
}