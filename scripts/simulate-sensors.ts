/**
 * 🏭 SIMULADOR DE SENSORES IoT
 * 
 * Este script simula lecturas de sensores y las envía al backend.
 * Útil para testing del sistema IoT sin hardware real.
 */

import axios from 'axios';

const API_URL = 'http://localhost:3000';

const sensores = [
  { codigo: 'TEMP-001', min: 15, max: 35, normal: 25 },
  { codigo: 'VOLT-001', min: 210, max: 230, normal: 220 },
  { codigo: 'PRES-001', min: 2, max: 8, normal: 5 },
  { codigo: 'VIB-001', min: 0, max: 50, normal: 20 },
  { codigo: 'HUM-001', min: 30, max: 70, normal: 50 },
];

function generarLectura(sensor: any, simularAlerta = false): number {
  if (simularAlerta) {
    // 50% probabilidad de superar umbral máximo o mínimo
    return Math.random() > 0.5 
      ? sensor.max + Math.random() * 10  // Supera máximo
      : sensor.min - Math.random() * 5;  // Por debajo del mínimo
  }

  // Lectura normal con variación
  const variacion = (Math.random() - 0.5) * (sensor.max - sensor.min) * 0.2;
  return sensor.normal + variacion;
}

async function enviarLectura(sensorCodigo: string, valor: number) {
  try {
    const response = await axios.post(`${API_URL}/iot/lecturas`, {
      sensorCodigo,
      valor: Number(valor.toFixed(2)),
    });
    
    console.log(`📊 ${sensorCodigo}: ${valor.toFixed(2)} - ✅ Enviado`);
    return response.data;
  } catch (error: any) {
    console.error(`❌ Error enviando lectura de ${sensorCodigo}:`, error.message);
  }
}

async function simularCiclo(simularAlerta = false) {
  console.log(`\n🔄 Ciclo de lecturas ${simularAlerta ? '(CON ALERTAS)' : '(NORMAL)'}`);
  console.log('─'.repeat(60));

  for (const sensor of sensores) {
    const valor = generarLectura(sensor, simularAlerta);
    await enviarLectura(sensor.codigo, valor);
    
    // Pequeña pausa entre sensores
    await new Promise(resolve => setTimeout(resolve, 500));
  }
}

async function main() {
  console.log('🏭 SIMULADOR DE SENSORES IoT');
  console.log('═'.repeat(60));
  console.log(`API: ${API_URL}`);
  console.log(`Sensores: ${sensores.length}`);
  console.log('═'.repeat(60));

  const args = process.argv.slice(2);
  const modo = args[0] || 'normal';

  if (modo === 'alerta') {
    console.log('\n⚠️  MODO ALERTA: Generando lecturas fuera de umbral...\n');
    await simularCiclo(true);
  } else if (modo === 'continuo') {
    console.log('\n🔁 MODO CONTINUO: Enviando lecturas cada 10 segundos...\n');
    console.log('Presiona Ctrl+C para detener\n');

    let contador = 0;
    setInterval(async () => {
      contador++;
      // Cada 5 ciclos, simular una alerta
      const simularAlerta = contador % 5 === 0;
      await simularCiclo(simularAlerta);
    }, 10000);
  } else {
    console.log('\n📊 MODO NORMAL: Enviando un ciclo de lecturas...\n');
    await simularCiclo(false);
    console.log('\n✅ Ciclo completado');
  }
}

// Manejo de Ctrl+C
process.on('SIGINT', () => {
  console.log('\n\n👋 Simulador detenido');
  process.exit(0);
});

main().catch(console.error);
