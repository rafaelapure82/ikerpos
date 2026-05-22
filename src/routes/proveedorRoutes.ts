import { Router } from 'express';
import { AuthMiddleware } from '../middlewares/auth.js';
import { PermisoMiddleware } from '../middlewares/permission.js';
import { 
  obtenerProveedores, 
  crearProveedor, 
  actualizarProveedor, 
  eliminarProveedor 
} from '../controllers/ProveedorController.js';

const router = Router();

router.get('/', AuthMiddleware, PermisoMiddleware('proveedores.ver'), obtenerProveedores);
router.post('/', AuthMiddleware, PermisoMiddleware('proveedores.crear'), crearProveedor);
router.put('/:id', AuthMiddleware, PermisoMiddleware('proveedores.editar'), actualizarProveedor);
router.delete('/:id', AuthMiddleware, PermisoMiddleware('proveedores.eliminar'), eliminarProveedor);

export default router;
