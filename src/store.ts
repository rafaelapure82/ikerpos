import { create } from 'zustand';
import { User, Cliente, Proveedor, Articulo, Venta, Compra, MovimientoInventario, DashboardStats, PymeConfig, Categoria } from './types.js';

export interface CartItem {
  articulo: Articulo;
  cantidad: number;
  precio_unitario: number;
}

interface StoreState {
  user: User | null;
  activeTab: string;
  clientes: Cliente[];
  proveedores: Proveedor[];
  articulos: Articulo[];
  ventas: Venta[];
  compras: Compra[];
  movimientos: MovimientoInventario[];
  stats: DashboardStats | null;
  pymeConfig: PymeConfig | null;
  categorias: Categoria[];
  usuarios: User[];
  loading: boolean;
  alert: { message: string; type: 'success' | 'error' } | null;
  
  // Shared POS Cart State
  cart: CartItem[];
  descuento: number;
  metodoPago: string;
  selectedCustomerId: string;
  
  // Actions
  setUser: (user: User | null) => void;
  setActiveTab: (tab: string) => void;
  setAlert: (message: string, type: 'success' | 'error') => void;
  clearAlert: () => void;
  
  // Shared POS Cart Actions
  addToCart: (art: Articulo) => void;
  updateQty: (artId: string, delta: number) => void;
  removeFromCart: (artId: string) => void;
  clearCart: () => void;
  setDescuento: (val: number) => void;
  setMetodoPago: (val: string) => void;
  setSelectedCustomerId: (val: string) => void;
  
  // Global synchronization load
  fetchData: () => Promise<void>;
  fetchStats: () => Promise<void>;
  fetchClientes: () => Promise<void>;
  fetchProveedores: () => Promise<void>;
  fetchArticulos: () => Promise<void>;
  fetchVentas: () => Promise<void>;
  fetchCompras: () => Promise<void>;
  fetchMovimientos: () => Promise<void>;
  fetchPymeConfig: () => Promise<void>;
  fetchCategorias: () => Promise<void>;
  fetchUsuarios: () => Promise<void>;
  updatePymeConfig: (config: PymeConfig) => Promise<boolean>;
}

export const useStore = create<StoreState>((set, get) => ({
  user: (() => {
    try {
      const saved = localStorage.getItem('iker_session');
      return saved ? JSON.parse(saved) : null;
    } catch {
      return null;
    }
  })(),
  activeTab: 'dashboard',
  clientes: [],
  proveedores: [],
  articulos: [],
  ventas: [],
  compras: [],
  movimientos: [],
  stats: null,
  pymeConfig: null,
  categorias: [],
  usuarios: [],
  loading: false,
  alert: null,
  
  // Shared POS Cart State Initialization
  cart: [],
  descuento: 0,
  metodoPago: 'Efectivo',
  selectedCustomerId: '',

  setUser: (user) => {
    set({ user });
    if (user) {
      localStorage.setItem('iker_session', JSON.stringify(user));
    } else {
      localStorage.removeItem('iker_session');
    }
  },

  setActiveTab: (activeTab) => set({ activeTab }),

  setAlert: (message, type) => {
    set({ alert: { message, type } });
    setTimeout(() => {
      const current = get().alert;
      if (current && current.message === message) {
        set({ alert: null });
      }
    }, 4500);
  },

  clearAlert: () => set({ alert: null }),

  // Shared POS Cart Actions Implementation
  addToCart: (art) => {
    if (art.stock <= 0) {
      get().setAlert(`El artículo ${art.nombre} no cuenta con stock disponible.`, 'error');
      return;
    }

    const currentCart = get().cart;
    const existingIndex = currentCart.findIndex(c => c.articulo.id === art.id);
    
    if (existingIndex !== -1) {
      const currentQty = currentCart[existingIndex].cantidad;
      if (currentQty + 1 > art.stock) {
        get().setAlert(`Solamente hay ${art.stock} unidades de ${art.nombre} en inventario.`, 'error');
        return;
      }
      const updated = [...currentCart];
      updated[existingIndex].cantidad += 1;
      set({ cart: updated });
    } else {
      set({ cart: [...currentCart, { articulo: art, cantidad: 1, precio_unitario: art.precio_venta }] });
    }
  },

  updateQty: (artId, delta) => {
    const currentCart = get().cart;
    const index = currentCart.findIndex(c => c.articulo.id === artId);
    if (index === -1) return;

    const currentItem = currentCart[index];
    const targetQty = currentItem.cantidad + delta;

    if (targetQty <= 0) {
      set({ cart: currentCart.filter(c => c.articulo.id !== artId) });
      return;
    }

    if (targetQty > currentItem.articulo.stock) {
      get().setAlert(`Has alcanzado el límite máximo de stock disponible para ${currentItem.articulo.nombre}.`, 'error');
      return;
    }

    const updated = [...currentCart];
    updated[index].cantidad = targetQty;
    set({ cart: updated });
  },

  removeFromCart: (artId) => {
    set({ cart: get().cart.filter(c => c.articulo.id !== artId) });
  },

  clearCart: () => {
    set({ cart: [], descuento: 0, metodoPago: 'Efectivo' });
  },

  setDescuento: (descuento) => set({ descuento }),
  setMetodoPago: (metodoPago) => set({ metodoPago }),
  setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),

  fetchClientes: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/clientes', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ clientes: await r.json() });
    } catch (e) {
      console.error('Error loading customers:', e);
    }
  },

  fetchProveedores: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/proveedores', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ proveedores: await r.json() });
    } catch (e) {
      console.error('Error loading suppliers:', e);
    }
  },

  fetchArticulos: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/articulos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ articulos: await r.json() });
    } catch (e) {
      console.error('Error loading articles:', e);
    }
  },

  fetchVentas: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/ventas', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) {
        const result = await r.json();
        // If result is wrapped with metadata, unpack data array, else fallback directly
        set({ ventas: Array.isArray(result) ? result : (result.data || []) });
      }
    } catch (e) {
      console.error('Error loading sales:', e);
    }
  },

  fetchCompras: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/compras', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ compras: await r.json() });
    } catch (e) {
      console.error('Error loading purchases:', e);
    }
  },

  fetchMovimientos: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/inventario/movimientos', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ movimientos: await r.json() });
    } catch (e) {
      console.error('Error loading inventory logs:', e);
    }
  },

  fetchStats: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/dashboard/stats', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ stats: await r.json() });
    } catch (e) {
      console.error('Error loading analytics:', e);
    }
  },

  fetchPymeConfig: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/pyme-config', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ pymeConfig: await r.json() });
    } catch (e) {
      console.error('Error loading pyme config:', e);
    }
  },

  fetchCategorias: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/categorias', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ categorias: await r.json() });
    } catch (e) {
      console.error('Error loading categories:', e);
    }
  },

  fetchUsuarios: async () => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/usuarios', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (r.ok) set({ usuarios: await r.json() });
    } catch (e) {
      console.error('Error loading users:', e);
    }
  },

  updatePymeConfig: async (config) => {
    try {
      const token = get().user?.token;
      const r = await fetch('/api/pyme-config', {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(config)
      });
      if (r.ok) {
        const u = await r.json();
        set({ pymeConfig: u });
        get().setAlert('Configuración de la PyME guardada correctamente', 'success');
        return true;
      } else {
        const data = await r.json();
        get().setAlert(data.error || 'No se pudo guardar la configuración.', 'error');
        return false;
      }
    } catch (e) {
      get().setAlert('Error de red al actualizar la PyME', 'error');
      return false;
    }
  },

  fetchData: async () => {
    set({ loading: true });
    try {
      const s = get();
      await Promise.all([
        s.fetchClientes(),
        s.fetchProveedores(),
        s.fetchArticulos(),
        s.fetchVentas(),
        s.fetchCompras(),
        s.fetchMovimientos(),
        s.fetchStats(),
        s.fetchPymeConfig(),
        s.fetchCategorias(),
        s.fetchUsuarios()
      ]);
    } catch (e) {
      console.error('Error syncing master dashboard lists:', e);
    } finally {
      set({ loading: false });
    }
  }
}));
