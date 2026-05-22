import { prisma } from '../../server/db.js';

export class InventarioService {
  /**
   * Checks if an article has critically low stock values compared to minimum levels.
   */
  static async verificarAlertasStock() {
    return prisma.articulo.findMany({
      where: {
        stock: {
          lte: prisma.articulo.fields.stock_minimo,
        },
      },
    });
  }

  /**
   * Log an inventory transaction manual adjustment
   */
  static async registrarAjuste(articuloId: string, tipo: 'ENTRADA' | 'SALIDA', cantidad: number, motivo?: string) {
    const updated = await prisma.articulo.update({
      where: { id: articuloId },
      data: {
        stock: {
          increment: tipo === 'ENTRADA' ? cantidad : -cantidad,
        },
      },
    });

    const log = await prisma.movimientoInventario.create({
      data: {
        articuloId,
        tipo,
        cantidad,
        referenciaId: motivo || 'AJUSTE-MANUAL',
      },
      include: {
        articulo: true,
      },
    });

    return { updated, log };
  }
}
