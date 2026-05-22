import React, { useEffect } from 'react';
import { HashRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useStore } from './store.js';

// Layout and Route Protection Components
import Layout from './components/Layout.js';
import PrivateRoute from './components/PrivateRoute.js';

// Application Feature Views
import LoginView from './components/LoginView.js';
import DashboardView from './components/DashboardView.js';
import POSView from './components/POSView.js';
import VentasView from './components/VentasView.js';
import DevolucionesView from './components/DevolucionesView.js';
import ArticulosView from './components/ArticulosView.js';
import ClientesView from './components/ClientesView.js';
import ClienteReporteView from './components/ClienteReporteView.js';
import ReporteVentasView from './components/ReporteVentasView.js';
import ProveedoresView from './components/ProveedoresView.js';
import ComprasView from './components/ComprasView.js';
import KardexView from './components/KardexView.js';
import PymeConfigView from './components/PymeConfigView.js';
import CategoriasView from './components/CategoriasView.js';
import UsuariosView from './components/UsuariosView.js';
import PermisosView from './components/PermisosView.js';

// Utilities & Icons
import { ShieldAlert, CheckCircle2 } from 'lucide-react';

export default function App() {
  const { 
    user, 
    alert, 
    clearAlert, 
    fetchData 
  } = useStore();

  // Load backend master lists on mount when user is authenticated
  useEffect(() => {
    if (user && user.token) {
      fetchData();
    }
  }, [user, fetchData]);

  return (
    <HashRouter>
      <div className="relative min-h-screen">
        
        {/* GLOBAL NOTIFICATION BANNER */}
        {alert && (
          <div className={`fixed top-4 right-4 z-[9999] p-4 rounded-xl shadow-2xl flex items-center gap-3 border transition-all animate-slide-in-right ${
            alert.type === 'success' 
              ? 'bg-emerald-50 text-emerald-650 border-emerald-200' 
              : 'bg-red-50 text-red-600 border-red-200'
          }`}>
            {alert.type === 'success' ? (
              <CheckCircle2 size={18} className="text-emerald-500 animate-bounce" />
            ) : (
              <ShieldAlert size={18} className="text-red-500" />
            )}
            <p className="text-xs font-black leading-normal">{alert.message}</p>
            <button 
              onClick={() => clearAlert()} 
              className="text-slate-400 hover:text-slate-700 ml-2 text-xs font-extrabold cursor-pointer"
            >
              ×
            </button>
          </div>
        )}

        {/* DEFINING THE ROUTING GRIDS */}
        <Routes>
          {/* Public login view */}
          <Route 
            path="/login" 
            element={!user ? <LoginView /> : <Navigate to="/" replace />} 
          />
          
          {/* Protected Area */}
          <Route element={<PrivateRoute />}>
            <Route element={<Layout />}>
              <Route path="/" element={<DashboardView />} />
              <Route path="/pos" element={<POSView />} />
              <Route path="/ventas" element={<VentasView />} />
              <Route path="/devoluciones" element={<DevolucionesView />} />
              <Route path="/articulos" element={<ArticulosView />} />
              <Route path="/categorias" element={<CategoriasView />} />
              <Route path="/clientes" element={<ClientesView />} />
              <Route path="/cliente-reporte" element={<ClienteReporteView />} />
              <Route path="/reporte-ventas" element={<ReporteVentasView />} />
              <Route path="/proveedores" element={<ProveedoresView />} />
              <Route path="/compras" element={<ComprasView />} />
              <Route path="/kardex" element={<KardexView />} />
              <Route path="/pyme-config" element={<PymeConfigView />} />
              <Route path="/usuarios" element={<UsuariosView />} />
              <Route path="/permisos" element={<PermisosView />} />
            </Route>
          </Route>

          {/* Fallback route redirect */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>

      </div>
    </HashRouter>
  );
}
