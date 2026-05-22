import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding Database IKER POSPyME...');

  // 1. Create Admin User
  const adminPasswordHash = await bcrypt.hash('admin123', 10);
  const adminUser = await prisma.user.upsert({
    where: { username: 'admin' },
    update: {},
    create: {
      username: 'admin',
      nombre: 'Administrador IKER',
      password: adminPasswordHash,
      rol: 'ADMIN',
    },
  });
  console.log('✔ Administrator created/verified:', adminUser.username);

  // 2. Create standard Vendedor User
  const vendorPasswordHash = await bcrypt.hash('vendor123', 10);
  await prisma.user.upsert({
    where: { username: 'vendedor' },
    update: {},
    create: {
      username: 'vendedor',
      nombre: 'Vendedor Principal',
      password: vendorPasswordHash,
      rol: 'VENDEDOR',
    },
  });
  console.log('✔ Vendor user created/verified');

  // 3. Create inventory category starters and sample articles
  // Categories: Tecnología, Alimentos, Papelería
  const articulosData = [
    { codigo: 'ART-TE-01', nombre: 'Laptop Lenovo Core i5', precio_costo: 420.00, precio_venta: 580.00, stock: 12.00, stock_minimo: 3.00, categoria: 'Tecnología' },
    { codigo: 'ART-TE-02', nombre: 'Impresora Térmica Epson POS', precio_costo: 85.00, precio_venta: 135.00, stock: 8.00, stock_minimo: 2.00, categoria: 'Tecnología' },
    { codigo: 'ART-AL-01', nombre: 'Harina de Maíz Pan 1kg', precio_costo: 0.95, precio_venta: 1.40, stock: 120.00, stock_minimo: 25.00, categoria: 'Alimentos' },
    { codigo: 'ART-AL-02', nombre: 'Aceite de Girasol 1Lt', precio_costo: 2.10, precio_venta: 3.20, stock: 50.00, stock_minimo: 10.00, categoria: 'Alimentos' },
    { codigo: 'ART-PA-01', nombre: 'Resma Bond A4 Chamex', precio_costo: 3.80, precio_venta: 5.50, stock: 40.00, stock_minimo: 8.00, categoria: 'Papelería' },
  ];

  for (const art of articulosData) {
    const createdArt = await prisma.articulo.upsert({
      where: { codigo: art.codigo },
      update: {},
      create: {
        codigo: art.codigo,
        nombre: art.nombre,
        precio_costo: art.precio_costo,
        precio_venta: art.precio_venta,
        stock: art.stock,
        stock_minimo: art.stock_minimo,
        categoria: art.categoria,
        impuesto_iva: 16.0,
      },
    });

    // Check if initial stock movement has already been tracked
    const mCount = await prisma.movimientoInventario.count({
      where: { articuloId: createdArt.id }
    });
    if (mCount === 0 && art.stock > 0) {
      await prisma.movimientoInventario.create({
        data: {
          articuloId: createdArt.id,
          tipo: 'ENTRADA',
          cantidad: art.stock,
          referenciaId: 'INVENTARIO-SEEDED-INICIAL',
        }
      });
    }
  }
  console.log('✔ Inventory master items and stock seeded');

  // 4. Create sample clients
  const clientesData = [
    { rif: 'V-14785236-0', nombre: 'Eduardo Rodríguez', email: 'eduardo@mail.com', telefono: '0414-1234567', deuda_limite: 150.00 },
    { rif: 'V-20159753-4', nombre: 'Mariana Gómez', email: 'mariana.g@gmail.com', telefono: '0424-9876543', deuda_limite: 300.00 },
    { rif: 'J-31415926-5', nombre: 'Corporación Alpha, C.A.', email: 'compras@corpalpa.com', telefono: '0212-3214567', deuda_limite: 2500.00 },
  ];

  for (const c of clientesData) {
    await prisma.cliente.upsert({
      where: { rif: c.rif },
      update: {},
      create: c,
    });
  }
  console.log('✔ Target customers seeded');

  // 5. Create sample suppliers
  const proveedoresData = [
    { rif: 'J-40251896-1', empresa: 'Imex Suministros Tecnológicos', contacto: 'Andrés López' },
    { rif: 'J-30748123-2', empresa: 'Alimentos Polar Comercial', contacto: 'Valeria Díaz' },
  ];

  for (const p of proveedoresData) {
    await prisma.proveedor.upsert({
      where: { rif: p.rif },
      update: {},
      create: p,
    });
  }
  console.log('✔ Suppliers seeded');

  console.log('✔ Database seed completed successfully!');
}

main()
  .catch((e) => {
    console.error('Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
