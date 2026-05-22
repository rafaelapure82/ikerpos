import React, { useState, useEffect } from 'react';
import { useStore } from '../store.js';
import { 
  TrendingUp, Coins, Users, Package, BarChart3, 
  Calendar, ArrowUpRight, DollarSign, Activity, Percent,
  ArrowDownRight, Landmark, RefreshCw, Printer, Download
} from 'lucide-react';
import { 
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, 
  CartesianGrid, Tooltip, Legend, BarChart, Bar
} from 'recharts';

export default function ReporteVentasView() {
  const { user, setAlert, pymeConfig } = useStore();
  const [reportData, setReportData] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [timeframe, setTimeframe] = useState<'diario' | 'mensual' | 'anual'>('diario');
  const [currency, setCurrency] = useState<'USD' | 'VES'>('USD');

  const fetchReportData = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/reportes/ventas/dashboard?_t=${Date.now()}`, {
        headers: {
          'Authorization': `Bearer ${user?.token}`
        },
        cache: 'no-store'
      });
      if (res.ok) {
        const data = await res.json();
        setReportData(data);
      } else {
        setAlert('No se pudo cargar el reporte de ventas del servidor.', 'error');
      }
    } catch (err) {
      setAlert('Error de conexión al cargar estadísticas.', 'error');
    } finally {
      setLoading(false);
    }
  };

  const exportToExcel = () => {
    if (!reportData) return;

    const { kpis, reporteDiario, reporteMensual, reporteAnual, topArticulos, topClientes } = reportData;
    const tasa = pymeConfig?.tasaBcv ?? 45.50;
    const pymeNombre = pymeConfig?.nombre ?? 'IKER POSPyME, C.A.';
    const pymeRif = pymeConfig?.rif ?? 'J-40912185-0';

    const formatNum = (val: number) => {
      if (val === undefined || val === null || isNaN(val)) return '0,00';
      return val.toFixed(2).replace('.', ',');
    };

    const escapeCSV = (str: string) => {
      if (!str) return '';
      const escaped = str.replace(/"/g, '""');
      if (escaped.includes(';') || escaped.includes('\n') || escaped.includes('\r') || escaped.includes('"')) {
        return `"${escaped}"`;
      }
      return escaped;
    };

    let csvContent = '\uFEFF'; // UTF-8 BOM

    // 1. PyME info
    csvContent += `REPORTE DE VENTAS Y AUDITORÍA - IKER POSPyME\r\n`;
    csvContent += `Empresa:;${escapeCSV(pymeNombre)}\r\n`;
    csvContent += `RIF:;${escapeCSV(pymeRif)}\r\n`;
    csvContent += `Fecha de Generación:;${escapeCSV(new Date().toLocaleString('es-VE'))}\r\n`;
    csvContent += `Tasa BCV Aplicable:;${formatNum(tasa)} Bs.\r\n`;
    csvContent += `Frecuencia de Análisis:;${timeframe.toUpperCase()}\r\n`;
    csvContent += `Moneda de Visualización:;${currency}\r\n\r\n`;

    // 2. KPIs
    csvContent += `MÉTRICAS CLAVE (KPIs) CONSOLIDADAS\r\n`;
    csvContent += `KPI;Monto USD ($);Monto VES (Bs)\r\n`;
    csvContent += `Total Facturado;${formatNum(kpis.totalFacturadoUsd)};${formatNum(kpis.totalFacturadoVes)}\r\n`;
    csvContent += `Ticket Promedio;${formatNum(kpis.promedioTicket)};${formatNum(kpis.promedioTicket * tasa)}\r\n`;
    csvContent += `Ventas Emitidas (Facturas);${kpis.totalTransacciones};-\r\n`;
    csvContent += `IGTF 3% Recaudado;${formatNum(kpis.totalIgtfUsd)};${formatNum(kpis.totalIgtfVes)}\r\n\r\n`;

    // 3. Temporal Breakdown
    csvContent += `DESGLOSE DE VENTAS (${timeframe.toUpperCase()})\r\n`;
    csvContent += `Período / Fecha;Total USD ($);Total VES (Bs);Transacciones / Facturas\r\n`;
    
    const rawData = timeframe === 'diario' 
      ? reporteDiario 
      : timeframe === 'mensual' 
        ? reporteMensual 
        : reporteAnual;

    rawData.forEach((d: any) => {
      const label = timeframe === 'diario' 
        ? d.fecha 
        : timeframe === 'mensual' 
          ? d.mes 
          : d.anio.toString();
      csvContent += `${escapeCSV(label)};${formatNum(d.totalUsd)};${formatNum(d.totalVes)};${d.ventas}\r\n`;
    });
    csvContent += `\r\n`;

    // 4. Top Artículos
    csvContent += `TOP ARTÍCULOS MÁS VENDIDOS\r\n`;
    csvContent += `Posición;Código;Artículo;Categoría;Cantidad Vendida;Total Recaudado USD ($);Total Recaudado VES (Bs);Stock Restante\r\n`;
    topArticulos.forEach((art: any, index: number) => {
      csvContent += `${index + 1};${escapeCSV(art.codigo)};${escapeCSV(art.nombre)};${escapeCSV(art.categoria)};${art.cantidadVendida};${formatNum(art.subtotalRecaudado)};${formatNum(art.subtotalRecaudado * tasa)};${art.stockRestante}\r\n`;
    });
    csvContent += `\r\n`;

    // 5. Top Clientes
    csvContent += `TOP MEJORES CLIENTES (VIP)\r\n`;
    csvContent += `Posición;RIF / C.I.;Cliente;Teléfono;Visitas a Caja;Total Compras USD ($);Total Compras VES (Bs)\r\n`;
    topClientes.forEach((cli: any, index: number) => {
      csvContent += `${index + 1};${escapeCSV(cli.rif)};${escapeCSV(cli.nombre)};${escapeCSV(cli.telefono || 'N/A')};${cli.visitasCaja};${formatNum(cli.totalGastado)};${formatNum(cli.totalGastado * tasa)}\r\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `reporte_ventas_${timeframe}_${new Date().toISOString().slice(0, 10)}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    setAlert('Reporte de Excel generado y descargado correctamente.', 'success');
  };

  const exportToPDF = () => {
    window.print();
  };

  useEffect(() => {
    if (user) {
      fetchReportData();
    }
  }, [user]);

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center py-24 space-y-4 animate-fade-in">
        <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin"></div>
        <p className="text-slate-400 text-xs font-bold uppercase tracking-widest">
          Consolidando analíticas bimonetarias...
        </p>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="text-center py-12 text-slate-400 text-xs font-bold uppercase tracking-widest">
        Sin datos disponibles para reportes.
      </div>
    );
  }

  const { kpis, reporteDiario, reporteMensual, reporteAnual, topArticulos, topClientes } = reportData;
  const tasaBcvVal = pymeConfig?.tasaBcv ?? 45.50;

  // Elegir datos temporales en base al timeframe seleccionado
  const chartDataRaw = timeframe === 'diario' 
    ? reporteDiario 
    : timeframe === 'mensual' 
      ? reporteMensual 
      : reporteAnual;

  // Mapear los datos de Recharts ajustando la moneda seleccionada
  const chartData = chartDataRaw.map((d: any) => {
    const isUSD = currency === 'USD';
    const label = timeframe === 'diario' 
      ? d.fecha.slice(-5) // ej: 05-21
      : timeframe === 'mensual' 
        ? d.mes 
        : d.anio;
    return {
      name: label,
      Ventas: isUSD ? d.totalUsd : d.totalVes,
      Transacciones: d.ventas
    };
  });

  // Encontrar el artículo más vendido para calcular porcentajes relativos
  const maxCantidadVendida = topArticulos.length > 0 
    ? Math.max(...topArticulos.map((a: any) => a.cantidadVendida)) 
    : 1;

  return (
    <div className="space-y-6 animate-fade-in text-slate-705">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-slate-800 tracking-tight flex items-center gap-2">
            Módulo Superior de Reportes de Venta <BarChart3 className="text-blue-600" />
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Analítica de facturación, auditorías bimonetarias, ranking de artículos e identificación de clientes VIP.
          </p>
        </div>

        {/* Currency and Refresh Toolbar */}
        <div className="flex items-center gap-3 print:hidden">
          {/* Export to Excel */}
          <button
            onClick={exportToExcel}
            className="px-3.5 py-2 bg-emerald-600 text-white rounded-xl hover:bg-emerald-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Exportar a Excel (CSV compatible)"
          >
            <Download size={14} />
            <span>Excel</span>
          </button>

          {/* Export to PDF */}
          <button
            onClick={exportToPDF}
            className="px-3.5 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold text-xs transition-all cursor-pointer flex items-center gap-1.5 shadow-sm"
            title="Imprimir o Exportar PDF"
          >
            <Printer size={14} />
            <span>PDF</span>
          </button>

          {/* Refresh button */}
          <button
            onClick={fetchReportData}
            className="p-2.5 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 text-slate-600 transition-all cursor-pointer flex items-center justify-center shadow-sm"
            title="Actualizar datos"
          >
            <RefreshCw size={14} className="animate-hover-spin" />
          </button>

          {/* Currency Toggle Switch */}
          <div className="bg-slate-200/60 p-1 rounded-xl flex items-center border border-slate-300/40">
            <button
              onClick={() => setCurrency('USD')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                currency === 'USD' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              USD ($)
            </button>
            <button
              onClick={() => setCurrency('VES')}
              className={`px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                currency === 'VES' 
                  ? 'bg-blue-600 text-white shadow' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              VES (Bs)
            </button>
          </div>
        </div>
      </div>

      {/* 4 KPIs CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
        
        {/* KPI 1: TOTAL FACTURADO */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
            <Coins size={96} />
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Total Facturado</span>
          <p className="text-2xl font-black font-mono text-slate-800">
            {currency === 'USD' 
              ? `$${kpis.totalFacturadoUsd.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${kpis.totalFacturadoVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`
            }
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100/50 p-1 px-2 rounded-lg w-max">
            <TrendingUp size={11} />
            <span>Tasa BCV aplicable: {tasaBcvVal.toFixed(2)} Bs.</span>
          </div>
        </div>

        {/* KPI 2: PROMEDIO DE TICKET */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
            <DollarSign size={96} />
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Ticket Promedio</span>
          <p className="text-2xl font-black font-mono text-slate-800">
            {currency === 'USD' 
              ? `$${kpis.promedioTicket.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`
              : `${(kpis.promedioTicket * tasaBcvVal).toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`
            }
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-blue-600 bg-blue-50 border border-blue-100/50 p-1 px-2 rounded-lg w-max">
            <Activity size={11} />
            <span>Por transacción de caja</span>
          </div>
        </div>

        {/* KPI 3: TRANSACCIONES TOTALES */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
            <Users size={96} />
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Ventas Emitidas</span>
          <p className="text-2xl font-black font-mono text-slate-800">
            {kpis.totalTransacciones} <span className="text-xs text-slate-400 font-semibold">facturas</span>
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-indigo-600 bg-indigo-50 border border-indigo-100/50 p-1 px-2 rounded-lg w-max">
            <ArrowUpRight size={11} />
            <span>Excluyendo anuladas</span>
          </div>
        </div>

        {/* KPI 4: RECAUDACIÓN DE IGTF (3%) */}
        <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-sm space-y-2 relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-5 group-hover:scale-110 transition-transform text-slate-900">
            <Percent size={96} />
          </div>
          <span className="text-[10px] text-slate-400 uppercase font-black tracking-widest block">Impuestos IGTF (3%)</span>
          <p className="text-2xl font-black font-mono text-slate-800">
            {currency === 'USD' 
              ? `$${kpis.totalIgtfUsd.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
              : `${kpis.totalIgtfVes.toLocaleString('es-VE', { minimumFractionDigits: 2 })} Bs`
            }
          </p>
          <div className="flex items-center gap-1.5 text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-100/50 p-1 px-2 rounded-lg w-max">
            <Landmark size={11} />
            <span>USD efectivo recaudado</span>
          </div>
        </div>

      </div>

      {/* GRAPH CHART SECTION WITH TIMEFRAME SELECTOR */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-6">
        
        {/* Graph Header and timeframe toggle */}
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-100 pb-4">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest">
              Curva Histórica de Ventas e Ingresos
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5">
              Representación visual del flujo monetario facturado en la unidad {currency}.
            </p>
          </div>

          {/* Timeframe switch */}
          <div className="bg-slate-100 p-1 rounded-xl flex items-center border border-slate-200 print:hidden">
            <button
              onClick={() => setTimeframe('diario')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                timeframe === 'diario' 
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Diario
            </button>
            <button
              onClick={() => setTimeframe('mensual')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                timeframe === 'mensual' 
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Mensual
            </button>
            <button
              onClick={() => setTimeframe('anual')}
              className={`px-3 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                timeframe === 'anual' 
                  ? 'bg-white text-slate-800 shadow-sm border border-slate-200/50' 
                  : 'text-slate-500 hover:text-slate-700'
              }`}
            >
              Anual
            </button>
          </div>
        </div>

        {/* Dynamic Area Chart using recharts */}
        <div className="h-72 w-full font-mono text-[9px]">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart
              data={chartData}
              margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
            >
              <defs>
                <linearGradient id="colorSales" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#2563EB" stopOpacity={0.2}/>
                  <stop offset="95%" stopColor="#2563EB" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#E2E8F0" />
              <XAxis 
                dataKey="name" 
                tickLine={false} 
                axisLine={false} 
                stroke="#64748B" 
                fontSize={9}
                fontWeight="bold"
              />
              <YAxis 
                tickLine={false} 
                axisLine={false} 
                stroke="#64748B" 
                fontSize={9}
                fontWeight="bold"
                tickFormatter={(value) => `${currency === 'USD' ? '$' : ''}${value.toLocaleString()}`}
              />
              <Tooltip
                contentStyle={{ 
                  backgroundColor: '#0F172A', 
                  borderRadius: '12px', 
                  color: '#fff',
                  border: 'none',
                  fontSize: '10px',
                  fontWeight: 'bold',
                  boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)'
                }}
                formatter={(value: any, name: any) => [
                  name === 'Ventas' 
                    ? `${currency === 'USD' ? '$' : ''}${value.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ${currency}`
                    : `${value} transacciones`,
                  name
                ]}
              />
              <Legend verticalAlign="top" height={36} iconType="circle" />
              <Area 
                type="monotone" 
                dataKey="Ventas" 
                stroke="#2563EB" 
                strokeWidth={2.5}
                fillOpacity={1} 
                fill="url(#colorSales)" 
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>

      </div>

      {/* BOTTOM GRID: TOP PRODUCTS & TOP CUSTOMERS */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* LEFT COLUMN: TOP 5 BEST SELLING PRODUCTS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 no-print-break">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Package size={15} className="text-blue-500" /> Artículos Más Vendidos (Líderes de Stock)
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5">
              Clasificación de productos ordenados por el volumen de venta acumulado.
            </p>
          </div>

          <div className="space-y-4 pt-2">
            {topArticulos.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs italic">
                Sin registros de artículos vendidos.
              </p>
            ) : (
              topArticulos.map((art: any, index: number) => {
                const ratio = (art.cantidadVendida / maxCantidadVendida) * 100;
                return (
                  <div key={art.id} className="space-y-2">
                    <div className="flex justify-between items-start text-xs">
                      <div>
                        <span className="font-extrabold text-slate-850 block uppercase leading-snug">
                          {index + 1}. {art.nombre}
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          CÓD: {art.codigo} | CAT: {art.categoria}
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="font-extrabold font-mono text-slate-800 block">
                          {art.cantidadVendida} unidades
                        </span>
                        <span className="text-[9px] text-slate-400 font-mono">
                          Recaudado: {currency === 'USD' 
                            ? `$${art.subtotalRecaudado.toFixed(2)}`
                            : `${(art.subtotalRecaudado * tasaBcvVal).toFixed(2)} Bs`
                          }
                        </span>
                      </div>
                    </div>

                    {/* Progress Bar Container */}
                    <div className="flex items-center gap-3">
                      <div className="flex-1 h-2 bg-slate-100 rounded-full overflow-hidden">
                        <div 
                          className="h-full bg-blue-600 rounded-full transition-all duration-500"
                          style={{ width: `${ratio}%` }}
                        />
                      </div>
                      <span className={`text-[9px] font-black w-14 text-right shrink-0 uppercase tracking-wider ${
                        art.stockRestante <= 5 ? 'text-red-500' : 'text-slate-450'
                      }`}>
                        Stock: {art.stockRestante}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* RIGHT COLUMN: TOP 5 VIP CUSTOMERS */}
        <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-sm space-y-4 no-print-break">
          <div>
            <h3 className="text-xs font-black text-slate-800 uppercase tracking-widest flex items-center gap-1.5">
              <Users size={15} className="text-blue-500" /> Mejores Clientes (VIP Leaderboard)
            </h3>
            <p className="text-slate-400 text-[10px] mt-0.5">
              Ranking de clientes con mayor volumen acumulado de compras facturadas.
            </p>
          </div>

          <div className="space-y-3 pt-2">
            {topClientes.length === 0 ? (
              <p className="text-center py-6 text-slate-400 text-xs italic">
                Sin registros de transacciones para clientes.
              </p>
            ) : (
              topClientes.map((cli: any, index: number) => (
                <div 
                  key={cli.id} 
                  className="bg-slate-50 rounded-xl p-3 border border-slate-200/50 flex justify-between items-center gap-4 hover:border-blue-500/30 hover:bg-slate-50/80 transition-all"
                >
                  <div className="min-w-0 flex-1">
                    <span className="font-extrabold text-slate-850 block text-[11px] truncate uppercase leading-normal">
                      {index + 1}. {cli.nombre}
                    </span>
                    <div className="flex flex-wrap gap-x-3 gap-y-0.5 text-[9px] text-slate-400 font-mono mt-0.5">
                      <span className="uppercase">RIF: {cli.rif}</span>
                      {cli.telefono && cli.telefono !== 'N/A' && (
                        <span>TLF: {cli.telefono}</span>
                      )}
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="text-xs font-black font-mono text-blue-600 block">
                      {currency === 'USD' 
                        ? `$${cli.totalGastado.toFixed(2)}`
                        : `${(cli.totalGastado * tasaBcvVal).toFixed(2)} Bs`
                      }
                    </span>
                    <span className="text-[9px] text-slate-400 font-bold block">
                      {cli.visitasCaja} compras
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

    </div>
  );
}
