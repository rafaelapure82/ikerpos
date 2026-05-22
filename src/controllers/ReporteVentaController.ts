import { Request, Response } from 'express';
import { prisma } from '../../server/db.js';
import { catchAsync } from '../middlewares/catchAsync.js';

/**
 * GET /api/reportes/ventas/dashboard
 * Retorna analíticas agregadas de ventas (diarias, mensuales, anuales), 
 * top de artículos más vendidos y ranking de mejores clientes.
 */
export const obtenerReporteVentas = catchAsync(async (req: Request, res: Response) => {
  // 1. Obtener todas las ventas no anuladas para cálculos temporales y KPIs generales
  const sales = await prisma.venta.findMany({
    where: {
      estado: { not: 'ANULADA' }
    },
    select: {
      id: true,
      fecha: true,
      total_bruto: true,
      descuento: true,
      total_impuesto: true,
      total_neto: true,
      total_ves: true,
      igtf_monto: true,
      igtf_ves: true,
      tasa_bcv: true
    },
    orderBy: {
      fecha: 'asc'
    }
  });

  // --- CÁLCULO DE KPIs GENERALES ---
  const totalFacturadoUsd = sales.reduce((sum, s) => sum + s.total_neto, 0);
  const totalFacturadoVes = sales.reduce((sum, s) => sum + s.total_ves, 0);
  const totalIgtfUsd = sales.reduce((sum, s) => sum + s.igtf_monto, 0);
  const totalIgtfVes = sales.reduce((sum, s) => sum + s.igtf_ves, 0);
  const totalTransacciones = sales.length;
  const promedioTicket = totalTransacciones > 0 ? totalFacturadoUsd / totalTransacciones : 0;

  // --- DESGLOSE TEMPORAL: DIARIO (ÚLTIMOS 30 DÍAS) ---
  const hoy = new Date();
  const diarioMap = new Map<string, { fecha: string; totalUsd: number; totalVes: number; ventas: number }>();
  
  // Rellenar los últimos 30 días para evitar saltos en la gráfica
  for (let i = 29; i >= 0; i--) {
    const d = new Date();
    d.setDate(hoy.getDate() - i);
    const dateStr = d.toISOString().split('T')[0];
    diarioMap.set(dateStr, {
      fecha: dateStr,
      totalUsd: 0,
      totalVes: 0,
      ventas: 0
    });
  }

  // Llenar con datos reales
  sales.forEach(s => {
    const dateStr = new Date(s.fecha).toISOString().split('T')[0];
    if (diarioMap.has(dateStr)) {
      const current = diarioMap.get(dateStr)!;
      current.totalUsd += s.total_neto;
      current.totalVes += s.total_ves;
      current.ventas += 1;
    }
  });

  const reporteDiario = Array.from(diarioMap.values()).map(item => ({
    ...item,
    totalUsd: parseFloat(item.totalUsd.toFixed(2)),
    totalVes: parseFloat(item.totalVes.toFixed(2))
  }));

  // --- DESGLOSE TEMPORAL: MENSUAL (AÑO EN CURSO) ---
  const mesesNombres = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const anioActual = hoy.getFullYear();
  const reporteMensual = mesesNombres.map((mes, index) => ({
    mes,
    totalUsd: 0,
    totalVes: 0,
    ventas: 0
  }));

  sales.forEach(s => {
    const fechaVenta = new Date(s.fecha);
    if (fechaVenta.getFullYear() === anioActual) {
      const mesIndex = fechaVenta.getMonth();
      reporteMensual[mesIndex].totalUsd += s.total_neto;
      reporteMensual[mesIndex].totalVes += s.total_ves;
      reporteMensual[mesIndex].ventas += 1;
    }
  });

  reporteMensual.forEach(m => {
    m.totalUsd = parseFloat(m.totalUsd.toFixed(2));
    m.totalVes = parseFloat(m.totalVes.toFixed(2));
  });

  // --- DESGLOSE TEMPORAL: ANUAL (HISTÓRICO) ---
  const anualMap: Record<string, { anio: string; totalUsd: number; totalVes: number; ventas: number }> = {};
  
  sales.forEach(s => {
    const anioStr = new Date(s.fecha).getFullYear().toString();
    if (!anualMap[anioStr]) {
      anualMap[anioStr] = {
        anio: anioStr,
        totalUsd: 0,
        totalVes: 0,
        ventas: 0
      };
    }
    anualMap[anioStr].totalUsd += s.total_neto;
    anualMap[anioStr].totalVes += s.total_ves;
    anualMap[anioStr].ventas += 1;
  });

  const reporteAnual = Object.values(anualMap).map(item => ({
    ...item,
    totalUsd: parseFloat(item.totalUsd.toFixed(2)),
    totalVes: parseFloat(item.totalVes.toFixed(2))
  })).sort((a, b) => a.anio.localeCompare(b.anio));

  // --- TOP 5 ARTÍCULOS MÁS VENDIDOS ---
  const topDetails = await prisma.ventaDetalle.groupBy({
    by: ['articuloId'],
    where: {
      venta: { estado: { not: 'ANULADA' } }
    },
    _sum: {
      cantidad: true,
      subtotal: true
    },
    orderBy: {
      _sum: {
        cantidad: 'desc'
      }
    },
    take: 5
  });

  // Enriquecer con datos del artículo
  const topArticulos = await Promise.all(topDetails.map(async (d) => {
    const art = await prisma.articulo.findUnique({
      where: { id: d.articuloId },
      select: {
        id: true,
        nombre: true,
        codigo: true,
        precio_venta: true,
        stock: true,
        categoria: true
      }
    });

    return {
      id: d.articuloId,
      nombre: art?.nombre || `Artículo #${d.articuloId.slice(-4)}`,
      codigo: art?.codigo || 'N/A',
      categoria: art?.categoria || 'General',
      stockRestante: art?.stock || 0,
      precio: art?.precio_venta || 0,
      cantidadVendida: d._sum.cantidad || 0,
      subtotalRecaudado: parseFloat((d._sum.subtotal || 0).toFixed(2))
    };
  }));

  // --- TOP 5 MEJORES CLIENTES ---
  const topCusts = await prisma.venta.groupBy({
    by: ['clienteId'],
    where: {
      estado: { not: 'ANULADA' }
    },
    _sum: {
      total_neto: true
    },
    _count: {
      id: true
    },
    orderBy: {
      _sum: {
        total_neto: 'desc'
      }
    },
    take: 5
  });

  // Enriquecer con datos del cliente
  const topClientes = await Promise.all(topCusts.map(async (c) => {
    const cli = await prisma.cliente.findUnique({
      where: { id: c.clienteId },
      select: {
        id: true,
        nombre: true,
        rif: true,
        email: true,
        telefono: true
      }
    });

    return {
      id: c.clienteId,
      nombre: cli?.nombre || 'Cliente General',
      rif: cli?.rif || 'N/A',
      email: cli?.email || 'N/A',
      telefono: cli?.telefono || 'N/A',
      totalGastado: parseFloat((c._sum.total_neto || 0).toFixed(2)),
      visitasCaja: c._count.id || 0
    };
  }));

  // Retornar JSON unificado consolidado
  return res.json({
    kpis: {
      totalFacturadoUsd: parseFloat(totalFacturadoUsd.toFixed(2)),
      totalFacturadoVes: parseFloat(totalFacturadoVes.toFixed(2)),
      totalIgtfUsd: parseFloat(totalIgtfUsd.toFixed(2)),
      totalIgtfVes: parseFloat(totalIgtfVes.toFixed(2)),
      totalTransacciones,
      promedioTicket: parseFloat(promedioTicket.toFixed(2))
    },
    reporteDiario,
    reporteMensual,
    reporteAnual,
    topArticulos,
    topClientes
  });
});
