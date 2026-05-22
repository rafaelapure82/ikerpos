import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { useReactToPrint } from 'react-to-print';
import { 
  Search, ClipboardList, Eye, ArrowLeft, RefreshCw, 
  Trash2, X, AlertTriangle, CheckSquare, Calendar, Filter,
  Printer, Coins
} from 'lucide-react';
import { Venta } from '../types.js';

export default function VentasView() {
  const { user, setAlert, fetchStats, pymeConfig } = useStore();
  
  // Local list variables with custom server call because of custom filters and pagination!
  const [sales, setSales] = useState<Venta[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);
  const [totalPages, setTotalPages] = useState(1);
  const [currentPage, setCurrentPage] = useState(1);
  
  // Filtering state
  const [estadoFilter, setEstadoFilter] = useState('');
  const [fechaInicio, setFechaInicio] = useState('');
  const [fechaFin, setFechaFin] = useState('');

  // Selected details modal
  const [selectedSale, setSelectedSale] = useState<Venta | null>(null);
  
  // Devolution modal
  const [showDevolutionModal, setShowDevolutionModal] = useState(false);
  const [devSale, setDevSale] = useState<Venta | null>(null);
  const [devQuantities, setDevQuantities] = useState<Record<string, number>>({});
  const [devMotivo, setDevMotivo] = useState('Cliente insatisfecho / Defectuoso');
  const [submittingDev, setSubmittingDev] = useState(false);

  // Print references
  const ticketRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
  });

  const fetchSalesList = async (page: number) => {
    setLoadingSales(true);
    try {
      let url = `/api/ventas?page=${page}&limit=10`;
      if (estadoFilter) url += `&estado=${estadoFilter}`;
      if (fechaInicio) url += `&fechaInicio=${fechaInicio}`;
      if (fechaFin) url += `&fechaFin=${fechaFin}`;

      const res = await fetch(url, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const json = await res.json();
        setSales(json.data || []);
        setTotalPages(json.meta?.totalPages || 1);
        setCurrentPage(json.meta?.page || 1);
      }
    } catch (e) {
      console.error('Error fetching filtered sales list:', e);
    } finally {
      setLoadingSales(false);
    }
  };

  useEffect(() => {
    if (user) {
      fetchSalesList(1);
    }
  }, [estadoFilter, fechaInicio, fechaFin]);

  const handleAnular = async (saleId: string) => {
    if (!window.confirm('¿Está totalmente seguro de anular esta venta? Esta operación es irreversible.')) return;
    try {
      const res = await fetch(`/api/ventas/${saleId}/anular`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        setAlert('La venta fue ANULADA y su estado actualizado.', 'success');
        fetchSalesList(currentPage);
        fetchStats();
        if (selectedSale?.id === saleId) setSelectedSale(null);
      } else {
        const err = await res.json();
        setAlert(err.error || 'No se pudo anular la venta', 'error');
      }
    } catch {
      setAlert('Error de red al intentar anular', 'error');
    }
  };

  const openDevolutionPanel = (sale: Venta) => {
    setDevSale(sale);
    const initialQtys: Record<string, number> = {};
    sale.detalles?.forEach(d => {
      initialQtys[d.articuloId] = 0; // Default devolution quantity to 0
    });
    setDevQuantities(initialQtys);
    setShowDevolutionModal(true);
  };

  const handleDevolutionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!devSale) return;

    // Build the payload
    const itemsDevueltos = (Object.entries(devQuantities) as [string, number][])
      .filter(([_, qty]) => qty > 0)
      .map(([artId, qty]) => ({
        articuloId: artId,
        cantidad: qty
      }));

    if (itemsDevueltos.length === 0) {
      setAlert('Debe especificar al menos una unidad para devolver.', 'error');
      return;
    }

    setSubmittingDev(true);
    try {
      const res = await fetch('/api/ventas/devolucion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          ventaId: devSale.id,
          itemsDevueltos,
          motivo: devMotivo
        })
      });

      const resJson = await res.json();
      if (!res.ok) {
        setAlert(resJson.error || 'Error procesando la devolución', 'error');
      } else {
        setAlert('¡Devolución ejecutada con éxito! Inventario reincorporado.', 'success');
        setShowDevolutionModal(false);
        setDevSale(null);
        fetchSalesList(currentPage);
        fetchStats();
      }
    } catch {
      setAlert('Error de conexión al enviar devolución', 'error');
    } finally {
      setSubmittingDev(false);
    }
  };

  const tasaBcvVal = pymeConfig?.tasaBcv ?? 45.50;

  return (
    <div className="space-y-6 animate-fade-in text-slate-705">
      
      {/* Search filters & tools header */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 mb-6">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center gap-2">
              <ClipboardList className="text-blue-500" size={18} /> Auditoría y Lista de Ventas
            </h2>
            <p className="text-slate-400 text-xs">Gestione historial de transacciones, devoluciones de stock y anulaciones.</p>
          </div>
          <button
            onClick={() => fetchSalesList(1)}
            className="p-2 bg-slate-50 hover:bg-slate-100 border border-slate-205 rounded-xl text-slate-600 transition-all cursor-pointer flex items-center gap-2 text-xs font-bold"
          >
            <RefreshCw size={14} /> Refrescar Lista
          </button>
        </div>

        {/* Filter items grid */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 bg-slate-50/50 p-4 rounded-xl border border-slate-100">
          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Estado de Transacción</label>
            <div className="relative">
              <select
                value={estadoFilter}
                onChange={e => setEstadoFilter(e.target.value)}
                className="w-full bg-white border border-slate-200 text-slate-655 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500 cursor-pointer"
              >
                <option value="">TODOS</option>
                <option value="PAGADA">PAGADAS</option>
                <option value="PENDIENTE">PENDIENTES</option>
                <option value="ANULADA">ANULADAS</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Desde Fecha</label>
            <input
              type="date"
              value={fechaInicio}
              onChange={e => setFechaInicio(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-655 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div>
            <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1">Hasta Fecha</label>
            <input
              type="date"
              value={fechaFin}
              onChange={e => setFechaFin(e.target.value)}
              className="w-full bg-white border border-slate-200 text-slate-655 rounded-lg p-2.5 text-xs focus:outline-none focus:border-blue-500"
            />
          </div>

          <div className="flex items-end">
            <button
              onClick={() => {
                setEstadoFilter('');
                setFechaInicio('');
                setFechaFin('');
              }}
              className="w-full py-2.5 bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer text-center"
            >
              Resetear Filtros
            </button>
          </div>
        </div>
      </div>

      {/* Main Table view */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm">
        {loadingSales ? (
          <div className="text-center py-12 text-slate-400 text-xs">Cargando transacciones de POS...</div>
        ) : sales.length === 0 ? (
          <div className="text-center py-16 text-slate-400 text-xs">
            📭 No se han registrado facturas bajo los parámetros seleccionados.
          </div>
        ) : (
          <div className="space-y-6">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-100 text-[10px] text-slate-500 font-extrabold">
                    <th className="py-3 px-4 uppercase">Factura / Ticket ID</th>
                    <th className="py-3 px-4 uppercase">Fecha y Hora</th>
                    <th className="py-3 px-4 uppercase">Cliente</th>
                    <th className="py-3 px-4 text-right uppercase">Total Neto (USD / Bs.)</th>
                    <th className="py-3 px-4 text-center uppercase">Medio Pago</th>
                    <th className="py-3 px-4 text-center uppercase">Estado</th>
                    <th className="py-3 px-4 text-center uppercase">Acciones</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {sales.map((item) => (
                    <tr key={item.id} className="text-slate-600 hover:bg-slate-50 transition-colors">
                      <td className="py-3.5 px-4 font-mono text-blue-600 font-bold uppercase">
                        <div>{item.nro_factura_fiscal || `COMP-${item.id.slice(-8).toUpperCase()}`}</div>
                        <div className="text-[9px] text-slate-400 font-normal lowercase">id: {item.id.slice(-8)}</div>
                      </td>
                      <td className="py-3.5 px-4 text-slate-450">
                        {new Date(item.fecha).toLocaleString('es-VE')}
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="block font-semibold text-slate-800">{item.cliente?.nombre || 'General'}</span>
                        <span className="text-[10px] text-slate-400 uppercase font-mono">{item.cliente?.rif || 'Cobro de caja'}</span>
                      </td>
                      <td className="py-3.5 px-4 text-right font-mono pr-8">
                        <div className="font-extrabold text-slate-800">${(item.total_neto + (item.igtf_monto || 0)).toFixed(2)}</div>
                        <div className="text-[10px] text-purple-700 font-semibold">
                          {(item.total_ves || ((item.total_neto + (item.igtf_monto || 0)) * (item.tasa_bcv || tasaBcvVal))).toFixed(2)} Bs
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="px-2 py-0.5 bg-slate-105 text-slate-600 rounded-full font-bold text-[9px] uppercase tracking-wide">
                          {item.metodo_pago}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`px-2 py-0.5 rounded-full font-bold text-[9.5px] uppercase tracking-wide ${
                          item.estado === 'PAGADA' 
                            ? 'bg-emerald-50 text-emerald-650' 
                            : item.estado === 'PENDIENTE'
                              ? 'bg-amber-50 text-amber-600'
                              : 'bg-red-50 text-red-650'
                        }`}>
                          {item.estado}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <button
                            onClick={() => setSelectedSale(item)}
                            className="p-1 px-2.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer"
                          >
                            <Eye size={12} /> Detalle
                          </button>
                          {item.estado !== 'ANULADA' && (
                            <>
                              <button
                                onClick={() => openDevolutionPanel(item)}
                                className="p-1 px-2.5 bg-blue-550 hover:bg-blue-600 text-white rounded-md transition-all font-semibold flex items-center gap-1 cursor-pointer"
                              >
                                <ArrowLeft size={12} /> Devolución
                              </button>
                              <button
                                onClick={() => handleAnular(item.id)}
                                className="p-1 px-2 bg-red-50 hover:bg-red-105 text-red-650 rounded-md transition-all cursor-pointer"
                                title="Anular Factura"
                              >
                                <Trash2 size={12} />
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination block */}
            {totalPages > 1 && (
              <div className="flex justify-center items-center gap-3 pt-4 border-t border-slate-100 text-xs">
                <button
                  disabled={currentPage <= 1}
                  onClick={() => fetchSalesList(currentPage - 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Anterior
                </button>
                <span className="font-semibold text-slate-500">Página {currentPage} de {totalPages}</span>
                <button
                  disabled={currentPage >= totalPages}
                  onClick={() => fetchSalesList(currentPage + 1)}
                  className="px-3 py-1.5 bg-slate-100 hover:bg-slate-200 rounded-lg text-slate-600 font-bold transition-all disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
                >
                  Siguiente
                </button>
              </div>
            )}
          </div>
        )}
      </div>

      {/* DETAILED INVOICE DIALOG MODAL WITH RE-PRINT OPTION */}
      {selectedSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-2xl shadow-2xl p-6 relative animate-scale-in">
            <button
              onClick={() => setSelectedSale(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <h3 className="text-sm font-black text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <Coins className="text-purple-650" /> Auditoría de Venta {selectedSale.nro_factura_fiscal || `#${selectedSale.id.slice(-8).toUpperCase()}`}
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-6 items-start">
              {/* Left Column: DB values breakdown */}
              <div className="md:col-span-6 space-y-4">
                <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs">
                  <div>
                    <span className="block text-slate-400 font-bold text-[10px] uppercase">Razón Social Cliente:</span>
                    <span className="font-bold text-slate-805">{selectedSale.cliente?.nombre || 'General'}</span>
                  </div>
                  <div>
                    <span className="block text-slate-400 font-bold text-[10px] uppercase">Registro Fiscal (RIF/CI):</span>
                    <span className="font-mono text-slate-700 font-bold">{selectedSale.cliente?.rif || 'N/A'}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <span className="block text-slate-400 font-bold text-[10px] uppercase">Fecha Emisión:</span>
                      <span className="text-slate-700 font-medium">{new Date(selectedSale.fecha).toLocaleString()}</span>
                    </div>
                    <div>
                      <span className="block text-slate-400 font-bold text-[10px] uppercase">Medio de Pago:</span>
                      <span className="font-bold text-blue-650">{selectedSale.metodo_pago}</span>
                    </div>
                  </div>
                </div>

                {/* DB values list for auditing bimonetary details */}
                <div className="bg-purple-50/50 border border-purple-100 rounded-xl p-4 space-y-2 text-xs">
                  <span className="block text-[10px] font-black text-purple-800 uppercase tracking-wide">Desglose Localización (Doble Divisa)</span>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Tasa de Cambio BCV:</span>
                    <span className="font-mono font-bold text-slate-700">{(selectedSale.tasa_bcv || tasaBcvVal).toFixed(2)} Bs.</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Total Impuesto IVA:</span>
                    <span className="font-mono font-semibold text-slate-700">${selectedSale.total_impuesto.toFixed(2)} / {(selectedSale.total_impuesto * (selectedSale.tasa_bcv || tasaBcvVal)).toFixed(2)} Bs.</span>
                  </div>
                  {selectedSale.igtf_monto ? (
                    <div className="flex justify-between text-red-700 font-semibold">
                      <span>Impuesto IGTF (3%):</span>
                      <span className="font-mono">+${selectedSale.igtf_monto.toFixed(2)} / {selectedSale.igtf_ves?.toFixed(2)} Bs.</span>
                    </div>
                  ) : null}
                  <div className="flex justify-between pt-1 border-t border-purple-200/50 text-slate-700 font-bold">
                    <span>Monto Total USD:</span>
                    <span className="font-mono">${(selectedSale.total_neto + (selectedSale.igtf_monto || 0)).toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between text-purple-900 font-black">
                    <span>Monto Total VES:</span>
                    <span className="font-mono">{(selectedSale.total_ves || ((selectedSale.total_neto + (selectedSale.igtf_monto || 0)) * (selectedSale.tasa_bcv || tasaBcvVal))).toFixed(2)} Bs.</span>
                  </div>
                  
                  {/* Mixed payments check */}
                  {(selectedSale.monto_pagado_usd || selectedSale.monto_pagado_ves) ? (
                    <div className="pt-2 border-t border-purple-200/35 space-y-1 text-[11px] text-slate-500 font-medium">
                      <span className="block text-[9px] font-bold text-slate-400 uppercase">Detalle de Cobro en Caja:</span>
                      {selectedSale.monto_pagado_usd > 0 && <p>• Efectivo Divisas: ${selectedSale.monto_pagado_usd.toFixed(2)}</p>}
                      {selectedSale.monto_pagado_ves > 0 && <p>• Bolívares: {selectedSale.monto_pagado_ves.toFixed(2)} Bs.</p>}
                    </div>
                  ) : null}
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={handlePrint}
                    className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <Printer size={14} /> Re-imprimir Ticket
                  </button>
                  <button
                    onClick={() => setSelectedSale(null)}
                    className="px-4 py-3 bg-slate-100 hover:bg-slate-200 text-slate-650 rounded-xl text-xs font-bold uppercase transition-all border border-slate-250 cursor-pointer"
                  >
                    Cerrar
                  </button>
                </div>
              </div>

              {/* Right Column: Ticket Preview Render */}
              <div className="md:col-span-6 bg-slate-100 rounded-xl p-4 max-h-[420px] overflow-y-auto border border-slate-200">
                <span className="block text-[9px] font-black text-slate-405 uppercase tracking-wider mb-2 text-center">Vista Previa del Formato Impreso</span>
                
                {/* Printable Node Frame */}
                <div 
                  ref={ticketRef} 
                  className="p-6 bg-white border border-slate-150 text-slate-800 shadow-sm leading-normal text-xs uppercase font-mono max-w-sm mx-auto"
                  style={{ fontFamily: "'Courier New', Courier, monospace" }}
                >
                  <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                    <h3 className="text-sm font-black tracking-widest text-[#0f172a] mb-1">*** {pymeConfig?.nombre || "IKER POSPYME, C.A."} ***</h3>
                    <p className="text-[9px] text-slate-550 mb-0.5">RIF: {pymeConfig?.rif || "J-40912185-0"}</p>
                    {pymeConfig?.telefono && <p className="text-[9px] text-slate-550 mb-0.5">TLF: {pymeConfig?.telefono}</p>}
                    <p className="text-[9px] text-slate-550 leading-snug line-clamp-2">DIR: {pymeConfig?.direccion || "CARACAS, VENEZUELA"}</p>
                  </div>

                  <div className="space-y-1 text-[9px] text-slate-605 border-b border-dashed border-slate-300 pb-3 mb-3">
                    {pymeConfig?.formatoFactura === 'FISCAL' || selectedSale.nro_factura_fiscal ? (
                      <>
                        <p className="font-extrabold text-slate-900">FACTURA FISCAL NRO: {selectedSale.nro_factura_fiscal}</p>
                        <p className="font-bold">NRO CONTROL: FACT-{selectedSale.id.slice(-8).toUpperCase()}</p>
                      </>
                    ) : (
                      <p className="font-bold">COMPROBANTE ESTÁNDAR NRO: {selectedSale.id.slice(-8).toUpperCase()}</p>
                    )}
                    <p><span className="font-bold">Fecha:</span> {new Date(selectedSale.fecha).toLocaleString('es-VE')}</p>
                    <p><span className="font-bold">Cliente:</span> {selectedSale.cliente?.nombre || 'General'}</p>
                    <p><span className="font-bold">RIF/C.I.:</span> {selectedSale.cliente?.rif || 'N/A'}</p>
                    <p><span className="font-bold">Medio de Pago:</span> {selectedSale.metodo_pago}</p>
                  </div>

                  {/* Items list */}
                  <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                    <table className="w-full text-left text-[9px] border-collapse">
                      <thead>
                        <tr className="font-bold text-slate-700 border-b border-dashed border-slate-200">
                          <th className="pb-1 uppercase">Cant. / Desc.</th>
                          <th className="pb-1 text-right uppercase">Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-dashed divide-slate-150">
                        {selectedSale.detalles?.map((det: any) => (
                          <tr key={det.id} className="text-slate-605">
                            <td className="py-2.5">
                              <span className="block font-bold">{det.articulo?.nombre || `Item #${(det.articuloId || '').slice(-4).toUpperCase()}`}</span>
                              <span className="block text-[8px] text-slate-400">{det.cantidad} x ${det.precio_unitario?.toFixed(2)}</span>
                              {det.articulo?.es_combo && det.articulo?.componentes && det.articulo.componentes.length > 0 && (
                                <span className="block text-[8px] text-purple-700/80 italic font-sans mt-0.5">
                                  [INCLUYE: {det.articulo.componentes.map((comp: any) => `${comp.cantidad * det.cantidad}x ${comp.componente?.nombre || 'PRODUCTO'}`).join(', ')}]
                                </span>
                              )}
                            </td>
                            <td className="py-2.5 text-right font-bold valign-middle">${(det.subtotal || (det.cantidad * det.precio_unitario)).toFixed(2)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  {/* Summary Block */}
                  <div className="space-y-1 text-right text-[9px] text-slate-650 pr-1">
                    <p>Subtotal: <span className="font-bold">${selectedSale.total_bruto.toFixed(2)}</span></p>
                    {selectedSale.descuento > 0 && (
                      <p>Descuento: <span className="font-bold">-${selectedSale.descuento.toFixed(2)}</span></p>
                    )}
                    <p>Impuesto IVA ({pymeConfig?.impuestoPorcentaje ?? 16}%): <span className="font-bold">${selectedSale.total_impuesto.toFixed(2)}</span></p>
                    
                    {selectedSale.igtf_monto > 0 && (
                      <p className="text-red-750 font-bold">IGTF Percibido (3%): <span className="font-bold">+${selectedSale.igtf_monto.toFixed(2)}</span></p>
                    )}

                    {/* Final Totals */}
                    <div className="text-[10px] font-extrabold text-[#0f172a] pt-1.5 border-t border-dashed border-slate-300 mt-1 flex justify-between">
                      <span>TOTAL NETO USD:</span>
                      <span>${(selectedSale.total_neto + (selectedSale.igtf_monto || 0)).toFixed(2)}</span>
                    </div>

                    <div className="text-[10px] font-extrabold text-purple-800 mt-1 flex justify-between border-t border-dashed border-slate-205 pt-1">
                      <span>TOTAL NETO VES:</span>
                      <span>{(selectedSale.total_ves || ((selectedSale.total_neto + (selectedSale.igtf_monto || 0)) * (selectedSale.tasa_bcv || tasaBcvVal))).toFixed(2)} Bs.</span>
                    </div>

                    <div className="text-[8px] text-slate-400 italic text-right mt-0.5 font-mono">
                      Tasa Oficial BCV: {(selectedSale.tasa_bcv || tasaBcvVal).toFixed(2)} Bs.
                    </div>
                  </div>

                  {/* Fiscal footer footer */}
                  {(pymeConfig?.formatoFactura === 'FISCAL' || selectedSale.nro_factura_fiscal) && (
                    <div className="text-center font-bold border-t border-dashed border-slate-350 pt-2.5 mt-3 text-[9px] tracking-widest text-slate-900">
                      *** SENIAT TICKET FISCAL ***
                    </div>
                  )}

                  <div className="text-center pt-3 mt-3 border-t border-dashed border-slate-300 text-[8px] text-slate-400">
                    <p className="font-bold italic uppercase">{pymeConfig?.mensajePieFactura || "¡Gracias por su compra!"}</p>
                    <p className="text-[7px] mt-1.5 font-mono">IkerPOSPyME - Impresora Homologada SENIAT</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* DEVOUTION CONTROLS MODAL */}
      {showDevolutionModal && devSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            <button
              onClick={() => {
                setShowDevolutionModal(false);
                setDevSale(null);
              }}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>

            <h3 className="text-sm font-bold text-slate-800 mb-2 uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle className="text-amber-500" size={17} /> Formulario de Devolución
            </h3>
            <p className="text-slate-400 text-xs mb-4">Especifique el número de unidades devueltas al inventario comercial de cada artículo.</p>

            <form onSubmit={handleDevolutionSubmit} className="space-y-5">
              <div className="border border-slate-100 rounded-xl overflow-hidden divide-y divide-slate-100">
                {devSale.detalles?.map(d => {
                  const maxQty = d.cantidad;
                  const currentDev = devQuantities[d.articuloId] || 0;

                  return (
                    <div key={d.id} className="p-4 flex items-center justify-between text-xs bg-[#F8FAFC]">
                      <div className="flex-1 min-w-0 pr-3">
                        <span className="block font-bold text-slate-800 truncate">{d.articulo?.nombre}</span>
                        <span className="block text-[10px] text-slate-400">Comprado: {maxQty} unidades a ${d.precio_unitario}</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Devolver</span>
                        <input
                          type="number"
                          min="0"
                          max={maxQty}
                          value={currentDev}
                          onChange={e => {
                            const val = Math.min(maxQty, Math.max(0, parseInt(e.target.value) || 0));
                            setDevQuantities({
                              ...devQuantities,
                              [d.articuloId]: val
                            });
                          }}
                          className="w-16 bg-white border border-slate-200 rounded p-1 text-center font-mono font-bold text-slate-700 focus:outline-none"
                        />
                        <span className="text-slate-405 font-semibold text-[10px] w-12">/ {maxQty} uds</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">Motivo de Devolución / Comentario</label>
                <textarea
                  required
                  value={devMotivo}
                  onChange={e => setDevMotivo(e.target.value)}
                  placeholder="Ej. Artículo defectuoso, el cliente canceló la orden para cambio de modelo..."
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 font-sans"
                  rows={3}
                />
              </div>

              <div className="flex gap-4">
                <button
                  type="submit"
                  disabled={submittingDev}
                  className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider transition-all cursor-pointer shadow-md disabled:opacity-50"
                >
                  {submittingDev ? 'Procesando Reintegro...' : 'Confirmar y Reingresar stock'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDevolutionModal(false);
                    setDevSale(null);
                  }}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold py-3 px-4 rounded-xl text-xs uppercase cursor-pointer"
                >
                  Cancelar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
}
