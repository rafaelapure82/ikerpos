import { useEffect } from 'react';
import { useStore } from '../store.js';
import { 
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, 
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer 
} from 'recharts';
import { 
  TrendingUp, AlertTriangle, Package, DollarSign, Wallet, 
  Activity, ArrowUpRight, BarChart3, PieChartIcon 
} from 'lucide-react';

export default function DashboardView() {
  const { stats, fetchStats, loading, articulos, ventas } = useStore();

  useEffect(() => {
    fetchStats();
  }, [fetchStats, articulos, ventas]);

  if (loading && !stats) {
    return (
      <div className="flex flex-col items-center justify-center p-32">
        <div className="relative h-12 w-12">
          <span className="absolute animate-ping h-full w-full rounded-full bg-teal-500 opacity-20" />
          <div className="h-12 w-12 border-4 border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
        <span className="text-gray-400 text-sm mt-4 font-mono">Sincronizando IKER POSPyME...</span>
      </div>
    );
  }

  // Handle empty state gracefully
  const emptyLineData = [
    { date: 'Sin Datos', monto: 0 }
  ];

  const emptyPieData = [
    { name: 'Sin Artículos', value: 1 }
  ];

  const lineData = stats?.lineChart?.length ? stats.lineChart : emptyLineData;
  const pieData = stats?.pieChart?.length ? stats.pieChart : emptyPieData;

  const COLORS = ['#14b8a6', '#f59e0b', '#3b82f6', '#ec4899', '#8b5cf6', '#10b981'];

  return (
    <div className="space-y-8 animate-fade-in">
      {/* Title block */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-gray-100 tracking-tight flex items-center gap-2">
            Panel Principal <Activity className="text-teal-400" />
          </h1>
          <p className="text-gray-400 text-sm mt-1">Supervisión general de ingresos, cuentas y abastecimiento en vivo.</p>
        </div>
        <button 
          onClick={() => fetchStats()}
          className="bg-[#21262d] border border-[#30363d] hover:border-teal-500/30 text-gray-200 hover:text-white px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-2 cursor-pointer transition-all shrink-0"
        >
          Actualizar Datos
        </button>
      </div>

      {/* 4 KPI Bento-Grid cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        
        {/* KPI 1: Ventas Totales */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 relative overflow-hidden transition-all hover:border-teal-500/20 group">
          <div className="absolute top-0 right-0 h-16 w-16 bg-teal-500/5 rounded-bl-full pointer-events-none group-hover:bg-teal-500/10 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Ventas Conciliadas</span>
            <div className="p-2 rounded-xl bg-teal-500/10 border border-teal-500/20 text-teal-400">
              <DollarSign size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight">
            ${(stats?.totalVendido || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <span className="text-emerald-400 font-bold flex items-center">
              <ArrowUpRight size={14} /> +Cobrado
            </span>
            en transacciones PAGADAS
          </p>
        </div>

        {/* KPI 2: Cuentas por Cobrar */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 relative overflow-hidden transition-all hover:border-amber-500/20 group">
          <div className="absolute top-0 right-0 h-16 w-16 bg-amber-500/5 rounded-bl-full pointer-events-none group-hover:bg-amber-500/10 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Cuentas por Cobrar</span>
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <Wallet size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight">
            ${(stats?.totalPendiente || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
          </h3>
          <p className="text-xs text-gray-400 mt-2 flex items-center gap-1">
            <span className="text-amber-400 font-bold">● PENDIENTE</span>
            facturas emitidas a crédito
          </p>
        </div>

        {/* KPI 3: Stock de Articulos */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 relative overflow-hidden transition-all hover:border-blue-500/20 group">
          <div className="absolute top-0 right-0 h-16 w-16 bg-blue-500/5 rounded-bl-full pointer-events-none group-hover:bg-blue-500/10 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Stock Unitario Total</span>
            <div className="p-2 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-400">
              <Package size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight">
            {stats?.recuentos?.totalStock || 0} UDS
          </h3>
          <p className="text-xs text-gray-400 mt-2">
            En un catálogo de <span className="text-blue-400 font-bold">{stats?.recuentos?.articulos || 0}</span> artículos
          </p>
        </div>

        {/* KPI 4: Stock Crítico */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 relative overflow-hidden transition-all hover:border-red-500/20 group">
          <div className="absolute top-0 right-0 h-16 w-16 bg-red-500/5 rounded-bl-full pointer-events-none group-hover:bg-red-500/10 transition-all" />
          <div className="flex items-center justify-between mb-4">
            <span className="text-xs font-bold text-gray-400 uppercase tracking-wider">Fallas Críticas de Stock</span>
            <div className="p-2 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400">
              <AlertTriangle size={18} />
            </div>
          </div>
          <h3 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight">
            {stats?.recuentos?.criticos || 0} ÍTEMS
          </h3>
          <p className="text-xs text-gray-400 mt-2">
            {stats?.recuentos?.criticos && stats?.recuentos?.criticos > 0 ? (
              <span className="text-red-400 font-bold animate-pulse">Abastecimiento crítico requerido</span>
            ) : (
              <span className="text-emerald-400 font-bold">Niveles de stock correctos</span>
            )}
          </p>
        </div>

      </div>

      {/* Chart blocks */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Trendline chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 lg:col-span-2">
          <h4 className="text-sm font-bold text-gray-300 mb-6 uppercase tracking-wider flex items-center gap-2">
            <BarChart3 size={16} className="text-teal-400" />
            Tendencia de Facturación ($ Neto)
          </h4>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%" minWidth={0}>
              <LineChart data={lineData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
                <XAxis dataKey="date" stroke="#8b949e" fontSize={10} tickLine={false} />
                <YAxis stroke="#8b949e" fontSize={10} tickLine={false} axisLine={false} />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px' }}
                  labelStyle={{ color: '#8b949e', fontSize: '11px', fontWeight: 'bold' }}
                />
                <Line type="monotone" dataKey="monto" stroke="#14b8a6" strokeWidth={3} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Category distribution pie-chart */}
        <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6 flex flex-col justify-between">
          <div>
            <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
              <PieChartIcon size={16} className="text-teal-400" />
              Categorías en Catálogo
            </h4>
            <div className="h-48 relative">
              <ResponsiveContainer width="100%" height="100%" minWidth={0}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ backgroundColor: '#161b22', borderColor: '#30363d', borderRadius: '8px', fontSize: '12px' }}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Categorias Legend */}
          <div className="space-y-1.5 mt-4 border-t border-[#30363d]/50 pt-3">
            {pieData.map((entry: any, index: number) => (
              <div key={entry.name} className="flex items-center justify-between text-xs text-gray-400">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                  <span>{entry.name}</span>
                </div>
                <span className="font-semibold text-gray-200">{entry.value}</span>
              </div>
            ))}
          </div>
        </div>

      </div>

      {/* Critical stock items detail list */}
      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        <h4 className="text-sm font-bold text-gray-300 mb-4 uppercase tracking-wider flex items-center gap-2">
          <AlertTriangle size={16} className="text-red-400" />
          Alertas de Stock por Reponer (Crítico o Agotado)
        </h4>

        {(!stats?.criticosList || stats.criticosList.length === 0) ? (
          <div className="bg-[#0e1117]/50 border border-[#30363d]/30 rounded-xl p-8 text-center text-gray-500 text-sm">
            🎉 Todos los artículos se encuentran con stock por encima de su mínimo de seguridad.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-[#30363d] text-xs text-gray-400 font-bold">
                  <th className="pb-3 uppercase">Código</th>
                  <th className="pb-3 uppercase">Articulo</th>
                  <th className="pb-3 text-right uppercase">Stock Actual</th>
                  <th className="pb-3 text-right uppercase">Mínimo</th>
                  <th className="pb-3 text-center uppercase">Abastecimiento</th>
                </tr>
              </thead>
              <tbody>
                {stats.criticosList.map((art) => (
                  <tr key={art.id} className="border-b border-[#30363d]/40 text-xs text-gray-300 hover:bg-[#0d1117]/30">
                    <td className="py-3 font-mono text-teal-400">{art.codigo}</td>
                    <td className="py-3 font-semibold text-gray-100">{art.nombre}</td>
                    <td className="py-3 text-right font-bold text-red-400">{art.stock} uds</td>
                    <td className="py-3 text-right text-gray-400">{art.stock_minimo} uds</td>
                    <td className="py-3 text-center">
                      <span className="inline-block px-2.5 py-1 bg-red-500/10 border border-red-500/20 text-red-400 rounded-full font-bold text-[9px] uppercase tracking-wide">
                        {art.stock === 0 ? 'Agotado' : 'Reponer Stock'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
