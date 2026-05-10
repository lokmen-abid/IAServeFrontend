import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { useAuth } from '../contexts/AuthContext'

export default function LoginPage() {
    const { signIn } = useAuth()
    const navigate = useNavigate()

    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [isLoading, setIsLoading] = useState(false)

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')
        setIsLoading(true)

        try {
            await signIn({ username: email, password })
            navigate('/dashboard')
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } }).response?.status
            if (status === 403) {
                setError('Votre compte est en attente de validation par un administrateur.')
            } else if (status === 401) {
                setError('Email ou mot de passe incorrect.')
            } else {
                setError('Une erreur est survenue. Vérifiez votre connexion.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    return (
        <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A1628' }}>

            {/* Card login */}
            <div className="w-full max-w-md px-4">

                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-4xl font-medium tracking-tight">
                        <span style={{ color: '#38BDF8' }}>IA</span>
                        <span style={{ color: '#10F5A0' }}>/</span>
                        <span className="text-white">Serve</span>
                    </h1>
                    <p className="mt-2 text-sm" style={{ color: '#94A3B8' }}>
                        Biomechanical analysis, reimagined
                    </p>
                </div>

                {/* Formulaire */}
                <div
                    className="rounded-2xl p-8"
                    style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
                >
                    <h2 className="text-xl font-medium text-white mb-1">Connexion</h2>
                    <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
                        Espace spécialiste de santé
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Email */}
                        <div>
                            <label className="block text-sm mb-1.5" style={{ color: '#94A3B8' }}>
                                Email professionnel
                            </label>
                            <input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                required
                                placeholder="vous@exemple.com"
                                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                                style={{
                                    backgroundColor: '#0A1628',
                                    border: '0.5px solid #1E3A5F',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#38BDF8'}
                                onBlur={(e) => e.target.style.borderColor = '#1E3A5F'}
                            />
                        </div>

                        {/* Mot de passe */}
                        <div>
                            <label className="block text-sm mb-1.5" style={{ color: '#94A3B8' }}>
                                Mot de passe
                            </label>
                            <input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                                style={{
                                    backgroundColor: '#0A1628',
                                    border: '0.5px solid #1E3A5F',
                                }}
                                onFocus={(e) => e.target.style.borderColor = '#38BDF8'}
                                onBlur={(e) => e.target.style.borderColor = '#1E3A5F'}
                            />
                        </div>

                        {/* Message erreur */}
                        {error && (
                            <div
                                className="rounded-lg px-4 py-3 text-sm"
                                style={{ backgroundColor: '#EF444415', border: '0.5px solid #EF444440', color: '#FCA5A5' }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Message pending */}
                        {error.includes('attente') && (
                            <div
                                className="rounded-lg px-4 py-3 text-sm"
                                style={{ backgroundColor: '#38BDF815', border: '0.5px solid #38BDF840', color: '#38BDF8' }}
                            >
                                Un administrateur doit approuver votre compte avant que vous puissiez vous connecter.
                            </div>
                        )}

                        {/* Bouton submit */}
                        <button
                            type="submit"
                            disabled={isLoading}
                            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
                            style={{
                                background: 'linear-gradient(90deg, #38BDF8, #10F5A0)',
                                color: '#0A1628',
                                opacity: isLoading ? 0.7 : 1,
                            }}
                        >
                            {isLoading ? 'Connexion...' : 'Se connecter'}
                        </button>

                    </form>

                    {/* Lien register */}
                    <p className="text-center text-sm mt-6" style={{ color: '#94A3B8' }}>
                        Pas encore de compte ?{' '}
                        <Link
                            to="/register"
                            className="font-medium transition-colors"
                            style={{ color: '#38BDF8' }}
                        >
                            Créer un compte →
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
                    Plateforme réservée aux professionnels de santé
                </p>
            </div>
        </div>
    )
}