import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { 
  Package, Plus, Search, Trash2, Edit2, CheckCircle2, 
  X, AlertTriangle, RefreshCcw, Landmark, Layers, Calculator
} from 'lucide-react';
import { Articulo } from '../types.js';
import { calcularStockComboSimple } from '../useVentaStore.js';

export default function ArticulosView() {
  const { articulos, proveedores, fetchProveedores, setAlert, fetchArticulos, fetchStats, user, categorias, fetchCategorias } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('All');
  const [showLowStockOnly, setShowLowStockOnly] = useState(false);
  const [proveedorId, setProveedorId] = useState('');
  
  // Modal states for creating/editing articles
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [modalMode, setModalMode] = useState<'create' | 'edit'>('create');
  const [targetId, setTargetId] = useState('');
  
  // Form fields states
  const [codigo, setCodigo] = useState('');
  const [nombre, setNombre] = useState('');
  const [precioCosto, setPrecioCosto] = useState('0');
  const [precioVenta, setPrecioVenta] = useState('0');
  const [stock, setStock] = useState('0');
  const [stockMinimo, setStockMinimo] = useState('0');
  const [categoria, setCategoria] = useState('General');
  const [impuestoIva, setImpuestoIva] = useState('16');
  const [imagenUrl, setImagenUrl] = useState('');
  const [showNewCategoryInput, setShowNewCategoryInput] = useState(false);
  const [nuevaCategoria, setNuevaCategoria] = useState('');

  // Combo / Kit states
  const [esCombo, setEsCombo] = useState(false);
  const [componentes, setComponentes] = useState<any[]>([]); // { componenteId, cantidad, nombre, precio_venta, precio_costo }
  const [compSearchQuery, setCompSearchQuery] = useState('');
  const [compSelectedId, setCompSelectedId] = useState('');
  const [compCantidad, setCompCantidad] = useState('1');

  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setAlert('La imagen supera el límite de 2MB. Selecciona una más liviana.', 'error');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      if (typeof reader.result === 'string') {
        setImagenUrl(reader.result);
      }
    };
    reader.onerror = () => {
      setAlert('Error al leer el archivo de imagen.', 'error');
    };
    reader.readAsDataURL(file);
  };

  // Manual stock adjustment state
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);
  const [adjustArtId, setAdjustArtId] = useState('');
  const [adjustTipo, setAdjustTipo] = useState<'ENTRADA' | 'SALIDA'>('ENTRADA');
  const [adjustCantidad, setAdjustCantidad] = useState('0');
  const [adjustMotivo, setAdjustMotivo] = useState('');

  // Automatically load providers and categories list
  useEffect(() => {
    if (user) {
      if (proveedores.length === 0) {
        fetchProveedores();
      }
      if (categorias.length === 0) {
        fetchCategorias();
      }
    }
  }, [user, proveedores.length, fetchProveedores, categorias.length, fetchCategorias]);

  // Extract list of unique categories from master store list
  const uniqueCategories = ['All', ...categorias.map(c => c.nombre)];
  
  const dbCategories = categorias.map(c => c.nombre);
  if (!dbCategories.includes('General')) {
    dbCategories.unshift('General');
  }

  // Filters logic - including Low Stock Report toggle
  const filteredArticles = articulos.filter(art => {
    const matchesSearch = art.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          art.codigo.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = categoryFilter === 'All' || art.categoria === categoryFilter;
    const matchesLowStock = !showLowStockOnly || (art.stock <= art.stock_minimo);
    return matchesSearch && matchesCategory && matchesLowStock;
  });

  const openCreateModal = () => {
    setModalMode('create');
    setTargetId('');
    setCodigo('');
    setNombre('');
    setPrecioCosto('0');
    setPrecioVenta('0');
    setStock('0');
    setStockMinimo('0');
    setCategoria('General');
    setImpuestoIva('16');
    setProveedorId('');
    setImagenUrl('');
    setShowNewCategoryInput(false);
    setNuevaCategoria('');

    // Reset combo states
    setEsCombo(false);
    setComponentes([]);
    setCompSearchQuery('');
    setCompSelectedId('');
    setCompCantidad('1');

    setIsModalOpen(true);
  };

  const openEditModal = (art: Articulo) => {
    setModalMode('edit');
    setTargetId(art.id);
    setCodigo(art.codigo);
    setNombre(art.nombre);
    setPrecioCosto(art.precio_costo.toString());
    setPrecioVenta(art.precio_venta.toString());
    setStock(art.stock.toString());
    setStockMinimo(art.stock_minimo.toString());
    setCategoria(art.categoria);
    setImpuestoIva(art.impuesto_iva.toString());
    setProveedorId('');
    setImagenUrl(art.imagen_url || '');
    setShowNewCategoryInput(false);
    setNuevaCategoria('');

    // Initialize combo states
    setEsCombo(art.es_combo || false);
    const loadedComps = art.componentes?.map(c => ({
      componenteId: c.componenteId,
      cantidad: c.cantidad,
      nombre: c.componente?.nombre || 'Producto Desconocido',
      precio_venta: c.componente?.precio_venta || 0,
      precio_costo: c.componente?.precio_costo || 0
    })) || [];
    setComponentes(loadedComps);
    setCompSearchQuery('');
    setCompSelectedId('');
    setCompCantidad('1');

    setIsModalOpen(true);
  };

  // Combo Helpers
  const filteredComponentsForSelect = articulos.filter(art => {
    if (modalMode === 'edit' && art.id === targetId) return false;
    if (!compSearchQuery.trim()) return true;
    return art.nombre.toLowerCase().includes(compSearchQuery.toLowerCase()) || 
           art.codigo.toLowerCase().includes(compSearchQuery.toLowerCase());
  });

  const addComponent = () => {
    if (!compSelectedId) {
      setAlert('Selecciona un producto para añadir al combo', 'error');
      return;
    }
    const targetArt = articulos.find(a => a.id === compSelectedId);
    if (!targetArt) return;

    const qty = parseFloat(compCantidad);
    if (isNaN(qty) || qty <= 0) {
      setAlert('La cantidad debe ser mayor a cero', 'error');
      return;
    }

    const exists = componentes.some(c => c.componenteId === compSelectedId);
    if (exists) {
      setAlert('Este producto ya forma parte del combo', 'error');
      return;
    }

    setComponentes([
      ...componentes,
      {
        componenteId: compSelectedId,
        cantidad: qty,
        nombre: targetArt.nombre,
        precio_venta: targetArt.precio_venta,
        precio_costo: targetArt.precio_costo
      }
    ]);
    setCompSelectedId('');
    setCompSearchQuery('');
    setCompCantidad('1');
  };

  const removeComponent = (compId: string) => {
    setComponentes(componentes.filter(c => c.componenteId !== compId));
  };

  const calcularSugerido = () => {
    if (componentes.length === 0) {
      setAlert('Añade al menos un componente al combo para calcular el precio sugerido', 'error');
      return;
    }
    const totalCosto = componentes.reduce((sum, c) => sum + (c.precio_costo * c.cantidad), 0);
    const totalVenta = componentes.reduce((sum, c) => sum + (c.precio_venta * c.cantidad), 0);

    setPrecioCosto(totalCosto.toFixed(2));
    setPrecioVenta(totalVenta.toFixed(2));
    setAlert('Precios sugeridos calculados con éxito.', 'success');
  };

  const saveArticle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!codigo || !nombre) {
      setAlert('Por favor rellena el Código y Nombre', 'error');
      return;
    }

    const cost = parseFloat(precioCosto);
    const sale = parseFloat(precioVenta);
    const qty = parseFloat(stock);
    const minQty = parseFloat(stockMinimo);

    if (isNaN(cost) || cost <= 0) {
      setAlert('El Costo de Adquisición debe ser un número positivo mayor que cero', 'error');
      return;
    }
    if (isNaN(sale) || sale <= 0) {
      setAlert('El Precio Público de Venta debe ser un número positivo mayor que cero', 'error');
      return;
    }
    if (!esCombo && (isNaN(qty) || qty < 0)) {
      setAlert('El Stock Actual debe ser un número mayor o igual a cero', 'error');
      return;
    }
    if (!esCombo && (isNaN(minQty) || minQty < 0)) {
      setAlert('El Stock Mínimo de Alerta debe ser un número mayor o igual a cero', 'error');
      return;
    }

    let finalCategoria = categoria;
    if (showNewCategoryInput) {
      const cleanNewCat = nuevaCategoria.trim();
      if (!cleanNewCat) {
        setAlert('El nombre de la nueva categoría no puede estar vacío', 'error');
        return;
      }
      try {
        const catRes = await fetch('/api/categorias', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify({ nombre: cleanNewCat, descripcion: 'Creada en caliente desde la ficha de artículo.' })
        });
        
        if (!catRes.ok) {
          const catError = await catRes.json();
          if (catError.error && catError.error.includes('ya se encuentra registrada')) {
            finalCategoria = cleanNewCat;
          } else {
            setAlert(`No se pudo crear la nueva categoría: ${catError.error || 'Error desconocido'}`, 'error');
            return;
          }
        } else {
          finalCategoria = cleanNewCat;
          await fetchCategorias();
        }
      } catch (err) {
        setAlert('Error de red al intentar crear la categoría en caliente.', 'error');
        return;
      }
    }

    const payload = {
      codigo,
      nombre,
      precio_costo: cost,
      precio_venta: sale,
      stock: esCombo ? 0 : qty,
      stock_minimo: esCombo ? 0 : minQty,
      categoria: finalCategoria,
      impuesto_iva: parseFloat(impuestoIva),
      imagen_url: imagenUrl || null,
      es_combo: esCombo,
      componentes: esCombo ? componentes.map(c => ({
        componenteId: c.componenteId,
        cantidad: c.cantidad
      })) : []
    };

    try {
      let res;
      if (modalMode === 'create') {
        res = await fetch('/api/articulos', {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify(payload),
        });
      } else {
        res = await fetch(`/api/articulos/${targetId}`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${user?.token}`
          },
          body: JSON.stringify(payload),
        });
      }

      const resData = await res.json();
      if (!res.ok) {
        setAlert(resData.error || 'No se pudo guardar la información del artículo', 'error');
      } else {
        setAlert(`Artículo ${modalMode === 'create' ? 'creado' : 'actualizado'} con éxito.`, 'success');
        setIsModalOpen(false);
        fetchArticulos();
        fetchStats();
        fetchCategorias();
      }
    } catch (err) {
      setAlert('Error de conexión al procesar la petición.', 'error');
    }
  };

  const deleteArticle = async (id: string, name: string) => {
    if (!window.confirm(`¿Estás seguro de que deseas eliminar el artículo "${name}"? This action cannot be undone.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/articulos/${id}`, { 
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        setAlert('El artículo fue removido correctamente.', 'success');
        fetchArticulos();
        fetchStats();
        fetchCategorias();
      } else {
        const d = await res.json();
        setAlert(d.error || 'Fracasó la eliminación', 'error');
      }
    } catch (err) {
      setAlert('Error al comunicarse con la API de articulos', 'error');
    }
  };

  // Process manual adjustments (direct inventory audit)
  const openAdjustModal = (artId: string) => {
    setAdjustArtId(artId);
    setAdjustCantidad('1');
    setAdjustMotivo('Ajuste de inventario físico');
    setIsAdjustModalOpen(true);
  };

  const handleStockAdjustment = async (e: React.FormEvent) => {
    e.preventDefault();
    const qtyParsed = parseFloat(adjustCantidad);
    if (!qtyParsed || qtyParsed <= 0) {
      setAlert('La cantidad debe ser mayor que cero', 'error');
      return;
    }

    try {
      const res = await fetch('/api/inventario/ajustar', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          articuloId: adjustArtId,
          tipo: adjustTipo,
          cantidad: qtyParsed,
          motivo: adjustMotivo
        })
      });

      if (res.ok) {
        setAlert('¡Ajuste de stock registrado y guardado con éxito!', 'success');
        setIsAdjustModalOpen(false);
        fetchArticulos();
        fetchStats();
      } else {
        const d = await res.json();
        setAlert(d.error || 'Malformación en el ajuste', 'error');
      }
    } catch (err) {
      setAlert('Error de red al aplicar el ajuste manual de stock', 'error');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Search filters & core controls */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight flex items-center gap-2">
            Catálogo de Artículos <Package className="text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Alta y modificación de stock del inventario maestro.</p>
        </div>
        <button
          onClick={openCreateModal}
          className="bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 px-4 py-2.5 rounded-xl text-xs font-bold leading-normal flex items-center gap-1.5 shadow-lg shadow-teal-500/10 cursor-pointer hover:from-teal-400 hover:to-emerald-400 transition-all font-sans shrink-0 uppercase tracking-wide"
        >
          <Plus size={16} /> Crear Artículo
        </button>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        {/* Category sorting row & Search filtering */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 self-center h-full" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filtra por código o nombre del producto..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-200 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center flex-wrap gap-4">
            <button
              type="button"
              onClick={() => setShowLowStockOnly(!showLowStockOnly)}
              className={`px-4 py-2.5 rounded-xl text-xs font-extrabold flex items-center gap-1.5 transition-all cursor-pointer border ${
                showLowStockOnly 
                  ? 'bg-red-500/20 text-red-300 border-red-500/50 shadow-md shadow-red-550/15' 
                  : 'bg-[#21262d] text-gray-400 border-[#30363d] hover:bg-[#30363d] hover:text-white'
              }`}
            >
              <AlertTriangle size={14} className={showLowStockOnly ? 'text-red-400' : 'text-gray-405'} />
              {showLowStockOnly ? 'Filtro: Bajo Stock 🔥' : 'Reporte Stock Crítico'}
            </button>

            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Categoría:</span>
              <select
                value={categoryFilter}
                onChange={e => setCategoryFilter(e.target.value)}
                className="bg-[#0d1117] border border-[#30363d] text-gray-200 rounded-xl px-3 py-2.5 text-xs focus:outline-none focus:border-teal-500 cursor-pointer capitalize"
              >
                {uniqueCategories.map(cat => (
                  <option key={cat} value={cat}>{cat === 'All' ? 'Todos' : cat}</option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Catalog Table rendering */}
        {filteredArticles.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            🔍 No hay artículos catalogados que correspondan a la búsqueda.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#12161f] border-b border-[#30363d] text-gray-400 font-bold">
                  <th className="py-3 px-4">Código</th>
                  <th className="py-3 px-4">Nombre / Categoría</th>
                  <th className="py-3 px-4 text-right">Precio Costo</th>
                  <th className="py-3 px-4 text-right">Precio Venta</th>
                  <th className="py-3 px-4 text-center">Nivel Stock</th>
                  <th className="py-3 px-4 text-center">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/40">
                {filteredArticles.map(art => {
                  const isLowStock = art.stock <= art.stock_minimo;
                  return (
                    <tr 
                      key={art.id} 
                      className={`transition-all ${
                        isLowStock 
                          ? 'bg-red-500/10 text-red-200 border-l-4 border-red-500 hover:bg-red-500/15' 
                          : 'text-gray-300 hover:bg-[#0d1117]/30'
                      }`}
                    >
                      <td className="py-3.5 px-4 font-mono text-teal-400">{art.codigo}</td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-3">
                        {art.imagen_url ? (
                          <img 
                            src={art.imagen_url} 
                            alt={art.nombre} 
                            className="h-10 w-10 rounded-xl object-cover border border-[#30363d] shrink-0" 
                          />
                        ) : (
                          <div className={`h-10 w-10 rounded-xl font-extrabold flex items-center justify-center text-[11px] border shrink-0 select-none uppercase ${
                            art.es_combo 
                              ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' 
                              : 'bg-teal-500/5 text-teal-400 border-teal-500/20'
                          }`}>
                            {art.nombre.slice(0, 2)}
                          </div>
                        )}
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="block font-bold text-[#f1f6fc] truncate max-w-[200px]">{art.nombre}</span>
                            {art.es_combo && (
                              <span className="bg-purple-550/20 text-purple-300 border border-purple-500/30 text-[8px] font-extrabold px-1 rounded uppercase tracking-wider scale-90">Combo</span>
                            )}
                          </div>
                          <span className="text-[10px] text-gray-500 capitalize block truncate max-w-[200px]">
                            {art.categoria} • IVA {art.impuesto_iva}%
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="py-3.5 px-4 text-right font-mono text-gray-400">${art.precio_costo.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-right font-mono font-bold text-emerald-400">${art.precio_venta.toFixed(2)}</td>
                    <td className="py-3.5 px-4 text-center">
                      <div className="flex flex-col items-center gap-1.5">
                        {(() => {
                          const stockDisplay = art.es_combo ? calcularStockComboSimple(art.id, articulos) : art.stock;
                          return (
                            <>
                              <span className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-bold ${
                                art.es_combo
                                  ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                  : stockDisplay <= 0 
                                    ? 'bg-red-500/10 text-red-500 border border-red-500/20' 
                                    : stockDisplay <= art.stock_minimo
                                      ? 'bg-amber-500/10 text-amber-500 border border-[#f59e0b]/20 animate-pulse'
                                      : 'bg-teal-500/10 text-teal-400 border border-teal-500/20'
                              }`}>
                                {stockDisplay} uds {art.es_combo && '(Virtual)'}
                              </span>
                              {!art.es_combo ? (
                                <span className="text-[9px] text-gray-500">Mínimo: {art.stock_minimo} uds</span>
                              ) : (
                                <span className="text-[9px] text-purple-400/70 font-semibold">{art.componentes?.length || 0} componentes</span>
                              )}
                            </>
                          );
                        })()}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2 justify-center">
                        {/* Adjust stock button */}
                        {!art.es_combo && (
                          <button
                            onClick={() => openAdjustModal(art.id)}
                            title="Ajustar Stock Manual"
                            className="p-1.5 bg-[#21262d] text-gray-400 hover:text-teal-400 border border-[#30363d] rounded-lg cursor-pointer hover:bg-[#30363d] transition-all"
                          >
                            <RefreshCcw size={13} />
                          </button>
                        )}

                        <button
                          onClick={() => openEditModal(art)}
                          className="p-1.5 bg-[#21262d] text-gray-400 hover:text-white border border-[#30363d] rounded-lg cursor-pointer hover:bg-[#30363d] transition-all"
                        >
                          <Edit2 size={13} />
                        </button>
                        
                        {user?.rol === 'ADMIN' && (
                          <button
                            onClick={() => deleteArticle(art.id, art.nombre)}
                            className="p-1.5 bg-red-500/10 text-red-400 hover:text-red-300 rounded-lg cursor-pointer hover:bg-red-500/20 transition-all border border-red-500/20"
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
            </table>
          </div>
        )}
      </div>

      {/* MODAL 1: Create / Edit Article modal sheet */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-lg bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 to-emerald-500" />
            
            <div className="flex items-center justify-between p-6 border-b border-[#30363d]/50">
              <h3 className="text-lg font-bold text-gray-100 uppercase tracking-wide">
                {modalMode === 'create' ? 'Crear Nuevo Artículo' : 'Editar Información de Artículo'}
              </h3>
              <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={20} />
              </button>
            </div>

            <form onSubmit={saveArticle} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Código de Barras (Único)</label>
                  <input
                    type="text"
                    value={codigo}
                    onChange={e => setCodigo(e.target.value)}
                    placeholder="Ej. ART-TE-01"
                    disabled={modalMode === 'edit'}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 uppercase font-mono disabled:opacity-40"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Categoría del Producto</label>
                  {!showNewCategoryInput ? (
                    <select
                      value={categoria}
                      onChange={e => {
                        if (e.target.value === 'NEW') {
                          setShowNewCategoryInput(true);
                          setNuevaCategoria('');
                        } else {
                          setCategoria(e.target.value);
                        }
                      }}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-250 focus:outline-none focus:border-teal-500 cursor-pointer capitalize font-semibold"
                    >
                      {dbCategories.map(cat => (
                        <option key={cat} value={cat}>{cat}</option>
                      ))}
                      <option value="NEW" className="text-teal-400 font-bold">++ Crear Nueva Categoría ++</option>
                    </select>
                  ) : (
                    <div className="flex gap-2 items-center">
                      <input
                        type="text"
                        value={nuevaCategoria}
                        onChange={e => setNuevaCategoria(e.target.value)}
                        placeholder="Ej. Tecnología"
                        className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 font-semibold"
                      />
                      <button
                        type="button"
                        onClick={() => {
                          setShowNewCategoryInput(false);
                          setCategoria('General');
                        }}
                        className="px-3 py-2.5 bg-[#21262d] text-gray-300 hover:text-white border border-[#30363d] rounded-xl text-[10px] uppercase font-bold cursor-pointer transition-colors"
                        title="Volver a lista"
                      >
                        Lista
                      </button>
                    </div>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Nombre Completo del Artículo</label>
                <input
                  type="text"
                  value={nombre}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej. Monedas de Plata de Inversión ..."
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Tipo de Producto Selector */}
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Tipo de Producto</label>
                <div className="grid grid-cols-2 gap-2 mb-3">
                  <button
                    type="button"
                    onClick={() => {
                      setEsCombo(false);
                    }}
                    disabled={modalMode === 'edit'}
                    className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border disabled:opacity-40 ${
                      !esCombo 
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
                        : 'bg-[#0d1117] text-gray-500 border-[#30363d]'
                    }`}
                  >
                    📦 Producto Físico Simple
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEsCombo(true);
                      setStock('0');
                      setStockMinimo('0');
                    }}
                    disabled={modalMode === 'edit'}
                    className={`p-2 rounded-xl text-xs font-bold transition-all cursor-pointer border disabled:opacity-40 ${
                      esCombo 
                        ? 'bg-purple-500/10 text-purple-400 border-purple-500/30' 
                        : 'bg-[#0d1117] text-gray-500 border-[#30363d]'
                    }`}
                  >
                    🍱 Combo / Kit Agrupado
                  </button>
                </div>
              </div>

              {/* Combo ingredients builder if esCombo is active */}
              {esCombo && (
                <div className="border border-purple-500/20 bg-purple-500/5 rounded-xl p-4 space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-[10px] font-bold uppercase tracking-wider text-purple-400 flex items-center gap-1">
                      <Layers size={12} /> Componentes del Combo
                    </span>
                    {componentes.length > 0 && (
                      <button
                        type="button"
                        onClick={calcularSugerido}
                        className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 px-2 py-1 rounded text-[10px] font-extrabold flex items-center gap-1 cursor-pointer transition-all border border-purple-500/30"
                      >
                        <Calculator size={10} /> Calcular Sugerido
                      </button>
                    )}
                  </div>

                  {componentes.length === 0 ? (
                    <div className="text-[10px] text-gray-500 italic py-2 text-center">
                      No se han agregado componentes a este combo todavía.
                    </div>
                  ) : (
                    <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                      {componentes.map(comp => (
                        <div key={comp.componenteId} className="flex justify-between items-center bg-[#0d1117] p-2 rounded-lg border border-[#30363d] text-[11px]">
                          <div className="min-w-0 flex-1">
                            <span className="text-gray-250 font-bold block truncate text-[#e1e6ec]">{comp.nombre}</span>
                            <span className="text-[9px] text-gray-500">
                              {comp.cantidad}x (${comp.precio_venta.toFixed(2)} c/u)
                            </span>
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <span className="font-mono text-teal-400 font-bold">
                              ${(comp.precio_venta * comp.cantidad).toFixed(2)}
                            </span>
                            <button
                              type="button"
                              onClick={() => removeComponent(comp.componenteId)}
                              className="text-red-400 hover:text-red-300 cursor-pointer p-0.5"
                            >
                              <X size={12} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="border-t border-purple-500/10 pt-3 space-y-2">
                    <span className="block text-[9px] font-bold uppercase tracking-wider text-gray-400">
                      Agregar Componente
                    </span>
                    <div className="flex flex-col gap-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={compSearchQuery}
                          onChange={e => setCompSearchQuery(e.target.value)}
                          placeholder="Filtro de búsqueda..."
                          className="flex-1 bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded-lg text-[11px] text-gray-200 placeholder-gray-650 focus:outline-none focus:border-purple-500"
                        />
                        <input
                          type="number"
                          min="0.1"
                          step="any"
                          value={compCantidad}
                          onChange={e => setCompCantidad(e.target.value)}
                          className="w-16 bg-[#0d1117] border border-[#30363d] px-2 py-1.5 rounded-lg text-[11px] text-center text-gray-200 focus:outline-none focus:border-purple-500 font-mono"
                          title="Cantidad"
                        />
                      </div>

                      <div className="flex gap-2">
                        <select
                          value={compSelectedId}
                          onChange={e => setCompSelectedId(e.target.value)}
                          className="flex-1 bg-[#0d1117] border border-[#30363d] px-2 py-1.5 rounded-lg text-[11px] text-gray-250 focus:outline-none focus:border-purple-500 cursor-pointer capitalize font-semibold"
                        >
                          <option value="">-- Seleccione un Producto --</option>
                          {filteredComponentsForSelect.map(art => (
                            <option key={art.id} value={art.id}>
                              {art.nombre} (${art.precio_venta.toFixed(2)})
                            </option>
                          ))}
                        </select>

                        <button
                          type="button"
                          onClick={addComponent}
                          className="bg-purple-500/20 hover:bg-purple-500/30 text-purple-300 border border-purple-500/30 px-3.5 py-1.5 rounded-lg text-[11px] font-bold cursor-pointer uppercase shrink-0"
                        >
                          Añadir
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Costo de Adquisición ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={precioCosto}
                    onChange={e => setPrecioCosto(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Precio Público de Venta ($)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={precioVenta}
                    onChange={e => setPrecioVenta(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              </div>

              {!esCombo ? (
                <div className="grid grid-cols-3 gap-4">
                  {modalMode === 'create' ? (
                    <div>
                      <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Stock Inicial</label>
                      <input
                        type="number"
                        value={stock}
                        onChange={e => setStock(e.target.value)}
                        className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Física Auditada</label>
                      <input
                        type="number"
                        value={stock}
                        onChange={e => setStock(e.target.value)}
                        className="w-full bg-[#0d1117]/60 border border-[#30363d] p-2.5 rounded-xl text-xs text-teal-400 font-bold focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                  )}
                  <div>
                    <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Mínimo de Alerta</label>
                    <input
                      type="number"
                      value={stockMinimo}
                      onChange={e => setStockMinimo(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                  <div>
                    <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Impuesto IVA (%)</label>
                    <input
                      type="number"
                      value={impuestoIva}
                      onChange={e => setImpuestoIva(e.target.value)}
                      className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 font-mono"
                    />
                  </div>
                </div>
              ) : (
                <div>
                  <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Impuesto IVA (%)</label>
                  <input
                    type="number"
                    value={impuestoIva}
                    onChange={e => setImpuestoIva(e.target.value)}
                    className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 font-mono"
                  />
                </div>
              )}

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">
                  Distribuidor / Proveedor Recomendado
                </label>
                <select
                  value={proveedorId}
                  onChange={e => setProveedorId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 focus:outline-none focus:border-teal-500 cursor-pointer capitalize"
                >
                  <option value="">-- Seleccione un Proveedor para Surtido --</option>
                  {proveedores.map(prov => (
                    <option key={prov.id} value={prov.id}>
                      {prov.empresa} ({prov.rif})
                    </option>
                  ))}
                </select>
              </div>

              {/* Seccion de Carga de Imagen */}
              <div className="border-t border-[#30363d]/50 pt-4 space-y-3">
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider">Imagen del Artículo</label>
                <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center">
                  <div className="h-20 w-20 rounded-xl bg-[#0d1117] border border-[#30363d] flex items-center justify-center overflow-hidden shrink-0 select-none relative group">
                    {imagenUrl ? (
                      <>
                        <img src={imagenUrl} alt="Preview" className="h-full w-full object-cover" />
                        <button
                          type="button"
                          onClick={() => setImagenUrl('')}
                          className="absolute top-1 right-1 bg-red-500/80 text-white rounded-full p-1 cursor-pointer hover:bg-red-600 transition-all opacity-0 group-hover:opacity-100 shadow-md"
                          title="Remover imagen"
                        >
                          <X size={10} />
                        </button>
                      </>
                    ) : (
                      <div className="text-center p-2 text-gray-650 flex flex-col items-center gap-1">
                        <Package size={20} className="text-gray-600" />
                        <span className="text-[8px] uppercase tracking-wider font-bold">Sin foto</span>
                      </div>
                    )}
                  </div>

                  <div className="flex-1 space-y-2 w-full">
                    <div>
                      <span className="block text-gray-500 text-[8px] font-bold uppercase tracking-wider mb-1">Cargar Archivo Local (Máx. 2MB)</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageFileChange}
                        className="w-full bg-[#0d1117] border border-[#30363d] p-1.5 rounded-lg text-[9px] text-gray-400 file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:text-[9px] file:font-semibold file:bg-teal-500/10 file:text-teal-400 hover:file:bg-teal-500/20 cursor-pointer file:cursor-pointer"
                      />
                    </div>
                    <div>
                      <span className="block text-gray-500 text-[8px] font-bold uppercase tracking-wider mb-1">O Pegar Enlace / URL Web</span>
                      <input
                        type="text"
                        value={imagenUrl.startsWith('data:') ? '' : imagenUrl}
                        onChange={e => setImagenUrl(e.target.value)}
                        placeholder="https://ejemplo.com/imagen.jpg"
                        className="w-full bg-[#0d1117] border border-[#30363d] px-2.5 py-1.5 rounded-lg text-xs text-gray-250 placeholder-gray-600 focus:outline-none focus:border-teal-500 font-mono"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 justify-end pt-4">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 bg-[#21262d] hover:bg-[#30363d] text-gray-200 rounded-xl text-xs font-semibold cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold rounded-xl text-xs uppercase cursor-pointer hover:from-teal-400"
                >
                  Guardar Información
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Stock Manual Adjustment (Audit/Ajustes) */}
      {isAdjustModalOpen && (
        <div className="fixed inset-0 bg-[#0d1117]/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl overflow-hidden animate-fade-in relative animate-scale-up">
            <div className="absolute top-0 left-0 right-0 h-1 bg-teal-500" />
            
            <div className="flex items-center justify-between p-5 border-b border-[#30363d]/50">
              <h3 className="text-sm font-bold text-gray-100 uppercase tracking-widest flex items-center gap-1.5">
                <RefreshCcw size={15} className="text-teal-400 animate-spin-reverse" />
                Ajustar Inventario Manual
              </h3>
              <button onClick={() => setIsAdjustModalOpen(false)} className="text-gray-400 hover:text-white cursor-pointer">
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleStockAdjustment} className="p-5 space-y-4">
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Acción del Ajuste</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustTipo('ENTRADA')}
                    className={`p-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border ${
                      adjustTipo === 'ENTRADA' 
                        ? 'bg-teal-500/10 text-teal-400 border-teal-500/30' 
                        : 'bg-[#0d1117] text-gray-500 border-[#30363d]'
                    }`}
                  >
                    🚀 Registrar Entrada
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustTipo('SALIDA')}
                    className={`p-2.5 rounded-xl text-xs font-bold uppercase transition-all cursor-pointer border ${
                      adjustTipo === 'SALIDA' 
                        ? 'bg-red-500/10 text-red-400 border-red-500/30' 
                        : 'bg-[#0d1117] text-gray-500 border-[#30363d]'
                    }`}
                  >
                    📉 Registrar Retiro/Salida
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Cantidad a Ajustar</label>
                <input
                  type="number"
                  value={adjustCantidad}
                  onChange={e => setAdjustCantidad(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-100 font-mono focus:outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1">Motivo / Factura Referencia</label>
                <textarea
                  value={adjustMotivo}
                  onChange={e => setAdjustMotivo(e.target.value)}
                  placeholder="Ej. Conteo físico anual / descarte..."
                  rows={3}
                  className="w-full bg-[#0d1117] border border-[#30363d] p-2.5 rounded-xl text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500"
                />
              </div>

              <div className="flex gap-2.5 justify-end pt-3">
                <button
                  type="button"
                  onClick={() => setIsAdjustModalOpen(false)}
                  className="px-4 py-2 bg-[#21262d] text-gray-300 rounded-xl text-xs"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold rounded-xl text-xs uppercase"
                >
                  Registrar Ajuste
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
