import React, { useState, useEffect, useRef } from 'react';
import { useStore } from '../store.js';
import { useReactToPrint } from 'react-to-print';
import { 
  ShoppingCart, Search, User, CreditCard, Trash2, 
  Plus, Minus, Sparkles, CheckSquare, ShieldAlert,
  Printer, Check, PlusCircle, UserPlus, X, Mic, MicOff,
  Coins, QrCode
} from 'lucide-react';
import { Articulo } from '../types.js';
import { useVentaStore, calcularStockComboSimple } from '../useVentaStore.js';

export default function POSView() {
  const { 
    articulos, 
    clientes, 
    setAlert, 
    fetchStats, 
    fetchVentas, 
    fetchArticulos, 
    fetchClientes,
    user,
    pymeConfig,
  } = useStore();

  const {
    cart,
    addToCart,
    updateQty,
    removeFromCart,
    clearCart,
    descuento,
    setDescuento,
    metodoPago,
    setMetodoPago,
    selectedCustomerId,
    setSelectedCustomerId,
    getTotals
  } = useVentaStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loadingSearch, setLoadingSearch] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successSale, setSuccessSale] = useState<any | null>(null);

  // Voice command state
  const [isListening, setIsListening] = useState(false);
  const recognitionRef = useRef<any>(null);

  // Venezuelan Double Currency Checkout Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [metodoPagoSeleccionado, setMetodoPagoSeleccionado] = useState<'EFECTIVO_USD' | 'EFECTIVO_VES' | 'PAGO_MOVIL' | 'TARJETA' | 'MIXTO'>('EFECTIVO_USD');
  const [montoPagadoUSD, setMontoPagadoUSD] = useState<number>(0);
  const [montoPagadoVES, setMontoPagadoVES] = useState<number>(0);

  useEffect(() => {
    const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.lang = 'es-ES';
      rec.continuous = false;
      rec.interimResults = false;

      rec.onstart = () => {
        setIsListening(true);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      rec.onerror = (e: any) => {
        console.error('Speech recognition error:', e);
        setIsListening(false);
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript.toLowerCase().trim();
        console.log('Voice match received:', transcript);

        let matchTerm = transcript;
        if (transcript.startsWith('agregar ')) {
          matchTerm = transcript.replace('agregar ', '').trim();
        } else if (transcript.startsWith('añadir ')) {
          matchTerm = transcript.replace('añadir ', '').trim();
        } else if (transcript.startsWith('buscar ')) {
          matchTerm = transcript.replace('buscar ', '').trim();
        } else if (transcript.startsWith('busca ')) {
          matchTerm = transcript.replace('busca ', '').trim();
        }

        // Search in local stock first
        const matched = articulos.find(art => 
          art.nombre.toLowerCase().includes(matchTerm) ||
          art.codigo.toLowerCase() === matchTerm
        );

        if (matched) {
          addToCart(matched);
          setAlert(`Voz: Se agregó "${matched.nombre}" al carrito.`, 'success');
        } else {
          setSearchQuery(matchTerm);
          setAlert(`Voz: No se encontró "${matchTerm}". Atajo de búsqueda activado.`, 'error');
        }
      };

      recognitionRef.current = rec;
    }
  }, [articulos, addToCart, setAlert]);

  const toggleListening = () => {
    if (!recognitionRef.current) {
      setAlert('La API de reconocimiento de voz no es compatible con este navegador.', 'error');
      return;
    }

    if (isListening) {
      recognitionRef.current.stop();
    } else {
      try {
        recognitionRef.current.start();
      } catch (err) {
        console.error('Failed to start speech recognition:', err);
      }
    }
  };

  // Quick effect to sync or debounced-fetch search results from backend
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults(articulos);
      return;
    }

    const delayDebounce = setTimeout(async () => {
      setLoadingSearch(true);
      try {
        const res = await fetch(`/api/articulos/search?q=${encodeURIComponent(searchQuery)}`, {
          headers: {
            'Authorization': `Bearer ${user?.token}`
          }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        } else {
          // Local fallback
          const localMatch = articulos.filter(art => 
            art.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
            art.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
            art.categoria.toLowerCase().includes(searchQuery.toLowerCase())
          );
          setSearchResults(localMatch);
        }
      } catch (err) {
        // Local fallback
        const localMatch = articulos.filter(art => 
          art.nombre.toLowerCase().includes(searchQuery.toLowerCase()) || 
          art.codigo.toLowerCase().includes(searchQuery.toLowerCase()) ||
          art.categoria.toLowerCase().includes(searchQuery.toLowerCase())
        );
        setSearchResults(localMatch);
      } finally {
        setLoadingSearch(false);
      }
    }, 250);

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, articulos, user]);

  // New customer creation quick modal
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [newCustRif, setNewCustRif] = useState('');
  const [newCustNombre, setNewCustNombre] = useState('');
  const [newCustEmail, setNewCustEmail] = useState('');
  const [newCustTelefono, setNewCustTelefono] = useState('');
  const [newCustLimit, setNewCustLimit] = useState(1000);

  // Reference for thermal ticket printing
  const ticketRef = useRef<HTMLDivElement>(null);

  const handlePrint = useReactToPrint({
    contentRef: ticketRef,
  });

  // Auto-select first client if available on load
  useEffect(() => {
    if (clientes.length > 0 && !selectedCustomerId) {
      setSelectedCustomerId(clientes[0].id);
    }
  }, [clientes, selectedCustomerId, setSelectedCustomerId]);

  const activeCustomer = clientes.find(c => c.id === selectedCustomerId);

  // Bill arithmetic totals
  const { totalBruto, totalBase, totalImpuesto, totalNeto } = getTotals();

  // Credit limits validation check
  const isCreditExceeded = activeCustomer ? (totalNeto > activeCustomer.deuda_limite) : false;

  // Localized calculations
  const tasaBcvVal = pymeConfig?.tasaBcv ?? 45.50;
  const isIgtfHabilitado = pymeConfig?.habilitarIgtf ?? true;

  // Determine standard IGTF
  let currentIgtfUSD = 0;
  if (isIgtfHabilitado) {
    if (metodoPagoSeleccionado === 'EFECTIVO_USD') {
      currentIgtfUSD = totalNeto * 0.03;
    } else if (metodoPagoSeleccionado === 'MIXTO') {
      currentIgtfUSD = (montoPagadoUSD || 0) * 0.03;
    }
  }

  const finalTotalUSD = totalNeto + currentIgtfUSD;
  const finalTotalVES = finalTotalUSD * tasaBcvVal;

  // Open localized payment modal
  const handleOpenPayment = () => {
    if (cart.length === 0) {
      setAlert('El carro de compras está vacío', 'error');
      return;
    }
    if (!selectedCustomerId) {
      setAlert('Selecciona un cliente para continuar', 'error');
      return;
    }
    
    // Set defaults
    setMetodoPagoSeleccionado('EFECTIVO_USD');
    setMontoPagadoUSD(parseFloat((totalNeto * 1.03).toFixed(2))); // Default with IGTF
    setMontoPagadoVES(0);
    setShowPaymentModal(true);
  };

  // Sync payments depending on payment method
  useEffect(() => {
    if (!showPaymentModal) return;
    const baseTotalVES = totalNeto * tasaBcvVal;
    
    if (metodoPagoSeleccionado === 'EFECTIVO_USD') {
      setMontoPagadoUSD(parseFloat((totalNeto * (isIgtfHabilitado ? 1.03 : 1.0)).toFixed(2)));
      setMontoPagadoVES(0);
    } else if (metodoPagoSeleccionado === 'EFECTIVO_VES') {
      setMontoPagadoUSD(0);
      setMontoPagadoVES(parseFloat(baseTotalVES.toFixed(2)));
    } else if (metodoPagoSeleccionado === 'PAGO_MOVIL' || metodoPagoSeleccionado === 'TARJETA') {
      setMontoPagadoUSD(0);
      setMontoPagadoVES(parseFloat(baseTotalVES.toFixed(2)));
    } else if (metodoPagoSeleccionado === 'MIXTO') {
      setMontoPagadoUSD(parseFloat((totalNeto / 2).toFixed(2)));
      setMontoPagadoVES(parseFloat((baseTotalVES / 2).toFixed(2)));
    }
  }, [metodoPagoSeleccionado, showPaymentModal, totalNeto, tasaBcvVal, isIgtfHabilitado]);

  // Mixed payments math
  const paidTotalUSD = (montoPagadoUSD || 0) + ((montoPagadoVES || 0) / tasaBcvVal);
  const remainingUSD = finalTotalUSD - paidTotalUSD;
  const changeUSD = Math.max(0, paidTotalUSD - finalTotalUSD);
  const changeVES = changeUSD * tasaBcvVal;

  const isPaymentValid = paidTotalUSD >= (finalTotalUSD - 0.01); // 1 cent safety tolerance

  const handleConfirmPayment = async () => {
    if (!isPaymentValid) {
      setAlert('El monto ingresado no cubre el total de la factura', 'error');
      return;
    }

    setIsSubmitting(true);
    try {
      const parsedMetodoPago = 
        metodoPagoSeleccionado === 'EFECTIVO_USD' ? 'Efectivo USD' :
        metodoPagoSeleccionado === 'EFECTIVO_VES' ? 'Efectivo VES' :
        metodoPagoSeleccionado === 'PAGO_MOVIL' ? 'Pago Móvil' :
        metodoPagoSeleccionado === 'TARJETA' ? 'Punto de Venta' : 'Pago Mixto';

      const payload = {
        clienteId: selectedCustomerId,
        total_bruto: totalBruto,
        descuento: descuento,
        total_impuesto: totalImpuesto,
        total_neto: totalNeto,
        metodo_pago: parsedMetodoPago,
        tasa_bcv: tasaBcvVal,
        total_ves: parseFloat((totalNeto * tasaBcvVal).toFixed(2)),
        igtf_monto: parseFloat(currentIgtfUSD.toFixed(2)),
        igtf_ves: parseFloat((currentIgtfUSD * tasaBcvVal).toFixed(2)),
        monto_pagado_usd: parseFloat((montoPagadoUSD || 0).toFixed(2)),
        monto_pagado_ves: parseFloat((montoPagadoVES || 0).toFixed(2)),
        detalles: cart.map(item => ({
          articuloId: item.articulo.id,
          cantidad: item.cantidad,
          precio_unitario: item.precio_unitario,
          subtotal: item.cantidad * item.precio_unitario
        }))
      };

      const res = await fetch('/api/ventas/nueva', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const error = await res.json();
        setAlert(error.error || 'No se pudo crear la venta', 'error');
      } else {
        const soldVenta = await res.json();
        setSuccessSale(soldVenta);
        setAlert('¡Venta registrada y comprobante de pago emitido!', 'success');
        clearCart();
        setShowPaymentModal(false);
        // Sync lists
        await Promise.all([
          fetchStats(),
          fetchVentas(),
          fetchArticulos()
        ]);
      }
    } catch (e) {
      setAlert('Error de red al registrar la venta', 'error');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleQuickCustomerSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCustRif || !newCustNombre) {
      setAlert('RIF y Nombre del cliente son obligatorios', 'error');
      return;
    }

    try {
      const res = await fetch('/api/clientes', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${user?.token}`
        },
        body: JSON.stringify({
          rif: newCustRif,
          nombre: newCustNombre,
          email: newCustEmail,
          telefono: newCustTelefono,
          deuda_limite: newCustLimit
        })
      });

      const data = await res.json();
      if (!res.ok) {
        setAlert(data.error || 'Error creando cliente', 'error');
      } else {
        setAlert('¡Cliente adicionado exitosamente!', 'success');
        await fetchClientes();
        setSelectedCustomerId(data.id);
        setShowCustomerModal(false);
        // Clean out form
        setNewCustRif('');
        setNewCustNombre('');
        setNewCustEmail('');
        setNewCustTelefono('');
        setNewCustLimit(1000);
      }
    } catch {
      setAlert('Error de red al registrar cliente', 'error');
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 animate-fade-in">
      
      {/* LEFT COLUMN: Fast Item Search Table */}
      <div className="lg:col-span-7 flex flex-col space-y-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6">
          <h2 className="text-base font-bold text-slate-800 flex items-center gap-2 mb-4">
            Buscador de Artículos <Sparkles className="text-blue-500 font-bold" size={17} />
          </h2>

          {/* Search box styling with Voice mic trigger */}
          <div className="flex gap-2 mb-6">
            <div className="relative flex-1">
              <Search className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-slate-400 self-center h-full" size={16} />
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder='Filtre artículos por nombre o categoría... O use comando por voz (Ej: "Agregar Leche")'
                className="w-full bg-[#F8FAFC] border border-slate-200 rounded-xl py-3 pl-11 pr-4 text-slate-700 placeholder-slate-400 text-xs focus:outline-none focus:border-blue-500 transition-all font-sans"
              />
            </div>
            <button
              type="button"
              onClick={toggleListening}
              className={`px-4 rounded-xl border flex items-center justify-center cursor-pointer transition-all ${
                isListening 
                  ? 'bg-red-500 text-white border-red-500 animate-pulse shadow-md shadow-red-500/20 shadow-lg' 
                  : 'bg-emerald-50 border-emerald-100 text-emerald-600 hover:bg-emerald-100'
              }`}
              title={isListening ? 'Grabando... Diga "Agregar [nombre de producto]"' : 'Búsqueda / Comando por Voz'}
            >
              {isListening ? <MicOff size={16} /> : <Mic size={16} />}
            </button>
          </div>

          {/* Products results mapping table */}
          {searchResults.length === 0 ? (
            <div className="bg-slate-50 border border-dashed border-slate-200 rounded-xl p-12 text-center text-slate-400 text-xs">
              {loadingSearch ? 'Buscando artículos en kárdex...' : '🔍 No se encontraron productos coincidentes.'}
            </div>
          ) : (
            <div className="overflow-y-auto max-h-[500px] border border-slate-100 rounded-xl pr-1">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-[#F8FAFC] border-b border-slate-100 text-[10px] text-slate-500 font-extrabold sticky top-0 z-10">
                    <th className="py-3 px-4 uppercase">Articulo</th>
                    <th className="py-3 px-4 text-right uppercase">Precio Venta</th>
                    <th className="py-3 px-4 text-center uppercase">Disponible</th>
                    <th className="py-3 px-4 text-center uppercase">Atajo</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {searchResults.map(art => (
                    <tr key={art.id} className="text-slate-605 hover:bg-slate-50 transition-colors">
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          {/* Image Placeholder */}
                          {art.imagen_url ? (
                            <img 
                              src={art.imagen_url} 
                              alt={art.nombre} 
                              className="h-10 w-10 rounded-lg object-cover border border-slate-200 shrink-0" 
                            />
                          ) : (
                            <div className="h-10 w-10 rounded-lg bg-blue-50/75 text-blue-750 font-black flex items-center justify-center text-[10px] border border-blue-105 shrink-0 select-none uppercase">
                              {art.nombre.slice(0, 2)}
                            </div>
                          )}
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="block font-semibold text-slate-850 truncate">{art.nombre}</span>
                              {art.es_combo && (
                                <span className="bg-purple-50 text-purple-600 border border-purple-200/50 text-[8px] font-extrabold px-1 rounded uppercase tracking-wider scale-90">Combo</span>
                              )}
                            </div>
                            <span className="text-[10px] font-mono text-slate-450 block truncate uppercase">{art.codigo} | {art.categoria}</span>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-right font-mono text-emerald-600 font-extrabold pr-6">
                        ${art.precio_venta.toFixed(2)}
                      </td>
                      <td className="py-3 px-4 text-center">
                        {art.es_combo ? (
                          <span className="inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-purple-50 text-purple-600 border border-purple-150">
                            {calcularStockComboSimple(art.id, articulos)} uds (V)
                          </span>
                        ) : (
                          <span className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                            art.stock <= 0 
                              ? 'bg-red-50 text-red-600 border border-red-150' 
                              : art.stock <= art.stock_minimo
                                ? 'bg-amber-50 text-amber-600 border border-amber-100'
                                : 'bg-emerald-50 text-emerald-650 border border-emerald-100'
                          }`}>
                            {art.stock} uds
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-center">
                        <button
                          onClick={() => addToCart(art)}
                          disabled={(art.es_combo ? calcularStockComboSimple(art.id, articulos) : art.stock) <= 0}
                          className="px-3.5 py-1.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-400 text-white rounded-lg text-[11px] font-bold transition-all shadow-sm cursor-pointer disabled:cursor-not-allowed"
                        >
                          Agregar
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* RIGHT COLUMN: Active Cart and Bill calculation */}
      <div className="lg:col-span-5 space-y-4">
        <div className="bg-white border border-slate-200 shadow-sm rounded-2xl p-6 flex flex-col h-full justify-between">
          <div>
            <h2 className="text-base font-bold text-slate-800 flex items-center justify-between mb-4 border-b border-slate-150 pb-3">
              <span className="flex items-center gap-2">
                <ShoppingCart className="text-blue-500" size={18} /> Carro POS
              </span>
              <span className="text-[10px] bg-slate-100 py-1 px-2.5 rounded-full text-slate-600 font-mono font-bold">
                {cart.reduce((sum, item) => sum + item.cantidad, 0)} items
              </span>
            </h2>

            {/* Customers Dropdown with fast register shortcut */}
            <div className="mb-4">
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider">Cliente Receptor (Deuda/Límite)</label>
                <button
                  type="button"
                  onClick={() => setShowCustomerModal(true)}
                  className="text-xs text-blue-600 hover:text-blue-800 flex items-center gap-1 font-bold cursor-pointer"
                >
                  <UserPlus size={14} /> Crear Rápido
                </button>
              </div>
              <div className="relative">
                <select
                  value={selectedCustomerId}
                  onChange={e => setSelectedCustomerId(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-slate-705 rounded-xl p-3 pr-10 text-xs focus:outline-none focus:border-blue-500 cursor-pointer appearance-none uppercase font-semibold"
                >
                  {clientes.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nombre} ({c.rif}) [Límite: ${c.deuda_limite}]
                    </option>
                  ))}
                </select>
                <div className="absolute inset-y-0 right-0 flex items-center pr-3 pointer-events-none text-slate-400">
                  <User size={14} />
                </div>
              </div>
            </div>

            {/* Credit Limit exceeeding alerts */}
            {isCreditExceeded && activeCustomer && (
              <div className="mb-4 bg-red-50 border border-red-100 p-4 rounded-xl text-red-750 text-xs space-y-1 animate-pulse">
                <div className="flex items-center gap-1.5 font-bold uppercase text-[10px] tracking-wider mb-1 text-red-650">
                  <ShieldAlert size={15} />
                  Crédito Excedido
                </div>
                <p>El valor de la venta <span className="font-extrabold">${totalNeto.toFixed(2)}</span> excede el límite de deuda de <span className="font-extrabold">${activeCustomer.deuda_limite}</span> asignado para <span className="font-bold">{activeCustomer.nombre}</span>.</p>
              </div>
            )}

            {/* Items inside Cart catalog */}
            {cart.length === 0 ? (
              <div className="bg-[#F8FAFC] border border-dashed border-slate-200 rounded-xl py-12 text-center text-slate-400 text-xs">
                No hay productos asignados al carro de compras. Registre stock desde el catálogo de artículos.
              </div>
            ) : (
              <div className="space-y-3 max-h-[220px] overflow-y-auto pr-1">
                {cart.map(item => (
                  <div key={item.articulo.id} className="flex items-center justify-between bg-white border border-slate-100 rounded-xl p-3 shadow-xs">
                    <div className="flex-1 min-w-0 pr-2">
                      <div className="flex items-center gap-1.5">
                        <span className="block text-xs font-bold text-slate-800 truncate">{item.articulo.nombre}</span>
                        {item.articulo.es_combo && (
                          <span className="bg-purple-50 text-purple-600 border border-purple-100 text-[8px] font-extrabold px-1 rounded uppercase tracking-wider scale-90">Combo</span>
                        )}
                      </div>
                      <span className="text-[10px] font-mono text-slate-400 font-semibold block">${item.precio_unitario.toFixed(2)} c/u</span>
                      
                      {item.articulo.es_combo && item.articulo.componentes && item.articulo.componentes.length > 0 && (
                        <div className="text-[9px] text-purple-600 mt-1 font-sans italic bg-purple-50/30 p-1.5 rounded-lg border border-purple-100/30">
                          [Incluye: {item.articulo.componentes.map(comp => `${comp.cantidad}x ${comp.componente?.nombre || 'Producto'}`).join(', ')}]
                        </div>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Quantity decrementor */}
                      <button
                        onClick={() => updateQty(item.articulo.id, -1)}
                        className="h-6 w-6 bg-slate-50 border border-slate-200 text-slate-550 hover:text-blue-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-all"
                      >
                        <Minus size={11} />
                      </button>
                      <span className="text-xs font-bold font-mono text-slate-700 px-1 w-6 text-center">{item.cantidad}</span>
                      {/* Quantity incrementor */}
                      <button
                        onClick={() => updateQty(item.articulo.id, 1)}
                        className="h-6 w-6 bg-slate-50 border border-slate-200 text-slate-550 hover:text-blue-600 rounded-md flex items-center justify-center cursor-pointer hover:bg-white transition-all"
                      >
                        <Plus size={11} />
                      </button>

                      {/* Delete shortcut */}
                      <button
                        onClick={() => removeFromCart(item.articulo.id)}
                        className="p-1.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-md transition-all cursor-pointer ml-1"
                      >
                        <Trash2 size={12} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pricing calculations details and actions */}
          <div className="mt-6 pt-5 border-t border-slate-150">
            <div className="space-y-2 mb-6 text-xs text-slate-500">
              <div className="flex justify-between">
                <span>Total Bruto (Subtotal):</span>
                <span className="font-mono text-slate-700 font-bold">${totalBruto.toFixed(2)}</span>
              </div>
              <div className="flex justify-between items-center">
                <span>Descuento aplicado ($):</span>
                <input
                  type="number"
                  value={descuento || ''}
                  onChange={e => setDescuento(Math.max(0, parseFloat(e.target.value) || 0))}
                  placeholder="0.00"
                  className="w-20 bg-slate-50 border border-slate-200 rounded px-2 py-1 text-right font-mono text-slate-700 text-xs focus:outline-none focus:border-blue-500 font-bold"
                />
              </div>
              <div className="flex justify-between">
                <span>Base Imponible (con Dcto):</span>
                <span className="font-mono text-slate-705 font-bold">${totalBase.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Impuesto IVA ({pymeConfig?.impuestoPorcentaje ?? 16}%):</span>
                <span className="font-mono text-slate-705 font-bold">${totalImpuesto.toFixed(2)}</span>
              </div>

              {/* Total final net amount display */}
              <div className="flex justify-between text-base font-extrabold text-slate-800 pt-4 border-t border-slate-150 mt-2">
                <span>Total Facturado USD:</span>
                <span className="font-mono text-blue-600 font-extrabold shadow-xs bg-blue-50/20 px-2.5 py-1 rounded-lg border border-blue-100/10">${totalNeto.toFixed(2)}</span>
              </div>
              
              <div className="flex justify-between text-xs font-bold text-purple-700">
                <span>Equivalente en Bolívares (BCV):</span>
                <span className="font-mono">{(totalNeto * tasaBcvVal).toFixed(2)} Bs.</span>
              </div>
              <div className="text-[9px] text-slate-400 text-right italic">
                Tasa BCV del día: {tasaBcvVal.toFixed(2)} Bs. / USD
              </div>
            </div>

            {/* Direct confirm action button */}
            <button
              onClick={handleOpenPayment}
              disabled={isSubmitting || cart.length === 0}
              className={`w-full bg-blue-650 hover:bg-blue-600 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase tracking-wide flex items-center justify-center gap-2 shadow-md shadow-blue-500/10 cursor-pointer transition-all disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              <CreditCard size={16} />
              Proceder al Pago Bimonetario
            </button>
          </div>
        </div>
      </div>

      {/* DOUBLE CURRENCY CHECKOUT PAYMENT MODAL */}
      {showPaymentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-sm p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl shadow-2xl p-6 relative animate-scale-in">
            <button 
              onClick={() => setShowPaymentModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer p-1 rounded-full hover:bg-slate-100"
            >
              <X size={20} />
            </button>

            <div className="border-b border-slate-100 pb-4 mb-4">
              <h3 className="text-lg font-black text-slate-800 uppercase tracking-wide flex items-center gap-2">
                <Coins className="text-blue-500" /> Pantalla de Pago Venezolano (Doble Divisa)
              </h3>
              <p className="text-slate-400 text-xs">
                Registre transacciones con soporte integral de Bolívares (VES), Dólares (USD), Pago Móvil C2B e IGTF 3% en efectivo.
              </p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* LEFT SIDE: Method selector */}
              <div className="lg:col-span-5 space-y-4 border-r border-slate-100 pr-0 lg:pr-6">
                <h4 className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Seleccionar Medio de Pago</h4>
                
                <div className="flex flex-col gap-2">
                  <button
                    type="button"
                    onClick={() => setMetodoPagoSeleccionado('EFECTIVO_USD')}
                    className={`w-full p-4 rounded-xl flex items-center justify-between border cursor-pointer text-left transition-all ${
                      metodoPagoSeleccionado === 'EFECTIVO_USD'
                        ? 'bg-emerald-50 border-emerald-350 text-emerald-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">Efectivo Dólares ($ USD)</span>
                      <span className="text-[10px] opacity-75">
                        {isIgtfHabilitado ? 'Aplica alícuota IGTF +3%' : 'Libre de IGTF'}
                      </span>
                    </div>
                    <span className="font-mono font-black text-xs">$</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagoSeleccionado('EFECTIVO_VES')}
                    className={`w-full p-4 rounded-xl flex items-center justify-between border cursor-pointer text-left transition-all ${
                      metodoPagoSeleccionado === 'EFECTIVO_VES'
                        ? 'bg-purple-50 border-purple-300 text-purple-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">Efectivo Bolívares (Bs. VES)</span>
                      <span className="text-[10px] opacity-75">Pago directo en bolívares en caja</span>
                    </div>
                    <span className="font-mono font-black text-[10px]">Bs.</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagoSeleccionado('PAGO_MOVIL')}
                    className={`w-full p-4 rounded-xl flex items-center justify-between border cursor-pointer text-left transition-all ${
                      metodoPagoSeleccionado === 'PAGO_MOVIL'
                        ? 'bg-blue-50 border-blue-300 text-blue-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">Pago Móvil (Interbancario)</span>
                      <span className="text-[10px] opacity-75">Código QR dinámico para transferencia C2B</span>
                    </div>
                    <QrCode size={16} className="text-blue-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagoSeleccionado('TARJETA')}
                    className={`w-full p-4 rounded-xl flex items-center justify-between border cursor-pointer text-left transition-all ${
                      metodoPagoSeleccionado === 'TARJETA'
                        ? 'bg-sky-50 border-sky-300 text-sky-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">Punto de Venta / Tarjeta</span>
                      <span className="text-[10px] opacity-75">Tarjetas de débito/crédito nacionales</span>
                    </div>
                    <CreditCard size={16} className="text-sky-500" />
                  </button>

                  <button
                    type="button"
                    onClick={() => setMetodoPagoSeleccionado('MIXTO')}
                    className={`w-full p-4 rounded-xl flex items-center justify-between border cursor-pointer text-left transition-all ${
                      metodoPagoSeleccionado === 'MIXTO'
                        ? 'bg-amber-50 border-amber-350 text-amber-800 shadow-sm'
                        : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    <div>
                      <span className="block font-bold text-xs">Pago Mixto (USD + VES)</span>
                      <span className="text-[10px] opacity-75">Pague una fracción en USD y el resto en Bs.</span>
                    </div>
                    <div className="flex gap-0.5 text-xs font-bold font-mono">
                      <span>$</span>
                      <span>+</span>
                      <span className="text-[8px] self-end">Bs</span>
                    </div>
                  </button>
                </div>
              </div>

              {/* RIGHT SIDE: Payment computations & dynamic details */}
              <div className="lg:col-span-7 space-y-4">
                {/* BCV Tasa Ribbon */}
                <div className="bg-slate-50 rounded-xl p-3 border border-slate-200 flex justify-between items-center text-xs">
                  <span className="text-slate-500 font-semibold">Tasa del Día Oficial BCV:</span>
                  <span className="font-mono font-bold text-purple-700 bg-purple-50 border border-purple-100 px-2.5 py-0.5 rounded-full">
                    {tasaBcvVal.toFixed(2)} Bs / USD
                  </span>
                </div>

                {/* Amount details layout */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-slate-900 text-white rounded-xl p-4 shadow-sm space-y-0.5 border border-slate-800">
                    <span className="block text-[9px] uppercase text-slate-400 font-black tracking-wider">Total a Pagar USD</span>
                    <span className="block font-mono text-xl font-extrabold text-emerald-400">
                      ${finalTotalUSD.toFixed(2)}
                    </span>
                    {currentIgtfUSD > 0 && (
                      <span className="block text-[8px] text-emerald-300 font-semibold">
                        (Incluye 3% IGTF: +${currentIgtfUSD.toFixed(2)})
                      </span>
                    )}
                  </div>

                  <div className="bg-purple-900 text-white rounded-xl p-4 shadow-sm space-y-0.5 border border-purple-800">
                    <span className="block text-[9px] uppercase text-purple-200 font-black tracking-wider">Total a Pagar VES</span>
                    <span className="block font-mono text-xl font-extrabold text-purple-200">
                      {finalTotalVES.toFixed(2)} Bs.
                    </span>
                    {currentIgtfUSD > 0 && (
                      <span className="block text-[8px] text-purple-300 font-semibold">
                        (Incluye 3% IGTF: +{(currentIgtfUSD * tasaBcvVal).toFixed(2)} Bs)
                      </span>
                    )}
                  </div>
                </div>

                {/* Conditional Inputs */}
                <div className="bg-white border border-slate-200 rounded-xl p-4 space-y-4 shadow-inner">
                  {metodoPagoSeleccionado === 'EFECTIVO_USD' && (
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                        Monto Entregado por el Cliente ($ USD Cash)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={montoPagadoUSD}
                        onChange={e => setMontoPagadoUSD(parseFloat(e.target.value) || 0)}
                        placeholder="Ej: 50.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-700 text-sm font-extrabold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {metodoPagoSeleccionado === 'EFECTIVO_VES' && (
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                        Monto Entregado por el Cliente (Bs. VES Efectivo)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        value={montoPagadoVES}
                        onChange={e => setMontoPagadoVES(parseFloat(e.target.value) || 0)}
                        placeholder="Ej: 2500.00"
                        className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-700 text-sm font-extrabold focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  )}

                  {metodoPagoSeleccionado === 'TARJETA' && (
                    <div>
                      <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                        Monto a Cobrar por Tarjeta de Débito (Bs. VES)
                      </label>
                      <input
                        type="number"
                        step="0.01"
                        disabled
                        value={montoPagadoVES}
                        className="w-full bg-slate-100 border border-slate-200 rounded-xl p-3 font-mono text-slate-500 text-sm font-extrabold"
                      />
                    </div>
                  )}

                  {metodoPagoSeleccionado === 'MIXTO' && (
                    <div className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                            Porción Pagada en Dólares ($ USD)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={montoPagadoUSD}
                            onChange={e => setMontoPagadoUSD(parseFloat(e.target.value) || 0)}
                            placeholder="Monto USD"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-700 text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        </div>

                        <div>
                          <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1.5">
                            Porción Pagada en Bolívares (Bs. VES)
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            value={montoPagadoVES}
                            onChange={e => setMontoPagadoVES(parseFloat(e.target.value) || 0)}
                            placeholder="Monto VES"
                            className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 font-mono text-slate-700 text-xs font-bold focus:outline-none focus:border-blue-500"
                          />
                        </div>
                      </div>
                      {isIgtfHabilitado && (montoPagadoUSD > 0) && (
                        <div className="bg-amber-50 border border-amber-250 p-2.5 rounded-lg text-[10px] text-amber-800 font-semibold">
                          ℹ️ Se aplica un 3% de recargo IGTF sobre la porción entregada en efectivo de divisas (+${(montoPagadoUSD * 0.03).toFixed(2)} USD).
                        </div>
                      )}
                    </div>
                  )}

                  {metodoPagoSeleccionado === 'PAGO_MOVIL' && (
                    <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
                      <div className="md:col-span-7 space-y-2 text-xs font-semibold text-slate-650">
                        <div className="bg-blue-50 border border-blue-150 p-3.5 rounded-xl space-y-1.5">
                          <span className="font-black text-blue-700 uppercase tracking-wide text-[9px] block">Instrucciones de Pago Móvil (C2B)</span>
                          <p className="flex justify-between"><span>Banco Receptor:</span> <span className="font-bold text-slate-800">{pymeConfig?.pagoMovilBanco || 'Banesco'}</span></p>
                          <p className="flex justify-between"><span>Teléfono Destino:</span> <span className="font-bold text-slate-800">{pymeConfig?.pagoMovilTelefono || '0414-1234567'}</span></p>
                          <p className="flex justify-between"><span>RIF del Titular:</span> <span className="font-bold text-slate-800 uppercase">{pymeConfig?.pagoMovilRif || 'J-40912185-0'}</span></p>
                          <p className="flex justify-between pt-1 border-t border-blue-200/50 text-[11px] text-blue-800 font-extrabold">
                            <span>Monto VES:</span> <span>{finalTotalVES.toFixed(2)} Bs.</span>
                          </p>
                        </div>
                        <p className="text-[9px] text-slate-400 italic">
                          El cliente debe efectuar el pago interbancario por el total en bolívares e ingresar el número de referencia si lo desea.
                        </p>
                      </div>

                      <div className="md:col-span-5 flex flex-col items-center justify-center border-l border-slate-100 pl-4">
                        <span className="text-[9px] text-slate-400 font-bold uppercase tracking-wider mb-1 flex items-center gap-1"><QrCode size={11} /> Escanear QR</span>
                        <div className="bg-white p-2 rounded-xl shadow-sm border border-slate-200">
                          <img 
                            src={`https://api.qrserver.com/v1/create-qr-code/?size=150x150&data=${encodeURIComponent(`banco:${pymeConfig?.pagoMovilBanco || 'Banesco'};telefono:${pymeConfig?.pagoMovilTelefono || '0414-1234567'};rif:${pymeConfig?.pagoMovilRif || 'J-40912185-0'};monto:${finalTotalVES.toFixed(2)}`)}`} 
                            alt="Pago Movil QR" 
                            className="h-28 w-28 object-contain"
                          />
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                {/* Real-time Math Summary Vuelto */}
                <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex justify-between items-center">
                  <div className="space-y-0.5">
                    <span className="block text-[9px] font-black uppercase tracking-wider text-slate-400">Total Ingresado en Caja</span>
                    <span className="block text-xs font-bold text-slate-700">
                      ${paidTotalUSD.toFixed(2)} USD <span className="text-slate-400">/</span> {(paidTotalUSD * tasaBcvVal).toFixed(2)} Bs.
                    </span>
                  </div>

                  <div className="text-right">
                    {remainingUSD > 0.01 ? (
                      <div className="space-y-0.5">
                        <span className="inline-block bg-red-50 text-red-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">Restante por Cobrar</span>
                        <span className="block text-xs font-extrabold text-red-600 font-mono">
                          ${remainingUSD.toFixed(2)} USD <span className="text-slate-350">/</span> {(remainingUSD * tasaBcvVal).toFixed(2)} Bs.
                        </span>
                      </div>
                    ) : (
                      <div className="space-y-0.5 animate-bounce">
                        <span className="inline-block bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-md text-[9px] font-black uppercase tracking-wider">PAGO COMPLETADO</span>
                        {changeUSD > 0.009 ? (
                          <span className="block text-xs font-extrabold text-blue-600 font-mono">
                            VUELTO: ${changeUSD.toFixed(2)} USD <span className="text-slate-350">/</span> {changeVES.toFixed(2)} Bs.
                          </span>
                        ) : (
                          <span className="block text-xs font-bold text-slate-505">Importe Exacto Entregado</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-650 font-bold py-3.5 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer transition-all"
                  >
                    Cancelar
                  </button>

                  <button
                    type="button"
                    onClick={handleConfirmPayment}
                    disabled={isSubmitting || !isPaymentValid}
                    className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-100 disabled:text-slate-400 disabled:border-transparent border border-blue-700 text-white font-extrabold py-3.5 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:shadow-lg transition-all cursor-pointer disabled:cursor-not-allowed"
                  >
                    <CheckSquare size={16} /> Confirmar Pago y Facturar
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* QUICK CUSTOMER MODAL */}
      {showCustomerModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-md shadow-2xl p-6 relative">
            <button 
              onClick={() => setShowCustomerModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 cursor-pointer"
            >
              <X size={18} />
            </button>
            <h3 className="text-sm font-bold text-slate-800 mb-4 uppercase tracking-wider flex items-center gap-2">
              <PlusCircle className="text-blue-500" size={17} /> Registrar Nuevo Cliente
            </h3>

            <form onSubmit={handleQuickCustomerSubmit} className="space-y-4">
              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">RIF / Cédula (Único)*</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. V-25418931-2"
                  value={newCustRif}
                  onChange={e => setNewCustRif(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 uppercase font-bold"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Nombre Completo*</label>
                <input
                  type="text"
                  required
                  placeholder="Ej. Inversiones Montenegro C.A."
                  value={newCustNombre}
                  onChange={e => setNewCustNombre(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 uppercase font-semibold"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="ejemplo@correo.com"
                    value={newCustEmail}
                    onChange={e => setNewCustEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
                <div>
                  <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Teléfono</label>
                  <input
                    type="text"
                    placeholder="0414-1234567"
                    value={newCustTelefono}
                    onChange={e => setNewCustTelefono(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] uppercase font-bold tracking-wider mb-1">Límite de Crédito Autorizado ($)</label>
                <input
                  type="number"
                  placeholder="1000"
                  value={newCustLimit || ''}
                  onChange={e => setNewCustLimit(Math.max(0, parseFloat(e.target.value) || 0))}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:border-blue-500 font-mono font-bold"
                />
              </div>

              <button
                type="submit"
                className="w-full bg-blue-600 hover:bg-blue-500 text-white font-bold py-3 px-4 rounded-xl text-xs uppercase tracking-wider shadow-md hover:shadow-blue-550/10 transition-all cursor-pointer"
              >
                Guardar Cliente
              </button>
            </form>
          </div>
        </div>
      )}

      {/* CHECKOUT SUCCESS MODAL & THERMAL TICKET PRINTING SECTION */}
      {successSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            
            <button
              onClick={() => setSuccessSale(null)}
              className="absolute top-4 right-4 text-slate-500 hover:text-slate-700 cursor-pointer p-1 rounded-full hover:bg-slate-100"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="h-12 w-12 rounded-full bg-emerald-150 border border-emerald-300 text-emerald-605 flex items-center justify-center mb-3 animate-bounce">
                <Check size={26} />
              </div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Transacción Realizada</h2>
              <p className="text-slate-400 text-xs mt-1">
                Comprobante fiscal Nº {successSale.nro_factura_fiscal || successSale.id?.slice(-8).toUpperCase()} emitido correctamente.
              </p>
            </div>

            {/* Printable Frame Area */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 max-h-[350px] overflow-y-auto mb-6">
              
              {/* Target printable SENIAT fiscal simulated layout */}
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
                  {pymeConfig?.registroMercantil && (
                    <p className="text-[8px] text-slate-400 leading-normal mt-1 border-t border-slate-100 pt-0.5">REG: {pymeConfig.registroMercantil}</p>
                  )}
                </div>

                <div className="space-y-1 text-[9px] text-slate-600 border-b border-dashed border-slate-300 pb-3 mb-3">
                  {pymeConfig?.formatoFactura === 'FISCAL' ? (
                    <>
                      <p className="font-extrabold text-slate-900">FACTURA FISCAL NRO: {successSale.nro_factura_fiscal}</p>
                      <p className="font-bold">NRO CONTROL: FACT-{successSale.id?.slice(-8).toUpperCase()}</p>
                    </>
                  ) : (
                    <p className="font-bold">COMPROBANTE ESTÁNDAR NRO: {(successSale.id || '').slice(-8).toUpperCase()}</p>
                  )}
                  <p><span className="font-bold">Fecha:</span> {new Date(successSale.fecha || Date.now()).toLocaleString('es-VE')}</p>
                  <p><span className="font-bold">Cliente:</span> {successSale.cliente?.nombre || 'General'}</p>
                  <p><span className="font-bold">RIF/C.I.:</span> {successSale.cliente?.rif || 'N/A'}</p>
                  <p><span className="font-bold">Medio de Pago:</span> {successSale.metodo_pago}</p>
                </div>

                {/* Items details table */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                  <table className="w-full text-left text-[9px] border-collapse">
                    <thead>
                      <tr className="font-bold text-slate-700 border-b border-dashed border-slate-200">
                        <th className="pb-1 uppercase">Cant. / Desc.</th>
                        <th className="pb-1 text-right uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-150">
                      {successSale.detalles?.map((det: any) => (
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

                {/* Double currency desgloses block */}
                <div className="space-y-1 text-right text-[9px] text-slate-650 pr-1">
                  <p>Subtotal: <span className="font-bold">${successSale.total_bruto?.toFixed(2)}</span></p>
                  {successSale.descuento > 0 && (
                    <p>Descuento: <span className="font-bold">-${successSale.descuento?.toFixed(2)}</span></p>
                  )}
                  <p>Impuesto IVA ({pymeConfig?.impuestoPorcentaje ?? 16}%): <span className="font-bold">${successSale.total_impuesto?.toFixed(2)}</span></p>
                  
                  {successSale.igtf_monto > 0 && (
                    <p className="text-red-700 font-bold">IGTF Percibido (3%): <span className="font-bold">+${successSale.igtf_monto?.toFixed(2)}</span></p>
                  )}

                  {/* USD Final Total */}
                  <div className="text-[10px] font-extrabold text-[#0f172a] pt-1.5 border-t border-dashed border-slate-300 mt-1 flex justify-between">
                    <span>TOTAL NETO USD:</span>
                    <span>${(successSale.total_neto + (successSale.igtf_monto || 0)).toFixed(2)}</span>
                  </div>

                  {/* Bolívares Bimonetary Desglose */}
                  <div className="text-[10px] font-extrabold text-purple-800 mt-1 flex justify-between border-t border-dashed border-slate-200 pt-1">
                    <span>TOTAL NETO VES:</span>
                    <span>{((successSale.total_neto + (successSale.igtf_monto || 0)) * (successSale.tasa_bcv || tasaBcvVal)).toFixed(2)} Bs.</span>
                  </div>

                  <div className="text-[8px] text-slate-400 italic text-right mt-0.5">
                    Tasa Oficial BCV: {(successSale.tasa_bcv || tasaBcvVal).toFixed(2)} Bs.
                  </div>

                  {/* Payment details summary */}
                  <div className="border-t border-dashed border-slate-200 pt-1.5 mt-1 text-[8px] text-slate-500 space-y-0.5">
                    {successSale.monto_pagado_usd > 0 && (
                      <p>Pagado Divisas: <span className="font-bold">${successSale.monto_pagado_usd.toFixed(2)}</span></p>
                    )}
                    {successSale.monto_pagado_ves > 0 && (
                      <p>Pagado Bolívares: <span className="font-bold">{successSale.monto_pagado_ves.toFixed(2)} Bs.</span></p>
                    )}
                  </div>
                </div>

                {/* Fiscal Footer */}
                {pymeConfig?.formatoFactura === 'FISCAL' && (
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

            {/* Quick action triggers */}
            <div className="flex gap-4">
              <button
                type="button"
                onClick={handlePrint}
                className="flex-1 bg-slate-900 hover:bg-slate-800 text-white font-bold py-3.5 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-2 hover:shadow-lg transition-all cursor-pointer"
              >
                <Printer size={15} /> Imprimir Comprobante
              </button>
              <button
                type="button"
                onClick={() => setSuccessSale(null)}
                className="flex-1 bg-slate-100 hover:bg-slate-205 text-slate-650 font-bold py-3.5 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-200 cursor-pointer"
              >
                Cerrar Panel
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
