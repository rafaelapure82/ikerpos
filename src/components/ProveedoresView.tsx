import React, { useState } from 'react';
import { useStore } from '../store.js';
import { Truck, Plus, Search, Edit2, Trash2, X, Phone, UserCheck } from 'lucide-react';
import { Proveedor } from '../types.js';

export default function ProveedoresView() {
  const { proveedores, setAlert, fetchProveedores, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal state
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = useState('');

  // Form states
  const [rif, setRif] = useState('');
  const [empresa, setEmpresa] = useState('');
  const [contacto, setContacto] = useState('');

  const filtered = proveedores.filter(p => 
    p.empresa.toLowerCase().includes(searchQuery.toLowerCase()) || 
    p.rif.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setMode('create');
    setTargetId('');
    setRif('');
    setEmpresa('');
    setContacto('');
    setIsOpen(true);
  };

  const openEdit = (p: Proveedor) => {
    setMode('edit');
    setTargetId(p.id);
    setRif(p.rif);
    setEmpresa(p.empresa);
    setContacto(p.contacto || '');
    setIsOpen(true);
  };

  const saveProveedor = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rif || !empresa) {
      setAlert('Rif y Razón Social son obligatorios', 'error');
      return;
    }

    const payload = { rif, empresa, contacto };

    try {
      let r;
      if (mode === 'create') {
        r = await fetch('/api/proveedores', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`/api/proveedores/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      if (!r.ok) {
        const d = await r.json();
        setAlert(d.error || 'Fallo al procesar el proveedor', 'error');
      } else {
        setAlert(`Proveedor ${mode === 'create' ? 'registrado' : 'actualizado'} con éxito.`, 'success');
        setIsOpen(false);
        fetchProveedores();
      }
    } catch {
      setAlert('Error de red al sincronizar proveedores', 'error');
    }
  };

  const deleteProveedor = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de quitar el proveedor "${name}"?`)) return;

    try {
      const r = await fetch(`/api/proveedores/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setAlert('Proveedor removido de los registros.', 'success');
        fetchProveedores();
      } else {
        setAlert('Fallo al remover proveedor', 'error');
      }
    } catch {
      setAlert('Error de conexión', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight flex items-center gap-2">
            Proveedores ERP <Truck className="text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Directorio de abastecimiento de materias primas o inventarios.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/10 cursor-pointer hover:from-teal-400 transition-all uppercase tracking-wider"
        >
          <Plus size={16} /> Registrar Proveedor
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        
        <div className="relative mb-6">
          <Search className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 self-center h-full" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Filtra por empresa o RIF de proveedor..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-100 focus:outline-none focus:border-teal-500 transition-all"
          />
        </div>

        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            🚚 No se listan proveedores en sintonía con la búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(p => (
              <div key={p.id} className="bg-[#0e1117]/60 border border-[#30363d] rounded-xl p-5 flex flex-col justify-between transition-all hover:border-[#30363d]/90">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-100 uppercase tracking-tight">{p.empresa}</h3>
                      <span className="inline-block font-mono bg-[#21262d] py-0.5 px-2 rounded text-[10px] text-teal-400 font-semibold mt-1">
                        RIF: {p.rif}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(p)}
                        className="p-1 px-1.5 bg-[#21262d] text-gray-400 hover:text-white rounded-lg border border-[#30363d] cursor-pointer"
                      >
                        <Edit2 size={12} />
                      </button>
                      {user?.rol === 'ADMIN' && (
                        <button
                          onClick={() => deleteProveedor(p.id, p.empresa)}
                          className="p-1 px-1.5 bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex items-center gap-2 text-xs text-gray-400">
                    <UserCheck size={13} className="text-gray-500 shrink-0" />
                    <span>Contacto: <span className="text-gray-200 font-semibold">{p.contacto || 'Sin contacto directo'}</span></span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* CRUD Modal dialog */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]/50">
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest">
                {mode === 'create' ? 'Agregar Proveedor' : 'Ficha de Proveedor'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveProveedor} className="p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">RIF de Empresa (Contacto)</label>
                <input
                  type="text"
                  value={rif}
                  onChange={e => setRif(e.target.value)}
                  placeholder="Ej. J-12345678-9"
                  disabled={mode === 'edit'}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 uppercase font-mono disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Empresa / Razón Social</label>
                <input
                  type="text"
                  value={empresa}
                  onChange={e => setEmpresa(e.target.value)}
                  placeholder="Ej. Alimentos Polar Comercial, C.A."
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Nombre de Contacto / Vendedor asignado</label>
                <input
                  type="text"
                  value={contacto}
                  onChange={e => setContacto(e.target.value)}
                  placeholder="Ej. Carlos Mendoza"
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold rounded-xl text-xs uppercase"
                >
                  Guardar Ficha
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
