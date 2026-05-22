import { Request, Response, NextFunction } from 'express';
import { prisma } from '../../server/db.js';
import { AuthenticatedRequest } from './auth.js';

export const PermisoMiddleware = (permiso: string) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    // ADMIN always has all permissions
    if (user.rol === 'ADMIN') {
      return next();
    }

    try {
      const permisoRow = await prisma.rolePermission.findUnique({
        where: {
          rol_permiso: {
            rol: user.rol,
            permiso,
          },
        },
      });

      if (!permisoRow) {
        return res.status(403).json({ error: 'Acceso denegado: No tienes permiso para esta acción' });
      }

      next();
    } catch (error) {
      return res.status(500).json({ error: 'Error al verificar permisos' });
    }
  };
};
