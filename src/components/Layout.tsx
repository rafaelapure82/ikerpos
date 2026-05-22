import React, { useState, useRef, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useStore } from '../store.js';
import { useReactToPrint } from 'react-to-print';
import { 
  Building2, LayoutDashboard, ShoppingCart, Package, Users, Truck, ShoppingBag, 
  ClipboardList, LogOut, ShieldAlert, Shield, CheckCircle2, ChevronLeft, ChevronRight, 
  Menu, Bell, CreditCard, ChevronDown, Check, Printer, X, Undo2, TrendingUp, LayoutGrid, BarChart3
} from 'lucide-react';

export default function Layout() {
  const { 
    user, 
    setUser, 
    cart, 
    descuento, 
    metodoPago,
    selectedCustomerId,
    articulos,
    setAlert,
    clearCart,
    fetchStats,
    fetchVentas,
    fetchArticulos,
    pymeConfig,
    fetchPymeConfig
  } = useStore();

  const navigate = useNavigate();
  const location = useLocation();

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [showNotificationMenu, setShowNotifMenu] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  
  // Sale Success modal trigger
  const [successSale, setSuccessSale] = useState<any | null>(null);
  const [isPaying, setIsPaying] = useState(false);

  // Print ticket ref
  const headerPrintRef = useRef<HTMLDivElement>(null);
  const handlePrint = useReactToPrint({
    contentRef: headerPrintRef,
  });

  useEffect(() => {
    if (!pymeConfig) {
      fetchPymeConfig();
    }
  }, [pymeConfig, fetchPymeConfig]);

  // Calculate numbers dynamically from globally shared cart
  const currentTaxRate = pymeConfig ? (pymeConfig.impuestoPorcentaje / 100) : 0.16;
  const subtotal = cart.reduce((sum, item) => sum + (item.cantidad * item.precio_unitario), 0);
  const totalBase = Math.max(0, subtotal - descuento);
  const iva = totalBase * currentTaxRate;
  const total = totalBase + iva;

  // Real-time Low Stock alerts computation from database list
  const lowStockArticles = articulos.filter(art => art.stock <= art.stock_minimo);

  const navItems = [
    { id: 'dashboard', path: '/', label: 'POS Dashboard', icon: LayoutDashboard, roles: ['ADMIN', 'VENDEDOR', 'COMPRAS'] },
    { id: 'pos', path: '/pos', label: 'Caja POS', icon: ShoppingCart, roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'ventas', path: '/ventas', label: 'Ventas y Devoluciones', icon: ClipboardList, roles: ['ADMIN', 'VENDEDOR', 'COMPRAS'] },
    { id: 'devoluciones', path: '/devoluciones', label: 'Devoluciones / Reversa', icon: Undo2, roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'articulos', path: '/articulos', label: 'Artículos', icon: Package, roles: ['ADMIN', 'VENDEDOR', 'COMPRAS'] },
    { id: 'categorias', path: '/categorias', label: 'Categorías', icon: LayoutGrid, roles: ['ADMIN', 'COMPRAS'] },
    { id: 'clientes', path: '/clientes', label: 'Clientes / Crédito', icon: Users, roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'cliente-reporte', path: '/cliente-reporte', label: 'Clientes 360 / Reporte', icon: TrendingUp, roles: ['ADMIN', 'VENDEDOR'] },
    { id: 'reporte-ventas', path: '/reporte-ventas', label: 'Reportes de Venta', icon: BarChart3, roles: ['ADMIN'] },
    { id: 'proveedores', path: '/proveedores', label: 'Proveedores', icon: Truck, roles: ['ADMIN', 'COMPRAS'] },
    { id: 'compras', path: '/compras', label: 'Abastecer Suministros', icon: ShoppingBag, roles: ['ADMIN', 'COMPRAS'] },
    { id: 'kardex', path: '/kardex', label: 'Kárdex de Inventario', icon: Package, roles: ['ADMIN', 'COMPRAS'] },
    { id: 'usuarios', path: '/usuarios', label: 'Usuarios', icon: ShieldAlert, roles: ['ADMIN'] },
    { id: 'permisos', path: '/permisos', label: 'Roles y Permisos', icon: Shield, roles: ['ADMIN'] },
    { id: 'pyme-config', path: '/pyme-config', label: 'Configuración de la PyME', icon: Building2, roles: ['ADMIN', 'VENDEDOR', 'COMPRAS'] },
  ];

  const handleLogout = () => {
    setUser(null);
    navigate('/login');
  };

  const executeNavbarCheckout = async () => {
    if (cart.length === 0) {
      setAlert('El carro de compras está vacío. Agrega artículos en Caja POS.', 'error');
      return;
    }
    if (!selectedCustomerId) {
      setAlert('Selecciona un cliente o deja el campo general en Caja POS antes de facturar.', 'error');
      return;
    }

    setIsPaying(true);
    try {
      const payload = {
        clienteId: selectedCustomerId,
        total_bruto: subtotal,
        descuento: descuento,
        total_impuesto: iva,
        total_neto: total,
        metodo_pago: metodoPago || 'Efectivo',
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
        setAlert('¡Venta realizada exitosamente desde la barra de pagos!', 'success');
        clearCart();
        await Promise.all([
          fetchStats(),
          fetchVentas(),
          fetchArticulos()
        ]);
      }
    } catch {
      setAlert('Error de red al registrar factura rápida', 'error');
    } finally {
      setIsPaying(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col md:flex-row font-sans text-slate-700 select-none">
      
      {/* SIDEBAR NAVIGATION */}
      <aside className={`bg-slate-900 border-r border-slate-800 text-slate-300 flex flex-col justify-between shrink-0 transition-all duration-300 print:hidden ${
        isSidebarCollapsed ? 'w-20' : 'w-64'
      }`}>
        
        <div>
          {/* Header branding block */}
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <div className="flex items-center gap-3 overflow-hidden">
              <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg shrink-0">
                <span className="text-white font-black text-sm tracking-wider">IK</span>
              </div>
              {!isSidebarCollapsed && (
                <div className="truncate">
                  <span className="block text-xs font-black tracking-widest text-white uppercase">IKER POS<span className="text-blue-400">PyME</span></span>
                  <span className="block text-[9px] text-slate-500 font-bold leading-none tracking-tight">Cerebro de Facturación</span>
                </div>
              )}
            </div>

            <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className="p-1 hover:bg-slate-805 rounded-lg text-slate-400 hover:text-white transition-all cursor-pointer"
            >
              {isSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
            </button>
          </div>

          {/* Nav Links Mapping */}
          <nav className="p-3 space-y-1">
            {navItems.map(item => {
              const isAllowed = item.roles.includes(user?.rol || '');
              if (!isAllowed) return null;

              const Icon = item.icon;
              const isActive = location.pathname === item.path;

              return (
                <Link
                  key={item.id}
                  to={item.path}
                  className={`flex items-center gap-3.5 px-3.5 py-3 rounded-xl text-xs font-bold transition-all relative group ${
                    isActive 
                      ? 'bg-blue-600 text-white shadow-md shadow-blue-600/10' 
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <Icon size={16} className={isActive ? 'text-white' : 'text-slate-450 group-hover:text-slate-200'} />
                  {!isSidebarCollapsed && <span className="truncate">{item.label}</span>}
                  {isSidebarCollapsed && (
                    <div className="absolute left-16 bg-slate-950 text-white text-[10px] font-black uppercase px-2 py-1 rounded-md opacity-0 hover:opacity-100 group-hover:opacity-100 transition-opacity z-50 pointer-events-none whitespace-nowrap shadow-xl border border-slate-800">
                      {item.label}
                    </div>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Collapsable bottom utility details / sign out */}
        <div className="p-4 border-t border-slate-800">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-3 py-2.5 rounded-xl text-left text-xs font-bold text-slate-400 hover:text-red-405 hover:bg-red-500/5 transition-all cursor-pointer border border-transparent"
          >
            <LogOut size={16} />
            {!isSidebarCollapsed && <span>Cerrar Sesión</span>}
          </button>
        </div>

      </aside>

      {/* WORKSPACE CONTENT AREA WITH FIXED HEADER BAR */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        
        {/* TOP LEVEL NAVIGATION HEADER */}
        <header className="h-16 bg-white border-b border-slate-200 flex items-center justify-between px-6 shrink-0 md:px-8 shadow-xs sticky top-0 z-40 print:hidden">
          
          <div className="flex items-center gap-3">
            <span className="flex h-2 w-2 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
            </span>
            <span className="text-xs font-extrabold text-slate-650 tracking-wider">IKER ERP ONLINE</span>
          </div>

          <div className="flex items-center gap-6">

            {/* TRANSACTING CART HEADER HUD: Subtotal, impuesto, total y Botón Pagar */}
            {cart.length > 0 && (
              <div className="hidden lg:flex items-center gap-4 bg-slate-50 border border-slate-150 rounded-xl px-4 py-1.5 text-xs font-semibold shadow-xs">
                <div className="flex items-center gap-4 divide-x divide-slate-200 text-slate-550">
                  <div>
                    <span className="block text-[8px] uppercase text-slate-400 font-extrabold font-sans">Subtotal</span>
                    <span className="font-mono font-bold text-slate-700">${subtotal.toFixed(2)}</span>
                  </div>
                  <div className="pl-3">
                    <span className="block text-[8px] uppercase text-slate-400 font-extrabold font-sans">Impuesto IVA</span>
                    <span className="font-mono font-bold text-slate-700">${iva.toFixed(2)}</span>
                  </div>
                  <div className="pl-3">
                    <span className="block text-[8px] uppercase text-slate-400 font-extrabold font-sans">Total Neto</span>
                    <span className="font-mono font-extrabold text-blue-600">${total.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={executeNavbarCheckout}
                  disabled={isPaying}
                  className="bg-blue-600 hover:bg-blue-500 text-white text-[10px] font-bold uppercase py-1.5 px-3.5 rounded-lg flex items-center gap-1 cursor-pointer transition-all shadow-sm"
                >
                  <CreditCard size={12} />
                  {isPaying ? 'PAGANDO...' : 'Pagar'}
                </button>
              </div>
            )}

            {/* NOTIFICACIONES DE STOCK BAJO HUD BUTTON */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowNotifMenu(!showNotificationMenu);
                  setShowProfileMenu(false);
                }}
                className={`relative p-2 text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-100 rounded-xl transition-all cursor-pointer ${
                  lowStockArticles.length > 0 ? 'bg-amber-500/5 hover:bg-amber-500/10' : ''
                }`}
              >
                <Bell size={18} className={lowStockArticles.length > 0 ? 'text-amber-500 font-extrabold' : ''} />
                {lowStockArticles.length > 0 && (
                  <span className="absolute top-0 right-0 block h-2 w-2 rounded-full bg-amber-500 ring-2 ring-white animate-pulse" />
                )}
              </button>

              {showNotificationMenu && (
                <div className="absolute right-0 mt-3 w-80 bg-white border border-slate-250 shadow-2xl rounded-2xl py-3 px-4 z-50 text-xs text-slate-650 animate-fade-in">
                  <h4 className="font-extrabold text-slate-850 border-b border-slate-100 pb-2 mb-2 flex items-center justify-between">
                    <span>NOTIFICACIONES STOCK</span>
                    <span className="text-[10px] bg-amber-50 border border-amber-200 text-amber-600 px-2 rounded-full leading-relaxed font-black uppercase">
                      {lowStockArticles.length} ALFA ALERTAS
                    </span>
                  </h4>

                  {lowStockArticles.length === 0 ? (
                    <p className="text-slate-400 py-4 text-center">🎉 Todos los artículos tienen existencias operativas.</p>
                  ) : (
                    <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                      {lowStockArticles.map(art => (
                        <div key={art.id} className="p-2.5 bg-slate-50 hover:bg-amber-50 border border-slate-150 hover:border-amber-200 rounded-xl flex items-center justify-between transition-all">
                          <div className="min-w-0 flex-1 pr-2">
                            <span className="block font-bold text-slate-850 truncate">{art.nombre}</span>
                            <span className="text-[9px] text-slate-400 font-mono">Código: {art.codigo}</span>
                          </div>
                          <div className="text-right">
                            <span className="block text-red-500 font-extrabold font-mono text-xs">{art.stock} uds</span>
                            <span className="block text-[8px] text-slate-400 font-bold font-sans">Mínimo: {art.stock_minimo}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* PROFILE MENU DROPDOWN */}
            <div className="relative">
              <button 
                onClick={() => {
                  setShowProfileMenu(!showProfileMenu);
                  setShowNotifMenu(false);
                }}
                className="flex items-center gap-2.5 cursor-pointer hover:opacity-90 active:scale-95 transition-all text-xs"
              >
                <div className="h-9 w-9 bg-blue-100 border border-blue-200 text-blue-750 font-black text-xs uppercase flex items-center justify-center rounded-xl shadow-xs">
                  {user?.nombre?.slice(0, 2) || 'AD'}
                </div>
                <div className="hidden md:block text-left">
                  <span className="block font-bold text-slate-800 leading-none">{user?.nombre || 'Administrador'}</span>
                  <span className="text-[9px] text-blue-600 font-black uppercase tracking-wider block mt-0.5">{user?.rol || 'Rol'}</span>
                </div>
                <ChevronDown size={14} className="text-slate-400" />
              </button>

              {showProfileMenu && (
                <div className="absolute right-0 mt-3 w-52 bg-white border border-slate-205 shadow-2xl rounded-2xl p-2 z-50 text-xs animate-fade-in font-semibold">
                  <Link 
                    to="/pos" 
                    onClick={() => setShowProfileMenu(false)}
                    className="block px-4 py-2.5 hover:bg-slate-50 rounded-xl text-slate-650 hover:text-slate-850 transition-colors"
                  >
                    Abrir Caja POS
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="w-full text-left block px-4 py-2.5 hover:bg-slate-50 rounded-xl text-red-600 hover:text-red-700 hover:bg-red-50/20 transition-colors"
                  >
                    Cerrar Sesión Activa
                  </button>
                </div>
              )}
            </div>

          </div>

        </header>

        {/* MASTER INTERNAL WORKSPACE SCROLLER CONTAINER */}
        <main className="flex-1 p-6 md:p-8 overflow-y-auto w-full max-w-7xl mx-auto">
          <Outlet />
        </main>

      </div>

      {/* HEADER HUD PAYMENT SUCCESS MODAL & THERMAL TICKET PRINTING SECTION */}
      {successSale && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 overflow-y-auto">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl p-6 relative">
            
            <button
              onClick={() => setSuccessSale(null)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X size={18} />
            </button>

            <div className="flex flex-col items-center mb-6">
              <div className="h-12 w-12 rounded-full bg-emerald-150 border border-emerald-300 text-emerald-650 flex items-center justify-center mb-3">
                <Check size={26} />
              </div>
              <h2 className="text-base font-black text-slate-800 uppercase tracking-wider">Factura Emitida</h2>
              <p className="text-slate-400 text-xs mt-1">El comprobante Nº #{successSale.id?.slice(-8).toUpperCase()} fue cobrado con éxito.</p>
            </div>

            {/* Printable Frame Area */}
            <div className="border border-slate-100 rounded-xl p-4 bg-slate-50/50 max-h-[350px] overflow-y-auto mb-6">
              
              <div 
                ref={headerPrintRef} 
                className="p-6 bg-white border border-slate-150 text-slate-800 shadow-sm leading-normal text-xs uppercase font-mono max-w-sm mx-auto"
                style={{ fontFamily: "'Courier New', Courier, monospace" }}
              >
                <div className="text-center border-b border-dashed border-slate-300 pb-4 mb-4">
                  <h3 className="text-sm font-extrabold tracking-widest text-[#1e293b] mb-1">{pymeConfig?.nombre ?? 'IKER POSPyME, C.A.'}</h3>
                  <p className="text-[9px] text-slate-500 font-bold mb-0.5">RIF: {pymeConfig?.rif ?? 'J-40912185-0'}</p>
                  {pymeConfig?.telefono && <p className="text-[9px] text-slate-450 leading-none">TLF: {pymeConfig.telefono}</p>}
                  {pymeConfig?.direccion && <p className="text-[8px] text-slate-400 mt-1 uppercase leading-tight line-clamp-2">{pymeConfig.direccion}</p>}
                </div>

                <div className="space-y-1 text-[10px] text-slate-650 border-b border-dashed border-slate-300 pb-3 mb-3">
                  <p><span className="font-bold">Factura Nº:</span> {(successSale.id || '').slice(-8).toUpperCase()}</p>
                  <p><span className="font-bold">Fecha:</span> {new Date(successSale.fecha || Date.now()).toLocaleString('es-VE')}</p>
                  <p><span className="font-bold">Cliente:</span> {successSale.cliente?.nombre || 'General'}</p>
                  <p><span className="font-bold">RIF/C.I.:</span> {successSale.cliente?.rif || 'N/A'}</p>
                </div>

                {/* Listing item quantities */}
                <div className="border-b border-dashed border-slate-300 pb-3 mb-3">
                  <table className="w-full text-left text-[10px] border-collapse">
                    <thead>
                      <tr className="font-bold text-slate-705">
                        <th className="pb-1 uppercase">Cant. / Desc.</th>
                        <th className="pb-1 text-right uppercase">Total</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-dashed divide-slate-150">
                      {successSale.detalles?.map((det: any) => (
                        <tr key={det.id} className="text-slate-650">
                          <td className="py-2.5">
                            <span className="block font-bold">{det.articulo?.nombre || `Item #${(det.articuloId || '').slice(-4).toUpperCase()}`}</span>
                            <span className="block text-[9px] text-slate-400">{det.cantidad} x ${det.precio_unitario?.toFixed(2)}</span>
                          </td>
                          <td className="py-2.5 text-right font-bold valign-middle">${(det.subtotal || (det.cantidad * det.precio_unitario)).toFixed(2)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                   {/* Totals Summary */}
                <div className="space-y-1.5 text-right text-[10px] text-slate-650 pr-1">
                  <p>Subtotal: <span className="font-bold">${successSale.total_bruto?.toFixed(2)}</span></p>
                  {successSale.descuento > 0 && (
                    <p>Descuento: <span className="font-bold">-${successSale.descuento?.toFixed(2)}</span></p>
                  )}
                  <p>Impuesto IVA ({pymeConfig?.impuestoPorcentaje ?? 16}%): <span className="font-bold">${successSale.total_impuesto?.toFixed(2)}</span></p>
                  <p className="text-xs font-extrabold text-[#1f2937] pt-1.5 border-t border-dashed border-slate-300 mt-1">
                    TOTAL NETO: ${successSale.total_neto?.toFixed(2)} {pymeConfig?.moneda ?? 'USD'}
                  </p>
                </div>

                <div className="text-center border-t border-dashed border-slate-300 pt-4 mt-4 text-[10px] text-slate-400">
                  <p className="font-bold italic uppercase leading-normal">{pymeConfig?.mensajePieFactura ?? '¡Gracias por su compra de caja!'}</p>
                  <p className="text-[8px] mt-1.5 font-mono">IkerPOSPyME - Impreso vía Ticket Térmico</p>
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
                className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-655 font-bold py-3.5 px-4 rounded-xl text-xs uppercase flex items-center justify-center gap-1.5 border border-slate-202 cursor-pointer"
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
