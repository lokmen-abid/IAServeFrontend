import React, { useState, useEffect } from 'react'
import type { Athlete, AthleteCreate, AthleteUpdate } from '../../api/athletes'

interface Props {
    athlete?: Athlete | null
    onSubmit: (data: AthleteCreate | AthleteUpdate) => Promise<void>
    onCancel: () => void
    isLoading: boolean
    error: string
}

export default function AthleteForm({ athlete, onSubmit, onCancel, isLoading, error }: Props) {
    const isEdit = Boolean(athlete)

    const [name, setName]                 = useState(athlete?.name ?? '')
    const [age, setAge]                   = useState(athlete?.age?.toString() ?? '')
    const [sex, setSex] = useState<'male' | 'female'>(athlete?.sex ?? 'male')
    const [dominantHand, setDominantHand] = useState<'right' | 'left'>(athlete?.dominant_hand ?? 'right')
    const [medicalNotes, setMedicalNotes] = useState(athlete?.medical_notes ?? '')

    useEffect(() => {
        setName(athlete?.name ?? '')
        setAge(athlete?.age?.toString() ?? '')
        setSex(athlete?.sex ?? 'male')
        setDominantHand(athlete?.dominant_hand ?? 'right')
        setMedicalNotes(athlete?.medical_notes ?? '')
    }, [athlete])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        await onSubmit({
            name: name.trim(),
            age: parseInt(age),
            sex,
            dominant_hand: dominantHand,
            medical_notes: medicalNotes.trim() || undefined,
        })
    }

    const inputStyle = { backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }
    const handleFocus = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        (e.target.style.borderColor = '#38BDF8')
    const handleBlur  = (e: React.FocusEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        (e.target.style.borderColor = '#1E3A5F')

    return (
        <div className="rounded-2xl p-6" style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}>
            <h2 className="text-lg font-medium text-white mb-5">
                {isEdit ? "Modifier l'athlète" : 'Nouvel athlète'}
            </h2>

            <form onSubmit={handleSubmit} className="space-y-4">

                {/* Nom */}
                <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#94A3B8' }}>Nom complet</label>
                    <input
                        type="text" value={name} onChange={(e) => setName(e.target.value)}
                        placeholder="Ex: Marie Dupont" required
                        className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                        style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                    />
                </div>

                {/* Âge + main dominante */}
                <div className="grid grid-cols-3 gap-4">
                    <div className="flex-1">
                        <label className="block text-xs mb-1.5" style={{ color: '#94A3B8' }}>Âge</label>
                        <input
                            type="number" value={age} onChange={(e) => setAge(e.target.value)}
                            placeholder="25" min={5} max={100} required
                            className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all"
                            style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
                        />
                    </div>
                    {/* Sexe */}
                    <div className="flex-1">
                        <label className="block text-xs mb-1.5" style={{ color: '#94A3B8' }}>Sexe</label>
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '0.5px solid #1E3A5F' }}>
                            {(['male', 'female'] as const).map((s) => (
                                <button
                                    key={s} type="button" onClick={() => setSex(s)}
                                    className="flex-1 py-2.5 text-sm font-medium transition-all"
                                    style={{
                                        backgroundColor: sex === s ? '#38BDF820' : '#0A1628',
                                        color: sex === s ? '#38BDF8' : '#94A3B8',
                                        borderRight: s === 'male' ? '0.5px solid #1E3A5F' : 'none',
                                    }}
                                >
                                    {s === 'male' ? 'Homme' : 'Femme'}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="flex-1">
                        <label className="block text-xs mb-1.5" style={{ color: '#94A3B8' }}>Main dominante</label>
                        <div className="flex rounded-lg overflow-hidden" style={{ border: '0.5px solid #1E3A5F' }}>
                            {(['right', 'left'] as const).map((hand) => (
                                <button
                                    key={hand} type="button" onClick={() => setDominantHand(hand)}
                                    className="flex-1 py-2.5 text-sm font-medium transition-all"
                                    style={{
                                        backgroundColor: dominantHand === hand ? '#38BDF820' : '#0A1628',
                                        color: dominantHand === hand ? '#38BDF8' : '#94A3B8',
                                        borderRight: hand === 'right' ? '0.5px solid #1E3A5F' : 'none',
                                    }}
                                >
                                    {hand === 'right' ? 'Droitier' : 'Gaucher'}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Notes médicales */}
                <div>
                    <label className="block text-xs mb-1.5" style={{ color: '#94A3B8' }}>
                        Notes médicales <span style={{ color: '#475569' }}>(optionnel)</span>
                    </label>
                    <textarea
                        value={medicalNotes} onChange={(e) => setMedicalNotes(e.target.value)}
                        placeholder="Antécédents, blessures, contre-indications..."
                        rows={3}
                        className="w-full rounded-lg px-4 py-2.5 text-sm text-white outline-none transition-all resize-none"
                        style={inputStyle} onFocus={handleFocus} onBlur={handleBlur}
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

                {/* Boutons */}
                <div className="flex gap-3 pt-1">
                    <button
                        type="button" onClick={onCancel}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity hover:opacity-80"
                        style={{ backgroundColor: '#0A1628', color: '#94A3B8', border: '0.5px solid #1E3A5F' }}
                    >
                        Annuler
                    </button>
                    <button
                        type="submit" disabled={isLoading}
                        className="flex-1 py-2.5 rounded-lg text-sm font-medium transition-opacity"
                        style={{
                            background: 'linear-gradient(90deg, #38BDF8, #10F5A0)',
                            color: '#0A1628',
                            opacity: isLoading ? 0.6 : 1,
                        }}
                    >
                        {isLoading ? 'Enregistrement...' : isEdit ? "Enregistrer" : "Créer l'athlète"}
                    </button>
                </div>
            </form>
        </div>
    )
}