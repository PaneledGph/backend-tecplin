import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function fixTecnicos() {
  console.log('🔧 Iniciando migración de técnicos...');

  // Buscar todos los usuarios con rol TECNICO
  const usuariosTecnicos = await prisma.usuario.findMany({
    where: { rol: 'TECNICO' },
  });

  console.log(
    `📋 Encontrados ${usuariosTecnicos.length} usuarios con rol TECNICO`,
  );

  for (const usuario of usuariosTecnicos) {
    // Verificar si ya existe un registro en la tabla tecnicos
    const tecnicoExistente = await prisma.tecnico.findUnique({
      where: { usuarioid: usuario.id },
    });

    if (!tecnicoExistente) {
      // Crear el registro de técnico
      await prisma.tecnico.create({
        data: {
          usuarioid: usuario.id,
          nombre: usuario.usuario,
          disponibilidad: 'DISPONIBLE',
        },
      });
      console.log(
        `✅ Creado técnico para usuario: ${usuario.usuario} (ID: ${usuario.id})`,
      );
    } else {
      console.log(
        `⏭️  Ya existe técnico para usuario: ${usuario.usuario} (ID: ${usuario.id})`,
      );
    }
  }

  // Hacer lo mismo para clientes
  const usuariosClientes = await prisma.usuario.findMany({
    where: { rol: 'CLIENTE' },
  });

  console.log(
    `📋 Encontrados ${usuariosClientes.length} usuarios con rol CLIENTE`,
  );

  for (const usuario of usuariosClientes) {
    const clienteExistente = await prisma.cliente.findUnique({
      where: { usuarioId: usuario.id },
    });

    if (!clienteExistente) {
      await prisma.cliente.create({
        data: {
          usuarioId: usuario.id,
          nombre: usuario.usuario,
        },
      });
      console.log(
        `✅ Creado cliente para usuario: ${usuario.usuario} (ID: ${usuario.id})`,
      );
    } else {
      console.log(
        `⏭️  Ya existe cliente para usuario: ${usuario.usuario} (ID: ${usuario.id})`,
      );
    }
  }

  console.log('✅ Migración completada!');
}

fixTecnicos()
  .catch((e) => {
    console.error('❌ Error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
