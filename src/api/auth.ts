import client from './client'

export interface LoginCredentials {
    username: string
    password: string
}

export interface RegisterData {
    email: string
    password: string
    full_name: string
    club_id: string | null
}

export interface User {
    id: string
    email: string
    full_name: string
    role: 'admin' | 'specialist'
    status: 'pending' | 'active' | 'blocked'
    club_id: string | null
}

export interface AuthResponse {
    access_token: string
    token_type: string
    user: {
        id: string
        email: string
        full_name: string
        role: 'admin' | 'specialist'
        club_id: string | null
    }
}

export interface Club {
    id: string
    name: string
    city: string | null
}

export interface SpecialistUser {
    id: string
    email: string
    full_name: string
    action:  'approve' | 'block'
    club_id: string | null
}

// Login — Backend attend du JSON avec email/password
export const login = async (credentials: LoginCredentials): Promise<AuthResponse> => {
    const response = await client.post<AuthResponse>('/api/auth/login', {
        email: credentials.username,
        password: credentials.password,
    })
    return response.data
}

// Register
export const register = async (data: RegisterData): Promise<{ message: string }> => {
    const response = await client.post('/api/auth/register', data)
    return response.data
}

// Lister les clubs
export const getClubs = async (): Promise<Club[]> => {
    const response = await client.get<Club[]>('/api/clubs/')
    return response.data
}

// Liste comptes en attente (admin seulement)
export const getPendingUsers = async () => {
    const response = await client.get('/api/auth/pending')
    return response.data
}

// Approuver ou bloquer un compte (admin seulement)
export const approveUser = async (userId: string, action: 'approve' | 'block') => {
    const response = await client.post('/api/auth/approve', { user_id: userId, action })
    return response.data
}

// Tous les spécialistes (admin)
export const getAllUsers = async (): Promise<SpecialistUser[]> => {
    const response = await client.get<SpecialistUser[]>('/api/auth/users')
    return response.data
}