import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { 
  User, Search, TrendingUp, Calendar, Heart, ShieldAlert,
  ListFilter, Eye, X, Receipt, ShoppingBag, Landmark
} from 'lucide-react';

export default function ClienteReporteView() {
  const { user, clientes, setAlert } = useStore();
  const [selectedClienteId, setSelectedClienteId] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Loaded report cache
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);

  // Active paginated invoice page trace
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  // Active clicked detail modal
  const [selectedInvoice, setSelectedInvoice] = useState<any | null>(null);

  // Autocomplete matching list computation
  const matchingClientes = (clientes || []).filter(c => 
    c.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
    c.rif.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Fetch report data on customer select
  const handleSelectCliente = async (id: string, name: string) => {
    setSelectedClienteId(id);
    setSearchQuery(name);
    setIsDropdownOpen(false);
    setReportData(null);
    setCurrentPage(1);

    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/compras-por-cliente/${id}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        }
      });
      const data = await res.json();
      if (!res.ok) {
        setAlert(data.error || 'No se pudo cargar el reporte del cliente.', 'error');
      } else {
        setReportData(data);
      }
    } catch (err) {
      setAlert('Error de conexión con el servidor', 'error');
    } finally {
      setLoading(false);
    }
  };

  // Compute Favorite Product (Product with highest cumulative count) from the invoice list
  const getFavoriteProduct = () => {
    if (!reportData || !reportData.ventas || reportData.ventas.length === 0) return null;
    
    const freqMap: Record<string, { count: number; nombre: string }> = {};
    
    reportData.ventas.forEach((v: any) => {
      if (v.estado === 'ANULADA') return;
      (v.detalles || []).forEach((d: any) => {
        const artId = d.articuloId;
        const artName = d.articulo?.nombre || `Artículo #${artId.slice(-4)}`;
        if (!freqMap[artId]) {
          freqMap[artId] = { count: 0, nombre: artName };
        }
        freqMap[artId].count += d.cantidad;
      });
    });

    let bestId: string | null = null;
    let maxQty = 0;
    
    Object.keys(freqMap).forEach(id => {
      if (freqMap[id].count > maxQty) {
        maxQty = freqMap[id].count;
        bestId = id;
      }
    });

    return bestId ? { nombre: freqMap[bestId].nombre, count: maxQty } : null;
  };

  const favoriteProd = getFavoriteProduct();
  const lastPurchase = reportData?.ventas && reportData.ventas.filter((v: any) => v.estado !== 'ANULADA')[0];

  // Pagination bounds
  const salesList = reportData?.ventas || [];
  const totalPages = Math.ceil(salesList.length / itemsPerPage);
  const paginatedSales = salesList.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="space-y-6 animate-fade-in text-slate-700">
      
      {/* Title area */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          Reporte de Compras por Cliente <TrendingUp className="text-emerald-500" />
        </h1>
        <p className="text-slate-500 text-sm mt-1">Visión Customer 360, históricos de transacciones, límites crediticios y métricas de consumo en tiempo real.</p>
      </div>

      {/* STEP 1: Fully Autocomplete Customer Selector */}
      <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 relative">
        <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
          Buscar Cliente (Nombre o RIF)
        </label>
        
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center text-slate-400">
            <Search size={16} />
          </div>
          <input
            type="text"
            value={searchQuery}
            onFocus={() => setIsDropdownOpen(true)}
            onChange={e => {
              setSearchQuery(e.target.value);
              setIsDropdownOpen(true);
            }}
            placeholder="Escriba para filtrar y autocompletar clientes de la base de datos..."
            className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl py-3 pl-10 pr-4 text-slate-700 focus:outline-none focus:border-emerald-500"
          />

          {searchQuery && (
            <button
              onClick={() => {
                setSearchQuery('');
                setSelectedClienteId('');
                setReportData(null);
                setIsDropdownOpen(true);
              }}
              className="absolute inset-y-0 right-3 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              ×
            </button>
          )}
        </div>

        {/* Dropdown autocompletion results grid */}
        {isDropdownOpen && matchingClientes.length > 0 && (
          <div className="absolute left-6 right-6 mt-1 bg-white border border-slate-200 rounded-xl shadow-xl max-h-56 overflow-y-auto z-40 divide-y divide-slate-100">
            {matchingClientes.map(c => (
              <button
                key={c.id}
                type="button"
                onClick={() => handleSelectCliente(c.id, c.nombre)}
                className="w-full text-left px-4 py-3 text-xs hover:bg-[#F8FAFC] transition-colors flex justify-between items-center cursor-pointer"
              >
                <div>
                  <span className="font-extrabold text-slate-850 block">{c.nombre}</span>
                  <span className="text-[10px] text-slate-400 font-mono uppercase">RIF: {c.rif}</span>
                </div>
                <span className="text-[10px] text-slate-400 italic">Haga clic para cargar 360</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Loading state visual indicator */}
      {loading && (
        <div className="text-center py-12 text-slate-400 text-xs">
          Cargando auditoría e históricos de consumo...
        </div>
      )}

      {/* REPORT DASHBOARD BODY */}
      {reportData && !loading && (
        <div className="space-y-6 animate-scale-up">
          
          {/* CLIENT HIGHLIGHT CARD */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-sm border border-slate-800 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            
            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Razón Social</span>
              <p className="text-lg font-black tracking-tight">{reportData.cliente.nombre}</p>
              <span className="text-xs font-mono text-slate-400 uppercase block">RIF: {reportData.cliente.rif}</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Habilitación Crediticia</span>
              <p className="text-xl font-bold font-mono text-emerald-400">${reportData.cliente.deuda_limite.toFixed(2)} USD</p>
              <span className="text-[10px] text-slate-400 block">Límite asignado de deuda activa.</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Deuda Pendiente</span>
              <p className="text-xl font-bold font-mono text-amber-500">${reportData.cliente.saldo_deudor.toFixed(2)} USD</p>
              <span className="text-[10px] text-slate-400 block">Saldo bajo estado PENDIENTE.</span>
            </div>

            <div className="space-y-1">
              <span className="text-[10px] text-slate-400 uppercase font-bold tracking-widest block">Transacciones Emitidas</span>
              <p className="text-xl font-bold font-mono text-blue-400">{reportData.resumen.cantidad_transacciones} facturas</p>
              <span className="text-[10px] text-slate-400 block">Totales procesados en POS.</span>
            </div>

          </div>

          {/* PASEO 3: METRIC PANELS */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            
            {/* Gastado Histórico */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center shrink-0">
                <Landmark size={22} />
              </div>
              <div>
                <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block">Total Consumido Histórico</span>
                <span className="text-2xl font-black font-mono text-slate-850">${reportData.resumen.compras_totales_monto.toFixed(2)}</span>
                <p className="text-[10px] text-slate-400 mt-0.5">Monto exonerando facturas anuladas.</p>
              </div>
            </div>

            {/* Última Compra */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                <Calendar size={22} />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block">Última Operación Emitida</span>
                {lastPurchase ? (
                  <>
                    <span className="text-base font-bold text-slate-800 font-mono truncate block">
                      ${lastPurchase.total_neto.toFixed(2)}
                    </span>
                    <p className="text-[9px] text-slate-400 truncate mt-0.5">
                      F. {new Date(lastPurchase.fecha).toLocaleDateString()} | #{lastPurchase.id.slice(-6).toUpperCase()}
                    </p>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic font-medium block mt-1">Ninguna factura registrada</span>
                )}
              </div>
            </div>

            {/* Producto Favorito */}
            <div className="bg-white border border-slate-200 p-6 rounded-2xl flex items-center gap-4">
              <div className="h-12 w-12 rounded-xl bg-red-50 text-red-650 flex items-center justify-center shrink-0">
                <Heart size={21} className="text-red-500 animate-pulse" />
              </div>
              <div className="min-w-0 flex-1">
                <span className="text-slate-400 text-[9px] font-black uppercase tracking-widest block">Producto Predilecto</span>
                {favoriteProd ? (
                  <>
                    <span className="text-xs font-black text-slate-800 truncate block uppercase leading-normal" title={favoriteProd.nombre}>
                      {favoriteProd.nombre}
                    </span>
                    <p className="text-[10px] text-slate-400 mt-0.5">Consumo acumulado: {favoriteProd.count} unidades</p>
                  </>
                ) : (
                  <span className="text-xs text-slate-400 italic font-medium block mt-1">S/o registros de compra</span>
                )}
              </div>
            </div>

          </div>

          {/* PASO 4: LIST PANEL CON PAGINACION */}
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">Facturación del Historial del Cliente</h3>
              <span className="text-[10px] text-slate-400">Total: {salesList.length} transacciones</span>
            </div>

            {salesList.length === 0 ? (
              <div className="py-12 text-center text-slate-450 italic text-xs">
                No existen comprobantes asociados a este cliente en el sistema.
              </div>
            ) : (
              <div className="space-y-4">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="bg-slate-50 border-b border-slate-200 text-slate-550 font-bold uppercase tracking-wider text-[10px]">
                        <th className="py-2.5 px-3">Código Factura</th>
                        <th className="py-2.5 px-3 text-center">Fecha</th>
                        <th className="py-2.5 px-3 text-right">Monto Neto</th>
                        <th className="py-2.5 px-3 text-center">Estado</th>
                        <th className="py-2.5 px-3 text-center">Acción</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-semibold">
                      {paginatedSales.map((v: any) => (
                        <tr key={v.id} className="hover:bg-[#F8FAFC]">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800 uppercase">
                            #{v.id.slice(-8).toUpperCase()}
                          </td>
                          <td className="py-3 px-3 text-center text-slate-450 font-mono">
                            {new Date(v.fecha).toLocaleString()}
                          </td>
                          <td className="py-3 px-3 text-right font-mono font-extrabold text-blue-600">
                            ${v.total_neto.toFixed(2)}
                          </td>
                          <td className="py-2 px-3 text-center">
                            <span className={`inline-block px-2.0 py-0.5 text-[9px] font-black rounded-lg uppercase tracking-wider ${
                              v.estado === 'PAGADA' 
                                ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                                : v.estado === 'PENDIENTE'
                                  ? 'bg-amber-50 text-amber-600 border border-amber-100 animate-pulse'
                                  : 'bg-red-50 text-red-500 border border-red-100'
                            }`}>
                              {v.estado}
                            </span>
                          </td>
                          <td className="py-2 px-3 text-center">
                            <button
                              onClick={() => setSelectedInvoice(v)}
                              className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-[10px] uppercase font-bold tracking-wider inline-flex items-center gap-1 cursor-pointer transition-all"
                            >
                              <Eye size={12} /> Detalle
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>

                {/* PAGINATION PANEL */}
                {totalPages > 1 && (
                  <div className="flex justify-between items-center pt-3 border-t border-slate-100 text-[11px] font-bold">
                    <span className="text-slate-400">Pág. {currentPage} de {totalPages}</span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                        disabled={currentPage === 1}
                        className="p-1.5 px-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[10px]"
                      >
                        Anterior
                      </button>
                      <button
                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                        disabled={currentPage === totalPages}
                        className="p-1.5 px-3 bg-slate-100 text-slate-600 hover:bg-slate-200 rounded-lg disabled:opacity-40 cursor-pointer disabled:cursor-not-allowed text-[10px]"
                      >
                        Siguiente
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

        </div>
      )}

      {/* INVOICE DETAIL SHEET MODAL */}
      {selectedInvoice && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-fade-in">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden relative">
            <div className="absolute top-0 left-0 right-0 h-1 bg-gradient-to-r from-teal-500 via-blue-500 to-emerald-500" />
            
            <div className="flex items-center justify-between p-5 border-b border-slate-100">
              <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
                <Receipt size={16} className="text-blue-500" /> Detalle de Factura #{selectedInvoice.id.slice(-8).toUpperCase()}
              </h3>
              <button 
                onClick={() => setSelectedInvoice(null)} 
                className="text-slate-400 hover:text-slate-700 cursor-pointer p-1 rounded-lg hover:bg-slate-50"
              >
                <X size={18} />
              </button>
            </div>

            <div className="p-6 space-y-4 max-h-[70vh] overflow-y-auto">
              {/* Factura metadata */}
              <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-slate-600 pb-3 border-b border-dashed border-slate-150">
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Emisión</p>
                  <span>{new Date(selectedInvoice.fecha).toLocaleString()}</span>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Método de Pago</p>
                  <span>{selectedInvoice.metodo_pago}</span>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Deudor Razón Social</p>
                  <span className="font-extrabold text-slate-850">{reportData?.cliente?.nombre}</span>
                </div>
                <div>
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-0.5">Estado</p>
                  <span className={`inline-block px-1.5 text-[9px] font-black rounded uppercase ${
                    selectedInvoice.estado === 'PAGADA' 
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-100'
                      : selectedInvoice.estado === 'PENDIENTE'
                        ? 'bg-amber-50 text-amber-600 border border-amber-100'
                        : 'bg-red-50 text-red-550 border border-red-100'
                  }`}>
                    {selectedInvoice.estado}
                  </span>
                </div>
              </div>

              {/* Items Table */}
              <div>
                <span className="text-[9px] text-slate-400 uppercase font-black tracking-widest block mb-2">Bienes Adquiridos</span>
                <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100 text-xs">
                  {(selectedInvoice.detalles || []).map((det: any) => (
                    <div key={det.id} className="p-3 bg-slate-50/40 flex justify-between items-center gap-4">
                      <div>
                        <span className="font-extrabold text-slate-800 block text-[11px] leading-normal">{det.articulo?.nombre || `Artículo #${det.articuloId.slice(-4)}`}</span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          {det.cantidad} uds x ${det.precio_unitario.toFixed(2)}
                        </span>
                      </div>
                      <span className="font-mono font-bold text-slate-700">${det.subtotal.toFixed(2)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Summary calculations */}
              <div className="bg-[#F8FAFC] p-4 rounded-xl border border-slate-100/50 space-y-2 text-xs font-semibold text-slate-600 font-mono">
                <div className="flex justify-between">
                  <span>Subtotal Bruto:</span>
                  <span>${selectedInvoice.total_bruto.toFixed(2)}</span>
                </div>
                {selectedInvoice.descuento > 0 && (
                  <div className="flex justify-between text-indigo-650">
                    <span>Descuento aplicado:</span>
                    <span>-${selectedInvoice.descuento.toFixed(2)}</span>
                  </div>
                )}
                <div className="flex justify-between">
                  <span>Impuesto IVA (Calculado):</span>
                  <span>${selectedInvoice.total_impuesto.toFixed(2)}</span>
                </div>
                <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between text-slate-800 font-extrabold text-sm">
                  <span className="font-sans font-black">TOTAL NETO:</span>
                  <span className="text-blue-600">${selectedInvoice.total_neto.toFixed(2)} USD</span>
                </div>
              </div>

            </div>

            <div className="p-4 bg-slate-50/50 border-t border-slate-100 flex justify-end">
              <button
                onClick={() => setSelectedInvoice(null)}
                className="px-5 py-2 bg-slate-900 text-white rounded-xl text-xs font-extrabold cursor-pointer uppercase tracking-wider hover:bg-slate-800 transition-all"
              >
                Cerrar Detalle
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
