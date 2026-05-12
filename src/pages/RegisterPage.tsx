import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { register, getClubs } from '../api/auth'
import type { Club } from '../api/auth'

export default function RegisterPage() {
    const navigate = useNavigate()

    const [fullName, setFullName] = useState('')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmPassword, setConfirmPassword] = useState('')
    const [clubId, setClubId] = useState<string>('independent')
    const [clubs, setClubs] = useState<Club[]>([])
    const [isLoadingClubs, setIsLoadingClubs] = useState(true)
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState('')
    const [success, setSuccess] = useState(false)

    // Charger les clubs au montage
    useEffect(() => {
        getClubs()
            .then(setClubs)
            .catch(() => setClubs([]))
            .finally(() => setIsLoadingClubs(false))
    }, [])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setError('')

        if (password !== confirmPassword) {
            setError('Les mots de passe ne correspondent pas.')
            return
        }

        if (password.length < 6) {
            setError('Le mot de passe doit contenir au moins 6 caractères.')
            return
        }

        setIsLoading(true)
        try {
            await register({
                email,
                password,
                full_name: fullName,
                club_id: clubId === 'independent' ? null : clubId,
            })
            setSuccess(true)
        } catch (err: unknown) {
            const status = (err as { response?: { status?: number } }).response?.status
            const detail = (err as { response?: { data?: { detail?: string } } }).response?.data?.detail
            if (status === 400) {
                setError(detail ?? 'Cet email est déjà utilisé.')
            } else if (status === 404) {
                setError('Club introuvable. Veuillez réessayer.')
            } else {
                setError('Une erreur est survenue. Vérifiez votre connexion.')
            }
        } finally {
            setIsLoading(false)
        }
    }

    const inputStyle = {
        backgroundColor: '#0A1628',
        border: '0.5px solid #1E3A5F',
    }

    const focusStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.target.style.borderColor = '#38BDF8'
    }
    const blurStyle = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.target.style.borderColor = '#1E3A5F'
    }

    // Écran succès
    if (success) {
        return (
            <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0A1628' }}>
                <div className="w-full max-w-md px-4 text-center">
                    <div className="text-4xl mb-6">🎾</div>
                    <h1 className="text-3xl font-medium mb-2">
                        <span style={{ color: '#38BDF8' }}>IA</span>
                        <span style={{ color: '#10F5A0' }}>/</span>
                        <span className="text-white">Serve</span>
                    </h1>
                    <div
                        className="rounded-2xl p-8 mt-6"
                        style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
                    >
                        <div
                            className="w-14 h-14 rounded-full flex items-center justify-center mx-auto mb-4"
                            style={{ backgroundColor: '#10F5A015', border: '0.5px solid #10F5A040' }}
                        >
                            <span style={{ color: '#10F5A0', fontSize: '24px' }}>✓</span>
                        </div>
                        <h2 className="text-xl font-medium text-white mb-3">Compte créé avec succès</h2>
                        <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
                            Votre demande a été envoyée. Un administrateur doit valider
                            votre compte avant que vous puissiez vous connecter.
                        </p>
                        <div
                            className="rounded-lg px-4 py-3 text-sm mb-6"
                            style={{ backgroundColor: '#38BDF815', border: '0.5px solid #38BDF840', color: '#38BDF8' }}
                        >
                            Vous recevrez une confirmation une fois votre compte approuvé.
                        </div>
                        <button
                            onClick={() => navigate('/login')}
                            className="w-full py-2.5 rounded-lg text-sm font-medium transition-opacity"
                            style={{ background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' }}
                        >
                            Retour à la connexion
                        </button>
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="min-h-screen flex items-center justify-center py-8" style={{ backgroundColor: '#0A1628' }}>
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
                    <h2 className="text-xl font-medium text-white mb-1">Créer un compte</h2>
                    <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
                        Espace spécialiste de santé
                    </p>

                    <form onSubmit={handleSubmit} className="space-y-4">

                        {/* Nom complet */}
                        <div>
                            <label className="block text-sm mb-1.5" style={{ color: '#94A3B8' }}>
                                Nom complet
                            </label>
                            <input
                                type="text"
                                value={fullName}
                                onChange={(e) => setFullName(e.target.value)}
                                required
                                placeholder="Dr. Jean Dupont"
                                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                                style={inputStyle}
                                onFocus={focusStyle}
                                onBlur={blurStyle}
                            />
                        </div>

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
                                style={inputStyle}
                                onFocus={focusStyle}
                                onBlur={blurStyle}
                            />
                        </div>

                        {/* Club */}
                        <div>
                            <label className="block text-sm mb-1.5" style={{ color: '#94A3B8' }}>
                                Club de tennis
                            </label>
                            <select
                                value={clubId}
                                onChange={(e) => setClubId(e.target.value)}
                                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                                style={{ ...inputStyle, cursor: 'pointer' }}
                                onFocus={focusStyle}
                                onBlur={blurStyle}
                            >
                                <option value="independent" style={{ backgroundColor: '#0A1628' }}>
                                    Indépendant (sans club)
                                </option>
                                {isLoadingClubs ? (
                                    <option disabled style={{ backgroundColor: '#0A1628' }}>
                                        Chargement des clubs...
                                    </option>
                                ) : (
                                    clubs.map((club) => (
                                        <option
                                            key={club.id}
                                            value={club.id}
                                            style={{ backgroundColor: '#0A1628' }}
                                        >
                                            {club.name}{club.city ? ` — ${club.city}` : ''}
                                        </option>
                                    ))
                                )}
                            </select>
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
                                style={inputStyle}
                                onFocus={focusStyle}
                                onBlur={blurStyle}
                            />
                        </div>

                        {/* Confirmer mot de passe */}
                        <div>
                            <label className="block text-sm mb-1.5" style={{ color: '#94A3B8' }}>
                                Confirmer le mot de passe
                            </label>
                            <input
                                type="password"
                                value={confirmPassword}
                                onChange={(e) => setConfirmPassword(e.target.value)}
                                required
                                placeholder="••••••••"
                                className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                                style={inputStyle}
                                onFocus={focusStyle}
                                onBlur={blurStyle}
                            />
                        </div>

                        {/* Erreur */}
                        {error && (
                            <div
                                className="rounded-lg px-4 py-3 text-sm"
                                style={{ backgroundColor: '#EF444415', border: '0.5px solid #EF444440', color: '#FCA5A5' }}
                            >
                                {error}
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
                            {isLoading ? 'Création du compte...' : 'Créer mon compte'}
                        </button>

                    </form>

                    {/* Lien login */}
                    <p className="text-center text-sm mt-6" style={{ color: '#94A3B8' }}>
                        Déjà un compte ?{' '}
                        <Link
                            to="/login"
                            className="font-medium transition-colors"
                            style={{ color: '#38BDF8' }}
                        >
                            Se connecter →
                        </Link>
                    </p>
                </div>

                {/* Footer */}
                <p className="text-center text-xs mt-6" style={{ color: '#475569' }}>
                    Plateforme réservée aux professionnels de Tennis. Les comptes sont soumis à validation par un administrateur.
                </p>
            </div>
        </div>
    )
}