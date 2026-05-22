import { Request, Response } from 'express';
import { prisma } from '../../server/db.js';
import { catchAsync } from '../middlewares/catchAsync.js';

/**
 * GET /api/reportes/compras-por-cliente/:clienteId
 * Displays the historical items/sales records purchased by a specific customer.
 */
export const comprasPorCliente = catchAsync(async (req: Request, res: Response) => {
  const { clienteId } = req.params;

  const client = await prisma.cliente.findUnique({
    where: { id: clienteId }
  });

  if (!client) {
    return res.status(404).json({ error: 'Cliente no encontrado' });
  }

  // Find all sales (Ventas) registered to this client
  const patientSales = await prisma.venta.findMany({
    where: {
      clienteId
    },
    include: {
      detalles: {
        include: {
          articulo: true
        }
      }
    },
    orderBy: {
      fecha: 'desc'
    }
  });

  // Calculate high-level totals
  const totalInvoiced = patientSales.reduce((sum, v) => sum + (v.estado !== 'ANULADA' ? v.total_neto : 0), 0);
  const creditLimitUsage = patientSales.reduce((sum, v) => sum + (v.estado === 'PENDIENTE' ? v.total_neto : 0), 0);

  return res.json({
    cliente: {
      id: client.id,
      nombre: client.nombre,
      rif: client.rif,
      deuda_limite: client.deuda_limite,
      saldo_deudor: creditLimitUsage
    },
    resumen: {
      compras_totales_monto: parseFloat(totalInvoiced.toFixed(2)),
      credito_activo: parseFloat(creditLimitUsage.toFixed(2)),
      cantidad_transacciones: patientSales.length
    },
    ventas: patientSales
  });
});
