'use client'

import { useState, useEffect, useCallback, useMemo, Suspense } from 'react'
import { useSearchParams } from 'next/navigation'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import {
  Loader2, Search, Package, UserCircle, Bot, Trash2, ToggleLeft, ToggleRight,
} from 'lucide-react'
import { toast } from 'sonner'

interface AdminProduct {
  id: string
  name: string
  description: string
  price_unit: number
  currency: string
  is_active: boolean
  created_at: string
  bots: {
    name: string
    tenants: {
      name: string
      profiles: {
        full_name: string
        email: string
        id?: string
      }
    }
  } | null
}

function AdminProductsContent() {
  const searchParams = useSearchParams()
  const userFilter = searchParams.get('user')

  const [products, setProducts] = useState<AdminProduct[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<string>('all')
  const [actionLoading, setActionLoading] = useState<string | null>(null)

  const fetchProducts = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/products')
      if (res.ok) {
        setProducts(await res.json())
      }
    } catch {
      /* silent */
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    fetchProducts()
  }, [fetchProducts])

  const filteredProducts = useMemo(() => {
    let result = products

    // Filter by user from URL params
    if (userFilter) {
      result = result.filter(
        (p) => p.bots?.tenants?.profiles?.id === userFilter ||
               p.bots?.tenants?.profiles?.email === userFilter
      )
    }

    // Filter by search term (product name or owner name/email)
    if (search.trim()) {
      const q = search.toLowerCase()
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(q) ||
          (p.bots?.tenants?.profiles?.full_name || '').toLowerCase().includes(q) ||
          (p.bots?.tenants?.profiles?.email || '').toLowerCase().includes(q)
      )
    }

    // Filter by status
    if (statusFilter === 'active') {
      result = result.filter((p) => p.is_active)
    } else if (statusFilter === 'inactive') {
      result = result.filter((p) => !p.is_active)
    }

    return result
  }, [products, search, statusFilter, userFilter])

  const handleToggle = async (product: AdminProduct) => {
    setActionLoading(product.id)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !product.is_active }),
      })
      if (res.ok) {
        toast.success(product.is_active ? 'Producto desactivado' : 'Producto activado')
        fetchProducts()
      } else {
        toast.error('Error al cambiar estado')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setActionLoading(null)
    }
  }

  const handleDelete = async (product: AdminProduct) => {
    if (!confirm(`¿Eliminar "${product.name}"? Esta accion no se puede deshacer.`)) return
    setActionLoading(product.id)
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, { method: 'DELETE' })
      if (res.ok) {
        toast.success('Producto eliminado')
        fetchProducts()
      } else {
        toast.error('Error al eliminar')
      }
    } catch {
      toast.error('Error de conexion')
    } finally {
      setActionLoading(null)
    }
  }

  const formatCurrency = (amount: number, currency: string) => {
    return new Intl.NumberFormat('es-MX', {
      style: 'currency',
      currency: currency || 'MXN',
    }).format(amount)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-8 space-y-8">
        {/* HEADER */}
        <div className="flex items-center gap-4">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-gradient-to-br from-pink-500/20 to-rose-500/20 border border-pink-500/20">
            <Package className="h-6 w-6 text-pink-400" />
          </div>
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-foreground">Productos</h1>
            <p className="text-sm text-muted-foreground">
              Todos los productos de la plataforma
              <span className="ml-2 inline-flex items-center rounded-full bg-muted px-2.5 py-0.5 text-xs font-medium text-muted-foreground">
                {filteredProducts.length} de {products.length}
              </span>
            </p>
          </div>
        </div>

        {/* FILTERS BAR */}
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nombre o propietario..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 bg-secondary/50 border-border/50 focus:border-primary/50"
            />
          </div>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v || 'all')}>
            <SelectTrigger className="w-full sm:w-48 bg-secondary/50 border-border/50">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todos</SelectItem>
              <SelectItem value="active">Activos</SelectItem>
              <SelectItem value="inactive">Inactivos</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* TABLE */}
        <Card className="bg-gradient-to-b from-card to-card/80 border-border/50 shadow-xl shadow-black/5">
          <CardContent className="p-0">
            {loading ? (
              <div className="flex flex-col items-center justify-center py-20 gap-3">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-sm text-muted-foreground">Cargando productos...</p>
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow className="border-border/50 hover:bg-transparent bg-muted/30">
                      <TableHead className="text-muted-foreground font-semibold">Producto</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Precio</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Bot</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Propietario</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Estado</TableHead>
                      <TableHead className="text-muted-foreground font-semibold">Creado</TableHead>
                      <TableHead className="text-muted-foreground font-semibold text-right">Acciones</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredProducts.map((p) => (
                      <TableRow
                        key={p.id}
                        className="border-border/50 hover:bg-secondary/40 transition-colors"
                      >
                        <TableCell>
                          <div className="max-w-[200px]">
                            <span className="font-medium text-foreground text-sm block truncate">
                              {p.name}
                            </span>
                            <span className="text-xs text-muted-foreground line-clamp-1">
                              {p.description || 'Sin descripcion'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm font-semibold text-foreground">
                            {formatCurrency(p.price_unit, p.currency)}
                          </span>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            <Bot className="h-3.5 w-3.5 text-cyan-400 shrink-0" />
                            <span className="text-sm text-muted-foreground truncate max-w-[120px]">
                              {p.bots?.name || '—'}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <UserCircle className="h-4 w-4 text-primary shrink-0" />
                            <div className="min-w-0">
                              <span className="text-sm text-foreground block truncate">
                                {p.bots?.tenants?.profiles?.full_name || '—'}
                              </span>
                              <span className="text-xs text-muted-foreground block truncate">
                                {p.bots?.tenants?.profiles?.email || ''}
                              </span>
                            </div>
                          </div>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant="outline"
                            className={
                              p.is_active
                                ? 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30'
                                : 'bg-red-500/15 text-red-400 border-red-500/30'
                            }
                          >
                            {p.is_active ? 'Activo' : 'Inactivo'}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <span className="text-xs text-muted-foreground whitespace-nowrap">
                            {new Date(p.created_at).toLocaleDateString('es-MX', {
                              year: 'numeric',
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex items-center justify-end gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleToggle(p)}
                              disabled={actionLoading === p.id}
                              title={p.is_active ? 'Desactivar' : 'Activar'}
                              className={
                                p.is_active
                                  ? 'text-yellow-400 hover:text-yellow-300 hover:bg-yellow-500/10'
                                  : 'text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10'
                              }
                            >
                              {actionLoading === p.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : p.is_active ? (
                                <ToggleRight className="h-4 w-4" />
                              ) : (
                                <ToggleLeft className="h-4 w-4" />
                              )}
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(p)}
                              disabled={actionLoading === p.id}
                              title="Eliminar"
                              className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                    {filteredProducts.length === 0 && !loading && (
                      <TableRow>
                        <TableCell colSpan={7} className="text-center py-16">
                          <div className="flex flex-col items-center gap-3">
                            <Package className="h-10 w-10 text-muted-foreground/40" />
                            <div>
                              <p className="text-sm font-medium text-muted-foreground">
                                No se encontraron productos
                              </p>
                              <p className="text-xs text-muted-foreground/60 mt-1">
                                Intenta con otros filtros de busqueda
                              </p>
                            </div>
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

export default function AdminProductsPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    }>
      <AdminProductsContent />
    </Suspense>
  )
}
