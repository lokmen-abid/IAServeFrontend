import React, { useState, useEffect, useCallback } from 'react'
import { getClubsOverview, createClub } from '../api/clubs'
import { getPendingUsers, approveUser } from '../api/auth'
import type { ClubOverview } from '../api/clubs'
import type { SpecialistUser } from '../api/auth'

export default function AdminPage() {
    const [clubs, setClubs] = useState<ClubOverview[]>([])
    const [pending, setPending] = useState<SpecialistUser[]>([])
    const [isLoadingClubs, setIsLoadingClubs] = useState(true)
    const [isLoadingPending, setIsLoadingPending] = useState(true)

    // Formulaire nouveau club
    const [newClubName, setNewClubName] = useState('')
    const [newClubCity, setNewClubCity] = useState('')
    const [isCreatingClub, setIsCreatingClub] = useState(false)
    const [clubError, setClubError] = useState('')
    const [clubSuccess, setClubSuccess] = useState('')

    // Actions approve/block
    const [actionLoading, setActionLoading] = useState<string | null>(null)

    const fetchClubs = useCallback(async () => {
        try {
            const data = await getClubsOverview()
            setClubs(data)
        } catch {
            console.error('Erreur chargement clubs')
        } finally {
            setIsLoadingClubs(false)
        }
    }, [])

    const fetchPending = useCallback(async () => {
        try {
            const data = await getPendingUsers()
            setPending(data)
        } catch {
            console.error('Erreur chargement pending')
        } finally {
            setIsLoadingPending(false)
        }
    }, [])

    useEffect(() => {
        const loadData = async () => {
            await fetchClubs()
            await fetchPending()
        }
        void loadData()
    }, [fetchClubs, fetchPending])

    const handleCreateClub = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        if (!newClubName.trim()) return
        setClubError('')
        setClubSuccess('')
        setIsCreatingClub(true)
        try {
            await createClub({ name: newClubName.trim(), city: newClubCity.trim() || null })
            setClubSuccess(`Club "${newClubName}" créé avec succès.`)
            setNewClubName('')
            setNewClubCity('')
            await fetchClubs()
        } catch {
            setClubError('Erreur lors de la création du club.')
        } finally {
            setIsCreatingClub(false)
        }
    }

    const handleApprove = async (userId: string, action: 'approve' | 'block') => {
        setActionLoading(userId + action)
        try {
            await approveUser(userId, action)
            await fetchPending()
        } catch {
            console.error('Erreur action')
        } finally {
            setActionLoading(null)
        }
    }

    const inputStyle = {
        backgroundColor: '#0A1628',
        border: '0.5px solid #1E3A5F',
    }

    // Stats globales
    const totalSpecialists = clubs.reduce((acc, c) => acc + c.specialist_count, 0)
    const totalAthletes = clubs.reduce((acc, c) => acc + c.athlete_count, 0)
    const totalClubs = clubs.filter((c) => c.id !== null).length

    return (
        <div className="max-w-6xl mx-auto space-y-8">

            {/* Header */}
            <div>
                <h1 className="text-2xl font-medium text-white">Administration</h1>
                <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
                    Gestion des clubs, spécialistes et validations
                </p>
            </div>

            {/* Stats globales */}
            <div className="grid grid-cols-4 gap-4">
                {[
                    { label: 'Clubs', value: totalClubs, color: '#38BDF8' },
                    { label: 'Spécialistes', value: totalSpecialists, color: '#10F5A0' },
                    { label: 'Athlètes', value: totalAthletes, color: '#6366F1' },
                    { label: 'En attente', value: pending.length, color: '#FBBF24' },
                ].map((stat) => (
                    <div
                        key={stat.label}
                        className="rounded-xl p-5"
                        style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
                    >
                        <p className="text-3xl font-medium" style={{ color: stat.color }}>
                            {stat.value}
                        </p>
                        <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
                            {stat.label}
                        </p>
                    </div>
                ))}
            </div>

            {/* Section Clubs */}
            <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
            >
                <h2 className="text-lg font-medium text-white mb-4">Clubs de tennis</h2>

                {/* Formulaire ajout club */}
                <form onSubmit={handleCreateClub} className="flex gap-3 mb-6">
                    <input
                        type="text"
                        value={newClubName}
                        onChange={(e) => setNewClubName(e.target.value)}
                        placeholder="Nom du club"
                        required
                        className="flex-1 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
                        onBlur={(e) => (e.target.style.borderColor = '#1E3A5F')}
                    />
                    <input
                        type="text"
                        value={newClubCity}
                        onChange={(e) => setNewClubCity(e.target.value)}
                        placeholder="Ville (optionnel)"
                        className="w-48 rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
                        onBlur={(e) => (e.target.style.borderColor = '#1E3A5F')}
                    />
                    <button
                        type="submit"
                        disabled={isCreatingClub}
                        className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                        style={{
                            background: 'linear-gradient(90deg, #38BDF8, #10F5A0)',
                            color: '#0A1628',
                            opacity: isCreatingClub ? 0.7 : 1,
                        }}
                    >
                        {isCreatingClub ? 'Création...' : '+ Ajouter'}
                    </button>
                </form>

                {/* Messages feedback */}
                {clubSuccess && (
                    <div
                        className="rounded-lg px-4 py-3 text-sm mb-4"
                        style={{ backgroundColor: '#10F5A015', border: '0.5px solid #10F5A040', color: '#10F5A0' }}
                    >
                        {clubSuccess}
                    </div>
                )}
                {clubError && (
                    <div
                        className="rounded-lg px-4 py-3 text-sm mb-4"
                        style={{ backgroundColor: '#EF444415', border: '0.5px solid #EF444440', color: '#FCA5A5' }}
                    >
                        {clubError}
                    </div>
                )}

                {/* Liste clubs */}
                {isLoadingClubs ? (
                    <p className="text-sm" style={{ color: '#94A3B8' }}>Chargement...</p>
                ) : (
                    <div className="space-y-2">
                        {clubs.map((club) => (
                            <div
                                key={club.id ?? 'independent'}
                                className="flex items-center justify-between rounded-xl px-5 py-4"
                                style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}
                            >
                                <div className="flex items-center gap-4">
                                    {/* Icône */}
                                    <div
                                        className="w-10 h-10 rounded-lg flex items-center justify-center text-lg"
                                        style={{
                                            backgroundColor: club.id ? '#38BDF810' : '#6366F110',
                                            border: `0.5px solid ${club.id ? '#38BDF830' : '#6366F130'}`,
                                        }}
                                    >
                                        {club.id ? '🎾' : '👤'}
                                    </div>
                                    <div>
                                        <p className="text-sm font-medium text-white">{club.name}</p>
                                        <p className="text-xs" style={{ color: '#94A3B8' }}>
                                            {club.city ?? 'Ville non renseignée'}
                                        </p>
                                    </div>
                                </div>

                                {/* Stats */}
                                <div className="flex items-center gap-6">
                                    <div className="text-center">
                                        <p className="text-lg font-medium" style={{ color: '#38BDF8' }}>
                                            {club.specialist_count}
                                        </p>
                                        <p className="text-xs" style={{ color: '#94A3B8' }}>Spécialistes</p>
                                    </div>
                                    <div className="text-center">
                                        <p className="text-lg font-medium" style={{ color: '#10F5A0' }}>
                                            {club.athlete_count}
                                        </p>
                                        <p className="text-xs" style={{ color: '#94A3B8' }}>Athlètes</p>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Section Comptes en attente */}
            <div
                className="rounded-2xl p-6"
                style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
            >
                <div className="flex items-center justify-between mb-4">
                    <h2 className="text-lg font-medium text-white">Comptes en attente</h2>
                    {pending.length > 0 && (
                        <span
                            className="text-xs px-2.5 py-1 rounded-full font-medium"
                            style={{ backgroundColor: '#FBBF2415', color: '#FBBF24', border: '0.5px solid #FBBF2430' }}
                        >
              {pending.length} en attente
            </span>
                    )}
                </div>

                {isLoadingPending ? (
                    <p className="text-sm" style={{ color: '#94A3B8' }}>Chargement...</p>
                ) : pending.length === 0 ? (
                    <div
                        className="rounded-xl px-5 py-8 text-center"
                        style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}
                    >
                        <p className="text-sm" style={{ color: '#94A3B8' }}>
                            Aucun compte en attente de validation.
                        </p>
                    </div>
                ) : (
                    <div className="space-y-2">
                        {pending.map((u) => {
                            const club = clubs.find((c) => c.id === u.club_id)
                            return (
                                <div
                                    key={u.id}
                                    className="flex items-center justify-between rounded-xl px-5 py-4"
                                    style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}
                                >
                                    <div className="flex items-center gap-4">
                                        {/* Avatar */}
                                        <div
                                            className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-medium"
                                            style={{ backgroundColor: '#FBBF2415', color: '#FBBF24' }}
                                        >
                                            {u.full_name.split(' ').map((n) => n[0]).join('').toUpperCase().slice(0, 2)}
                                        </div>
                                        <div>
                                            <p className="text-sm font-medium text-white">{u.full_name}</p>
                                            <p className="text-xs" style={{ color: '#94A3B8' }}>{u.email}</p>
                                            <p className="text-xs mt-0.5" style={{ color: '#6366F1' }}>
                                                {club ? `🎾 ${club.name}` : '👤 Indépendant'}
                                            </p>
                                        </div>
                                    </div>

                                    {/* Actions */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => handleApprove(u.id, 'approve')}
                                            disabled={actionLoading === u.id + 'approve'}
                                            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                                            style={{
                                                backgroundColor: '#10F5A015',
                                                color: '#10F5A0',
                                                border: '0.5px solid #10F5A030',
                                                opacity: actionLoading === u.id + 'approve' ? 0.6 : 1,
                                            }}
                                        >
                                            {actionLoading === u.id + 'approve' ? '...' : 'Approuver'}
                                        </button>
                                        <button
                                            onClick={() => handleApprove(u.id, 'block')}
                                            disabled={actionLoading === u.id + 'block'}
                                            className="px-4 py-2 rounded-lg text-sm font-medium transition-opacity"
                                            style={{
                                                backgroundColor: '#EF444415',
                                                color: '#FCA5A5',
                                                border: '0.5px solid #EF444430',
                                                opacity: actionLoading === u.id + 'block' ? 0.6 : 1,
                                            }}
                                        >
                                            {actionLoading === u.id + 'block' ? '...' : 'Bloquer'}
                                        </button>
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

        </div>
    )
}