import { useAuth } from '../contexts/AuthContext'

export default function DashboardPage() {
    const { signOut, user } = useAuth()

    return (
        <div style={{ padding: '2rem', color: 'white', backgroundColor: '#0A1628', minHeight: '100vh' }}>
            <p>Connecté en tant que : {user?.full_name}</p>
            <button
                onClick={signOut}
                style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#EF4444', color: 'white', borderRadius: '8px' }}
            >
                Se déconnecter
            </button>
        </div>
    )
}