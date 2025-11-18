/**
 * 🎯 GENERADOR DE DATOS ENRIQUECIDOS PARA ANÁLISIS PREDICTIVO
 * 
 * Este script genera datos realistas con patrones identificables para:
 * - Predicción de demanda de servicios
 * - Optimización de asignación de técnicos
 * - Predicción de tiempos de servicio
 * - Detección de anomalías en sensores IoT
 * - Análisis de satisfacción del cliente
 * - Predicción de fallas en equipos
 */

const { PrismaClient } = require('@prisma/client');
const bcrypt = require('bcrypt');

const prisma = new PrismaClient();

// ============================================
// 🔧 CONFIGURACIÓN DE GENERACIÓN
// ============================================
const CONFIG = {
  usuarios: {
    clientes: 50,
    tecnicos: 15,
    admins: 3
  },
  ordenes: {
    historicas: 500,
    recientes: 100
  },
  sensores: {
    total: 30,
    lecturasPerSensor: 1000
  },
  periodoMeses: 12
};

// ============================================
// 🎲 DATOS MAESTROS
// ============================================
const ESPECIALIDADES = [
  'Electricidad', 'Plomería', 'HVAC', 'Refrigeración',
  'Carpintería', 'Pintura', 'Albañilería', 'Cerrajería'
];

const TIPOS_PROBLEMA = [
  'Fuga de agua', 'Cortocircuito eléctrico', 'Aire acondicionado no enfría',
  'Calefacción no funciona', 'Puerta atascada', 'Ventana rota',
  'Grifo goteando', 'Interruptor defectuoso', 'Refrigerador no enfría',
  'Lavadora no funciona', 'Horno no calienta', 'Tubería obstruida',
  'Pintura descascarada', 'Pared agrietada', 'Cerradura dañada'
];

const UBICACIONES = [
  { nombre: 'Centro', lat: 4.6097, lng: -74.0817 },
  { nombre: 'Chapinero', lat: 4.6533, lng: -74.0631 },
  { nombre: 'Usaquén', lat: 4.7110, lng: -74.0304 },
  { nombre: 'Suba', lat: 4.7460, lng: -74.0819 },
  { nombre: 'Engativá', lat: 4.7110, lng: -74.1140 },
  { nombre: 'Fontibón', lat: 4.6738, lng: -74.1437 },
  { nombre: 'Kennedy', lat: 4.6280, lng: -74.1470 },
  { nombre: 'Bosa', lat: 4.6180, lng: -74.1910 }
];

// Funciones auxiliares
function randomDate(start, end) {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime()));
}

function randomNormal(mean, stdDev) {
  const u1 = Math.random();
  const u2 = Math.random();
  const z0 = Math.sqrt(-2.0 * Math.log(u1)) * Math.cos(2.0 * Math.PI * u2);
  return z0 * stdDev + mean;
}

function randomChoice(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function getSeasonalMultiplier(date) {
  const month = date.getMonth();
  if ([11, 0, 1].includes(month) || [5, 6, 7].includes(month)) {
    return 1.5;
  }
  return 1.0;
}

function calcularTiempoEstimado(tipoProblema, especialidad) {
  const baseTime = {
    'Electricidad': 3, 'Plomería': 4, 'HVAC': 5, 'Refrigeración': 4,
    'Carpintería': 6, 'Pintura': 8, 'Albañilería': 10, 'Cerrajería': 2
  };
  return Math.round((baseTime[especialidad] || 4) * (0.8 + Math.random() * 0.4));
}

function calcularCosto(tiempoHoras, especialidad) {
  const tarifaBase = {
    'Electricidad': 50000, 'Plomería': 45000, 'HVAC': 60000, 'Refrigeración': 55000,
    'Carpintería': 40000, 'Pintura': 35000, 'Albañilería': 50000, 'Cerrajería': 40000
  };
  const tarifa = tarifaBase[especialidad] || 45000;
  return Math.round(tarifa * tiempoHoras * (0.85 + Math.random() * 0.3));
}

// ============================================
// 🏗️ FUNCIÓN PRINCIPAL
// ============================================
async function main() {
  console.log('🚀 Iniciando generación de datos para análisis predictivo...\n');

  try {
    // 1. Usuarios
    console.log('📝 Generando usuarios...');
    const hashedPassword = await bcrypt.hash('password123', 10);
    const usuarios = [];
    
    for (let i = 0; i < CONFIG.usuarios.admins; i++) {
      usuarios.push({ usuario: `admin${i + 1}`, contrasena: hashedPassword, rol: 'ADMIN', emailVerified: true });
    }
    for (let i = 0; i < CONFIG.usuarios.tecnicos; i++) {
      usuarios.push({ usuario: `tecnico${i + 1}`, contrasena: hashedPassword, rol: 'TECNICO', emailVerified: true });
    }
    for (let i = 0; i < CONFIG.usuarios.clientes; i++) {
      usuarios.push({ usuario: `cliente${i + 1}`, contrasena: hashedPassword, rol: 'CLIENTE', emailVerified: true });
    }
    
    await prisma.usuario.createMany({ data: usuarios, skipDuplicates: true });
    const allUsers = await prisma.usuario.findMany();
    console.log(`✅ ${allUsers.length} usuarios creados\n`);

    // 2. Clientes
    console.log('👥 Generando clientes...');
    const clienteUsuarios = allUsers.filter(u => u.rol === 'CLIENTE');
    const clientes = clienteUsuarios.map((u, i) => {
      const ubicacion = randomChoice(UBICACIONES);
      return {
        nombre: `Cliente ${i + 1}`,
        direccion: `${ubicacion.nombre}, Calle ${Math.floor(Math.random() * 100)}`,
        telefono: `3${Math.floor(Math.random() * 900000000 + 100000000)}`,
        email: `${u.usuario}@example.com`,
        usuarioId: u.id
      };
    });
    await prisma.cliente.createMany({ data: clientes, skipDuplicates: true });
    const allClientes = await prisma.cliente.findMany();
    console.log(`✅ ${allClientes.length} clientes creados\n`);

    // 3. Técnicos
    console.log('👷 Generando técnicos...');
    const tecnicoUsuarios = allUsers.filter(u => u.rol === 'TECNICO');
    const tecnicos = tecnicoUsuarios.map((u, i) => ({
      nombre: `Técnico ${i + 1}`,
      especialidad: randomChoice(ESPECIALIDADES),
      disponibilidad: Math.random() > 0.3 ? 'DISPONIBLE' : 'OCUPADO',
      usuarioid: u.id
    }));
    await prisma.tecnico.createMany({ data: tecnicos, skipDuplicates: true });
    const allTecnicos = await prisma.tecnico.findMany();
    console.log(`✅ ${allTecnicos.length} técnicos creados\n`);

    // 4. Órdenes
    console.log('📋 Generando órdenes...');
    const now = new Date();
    const startDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    const ordenes = [];
    
    for (let i = 0; i < CONFIG.ordenes.historicas + CONFIG.ordenes.recientes; i++) {
      const fechaSolicitud = randomDate(startDate, now);
      const ubicacion = randomChoice(UBICACIONES);
      const tipoProblema = randomChoice(TIPOS_PROBLEMA);
      const cliente = randomChoice(allClientes);
      
      let especialidadRequerida = randomChoice(ESPECIALIDADES);
      if (tipoProblema.includes('eléctrico')) especialidadRequerida = 'Electricidad';
      else if (tipoProblema.includes('agua')) especialidadRequerida = 'Plomería';
      else if (tipoProblema.includes('Aire')) especialidadRequerida = 'HVAC';
      
      const tecnicosEsp = allTecnicos.filter(t => t.especialidad === especialidadRequerida);
      const tecnico = tecnicosEsp.length > 0 ? randomChoice(tecnicosEsp) : randomChoice(allTecnicos);
      
      const tiempoEstimado = calcularTiempoEstimado(tipoProblema, especialidadRequerida);
      const costoEstimado = calcularCosto(tiempoEstimado, especialidadRequerida);
      
      const diasDesde = (now - fechaSolicitud) / (1000 * 60 * 60 * 24);
      let estado = 'COMPLETADO';
      let fechaCompletado = new Date(fechaSolicitud.getTime() + tiempoEstimado * 60 * 60 * 1000);
      let calificacion = Math.floor(Math.random() * 3) + 3;
      
      if (diasDesde < 1) {
        estado = randomChoice(['PENDIENTE', 'ASIGNADO']);
        fechaCompletado = null;
        calificacion = null;
      } else if (diasDesde < 3) {
        estado = randomChoice(['EN_PROCESO', 'COMPLETADO']);
        if (estado !== 'COMPLETADO') {
          fechaCompletado = null;
          calificacion = null;
        }
      }
      
      ordenes.push({
        descripcion: `${tipoProblema} en ${ubicacion.nombre}`,
        fechasolicitud: fechaSolicitud,
        estado, prioridad: 'MEDIA',
        clienteid: cliente.id,
        tecnicoid: estado !== 'PENDIENTE' ? tecnico.id : null,
        ubicacion: `${ubicacion.nombre}, Bogotá`,
        ubicacionLatitud: ubicacion.lat,
        ubicacionLongitud: ubicacion.lng,
        tipoProblema, especialidadRequerida,
        costoEstimado, costoFinal: estado === 'COMPLETADO' ? costoEstimado * 1.1 : null,
        tiempoEstimadoHoras: tiempoEstimado,
        fechaCompletado, calificacion
      });
    }
    
    const batchSize = 100;
    for (let i = 0; i < ordenes.length; i += batchSize) {
      await prisma.orden.createMany({ data: ordenes.slice(i, i + batchSize), skipDuplicates: true });
    }
    console.log(`✅ ${ordenes.length} órdenes creadas\n`);

    // 5. Sensores
    console.log('🌡️ Generando sensores...');
    const tiposSensor = ['TEMPERATURA', 'PRESION', 'VIBRACION', 'CORRIENTE', 'VOLTAJE', 'HUMEDAD'];
    const sensores = [];
    
    for (let i = 0; i < CONFIG.sensores.total; i++) {
      const tipo = randomChoice(tiposSensor);
      const ubicacion = randomChoice(UBICACIONES);
      sensores.push({
        codigo: `SENSOR-${tipo.substring(0, 3)}-${String(i + 1).padStart(3, '0')}`,
        tipo, ubicacion: ubicacion.nombre,
        umbralMin: 20, umbralMax: 80, activo: true
      });
    }
    await prisma.sensor.createMany({ data: sensores, skipDuplicates: true });
    const allSensores = await prisma.sensor.findMany();
    console.log(`✅ ${allSensores.length} sensores creados\n`);

    // 6. Lecturas
    console.log('📊 Generando lecturas...');
    const lecturas = [];
    const lecturasStart = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    
    for (const sensor of allSensores) {
      for (let i = 0; i < 100; i++) {
        const timestamp = new Date(lecturasStart.getTime() + i * 7.2 * 60 * 60 * 1000);
        const valor = 50 + randomNormal(0, 10);
        lecturas.push({ sensorId: sensor.id, valor, timestamp });
      }
    }
    
    for (let i = 0; i < lecturas.length; i += 500) {
      await prisma.lectura.createMany({ data: lecturas.slice(i, i + 500), skipDuplicates: true });
    }
    console.log(`✅ ${lecturas.length} lecturas creadas\n`);

    console.log('✨ ¡Generación completada exitosamente!');
  } catch (error) {
    console.error('❌ Error:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

main();
