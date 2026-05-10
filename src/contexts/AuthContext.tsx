// eslint-disable-next-line react-refresh/only-export-components
import { createContext, useContext, useState} from 'react'
import type { ReactNode } from 'react'
import type { User, LoginCredentials } from '../api/auth'
import { login } from '../api/auth'

interface AuthContextType {
    user: User | null
    token: string | null
    isAuthenticated: boolean
    signIn: (credentials: LoginCredentials) => Promise<void>
    signOut: () => void
}

const AuthContext = createContext<AuthContextType | null>(null)

export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(
        () => localStorage.getItem('token')
    )

    const [user, setUser] = useState<User | null>(() => {
        const savedUser = localStorage.getItem('user')
        return savedUser ? (JSON.parse(savedUser) as User) : null
    })

    const signIn = async (credentials: LoginCredentials) => {
        const response = await login(credentials)

        const userData: User = {
            id: response.user.id,
            email: response.user.email,
            full_name: response.user.full_name,
            role: response.user.role,
            status: 'active',
        }

        localStorage.setItem('token', response.access_token)
        localStorage.setItem('user', JSON.stringify(userData))

        setToken(response.access_token)
        setUser(userData)
    }

    const signOut = () => {
        localStorage.removeItem('token')
        localStorage.removeItem('user')
        setToken(null)
        setUser(null)
    }

    return (
        <AuthContext.Provider value={{
            user,
            token,
            isAuthenticated: !!token && !!user,
            signIn,
            signOut,
        }}>
            {children}
        </AuthContext.Provider>
    )
}

// Hook personnalisé pour utiliser le contexte facilement
// eslint-disable-next-line react-refresh/only-export-components
export function useAuth() {
    const context = useContext(AuthContext)
    if (!context) throw new Error('useAuth doit être utilisé dans AuthProvider')
    return context
}