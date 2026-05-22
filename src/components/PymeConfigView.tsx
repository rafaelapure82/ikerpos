import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { Building2, Save, Sparkles, Receipt, Landmark, CheckCircle2, ShieldAlert, Coins, QrCode } from 'lucide-react';

export default function PymeConfigView() {
  const { user, pymeConfig, updatePymeConfig, fetchPymeConfig, setAlert } = useStore();
  const isAdmin = user?.rol === 'ADMIN';

  // Local state initialized with server info or defaults
  const [nombre, setNombre] = useState('');
  const [rif, setRif] = useState('');
  const [telefono, setTelefono] = useState('');
  const [direccion, setDireccion] = useState('');
  const [email, setEmail] = useState('');
  const [moneda, setMoneda] = useState('USD');
  const [impuestoPorcentaje, setImpuestoPorcentaje] = useState(16.0);
  const [mensajePieFactura, setMensajePieFactura] = useState('');
  const [registroMercantil, setRegistroMercantil] = useState('');
  
  // Venezuelan localization fields
  const [tasaBcv, setTasaBcv] = useState(45.50);
  const [habilitarIgtf, setHabilitarIgtf] = useState(true);
  const [pagoMovilBanco, setPagoMovilBanco] = useState('Banesco');
  const [pagoMovilTelefono, setPagoMovilTelefono] = useState('');
  const [pagoMovilRif, setPagoMovilRif] = useState('');
  const [formatoFactura, setFormatoFactura] = useState<'ESTANDAR' | 'FISCAL' | 'ELECTRONICA'>('FISCAL');
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Sync state if pymeConfig updates or gets fetched
  useEffect(() => {
    if (pymeConfig) {
      setNombre(pymeConfig.nombre || '');
      setRif(pymeConfig.rif || '');
      setTelefono(pymeConfig.telefono || '');
      setDireccion(pymeConfig.direccion || '');
      setEmail(pymeConfig.email || '');
      setMoneda(pymeConfig.moneda || 'USD');
      setImpuestoPorcentaje(pymeConfig.impuestoPorcentaje !== undefined ? pymeConfig.impuestoPorcentaje : 16.0);
      setMensajePieFactura(pymeConfig.mensajePieFactura || '');
      setRegistroMercantil(pymeConfig.registroMercantil || '');
      
      setTasaBcv(pymeConfig.tasaBcv !== undefined ? pymeConfig.tasaBcv : 45.50);
      setHabilitarIgtf(pymeConfig.habilitarIgtf !== undefined ? pymeConfig.habilitarIgtf : true);
      setPagoMovilBanco(pymeConfig.pagoMovilBanco || 'Banesco');
      setPagoMovilTelefono(pymeConfig.pagoMovilTelefono || '');
      setPagoMovilRif(pymeConfig.pagoMovilRif || '');
      setFormatoFactura(pymeConfig.formatoFactura || 'FISCAL');
    } else {
      fetchPymeConfig();
    }
  }, [pymeConfig, fetchPymeConfig]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin) {
      setAlert('Acceso denegado: Solo administradores pueden guardar estos parámetros.', 'error');
      return;
    }

    if (!nombre.trim() || !rif.trim()) {
      setAlert('Razón Social y RIF de la PyME son requeridos obligatoriamente.', 'error');
      return;
    }

    setIsSubmitting(true);
    const success = await updatePymeConfig({
      nombre,
      rif,
      telefono,
      direccion,
      email,
      moneda,
      impuestoPorcentaje: Number(impuestoPorcentaje),
      mensajePieFactura,
      registroMercantil,
      tasaBcv: Number(tasaBcv),
      habilitarIgtf,
      pagoMovilBanco,
      pagoMovilTelefono,
      pagoMovilRif,
      formatoFactura
    });
    setIsSubmitting(false);

    if (success) {
      setAlert('Datos de la PyME actualizados satisfactoriamente.', 'success');
    }
  };

  return (
    <div className="space-y-6 animate-fade-in text-slate-705">
      
      {/* Title block */}
      <div className="flex justify-between items-start">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Identidad de la PyME / Configuración <Building2 className="text-blue-500" />
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Configure la razón social corporativa, registro fiscal (RIF), alícuotas del IVA, mensaje de pie para tickets impresos y geoubicación comercial.
          </p>
        </div>
        
        {/* Header Ribbon Indicator */}
        <div className={`p-1.5 px-3 rounded-full text-[10px] font-black uppercase tracking-wider ${
          isAdmin 
            ? 'bg-blue-50 text-blue-600 border border-blue-100' 
            : 'bg-amber-50 text-amber-600 border border-amber-100'
        }`}>
          {isAdmin ? 'Acceso Administrador' : 'Solo Lectura'}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 items-start">
        
        {/* Left Columns - Form Portal */}
        <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl shadow-sm overflow-hidden p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 flex items-center gap-1.5">
              <Landmark size={15} className="text-blue-500" /> Fórmulas de Registro y Fiscales
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Razón Social / Nombre Comercial *
                </label>
                <input
                  type="text"
                  value={nombre}
                  disabled={!isAdmin}
                  onChange={e => setNombre(e.target.value)}
                  placeholder="Ej: Inversiones Iker, C.A."
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  RIF (Registro de Identificación Fiscal) *
                </label>
                <input
                  type="text"
                  value={rif}
                  disabled={!isAdmin}
                  onChange={e => setRif(e.target.value)}
                  placeholder="Ej: J-40912185-0"
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed uppercase"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Teléfono de Atención
                </label>
                <input
                  type="text"
                  value={telefono}
                  disabled={!isAdmin}
                  onChange={e => setTelefono(e.target.value)}
                  placeholder="Ej: +58 (212) 555-1234"
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Correo Electrónico PYME
                </label>
                <input
                  type="email"
                  value={email}
                  disabled={!isAdmin}
                  onChange={e => setEmail(e.target.value)}
                  placeholder="Ej: administracion@empresa.com"
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

            </div>

            <div>
              <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                Dirección Física Comercial
              </label>
              <textarea
                value={direccion}
                disabled={!isAdmin}
                onChange={e => setDireccion(e.target.value)}
                placeholder="Indique avenida, local, piso, centro comercial o galpón de la PyME..."
                rows={2}
                className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed resize-none"
              />
            </div>

            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 pt-3 flex items-center gap-1.5">
              <Receipt size={15} className="text-blue-500" /> Parámetros Operativos e Impresión de Facturas
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Moneda Base del ERP
                </label>
                <select
                  value={moneda}
                  disabled={!isAdmin}
                  onChange={e => setMoneda(e.target.value)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="USD">USD ($) - Dólar Americano</option>
                  <option value="VES">VES (Bs) - Bolívar Venezolano</option>
                  <option value="EUR">EUR (€) - Euro</option>
                  <option value="COP">COP ($) - Peso Colombiano</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Alícuota de impuesto IVA General (%)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={impuestoPorcentaje}
                  disabled={!isAdmin}
                  onChange={e => setImpuestoPorcentaje(parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 16.0"
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Datos Registro Comercial (Mercantil / Tomo / Expediente)
                </label>
                <input
                  type="text"
                  value={registroMercantil}
                  disabled={!isAdmin}
                  onChange={e => setRegistroMercantil(e.target.value)}
                  placeholder="Tomo 40, Número de Expediente, Circunscripción Judicial..."
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Mensaje Dinámico de Pie de Factura / Ticket de Caja
                </label>
                <input
                  type="text"
                  value={mensajePieFactura}
                  disabled={!isAdmin}
                  onChange={e => setMensajePieFactura(e.target.value)}
                  placeholder="Ej: ¡Muchas gracias por su compra! Conserve su ticket para cambios de mercancía."
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>
            </div>

            {/* Venezuelan Localization Section */}
            <h2 className="text-xs font-black text-slate-800 uppercase tracking-widest border-b border-slate-100 pb-3 pt-3 flex items-center gap-1.5">
              <Coins size={15} className="text-blue-500" /> Localización Venezolana (Doble Divisa, IGTF & Pago Móvil)
            </h2>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Tasa Oficial BCV (Bs. / USD) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={tasaBcv}
                  disabled={!isAdmin}
                  onChange={e => setTasaBcv(parseFloat(e.target.value) || 0)}
                  placeholder="Ej: 45.50"
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                />
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Cobrar IGTF (3% USD Efectivo)
                </label>
                <div className="flex items-center h-11">
                  <label className="relative inline-flex items-center cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={habilitarIgtf}
                      disabled={!isAdmin}
                      onChange={e => setHabilitarIgtf(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-200 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    <span className="ml-3 text-xs font-semibold text-slate-600">
                      {habilitarIgtf ? 'Habilitado (3%)' : 'Deshabilitado'}
                    </span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                  Formato de Facturación
                </label>
                <select
                  value={formatoFactura}
                  disabled={!isAdmin}
                  onChange={e => setFormatoFactura(e.target.value as any)}
                  className="w-full bg-[#F8FAFC] border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed cursor-pointer"
                >
                  <option value="ESTANDAR">Estándar (Básico)</option>
                  <option value="FISCAL">SENIAT Fiscal Ticket</option>
                  <option value="ELECTRONICA">Factura Electrónica</option>
                </select>
              </div>
            </div>

            <div className="bg-slate-50 rounded-2xl p-4 border border-slate-200 space-y-4">
              <h3 className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                <QrCode size={14} className="text-blue-500" /> Datos Receptor de Pago Móvil (C2B)
              </h3>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    Banco de Pago Móvil
                  </label>
                  <input
                    type="text"
                    value={pagoMovilBanco}
                    disabled={!isAdmin}
                    onChange={e => setPagoMovilBanco(e.target.value)}
                    placeholder="Ej: Banesco, Mercantil, Provincial"
                    className="w-full bg-white border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    Teléfono Destinatario
                  </label>
                  <input
                    type="text"
                    value={pagoMovilTelefono}
                    disabled={!isAdmin}
                    onChange={e => setPagoMovilTelefono(e.target.value)}
                    placeholder="Ej: 0414-1234567"
                    className="w-full bg-white border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed"
                  />
                </div>

                <div>
                  <label className="block text-slate-500 text-[10px] font-bold uppercase tracking-wider mb-1.5">
                    RIF Titular de la Cuenta
                  </label>
                  <input
                    type="text"
                    value={pagoMovilRif}
                    disabled={!isAdmin}
                    onChange={e => setPagoMovilRif(e.target.value)}
                    placeholder="Ej: J-40912185-0"
                    className="w-full bg-white border border-slate-200 text-xs font-semibold rounded-xl p-3 text-slate-700 focus:outline-none focus:border-blue-500 disabled:opacity-70 disabled:cursor-not-allowed uppercase"
                  />
                </div>
              </div>
            </div>

            {isAdmin && (
              <div className="flex justify-end pt-3">
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-6 py-3 bg-blue-600 hover:bg-blue-500 text-white rounded-xl text-xs font-black uppercase tracking-wider flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-50 transition-all"
                >
                  <Save size={15} /> {isSubmitting ? 'Guardando cambios...' : 'Guardar Identidad PyME'}
                </button>
              </div>
            )}

          </form>
        </div>

        {/* Right Columns - High Fidelity Preview */}
        <div className="space-y-6">
          
          {/* Status highlight */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md border border-slate-800 space-y-4">
            <h3 className="text-xs font-black text-slate-400 tracking-wider flex items-center gap-1.5 uppercase">
              <Sparkles className="text-amber-400" size={14} /> Vista Previa del Ticket POS
            </h3>
            
            <div className="bg-white text-slate-900 font-mono text-[10px] leading-tight p-4 rounded-xl shadow-inner border border-slate-200 space-y-3 select-none">
              <p className="text-center font-bold tracking-widest text-[11px] leading-normal uppercase">
                *** {nombre || "IKER POSPYME, C.A."} *** <br />
                RIF: {rif || "J-40912185-0"}
              </p>

              <div>
                <p className="truncate">TLF: {telefono || "N/A"}</p>
                <p className="truncate">EMAIL: {email || "N/A"}</p>
                {registroMercantil && (
                  <p className="line-clamp-2 mt-0.5 leading-snug">REG: {registroMercantil}</p>
                )}
                <p className="line-clamp-2 mt-0.5 leading-snug">DIR: {direccion || "N/A"}</p>
              </div>

              {formatoFactura === 'FISCAL' && (
                <div className="text-[9px] border-y border-slate-200 py-1 my-1">
                  <p className="font-bold">FACTURA FISCAL: SENIAT-00000001</p>
                  <p>FECHA: {new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                  <p>MÁQUINA FISCAL: IKER-POS-20260521</p>
                </div>
              )}

              <div className="border-t border-dashed border-slate-300 my-1 pt-1 space-y-1">
                <div className="flex justify-between font-bold">
                  <span>DESCRIPCION</span>
                  <span>TOTAL</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>1.00 Articulo de Muestra</span>
                  <span>$10.00</span>
                </div>
                <div className="flex justify-between text-slate-500">
                  <span>Impuesto IVA ({impuestoPorcentaje}%)</span>
                  <span>${(10 * (impuestoPorcentaje / 100)).toFixed(2)}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-slate-300 pt-1 flex justify-between font-bold text-[11px]">
                <span>TOTAL A PAGAR:</span>
                <span>${(10 * (1 + impuestoPorcentaje / 100)).toFixed(2)} {moneda}</span>
              </div>

              <div className="flex justify-between text-slate-600 font-bold text-[9px] border-t border-dashed border-slate-200 pt-1">
                <span>TOTAL EN BOLÍVARES:</span>
                <span>{((10 * (1 + impuestoPorcentaje / 100)) * tasaBcv).toFixed(2)} Bs</span>
              </div>
              <div className="text-[8px] text-slate-400 text-right italic">
                Tasa BCV de cambio: {tasaBcv.toFixed(2)} Bs. / USD
              </div>

              {formatoFactura === 'FISCAL' && (
                <div className="text-center font-bold border-t border-dashed border-slate-300 pt-1 text-[9px] tracking-widest text-slate-700">
                  *** SENIAT TICKET FISCAL ***
                </div>
              )}

              <p className="text-center italic text-[9px] mt-2 pt-1 border-t border-dashed border-slate-200 text-slate-500 uppercase leading-normal">
                {mensajePieFactura || "¡Gracias por su compra!"}
              </p>
            </div>
            
            <p className="text-[10px] text-slate-400 text-center italic">
              Esta es una representación de la cabecera y desgloses dinámicos que se aplican en la impresión de facturas físicas.
            </p>
          </div>

          {/* Secure advisory card */}
          <div className="bg-blue-50 border border-blue-100 rounded-2xl p-5 text-xs font-semibold leading-relaxed text-blue-700 space-y-2">
            <span className="font-extrabold uppercase text-[10px] text-blue-800 tracking-wider flex items-center gap-1.5">
              <CheckCircle2 size={16} /> Parámetros Globales
            </span>
            <p>
              Todos los cálculos de IVA efectuados en el Punto de Venta (POS), así como los presupuestos de compras a proveedores y kárdex, adoptan estos valores globales para consistencia fiscal.
            </p>
          </div>

        </div>

      </div>

    </div>
  );
}
