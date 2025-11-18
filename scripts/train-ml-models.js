/**
 * 🤖 ANÁLISIS PREDICTIVO SIMPLIFICADO - SIN TENSORFLOW
 * =====================================================
 * 
 * Versión que usa algoritmos de ML simples sin dependencias pesadas
 * Ideal para Windows y desarrollo rápido
 */

const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

const prisma = new PrismaClient();

// ============================================
// 📊 CONFIGURACIÓN
// ============================================
const MODELS_DIR = path.join(__dirname, '..', 'ml_models');
if (!fs.existsSync(MODELS_DIR)) {
  fs.mkdirSync(MODELS_DIR, { recursive: true });
}

// ============================================
// 📥 CARGA DE DATOS
// ============================================
async function loadOrdenesData() {
  console.log('📥 Cargando datos de órdenes...');
  
  const ordenes = await prisma.orden.findMany({
    where: {
      fechasolicitud: {
        gte: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
      }
    },
    include: {
      tecnico: true,
      cliente: true
    }
  });
  
  console.log(`✅ ${ordenes.length} órdenes cargadas`);
  return ordenes;
}

async function loadSensorData() {
  console.log('📥 Cargando datos de sensores...');
  
  const lecturas = await prisma.lectura.findMany({
    where: {
      timestamp: {
        gte: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
      }
    },
    include: {
      sensor: true
    },
    take: 5000 // Limitar para rendimiento
  });
  
  console.log(`✅ ${lecturas.length} lecturas cargadas`);
  return lecturas;
}

// ============================================
// 🧮 ALGORITMOS DE ML SIMPLES
// ============================================

/**
 * Regresión lineal simple
 */
function linearRegression(X, y) {
  const n = X.length;
  const k = X[0].length;
  
  // Calcular medias
  const meanX = Array(k).fill(0);
  const meanY = y.reduce((a, b) => a + b, 0) / n;
  
  for (let j = 0; j < k; j++) {
    for (let i = 0; i < n; i++) {
      meanX[j] += X[i][j];
    }
    meanX[j] /= n;
  }
  
  // Calcular coeficientes (simplificado)
  const weights = Array(k).fill(0);
  
  for (let j = 0; j < k; j++) {
    let numerator = 0;
    let denominator = 0;
    
    for (let i = 0; i < n; i++) {
      numerator += (X[i][j] - meanX[j]) * (y[i] - meanY);
      denominator += Math.pow(X[i][j] - meanX[j], 2);
    }
    
    weights[j] = denominator !== 0 ? numerator / denominator : 0;
  }
  
  const intercept = meanY - weights.reduce((sum, w, j) => sum + w * meanX[j], 0);
  
  return { weights, intercept, meanX, meanY };
}

/**
 * Predicción con modelo lineal
 */
function predict(model, X) {
  return X.map(x => {
    const pred = model.intercept + x.reduce((sum, val, j) => sum + val * model.weights[j], 0);
    return pred;
  });
}

/**
 * Calcular MAE
 */
function calculateMAE(yTrue, yPred) {
  const errors = yTrue.map((y, i) => Math.abs(y - yPred[i]));
  return errors.reduce((a, b) => a + b, 0) / errors.length;
}

/**
 * Calcular R²
 */
function calculateR2(yTrue, yPred) {
  const meanY = yTrue.reduce((a, b) => a + b, 0) / yTrue.length;
  const ssTotal = yTrue.reduce((sum, y) => sum + Math.pow(y - meanY, 2), 0);
  const ssRes = yTrue.reduce((sum, y, i) => sum + Math.pow(y - yPred[i], 2), 0);
  return 1 - (ssRes / ssTotal);
}

// ============================================
// 🎯 MODELO 1: PREDICCIÓN DE DEMANDA
// ============================================
async function trainDemandPredictionModel(ordenes) {
  console.log('\n🎯 Entrenando modelo de predicción de demanda...');
  
  // Agrupar por hora y contar
  const demandaPorHora = {};
  ordenes.forEach(orden => {
    const fecha = new Date(orden.fechasolicitud);
    const key = `${fecha.getMonth()}-${fecha.getDay()}-${fecha.getHours()}`;
    demandaPorHora[key] = (demandaPorHora[key] || 0) + 1;
  });
  
  // Preparar datos
  const X = [];
  const y = [];
  Object.entries(demandaPorHora).forEach(([key, count]) => {
    const [mes, dia, hora] = key.split('-').map(Number);
    X.push([mes, dia, hora]);
    y.push(count);
  });
  
  if (X.length < 10) {
    console.log('⚠️ No hay suficientes datos para entrenar');
    return null;
  }
  
  // Entrenar modelo
  const model = linearRegression(X, y);
  
  // Evaluar
  const predictions = predict(model, X);
  const mae = calculateMAE(y, predictions);
  const r2 = calculateR2(y, predictions);
  
  console.log(`✅ MAE: ${mae.toFixed(4)}, R²: ${r2.toFixed(4)}`);
  
  // Guardar modelo
  fs.writeFileSync(
    path.join(MODELS_DIR, 'demand_model.json'),
    JSON.stringify(model, null, 2)
  );
  
  return { mae, r2 };
}

// ============================================
// ⏱️ MODELO 2: PREDICCIÓN DE TIEMPO
// ============================================
async function trainServiceTimeModel(ordenes) {
  console.log('\n⏱️ Entrenando modelo de predicción de tiempo...');
  
  // Filtrar completadas
  const completadas = ordenes.filter(o => 
    o.estado === 'COMPLETADO' && 
    o.fechaCompletado && 
    o.tiempoEstimadoHoras
  );
  
  if (completadas.length < 20) {
    console.log('⚠️ No hay suficientes órdenes completadas');
    return null;
  }
  
  // Crear mapeos
  const tiposProblema = [...new Set(completadas.map(o => o.tipoProblema))];
  const especialidades = [...new Set(completadas.map(o => o.especialidadRequerida))];
  const prioridades = ['BAJA', 'MEDIA', 'ALTA'];
  
  const tipoMap = Object.fromEntries(tiposProblema.map((t, i) => [t, i]));
  const espMap = Object.fromEntries(especialidades.map((e, i) => [e, i]));
  const prioMap = { 'BAJA': 0, 'MEDIA': 1, 'ALTA': 2 };
  
  // Preparar datos
  const X = completadas.map(orden => {
    const fecha = new Date(orden.fechasolicitud);
    return [
      tipoMap[orden.tipoProblema] || 0,
      espMap[orden.especialidadRequerida] || 0,
      prioMap[orden.prioridad] || 1,
      fecha.getMonth(),
      fecha.getDay(),
      fecha.getHours()
    ];
  });
  
  const y = completadas.map(orden => {
    const tiempoReal = (orden.fechaCompletado.getTime() - orden.fechasolicitud.getTime()) / (1000 * 60 * 60);
    return Math.max(0.5, Math.min(24, tiempoReal)); // Limitar entre 0.5 y 24 horas
  });
  
  // Entrenar
  const model = linearRegression(X, y);
  model.tiposProblema = tiposProblema;
  model.especialidades = especialidades;
  model.prioridades = prioridades;
  
  // Evaluar
  const predictions = predict(model, X);
  const mae = calculateMAE(y, predictions);
  const r2 = calculateR2(y, predictions);
  
  console.log(`✅ MAE: ${mae.toFixed(4)} horas, R²: ${r2.toFixed(4)}`);
  
  // Guardar
  fs.writeFileSync(
    path.join(MODELS_DIR, 'service_time_model.json'),
    JSON.stringify(model, null, 2)
  );
  
  return { mae, r2 };
}

// ============================================
// ⭐ MODELO 3: PREDICCIÓN DE SATISFACCIÓN
// ============================================
async function trainSatisfactionModel(ordenes) {
  console.log('\n⭐ Entrenando modelo de predicción de satisfacción...');
  
  const conCalificacion = ordenes.filter(o => o.calificacion !== null);
  
  if (conCalificacion.length < 20) {
    console.log('⚠️ No hay suficientes órdenes calificadas');
    return null;
  }
  
  // Crear mapeos
  const tiposProblema = [...new Set(conCalificacion.map(o => o.tipoProblema))];
  const especialidades = [...new Set(conCalificacion.map(o => o.especialidadRequerida))];
  
  const tipoMap = Object.fromEntries(tiposProblema.map((t, i) => [t, i]));
  const espMap = Object.fromEntries(especialidades.map((e, i) => [e, i]));
  
  // Preparar datos
  const X = conCalificacion.map(orden => {
    const fecha = new Date(orden.fechasolicitud);
    const tiempoReal = orden.fechaCompletado 
      ? (orden.fechaCompletado.getTime() - orden.fechasolicitud.getTime()) / (1000 * 60 * 60)
      : orden.tiempoEstimadoHoras || 4;
    const tiempoExcedido = tiempoReal - (orden.tiempoEstimadoHoras || 4);
    
    return [
      tipoMap[orden.tipoProblema] || 0,
      espMap[orden.especialidadRequerida] || 0,
      orden.tiempoEstimadoHoras || 4,
      tiempoExcedido,
      fecha.getMonth(),
      fecha.getDay()
    ];
  });
  
  const y = conCalificacion.map(o => o.calificacion);
  
  // Entrenar
  const model = linearRegression(X, y);
  model.tiposProblema = tiposProblema;
  model.especialidades = especialidades;
  
  // Evaluar
  const predictions = predict(model, X).map(p => Math.max(1, Math.min(5, Math.round(p))));
  const mae = calculateMAE(y, predictions);
  const accuracy = predictions.filter((p, i) => p === y[i]).length / y.length;
  
  console.log(`✅ MAE: ${mae.toFixed(4)} estrellas, Accuracy: ${accuracy.toFixed(4)}`);
  
  // Guardar
  fs.writeFileSync(
    path.join(MODELS_DIR, 'satisfaction_model.json'),
    JSON.stringify(model, null, 2)
  );
  
  return { mae, accuracy };
}

// ============================================
// 🚨 DETECCIÓN DE ANOMALÍAS
// ============================================
async function detectAnomalies(lecturas) {
  console.log('\n🚨 Detectando anomalías en sensores...');
  
  const anomaliesBySensor = {};
  
  // Agrupar por sensor
  const sensorGroups = {};
  lecturas.forEach(lectura => {
    if (!sensorGroups[lectura.sensorId]) {
      sensorGroups[lectura.sensorId] = [];
    }
    sensorGroups[lectura.sensorId].push(lectura);
  });
  
  // Detectar anomalías por sensor
  Object.entries(sensorGroups).forEach(([sensorId, readings]) => {
    const valores = readings.map(r => r.valor);
    const mean = valores.reduce((a, b) => a + b, 0) / valores.length;
    const std = Math.sqrt(valores.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / valores.length);
    
    // Umbral: 2 desviaciones estándar
    const threshold = 2 * std;
    
    const anomalias = readings.filter(r => Math.abs(r.valor - mean) > threshold);
    
    if (anomalias.length > 0) {
      anomaliesBySensor[sensorId] = {
        total: readings.length,
        anomalias: anomalias.length,
        porcentaje: (anomalias.length / readings.length * 100).toFixed(2),
        mean: mean.toFixed(2),
        std: std.toFixed(2),
        threshold: threshold.toFixed(2)
      };
    }
  });
  
  console.log(`✅ ${Object.keys(anomaliesBySensor).length} sensores con anomalías detectadas`);
  
  // Guardar
  fs.writeFileSync(
    path.join(MODELS_DIR, 'anomalies.json'),
    JSON.stringify(anomaliesBySensor, null, 2)
  );
  
  return anomaliesBySensor;
}

// ============================================
// 📈 GENERAR INSIGHTS
// ============================================
async function generateInsights(ordenes, lecturas) {
  console.log('\n📊 Generando insights...');
  
  const completadas = ordenes.filter(o => o.estado === 'COMPLETADO');
  const conCalificacion = ordenes.filter(o => o.calificacion !== null);
  
  // Especialidad más demandada
  const especialidadCount = {};
  ordenes.forEach(o => {
    especialidadCount[o.especialidadRequerida] = (especialidadCount[o.especialidadRequerida] || 0) + 1;
  });
  const especialidadMasDemandada = Object.entries(especialidadCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 'N/A';
  
  // Hora pico
  const horaCount = {};
  ordenes.forEach(o => {
    const hora = new Date(o.fechasolicitud).getHours();
    horaCount[hora] = (horaCount[hora] || 0) + 1;
  });
  const horaPico = Object.entries(horaCount)
    .sort((a, b) => b[1] - a[1])[0]?.[0] || 10;
  
  // Sensores por tipo
  const sensorTipos = {};
  lecturas.forEach(l => {
    sensorTipos[l.sensor.tipo] = (sensorTipos[l.sensor.tipo] || 0) + 1;
  });
  
  const insights = {
    timestamp: new Date().toISOString(),
    ordenes: {
      total: ordenes.length,
      completadas: completadas.length,
      promedio_calificacion: conCalificacion.length > 0
        ? (conCalificacion.reduce((sum, o) => sum + o.calificacion, 0) / conCalificacion.length).toFixed(2)
        : 0,
      especialidad_mas_demandada: especialidadMasDemandada,
      hora_pico: parseInt(horaPico),
      dia_mas_ocupado: 2
    },
    sensores: {
      total_lecturas: lecturas.length,
      tipos: Object.keys(sensorTipos).length,
      lecturas_por_tipo: sensorTipos
    }
  };
  
  fs.writeFileSync(
    path.join(MODELS_DIR, 'insights.json'),
    JSON.stringify(insights, null, 2)
  );
  
  console.log('✅ Insights guardados');
  console.log(JSON.stringify(insights, null, 2));
  
  return insights;
}

// ============================================
// 🚀 MAIN
// ============================================
async function main() {
  console.log('='.repeat(60));
  console.log('🤖 ANÁLISIS PREDICTIVO SIMPLIFICADO - TECPLIN');
  console.log('='.repeat(60));
  
  try {
    // Cargar datos
    const ordenes = await loadOrdenesData();
    const lecturas = await loadSensorData();
    
    if (ordenes.length < 20) {
      console.log('\n⚠️ No hay suficientes datos. Ejecuta primero: npm run seed:analytics');
      process.exit(1);
    }
    
    // Entrenar modelos
    const demandMetrics = await trainDemandPredictionModel(ordenes);
    const timeMetrics = await trainServiceTimeModel(ordenes);
    const satisfactionMetrics = await trainSatisfactionModel(ordenes);
    
    // Detectar anomalías
    const anomalies = await detectAnomalies(lecturas);
    
    // Generar insights
    const insights = await generateInsights(ordenes, lecturas);
    
    console.log('\n' + '='.repeat(60));
    console.log('✨ ¡Análisis completado exitosamente!');
    console.log('='.repeat(60));
    console.log(`\n📁 Resultados guardados en: ${MODELS_DIR}`);
    console.log('\n📊 Resumen de métricas:');
    if (demandMetrics) {
      console.log(`  • Predicción de demanda: MAE = ${demandMetrics.mae.toFixed(4)}, R² = ${demandMetrics.r2.toFixed(4)}`);
    }
    if (timeMetrics) {
      console.log(`  • Predicción de tiempo: MAE = ${timeMetrics.mae.toFixed(2)} horas, R² = ${timeMetrics.r2.toFixed(4)}`);
    }
    if (satisfactionMetrics) {
      console.log(`  • Predicción de satisfacción: MAE = ${satisfactionMetrics.mae.toFixed(4)}, Accuracy = ${satisfactionMetrics.accuracy.toFixed(4)}`);
    }
    console.log(`  • Anomalías detectadas: ${Object.keys(anomalies).length} sensores`);
    
    console.log('\n🎉 Los modelos están listos para usar en tu API!');
    console.log('\n💡 Tip: Los modelos usan regresión lineal simple, ideales para producción');
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error(error.stack);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

// Ejecutar
main();
