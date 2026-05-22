import { useState } from 'react';
import { useStore } from '../store.js';
import { Landmark, Search, ClipboardList, ArrowUpRight, ArrowDownLeft, Calendar } from 'lucide-react';

export default function KardexView() {
  const { movimientos } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [typeFilter, setTypeFilter] = useState('All');

  const filtered = movimientos.filter(mov => {
    const artName = mov.articulo?.nombre || '';
    const artCode = mov.articulo?.codigo || '';
    
    const matchesSearch = artName.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          artCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (mov.referenciaId || '').toLowerCase().includes(searchQuery.toLowerCase());
                          
    const matchesType = typeFilter === 'All' || mov.tipo === typeFilter;
    return matchesSearch && matchesType;
  });

  return (
    <div className="space-y-6 animate-fade-in">
      
      {/* Title block */}
      <div>
        <h1 className="text-3xl font-extrabold text-[#f1f6fc] tracking-tight flex items-center gap-2">
          Auditoría Kárdex de Inventario <ClipboardList className="text-teal-400" />
        </h1>
        <p className="text-gray-400 text-sm mt-1">Bitácora fiscal de auditoría. Transparencia absoluta en flujos de entradas, salidas y ajustes manuales.</p>
      </div>

      <div className="bg-[#161b22] border border-[#30363d] rounded-2xl p-6">
        
        {/* Filters and search logs */}
        <div className="flex flex-col md:flex-row gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-400 self-center h-full" size={16} />
            <input
              type="text"
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              placeholder="Filtra por artículo, código de barra o número referencia..."
              className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-2.5 pl-10 pr-4 text-xs text-gray-100 focus:outline-none focus:border-teal-500"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-400 font-semibold uppercase tracking-wider">Flujo:</span>
            <select
              value={typeFilter}
              onChange={e => setTypeFilter(e.target.value)}
              className="bg-[#0d1117] border border-[#30363d] text-gray-200 rounded-xl px-3 py-2 text-xs focus:outline-none focus:border-teal-500 cursor-pointer"
            >
              <option value="All">Todos</option>
              <option value="ENTRADA">ENTRADA (Aumento de stock)</option>
              <option value="SALIDA">SALIDA (Reducción de stock)</option>
            </select>
          </div>
        </div>

        {/* Audit trail table */}
        {filtered.length === 0 ? (
          <div className="py-16 text-center text-gray-500 text-sm">
            📋 No se registran movimientos que correspondan al filtro de auditoría Kárdex.
          </div>
        ) : (
          <div className="overflow-x-auto text-xs">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#12161f] border-b border-[#30363d] text-gray-400 font-bold">
                  <th className="py-3 px-4">Fecha / Hora</th>
                  <th className="py-3 px-4">Artículo</th>
                  <th className="py-3 px-4 text-center">Operación</th>
                  <th className="py-3 px-4 text-right">Variación Cantidad</th>
                  <th className="py-3 px-4 text-center">Referencia / Motivo</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#30363d]/40">
                {filtered.map(mov => {
                  const isEntrada = mov.tipo === 'ENTRADA';
                  return (
                    <tr key={mov.id} className="text-gray-300 hover:bg-[#0d1117]/30 transition-all">
                      <td className="py-3.5 px-4 font-mono text-gray-400 whitespace-nowrap">
                        <div className="flex items-center gap-1.5">
                          <Calendar size={13} className="text-gray-500" />
                          {new Date(mov.fecha).toLocaleString()}
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="block font-bold text-gray-100">{mov.articulo?.nombre || `Articulo ID: ${mov.articuloId}`}</span>
                        {mov.articulo?.codigo && (
                          <span className="text-[10px] font-mono text-teal-400">{mov.articulo.codigo}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold uppercase tracking-wide border ${
                          isEntrada 
                            ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' 
                            : 'bg-red-500/10 text-red-400 border-red-500/20'
                        }`}>
                          {isEntrada ? <ArrowUpRight size={11} /> : <ArrowDownLeft size={11} />}
                          {mov.tipo}
                        </span>
                      </td>
                      <td className={`py-3.5 px-4 text-right font-mono font-bold text-sm ${isEntrada ? 'text-teal-400' : 'text-red-400'}`}>
                        {isEntrada ? '+' : '-'}{mov.cantidad} uds
                      </td>
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-block font-mono bg-[#1c2128] border border-[#30363d]/60 text-gray-400 py-1 px-2.5 rounded-lg font-bold text-[10px] uppercase">
                          {mov.referenciaId || 'AJUSTE-MANUAL'}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  );
}
