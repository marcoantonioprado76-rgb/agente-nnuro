'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import {
  Search,
  Bot,
  Package,
  MessageSquare,
  Target,
  Store,
  ShoppingBag,
  CreditCard,
  User,
  Settings,
  ArrowRight,
  Loader2,
  Command,
  LayoutDashboard,
} from 'lucide-react'

interface SearchResult {
  id: string
  type: string
  title: string
  subtitle?: string
  link: string
  icon?: string
}

const iconMap: Record<string, typeof Bot> = {
  bot: Bot,
  product: Package,
  conversation: MessageSquare,
  lead: Target,
  store: Store,
  sale: ShoppingBag,
  subscription: CreditCard,
  user: User,
  plan: CreditCard,
  section: LayoutDashboard,
}

const typeColors: Record<string, string> = {
  Agentes: '#8B5CF6',
  Bots: '#8B5CF6',
  Productos: '#A78BFA',
  Leads: '#F59E0B',
  Tiendas: '#10B981',
  Ventas: '#10B981',
  Suscripciones: '#F59E0B',
  Usuarios: '#8B5CF6',
  Planes: '#A78BFA',
  Secciones: '#94A3B8',
}

export function SearchDialog() {
  const [open, setOpen] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<SearchResult[]>([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(undefined)

  // Open with Cmd+K / Ctrl+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault()
        setOpen(prev => !prev)
      }
      if (e.key === 'Escape') {
        setOpen(false)
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [])

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('')
      setResults([])
      setSelectedIndex(0)
      setTimeout(() => inputRef.current?.focus(), 50)
    }
  }, [open])

  // Debounced search
  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([])
      setLoading(false)
      return
    }
    setLoading(true)
    try {
      const res = await fetch(`/api/search?q=${encodeURIComponent(q)}`)
      if (res.ok) {
        const data = await res.json()
        setResults(data.results || [])
      }
    } catch {
      // Silent
    } finally {
      setLoading(false)
    }
  }, [])

  const handleChange = (value: string) => {
    setQuery(value)
    setSelectedIndex(0)
    if (debounceRef.current) clearTimeout(debounceRef.current)
    if (value.length >= 2) {
      setLoading(true)
      debounceRef.current = setTimeout(() => search(value), 300)
    } else {
      setResults([])
      setLoading(false)
    }
  }

  const handleNavigate = (link: string) => {
    setOpen(false)
    window.location.href = link
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault()
      setSelectedIndex(prev => Math.min(prev + 1, results.length - 1))
    } else if (e.key === 'ArrowUp') {
      e.preventDefault()
      setSelectedIndex(prev => Math.max(prev - 1, 0))
    } else if (e.key === 'Enter' && results[selectedIndex]) {
      handleNavigate(results[selectedIndex].link)
    }
  }

  // Group results by type
  const grouped = results.reduce<Record<string, SearchResult[]>>((acc, r) => {
    if (!acc[r.type]) acc[r.type] = []
    acc[r.type].push(r)
    return acc
  }, {})

  // Flat index for keyboard nav
  let flatIndex = 0

  if (!open) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm animate-in fade-in duration-150"
        onClick={() => setOpen(false)}
      />

      {/* Dialog */}
      <div
        className="fixed left-1/2 top-[20%] z-50 w-[560px] max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl overflow-hidden animate-in fade-in slide-in-from-top-4 duration-200"
        style={{
          background: 'linear-gradient(180deg, rgba(17, 29, 53, 0.99) 0%, rgba(13, 21, 41, 1) 100%)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 25px 80px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.05)',
        }}
      >
        {/* Search Input */}
        <div
          className="flex items-center gap-3 px-5 h-14"
          style={{ borderBottom: '1px solid rgba(255, 255, 255, 0.06)' }}
        >
          <Search className="h-4.5 w-4.5 text-[#8B5CF6] shrink-0" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => handleChange(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder="Buscar bots, productos, conversaciones, tiendas..."
            className="flex-1 bg-transparent text-[14px] text-white placeholder:text-[#94A3B8]/40 outline-none"
          />
          {loading && <Loader2 className="h-4 w-4 text-[#8B5CF6] animate-spin shrink-0" />}
          <kbd
            className="hidden md:flex items-center gap-0.5 rounded-md px-1.5 h-5 text-[9px] font-medium text-[#94A3B8]/40 shrink-0"
            style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
          >
            ESC
          </kbd>
        </div>

        {/* Results */}
        <div className="max-h-[380px] overflow-y-auto no-scrollbar">
          {query.length < 2 ? (
            // Quick actions when no query
            <div className="px-5 py-4">
              <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-[#94A3B8]/30 mb-2.5">
                Accesos rápidos
              </p>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: 'Dashboard', link: '/dashboard', icon: LayoutDashboard, color: '#8B5CF6' },
                  { label: 'Mis Agentes', link: '/bots', icon: Bot, color: '#06B6D4' },
                  { label: 'Leads', link: '/leads', icon: Target, color: '#F59E0B' },
                  { label: 'Tienda Virtual', link: '/stores', icon: Store, color: '#10B981' },
                  { label: 'Configuración', link: '/settings', icon: Settings, color: '#94A3B8' },
                ].map(item => (
                  <button
                    key={item.link}
                    onClick={() => handleNavigate(item.link)}
                    className="flex items-center gap-2.5 rounded-xl px-3.5 py-2.5 text-left transition-colors duration-150 hover:bg-white/[0.04]"
                    style={{ border: '1px solid rgba(255, 255, 255, 0.04)' }}
                  >
                    <item.icon className="h-3.5 w-3.5 shrink-0" style={{ color: item.color }} />
                    <span className="text-[12px] text-[#C8C2D9]">{item.label}</span>
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-center gap-2 mt-4 pt-3" style={{ borderTop: '1px solid rgba(255, 255, 255, 0.04)' }}>
                <Command className="h-3 w-3 text-[#94A3B8]/30" />
                <span className="text-[10px] text-[#94A3B8]/30">
                  Escribe para buscar o usa <kbd className="font-mono">⌘K</kbd> en cualquier momento
                </span>
              </div>
            </div>
          ) : results.length === 0 && !loading ? (
            // No results
            <div className="flex flex-col items-center justify-center py-12 px-6">
              <Search className="h-8 w-8 text-[#94A3B8]/20 mb-3" />
              <p className="text-[13px] text-[#94A3B8]/60">Sin resultados para &ldquo;{query}&rdquo;</p>
              <p className="text-[11px] text-[#94A3B8]/30 mt-1">Intenta con otro término de búsqueda</p>
            </div>
          ) : (
            // Grouped results
            <div className="py-2">
              {Object.entries(grouped).map(([type, items]) => (
                <div key={type} className="mb-1">
                  <p
                    className="text-[10px] font-semibold uppercase tracking-[0.12em] px-5 py-1.5"
                    style={{ color: typeColors[type] || '#94A3B8' }}
                  >
                    {type}
                  </p>
                  {items.map((result) => {
                    const currentIndex = flatIndex++
                    const Icon = iconMap[result.icon || ''] || LayoutDashboard
                    const color = typeColors[result.type] || '#94A3B8'
                    return (
                      <button
                        key={result.id}
                        onClick={() => handleNavigate(result.link)}
                        onMouseEnter={() => setSelectedIndex(currentIndex)}
                        className="w-full flex items-center gap-3 px-5 py-2.5 text-left transition-colors duration-100"
                        style={{
                          background: selectedIndex === currentIndex ? 'rgba(255, 255, 255, 0.04)' : 'transparent',
                        }}
                      >
                        <div
                          className="flex h-8 w-8 items-center justify-center rounded-lg shrink-0"
                          style={{ background: `${color}15`, border: `1px solid ${color}20` }}
                        >
                          <Icon className="h-3.5 w-3.5" style={{ color }} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-white truncate">{result.title}</p>
                          {result.subtitle && (
                            <p className="text-[10px] text-[#94A3B8]/50 truncate">{result.subtitle}</p>
                          )}
                        </div>
                        <ArrowRight
                          className="h-3 w-3 shrink-0 transition-opacity duration-100"
                          style={{
                            color: '#94A3B8',
                            opacity: selectedIndex === currentIndex ? 0.5 : 0,
                          }}
                        />
                      </button>
                    )
                  })}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

/**
 * SearchTrigger - the input shown in navbar that opens the search dialog
 */
export function SearchTrigger() {
  return (
    <button
      onClick={() => {
        document.dispatchEvent(new KeyboardEvent('keydown', { key: 'k', metaKey: true }))
      }}
      className="relative hidden md:flex items-center gap-2 w-[240px] h-9 rounded-xl px-3.5 text-left transition-colors duration-200 hover:bg-white/[0.06]"
      style={{
        background: 'rgba(255, 255, 255, 0.04)',
        border: '1px solid rgba(255, 255, 255, 0.06)',
      }}
    >
      <Search className="h-3.5 w-3.5 text-[#94A3B8]/50" />
      <span className="flex-1 text-[13px] text-[#94A3B8]/40">Buscar...</span>
      <kbd
        className="flex items-center gap-0.5 rounded px-1.5 h-5 text-[9px] font-medium text-[#94A3B8]/30"
        style={{ background: 'rgba(255, 255, 255, 0.04)', border: '1px solid rgba(255, 255, 255, 0.06)' }}
      >
        ⌘K
      </kbd>
    </button>
  )
}
