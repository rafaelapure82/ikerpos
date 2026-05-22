import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.js';
import { PermisoMiddleware } from '../middlewares/permission.js';
import { registrarCompra, obtenerCompras } from '../controllers/CompraController.js';

const router = Router();

router.post('/', AuthMiddleware, PermisoMiddleware('compras.crear'), registrarCompra);
router.get('/', AuthMiddleware, PermisoMiddleware('compras.ver'), obtenerCompras);

export default router;
