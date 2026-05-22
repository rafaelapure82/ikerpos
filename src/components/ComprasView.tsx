import { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { 
  ShoppingBag, Truck, Plus, Trash2, Calendar, FileText, 
  HelpCircle, Sparkles, CheckSquare, Eye, EyeOff 
} from 'lucide-react';
import { Articulo } from '../types.js';

interface PurchaseItem {
  articulo: Articulo;
  cantidad: number;
  costo_unitario: number;
}

export default function ComprasView() {
  const { articulos, proveedores, compras, setAlert, fetchStats, fetchCompras, fetchArticulos } = useStore();
  
  // Create state fields
  const [selectedSupplierId, setSelectedSupplierId] = useState('');
  const [facturaReferencia, setFacturaReferencia] = useState('');
  const [cart, setCart] = useState<PurchaseItem[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Search/add fields
  const [searchQuery, setSearchQuery] = useState('');

  // Expandable list details
  const [expandedId, setExpandedId] = useState<string | null>(null);

  useEffect(() => {
    if (proveedores.length > 0 && !selectedSupplierId) {
      setSelectedSupplierId(proveedores[0].id);
    }
  }, [proveedores, selectedSupplierId]);

  const filteredProducts = articulos.filter(art => 
    art.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
    art.codigo.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const addItemToOrder = (art: Articulo) => {
    const existingIndex = cart.findIndex(c => c.articulo.id === art.id);
    if (existingIndex !== -1) {
      const updated = [...cart];
      updated[existingIndex].cantidad += 1;
      setCart(updated);
    } else {
      setCart([...cart, { articulo: art, cantidad: 1, costo_unitario: art.precio_costo }]);
    }
    setAlert(`Agregado al pedido: ${art.nombre}`, 'success');
  };

  const updateCartItemCost = (artId: string, cost: number) => {
    setCart(cart.map(c => c.articulo.id === artId ? { ...c, costo_unitario: cost } : c));
  };

  const updateCartItemQty = (artId: string, qty: number) => {
    if (qty <= 0) {
      setCart(cart.filter(c => c.articulo.id !== artId));
      return;
    }
    setCart(cart.map(c => c.articulo.id === artId ? { ...c, cantidad: qty } : c));
  };

  const removeFromCart = (artId: string) => {
    setCart(cart.filter(c => c.articulo.id !== artId));
  };

  const totalCompra = cart.reduce((sum, item) => sum + (item.cantidad * item.costo_unitario), 0);

  const handleRegisterPurchase = async () => {
    if (cart.length === 0) {
      setAlert('La lista de abastecimiento está vacía', 'error');
      return;
    }
    if (!selectedSupplierId) {
      setAlert('Selecciona un proveedor de origen', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        proveedorId: selectedSupplierId,
        factura_referencia: facturaReferencia,
        total: totalCompra,
        detalles: cart.map(item => ({
          articuloId: item.articulo.id,
          cantidad: item.cantidad,
          costo_unitario: item.costo_unitario
        }))
      };

      const res = await fetch('/api/compras', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setAlert('¡Pedido de compras registrado y stock recargado con éxito!', 'success');
        setCart([]);
        setFacturaReferencia('');
        await Promise.all([
          fetchStats(),
          fetchCompras(),
          fetchArticulos()
        ]);
      } else {
        const d = await res.json();
        setAlert(d.error || 'No se pudo guardar la compra', 'error');
      }
    } catch {
      setAlert('Error de conexión a la API de compras de inventario', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Overview Headings */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight flex items-center gap-2">
          Abastecimiento y Compras <ShoppingBag className="text-teal-400" />
        </h1>
        <p className="text-gray-400 text-sm mt-1">Órdenes de compra mayoristas. Cada confirmación eleva los niveles de stock automáticamente.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">

        {/* Form panel to create purchase orders */}
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4 border-b border-[#30363d] pb-3">
              Registrar Abastecimiento de Inventario <Sparkles className="text-teal-400" />
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
              {/* Supplier select */}
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Proveedor de Origen</label>
                <select
                  value={selectedSupplierId}
                  onChange={e => setSelectedSupplierId(e.target.value)}
                  className="w-full bg-[#0d1117] border border-[#30363d] text-gray-200 rounded-xl p-2.5 text-xs focus:outline-none focus:border-teal-500 cursor-pointer appearance-none uppercase"
                >
                  {proveedores.map(p => (
                    <option key={p.id} value={p.id}>{p.empresa} ({p.rif})</option>
                  ))}
                </select>
              </div>

              {/* Reference invoice */}
              <div>
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider mb-1.5">Factura o Guía de Entrada (Ref)</label>
                <input
                  type="text"
                  value={facturaReferencia}
                  onChange={e => setFacturaReferencia(e.target.value)}
                  placeholder="Ej. FAC-POLAR-4923"
                  className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl p-2.5 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-teal-500 font-mono uppercase"
                />
              </div>
            </div>

            {/* Fast article quick-pick list */}
            <div className="mb-4 bg-[#0e1117]/60 border border-[#30363d]/50 p-4 rounded-xl">
              <label className="block text-gray-300 text-[10px] font-bold uppercase tracking-wider mb-2">Escoger Artículo a Reponer:</label>
              <div className="flex gap-2">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Filtra y selecciona el artículo..."
                  className="bg-[#161b22] border border-[#30363d] rounded-lg px-2.5 py-1.5 text-xs text-gray-200 flex-1 focus:outline-none focus:border-teal-500"
                />
              </div>

              {searchQuery && (
                <div className="mt-2 bg-[#161b22] border border-[#30363d]/80 rounded-lg max-h-36 overflow-y-auto divide-y divide-[#30363d]/50">
                  {filteredProducts.map(art => (
                    <div 
                      key={art.id} 
                      onClick={() => {
                        addItemToOrder(art);
                        setSearchQuery('');
                      }}
                      className="p-2 text-xs text-gray-300 hover:bg-[#0e1117]/80 cursor-pointer flex justify-between items-center"
                    >
                      <span className="font-bold">{art.nombre}</span>
                      <span className="text-[10px] font-mono text-gray-500">Stock: {art.stock} | Código: {art.codigo}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Abastecimiento list layout */}
            {cart.length === 0 ? (
              <div className="py-12 border border-dashed border-[#30363d] rounded-xl text-center text-gray-500 text-xs">
                Escoge arriba los artículos a reponer para armar tu carrito de abastecimiento.
              </div>
            ) : (
              <div className="space-y-2 mb-6">
                <label className="block text-gray-400 text-[10px] font-bold uppercase tracking-wider">Líneas de la Órden de Compra:</label>
                {cart.map(item => (
                  <div key={item.articulo.id} className="flex flex-col md:flex-row md:items-center justify-between gap-2.5 bg-[#0d1117] border border-[#30363d]/50 p-3 rounded-xl">
                    <div className="flex-1 min-w-0">
                      <span className="block text-xs font-bold text-gray-100 truncate">{item.articulo.nombre}</span>
                      <span className="text-[10px] font-mono text-[#8b949e]">Cod: {item.articulo.codigo} | Stock Actual: {item.articulo.stock}</span>
                    </div>

                    <div className="flex items-center gap-2 self-end md:self-auto uppercase">
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">Cantidad</span>
                        <input
                          type="number"
                          value={item.cantidad || ''}
                          onChange={e => updateCartItemQty(item.articulo.id, parseFloat(e.target.value) || 0)}
                          className="w-16 bg-[#161b22] border border-[#30363d] rounded p-1 text-center font-mono text-xs text-gray-100"
                        />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-[9px] text-gray-500 font-bold uppercase tracking-wide">Costo Unit ($)</span>
                        <input
                          type="number"
                          step="0.01"
                          value={item.costo_unitario || ''}
                          onChange={e => updateCartItemCost(item.articulo.id, parseFloat(e.target.value) || 0)}
                          className="w-20 bg-[#161b22] border border-[#30363d] rounded p-1 text-right font-mono text-xs text-gray-100"
                        />
                      </div>
                      <button
                        onClick={() => removeFromCart(item.articulo.id)}
                        className="p-1 px-1.5 bg-red-500/10 hover:bg-red-500/25 border border-red-500/20 text-red-400 rounded-lg cursor-pointer mt-3.5"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Total final summary and action button */}
            {cart.length > 0 && (
              <div className="border-t border-[#30363d] pt-4 mt-4 text-xs">
                <div className="flex justify-between items-center text-sm font-extrabold text-[#f1f6fc] mb-4">
                  <span>Total Estimado del Abastecimiento:</span>
                  <span className="font-mono text-teal-400 text-lg font-black">${totalCompra.toFixed(2)}</span>
                </div>
                
                <button
                  onClick={handleRegisterPurchase}
                  disabled={isSubmitting}
                  className="w-full py-3 bg-gradient-to-r from-teal-500 to-emerald-500 text-gray-950 font-bold rounded-xl flex items-center justify-center gap-1.5 cursor-pointer uppercase tracking-wider hover:from-teal-400 hover:shadow-lg transition-all"
                >
                  <CheckSquare size={15} />
                  {isSubmitting ? 'Registrando Pedido...' : 'Guardar y Recargar Stock'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Historic purchase order trails */}
        <div className="lg:col-span-5">
          <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
            <h2 className="text-lg font-bold text-gray-100 flex items-center gap-2 mb-4 border-b border-[#30363d] pb-3">
              Kárdex de Suministros (Historial) <Truck className="text-teal-400" size={18} />
            </h2>

            {compras.length === 0 ? (
              <div className="py-12 text-center text-gray-500 text-xs">
                No hay órdenes de compra registradas.
              </div>
            ) : (
              <div className="space-y-3.5 max-h-[480px] overflow-y-auto pr-1">
                {compras.map(comp => {
                  const isExpanded = expandedId === comp.id;
                  return (
                    <div 
                      key={comp.id} 
                      className="bg-[#0d1117] border border-[#30363d]/80 rounded-xl p-4 transition-all hover:border-teal-500/20"
                    >
                      <div className="flex justify-between items-start gap-2 mb-2">
                        <div>
                          <span className="block text-xs font-bold text-gray-200 uppercase">{comp.proveedor?.empresa || 'Proveedor No Encontrado'}</span>
                          <span className="text-[10px] text-gray-500 font-mono mt-0.5 block flex items-center gap-1">
                            <Calendar size={11} /> {new Date(comp.fecha).toLocaleDateString()}
                          </span>
                        </div>
                        <span className="font-mono text-emerald-400 font-extrabold text-xs shrink-0">${comp.total.toFixed(2)}</span>
                      </div>

                      <div className="flex items-center justify-between text-[10px] text-gray-500 border-t border-[#30363d]/45 pt-2 whitespace-nowrap overflow-hidden">
                        <span className="truncate font-mono">REF: {comp.factura_referencia || 'N/A'}</span>
                        <button
                          onClick={() => setExpandedId(isExpanded ? null : comp.id)}
                          className="text-teal-400 hover:text-teal-300 font-bold flex items-center gap-1 uppercase cursor-pointer text-[9px]"
                        >
                          {isExpanded ? <EyeOff size={11} /> : <Eye size={11} />}
                          {isExpanded ? 'Ocultar' : 'Ver Detalles'}
                        </button>
                      </div>

                      {/* Expandable item details */}
                      {isExpanded && comp.detalles && (
                        <div className="mt-4 pt-3 border-t border-[#30363d]/60 space-y-2 text-[10px]">
                          <span className="block font-bold text-gray-300 uppercase tracking-widest text-[8px]">Artículos Suministrados:</span>
                          {comp.detalles.map(det => (
                            <div key={det.id} className="flex justify-between items-center text-[#8b949e]">
                              <span>{det.articulo?.nombre || `Item (ID: ${det.articuloId})`}</span>
                              <span className="font-mono font-semibold text-gray-200 shrink-0">
                                {det.cantidad} u • ${det.costo_unitario.toFixed(2)} c/u
                              </span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
