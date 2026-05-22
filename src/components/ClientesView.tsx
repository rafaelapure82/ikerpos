import React, { useState } from 'react';
import { useStore } from '../store.js';
import { Users, Plus, Search, Edit2, Trash2, X, Wallet, Mail, Phone, ChevronRight } from 'lucide-react';
import { Cliente } from '../types.js';

export default function ClientesView() {
  const { clientes, setAlert, fetchClientes, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  
  // Modal states
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = useState('');

  // Form states
  const [rif, setRif] = useState('');
  const [nombre, setNombre] = useState('');
  const [email, setEmail] = useState('');
  const [telefono, setTelefono] = useState('');
  const [deudaLimite, setDeudaLimite] = useState('0');

  const filtered = clientes.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    c.rif.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setMode('create');
    setTargetId('');
    setRif('');
    setNombre('');
    setEmail('');
    setTelefono('');
    setDeudaLimite('200');
    setIsOpen(true);
  };

  const openEdit = (c: Cliente) => {
    setMode('edit');
    setTargetId(c.id);
    setRif(c.rif);
    setNombre(c.nombre);
    setEmail(c.email || '');
    setTelefono(c.telefono || '');
    setDeudaLimite(c.deuda_limite.toString());
    setIsOpen(true);
  };

  const saveCliente = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rif || !nombre) {
      setAlert('Rif y Nombre son obligatorios', 'error');
      return;
    }

    const payload = {
      rif,
      nombre,
      email,
      telefono,
      deuda_limite: parseFloat(deudaLimite) || 0,
    };

    try {
      let r;
      if (mode === 'create') {
        r = await fetch('/api/clientes', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`/api/clientes/${targetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });
      }

      const resData = await r.json();
      if (!r.ok) {
        setAlert(resData.error || 'Fallo al guardar cliente', 'error');
      } else {
        setAlert(`Cliente ${mode === 'create' ? 'registrado' : 'modificado'} con éxito.`, 'success');
        setIsOpen(false);
        fetchClientes();
      }
    } catch {
      setAlert('Error de red al actualizar clientes', 'error');
    }
  };

  const deleteCliente = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de eliminar el cliente "${name}"? El deudor deudor se desligará.`)) return;

    try {
      const r = await fetch(`/api/clientes/${id}`, { method: 'DELETE' });
      if (r.ok) {
        setAlert('Cliente eliminado correctamente.', 'success');
        fetchClientes();
      } else {
        setAlert('Fallo al eliminar cliente', 'error');
      }
    } catch {
      setAlert('Error al intentar eliminar cliente', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Page headers */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight flex items-center gap-2">
            Control de Clientes PyME <Users className="text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Directorio de contacto fiscal, RIF y asignación de límites de crédito.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/10 cursor-pointer hover:from-teal-400 transition-all uppercase tracking-wider"
        >
          <Plus size={16} /> Agregar Cliente
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        
        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 self-center h-full" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Escribe el nombre del cliente o número fiscal (RIF) para filtrar..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-100 focus:outline-none focus:border-teal-500 transition-all"
          />
        </div>

        {/* Directory listings */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            👥 No existen clientes enlazados que correspondan al filtro.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filtered.map(c => (
              <div key={c.id} className="bg-[#0e1117]/60 border border-[#30363d] rounded-xl p-5 flex flex-col justify-between transition-all hover:border-[#30363d]/90">
                <div>
                  <div className="flex justify-between items-start gap-2 mb-2">
                    <div>
                      <h3 className="text-sm font-bold text-gray-100 uppercase tracking-tight">{c.nombre}</h3>
                      <span className="inline-block font-mono bg-[#21262d] py-0.5 px-2 rounded text-[10px] text-teal-400 font-semibold mt-1">
                        RIF: {c.rif}
                      </span>
                    </div>
                    
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => openEdit(c)}
                        className="p-1 px-1.5 bg-[#21262d] text-gray-400 hover:text-white rounded-lg border border-[#30363d] transition-all cursor-pointer"
                      >
                        <Edit2 size={12} />
                      </button>
                      {user?.rol === 'ADMIN' && (
                        <button
                          onClick={() => deleteCliente(c.id, c.nombre)}
                          className="p-1 px-1.5 bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg border border-red-500/20 transition-all cursor-pointer"
                        >
                          <Trash2 size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Micro list data */}
                  <div className="space-y-1.5 mt-4 text-xs text-gray-400">
                    <div className="flex items-center gap-2">
                      <Mail size={13} className="text-gray-500 shrink-0" />
                      <span className="truncate">{c.email || 'Sin correo asignado'}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Phone size={13} className="text-gray-500 shrink-0" />
                      <span>{c.telefono || 'Sin teléfono registrado'}</span>
                    </div>
                  </div>
                </div>

                {/* Credit Limits indicators */}
                <div className="mt-5 pt-4 border-t border-[#30363d]/50 flex items-center justify-between text-xs">
                  <span className="text-gray-500 uppercase font-semibold text-[10px] flex items-center gap-1.5">
                    <Wallet size={13} /> Límite de Crédito:
                  </span>
                  <span className="font-mono text-[#f1f6fc] font-bold">
                    ${c.deuda_limite.toFixed(2)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal CRUD sheet */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]/50">
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest">
                {mode === 'create' ? 'Agregar Cliente' : 'Ficha de Cliente'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveCliente} className="p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cédula o RIF Fiscal (Unico)</label>
                <input
                  type="text"
                  value={rif}
                  onChange={e => setRif(e.target.value)}
                  placeholder="Ej. V-23456789-0 / J-31298456-0"
                  disabled={mode === 'edit'}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 uppercase font-mono disabled:opacity-40"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Nombre Completo / Razón Social</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Inversiones Monterrey"
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Correo de Contacto</label>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    placeholder="correo@mail.com"
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    value={telefono}
                    onChange={e => setTelefono(e.target.value)}
                    placeholder="0412-1234567"
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Límite de Crédito Autorizado ($)</label>
                <input
                  type="number"
                  value={deudaLimite}
                  onChange={e => setDeudaLimite(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-[#f1f6fc] font-bold font-mono focus:outline-none focus:border-teal-500"
                />
                <span className="block text-[10px] text-gray-500 mt-1">Monto máximo acumulable para compras a crédito en el punto de ventas.</span>
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
