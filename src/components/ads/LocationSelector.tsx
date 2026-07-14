'use client'

import { useState, useEffect } from 'react'
import { Search, X, MapPin, Globe, Loader2, Building2 } from 'lucide-react'

// Storage format:
//   Countries: "CO" (ISO-2)                        → Meta: countries: ["CO"]
//   Cities (live):  "city:KEY:Bogotá"              → Meta: cities: [{ key }]   (segmenta REAL)
//   Regions (live): "region:KEY:Santa Cruz"        → Meta: regions: [{ key }]  (departamento, REAL)
//   Cities (legacy):"cc:CO:Bogotá"                 → Meta: countries: ["CO"]   (colapsa al país)



export const COUNTRIES: { code: string; name: string }[] = [
    { code: 'AR', name: 'Argentina' }, { code: 'BO', name: 'Bolivia' },
    { code: 'BR', name: 'Brasil' }, { code: 'CA', name: 'Canadá' },
    { code: 'CL', name: 'Chile' }, { code: 'CO', name: 'Colombia' },
    { code: 'CR', name: 'Costa Rica' }, { code: 'CU', name: 'Cuba' },
    { code: 'DO', name: 'República Dominicana' }, { code: 'EC', name: 'Ecuador' },
    { code: 'SV', name: 'El Salvador' }, { code: 'ES', name: 'España' },
    { code: 'US', name: 'Estados Unidos' }, { code: 'GT', name: 'Guatemala' },
    { code: 'HN', name: 'Honduras' }, { code: 'MX', name: 'México' },
    { code: 'NI', name: 'Nicaragua' }, { code: 'PA', name: 'Panamá' },
    { code: 'PY', name: 'Paraguay' }, { code: 'PE', name: 'Perú' },
    { code: 'PR', name: 'Puerto Rico' }, { code: 'UY', name: 'Uruguay' },
    { code: 'VE', name: 'Venezuela' }, { code: 'DE', name: 'Alemania' },
    { code: 'FR', name: 'Francia' }, { code: 'GB', name: 'Reino Unido' },
    { code: 'IT', name: 'Italia' }, { code: 'PT', name: 'Portugal' },
    { code: 'AU', name: 'Australia' }, { code: 'JP', name: 'Japón' },
]


// Resultado de la búsqueda en vivo de Meta (adgeolocation)
interface LiveLoc { key: string; name: string; type: string; countryCode?: string; countryName?: string; region?: string }
function encodeLive(item: LiveLoc): string {
    if (item.type === 'region') return `region:${item.key}:${item.name}`
    return `city:${item.key}:${item.name}`
}

export function parseLocation(loc: string): { type: 'country' | 'city' | 'region'; code: string; name: string } {
    if (loc.startsWith('city:')) { const p = loc.split(':'); return { type: 'city', code: p[1], name: p.slice(2).join(':') } }
    if (loc.startsWith('region:')) { const p = loc.split(':'); return { type: 'region', code: p[1], name: p.slice(2).join(':') } }
    if (loc.startsWith('cc:')) { const p = loc.split(':'); return { type: 'city', code: p[1], name: p.slice(2).join(':') } }
    const country = COUNTRIES.find(c => c.code === loc.toUpperCase())
    return { type: 'country', code: loc.toUpperCase(), name: country?.name || loc }
}

interface Props {
    selected: string[]
    onChange: (locs: string[]) => void
    platform?: string
}

const isCityLoc = (l: string) => l.startsWith('cc:') || l.startsWith('city:') || l.startsWith('region:')

export default function LocationSelector({ selected, onChange, platform = 'meta' }: Props) {
    const [tab, setTab] = useState<'country' | 'city'>('country')
    const [search, setSearch] = useState('')
    const [live, setLive] = useState<LiveLoc[]>([])
    const [searching, setSearching] = useState(false)
    const [liveError, setLiveError] = useState(false)

    const selectedCountries = selected.filter(l => !isCityLoc(l))
    const selectedCities = selected.filter(isCityLoc)

    const q = search.toLowerCase().trim()

    const filteredCountries = q
        ? COUNTRIES.filter(c => c.name.toLowerCase().includes(q) || c.code.toLowerCase().includes(q))
        : COUNTRIES


    // Búsqueda en vivo en la base geo de Meta (ciudades + departamentos/regiones reales)
    useEffect(() => {
        if (tab !== 'city' || q.length < 2) { setLive([]); setLiveError(false); return }
        let alive = true
        setSearching(true)
        const t = setTimeout(async () => {
            try {
                const r = await fetch(`/api/ads/integrations/${platform}/locations?q=${encodeURIComponent(search.trim())}`)
                const d = await r.json()
                if (!alive) return
                if (r.ok && Array.isArray(d.locations)) {
                    setLive(d.locations.filter((l: LiveLoc) => l.type === 'region'))
                    setLiveError(false)
                } else { setLive([]); setLiveError(true) }
            } catch { if (alive) { setLive([]); setLiveError(true) } }
            finally { if (alive) setSearching(false) }
        }, 350)
        return () => { alive = false; clearTimeout(t) }
    }, [q, tab, platform, search])

    function toggleCountry(code: string) {
        selectedCountries.includes(code)
            ? onChange(selected.filter(l => l !== code))
            : onChange([...selected, code])
    }


    function toggleLive(item: LiveLoc) {
        const val = encodeLive(item)
        selected.includes(val)
            ? onChange(selected.filter(l => l !== val))
            : onChange([...selected, val])
    }

    function removeLocation(loc: string) {
        onChange(selected.filter(l => l !== loc))
    }

    return (
        <div className="bg-dark-900/60 border border-white/10 rounded-2xl overflow-hidden">
            {/* Selected chips */}
            {selected.length > 0 && (
                <div className="px-4 pt-3 pb-2 flex flex-wrap gap-1.5 border-b border-white/5">
                    {selected.map(loc => {
                        const parsed = parseLocation(loc)
                        return (
                            <span key={loc} className={`flex items-center gap-1.5 text-[11px] font-medium px-2.5 py-1 rounded-full border ${parsed.type === 'country'
                                ? 'bg-[#B735B8]/10 border-white/10 text-[#B735B8]'
                                : 'bg-[#4C97D8]/10 border-white/10 text-[#4C97D8]'}`}>
                                {parsed.type === 'country' ? <Globe size={10} /> : parsed.type === 'region' ? <Building2 size={10} /> : <MapPin size={10} />}
                                {parsed.name}
                                <button onClick={() => removeLocation(loc)} className="text-white/30 hover:text-[#F87171] transition-all ml-0.5">
                                    <X size={10} />
                                </button>
                            </span>
                        )
                    })}
                    <button onClick={() => onChange([])} className="text-[10px] text-white/20 hover:text-[#F87171] transition-all px-1">
                        Limpiar todo
                    </button>
                </div>
            )}

            {/* Tabs */}
            <div className="flex border-b border-white/8">
                {([
                    ['country', 'Países', <Globe size={12} />, selectedCountries.length],
                    ['city', 'Departamentos', <Building2 size={12} />, selectedCities.length],
                ] as const).map(([key, label, icon, count]) => (
                    <button key={key} onClick={() => { setTab(key); setSearch('') }}
                        className={`flex-1 flex items-center justify-center gap-1.5 py-2.5 text-xs font-bold transition-all ${tab === key ? 'text-white border-b-2 border-white/10' : 'text-white/30 hover:text-white/60'}`}>
                        {icon} {label}
                        {count > 0 && (
                            <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${tab === key ? 'bg-[#B735B8]/30 text-purple-200' : 'bg-white/8 text-white/40'}`}>{count}</span>
                        )}
                    </button>
                ))}
            </div>

            {/* Search */}
            <div className="px-3 pt-3 pb-2">
                <div className="relative">
                    <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-white/30" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder={tab === 'country' ? 'Buscar país...' : 'Buscar departamento / región...'}
                        className="w-full bg-white/5 border border-white/10 rounded-xl pl-8 pr-3 py-2 text-xs text-white focus:outline-none focus:border-white/10 placeholder:text-white/20"
                    />
                </div>
            </div>

            {/* Country list */}
            {tab === 'country' && (
                <div className="px-3 pb-3">
                    <div className="grid grid-cols-2 gap-1.5 max-h-52 overflow-y-auto pr-0.5">
                        {filteredCountries.map(c => {
                            const isSelected = selectedCountries.includes(c.code)
                            return (
                                <button key={c.code} onClick={() => toggleCountry(c.code)}
                                    className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-medium text-left transition-all ${isSelected
                                        ? 'bg-[#B735B8]/20 border border-white/10 text-purple-200'
                                        : 'bg-white/3 border border-white/8 text-white/60 hover:bg-white/8 hover:text-white/90'}`}>
                                    <span className="font-black text-[10px] text-white/30 w-5 shrink-0">{c.code}</span>
                                    <span className="truncate flex-1">{c.name}</span>
                                    {isSelected && <X size={10} className="shrink-0 text-[#B735B8]" />}
                                </button>
                            )
                        })}
                        {filteredCountries.length === 0 && (
                            <p className="col-span-2 text-center text-xs text-white/20 py-6">Sin resultados</p>
                        )}
                    </div>
                </div>
            )}

            {/* City list */}
            {tab === 'city' && (
                <div className="px-3 pb-3">
                    <div className="space-y-1 max-h-52 overflow-y-auto pr-0.5">
                        {/* Buscando en vivo */}
                        {searching && (
                            <div className="flex items-center justify-center gap-2 py-6 text-xs text-white/30">
                                <Loader2 size={13} className="animate-spin" /> Buscando departamentos / regiones…
                            </div>
                        )}

                        {/* Resultados REALES de Meta (ciudades + departamentos) */}
                        {!searching && live.length > 0 && live.map((item) => {
                            const val = encodeLive(item)
                            const isSelected = selected.includes(val)
                            const isRegion = item.type === 'region'
                            return (
                                <button key={val} onClick={() => toggleLive(item)}
                                    className={`w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs text-left transition-all ${isSelected
                                        ? 'bg-[#4C97D8]/15 border border-white/10 text-blue-200'
                                        : 'bg-white/3 border border-white/8 text-white/60 hover:bg-white/8 hover:text-white/90'}`}>
                                    {isRegion
                                        ? <Building2 size={11} className={`shrink-0 ${isSelected ? 'text-[#4C97D8]' : 'text-white/20'}`} />
                                        : <MapPin size={11} className={`shrink-0 ${isSelected ? 'text-[#4C97D8]' : 'text-white/20'}`} />}
                                    <div className="flex-1 min-w-0">
                                        <p className="font-medium truncate">{item.name} {isRegion && <span className="text-[9px] text-white/30">· depto/región</span>}</p>
                                        <p className="text-[10px] text-white/30 truncate">{[item.region, item.countryName].filter(Boolean).join(', ') || item.countryCode}</p>
                                    </div>
                                    {isSelected && <X size={10} className="shrink-0 text-[#4C97D8]" />}
                                </button>
                            )
                        })}

                        {!searching && live.length === 0 && (
                            <p className="text-center text-xs text-white/20 py-6">
                                {liveError && q.length >= 2
                                    ? 'Conectá tu cuenta de Meta para buscar departamentos.'
                                    : q.length >= 2
                                        ? `Sin departamentos para "${search}"`
                                        : 'Escribí el nombre de tu departamento (ej: Santa Cruz, La Paz, Cochabamba)'}
                            </p>
                        )}
                    </div>
                    <p className="text-[10px] text-white/15 mt-2 text-center">
                        {live.length > 0
                            ? 'Departamentos / regiones reales de Meta — segmentan correctamente'
                            : 'Segmentá por departamento (no por ciudad). Buscá el nombre y seleccionalo.'}
                    </p>
                </div>
            )}
        </div>
    )
}
