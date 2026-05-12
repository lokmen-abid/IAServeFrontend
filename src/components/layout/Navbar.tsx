import { useState } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '../../contexts/AuthContext'

export default function Navbar() {
    const { user, signOut } = useAuth()
    const location = useLocation()
    const navigate = useNavigate()
    const [showDropdown, setShowDropdown] = useState(false)

    const handleSignOut = () => {
        signOut()
        navigate('/login')
    }

    const navLinks = [
        { path: '/dashboard', label: 'Dashboard' },
        { path: '/athletes', label: 'Athlètes' },
    ]

    const isActive = (path: string) => location.pathname === path

    return (
        <nav
            className="w-full px-6 py-3 flex items-center justify-between"
            style={{ backgroundColor: '#0A1628', borderBottom: '0.5px solid #1E3A5F' }}
        >

            {/* Logo */}
            <Link to="/dashboard" className="text-2xl font-medium tracking-tight">
                <span style={{ color: '#38BDF8' }}>IA</span>
                <span style={{ color: '#10F5A0' }}>/</span>
                <span className="text-white">Serve</span>
            </Link>

            {/* Nav links */}
            <div className="flex items-center gap-1">
                {navLinks.map((link) => (
                    <Link
                        key={link.path}
                        to={link.path}
                        className="px-4 py-2 rounded-lg text-sm transition-all"
                        style={{
                            color: isActive(link.path) ? '#38BDF8' : '#94A3B8',
                            backgroundColor: isActive(link.path) ? '#38BDF810' : 'transparent',
                            border: isActive(link.path) ? '0.5px solid #38BDF830' : '0.5px solid transparent',
                        }}
                    >
                        {link.label}
                    </Link>
                ))}

                {/* Lien admin */}
                {user?.role === 'admin' && (
                    <Link
                        to="/admin"
                        className="px-4 py-2 rounded-lg text-sm transition-all"
                        style={{
                            color: isActive('/admin') ? '#6366F1' : '#94A3B8',
                            backgroundColor: isActive('/admin') ? '#6366F110' : 'transparent',
                            border: isActive('/admin') ? '0.5px solid #6366F130' : '0.5px solid transparent',
                        }}
                    >
                        Administration
                    </Link>
                )}
            </div>

            {/* User menu */}
            <div className="relative">
                <button
                    onClick={() => setShowDropdown(!showDropdown)}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg transition-all"
                    style={{ border: '0.5px solid #1E3A5F' }}
                    onMouseEnter={(e) => (e.currentTarget.style.borderColor = '#38BDF850')}
                    onMouseLeave={(e) => (e.currentTarget.style.borderColor = '#1E3A5F')}
                >
                    {/* Avatar initiales */}
                    <div
                        className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-medium"
                        style={{ backgroundColor: '#38BDF815', color: '#38BDF8' }}
                    >
                        {user?.full_name
                            .split(' ')
                            .map((n) => n[0])
                            .join('')
                            .toUpperCase()
                            .slice(0, 2)}
                    </div>

                    {/* Nom + club */}
                    <div className="text-left hidden sm:block">
                        <p className="text-sm font-medium text-white leading-tight">{user?.full_name}</p>
                        <p className="text-xs leading-tight" style={{ color: '#94A3B8' }}>
                            {user?.club_id ? 'Club membre' : 'Indépendant'}
                        </p>
                    </div>

                    {/* Chevron */}
                    <svg
                        className="w-4 h-4 transition-transform"
                        style={{
                            color: '#94A3B8',
                            transform: showDropdown ? 'rotate(180deg)' : 'rotate(0deg)',
                        }}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                    >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 9l-7 7-7-7" />
                    </svg>
                </button>

                {/* Dropdown */}
                {showDropdown && (
                    <div
                        className="absolute right-0 mt-2 w-52 rounded-xl py-1 z-50"
                        style={{ backgroundColor: '#0F2035', border: '0.5px solid #1E3A5F' }}
                    >
                        {/* Info user */}
                        <div className="px-4 py-3" style={{ borderBottom: '0.5px solid #1E3A5F' }}>
                            <p className="text-xs font-medium text-white">{user?.full_name}</p>
                            <p className="text-xs mt-0.5" style={{ color: '#94A3B8' }}>{user?.email}</p>
                            <span
                                className="inline-block mt-1.5 text-xs px-2 py-0.5 rounded-full"
                                style={{
                                    backgroundColor: user?.role === 'admin' ? '#6366F115' : '#38BDF815',
                                    color: user?.role === 'admin' ? '#6366F1' : '#38BDF8',
                                    border: `0.5px solid ${user?.role === 'admin' ? '#6366F130' : '#38BDF830'}`,
                                }}
                            >
                {user?.role === 'admin' ? 'Administrateur' : 'Spécialiste'}
              </span>
                        </div>

                        {/* Actions */}
                        <div className="py-1">
                            <button
                                onClick={handleSignOut}
                                className="w-full text-left px-4 py-2 text-sm transition-colors"
                                style={{ color: '#FCA5A5' }}
                                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = '#EF444410')}
                                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
                            >
                                Se déconnecter
                            </button>
                        </div>
                    </div>
                )}
            </div>

        </nav>
    )
}