import { Router, Response } from 'express';
import bcrypt from 'bcryptjs';
import { prisma } from '../../server/db.js';
import { AuthenticatedRequest } from '../middlewares/auth.js';
import { catchAsync } from '../middlewares/catchAsync.js';

const router = Router();

router.get('/', catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const usuarios = await prisma.user.findMany({
    select: {
      id: true,
      username: true,
      nombre: true,
      rol: true,
      activo: true,
    },
    orderBy: { nombre: 'asc' },
  });
  res.json(usuarios);
}));

router.post('/', catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { username, nombre, password, rol } = req.body;

  if (!username || !nombre || !password || !rol) {
    return res.status(400).json({ error: 'Todos los campos son requeridos: username, nombre, password, rol' });
  }

  const validRoles = ['ADMIN', 'VENDEDOR', 'COMPRAS'];
  if (!validRoles.includes(rol)) {
    return res.status(400).json({ error: 'Rol inválido. Use: ADMIN, VENDEDOR o COMPRAS' });
  }

  const exists = await prisma.user.findUnique({ where: { username } });
  if (exists) {
    return res.status(400).json({ error: 'El nombre de usuario ya existe' });
  }

  const passwordHash = await bcrypt.hash(password, 10);

  const created = await prisma.user.create({
    data: { username, nombre, password: passwordHash, rol },
    select: { id: true, username: true, nombre: true, rol: true, activo: true },
  });

  res.status(201).json(created);
}));

router.put('/:id', catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { nombre, username, rol, activo } = req.body;

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  if (username && username !== user.username) {
    const exists = await prisma.user.findUnique({ where: { username } });
    if (exists) {
      return res.status(400).json({ error: 'El nombre de usuario ya existe' });
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      nombre: nombre !== undefined ? nombre : undefined,
      username: username !== undefined ? username : undefined,
      rol: rol !== undefined ? rol : undefined,
      activo: activo !== undefined ? activo : undefined,
    },
    select: { id: true, username: true, nombre: true, rol: true, activo: true },
  });

  res.json(updated);
}));

router.put('/:id/password', catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;
  const { password } = req.body;

  if (!password || password.length < 4) {
    return res.status(400).json({ error: 'La contraseña debe tener al menos 4 caracteres' });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  const passwordHash = await bcrypt.hash(password, 10);
  await prisma.user.update({
    where: { id },
    data: { password: passwordHash },
  });

  res.json({ success: true, message: 'Contraseña actualizada correctamente' });
}));

router.delete('/:id', catchAsync(async (req: AuthenticatedRequest, res: Response) => {
  const { id } = req.params;

  if (id === req.user?.id) {
    return res.status(400).json({ error: 'No puedes eliminar tu propio usuario' });
  }

  const user = await prisma.user.findUnique({ where: { id } });
  if (!user) {
    return res.status(404).json({ error: 'Usuario no encontrado' });
  }

  await prisma.user.update({
    where: { id },
    data: { activo: false },
  });

  res.json({ success: true, message: 'Usuario desactivado correctamente' });
}));

export default router;
