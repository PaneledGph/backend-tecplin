import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🏭 Iniciando seed de sensores IoT...');

  // Crear sensores de prueba
  const sensores = [
    {
      codigo: 'TEMP-001',
      tipo: 'TEMPERATURA',
      ubicacion: 'Planta Norte - Sala de Máquinas',
      umbralMin: 15,
      umbralMax: 35,
    },
    {
      codigo: 'VOLT-001',
      tipo: 'VOLTAJE',
      ubicacion: 'Planta Norte - Tablero Principal',
      umbralMin: 210,
      umbralMax: 230,
    },
    {
      codigo: 'PRES-001',
      tipo: 'PRESION',
      ubicacion: 'Planta Sur - Sistema Hidráulico',
      umbralMin: 2,
      umbralMax: 8,
    },
    {
      codigo: 'VIB-001',
      tipo: 'VIBRACION',
      ubicacion: 'Planta Norte - Generador 1',
      umbralMin: 0,
      umbralMax: 50,
    },
    {
      codigo: 'HUM-001',
      tipo: 'HUMEDAD',
      ubicacion: 'Planta Sur - Almacén',
      umbralMin: 30,
      umbralMax: 70,
    },
  ];

  for (const sensor of sensores) {
    const existe = await prisma.sensor.findUnique({
      where: { codigo: sensor.codigo },
    });

    if (!existe) {
      await prisma.sensor.create({
        data: sensor as any,
      });
      console.log(`✅ Sensor creado: ${sensor.codigo}`);
    } else {
      console.log(`⏭️  Sensor ya existe: ${sensor.codigo}`);
    }
  }

  console.log('🎉 Seed de sensores completado');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
