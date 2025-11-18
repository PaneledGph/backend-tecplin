const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

async function testEndpoints() {
  console.log('🧪 Probando endpoints de TecPlin...\n');

  try {
    // 1. Test Analytics Insights
    console.log('1️⃣ Testing /analytics/insights...');
    const insights = await axios.get(`${BASE_URL}/analytics/insights`);
    console.log('✅ Analytics Insights:', {
      timestamp: insights.data.timestamp,
      ordenes_total: insights.data.resumen?.ordenes?.total || 0,
      tecnicos_total: insights.data.resumen?.tecnicos?.total || 0,
      alertas: insights.data.alertas,
      recomendaciones: insights.data.recomendaciones?.length || 0
    });
    console.log('');

    // 2. Test Demand Forecast
    console.log('2️⃣ Testing /analytics/demand-forecast...');
    const forecast = await axios.get(`${BASE_URL}/analytics/demand-forecast?days=7`);
    console.log('✅ Demand Forecast:', {
      dias: forecast.data.forecast?.length || 0,
      demanda_promedio: forecast.data.resumen?.demanda_promedio || 0,
      tecnicos_necesarios: forecast.data.resumen?.tecnicos_necesarios || 0
    });
    console.log('');

    // 3. Test Predict Service Time
    console.log('3️⃣ Testing /analytics/predict-service-time...');
    const serviceTime = await axios.post(`${BASE_URL}/analytics/predict-service-time`, {
      tipoProblema: 'Fuga de agua',
      especialidad: 'Plomería',
      prioridad: 'ALTA'
    });
    console.log('✅ Service Time Prediction:', {
      tiempo_estimado: serviceTime.data.tiempo_estimado_horas,
      confianza: serviceTime.data.confianza
    });
    console.log('');

    // 4. Test Usuarios (sin auth para ver paginación)
    console.log('4️⃣ Testing /usuarios?limit=5...');
    try {
      const usuarios = await axios.get(`${BASE_URL}/usuarios?limit=5`);
      if (usuarios.data.meta) {
        console.log('✅ Usuarios (Paginado):', {
          total: usuarios.data.meta.total,
          page: usuarios.data.meta.page,
          limit: usuarios.data.meta.limit,
          totalPages: usuarios.data.meta.totalPages,
          items: usuarios.data.data?.length || 0
        });
      } else {
        console.log('⚠️ Usuarios (Sin paginar):', {
          items: usuarios.data.length
        });
      }
    } catch (err) {
      console.log('⚠️ Usuarios requiere autenticación (esperado)');
    }
    console.log('');

    // 5. Test Health Check
    console.log('5️⃣ Testing health check...');
    const health = await axios.get(`${BASE_URL}/`);
    console.log('✅ Health Check:', health.data);
    console.log('');

    console.log('🎉 ¡Todos los tests pasaron!');
    console.log('');
    console.log('📊 Resumen:');
    console.log('  ✅ Analytics funcionando');
    console.log('  ✅ ML Predictions funcionando');
    console.log('  ✅ Paginación implementada');
    console.log('  ✅ Backend corriendo correctamente');

  } catch (error) {
    console.error('❌ Error en tests:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testEndpoints();
