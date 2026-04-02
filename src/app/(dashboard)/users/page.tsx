'use client';

import { useState } from 'react';
import { useAuth } from '@/hooks/use-auth';
import { Navbar } from '@/components/layout/navbar';
import { PageHeader } from '@/components/shared/page-header';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Plus, Loader2, ShieldAlert, Pencil, Trash2, UserCircle } from 'lucide-react';
import { toast } from 'sonner';

interface User {
  id: string;
  name: string;
  email: string;
  role: 'admin' | 'user';
  status: 'active' | 'inactive';
}

const demoUsers: User[] = [
  {
    id: '1',
    name: 'Admin Principal',
    email: 'admin@ventas.com',
    role: 'admin',
    status: 'active',
  },
  {
    id: '2',
    name: 'Carlos Martinez',
    email: 'carlos@ventas.com',
    role: 'user',
    status: 'active',
  },
  {
    id: '3',
    name: 'Ana Lopez',
    email: 'ana@ventas.com',
    role: 'user',
    status: 'active',
  },
  {
    id: '4',
    name: 'Roberto Sanchez',
    email: 'roberto@ventas.com',
    role: 'user',
    status: 'inactive',
  },
];

const roleConfig: Record<string, { label: string; className: string }> = {
  admin: {
    label: 'Admin',
    className: 'bg-purple-500/15 text-purple-400 border-purple-500/30',
  },
  user: {
    label: 'Usuario',
    className: 'bg-violet-500/15 text-violet-400 border-violet-500/30',
  },
};

const statusConfig: Record<string, { label: string; className: string }> = {
  active: {
    label: 'Activo',
    className: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
  },
  inactive: {
    label: 'Inactivo',
    className: 'bg-red-500/15 text-red-400 border-red-500/30',
  },
};

export default function UsersPage() {
  const { isAdmin } = useAuth();

  const [users, setUsers] = useState<User[]>(demoUsers);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user');

  if (!isAdmin) {
    return (
      <>
        <Navbar title="Usuarios" />
        <div className="flex flex-col items-center justify-center min-h-[60vh] p-6">
          <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 mb-4">
            <ShieldAlert className="h-8 w-8 text-destructive" />
          </div>
          <h2 className="text-xl font-bold text-foreground mb-2">Acceso Restringido</h2>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            No tienes permisos para acceder a esta sección. Solo los administradores pueden gestionar usuarios.
          </p>
        </div>
      </>
    );
  }

  const handleCreateUser = async () => {
    if (!newName.trim() || !newEmail.trim() || !newPassword.trim()) {
      toast.error('Todos los campos son obligatorios');
      return;
    }
    setCreating(true);
    await new Promise((r) => setTimeout(r, 800));
    const newUser: User = {
      id: String(Date.now()),
      name: newName.trim(),
      email: newEmail.trim(),
      role: newRole,
      status: 'active',
    };
    setUsers((prev) => [...prev, newUser]);
    setNewName('');
    setNewEmail('');
    setNewPassword('');
    setNewRole('user');
    setDialogOpen(false);
    setCreating(false);
    toast.success('Usuario creado exitosamente');
  };

  const handleDeleteUser = async (id: string) => {
    setDeletingId(id);
    await new Promise((r) => setTimeout(r, 600));
    setUsers((prev) => prev.filter((u) => u.id !== id));
    setDeletingId(null);
    toast.success('Usuario eliminado');
  };

  return (
    <>
      <Navbar title="Usuarios" />

      <div className="p-4 md:p-6 space-y-4 md:space-y-6">
        <PageHeader
          title="Usuarios"
          description="Gestiona los usuarios que tienen acceso a la plataforma."
        >
          <Button onClick={() => setDialogOpen(true)}>
            <Plus className="mr-1.5 h-4 w-4" />
            Crear Usuario
          </Button>
        </PageHeader>

        <div className="rounded-xl border border-border/50 bg-gradient-card glow-card overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-border/50 hover:bg-transparent">
                <TableHead className="text-muted-foreground">Nombre</TableHead>
                <TableHead className="text-muted-foreground">Email</TableHead>
                <TableHead className="text-muted-foreground">Rol</TableHead>
                <TableHead className="text-muted-foreground">Estado</TableHead>
                <TableHead className="text-muted-foreground text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {users.map((user) => (
                <TableRow
                  key={user.id}
                  className="border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10">
                        <UserCircle className="h-4 w-4 text-primary" />
                      </div>
                      <span className="font-medium text-foreground">{user.name}</span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-muted-foreground">{user.email}</span>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={roleConfig[user.role]?.className}
                    >
                      {roleConfig[user.role]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Badge
                      variant="outline"
                      className={statusConfig[user.status]?.className}
                    >
                      {statusConfig[user.status]?.label}
                    </Badge>
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-muted-foreground hover:text-foreground"
                      >
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteUser(user.id)}
                        disabled={deletingId === user.id}
                        className="text-destructive hover:text-destructive"
                      >
                        {deletingId === user.id ? (
                          <Loader2 className="h-3.5 w-3.5 animate-spin" />
                        ) : (
                          <Trash2 className="h-3.5 w-3.5" />
                        )}
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </div>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Crear Nuevo Usuario</DialogTitle>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="user-name">Nombre</Label>
              <Input
                id="user-name"
                placeholder="Nombre completo"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-email">Email</Label>
              <Input
                id="user-email"
                type="email"
                placeholder="correo@ejemplo.com"
                value={newEmail}
                onChange={(e) => setNewEmail(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-password">Contraseña</Label>
              <Input
                id="user-password"
                type="password"
                placeholder="Minimo 8 caracteres"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="user-role">Rol</Label>
              <Select value={newRole} onValueChange={(v) => setNewRole(v as 'admin' | 'user')}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecciona un rol" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="user">Usuario</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setDialogOpen(false)}
              disabled={creating}
            >
              Cancelar
            </Button>
            <Button onClick={handleCreateUser} disabled={creating}>
              {creating && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
              Crear Usuario
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
