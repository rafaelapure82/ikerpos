export type Rol = 'ADMIN' | 'VENDEDOR' | 'COMPRAS';

export interface User {
  id: string;
  username: string;
  nombre: string;
  rol: Rol;
  activo?: boolean;
  token?: string;
}

export interface Cliente {
  id: string;
  rif: string;
  nombre: string;
  email?: string;
  telefono?: string;
  deuda_limite: number;
}

export interface Proveedor {
  id: string;
  rif: string;
  empresa: string;
  contacto?: string;
}

export interface ComboComponente {
  id: string;
  comboId: string;
  componenteId: string;
  componente?: Articulo;
  cantidad: number;
}

export interface Articulo {
  id: string;
  codigo: string;
  nombre: string;
  precio_costo: number;
  precio_venta: number;
  stock: number;
  stock_minimo: number;
  categoria: string;
  impuesto_iva: number;
  imagen_url?: string;
  es_combo?: boolean;
  componentes?: ComboComponente[];
}

export interface VentaDetalle {
  id: string;
  ventaId: string;
  articuloId: string;
  articulo?: Articulo;
  cantidad: number;
  precio_unitario: number;
  subtotal: number;
}

export interface Venta {
  id: string;
  fecha: string;
  clienteId: string;
  cliente?: Cliente;
  total_bruto: number;
  descuento: number;
  total_impuesto: number;
  total_neto: number;
  estado: 'PAGADA' | 'PENDIENTE' | 'ANULADA';
  metodo_pago: string;
  detalles?: VentaDetalle[];
  tasa_bcv?: number;
  total_ves?: number;
  igtf_monto?: number;
  igtf_ves?: number;
  monto_pagado_usd?: number;
  monto_pagado_ves?: number;
  nro_factura_fiscal?: string;
}

export interface CompraDetalle {
  id: string;
  compraId: string;
  articuloId: string;
  articulo?: Articulo;
  cantidad: number;
  costo_unitario: number;
  subtotal: number;
}

export interface Compra {
  id: string;
  fecha: string;
  proveedorId: string;
  proveedor?: Proveedor;
  total: number;
  factura_referencia?: string;
  detalles?: CompraDetalle[];
}

export interface MovimientoInventario {
  id: string;
  fecha: string;
  articuloId: string;
  articulo?: Articulo;
  tipo: 'ENTRADA' | 'SALIDA' | 'AJUSTE';
  cantidad: number;
  referenciaId?: string;
}

export interface DashboardStats {
  totalVendido: number;
  totalPendiente: number;
  recuentos: {
    ventas: number;
    criticos: number;
    articulos: number;
    totalStock: number;
  };
  criticosList: Articulo[];
  lineChart: Array<{ date: string; monto: number }>;
  pieChart: Array<{ name: string; value: number }>;
}

export interface PymeConfig {
  nombre: string;
  rif: string;
  telefono: string;
  direccion: string;
  email: string;
  moneda: string;
  impuestoPorcentaje: number;
  mensajePieFactura: string;
  registroMercantil: string;
  tasaBcv?: number;
  habilitarIgtf?: boolean;
  pagoMovilBanco?: string;
  pagoMovilTelefono?: string;
  pagoMovilRif?: string;
  formatoFactura?: 'ESTANDAR' | 'FISCAL' | 'ELECTRONICA';
}

export interface Categoria {
  id: string;
  nombre: string;
  descripcion?: string;
  articuloCount?: number;
}
