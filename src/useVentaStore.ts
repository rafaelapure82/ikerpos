import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { Articulo } from './types.js';
import { useStore } from './store.js';

export interface CartItem {
  articulo: Articulo;
  cantidad: number;
  precio_unitario: number;
}

// 1. Calculate physical consumption of articles in the cart recursively
export const getCartPhysicalConsumption = (cart: CartItem[], articulos: Articulo[]): Record<string, number> => {
  const consumption: Record<string, number> = {};
  
  const resolveConsumption = (artId: string, qty: number, visitados: Set<string>) => {
    const art = articulos.find(a => a.id === artId);
    if (!art) return;
    
    if (art.es_combo) {
      if (visitados.has(artId)) return; // Prevent cycle
      const nuevosVisitados = new Set(visitados);
      nuevosVisitados.add(artId);
      
      if (art.componentes) {
        for (const comp of art.componentes) {
          resolveConsumption(comp.componenteId, qty * comp.cantidad, nuevosVisitados);
        }
      }
    } else {
      consumption[artId] = (consumption[artId] || 0) + qty;
    }
  };
  
  for (const item of cart) {
    resolveConsumption(item.articulo.id, item.cantidad, new Set());
  }
  
  return consumption;
};

// 2. Helper to calculate remaining stock of an article taking other cart items into account recursively
export const calcularStockDisponible = (
  artId: string,
  articulos: Articulo[],
  cart: CartItem[],
  excludeCartItemId?: string
): number => {
  const cartToAnalyze = excludeCartItemId 
    ? cart.filter(item => item.articulo.id !== excludeCartItemId)
    : cart;
    
  const consumption = getCartPhysicalConsumption(cartToAnalyze, articulos);
  
  const getRemainingStockRecursive = (id: string, visitados: Set<string>): number => {
    const art = articulos.find(a => a.id === id);
    if (!art) return 0;
    
    if (!art.es_combo) {
      const consumed = consumption[id] || 0;
      return Math.max(0, art.stock - consumed);
    }
    
    if (visitados.has(id)) return 0;
    const nuevosVisitados = new Set(visitados);
    nuevosVisitados.add(id);
    
    if (!art.componentes || art.componentes.length === 0) return 0;
    
    let minPosible = Infinity;
    for (const comp of art.componentes) {
      if (comp.cantidad <= 0) continue;
      const compStock = getRemainingStockRecursive(comp.componenteId, nuevosVisitados);
      const posibles = Math.floor(compStock / comp.cantidad);
      if (posibles < minPosible) {
        minPosible = posibles;
      }
    }
    return minPosible === Infinity ? 0 : minPosible;
  };
  
  return getRemainingStockRecursive(artId, new Set());
};

// 3. Simple helper for displaying absolute virtual stock without cart subtraction
export const calcularStockComboSimple = (artId: string, articulos: Articulo[], visitados = new Set<string>()): number => {
  const art = articulos.find(a => a.id === artId);
  if (!art) return 0;
  if (!art.es_combo) return art.stock;
  if (visitados.has(artId)) return 0;
  
  const nuevosVisitados = new Set(visitados);
  nuevosVisitados.add(artId);
  
  if (!art.componentes || art.componentes.length === 0) return 0;
  
  let minPosible = Infinity;
  for (const comp of art.componentes) {
    if (comp.cantidad <= 0) continue;
    const compStock = calcularStockComboSimple(comp.componenteId, articulos, nuevosVisitados);
    const posibles = Math.floor(compStock / comp.cantidad);
    if (posibles < minPosible) {
      minPosible = posibles;
    }
  }
  return minPosible === Infinity ? 0 : minPosible;
};

interface VentaStoreState {
  cart: CartItem[];
  descuento: number;
  metodoPago: string;
  selectedCustomerId: string;

  // Actions
  addToCart: (art: Articulo) => void;
  updateQty: (artId: string, delta: number) => void;
  removeFromCart: (artId: string) => void;
  clearCart: () => void;
  setDescuento: (val: number) => void;
  setMetodoPago: (val: string) => void;
  setSelectedCustomerId: (val: string) => void;

  // Totals computation
  getTotals: () => {
    totalBruto: number;
    totalBase: number;
    totalImpuesto: number;
    totalNeto: number;
  };
}

export const useVentaStore = create<VentaStoreState>()(
  persist(
    (set, get) => ({
      cart: [],
      descuento: 0,
      metodoPago: 'Efectivo',
      selectedCustomerId: '',

      addToCart: (art) => {
        const articulos = useStore.getState().articulos;
        const currentCart = get().cart;
        
        // Calculate available stock taking into account what is already in the cart
        const stockDisponible = calcularStockDisponible(art.id, articulos, currentCart);

        if (stockDisponible <= 0) {
          useStore.getState().setAlert(`El artículo ${art.nombre} no cuenta con stock disponible suficiente.`, 'error');
          return;
        }

        const existingIndex = currentCart.findIndex((c) => c.articulo.id === art.id);

        if (existingIndex !== -1) {
          const currentQty = currentCart[existingIndex].cantidad;
          if (currentQty + 1 > stockDisponible) {
            useStore.getState().setAlert(`Solamente hay ${stockDisponible} unidades disponibles de ${art.nombre} (o sus componentes).`, 'error');
            return;
          }
          const updated = [...currentCart];
          updated[existingIndex].cantidad += 1;
          set({ cart: updated });
        } else {
          set({
            cart: [
              ...currentCart,
              { articulo: art, cantidad: 1, precio_unitario: art.precio_venta },
            ],
          });
        }
      },

      updateQty: (artId, delta) => {
        const currentCart = get().cart;
        const index = currentCart.findIndex((c) => c.articulo.id === artId);
        if (index === -1) return;

        const currentItem = currentCart[index];
        const targetQty = currentItem.cantidad + delta;

        if (targetQty <= 0) {
          set({ cart: currentCart.filter((c) => c.articulo.id !== artId) });
          return;
        }

        const articulos = useStore.getState().articulos;
        // Calculate available stock excluding this item's current qty in the cart,
        // so we check if the TARGET qty exceeds the total absolute available stock.
        const stockDisponible = calcularStockDisponible(artId, articulos, currentCart, artId);

        if (targetQty > stockDisponible) {
          useStore.getState().setAlert(
            `Has alcanzado el límite máximo de stock disponible (${stockDisponible} uds) para ${currentItem.articulo.nombre}.`,
            'error'
          );
          return;
        }

        const updated = [...currentCart];
        updated[index].cantidad = targetQty;
        set({ cart: updated });
      },

      removeFromCart: (artId) => {
        set({ cart: get().cart.filter((c) => c.articulo.id !== artId) });
      },

      clearCart: () => {
        set({ cart: [], descuento: 0, metodoPago: 'Efectivo' });
      },

      setDescuento: (descuento) => set({ descuento }),
      setMetodoPago: (metodoPago) => set({ metodoPago }),
      setSelectedCustomerId: (selectedCustomerId) => set({ selectedCustomerId }),

      getTotals: () => {
        const { cart, descuento } = get();
        const totalBruto = cart.reduce((sum, item) => sum + item.cantidad * item.precio_unitario, 0);
        const totalBase = Math.max(0, totalBruto - descuento);
        
        // Dynamically calculate tax from pymeConfig
        const pymeConfig = useStore.getState().pymeConfig;
        const taxRate = pymeConfig ? (pymeConfig.impuestoPorcentaje / 100) : 0.16;
        const totalImpuesto = totalBase * taxRate;
        const totalNeto = totalBase + totalImpuesto;

        return {
          totalBruto,
          totalBase,
          totalImpuesto,
          totalNeto,
        };
      },
    }),
    {
      name: 'iker_pos_cart',
      storage: createJSONStorage(() => sessionStorage),
    }
  )
);
