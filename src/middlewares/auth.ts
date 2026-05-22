import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';
import { prisma } from '../../server/db.js';

const JWT_SECRET = process.env.JWT_SECRET || 'iker-pospyme-super-secure-jwt-secret-key-2026';

export interface AuthenticatedRequest extends Request {
  user?: {
    id: string;
    username: string;
    nombre: string;
    rol: 'ADMIN' | 'VENDEDOR' | 'COMPRAS';
  };
}

export const AuthMiddleware = async (req: Request, res: Response, next: NextFunction) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Acceso denegado: Token no provisto o inválido' });
  }

  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET) as { id: string; username: string; rol: any };
    
    // Fetch user to confirm existence and current role
    const user = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: { id: true, username: true, nombre: true, rol: true },
    });

    if (!user) {
      return res.status(401).json({ error: 'Usuario no encontrado en sistema' });
    }

    (req as AuthenticatedRequest).user = {
      id: user.id,
      username: user.username,
      nombre: user.nombre,
      rol: user.rol as 'ADMIN' | 'VENDEDOR' | 'COMPRAS',
    };

    next();
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado' });
  }
};

export const RoleMiddleware = (allowedRoles: ('ADMIN' | 'VENDEDOR' | 'COMPRAS')[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    const user = (req as AuthenticatedRequest).user;
    if (!user) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!allowedRoles.includes(user.rol)) {
      return res.status(403).json({ error: 'Acceso denegado: Permisos insuficientes' });
    }

    next();
  };
};
