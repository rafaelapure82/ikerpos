import express, { Request, Response, NextFunction } from 'express';
import path from 'path';
import fs from 'fs';
import { createServer as createViteServer } from 'vite';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';

import { prisma } from './server/db.js';

// Load Environment Variables
dotenv.config();

// Import Modular Routes
import authRoutes from './src/routes/authRoutes.js';
import ventaRoutes from './src/routes/ventaRoutes.ts'; // Note: tsx supports ts resolution seamlessly
import compraRoutes from './src/routes/compraRoutes.ts';
import proveedorRoutes from './src/routes/proveedorRoutes.ts';
import reporteRoutes from './src/routes/reporteRoutes.ts';
import userRoutes from './src/routes/userRoutes.ts';
import permisoRoutes from './src/routes/permisoRoutes.ts';

import { AuthMiddleware, RoleMiddleware } from './src/middlewares/auth.ts';
import { PermisoMiddleware } from './src/middlewares/permission.ts';
import { InventarioService } from './src/services/inventarioService.ts';

async function startServer() {
  const app = express();
  
  // Port calculation matching Cloud Run hardcoded ingress expectation (3000)
  const PORT = process.env.PUERTO ? parseInt(process.env.PUERTO) : 3000;

  // --- STANDARD SECURITY & LOGGING MIDDLEWARES ---
  app.use(cors());
  app.use(helmet({
    contentSecurityPolicy: false, // Turn off CSP so Vite and frame overlays work seamlessly
    crossOriginEmbedderPolicy: false,
  }));
  app.use(morgan('dev'));
  app.use(express.json());

  // Disable HTTP caching for all API endpoints to guarantee real-time data and avoid stale SPA fallbacks
  app.use('/api', (req, res, next) => {
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    next();
  });


  // --- API ROUTING SECTION ---

  // Health check endpoint
  app.get('/api/health', (req, res) => {
    res.json({ status: 'healthy', database: 'connected', timestamp: new Date().toISOString() });
  });

  // Mount Modular Sub-routers
  app.use('/api/auth', authRoutes);
  app.use('/api/ventas', ventaRoutes);
  app.use('/api/compras', compraRoutes);
  app.use('/api/proveedores', proveedorRoutes);
  app.use('/api/reportes', reporteRoutes);

  // --- USERS & ROLES MANAGEMENT (ADMIN ONLY) ---
  app.use('/api/usuarios', AuthMiddleware, RoleMiddleware(['ADMIN']), userRoutes);
  app.use('/api/permisos', AuthMiddleware, RoleMiddleware(['ADMIN']), permisoRoutes);

  // --- CONFIGURACION DE LA PYME ENDPOINTS (GET/PUT) ---
  app.get('/api/pyme-config', AuthMiddleware, async (req, res, next) => {
    try {
      const configPath = path.join(process.cwd(), 'pyme_config.json');
      const defaultValues = {
        nombre: "IKER POSPyME, C.A.",
        rif: "J-40912185-0",
        telefono: "+58 (212) 555-0199",
        direccion: "Av. Francisco de Miranda, Edificio Centro Seguros, Piso 4, Caracas, Venezuela",
        email: "contacto@ikerpospyme.com",
        moneda: "USD",
        impuestoPorcentaje: 16.0,
        mensajePieFactura: "¡Gracias por preferirnos!",
        registroMercantil: "",
        tasaBcv: 45.50,
        habilitarIgtf: true,
        pagoMovilBanco: "Banesco",
        pagoMovilTelefono: "0414-1234567",
        pagoMovilRif: "J-40912185-0",
        formatoFactura: "FISCAL"
      };

      if (fs.existsSync(configPath)) {
        const fileContent = fs.readFileSync(configPath, 'utf8');
        const parsed = JSON.parse(fileContent);
        res.json({ ...defaultValues, ...parsed });
      } else {
        res.json(defaultValues);
      }
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/pyme-config', AuthMiddleware, PermisoMiddleware('pyme.config.editar'), async (req, res, next) => {
    try {
      const {
        nombre,
        rif,
        telefono,
        direccion,
        email,
        moneda,
        impuestoPorcentaje,
        mensajePieFactura,
        registroMercantil,
        tasaBcv,
        habilitarIgtf,
        pagoMovilBanco,
        pagoMovilTelefono,
        pagoMovilRif,
        formatoFactura
      } = req.body;

      const configPath = path.join(process.cwd(), 'pyme_config.json');
      
      const defaultValues = {
        nombre: "IKER POSPyME, C.A.",
        rif: "J-40912185-0",
        telefono: "+58 (212) 555-0199",
        direccion: "Av. Francisco de Miranda, Edificio Centro Seguros, Piso 4, Caracas, Venezuela",
        email: "contacto@ikerpospyme.com",
        moneda: "USD",
        impuestoPorcentaje: 16.0,
        mensajePieFactura: "¡Gracias por preferirnos!",
        registroMercantil: "",
        tasaBcv: 45.50,
        habilitarIgtf: true,
        pagoMovilBanco: "Banesco",
        pagoMovilTelefono: "0414-1234567",
        pagoMovilRif: "J-40912185-0",
        formatoFactura: "FISCAL"
      };

      let existing = { ...defaultValues };
      if (fs.existsSync(configPath)) {
        try {
          existing = { ...defaultValues, ...JSON.parse(fs.readFileSync(configPath, 'utf8')) };
        } catch (_) {}
      }

      const updatedConfig = {
        nombre: nombre !== undefined ? nombre : existing.nombre,
        rif: rif !== undefined ? rif : existing.rif,
        telefono: telefono !== undefined ? telefono : existing.telefono,
        direccion: direccion !== undefined ? direccion : existing.direccion,
        email: email !== undefined ? email : existing.email,
        moneda: moneda !== undefined ? moneda : existing.moneda,
        impuestoPorcentaje: impuestoPorcentaje !== undefined ? parseFloat(impuestoPorcentaje) : existing.impuestoPorcentaje,
        mensajePieFactura: mensajePieFactura !== undefined ? mensajePieFactura : existing.mensajePieFactura,
        registroMercantil: registroMercantil !== undefined ? registroMercantil : existing.registroMercantil,
        tasaBcv: tasaBcv !== undefined ? parseFloat(tasaBcv) : existing.tasaBcv,
        habilitarIgtf: habilitarIgtf !== undefined ? Boolean(habilitarIgtf) : existing.habilitarIgtf,
        pagoMovilBanco: pagoMovilBanco !== undefined ? pagoMovilBanco : existing.pagoMovilBanco,
        pagoMovilTelefono: pagoMovilTelefono !== undefined ? pagoMovilTelefono : existing.pagoMovilTelefono,
        pagoMovilRif: pagoMovilRif !== undefined ? pagoMovilRif : existing.pagoMovilRif,
        formatoFactura: formatoFactura !== undefined ? formatoFactura : existing.formatoFactura
      };

      fs.writeFileSync(configPath, JSON.stringify(updatedConfig, null, 2), 'utf8');
      res.json(updatedConfig);
    } catch (e) {
      next(e);
    }
  });

  // --- CLIENTES CRUD ENDPOINTS (Preserved & Protected) ---
  app.get('/api/clientes', AuthMiddleware, async (req, res, next) => {
    try {
      const list = await prisma.cliente.findMany({
        orderBy: { nombre: 'asc' },
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/clientes', AuthMiddleware, PermisoMiddleware('clientes.crear'), async (req, res, next) => {
    const { rif, nombre, email, telefono, deuda_limite } = req.body;
    if (!rif || !nombre) {
      return res.status(400).json({ error: 'RIF y Nombre son campos requeridos' });
    }
    try {
      const exists = await prisma.cliente.findUnique({ where: { rif } });
      if (exists) {
        return res.status(400).json({ error: 'El RIF ya se encuentra registrado' });
      }
      const created = await prisma.cliente.create({
        data: {
          rif,
          nombre,
          email,
          telefono,
          deuda_limite: parseFloat(deuda_limite || 0),
        },
      });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/clientes/:id', AuthMiddleware, PermisoMiddleware('clientes.editar'), async (req, res, next) => {
    const { rif, nombre, email, telefono, deuda_limite } = req.body;
    try {
      const updated = await prisma.cliente.update({
        where: { id: req.params.id },
        data: {
          rif,
          nombre,
          email,
          telefono,
          deuda_limite: parseFloat(deuda_limite || 0),
        },
      });
      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/clientes/:id', AuthMiddleware, PermisoMiddleware('clientes.eliminar'), async (req, res, next) => {
    try {
      await prisma.cliente.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, message: 'Cliente eliminado correctamente' });
    } catch (e) {
      next(e);
    }
  });

  // --- ARTICULOS CRUD ENDPOINTS ---
  app.get('/api/articulos/search', AuthMiddleware, async (req, res, next) => {
    try {
      const q = (req.query.q as string || '').trim().toLowerCase();
      const list = await prisma.articulo.findMany({
        where: q ? {
          OR: [
            { nombre: { contains: q } },
            { codigo: { contains: q } },
            { categoria: { contains: q } }
          ]
        } : {},
        include: {
          componentes: {
            include: {
              componente: true
            }
          }
        },
        orderBy: { nombre: 'asc' },
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.get('/api/articulos', AuthMiddleware, async (req, res, next) => {
    try {
      const { proveedorId } = req.query;
      const where: any = {};

      if (proveedorId) {
        const purchaseDetails = await prisma.compraDetalle.findMany({
          where: {
            compra: {
              proveedorId: proveedorId as string
            }
          },
          select: {
            articuloId: true
          }
        });
        const uniqueIds = Array.from(new Set(purchaseDetails.map(d => d.articuloId)));
        where.id = { in: uniqueIds };
      }

      const list = await prisma.articulo.findMany({
        where,
        include: {
          componentes: {
            include: {
              componente: true
            }
          }
        },
        orderBy: { nombre: 'asc' },
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/articulos', AuthMiddleware, PermisoMiddleware('articulos.crear'), async (req, res, next) => {
    const { codigo, nombre, precio_costo, precio_venta, stock, stock_minimo, categoria, impuesto_iva, imagen_url, es_combo, componentes } = req.body;
    if (!codigo || !nombre || precio_costo === undefined || precio_venta === undefined) {
      return res.status(400).json({ error: 'Código, Nombre, Costo y Venta son requeridos' });
    }
    try {
      const exists = await prisma.articulo.findUnique({ where: { codigo } });
      if (exists) {
        return res.status(400).json({ error: 'El código de artículo ya existe' });
      }

      const isCombo = Boolean(es_combo);

      const created = await prisma.articulo.create({
        data: {
          codigo,
          nombre,
          precio_costo: parseFloat(precio_costo),
          precio_venta: parseFloat(precio_venta),
          stock: isCombo ? 0 : parseFloat(stock || 0),
          stock_minimo: isCombo ? 0 : parseFloat(stock_minimo || 0),
          categoria: categoria || 'General',
          impuesto_iva: parseFloat(impuesto_iva || 16.0),
          imagen_url: imagen_url || null,
          es_combo: isCombo
        },
      });

      if (isCombo) {
        if (componentes && Array.isArray(componentes)) {
          await prisma.comboComponente.createMany({
            data: componentes.map((c: any) => ({
              comboId: created.id,
              componenteId: c.componenteId,
              cantidad: parseFloat(c.cantidad),
            }))
          });
        }
      } else if (parseFloat(stock || 0) > 0) {
        await prisma.movimientoInventario.create({
          data: {
            articuloId: created.id,
            tipo: 'ENTRADA',
            cantidad: parseFloat(stock),
            referenciaId: 'AJUSTE-STOCK-INICIAL',
          },
        });
      }

      const fullyCreated = await prisma.articulo.findUnique({
        where: { id: created.id },
        include: {
          componentes: {
            include: {
              componente: true
            }
          }
        }
      });

      res.status(201).json(fullyCreated);
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/articulos/:id', AuthMiddleware, PermisoMiddleware('articulos.editar'), async (req, res, next) => {
    const { codigo, nombre, precio_costo, precio_venta, stock, stock_minimo, categoria, impuesto_iva, imagen_url, es_combo, componentes } = req.body;
    try {
      const targetId = req.params.id;
      const previous = await prisma.articulo.findUnique({ where: { id: targetId } });
      if (!previous) {
        return res.status(404).json({ error: 'Artículo no encontrado' });
      }

      const isComboNow = es_combo !== undefined ? Boolean(es_combo) : previous.es_combo;

      const updated = await prisma.articulo.update({
        where: { id: targetId },
        data: {
          codigo,
          nombre,
          precio_costo: parseFloat(precio_costo),
          precio_venta: parseFloat(precio_venta),
          stock: isComboNow ? 0 : (stock !== undefined ? parseFloat(stock) : undefined),
          stock_minimo: isComboNow ? 0 : parseFloat(stock_minimo || 0),
          categoria: categoria || 'General',
          impuesto_iva: parseFloat(impuesto_iva || 16.0),
          imagen_url: imagen_url !== undefined ? imagen_url : undefined,
          es_combo: isComboNow
        },
      });

      if (isComboNow) {
        await prisma.comboComponente.deleteMany({
          where: { comboId: targetId }
        });

        if (componentes && Array.isArray(componentes)) {
          await prisma.comboComponente.createMany({
            data: componentes.map((c: any) => ({
              comboId: targetId,
              componenteId: c.componenteId,
              cantidad: parseFloat(c.cantidad),
            }))
          });
        }
      } else {
        await prisma.comboComponente.deleteMany({
          where: { comboId: targetId }
        });

        if (stock !== undefined && parseFloat(stock) !== previous.stock) {
          const diff = parseFloat(stock) - previous.stock;
          const tipo = diff > 0 ? 'ENTRADA' : 'SALIDA';
          
          await prisma.articulo.update({
            where: { id: targetId },
            data: { stock: parseFloat(stock) }
          });

          await InventarioService.registrarAjuste(updated.id, tipo, Math.abs(diff), 'AJUSTE-MANUAL-MASTER');
        }
      }

      const fullyUpdated = await prisma.articulo.findUnique({
        where: { id: targetId },
        include: {
          componentes: {
            include: {
              componente: true
            }
          }
        }
      });

      res.json(fullyUpdated);
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/articulos/:id', AuthMiddleware, PermisoMiddleware('articulos.eliminar'), async (req, res, next) => {
    try {
      await prisma.articulo.delete({
        where: { id: req.params.id },
      });
      res.json({ success: true, message: 'Artículo eliminado correctamente' });
    } catch (e) {
      next(e);
    }
  });

  // --- CATEGORIAS CRUD ENDPOINTS ---
  app.get('/api/categorias', AuthMiddleware, async (req, res, next) => {
    try {
      const categorias = await prisma.categoria.findMany({
        orderBy: { nombre: 'asc' },
      });

      // Count articles per category dynamically
      const articlesGroup = await prisma.articulo.groupBy({
        by: ['categoria'],
        _count: { id: true }
      });

      const countsMap: Record<string, number> = {};
      articlesGroup.forEach(group => {
        if (group.categoria) {
          countsMap[group.categoria] = group._count.id;
        }
      });

      const listWithCount = categorias.map(cat => ({
        ...cat,
        articuloCount: countsMap[cat.nombre] || 0
      }));

      res.json(listWithCount);
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/categorias', AuthMiddleware, PermisoMiddleware('categorias.crear'), async (req, res, next) => {
    const { nombre, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }
    const cleanNombre = nombre.trim();
    try {
      const exists = await prisma.categoria.findUnique({ where: { nombre: cleanNombre } });
      if (exists) {
        return res.status(400).json({ error: 'La categoría ya se encuentra registrada' });
      }
      const created = await prisma.categoria.create({
        data: {
          nombre: cleanNombre,
          descripcion: descripcion || '',
        },
      });
      res.status(201).json(created);
    } catch (e) {
      next(e);
    }
  });

  app.put('/api/categorias/:id', AuthMiddleware, PermisoMiddleware('categorias.editar'), async (req, res, next) => {
    const { nombre, descripcion } = req.body;
    if (!nombre || !nombre.trim()) {
      return res.status(400).json({ error: 'El nombre de la categoría es requerido' });
    }
    const cleanNombre = nombre.trim();
    try {
      const current = await prisma.categoria.findUnique({ where: { id: req.params.id } });
      if (!current) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      // Check if new name already exists elsewhere
      if (cleanNombre !== current.nombre) {
        const exists = await prisma.categoria.findUnique({ where: { nombre: cleanNombre } });
        if (exists) {
          return res.status(400).json({ error: 'Ya existe otra categoría con ese nombre' });
        }
      }

      const updated = await prisma.categoria.update({
        where: { id: req.params.id },
        data: {
          nombre: cleanNombre,
          descripcion: descripcion !== undefined ? descripcion : undefined,
        },
      });

      // Cascade update to articles if name changed
      if (cleanNombre !== current.nombre) {
        await prisma.articulo.updateMany({
          where: { categoria: current.nombre },
          data: { categoria: cleanNombre },
        });
      }

      res.json(updated);
    } catch (e) {
      next(e);
    }
  });

  app.delete('/api/categorias/:id', AuthMiddleware, PermisoMiddleware('categorias.eliminar'), async (req, res, next) => {
    try {
      const current = await prisma.categoria.findUnique({ where: { id: req.params.id } });
      if (!current) {
        return res.status(404).json({ error: 'Categoría no encontrada' });
      }

      // Block deletion if any articles are registered under this category
      const hasArticles = await prisma.articulo.findFirst({
        where: { categoria: current.nombre },
      });
      if (hasArticles) {
        return res.status(400).json({ 
          error: `No se puede eliminar la categoría "${current.nombre}" porque tiene artículos asociados. Reasígnelos o elimínelos primero.` 
        });
      }

      await prisma.categoria.delete({
        where: { id: req.params.id },
      });

      res.json({ success: true, message: 'Categoría eliminada correctamente' });
    } catch (e) {
      next(e);
    }
  });

  // --- GENERAL INVENTORY KÁRDEX AUDIT LOGS ---
  app.get('/api/inventario/movimientos', AuthMiddleware, async (req, res, next) => {
    try {
      const list = await prisma.movimientoInventario.findMany({
        include: { articulo: true },
        orderBy: { fecha: 'desc' },
      });
      res.json(list);
    } catch (e) {
      next(e);
    }
  });

  app.post('/api/inventario/ajustar', AuthMiddleware, PermisoMiddleware('inventario.ajustar'), async (req, res, next) => {
    const { articuloId, tipo, cantidad, motivo } = req.body;
    if (!articuloId || !tipo || cantidad === undefined) {
      return res.status(400).json({ error: 'articuloId, tipo (ENTRADA/SALIDA) y cantidad son requeridos' });
    }
    try {
      const { updated, log } = await InventarioService.registrarAjuste(
        articuloId,
        tipo as 'ENTRADA' | 'SALIDA',
        parseFloat(cantidad),
        motivo
      );
      res.status(201).json(log);
    } catch (e) {
      next(e);
    }
  });

  // --- ANALYTICS DASHBOARD STATS ---
  app.get('/api/dashboard/stats', AuthMiddleware, async (req, res, next) => {
    try {
      const sales = await prisma.venta.findMany({
        where: { estado: 'PAGADA' },
      });
      const pendingSales = await prisma.venta.findMany({
        where: { estado: 'PENDIENTE' },
      });
      const lowStockArticles = await InventarioService.verificarAlertasStock();
      const totalArticlesObj = await prisma.articulo.aggregate({
        _count: { id: true },
        _sum: { stock: true }
      });

      const totalSellsIncome = sales.reduce((sum, s) => sum + s.total_neto, 0);
      const totalReceivables = pendingSales.reduce((sum, s) => sum + s.total_neto, 0);

      const salesByDate: Record<string, number> = {};
      sales.forEach((s) => {
        const dateStr = s.fecha.toISOString().split('T')[0];
        salesByDate[dateStr] = (salesByDate[dateStr] || 0) + s.total_neto;
      });

      const chartData = Object.keys(salesByDate)
        .sort()
        .map((date) => ({
          date,
          monto: parseFloat(salesByDate[date].toFixed(2)),
        }));

      const articles = await prisma.articulo.findMany();
      const categories: Record<string, number> = {};
      articles.forEach((a) => {
        categories[a.categoria] = (categories[a.categoria] || 0) + 1;
      });

      const pieData = Object.keys(categories).map((cat) => ({
        name: cat,
        value: categories[cat],
      }));

      res.json({
        totalVendido: parseFloat(totalSellsIncome.toFixed(2)),
        totalPendiente: parseFloat(totalReceivables.toFixed(2)),
        recuentos: {
          ventas: sales.length,
          criticos: lowStockArticles.length,
          articulos: totalArticlesObj._count.id,
          totalStock: totalArticlesObj._sum.stock || 0
        },
        criticosList: lowStockArticles,
        lineChart: chartData,
        pieChart: pieData
      });
    } catch (e) {
      next(e);
    }
  });

  // --- UNIFIED GLOBAL ASYNCHRONOUS ERROR HANDLER ---
  app.use((err: any, req: Request, res: Response, next: NextFunction) => {
    console.error('SERVER ASYNC ERROR TRIGGERED:', err.message || err);
    const statusCode = err.status || 500;
    res.status(statusCode).json({
      error: err.message || 'Error interno del servidor procesando solicitud',
      stack: process.env.NODE_ENV !== 'production' ? err.stack : undefined
    });
  });

  // --- VITE DEV / PRODUCTION INGRESS DISPATCHER ---
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*all', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Dynamic Categories Auto-Seeding script
  try {
    const articulosList = await prisma.articulo.findMany({ select: { categoria: true } });
    const uniqueCategories = Array.from(new Set(articulosList.map(a => a.categoria).filter(Boolean)));
    
    // Make sure 'General' is always present
    if (!uniqueCategories.includes('General')) {
      uniqueCategories.unshift('General');
    }

    for (const cat of uniqueCategories) {
      await prisma.categoria.upsert({
        where: { nombre: cat },
        update: {},
        create: {
          nombre: cat,
          descripcion: `Categoría importada automáticamente del catálogo de artículos.`
        }
      });
    }
    console.log(`📦 Auto-seed de categorías completado. Total de categorías: ${uniqueCategories.length}`);
  } catch (err: any) {
    console.error('⚠️ Error ejecutando auto-seed de categorías:', err.message || err);
  }

  // Open the reverse proxy ingress channel
  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 ERP IKER POSPyME backend listening on http://localhost:${PORT}`);
  });
}

startServer();
