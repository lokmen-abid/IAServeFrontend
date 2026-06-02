import type { Athlete } from '../../api/athletes'

interface Props {
    athlete: Athlete
    onEdit: (athlete: Athlete) => void
    onDelete: (athlete: Athlete) => void
    onViewSessions: (athlete: Athlete) => void
}

export default function AthleteCard({ athlete, onEdit, onDelete, onViewSessions }: Props) {
    const initials = athlete.name
        .split(' ')
        .map((n) => n[0])
        .join('')
        .toUpperCase()
        .slice(0, 2)

    const handLabel = athlete.dominant_hand === 'right' ? 'Droitier' : 'Gaucher'

    return (
        <div
            className="rounded-xl px-5 py-4 flex items-center justify-between"
            style={{ backgroundColor: '#0A1628', border: '0.5px solid #1E3A5F' }}
        >
            {/* Avatar + infos */}
            <div className="flex items-center gap-4">
                <div
                    className="w-11 h-11 rounded-full flex items-center justify-center text-sm font-medium flex-shrink-0"
                    style={{ backgroundColor: '#10F5A015', color: '#10F5A0', border: '0.5px solid #10F5A030' }}
                >
                    {initials}
                </div>
                <div>
                    <p className="text-sm font-medium text-white">{athlete.name}</p>
                    <div className="flex items-center gap-3 mt-0.5">
                        <span className="text-xs" style={{color: '#94A3B8'}}>{athlete.age} ans</span>
                        <span style={{color: '#1E3A5F'}}>·</span>
                        <span className="text-xs" style={{color: '#94A3B8'}}>
                            {athlete.sex === 'male' ? 'Homme' : 'Femme'}
                        </span>
                        <span style={{color: '#1E3A5F'}}>·</span>
                        <span className="text-xs" style={{color: '#94A3B8'}}>{handLabel}</span>
                        {athlete.medical_notes && (
                            <>
                                <span style={{color: '#1E3A5F'}}>·</span>
                                <span
                                    className="text-xs px-2 py-0.5 rounded-full"
                                    style={{
                                        backgroundColor: '#FBBF2415',
                                        color: '#FBBF24',
                                        border: '0.5px solid #FBBF2430'
                                    }}
                                >
                                    Note médicale
                                </span>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-2">
                <button
                    onClick={() => onViewSessions(athlete)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{backgroundColor: '#38BDF815', color: '#38BDF8', border: '0.5px solid #38BDF830' }}
                >
                    Sessions
                </button>
                <button
                    onClick={() => onEdit(athlete)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#6366F115', color: '#818CF8', border: '0.5px solid #6366F130' }}
                >
                    Modifier
                </button>
                <button
                    onClick={() => onDelete(athlete)}
                    className="px-3 py-1.5 rounded-lg text-xs font-medium transition-opacity hover:opacity-80"
                    style={{ backgroundColor: '#EF444415', color: '#FCA5A5', border: '0.5px solid #EF444430' }}
                >
                    Supprimer
                </button>
            </div>
        </div>
    )
}