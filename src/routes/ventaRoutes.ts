import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.js';
import { PermisoMiddleware } from '../middlewares/permission.js';
import { nuevaVenta, listarVentas, devolverVenta, anularVenta } from '../controllers/VentaController.js';

const router = Router();

// POS sales registration
router.post('/nueva', AuthMiddleware, PermisoMiddleware('ventas.crear'), nuevaVenta);

// Devolution endpoint
router.post('/devolucion', AuthMiddleware, PermisoMiddleware('ventas.devolver'), devolverVenta);

// List sales with pagination and filters
router.get('/', AuthMiddleware, PermisoMiddleware('ventas.ver'), listarVentas);

// Support annulment from standard stream
router.put('/:id/anular', AuthMiddleware, PermisoMiddleware('ventas.anular'), anularVenta);

export default router;
