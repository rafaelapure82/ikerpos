export const PERMISOS = {
  DASHBOARD_VER: 'dashboard.ver',

  VENTAS_CREAR: 'ventas.crear',
  VENTAS_VER: 'ventas.ver',
  VENTAS_DEVOLVER: 'ventas.devolver',
  VENTAS_ANULAR: 'ventas.anular',
  VENTAS_REPORTES: 'ventas.reportes',

  CLIENTES_VER: 'clientes.ver',
  CLIENTES_CREAR: 'clientes.crear',
  CLIENTES_EDITAR: 'clientes.editar',
  CLIENTES_ELIMINAR: 'clientes.eliminar',

  ARTICULOS_VER: 'articulos.ver',
  ARTICULOS_CREAR: 'articulos.crear',
  ARTICULOS_EDITAR: 'articulos.editar',
  ARTICULOS_ELIMINAR: 'articulos.eliminar',

  CATEGORIAS_VER: 'categorias.ver',
  CATEGORIAS_CREAR: 'categorias.crear',
  CATEGORIAS_EDITAR: 'categorias.editar',
  CATEGORIAS_ELIMINAR: 'categorias.eliminar',

  PROVEEDORES_VER: 'proveedores.ver',
  PROVEEDORES_CREAR: 'proveedores.crear',
  PROVEEDORES_EDITAR: 'proveedores.editar',
  PROVEEDORES_ELIMINAR: 'proveedores.eliminar',

  COMPRAS_CREAR: 'compras.crear',
  COMPRAS_VER: 'compras.ver',

  INVENTARIO_AJUSTAR: 'inventario.ajustar',
  INVENTARIO_KARDEX: 'inventario.kardex',

  PYME_CONFIG_VER: 'pyme.config.ver',
  PYME_CONFIG_EDITAR: 'pyme.config.editar',

  USUARIOS_GESTIONAR: 'usuarios.gestionar',
} as const;

export type PermisoKey = keyof typeof PERMISOS;
export type PermisoValue = (typeof PERMISOS)[PermisoKey];

export const ALL_PERMISOS: PermisoValue[] = Object.values(PERMISOS);

export const PERMISO_GRUPOS: { grupo: string; permisos: { key: PermisoKey; label: string }[] }[] = [
  {
    grupo: 'Dashboard',
    permisos: [
      { key: 'DASHBOARD_VER', label: 'Ver Dashboard' },
    ],
  },
  {
    grupo: 'Ventas',
    permisos: [
      { key: 'VENTAS_CREAR', label: 'Crear Ventas (POS)' },
      { key: 'VENTAS_VER', label: 'Ver Listado de Ventas' },
      { key: 'VENTAS_DEVOLVER', label: 'Procesar Devoluciones' },
      { key: 'VENTAS_ANULAR', label: 'Anular Ventas' },
      { key: 'VENTAS_REPORTES', label: 'Ver Reportes de Ventas' },
    ],
  },
  {
    grupo: 'Clientes',
    permisos: [
      { key: 'CLIENTES_VER', label: 'Ver Clientes' },
      { key: 'CLIENTES_CREAR', label: 'Crear Clientes' },
      { key: 'CLIENTES_EDITAR', label: 'Editar Clientes' },
      { key: 'CLIENTES_ELIMINAR', label: 'Eliminar Clientes' },
    ],
  },
  {
    grupo: 'Artículos',
    permisos: [
      { key: 'ARTICULOS_VER', label: 'Ver Artículos' },
      { key: 'ARTICULOS_CREAR', label: 'Crear Artículos' },
      { key: 'ARTICULOS_EDITAR', label: 'Editar Artículos' },
      { key: 'ARTICULOS_ELIMINAR', label: 'Eliminar Artículos' },
    ],
  },
  {
    grupo: 'Categorías',
    permisos: [
      { key: 'CATEGORIAS_VER', label: 'Ver Categorías' },
      { key: 'CATEGORIAS_CREAR', label: 'Crear Categorías' },
      { key: 'CATEGORIAS_EDITAR', label: 'Editar Categorías' },
      { key: 'CATEGORIAS_ELIMINAR', label: 'Eliminar Categorías' },
    ],
  },
  {
    grupo: 'Proveedores',
    permisos: [
      { key: 'PROVEEDORES_VER', label: 'Ver Proveedores' },
      { key: 'PROVEEDORES_CREAR', label: 'Crear Proveedores' },
      { key: 'PROVEEDORES_EDITAR', label: 'Editar Proveedores' },
      { key: 'PROVEEDORES_ELIMINAR', label: 'Eliminar Proveedores' },
    ],
  },
  {
    grupo: 'Compras',
    permisos: [
      { key: 'COMPRAS_CREAR', label: 'Registrar Compras' },
      { key: 'COMPRAS_VER', label: 'Ver Compras' },
    ],
  },
  {
    grupo: 'Inventario',
    permisos: [
      { key: 'INVENTARIO_AJUSTAR', label: 'Ajustar Inventario' },
      { key: 'INVENTARIO_KARDEX', label: 'Ver Kárdex' },
    ],
  },
  {
    grupo: 'Configuración PyME',
    permisos: [
      { key: 'PYME_CONFIG_VER', label: 'Ver Configuración' },
      { key: 'PYME_CONFIG_EDITAR', label: 'Editar Configuración' },
    ],
  },
  {
    grupo: 'Usuarios',
    permisos: [
      { key: 'USUARIOS_GESTIONAR', label: 'Gestionar Usuarios' },
    ],
  },
];

export const DEFAULT_PERMISOS: Record<string, string[]> = {
  ADMIN: ALL_PERMISOS,
  VENDEDOR: [
    PERMISOS.DASHBOARD_VER,
    PERMISOS.VENTAS_CREAR,
    PERMISOS.VENTAS_VER,
    PERMISOS.VENTAS_DEVOLVER,
    PERMISOS.CLIENTES_VER,
    PERMISOS.CLIENTES_CREAR,
    PERMISOS.CLIENTES_EDITAR,
    PERMISOS.ARTICULOS_VER,
    PERMISOS.PYME_CONFIG_VER,
  ],
  COMPRAS: [
    PERMISOS.DASHBOARD_VER,
    PERMISOS.VENTAS_VER,
    PERMISOS.ARTICULOS_VER,
    PERMISOS.ARTICULOS_CREAR,
    PERMISOS.ARTICULOS_EDITAR,
    PERMISOS.CATEGORIAS_VER,
    PERMISOS.CATEGORIAS_CREAR,
    PERMISOS.CATEGORIAS_EDITAR,
    PERMISOS.PROVEEDORES_VER,
    PERMISOS.PROVEEDORES_CREAR,
    PERMISOS.PROVEEDORES_EDITAR,
    PERMISOS.COMPRAS_CREAR,
    PERMISOS.COMPRAS_VER,
    PERMISOS.INVENTARIO_AJUSTAR,
    PERMISOS.INVENTARIO_KARDEX,
    PERMISOS.PYME_CONFIG_VER,
  ],
};
