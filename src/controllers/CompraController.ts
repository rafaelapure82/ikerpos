import { Request, Response } from 'express';
import { prisma } from '../../server/db.js';
import { catchAsync } from '../middlewares/catchAsync.js';

/**
 * POST /api/compras
 * Registers a new supplier purchase. Increases stock, adjusts the current pricing item history cost.
 */
export const registrarCompra = catchAsync(async (req: Request, res: Response) => {
  const { proveedorId, total, factura_referencia, detalles } = req.body;

  if (!proveedorId || !detalles || detalles.length === 0) {
    return res.status(400).json({ error: 'Se requiere proveedorId y lista de detalles de compra' });
  }

  const result = await prisma.$transaction(async (tx) => {
    // 1. Create the base supplier purchase
    const purchase = await tx.compra.create({
      data: {
        proveedorId,
        total: parseFloat(total),
        factura_referencia: factura_referencia || '',
        detalles: {
          create: detalles.map((d: any) => ({
            articuloId: d.articuloId,
            cantidad: parseFloat(d.cantidad),
            costo_unitario: parseFloat(d.costo_unitario),
            subtotal: parseFloat(d.cantidad) * parseFloat(d.costo_unitario),
          }))
        }
      },
      include: {
        proveedor: true,
        detalles: true
      }
    });

    // 2. Update price_costo, increase stock, and register ENTRADA movement for each item
    for (const d of purchase.detalles) {
      await tx.articulo.update({
        where: { id: d.articuloId },
        data: {
          precio_costo: d.costo_unitario,
          stock: {
            increment: d.cantidad,
          },
        },
      });

      await tx.movimientoInventario.create({
        data: {
          articuloId: d.articuloId,
          tipo: 'ENTRADA',
          cantidad: d.cantidad,
          referenciaId: `COMPRA-${purchase.id}`,
        },
      });
    }

    return purchase;
  });

  return res.status(201).json(result);
});

/**
 * GET /api/compras
 * Fetch purchase bills history.
 */
export const obtenerCompras = catchAsync(async (req: Request, res: Response) => {
  const list = await prisma.compra.findMany({
    include: {
      proveedor: true,
      detalles: {
        include: { articulo: true }
      }
    },
    orderBy: { fecha: 'desc' }
  });
  return res.json(list);
});
