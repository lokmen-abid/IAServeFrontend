import type { ReactNode } from 'react'
import Navbar from './Navbar'

export default function Layout({ children }: { children: ReactNode }) {
    return (
        <div className="min-h-screen" style={{ backgroundColor: '#0A1628' }}>
            <Navbar />
            <main className="px-6 py-6">
                {children}
            </main>
        </div>
    )
}