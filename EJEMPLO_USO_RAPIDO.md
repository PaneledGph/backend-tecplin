# 🚀 Ejemplo de Uso Rápido - Análisis Predictivo TecPlin

## Inicio Rápido en 5 Minutos

### 1️⃣ Generar Datos (2 minutos)

```bash
cd c:\ie1\proyectos\backend-tecplin\scripts
node seed-analytics-data.js
```

**Resultado esperado:**
```
🚀 Iniciando generación de datos para análisis predictivo...

📝 Generando usuarios...
✅ 68 usuarios creados

👥 Generando clientes...
✅ 50 clientes creados

👷 Generando técnicos...
✅ 15 técnicos creados

📋 Generando órdenes...
  📦 Procesado lote 1: 100/600 órdenes
  📦 Procesado lote 2: 200/600 órdenes
  ...
✅ 600 órdenes creadas

🌡️ Generando sensores...
✅ 30 sensores creados

📊 Generando lecturas...
✅ 3000 lecturas creadas

✨ ¡Generación completada exitosamente!
```

---

### 2️⃣ Entrenar Modelos (3 minutos)

```bash
python tensorflow-analytics.py
```

**Resultado esperado:**
```
🤖 ANÁLISIS PREDICTIVO CON TENSORFLOW - TECPLIN
============================================================

📥 Cargando datos...
✅ 600 órdenes y 3000 lecturas cargadas

🎯 Entrenando modelo de predicción de demanda...
✅ MSE: 1.2345, MAE: 0.8765, R²: 0.8234

⏱️ Entrenando modelo de predicción de tiempo...
✅ MSE: 0.5678, MAE: 0.6543 horas, R²: 0.7891

⭐ Entrenando modelo de satisfacción...
✅ Accuracy: 0.6789, MAE: 0.7234 estrellas

🚨 Entrenando modelo de anomalías...
  ✅ TEMPERATURA: threshold=0.1234, anomalías=15
  ✅ PRESION: threshold=0.2345, anomalías=12

✨ ¡Entrenamiento completado exitosamente!
📁 Modelos guardados en: ./ml_models
```

---

## 📊 Ejemplos de Uso de la API

### Ejemplo 1: Ver Insights Completos

**Request:**
```bash
curl http://localhost:3000/api/analytics/insights
```

**Response:**
```json
{
  "timestamp": "2024-11-09T19:00:00.000Z",
  "resumen": {
    "ordenes": {
      "total": 600,
      "completadas": 520,
      "pendientes": 15,
      "tasa_completado": 87
    },
    "tecnicos": {
      "total": 15,
      "disponibles": 9,
      "tasa_disponibilidad": 60
    },
    "satisfaccion": {
      "promedio": 4.2,
      "tendencia": "+0.2"
    },
    "especialidad_mas_demandada": "Plomería"
  },
  "predicciones": {
    "demanda": {
      "forecast": [
        { "fecha": "2024-11-10", "demanda_predicha": 15, "dia_semana": "Dom" },
        { "fecha": "2024-11-11", "demanda_predicha": 12, "dia_semana": "Lun" },
        { "fecha": "2024-11-12", "demanda_predicha": 14, "dia_semana": "Mar" }
      ],
      "resumen": {
        "demanda_promedio": 13,
        "demanda_maxima": 18,
        "tecnicos_necesarios": 5
      }
    }
  },
  "alertas": {
    "ordenes_en_riesgo": 3,
    "sensores_criticos": 2
  },
  "recomendaciones": [
    {
      "tipo": "CONTRATACION",
      "prioridad": "MEDIA",
      "mensaje": "Demanda estable, mantener equipo actual",
      "accion": "Monitorear próxima semana"
    },
    {
      "tipo": "MANTENIMIENTO",
      "prioridad": "ALTA",
      "mensaje": "2 sensores con anomalías detectadas",
      "accion": "Programar mantenimiento preventivo"
    }
  ]
}
```

---

### Ejemplo 2: Predecir Demanda Semanal

**Request:**
```bash
curl http://localhost:3000/api/analytics/demand-forecast?days=7
```

**Response:**
```json
{
  "forecast": [
    { "fecha": "2024-11-10", "demanda_predicha": 8, "dia_semana": "Dom" },
    { "fecha": "2024-11-11", "demanda_predicha": 15, "dia_semana": "Lun" },
    { "fecha": "2024-11-12", "demanda_predicha": 14, "dia_semana": "Mar" },
    { "fecha": "2024-11-13", "demanda_predicha": 13, "dia_semana": "Mié" },
    { "fecha": "2024-11-14", "demanda_predicha": 14, "dia_semana": "Jue" },
    { "fecha": "2024-11-15", "demanda_predicha": 12, "dia_semana": "Vie" },
    { "fecha": "2024-11-16", "demanda_predicha": 6, "dia_semana": "Sáb" }
  ],
  "resumen": {
    "demanda_promedio": 12,
    "demanda_maxima": 15,
    "tecnicos_necesarios": 4,
    "periodo": "7 días"
  }
}
```

**Interpretación para el Admin:**
- 📊 Lunes es el día con más demanda (15 órdenes)
- 📉 Fin de semana tiene menos demanda (6-8 órdenes)
- 👷 Necesitas 4 técnicos disponibles en promedio
- 💡 Considera dar descanso a técnicos el fin de semana

---

### Ejemplo 3: Predecir Tiempo de Servicio

**Request:**
```bash
curl -X POST http://localhost:3000/api/analytics/predict-service-time \
  -H "Content-Type: application/json" \
  -d '{
    "tipoProblema": "Fuga de agua",
    "especialidad": "Plomería",
    "prioridad": "ALTA"
  }'
```

**Response:**
```json
{
  "tiempo_estimado_horas": 3.2,
  "rango_confianza": {
    "minimo": 2.6,
    "maximo": 3.8
  },
  "confianza": 0.85,
  "factores": {
    "especialidad": "Plomería",
    "prioridad": "ALTA",
    "complejidad": "Fuga de agua"
  }
}
```

**Uso práctico:**
```javascript
// En tu código de asignación
const tiempoEstimado = 3.2; // horas
const horaInicio = new Date('2024-11-10T09:00:00');
const horaFin = new Date(horaInicio.getTime() + tiempoEstimado * 60 * 60 * 1000);

// Buscar técnico con disponibilidad
const tecnicoDisponible = tecnicos.find(t => 
  t.disponible_hasta > horaFin && 
  t.especialidad === 'Plomería'
);

// Asignar orden
asignarOrden(ordenId, tecnicoDisponible.id, tiempoEstimado);
```

---

### Ejemplo 4: Predecir Satisfacción del Cliente

**Request:**
```bash
curl http://localhost:3000/api/analytics/predict-satisfaction/123
```

**Response (Servicio en Riesgo):**
```json
{
  "ordenId": 123,
  "calificacion_predicha": 2,
  "probabilidades": {
    "1_estrella": 0.1,
    "2_estrellas": 0.6,
    "3_estrellas": 0.2,
    "4_estrellas": 0.1,
    "5_estrellas": 0.0
  },
  "en_riesgo": true,
  "factores_riesgo": [
    "Tiempo de servicio excedido",
    "Prioridad alta"
  ],
  "recomendaciones": [
    "Asignar técnico más experimentado",
    "Contactar al cliente proactivamente",
    "Ofrecer compensación si es necesario"
  ]
}
```

**Acción del Admin:**
```javascript
// Detectar servicio en riesgo
if (prediccion.en_riesgo) {
  // 1. Alertar al supervisor
  enviarAlerta({
    tipo: 'SERVICIO_EN_RIESGO',
    ordenId: 123,
    mensaje: 'Orden #123 tiene predicción de baja satisfacción'
  });
  
  // 2. Contactar al cliente
  enviarMensaje(cliente.telefono, 
    'Estimado cliente, estamos monitoreando su servicio para asegurar su satisfacción.'
  );
  
  // 3. Ofrecer compensación preventiva
  aplicarDescuento(ordenId, 10); // 10% descuento
}
```

---

### Ejemplo 5: Detectar Anomalías en Sensores

**Request:**
```bash
curl http://localhost:3000/api/analytics/sensor-anomalies
```

**Response:**
```json
{
  "total_sensores": 30,
  "sensores_con_anomalias": 3,
  "anomalias": [
    {
      "sensorId": 5,
      "codigo": "SENSOR-TEM-005",
      "tipo": "TEMPERATURA",
      "ubicacion": "Chapinero - Edificio 3",
      "valor_actual": 45.2,
      "umbral_min": 15,
      "umbral_max": 30,
      "severidad": "ALTA",
      "timestamp": "2024-11-09T18:30:00.000Z",
      "recomendacion": "Requiere atención inmediata"
    },
    {
      "sensorId": 12,
      "codigo": "SENSOR-PRE-012",
      "tipo": "PRESION",
      "ubicacion": "Suba - Edificio 7",
      "valor_actual": 85,
      "umbral_min": 80,
      "umbral_max": 120,
      "severidad": "MEDIA",
      "timestamp": "2024-11-09T18:25:00.000Z",
      "recomendacion": "Monitorear de cerca"
    }
  ],
  "ultima_actualizacion": "2024-11-09T19:00:00.000Z"
}
```

**Dashboard del Admin:**
```javascript
// Mostrar alertas críticas
anomalias
  .filter(a => a.severidad === 'ALTA')
  .forEach(anomalia => {
    mostrarAlerta({
      titulo: `🚨 Sensor ${anomalia.codigo}`,
      mensaje: `Temperatura: ${anomalia.valor_actual}°C (límite: ${anomalia.umbral_max}°C)`,
      ubicacion: anomalia.ubicacion,
      accion: 'Crear orden de mantenimiento'
    });
    
    // Auto-crear orden de mantenimiento
    crearOrdenMantenimiento({
      tipo: 'URGENTE',
      sensor: anomalia.codigo,
      ubicacion: anomalia.ubicacion,
      descripcion: `Revisar sensor ${anomalia.tipo} - Lectura anómala`
    });
  });
```

---

### Ejemplo 6: Eficiencia de Técnicos

**Request:**
```bash
curl http://localhost:3000/api/analytics/technician-efficiency
```

**Response:**
```json
{
  "tecnicos": [
    {
      "tecnicoId": 3,
      "nombre": "Técnico 3",
      "especialidad": "Plomería",
      "ordenes_completadas": 45,
      "promedio_calificacion": 4.8,
      "eficiencia_score": 95
    },
    {
      "tecnicoId": 7,
      "nombre": "Técnico 7",
      "especialidad": "Electricidad",
      "ordenes_completadas": 38,
      "promedio_calificacion": 4.5,
      "eficiencia_score": 88
    }
  ],
  "top_performers": [
    { "tecnicoId": 3, "nombre": "Técnico 3", "eficiencia_score": 95 },
    { "tecnicoId": 7, "nombre": "Técnico 7", "eficiencia_score": 88 }
  ],
  "necesitan_mejora": [
    {
      "tecnicoId": 12,
      "nombre": "Técnico 12",
      "especialidad": "HVAC",
      "ordenes_completadas": 15,
      "promedio_calificacion": 3.2,
      "eficiencia_score": 65
    }
  ]
}
```

**Acciones del Admin:**
```javascript
// 1. Reconocer top performers
topPerformers.forEach(tecnico => {
  enviarReconocimiento(tecnico.id, 'Excelente desempeño este mes');
  aplicarBono(tecnico.id, 50000); // Bono de $50,000
});

// 2. Capacitar técnicos que necesitan mejora
necesitanMejora.forEach(tecnico => {
  programarCapacitacion(tecnico.id, tecnico.especialidad);
  asignarMentor(tecnico.id, topPerformers[0].id);
});

// 3. Ajustar asignaciones
// Asignar órdenes complejas a top performers
// Asignar órdenes simples a técnicos en entrenamiento
```

---

## 🎯 Flujo Completo: Día del Admin

### 8:00 AM - Revisar Dashboard
```javascript
const insights = await fetch('/api/analytics/insights');

console.log(`Buenos días! Hoy se esperan ${insights.predicciones.demanda.resumen.demanda_promedio} órdenes`);
console.log(`Técnicos disponibles: ${insights.resumen.tecnicos.disponibles}`);
console.log(`Alertas: ${insights.alertas.ordenes_en_riesgo} órdenes en riesgo`);
```

### 9:00 AM - Asignar Órdenes Nuevas
```javascript
const ordenesNuevas = await getOrdenesPendientes();

for (const orden of ordenesNuevas) {
  // Predecir tiempo
  const prediccion = await fetch('/api/analytics/predict-service-time', {
    method: 'POST',
    body: JSON.stringify({
      tipoProblema: orden.tipoProblema,
      especialidad: orden.especialidadRequerida,
      prioridad: orden.prioridad
    })
  });
  
  // Buscar técnico óptimo
  const tecnico = encontrarTecnicoOptimo(
    orden.ubicacion,
    orden.especialidadRequerida,
    prediccion.tiempo_estimado_horas
  );
  
  // Asignar
  await asignarOrden(orden.id, tecnico.id);
}
```

### 12:00 PM - Monitorear Servicios en Progreso
```javascript
const ordenesEnProgreso = await getOrdenesEnProgreso();

for (const orden of ordenesEnProgreso) {
  // Predecir satisfacción
  const satisfaccion = await fetch(`/api/analytics/predict-satisfaction/${orden.id}`);
  
  if (satisfaccion.en_riesgo) {
    // Intervenir proactivamente
    await contactarCliente(orden.clienteId);
    await alertarSupervisor(orden.tecnicoId);
  }
}
```

### 3:00 PM - Revisar Sensores
```javascript
const anomalias = await fetch('/api/analytics/sensor-anomalies');

if (anomalias.sensores_con_anomalias > 0) {
  // Crear órdenes de mantenimiento
  for (const anomalia of anomalias.anomalias) {
    if (anomalia.severidad === 'ALTA') {
      await crearOrdenUrgente({
        tipo: 'MANTENIMIENTO',
        ubicacion: anomalia.ubicacion,
        descripcion: `Revisar sensor ${anomalia.codigo}`
      });
    }
  }
}
```

### 5:00 PM - Planificar Mañana
```javascript
const forecast = await fetch('/api/analytics/demand-forecast?days=1');

console.log(`Mañana se esperan ${forecast.forecast[0].demanda_predicha} órdenes`);

if (forecast.resumen.tecnicos_necesarios > tecnicosDisponibles) {
  // Llamar a técnicos adicionales
  await notificarTecnicosReserva(
    forecast.resumen.tecnicos_necesarios - tecnicosDisponibles
  );
}
```

---

## 💡 Tips y Mejores Prácticas

### 1. Reentrenar Modelos Regularmente
```bash
# Cron job cada domingo a las 2am
0 2 * * 0 cd /path/to/backend && python scripts/tensorflow-analytics.py
```

### 2. Monitorear Precisión de Predicciones
```javascript
// Comparar predicción vs realidad
const prediccion = await predictServiceTime(orden);
// ... después de completar
const tiempoReal = calcularTiempoReal(orden);
const error = Math.abs(prediccion - tiempoReal);

// Guardar métrica
await guardarMetrica({
  tipo: 'PREDICCION_TIEMPO',
  error: error,
  fecha: new Date()
});
```

### 3. Usar Predicciones como Guía, No Ley
```javascript
// ✅ Bueno: Usar como referencia
const prediccion = await predictSatisfaction(orden);
if (prediccion.en_riesgo) {
  // Revisar manualmente y decidir acción
  mostrarAlerta(admin, prediccion);
}

// ❌ Malo: Confiar ciegamente
if (prediccion.calificacion_predicha < 3) {
  cancelarOrden(orden); // No hacer esto automáticamente
}
```

---

## 🎉 ¡Listo para Usar!

Tu sistema de análisis predictivo está completamente configurado. Ahora puedes:

✅ Predecir demanda y planificar recursos
✅ Optimizar asignaciones de técnicos
✅ Prevenir insatisfacción del cliente
✅ Detectar fallas antes de que ocurran
✅ Tomar decisiones basadas en datos

**¡Éxito! 🚀**
