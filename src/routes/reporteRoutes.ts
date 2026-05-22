import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.js';
import { PermisoMiddleware } from '../middlewares/permission.js';
import { comprasPorCliente } from '../controllers/ReporteController.js';
import { obtenerReporteVentas } from '../controllers/ReporteVentaController.js';

const router = Router();

router.get('/compras-por-cliente/:clienteId', AuthMiddleware, PermisoMiddleware('clientes.ver'), comprasPorCliente);
router.get('/ventas/dashboard', AuthMiddleware, PermisoMiddleware('ventas.reportes'), obtenerReporteVentas);

export default router;


