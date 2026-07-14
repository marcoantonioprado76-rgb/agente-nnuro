'use client'

import { useState } from 'react'
import { Loader2, CheckCircle2 } from 'lucide-react'

export default function LeadForm({ landingPageId }: { landingPageId: string }) {
    const [loading, setLoading] = useState(false)
    const [success, setSuccess] = useState(false)
    const [formData, setFormData] = useState({
        name: '',
        email: '',
        phone: ''
    })

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        setLoading(true)
        try {
            const res = await fetch('/api/leads', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ...formData, landingPageId })
            })
            if (res.ok) setSuccess(true)
        } catch (error) {
            console.error('Error submitting lead:', error)
        } finally {
            setLoading(false)
        }
    }

    if (success) {
        return (
            <div className="bg-[#00FF88]/10 border border-[#00FF88]/30 p-8 rounded-[32px] text-center animate-in zoom-in-95 duration-500">
                <div className="w-16 h-16 bg-[#00FF88] rounded-full flex items-center justify-center mx-auto mb-6 shadow-[0_0_30px_rgba(0,255,136,0.4)]">
                    <CheckCircle2 size={32} className="text-dark-950" />
                </div>
                <h3 className="text-2xl font-bold text-white mb-2">¡Datos Recibidos!</h3>
                <p className="text-[#00FF88]/80">Nos pondremos en contacto contigo muy pronto.</p>
            </div>
        )
    }

    return (
        <form onSubmit={handleSubmit} className="space-y-6 bg-dark-900/50 p-8 md:p-10 rounded-[40px] border border-white/5 backdrop-blur-xl">
            <div className="grid grid-cols-1 gap-6">
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest ml-1">Nombre Completo</label>
                    <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                        className="w-full bg-dark-800 border border-white/5 rounded-2xl p-4 text-white focus:border-[#00FF88]/50 outline-none transition-all placeholder:text-dark-600"
                        placeholder="Juan Pérez"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest ml-1">Correo Electrónico</label>
                    <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                        className="w-full bg-dark-800 border border-white/5 rounded-2xl p-4 text-white focus:border-[#00FF88]/50 outline-none transition-all placeholder:text-dark-600"
                        placeholder="juan@ejemplo.com"
                    />
                </div>
                <div className="space-y-2">
                    <label className="text-[10px] font-black text-dark-500 uppercase tracking-widest ml-1">Teléfono WhatsApp</label>
                    <input
                        type="tel"
                        required
                        value={formData.phone}
                        onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                        className="w-full bg-dark-800 border border-white/5 rounded-2xl p-4 text-white focus:border-[#00FF88]/50 outline-none transition-all placeholder:text-dark-600"
                        placeholder="+51 987 654 321"
                    />
                </div>
            </div>

            <button
                disabled={loading}
                className="w-full bg-white text-dark-950 hover:bg-[#00FF88] py-5 rounded-2xl font-black text-lg transition-all shadow-xl active:scale-95 disabled:opacity-50 flex items-center justify-center gap-2"
            >
                {loading ? <Loader2 className="animate-spin" /> : 'Enviar Información'}
            </button>

            <p className="text-[9px] text-dark-600 text-center uppercase tracking-widest px-8">
                Al enviar tus datos, aceptas nuestra política de privacidad y términos de servicio.
            </p>
        </form>
    )
}
