import { createContext, useContext, useState, useCallback } from 'react'

export type ToastType = 'success' | 'error' | 'info'

interface Toast {
    id: number
    message: string
    type: ToastType
}

interface ToastContextValue {
    showToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
    const [toasts, setToasts] = useState<Toast[]>([])

    const showToast = useCallback((message: string, type: ToastType = 'success') => {
        const id = Date.now()
        setToasts((prev) => [...prev, { id, message, type }])
        setTimeout(() => {
            setToasts((prev) => prev.filter((t) => t.id !== id))
        }, 5000)
    }, [])

    const dismiss = (id: number) =>
        setToasts((prev) => prev.filter((t) => t.id !== id))

    return (
        <ToastContext.Provider value={{ showToast }}>
            {children}

            {/* Stack de toasts — coin bas droit */}
            <div className="fixed bottom-6 right-6 flex flex-col gap-2 z-50">
                {toasts.map((toast) => (
                    <div
                        key={toast.id}
                        onClick={() => dismiss(toast.id)}
                        className="flex items-center gap-3 px-4 py-3 rounded-xl cursor-pointer transition-all"
                        style={{
                            backgroundColor: '#0F2035',
                            border: `0.5px solid ${
                                toast.type === 'success' ? '#10F5A040' :
                                    toast.type === 'error'   ? '#EF444440' :
                                        '#38BDF840'
                            }`,
                            boxShadow: '0 4px 24px rgba(0,0,0,0.4)',
                            minWidth: '280px',
                            maxWidth: '400px',
                        }}
                    >
                        {/* Dot coloré */}
                        <div
                            className="w-2 h-2 rounded-full flex-shrink-0"
                            style={{
                                backgroundColor:
                                    toast.type === 'success' ? '#10F5A0' :
                                        toast.type === 'error'   ? '#FCA5A5' :
                                            '#38BDF8',
                            }}
                        />
                        {/* Message */}
                        <p
                            className="text-sm flex-1"
                            style={{
                                color:
                                    toast.type === 'success' ? '#10F5A0' :
                                        toast.type === 'error'   ? '#FCA5A5' :
                                            '#38BDF8',
                            }}
                        >
                            {toast.message}
                        </p>
                        {/* Dismiss */}
                        <span className="text-xs flex-shrink-0" style={{ color: '#475569' }}>✕</span>
                    </div>
                ))}
            </div>
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextValue {
    const ctx = useContext(ToastContext)
    if (!ctx) throw new Error('useToast doit être utilisé dans ToastProvider')
    return ctx
}