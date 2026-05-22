import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { 
  ArrowLeftRight, Search, FileSpreadsheet, RefreshCcw, 
  Trash2, AlertTriangle, ShieldCheck, CheckCircle2, DollarSign, Calendar
} from 'lucide-react';

interface DevItem {
  articuloId: string;
  nombre: string;
  cantidadComprada: number;
  precioUnitario: number;
  cantidadDevolver: number;
}

export default function DevolucionesView() {
  const { user, setAlert, fetchStats } = useStore();
  const [invoiceQuery, setInvoiceQuery] = useState('');
  const [matchingSale, setMatchingSale] = useState<any | null>(null);
  const [searching, setSearching] = useState(false);
  
  // Devolution list
  const [devItems, setDevItems] = useState<DevItem[]>([]);
  const [motivo, setMotivo] = useState('Cliente solicitó cambio / Devolución');
  const [processing, setProcessing] = useState(false);
  const [creditNote, setCreditNote] = useState<any | null>(null);

  // Search logic
  const handleSearchInvoice = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!invoiceQuery.trim()) {
      setAlert('Por favor ingrese un número de factura válido', 'error');
      return;
    }

    setSearching(true);
    setMatchingSale(null);
    setCreditNote(null);
    try {
      // Look up within the paginated ventas endpoint or type lookup
      const res = await fetch(`/api/ventas`, {
        headers: { 'Authorization': `Bearer ${user?.token}` }
      });
      if (res.ok) {
        const json = await res.json();
        const salesList = json.data || [];
        
        // Find exact or partial match of ID
        const cleanQuery = invoiceQuery.trim().toLowerCase();
        const found = salesList.find((s: any) => 
          s.id.toLowerCase() === cleanQuery || 
          s.id.toLowerCase().endsWith(cleanQuery)
        );

        if (found) {
          if (found.estado === 'ANULADA') {
            setAlert('Esta factura ya ha sido ANULADA por completo.', 'error');
          }
          setMatchingSale(found);
          // Initialize items
          const initialDevList: DevItem[] = (found.detalles || []).map((d: any) => ({
            articuloId: d.articuloId,
            nombre: d.articulo?.nombre || `Artículo #${d.articuloId.slice(-4)}`,
            cantidadComprada: d.cantidad,
            precioUnitario: d.precio_unitario,
            cantidadDevolver: 0
          }));
          setDevItems(initialDevList);
        } else {
          setAlert('No se encontró ninguna factura activa correspondiente a ese ID.', 'error');
        }
      } else {
        setAlert('Error cargando lista de ventas para validación', 'error');
      }
    } catch (err) {
      setAlert('Error de red al buscar el comprobante de venta', 'error');
    } finally {
      setSearching(false);
    }
  };

  // Live total to refund computation
  const totalReintegrar = devItems.reduce((sum, item) => sum + (item.cantidadDevolver * item.precioUnitario), 0);

  // Deletion/Process call
  const handleProcessRefund = async () => {
    const itemsDevueltos = devItems
      .filter(item => item.cantidadDevolver > 0)
      .map(item => ({
        articuloId: item.articuloId,
        cantidad: item.cantidadDevolver
      }));

    if (itemsDevueltos.length === 0) {
      setAlert('Especifique una cantidad mayor a 0 para al menos un artículo', 'error');
      return;
    }

    setProcessing(true);
    try {
      const payload = {
        ventaId: matchingSale.id,
        itemsDevueltos,
        motivo
      };

      const res = await fetch('/api/ventas/devolucion', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload)
      });

      const resJson = await res.json();
      if (!res.ok) {
        setAlert(resJson.error || 'Malformación al registrar devolución', 'error');
      } else {
        setAlert('¡Devolución registrada! Impresora virtual emitió Nota de Crédito.', 'success');
        setCreditNote({
          id: resJson.devolution?.id || `NC-${Math.random().toString(36).substr(2, 9).toUpperCase()}`,
          ventaId: matchingSale.id,
          cliente: matchingSale.cliente,
          items: devItems.filter(i => i.cantidadDevolver > 0),
          motivo: motivo,
          total: totalReintegrar,
          fecha: new Date().toISOString()
        });
        setMatchingSale(null);
        setDevItems([]);
        fetchStats();
      }
    } catch (err) {
      setAlert('Error de conexión al procesar reversa', 'error');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-700">
      
      {/* Visual Title Area */}
      <div>
        <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
          Gestión de Devoluciones (Reversa) <ArrowLeftRight className="text-blue-500" />
        </h1>
        <p className="text-slate-500 text-sm mt-1">Conduzca operaciones de reincorporación de existencias a partir de facturación emitida.</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* LEFT COLUMN: Input Search Venta */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
            <h2 className="text-base font-bold text-slate-800 mb-2 uppercase tracking-wider text-[11px] text-slate-400">
              Paso 1: Localizar Factura Original
            </h2>
            <form onSubmit={handleSearchInvoice} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                  ID o Sufijo de Factura (Venta)
                </label>
                <div className="relative">
                  <input
                    type="text"
                    required
                    value={invoiceQuery}
                    onChange={e => setInvoiceQuery(e.target.value)}
                    placeholder="Ej. cl9xzy o ID de factura completo..."
                    className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl py-3 pl-4 pr-12 text-xs font-semibold uppercase font-mono text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                  />
                  <button
                    type="submit"
                    disabled={searching}
                    className="absolute inset-y-1 right-1 px-3.5 bg-blue-600 text-white rounded-lg flex items-center justify-center cursor-pointer hover:bg-blue-500 transition-all text-[11px] font-bold"
                  >
                    {searching ? <RefreshCcw size={14} className="animate-spin" /> : 'Buscar'}
                  </button>
                </div>
              </div>
            </form>

            <div className="mt-4 pt-4 border-t border-slate-100">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block mb-1">Pautas de Negocio</span>
              <ul className="text-[10px] text-slate-400 list-disc list-inside space-y-1">
                <li>Solo se pueden reintegrar inventarios de facturas confirmadas.</li>
                <li>La cantidad devuelta no puede superar la comprada inicialmente.</li>
                <li>Las reversas alimentan automáticamente el Kárdex en tiempo real.</li>
              </ul>
            </div>
          </div>

          {/* ACTIVE REFUND SUMMARY NOTE */}
          {creditNote && (
            <div className="bg-emerald-55/10 border border-emerald-200 shadow-sm rounded-2xl p-6 animate-scale-up space-y-4">
              <div className="flex items-center gap-2 border-b border-dashed border-emerald-200 pb-3">
                <div className="h-8 w-8 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-600">
                  <ShieldCheck size={18} />
                </div>
                <div>
                  <h3 className="text-xs font-black text-slate-800 uppercase tracking-wider">Nota de Crédito Emitida</h3>
                  <p className="text-[9px] font-mono font-bold text-slate-400 uppercase">Ref: {creditNote.id}</p>
                </div>
              </div>

              <div className="space-y-2 text-[11px] font-mono text-slate-600">
                <p><strong>Factura Relacionada:</strong> #{creditNote.ventaId.slice(-8).toUpperCase()}</p>
                <p><strong>Cliente:</strong> {creditNote.cliente?.nombre || 'General'}</p>
                <p><strong>Motivo especificado:</strong> {creditNote.motivo}</p>
                <p><strong>Fecha:</strong> {new Date(creditNote.fecha).toLocaleString()}</p>

                <div className="border-t border-dashed border-slate-200 pt-2 mt-2">
                  <p className="text-[9px] text-slate-400 uppercase font-bold tracking-wider mb-1">Bienes Reincorporados</p>
                  {creditNote.items.map((it: any, index: number) => (
                    <div key={index} className="flex justify-between text-[10px]">
                      <span>{it.cantidadDevolver} uds x {it.nombre}</span>
                      <span>${(it.cantidadDevolver * it.precioUnitario).toFixed(2)}</span>
                    </div>
                  ))}
                </div>

                <div className="border-t border-dashed border-slate-200 pt-2 flex justify-between font-bold text-slate-800 text-xs">
                  <span>TOTAL A REINTEGRAR:</span>
                  <span className="text-emerald-600">${creditNote.total.toFixed(2)}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Products list & amounts */}
        <div className="lg:col-span-7">
          {matchingSale ? (
            <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 space-y-6 animate-scale-up">
              
              <div className="flex justify-between items-start border-b border-slate-100 pb-4">
                <div>
                  <h2 className="text-base font-bold text-slate-800 uppercase text-xs tracking-wider text-slate-500 flex items-center gap-1.5">
                    <FileSpreadsheet size={15} className="text-blue-500" /> Paso 2 & 3: Artículos de Factura #{matchingSale.id.slice(-8).toUpperCase()}
                  </h2>
                  <p className="text-slate-400 text-[11px] mt-1">Especifique el número de artículos que se devuelven físicamente de esta factura.</p>
                </div>
                <div className="text-right">
                  <span className="text-[10px] bg-blue-50 text-blue-600 rounded-full font-bold uppercase px-2 py-0.5 tracking-wider block">
                    {matchingSale.metodo_pago}
                  </span>
                  <span className="text-[9px] text-slate-400 block mt-1">{new Date(matchingSale.fecha).toLocaleDateString()}</span>
                </div>
              </div>

              {/* Items grid loop */}
              <div className="divide-y divide-slate-100 border border-slate-100 rounded-xl overflow-hidden">
                {devItems.map((item, index) => {
                  return (
                    <div key={item.articuloId} className="p-4 bg-slate-50/50 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 text-xs font-semibold">
                      <div className="flex-1 min-w-0">
                        <span className="block font-bold text-slate-800 text-sm truncate">{item.nombre}</span>
                        <span className="text-[10px] text-slate-400 font-mono">
                          Lote unitario: ${item.precioUnitario.toFixed(2)} | Cantidad Adquirida: {item.cantidadComprada} uds
                        </span>
                      </div>

                      <div className="flex items-center gap-3 self-end sm:self-auto">
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Devolver</span>
                        <input
                          type="number"
                          min="0"
                          max={item.cantidadComprada}
                          value={item.cantidadDevolver || ''}
                          onChange={e => {
                            const val = Math.min(item.cantidadComprada, Math.max(0, parseInt(e.target.value) || 0));
                            const updated = [...devItems];
                            updated[index].cantidadDevolver = val;
                            setDevItems(updated);
                          }}
                          className="w-16 bg-white border border-slate-200 rounded-lg p-2 text-center text-slate-700 font-bold focus:outline-none focus:border-blue-500 font-mono text-xs"
                        />
                        <span className="text-slate-400 text-[10px] font-sans w-12">/ {item.cantidadComprada} uds</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Motivation commentary */}
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-2">
                  Motivo o Justificación del Reintegro
                </label>
                <textarea
                  required
                  value={motivo}
                  onChange={e => setMotivo(e.target.value)}
                  placeholder="Por favor describa brevemente el porqué de la reversa de inventario..."
                  rows={3}
                  className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl p-3 text-xs text-slate-700 placeholder-slate-400 focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Total display & submit block */}
              <div className="pt-4 border-t border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                <div className="space-y-1">
                  <span className="text-slate-400 text-[10px] font-bold uppercase tracking-wider block">Monto total de reembolso</span>
                  <span className="text-2xl font-black text-slate-800 font-mono tracking-tight flex items-center text-blue-600 bg-blue-50/50 px-3 py-1.5 rounded-xl border border-blue-100/10">
                    <DollarSign size={20} /> {totalReintegrar.toFixed(2)} USD
                  </span>
                </div>

                <button
                  type="button"
                  onClick={handleProcessRefund}
                  disabled={processing || totalReintegrar <= 0}
                  className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold px-6 py-4 rounded-xl text-xs uppercase tracking-wide flex items-center gap-2 cursor-pointer transition-all hover:shadow-lg disabled:cursor-not-allowed uppercase"
                >
                  {processing ? 'Procesando Reversa...' : 'Procesar Devolución'}
                </button>
              </div>

            </div>
          ) : (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-2xl py-24 text-center text-slate-400 text-xs">
              👈 Por favor ingrese un número de factura y presione "Buscar" para iniciar la auditoría de reversibilidad.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
