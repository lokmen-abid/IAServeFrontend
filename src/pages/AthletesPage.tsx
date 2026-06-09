import { useState, useEffect, useCallback } from 'react'
import { useNavigate } from 'react-router-dom'
import { getAthletes, createAthlete, updateAthlete, deleteAthlete } from '../api/athletes'
import type { Athlete, AthleteCreate, AthleteUpdate } from '../api/athletes'
import AthleteCard from '../components/athletes/AthleteCard'
import AthleteForm from '../components/athletes/AthleteForm'
import { useToast } from '../contexts/ToastContext'


type Modal = 'create' | 'edit' | 'delete' | null

export default function AthletesPage() {
    const [athletes, setAthletes]           = useState<Athlete[]>([])
    const [isLoading, setIsLoading]         = useState(true)
    const [search, setSearch]               = useState('')
    const [modal, setModal]                 = useState<Modal>(null)
    const [selected, setSelected]           = useState<Athlete | null>(null)
    const [formLoading, setFormLoading]     = useState(false)
    const [formError, setFormError]         = useState('')
    const [deleteLoading, setDeleteLoading] = useState(false)
    const { showToast } = useToast()
    const navigate = useNavigate()


    const fetchAthletes = useCallback(async () => {
        try {
            const data = await getAthletes()
            setAthletes(Array.isArray(data) ? data : (data as { data: Athlete[] }).data ?? [])
        } catch {
            console.error('Erreur chargement athlètes')
        } finally {
            setIsLoading(false)
        }
    }, [])

    useEffect(() => { void fetchAthletes() }, [fetchAthletes])

    const filtered = athletes.filter((a) =>
        a.name.toLowerCase().includes(search.toLowerCase())
    )

    const openCreate = () => { setSelected(null); setFormError(''); setModal('create') }
    const openEdit   = (a: Athlete) => { setSelected(a); setFormError(''); setModal('edit') }
    const openDelete = (a: Athlete) => { setSelected(a); setModal('delete') }
    const openSessions = (a: Athlete) => { navigate(`/athletes/${a.id}/sessions`) }
    const closeModal = () => { setModal(null); setSelected(null); setFormError('') }

    const handleCreate = async (data: AthleteCreate | AthleteUpdate) => {
        setFormLoading(true); setFormError('')
        try {
            await createAthlete(data as AthleteCreate)
            await fetchAthletes()
            closeModal()
            showToast('Athlète créé avec succès')
        } catch {
            setFormError('Erreur lors de la création. Vérifiez les champs.')
            showToast('Erreur lors de la création', 'error')
        } finally { setFormLoading(false) }
    }

    const handleEdit = async (data: AthleteCreate | AthleteUpdate) => {
        if (!selected) return
        setFormLoading(true); setFormError('')
        try {
            await updateAthlete(selected.id, data as AthleteUpdate)
            await fetchAthletes()
            closeModal()
            showToast('Athlète modifié avec succès')
        } catch {
            setFormError('Erreur lors de la modification.')
            showToast('Erreur lors de la modification', 'error')
        } finally { setFormLoading(false) }
    }

    const handleDelete = async () => {
        if (!selected) return
        setDeleteLoading(true)
        try {
            await deleteAthlete(selected.id)
            await fetchAthletes()
            closeModal()
            showToast(`${selected.name} supprimé`)
        } catch {
            showToast('Erreur lors de la suppression', 'error')
        } finally { setDeleteLoading(false) }
    }

    const cardStyle = { backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }

    return (
        <div className="max-w-4xl mx-auto space-y-6">

            {/* Header */}
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-medium text-white">Athlètes</h1>
                    <p className="text-sm mt-1" style={{ color: '#94A3B8' }}>
                        {athletes.length} athlète{athletes.length !== 1 ? 's' : ''} dans votre liste
                    </p>
                </div>
                <button
                    onClick={openCreate}
                    className="px-5 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-90"
                    style={{ background: 'linear-gradient(90deg, #38BDF8, #10F5A0)', color: '#0A1628' }}
                >
                    + Nouvel athlète
                </button>
            </div>

            {/* Formulaire inline */}
            {(modal === 'create' || modal === 'edit') && (
                <AthleteForm
                    athlete={modal === 'edit' ? selected : null}
                    onSubmit={modal === 'edit' ? handleEdit : handleCreate}
                    onCancel={closeModal}
                    isLoading={formLoading}
                    error={formError}
                />
            )}

            {/* Recherche */}
            <div className="relative">
                <input
                    type="text" value={search} onChange={(e) => setSearch(e.target.value)}
                    placeholder="Rechercher un athlète..."
                    className="w-full rounded-xl px-4 py-3 text-sm text-white outline-none transition-all"
                    style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
                    onFocus={(e) => (e.target.style.borderColor = '#38BDF8')}
                    onBlur={(e)  => (e.target.style.borderColor = '#1E3A5F')}
                />
                {search && (
                    <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-sm" style={{ color: '#475569' }}>✕</button>
                )}
            </div>

            {/* Liste */}
            <div className="rounded-2xl p-6 space-y-2" style={cardStyle}>
                {isLoading ? (
                    <p className="text-sm text-center py-8" style={{ color: '#94A3B8' }}>Chargement...</p>
                ) : filtered.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-3xl mb-3">🎾</p>
                        <p className="text-sm font-medium text-white mb-1">
                            {search ? 'Aucun résultat' : 'Aucun athlète'}
                        </p>
                        <p className="text-sm" style={{ color: '#94A3B8' }}>
                            {search ? `Aucun athlète ne correspond à "${search}"` : 'Ajoutez votre premier athlète ci-dessus.'}
                        </p>
                    </div>
                ) : (
                    filtered.map((athlete) => (
                        <AthleteCard
                            key={athlete.id}
                            athlete={athlete}
                            onEdit={openEdit}
                            onDelete={openDelete}
                            onViewSessions={openSessions}
                        />
                    ))
                )}
            </div>

            {/* Modal Suppression */}
            {modal === 'delete' && selected && (
                <div
                    className="fixed inset-0 flex items-center justify-center z-50"
                    style={{ backgroundColor: 'rgba(0,0,0,0.7)' }}
                    onClick={closeModal}
                >
                    <div
                        className="rounded-2xl p-6 w-full max-w-sm mx-4"
                        style={cardStyle}
                        onClick={(e) => e.stopPropagation()}
                    >
                        <h3 className="text-lg font-medium text-white mb-2">Supprimer l'athlète</h3>
                        <p className="text-sm mb-6" style={{ color: '#94A3B8' }}>
                            Supprimer <span className="text-white font-medium">{selected.name}</span> ?
                            Toutes les sessions et analyses associées seront définitivement perdues.
                        </p>
                        <div className="flex gap-3">
                            <button
                                onClick={closeModal}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium"
                                style={{ backgroundColor: '#0A1628', color: '#94A3B8', border: '0.5px solid #1E3A5F' }}
                            >
                                Annuler
                            </button>
                            <button
                                onClick={handleDelete} disabled={deleteLoading}
                                className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                                style={{ backgroundColor: '#EF444415', color: '#FCA5A5', border: '0.5px solid #EF444430', opacity: deleteLoading ? 0.6 : 1 }}
                            >
                                {deleteLoading ? 'Suppression...' : 'Supprimer'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

        </div>
    )
}