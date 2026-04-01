'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Store, Search, Loader2, RefreshCw, Package, ShoppingCart,
  ExternalLink, Globe,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

interface AdminStore {
  id: string
  name: string
  slug: string
  description?: string
  status?: string
  is_active?: boolean
  created_at: string
  owner_name: string
  owner_email: string
  products_count: number
  orders_count: number
  logo_url?: string
  whatsapp_number?: string
}

export default function AdminStoresPage() {
  const [stores, setStores] = useState<AdminStore[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  const fetchStores = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/stores')
      if (res.ok) setStores(await res.json())
    } catch {
      // silent
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchStores()
  }, [fetchStores])

  const filtered = useMemo(() => {
    if (!search.trim()) return stores
    const q = search.toLowerCase()
    return stores.filter(s =>
      s.name.toLowerCase().includes(q) ||
      s.slug.toLowerCase().includes(q) ||
      s.owner_name.toLowerCase().includes(q) ||
      s.owner_email.toLowerCase().includes(q)
    )
  }, [stores, search])

  return (
    <div className="min-h-screen bg-background">
      <div className="p-6 space-y-6 max-w-[1400px] mx-auto">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-cyan-500/20">
              <Store className="h-6 w-6 text-cyan-400" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-foreground tracking-tight">
                Tiendas Virtuales
              </h1>
              <p className="text-sm text-muted-foreground">
                {stores.length} tienda{stores.length !== 1 ? 's' : ''} registrada{stores.length !== 1 ? 's' : ''}
              </p>
            </div>
          </div>
          <Button variant="outline" size="icon" onClick={() => { setLoading(true); fetchStores() }}>
            <RefreshCw className="h-4 w-4" />
          </Button>
        </div>

        {/* Search */}
        <Card className="bg-gradient-card border-border/50">
          <CardContent className="p-4">
            <div className="relative max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar por tienda, slug o propietario..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardContent>
        </Card>

        {/* Table */}
        <Card className="glow-card bg-gradient-card border-border/50">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex items-center justify-center py-20">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent">
                      <TableHead className="text-muted-foreground">Tienda</TableHead>
                      <TableHead className="text-muted-foreground">Propietario</TableHead>
                      <TableHead className="text-muted-foreground text-center">Productos</TableHead>
                      <TableHead className="text-muted-foreground text-center">Pedidos</TableHead>
                      <TableHead className="text-muted-foreground">Estado</TableHead>
                      <TableHead className="text-muted-foreground">Creada</TableHead>
                      <TableHead className="text-muted-foreground text-right">Link</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filtered.map((store) => (
                      <TableRow key={store.id} className="border-border/50 hover:bg-secondary/30">
                        <TableCell>
                          <div className="flex items-center gap-3">
                            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-cyan-500/10 shrink-0">
                              {store.logo_url ? (
                                <img src={store.logo_url} alt="" className="h-9 w-9 rounded-lg object-cover" />
                              ) : (
                                <Store className="h-4 w-4 text-cyan-400" />
                              )}
                            </div>
                            <div className="min-w-0">
                              <span className="font-medium text-foreground text-sm block truncate">
                                {store.name}
                              </span>
                              <span className="text-xs text-muted-foreground truncate block">
                                /{store.slug}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="min-w-0">
                            <span className="text-sm text-foreground block truncate">{store.owner_name}</span>
                            <span className="text-xs text-muted-foreground block truncate">{store.owner_email}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <Package className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{store.products_count}</span>
                          </div>
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <ShoppingCart className="h-3.5 w-3.5 text-muted-foreground" />
                            <span className="text-sm font-medium text-foreground">{store.orders_count}</span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge variant="outline" className={
                            store.is_active !== false
                              ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                              : 'bg-red-500/15 text-red-400 border-red-500/30'
                          }>
                            {store.is_active !== false ? 'Activa' : 'Inactiva'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground">
                            {new Date(store.created_at).toLocaleDateString('es-MX', {
                              day: 'numeric', month: 'short', year: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <a
                            href={`/tienda/${store.slug}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
                          >
                            <Globe className="h-3.5 w-3.5" />
                            Ver
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filtered.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <Store className="h-10 w-10 text-muted-foreground/30" />
                            <p className="text-sm text-muted-foreground">
                              {search ? 'No se encontraron tiendas' : 'No hay tiendas registradas'}
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
