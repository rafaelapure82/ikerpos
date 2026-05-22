import React, { useState } from 'react';
import { useStore } from '../store.js';
import { Lock, User, Terminal, CheckCircle2 } from 'lucide-react';

export default function LoginView() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState('');
  const setUser = useStore(state => state.setUser);
  const setAlert = useStore(state => state.setAlert);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) {
      setLocalError('Por favor ingresa todos los campos');
      return;
    }

    setLocalError('');
    setLocalLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setLocalError(data.error || 'Autenticación fallida');
      } else {
        setUser(data);
        setAlert(`¡Bienvenido de nuevo, ${data.nombre}!`, 'success');
      }
    } catch (err) {
      setLocalError('Error de red. Asegúrate de que el servidor esté activo.');
    } finally {
      setLocalLoading(false);
    }
  };

  return (
    <div className="min-h-screen login-bg-container flex items-center justify-center p-4 selection:bg-teal-500 selection:text-white relative overflow-hidden">
      {/* Background premium glassmorphic overlay for depth and high contrast */}
      <div className="absolute inset-0 bg-slate-900/15 backdrop-blur-[3px] pointer-events-none" />

      <div className="w-full max-w-md bg-[#161b22] border border-[#30363d] rounded-2xl shadow-2xl p-8 relative overflow-hidden transition-all duration-300 hover:border-teal-500/30 z-10">
        
        {/* Header decoration */}
        <div className="absolute top-0 left-0 right-0 h-1.5 bg-gradient-to-r from-teal-500 via-emerald-500 to-indigo-500" />

        <div className="flex flex-col items-center mb-8">
          <div className="h-14 w-14 rounded-2xl bg-teal-500/10 border border-teal-500/30 flex items-center justify-center text-teal-400 mb-4 shadow-inner">
            <Terminal size={28} />
          </div>
          <h1 className="text-2xl font-bold text-gray-100 tracking-tight font-sans">IKER POSPyME</h1>
          <p className="text-gray-400 text-sm mt-1">Gestión ERP de Facturación e Inventario</p>
        </div>

        {localError && (
          <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-xl text-red-400 text-xs flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-red-500 animate-ping shrink-0" />
            <p>{localError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wider">Nombre de Usuario</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <User size={18} />
              </span>
              <input
                type="text"
                value={username}
                onChange={e => setUsername(e.target.value)}
                placeholder="Ej. admin"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-3 pl-11 pr-4 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
              />
            </div>
          </div>

          <div>
            <label className="block text-gray-300 text-xs font-semibold mb-2 uppercase tracking-wider">Contraseña</label>
            <div className="relative">
              <span className="absolute inset-y-0 left-0 flex items-center pl-3.5 text-gray-500">
                <Lock size={18} />
              </span>
              <input
                type="password"
                value={password}
                onChange={e => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-[#0d1117] border border-[#30363d] rounded-xl py-3 pl-11 pr-4 text-gray-200 placeholder-gray-500 text-sm focus:outline-none focus:border-teal-500 focus:ring-1 focus:ring-teal-500/30 transition-all"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={localLoading}
            className="w-full bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-400 hover:to-emerald-400 text-gray-950 font-bold py-3 px-4 rounded-xl text-sm transition-all shadow-lg hover:shadow-teal-500/10 cursor-pointer disabled:opacity-50"
          >
            {localLoading ? 'Autenticando...' : 'Iniciar Sesión'}
          </button>
        </form>

        {/* Credentials hints panel */}
        <div className="mt-8 pt-6 border-t border-[#30363d]/50">
          <div className="bg-[#0d1117]/60 border border-[#30363d]/40 rounded-xl p-4">
            <h4 className="text-gray-300 text-[11px] font-bold uppercase tracking-widest flex items-center gap-1.5 mb-2.5">
              <CheckCircle2 size={13} className="text-teal-400" />
              Cuentas del Seeder Inicial:
            </h4>
            <div className="grid grid-cols-2 gap-3 text-xs text-gray-400">
              <div className="bg-[#161b22]/80 border border-[#30363d]/30 rounded-lg p-2">
                <span className="block font-semibold text-gray-200">Administrador:</span>
                <span className="block text-[11px] text-teal-400 font-mono mt-0.5">usr: admin</span>
                <span className="block text-[11px] text-teal-400 font-mono">pwd: admin123</span>
              </div>
              <div className="bg-[#161b22]/80 border border-[#30363d]/30 rounded-lg p-2">
                <span className="block font-semibold text-gray-200">Rol Vendedor:</span>
                <span className="block text-[11px] text-emerald-400 font-mono mt-0.5">usr: vendedor</span>
                <span className="block text-[11px] text-emerald-400 font-mono">pwd: vendor123</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
}
