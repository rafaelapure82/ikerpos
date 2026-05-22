import { Request, Response } from 'express';
import { prisma } from '../../server/db.js';
import { catchAsync } from '../middlewares/catchAsync.js';

/**
 * GET /api/proveedores
 * Fetch director of registered suppliers.
 */
export const obtenerProveedores = catchAsync(async (req: Request, res: Response) => {
  const list = await prisma.proveedor.findMany({
    orderBy: { empresa: 'asc' }
  });
  return res.json(list);
});

/**
 * POST /api/proveedores
 * Add a new supplier.
 */
export const crearProveedor = catchAsync(async (req: Request, res: Response) => {
  const { rif, empresa, contacto } = req.body;

  if (!rif || !empresa) {
    return res.status(400).json({ error: 'RIF y Nombre de Empresa son requeridos' });
  }

  const exists = await prisma.proveedor.findUnique({
    where: { rif }
  });

  if (exists) {
    return res.status(400).json({ error: 'El RIF de proveedor ya existe' });
  }

  const created = await prisma.proveedor.create({
    data: { rif, empresa, contacto }
  });

  return res.status(201).json(created);
});

/**
 * PUT /api/proveedores/:id
 * Update supplier profile.
 */
export const actualizarProveedor = catchAsync(async (req: Request, res: Response) => {
  const { rif, empresa, contacto } = req.body;

  const updated = await prisma.proveedor.update({
    where: { id: req.params.id },
    data: { rif, empresa, contacto }
  });

  return res.json(updated);
});

/**
 * DELETE /api/proveedores/:id
 * Remove supplier.
 */
export const eliminarProveedor = catchAsync(async (req: Request, res: Response) => {
  await prisma.proveedor.delete({
    where: { id: req.params.id }
  });
  return res.json({ success: true, message: 'Proveedor eliminado correctamente' });
});

/**
 * GET /api/articulos
 * Enhanced list articles query with supplier filtering from purchasing history.
 */
export const listarArticulosFiltrados = catchAsync(async (req: Request, res: Response) => {
  const { proveedorId } = req.query;
  const where: any = {};

  if (proveedorId) {
    const purchaseDetails = await prisma.compraDetalle.findMany({
      where: {
        compra: {
          proveedorId: proveedorId as string
        }
      },
      select: {
        articuloId: true
      }
    });
    const uniqueIds = Array.from(new Set(purchaseDetails.map(d => d.articuloId)));
    where.id = { in: uniqueIds };
  }

  const list = await prisma.articulo.findMany({
    where,
    orderBy: { nombre: 'asc' }
  });

  return res.json(list);
});
