import { Router, Response } from 'express';
import { prisma } from '../../server/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { catchAsync } from '../middlewares/catchAsync.js';
import { ALL_PERMISOS, DEFAULT_PERMISOS, PERMISO_GRUPOS } from '../permisos.js';

const router = Router();

router.get('/definiciones', catchAsync(async (_req: AuthenticatedRequest, res: Response) => {
  res.json(PERMISO_GRUPOS);
}));

router.get('/roles', catchAsync(async (_req: AuthenticatedRequest, res: Response) => {
  const allRoles = ['ADMIN', 'VENDEDOR', 'COMPRAS'];
  const dbPermisos = await prisma.rolePermission.findMany();

  const result = allRoles.map(rol => {
    const permisos = dbPermisos
      .filter(p => p.rol === rol)
      .map(p => p.permiso);

    return { rol, permisos };
  });

  res.json(result);
}));

router.put('/roles/:rol', catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { rol } = req.params;
  const { permisos } = req.body;

  const validRoles = ['ADMIN', 'VENDEDOR', 'COMPRAS'];
  if (!validRoles.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido' });
  }

  if (!Array.isArray(permisos)) {
    return res.status(400).json({ error: 'permisos debe ser un array' });
  }

  const invalid = permisos.filter((p: string) => !ALL_PERMISOS.includes(p as any));
  if (invalid.length > 0) {
    return res.status(400).json({ error: `Permisos inválidos: ${invalid.join(', ')}` });
  }

  await prisma.$transaction([
    prisma.rolePermission.deleteMany({ where: { rol: rol as any } }),
    ...permisos.map((permiso: string) =>
      prisma.rolePermission.create({
        data: { rol: rol as any, permiso },
      })
    ),
  ]);

  res.json({ success: true, rol, permisos });
}));

router.post('/seed', catchAsync(async (_req: AuthenticatedRequest, res: Response) => {
  await prisma.rolePermission.deleteMany();

  for (const [rol, permisos] of Object.entries(DEFAULT_PERMISOS)) {
    await prisma.rolePermission.createMany({
      data: permisos.map(p => ({ rol: rol as any, permiso: p })),
    });
  }

  res.json({ success: true, message: 'Permisos por defecto restaurados' });
}));

export default router;
