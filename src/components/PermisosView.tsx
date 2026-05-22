import React, { useEffect, useState } from 'react';
import { useStore } from '../store.js';
import { Shield, ToggleLeft, ToggleRight, RotateCcw, ShieldCheck, ShieldX } from 'lucide-react';
import { PERMISOS } from '../permisos.js';

interface RolePermisos {
  rol: string;
  permisos: string[];
}

interface PermisoDef {
  grupo: string;
  permisos: { key: string; label: string }[];
}

export default function PermisosView() {
  const { setAlert } = useStore();
  const [rolePermisos, setRolePermisos] = useState<RolePermisos[]>([]);
  const [definiciones, setDefiniciones] = useState<PermisoDef[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const token = useStore.getState().user?.token;
      const [defRes, rolesRes] = await Promise.all([
        fetch('/api/permisos/definiciones', { headers: { 'Authorization': `Bearer ${token}` } }),
        fetch('/api/permisos/roles', { headers: { 'Authorization': `Bearer ${token}` } }),
      ]);
      if (defRes.ok) setDefiniciones(await defRes.json());
      if (rolesRes.ok) setRolePermisos(await rolesRes.json());
    } catch {
      setAlert('Error al cargar permisos', 'error');
    } finally {
      setLoading(false);
    }
  };

  const getPermisosForRol = (rol: string): string[] => {
    return rolePermisos.find(r => r.rol === rol)?.permisos || [];
  };

  const hasPermiso = (rol: string, permiso: string): boolean => {
    return getPermisosForRol(rol).includes(permiso);
  };

  const togglePermiso = async (rol: string, permiso: string) => {
    const current = getPermisosForRol(rol);
    const updated = current.includes(permiso)
      ? current.filter(p => p !== permiso)
      : [...current, permiso];

    setRolePermisos(prev =>
      prev.map(r => r.rol === rol ? { ...r, permisos: updated } : r)
    );
  };

  const handleSave = async (rol: string) => {
    setSaving(rol);
    try {
      const token = useStore.getState().user?.token;
      const permisos = getPermisosForRol(rol);
      const res = await fetch(`/api/permisos/roles/${rol}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({ permisos }),
      });

      if (!res.ok) {
        const err = await res.json();
        setAlert(err.error || 'Error al guardar permisos', 'error');
      } else {
        setAlert(`Permisos de ${rol} actualizados`, 'success');
      }
    } catch {
      setAlert('Error de red', 'error');
    } finally {
      setSaving(null);
    }
  };

  const restoreDefaults = async () => {
    try {
      const token = useStore.getState().user?.token;
      const res = await fetch('/api/permisos/seed', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${token}` },
      });
      if (res.ok) {
        setAlert('Permisos por defecto restaurados', 'success');
        loadData();
      } else {
        const err = await res.json();
        setAlert(err.error || 'Error', 'error');
      }
    } catch {
      setAlert('Error de red', 'error');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="animate-spin h-8 w-8 border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  const roles = ['ADMIN', 'VENDEDOR', 'COMPRAS'];
  const rolColors: Record<string, string> = {
    ADMIN: 'bg-purple-50 border-purple-200',
    VENDEDOR: 'bg-blue-50 border-blue-200',
    COMPRAS: 'bg-amber-50 border-amber-200',
  };
  const rolHeaderColors: Record<string, string> = {
    ADMIN: 'bg-purple-600',
    VENDEDOR: 'bg-blue-600',
    COMPRAS: 'bg-amber-600',
  };
  const rolLabels: Record<string, string> = {
    ADMIN: 'Administrador',
    VENDEDOR: 'Vendedor / Cajero',
    COMPRAS: 'Compras / Inventario',
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-black text-slate-800 flex items-center gap-2">
            <Shield size={22} className="text-blue-600" />
            Roles y Permisos
          </h1>
          <p className="text-xs text-slate-400 font-semibold mt-1">Configura qué acciones puede realizar cada rol</p>
        </div>
        <button
          onClick={restoreDefaults}
          className="bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-bold uppercase py-2.5 px-4 rounded-xl flex items-center gap-2 transition-all cursor-pointer border border-slate-200"
        >
          <RotateCcw size={14} />
          Restaurar Defaults
        </button>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {roles.map(rol => (
          <div key={rol} className={`rounded-2xl border overflow-hidden shadow-sm ${rolColors[rol] || 'bg-white border-slate-200'}`}>
            <div className={`${rolHeaderColors[rol]} px-4 py-3 flex items-center justify-between`}>
              <div className="flex items-center gap-2">
                <ShieldCheck size={16} className="text-white" />
                <span className="text-white font-black text-sm uppercase">{rol}</span>
              </div>
              <span className="text-white/70 text-[10px] font-bold">{rolLabels[rol]}</span>
            </div>

            <div className="p-4 space-y-4">
              {definiciones.map(grupo => (
                <div key={grupo.grupo}>
                  <h4 className="text-[10px] font-extrabold uppercase text-slate-400 tracking-wider mb-2 border-b border-slate-200 pb-1">
                    {grupo.grupo}
                  </h4>
                  <div className="space-y-1.5">
                    {grupo.permisos.map(p => {
                      const permisoVal = PERMISOS[p.key as keyof typeof PERMISOS];
                      const activo = hasPermiso(rol, permisoVal);
                      return (
                        <label
                          key={p.key}
                          onClick={() => togglePermiso(rol, permisoVal)}
                          className={`flex items-center justify-between py-1.5 px-2 rounded-lg cursor-pointer transition-all text-xs ${
                            activo ? 'bg-white/80 text-slate-700' : 'text-slate-400 hover:text-slate-500'
                          }`}
                        >
                          <span className="font-semibold">{p.label}</span>
                          <div className="flex items-center gap-2">
                            {activo ? (
                              <ToggleRight size={20} className="text-emerald-500" />
                            ) : (
                              <ToggleLeft size={20} className="text-slate-300" />
                            )}
                          </div>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            <div className="px-4 pb-4">
              <button
                onClick={() => handleSave(rol)}
                disabled={saving === rol}
                className="w-full bg-white hover:bg-slate-50 text-slate-700 font-bold py-2.5 px-4 rounded-xl text-xs uppercase transition-all border border-slate-200 shadow-sm cursor-pointer disabled:opacity-50"
              >
                {saving === rol ? 'Guardando...' : `Guardar Permisos de ${rol}`}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
