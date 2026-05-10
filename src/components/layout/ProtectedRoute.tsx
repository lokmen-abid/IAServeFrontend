import { Navigate } from 'react-router-dom'
import type { ReactNode } from 'react'
import { useAuth } from '../../contexts/AuthContext'

interface ProtectedRouteProps {
    children: ReactNode
    adminOnly?: boolean
}

export default function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
    const { isAuthenticated, user } = useAuth()

    if (!isAuthenticated) {
        return <Navigate to="/login" replace />
    }

    if (adminOnly && user?.role !== 'admin') {
        return <Navigate to="/dashboard" replace />
    }

    return <>{children}</>
}