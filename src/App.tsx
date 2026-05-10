import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import { useAuth } from './contexts/AuthContext'
import ProtectedRoute from './components/layout/ProtectedRoute'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import DashboardPage from './pages/DashboardPage'
import AthletesPage from './pages/AthletesPage'

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
                <DashboardPage />
              </ProtectedRoute>
            }
        />
        <Route
            path="/athletes"
            element={
              <ProtectedRoute>
                <AthletesPage />
              </ProtectedRoute>
            }
        />

        {/* Redirection par défaut */}
        <Route
            path="*"
            element={<Navigate to={isAuthenticated ? '/dashboard' : '/login'} replace />}
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