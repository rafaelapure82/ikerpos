import { Request, Response } from 'express';
import { prisma } from '../../server/db.js';
import { catchAsync } from '../middlewares/catchAsync.js';

/**
 * Helper to recursively resolve combo items down to their physical components.
 * Returns an array of physical product requirements.
 */
async function resolverComponentesFisicos(
  articuloId: string,
  cantidad: number,
  tx: any,
  visitados: Set<string> = new Set()
): Promise<Array<{ articuloId: string; cantidad: number; nombre: string }>> {
  const art = await tx.articulo.findUnique({
    where: { id: articuloId },
    include: { componentes: true }
  });

  if (!art) {
    throw new Error(`Artículo no encontrado con ID: ${articuloId}`);
  }

  // If it's a physical product, return itself
  if (!art.es_combo) {
    return [{ articuloId, cantidad, nombre: art.nombre }];
  }

  // Detect recursive cycles to prevent infinite loops
  if (visitados.has(articuloId)) {
    throw new Error(`Ciclo recursivo detectado en la composición del combo "${art.nombre}"`);
  }

  const nuevosVisitados = new Set(visitados);
  nuevosVisitados.add(articuloId);

  let result: Array<{ articuloId: string; cantidad: number; nombre: string }> = [];

  if (!art.componentes || art.componentes.length === 0) {
    throw new Error(`El combo/kit "${art.nombre}" no tiene componentes definidos`);
  }

  for (const comp of art.componentes) {
    const subComponentes = await resolverComponentesFisicos(
      comp.componenteId,
      cantidad * comp.cantidad,
      tx,
      nuevosVisitados
    );
    result = result.concat(subComponentes);
  }

  return result;
}

/**
 * POST /api/ventas/nueva
 * Transactional POS sale creation with stock validation & rollback.
 */
export const nuevaVenta = catchAsync(async (req: Request, res: Response) => {
  const {
    clienteId,
    total_bruto,
    descuento,
    total_impuesto,
    total_neto,
    metodo_pago,
    detalles,
    productos,
    tasa_bcv,
    total_ves,
    igtf_monto,
    igtf_ves,
    monto_pagado_usd,
    monto_pagado_ves,
    nro_factura_fiscal
  } = req.body;
  
  const itemsToProcess = detalles || productos;

  if (!clienteId || !itemsToProcess || itemsToProcess.length === 0) {
    return res.status(400).json({ error: 'Falta clienteId o lista de productos para la venta' });
  }

  // Execute inside transactional context for automatic rollback
  const result = await prisma.$transaction(async (tx) => {
    // 1. Consolidate and resolve physical stocks requirements for all ticket lines
    const physicalRequirements: Record<string, { cantidad: number; nombre: string }> = {};

    for (const item of itemsToProcess) {
      const qty = parseFloat(item.cantidad);
      const resolved = await resolverComponentesFisicos(item.articuloId, qty, tx);
      
      for (const res of resolved) {
        if (!physicalRequirements[res.articuloId]) {
          physicalRequirements[res.articuloId] = { cantidad: 0, nombre: res.nombre };
        }
        physicalRequirements[res.articuloId].cantidad += res.cantidad;
      }
    }

    // 2. Validate consolidated stocks for each physical component
    for (const [artId, req] of Object.entries(physicalRequirements)) {
      const art = await tx.articulo.findUnique({
        where: { id: artId }
      });

      if (!art) {
        throw new Error(`Artículo físico ingrediente no encontrado con ID: ${artId}`);
      }

      if (art.stock < req.cantidad) {
        throw new Error(`Stock insuficiente para "${req.nombre}" (ingrediente de combo). Disponible: ${art.stock}, Requerido por la venta: ${req.cantidad}`);
      }
    }

    // Generate beautiful sequential fiscal invoice number if not present
    let finalFacturaFiscal = nro_factura_fiscal;
    if (!finalFacturaFiscal) {
      const count = await tx.venta.count();
      finalFacturaFiscal = `SENIAT-${String(count + 1).padStart(8, '0')}`;
    }

    // 3. Create the Venta (saves the logical combo product lines on the receipt ticket)
    const sale = await tx.venta.create({
      data: {
        clienteId,
        total_bruto: parseFloat(total_bruto),
        descuento: parseFloat(descuento || 0),
        total_impuesto: parseFloat(total_impuesto),
        total_neto: parseFloat(total_neto),
        estado: 'PAGADA',
        metodo_pago: metodo_pago || 'Efectivo',
        tasa_bcv: tasa_bcv !== undefined ? parseFloat(tasa_bcv) : 1.0,
        total_ves: total_ves !== undefined ? parseFloat(total_ves) : 0,
        igtf_monto: igtf_monto !== undefined ? parseFloat(igtf_monto) : 0,
        igtf_ves: igtf_ves !== undefined ? parseFloat(igtf_ves) : 0,
        monto_pagado_usd: monto_pagado_usd !== undefined ? parseFloat(monto_pagado_usd) : 0,
        monto_pagado_ves: monto_pagado_ves !== undefined ? parseFloat(monto_pagado_ves) : 0,
        nro_factura_fiscal: finalFacturaFiscal,
        detalles: {
          create: itemsToProcess.map((d: any) => ({
            articuloId: d.articuloId,
            cantidad: parseFloat(d.cantidad),
            precio_unitario: parseFloat(d.precio_unitario),
            subtotal: parseFloat(d.subtotal || (parseFloat(d.cantidad) * parseFloat(d.precio_unitario))),
          })),
        },
      },
      include: {
        cliente: true,
        detalles: true
      }
    });

    // 4. Decrement stocks and register SALIDA movement for each consolidated physical ingredient
    for (const [artId, req] of Object.entries(physicalRequirements)) {
      await tx.articulo.update({
        where: { id: artId },
        data: {
          stock: {
            decrement: req.cantidad,
          },
        },
      });

      await tx.movimientoInventario.create({
        data: {
          articuloId: artId,
          tipo: 'SALIDA',
          cantidad: req.cantidad,
          referenciaId: `VENTA-${sale.id}`,
        },
      });
    }

    return sale;
  });

  return res.status(201).json(result);
});

/**
 * GET /api/ventas
 * Paginated list of sales with optional state / dates filtering.
 */
export const listarVentas = catchAsync(async (req: Request, res: Response) => {
  const { page = 1, limit = 10, estado, fechaInicio, fechaFin } = req.query;

  const parsedPage = Math.max(1, parseInt(page as string) || 1);
  const parsedLimit = Math.max(1, parseInt(limit as string) || 10);
  const skip = (parsedPage - 1) * parsedLimit;

  // Build filter criteria
  const where: any = {};
  
  if (estado) {
    where.estado = estado as 'PAGADA' | 'PENDIENTE' | 'ANULADA';
  }

  if (fechaInicio || fechaFin) {
    where.fecha = {};
    if (fechaInicio) {
      where.fecha.gte = new Date(fechaInicio as string);
    }
    if (fechaFin) {
      where.fecha.lte = new Date(fechaFin as string);
    }
  }

  // Count total and retrieve list
  const [total, list] = await Promise.all([
    prisma.venta.count({ where }),
    prisma.venta.findMany({
      where,
      skip,
      take: parsedLimit,
      include: {
        cliente: true,
        detalles: {
          include: { 
            articulo: {
              include: {
                componentes: {
                  include: {
                    componente: true
                  }
                }
              }
            } 
          }
        }
      },
      orderBy: { fecha: 'desc' }
    })
  ]);

  return res.json({
    data: list,
    meta: {
      total,
      page: parsedPage,
      limit: parsedLimit,
      totalPages: Math.ceil(total / parsedLimit)
    }
  });
});

/**
 * POST /api/ventas/devolucion
 * Adjust sale items, restores stock levels, logs devolution & updates prices.
 */
export const devolverVenta = catchAsync(async (req: Request, res: Response) => {
  const { ventaId, itemsDevueltos, motivo } = req.body;

  if (!ventaId || !itemsDevueltos || itemsDevueltos.length === 0) {
    return res.status(400).json({ error: 'Se requiere ventaId y array de itemsDevueltos' });
  }

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.venta.findUnique({
      where: { id: ventaId },
      include: { detalles: true }
    });

    if (!sale) {
      throw new Error('Venta original no encontrada');
    }

    let totalReintegrado = 0;

    for (const item of itemsDevueltos) {
      const origDet = sale.detalles.find(d => d.articuloId === item.articuloId);
      if (!origDet) {
        throw new Error(`El artículo con ID ${item.articuloId} no pertenece originalmente a esta venta`);
      }

      const devQty = parseFloat(item.cantidad);
      if (devQty > origDet.cantidad) {
        throw new Error(`La cantidad a devolver (${devQty}) excede la cantidad vendida (${origDet.cantidad}) para el artículo`);
      }

      // Recursively resolve ingredients to restore their stock
      const resolved = await resolverComponentesFisicos(item.articuloId, devQty, tx);
      
      for (const res of resolved) {
        // Restores physical Item Stock
        await tx.articulo.update({
          where: { id: res.articuloId },
          data: { stock: { increment: res.cantidad } }
        });

        // Write MovimientoInventario Audit Trail for ingredients
        await tx.movimientoInventario.create({
          data: {
            articuloId: res.articuloId,
            tipo: 'ENTRADA',
            cantidad: res.cantidad,
            referenciaId: `DEVOLUCION-VENTA-${ventaId}`
          }
        });
      }

      totalReintegrado += devQty * origDet.precio_unitario;
    }

    // Register sale return record
    const devolution = await tx.devolucionVenta.create({
      data: {
        ventaId,
        motivo: motivo || 'Devolución de clientes',
        total_reintegrado: totalReintegrado
      }
    });

    // Update original Venta metrics
    const rawNewNeto = sale.total_neto - totalReintegrado;
    const newTotalNeto = parseFloat(Math.max(0, rawNewNeto).toFixed(2));
    const isFullReturn = newTotalNeto === 0;

    const updatedSale = await tx.venta.update({
      where: { id: ventaId },
      data: {
        total_neto: newTotalNeto,
        estado: isFullReturn ? 'ANULADA' : sale.estado
      },
      include: {
        cliente: true,
        detalles: true,
        devolucion: true
      }
    });

    return {
      success: true,
      devolution,
      sale: updatedSale
    };
  });

  return res.json(result);
});

/**
 * PUT /api/ventas/:id/anular
 * Annuls a sale completely, transactionally restores article stocks, and registers ENTRADA movements.
 */
export const anularVenta = catchAsync(async (req: Request, res: Response) => {
  const { id } = req.params;

  const result = await prisma.$transaction(async (tx) => {
    const sale = await tx.venta.findUnique({
      where: { id },
      include: { detalles: true }
    });

    if (!sale) {
      throw new Error('Venta no encontrada');
    }

    if (sale.estado === 'ANULADA') {
      throw new Error('La venta ya se encuentra anulada');
    }

    // 1. Reintegrate physical stocks recursively and register ENTRADA movement
    for (const item of sale.detalles) {
      const resolved = await resolverComponentesFisicos(item.articuloId, item.cantidad, tx);
      
      for (const res of resolved) {
        await tx.articulo.update({
          where: { id: res.articuloId },
          data: {
            stock: {
              increment: res.cantidad,
            },
          },
        });

        await tx.movimientoInventario.create({
          data: {
            articuloId: res.articuloId,
            tipo: 'ENTRADA',
            cantidad: res.cantidad,
            referenciaId: `VENTA-ANULADA-${sale.id}`,
          },
        });
      }
    }

    // 2. Set sale status to ANULADA
    const updatedSale = await tx.venta.update({
      where: { id },
      data: { estado: 'ANULADA' },
      include: {
        cliente: true,
        detalles: true
      }
    });

    return updatedSale;
  });

  return res.json(result);
});
