import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { LayoutGrid, Plus, Search, Edit2, Trash2, X, Tag, Layers, AlertTriangle, FileText } from 'lucide-react';
import { Categoria } from '../types.js';

export default function CategoriasView() {
  const { categorias, fetchCategorias, setAlert, user } = useStore();
  const [searchQuery, setSearchQuery] = useState('');

  // Modal control states
  const [isOpen, setIsOpen] = useState(false);
  const [mode, setMode] = useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = useState('');

  // Form states
  const [nombre, setNombre] = useState('');
  const [descripcion, setDescripcion] = useState('');

  // Fetch categories on component mount if empty
  useEffect(() => {
    fetchCategorias();
  }, [fetchCategorias]);

  const filtered = categorias.filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    (c.descripcion || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  const openCreate = () => {
    setMode('create');
    setTargetId('');
    setNombre('');
    setDescripcion('');
    setIsOpen(true);
  };

  const openEdit = (c: Categoria) => {
    setMode('edit');
    setTargetId(c.id);
    setNombre(c.nombre);
    setDescripcion(c.descripcion || '');
    setIsOpen(true);
  };

  const saveCategoria = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nombre.trim()) {
      setAlert('El nombre de la categoría es obligatorio', 'error');
      return;
    }

    const payload = {
      nombre: nombre.trim(),
      descripcion: descripcion.trim()
    };

    try {
      let r;
      if (mode === 'create') {
        r = await fetch('/api/categorias', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify(payload),
        });
      } else {
        r = await fetch(`/api/categorias/${targetId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify(payload),
        });
      }

      const resData = await r.json();
      if (!r.ok) {
        setAlert(resData.error || 'Fallo al guardar la categoría', 'error');
      } else {
        setAlert(`Categoría "${payload.nombre}" ${mode === 'create' ? 'registrada' : 'modificada'} con éxito.`, 'success');
        setIsOpen(false);
        fetchCategorias();
      }
    } catch {
      setAlert('Error de red al actualizar la categoría', 'error');
    }
  };

  const deleteCategoria = async (c: Categoria) => {
    if (c.nombre === 'General') {
      setAlert('La categoría maestra "General" no puede ser eliminada del sistema.', 'error');
      return;
    }

    if (c.articuloCount && c.articuloCount > 0) {
      setAlert(`No se puede eliminar la categoría "${c.nombre}" porque tiene ${c.articuloCount} artículo(s) asociado(s). Reasígnelos antes de continuar.`, 'error');
      return;
    }

    if (!window.confirm(`¿Estás seguro de eliminar la categoría "${c.nombre}"?`)) return;

    try {
      const r = await fetch(`/api/categorias/${c.id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (r.ok) {
        setAlert(`Categoría "${c.nombre}" eliminada correctamente.`, 'success');
        fetchCategorias();
      } else {
        const d = await r.json();
        setAlert(d.error || 'Fallo al eliminar la categoría', 'error');
      }
    } catch {
      setAlert('Error al intentar eliminar la categoría', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight flex items-center gap-2">
            Módulo de Categorías <LayoutGrid className="text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Organización y segmentación de artículos del catálogo de ventas.</p>
        </div>
        <button
          onClick={openCreate}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-lg shadow-teal-500/10 cursor-pointer hover:from-teal-400 transition-all uppercase tracking-wider"
        >
          <Plus size={16} /> Crear Categoría
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        
        {/* Search Input */}
        <div className="relative mb-6">
          <Search className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 self-center h-full" size={16} />
          <input
            type="text"
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            placeholder="Buscar categorías por nombre o descripción..."
            className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-100 focus:outline-none focus:border-teal-500 transition-all"
          />
        </div>

        {/* Categories Grid */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            📦 No se encontraron categorías que correspondan a la búsqueda.
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filtered.map(c => {
              const hasArticles = c.articuloCount && c.articuloCount > 0;
              return (
                <div 
                  key={c.id} 
                  className={`bg-[#0e1117]/60 border rounded-2xl p-5 flex flex-col justify-between transition-all hover:border-[#30363d]/90 group ${
                    c.nombre === 'General' ? 'border-[#30363d]/80 bg-[#161b22]/40' : 'border-[#30363d]'
                  }`}
                >
                  <div>
                    {/* Header: Name and action triggers */}
                    <div className="flex justify-between items-start gap-2 mb-2">
                      <div className="flex items-center gap-2">
                        <div className="p-2 rounded-xl bg-teal-500/10 text-teal-400 shrink-0">
                          <Tag size={14} />
                        </div>
                        <div>
                          <h3 className="text-sm font-extrabold text-gray-150 uppercase tracking-tight flex items-center gap-1.5 capitalize">
                            {c.nombre}
                          </h3>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-1.5 opacity-80 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={() => openEdit(c)}
                          title="Editar categoría"
                          className="p-1.5 bg-[#21262d] text-gray-400 hover:text-white rounded-lg border border-[#30363d] transition-all cursor-pointer"
                        >
                          <Edit2 size={12} />
                        </button>
                        {c.nombre !== 'General' && (
                          <button
                            onClick={() => deleteCategoria(c)}
                            title={hasArticles ? "Esta categoría no se puede eliminar (tiene artículos)" : "Eliminar categoría"}
                            className={`p-1.5 rounded-lg border transition-all cursor-pointer ${
                              hasArticles
                                ? 'bg-gray-500/5 text-gray-600 border-gray-800 cursor-not-allowed'
                                : 'bg-red-500/10 text-red-400 hover:text-red-300 border-red-500/20 hover:bg-red-500/20'
                            }`}
                          >
                            <Trash2 size={12} />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Description text */}
                    <p className="text-xs text-gray-450 mt-3 font-normal leading-relaxed line-clamp-3">
                      {c.descripcion || 'Sin descripción especificada para este segmento.'}
                    </p>
                  </div>

                  {/* Footer metadata: Items count */}
                  <div className="mt-6 pt-4 border-t border-[#30363d]/50 flex items-center justify-between text-xs">
                    <span className="text-gray-500 uppercase font-bold text-[9px] flex items-center gap-1.5 tracking-wider">
                      <Layers size={13} className="text-gray-500" /> Segmento:
                    </span>
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold ${
                      hasArticles 
                        ? 'bg-teal-500/10 text-teal-400 border border-teal-500/20' 
                        : 'bg-gray-500/10 text-gray-500 border border-gray-800'
                    }`}>
                      {c.articuloCount || 0} {c.articuloCount === 1 ? 'Artículo' : 'Artículos'}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal CRUD sheet */}
      {isOpen && (
        <div className="fixed inset-0 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]/50">
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest flex items-center gap-1.5">
                <Tag size={15} className="text-teal-400" />
                {mode === 'create' ? 'Agregar Categoría' : 'Ficha de Categoría'}
              </h3>
              <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={saveCategoria} className="p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Nombre de Categoría (Único)</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Suministros, Limpieza, Tecnología"
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Descripción Breve</label>
                <textarea
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Escribe el propósito u organización de esta categoría..."
                  rows={4}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 leading-normal"
                />
              </div>

              {/* Warning when updating the name of an active category */}
              {mode === 'edit' && categorias.find(cat => cat.id === targetId)?.articuloCount ? (
                <div className="p-3.5 bg-amber-500/10 border border-amber-500/20 rounded-xl flex gap-3 text-[11px] text-amber-400">
                  <AlertTriangle size={18} className="shrink-0 mt-0.5" />
                  <p className="leading-relaxed">
                    <strong>¡Atención!</strong> Modificar el nombre de esta categoría propagará en cascada el nuevo nombre a todos los artículos asociados.
                  </p>
                </div>
              ) : null}

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-xl text-xs font-semibold hover:bg-[#30363d] transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold rounded-xl text-xs uppercase hover:from-teal-400 shadow-md transition-all cursor-pointer"
                >
                  {mode === 'create' ? 'Guardar Categoría' : 'Actualizar Categoría'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
