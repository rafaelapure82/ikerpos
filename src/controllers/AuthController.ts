import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { prisma } from '../../server/db.js';
import { catchAsync } from '../middlewares/catchAsync.js';

const JWT_SECRET = process.env.JWT_SECRET || 'iker-pospyme-super-secure-jwt-secret-key-2026';

export const login = catchAsync(async (req: Request, res: Response) => {
  const { username, email, password } = req.body;
  const targetUsername = username || email;

  if (!targetUsername || !password) {
    return res.status(400).json({ error: 'Usuario (o email) y contraseña son requeridos' });
  }

  const user = await prisma.user.findUnique({
    where: { username: targetUsername },
  });

  if (!user) {
    return res.status(401).json({ error: 'Credenciales inválidas (usuario no encontrado)' });
  }

  const isMatch = await bcrypt.compare(password, user.password);
  if (!isMatch) {
    return res.status(401).json({ error: 'Credenciales inválidas (contraseña incorrecta)' });
  }

  // Sign JWT Token
  const token = jwt.sign(
    { id: user.id, username: user.username, rol: user.rol },
    JWT_SECRET,
    { expiresIn: '12h' }
  );

  res.json({
    id: user.id,
    username: user.username,
    nombre: user.nombre,
    rol: user.rol,
    token: token
  });
});
