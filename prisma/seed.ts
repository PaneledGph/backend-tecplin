import { PrismaClient } from '@prisma/client';
import * as bcrypt from 'bcrypt';

const prisma = new PrismaClient();

async function main() {
  console.log('🧩 Iniciando carga de datos de prueba...');

  // 🔐 Hashear contraseñas
  const hashedPassword = await bcrypt.hash('123456', 10);

  // 🧑‍💼 Crear usuario ADMIN
  const admin = await prisma.usuario.upsert({
    where: { usuario: 'admin' },
    update: {},
    create: {
      usuario: 'admin',
      contrasena: hashedPassword,
      rol: 'ADMIN',
    },
  });

  // 🧑‍🔧 Crear TÉCNICOS con credenciales distintas
  const tecnicos = [
    {
      usuario: 'tecnico1',
      nombre: 'Carlos Ramírez',
      especialidad: 'Electricidad Industrial',
    },
    {
      usuario: 'tecnico2',
      nombre: 'Juan Pérez',
      especialidad: 'Plomería y Gasfitería',
    },
    {
      usuario: 'tecnico3',
      nombre: 'Pedro González',
      especialidad: 'Aire Acondicionado',
    },
    {
      usuario: 'tecnico4',
      nombre: 'Luis Martínez',
      especialidad: 'Redes y Telecomunicaciones',
    },
    {
      usuario: 'tecnico5',
      nombre: 'Roberto Silva',
      especialidad: 'Mantenimiento General',
    },
  ];

  const tecnicosCreados: any[] = [];
  for (const tecData of tecnicos) {
    const tecnicoUser = await prisma.usuario.upsert({
      where: { usuario: tecData.usuario },
      update: {},
      create: {
        usuario: tecData.usuario,
        contrasena: hashedPassword,
        rol: 'TECNICO',
      },
    });

    const tecnico = await prisma.tecnico.upsert({
      where: { usuarioid: tecnicoUser.id },
      update: {},
      create: {
        nombre: tecData.nombre,
        especialidad: tecData.especialidad,
        usuarioid: tecnicoUser.id,
        disponibilidad: 'DISPONIBLE',
      },
    });

    tecnicosCreados.push({
      rol: 'TECNICO',
      usuario: tecData.usuario,
      nombre: tecData.nombre,
      especialidad: tecData.especialidad,
      contraseña: '123456',
    });
  }

  // 👩‍💻 Crear usuario CLIENTE
  const clienteUser = await prisma.usuario.upsert({
    where: { usuario: 'cliente' },
    update: {},
    create: {
      usuario: 'cliente',
      contrasena: hashedPassword,
      rol: 'CLIENTE',
    },
  });

  // Asociar el cliente al modelo Cliente
  const cliente = await prisma.cliente.upsert({
    where: { usuarioId: clienteUser.id },
    update: {},
    create: {
      nombre: 'María Sánchez',
      direccion: 'Av. Los Olivos 123',
      telefono: '999-555-123',
      email: 'maria@example.com',
      usuarioId: clienteUser.id,
    },
  });

  console.log('\n✅ Usuarios creados:');
  console.log('\n👨‍💼 ADMINISTRADOR:');
  console.table([
    { usuario: admin.usuario, contraseña: '123456', rol: 'ADMIN' },
  ]);

  console.log('\n🧑‍🔧 TÉCNICOS:');
  console.table(tecnicosCreados);

  console.log('\n👤 CLIENTE:');
  console.table([
    { usuario: clienteUser.usuario, contraseña: '123456', rol: 'CLIENTE', nombre: 'María Sánchez' },
  ]);

  console.log('\n🎉 Datos de prueba insertados correctamente.');
  console.log('\n📋 RESUMEN:');
  console.log(`   - 1 Administrador`);
  console.log(`   - ${tecnicosCreados.length} Técnicos`);
  console.log(`   - 1 Cliente`);
  console.log(`   - Total: ${2 + tecnicosCreados.length} usuarios\n`);
}

main()
  .catch((e) => {
    console.error('❌ Error al ejecutar el seed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
