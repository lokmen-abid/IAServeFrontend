import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AthletesPage from './pages/AthletesPage'
import SessionsPage from './pages/SessionsPage'
import Layout from './components/layout/Layout'
import AdminPage from './pages/AdminPage'
import AthleteProfilePage from './pages/AthleteProfilePage'


function AppRoutes() {
    const { isAuthenticated } = useAuth()

    return (
        <Routes>
            {/* Routes publiques */}
            <Route
                path="/login"
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <LoginPage />}
            />
            <Route
                path="/register"
                element={isAuthenticated ? <Navigate to="/dashboard" replace /> : <RegisterPage />}
            />

            {/* Routes protégées */}
            <Route
                path="/dashboard"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <DashboardPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />
            <Route
                path="/athletes"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <AthletesPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            {/* Phase 4 — Sessions d'un athlète */}
            <Route
                path="/athletes/:athleteId/sessions"
                element={
                    <ProtectedRoute>
                        <Layout>
                            <SessionsPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            <Route
                path="/admin"
                element={
                    <ProtectedRoute adminOnly>
                        <Layout>
                            <AdminPage />
                        </Layout>
                    </ProtectedRoute>
                }
            />

            {/* Redirection par défaut */}
            <Route
                path="*"
                element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
            />
             <Route
                 path="/athletes/:athleteId"
                 element={
                     <ProtectedRoute>
                         <Layout>
                             <AthleteProfilePage />
                         </Layout>
                     </ProtectedRoute>
                 }
             />
        </Routes>
    )
}

export default function App() {
    return (
        <BrowserRouter>
            <AppRoutes />
        </BrowserRouter>
    )
}
