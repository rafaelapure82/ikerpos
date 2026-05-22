import React, { useState } from 'react';
import { useStore } from '../store.js';
import { User, Shield, UserPlus, Pencil, Trash2, KeyRound, X, Check, AlertCircle } from 'lucide-react';

type RolType = 'ADMIN' | 'VENDEDOR' | 'COMPRAS';

interface UserForm {
  username: string;
  nombre: string;
  password: string;
  rol: RolType;
}

const emptyForm: UserForm = { username: '', nombre: '', password: '', rol: 'VENDEDOR' };

export default function UsuariosView() {
  const { usuarios, fetchUsuarios, setAlert } = useStore();

  const [showModal, setShowModal] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<UserForm>(emptyForm);
  const [saving, setSaving] = useState(false);

  const [passwordModal, setPasswordModal] = useState<{ id: string; nombre: string } | null>(null);
  const [newPassword, setNewPassword] = useState('');
  const [savingPassword, setSavingPassword] = useState(false);

  const openCreate = () => {
    setForm(emptyForm);
    setEditingId(null);
    setShowModal(true);
  };

  const openEdit = (u: typeof usuarios[0]) => {
    setForm({ username: u.username, nombre: u.nombre, password: '', rol: u.rol as RolType });
    setEditingId(u.id);
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.nombre || !form.username || (!editingId && !form.password) || !form.rol) {
      setAlert('Completa todos los campos requeridos', 'error');
      return;
    }
    setSaving(true);
    try {
      const token = useStore.getState().user?.token;
      const url = editingId ? `/api/usuarios/${editingId}` : '/api/usuarios';
      const method = editingId ? 'PUT' : 'POST';
      const body: any = { nombre: form.nombre, username: form.username, rol: form.rol };
      if (form.password) body.password = form.password;

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify(body),
      });

      if (!res.ok) {
        const err = await res.json();
        setAlert(err.error || 'Error al guardar usuario', 'error');
      } else {
        setAlert(editingId ? 'Usuario actualizado correctamente' : 'Usuario creado correctamente', 'success');
        setShowModal(false);
        fetchUsuarios();
      }
    } catch {
      setAlert('Error de red al guardar usuario', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (u: typeof usuarios[0]) => {
    try {
      const token = useStore.getState().user?.token;
      const res = await fetch(`/api/usuarios/${u.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ activo: !u.activo }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAlert(err.error || 'Error al cambiar estado', 'error');
      } else {
        setAlert(u.activo ? 'Usuario desactivado' : 'Usuario activado', 'success');
        fetchUsuarios();
      }
    } catch {
      setAlert('Error de red', 'error');
    }
  };

  const handlePasswordReset = async () => {
    if (!passwordModal || !newPassword || newPassword.length < 4) {
      setAlert('La contraseña debe tener al menos 4 caracteres', 'error');
      return;
    }
    setSavingPassword(true);
    try {
      const token = useStore.getState().user?.token;
      const res = await fetch(`/api/usuarios/${passwordModal.id}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ password: newPassword }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAlert(err.error || 'Error al cambiar contraseña', 'error');
      } else {
        setAlert('Contraseña actualizada correctamente', 'success');
        setPasswordModal(null);
        setNewPassword('');
      }
    } catch {
      setAlert('Error de red', 'error');
    } finally {
      setSavingPassword(false);
    }
  };

  const rolColors: Record<RolType, string> = {
    ADMIN: 'bg-purple-100 text-purple-700 border-purple-200',
    VENDEDOR: 'bg-blue-100 text-blue-700 border-blue-200',
    COMPRAS: 'bg-amber-100 text-amber-700 border-amber-200',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield size={22} className="text-blue-600" />
            Usuarios y Roles
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Gestión de accesos y permisos del sistema</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold uppercase py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer shadow-sm"
        >
          <UserPlus size={15} />
          Nuevo Usuario
        </button>
      </div>

      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold uppercase tracking-wider">
                <th className="text-left py-3.5 px-4">Nombre</th>
                <th className="text-left py-3.5 px-4">Usuario</th>
                <th className="text-left py-3.5 px-4">Rol</th>
                <th className="text-left py-3.5 px-4">Estado</th>
                <th className="text-right py-3.5 px-4">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {usuarios.map(u => (
                <tr key={u.id} className="hover:bg-slate-50/50 transition-colors">
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <div className="h-8 w-8 rounded-lg bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-500 font-black text-xs">
                        {u.nombre.slice(0, 2).toUpperCase()}
                      </div>
                      <span className="font-bold text-slate-700">{u.nombre}</span>
                    </div>
                  </td>
                  <td className="py-3.5 px-4 font-mono text-slate-500">@{u.username}</td>
                  <td className="py-3.5 px-4">
                    <span className={`inline-block text-[10px] font-extrabold uppercase px-2.5 py-1 rounded-lg border ${rolColors[u.rol as RolType] || ''}`}>
                      {u.rol}
                    </span>
                  </td>
                  <td className="py-3.5 px-4">
                    {u.activo !== false ? (
                      <span className="inline-flex items-center gap-1 text-emerald-600 font-bold text-[10px] uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                        Activo
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-red-500 font-bold text-[10px] uppercase">
                        <span className="h-1.5 w-1.5 rounded-full bg-red-500" />
                        Inactivo
                      </span>
                    )}
                  </td>
                  <td className="py-3.5 px-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => openEdit(u)}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-blue-600 transition-all cursor-pointer"
                        title="Editar"
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => setPasswordModal({ id: u.id, nombre: u.nombre })}
                        className="p-2 hover:bg-slate-100 rounded-lg text-slate-400 hover:text-amber-600 transition-all cursor-pointer"
                        title="Cambiar contraseña"
                      >
                        <KeyRound size={14} />
                      </button>
                      <button
                        onClick={() => handleToggleActive(u)}
                        className={`p-2 hover:bg-slate-100 rounded-lg transition-all cursor-pointer ${
                          u.activo !== false ? 'text-slate-400 hover:text-red-600' : 'text-slate-400 hover:text-emerald-600'
                        }`}
                        title={u.activo !== false ? 'Desactivar' : 'Activar'}
                      >
                        {u.activo !== false ? <Trash2 size={14} /> : <Check size={14} />}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr>
                  <td colSpan={5} className="text-center py-12 text-slate-400 text-xs font-semibold">
                    <User size={32} className="mx-auto mb-2 opacity-50" />
                    No hay usuarios registrados
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button onClick={() => setShowModal(false)} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={18} />
            </button>
            <h2 className="text-base font-black text-slate-800 mb-6 flex items-center gap-2">
              {editingId ? <Pencil size={18} /> : <UserPlus size={18} />}
              {editingId ? 'Editar Usuario' : 'Nuevo Usuario'}
            </h2>
            <div className="space-y-4">
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre completo</label>
                <input
                  type="text"
                  value={form.nombre}
                  onChange={e => setForm({ ...form, nombre: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  placeholder="Ej. María Pérez"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nombre de usuario</label>
                <input
                  type="text"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  placeholder="Ej. mperez"
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">
                  Contraseña {editingId ? '(dejar vacío para mantener)' : ''}
                </label>
                <input
                  type="password"
                  value={form.password}
                  onChange={e => setForm({ ...form, password: e.target.value })}
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                  placeholder={editingId ? 'Nueva contraseña (opcional)' : 'Contraseña'}
                />
              </div>
              <div>
                <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Rol</label>
                <select
                  value={form.rol}
                  onChange={e => setForm({ ...form, rol: e.target.value as RolType })}
                  className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                >
                  <option value="VENDEDOR">VENDEDOR - Cajero / Ventas</option>
                  <option value="COMPRAS">COMPRAS - Gestión de inventario</option>
                  <option value="ADMIN">ADMIN - Acceso completo</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowModal(false)}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                {saving ? 'Guardando...' : editingId ? 'Actualizar' : 'Crear Usuario'}
              </button>
            </div>
          </div>
        </div>
      )}

      {passwordModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button onClick={() => { setPasswordModal(null); setNewPassword(''); }} className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer">
              <X size={18} />
            </button>
            <h2 className="text-base font-black text-slate-800 mb-2 flex items-center gap-2">
              <KeyRound size={18} />
              Cambiar Contraseña
            </h2>
            <p className="text-xs text-slate-400 font-semibold mb-6">
              Usuario: <span className="text-slate-700">{passwordModal.nombre}</span>
            </p>
            <div>
              <label className="block text-[11px] font-bold text-slate-500 uppercase tracking-wider mb-1.5">Nueva contraseña</label>
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                className="w-full border border-slate-200 rounded-xl py-2.5 px-3.5 text-sm font-semibold text-slate-700 focus:outline-none focus:border-blue-400 focus:ring-1 focus:ring-blue-400/30"
                placeholder="Mínimo 4 caracteres"
              />
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => { setPasswordModal(null); setNewPassword(''); }}
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all cursor-pointer"
              >
                Cancelar
              </button>
              <button
                onClick={handlePasswordReset}
                disabled={savingPassword}
                className="flex-1 bg-amber-600 hover:bg-amber-500 text-white font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all disabled:opacity-50 cursor-pointer"
              >
                {savingPassword ? 'Cambiando...' : 'Cambiar Contraseña'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
