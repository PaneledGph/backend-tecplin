# 🚀 Inicio Rápido - Machine Learning con TensorFlow.js

## ✅ Ventajas de TensorFlow.js

- ✅ **No requiere Python** - Todo en JavaScript/Node.js
- ✅ **Integración directa** - Usa el mismo stack que tu backend
- ✅ **Más rápido** - Sin necesidad de instalar dependencias externas
- ✅ **Mismo rendimiento** - TensorFlow.js usa optimizaciones nativas

---

## 📦 Paso 1: Instalar Dependencias

```bash
cd c:\ie1\proyectos\backend-tecplin
npm install
```

Esto instalará automáticamente `@tensorflow/tfjs-node` junto con las demás dependencias.

---

## 🎯 Paso 2: Generar Datos y Entrenar Modelos

### Opción A: Todo en Uno (Recomendado)

```bash
npm run ml:setup
```

Este comando ejecuta automáticamente:
1. Generación de datos (`seed:analytics`)
2. Entrenamiento de modelos (`train:ml`)

### Opción B: Paso a Paso

```bash
# 1. Generar datos
npm run seed:analytics

# 2. Entrenar modelos
npm run train:ml
```

---

## 📊 Salida Esperada

```
🚀 Iniciando generación de datos para análisis predictivo...

📝 Generando usuarios...
✅ 68 usuarios creados

👥 Generando clientes...
✅ 50 clientes creados

👷 Generando técnicos...
✅ 15 técnicos creados

📋 Generando órdenes...
✅ 600 órdenes creadas

🌡️ Generando sensores...
✅ 30 sensores creados

📊 Generando lecturas...
✅ 3000 lecturas creadas

✨ ¡Generación completada exitosamente!

============================================================
🤖 ANÁLISIS PREDICTIVO CON TENSORFLOW.JS - TECPLIN
============================================================

📥 Cargando datos de órdenes...
✅ 600 órdenes cargadas

🎯 Entrenando modelo de predicción de demanda...
  Época 10/50 - loss: 2.3456, mae: 1.2345
  Época 20/50 - loss: 1.8765, mae: 0.9876
  Época 30/50 - loss: 1.4321, mae: 0.8765
  Época 40/50 - loss: 1.2345, mae: 0.7654
  Época 50/50 - loss: 1.1234, mae: 0.7123
✅ Loss: 1.0987, MAE: 0.6789

⏱️ Entrenando modelo de predicción de tiempo...
  Época 20/100 - loss: 3.4567, mae: 1.5432
  Época 40/100 - loss: 2.1234, mae: 1.1234
  Época 60/100 - loss: 1.5678, mae: 0.9876
  Época 80/100 - loss: 1.2345, mae: 0.8765
  Época 100/100 - loss: 1.0123, mae: 0.7654
✅ Loss: 0.9876, MAE: 0.7123 horas

⭐ Entrenando modelo de predicción de satisfacción...
  Época 10/50 - loss: 1.4567, accuracy: 0.5432
  Época 20/50 - loss: 1.1234, accuracy: 0.6234
  Época 30/50 - loss: 0.9876, accuracy: 0.6789
  Época 40/50 - loss: 0.8765, accuracy: 0.7012
  Época 50/50 - loss: 0.8123, accuracy: 0.7234
✅ Loss: 0.7987, Accuracy: 0.7345

📊 Generando insights...
✅ Insights guardados

============================================================
✨ ¡Entrenamiento completado exitosamente!
============================================================

📁 Modelos guardados en: c:\ie1\proyectos\backend-tecplin\ml_models

📊 Resumen de métricas:
  • Predicción de demanda: MAE = 0.6789
  • Predicción de tiempo: MAE = 0.71 horas
  • Predicción de satisfacción: Accuracy = 0.7345

🎉 Los modelos están listos para usar en tu API!
```

---

## 📁 Archivos Generados

Después del entrenamiento, encontrarás en `ml_models/`:

```
ml_models/
├── demand_model/
│   ├── model.json
│   └── weights.bin
├── service_time_model/
│   ├── model.json
│   └── weights.bin
├── satisfaction_model/
│   ├── model.json
│   └── weights.bin
├── demand_params.json
├── service_time_params.json
├── satisfaction_params.json
└── insights.json
```

---

## 🔌 Paso 3: Usar los Modelos en tu API

Los modelos ya están integrados en el servicio `MLIntegrationService`. Solo necesitas:

### 1. Importar el Módulo

```typescript
// src/app.module.ts
import { MLIntegrationModule } from './ml/ml-integration.module';

@Module({
  imports: [
    // ... otros módulos
    MLIntegrationModule,
  ],
})
export class AppModule {}
```

### 2. Iniciar el Backend

```bash
npm run start:dev
```

### 3. Probar los Endpoints

```bash
# Ver insights completos
curl http://localhost:3000/api/analytics/insights

# Predicción de demanda para 7 días
curl http://localhost:3000/api/analytics/demand-forecast?days=7

# Predecir tiempo de servicio
curl -X POST http://localhost:3000/api/analytics/predict-service-time \
  -H "Content-Type: application/json" \
  -d '{
    "tipoProblema": "Fuga de agua",
    "especialidad": "Plomería",
    "prioridad": "ALTA"
  }'

# Predecir satisfacción
curl http://localhost:3000/api/analytics/predict-satisfaction/1

# Detectar anomalías en sensores
curl http://localhost:3000/api/analytics/sensor-anomalies

# Eficiencia de técnicos
curl http://localhost:3000/api/analytics/technician-efficiency
```

---

## 🎯 Ejemplo de Uso en el Frontend

```typescript
// En tu componente React Native o Web
async function obtenerInsights() {
  const response = await fetch('http://localhost:3000/api/analytics/insights');
  const insights = await response.json();
  
  console.log('Demanda promedio:', insights.predicciones.demanda.resumen.demanda_promedio);
  console.log('Técnicos necesarios:', insights.predicciones.demanda.resumen.tecnicos_necesarios);
  console.log('Satisfacción promedio:', insights.resumen.satisfaccion.promedio);
}

async function predecirTiempo(orden) {
  const response = await fetch('http://localhost:3000/api/analytics/predict-service-time', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      tipoProblema: orden.tipoProblema,
      especialidad: orden.especialidadRequerida,
      prioridad: orden.prioridad
    })
  });
  
  const prediccion = await response.json();
  console.log('Tiempo estimado:', prediccion.tiempo_estimado_horas, 'horas');
  
  return prediccion;
}
```

---

## 🔄 Reentrenamiento

Para mantener los modelos actualizados con nuevos datos:

```bash
# Reentrenar modelos (sin regenerar datos)
npm run train:ml

# Regenerar datos y reentrenar todo
npm run ml:setup
```

### Automatizar con Cron (Opcional)

```bash
# En Windows Task Scheduler o en Linux cron
# Reentrenar cada domingo a las 2am
0 2 * * 0 cd /path/to/backend && npm run train:ml
```

---

## ⚡ Ventajas vs Python

| Característica | TensorFlow.js | Python (TensorFlow) |
|----------------|---------------|---------------------|
| Instalación | ✅ `npm install` | ❌ Requiere Python + pip |
| Velocidad setup | ✅ < 1 minuto | ❌ 5-10 minutos |
| Integración | ✅ Nativa en Node.js | ❌ Requiere API separada |
| Mantenimiento | ✅ Un solo stack | ❌ Dos stacks diferentes |
| Deployment | ✅ Mismo servidor | ❌ Servidor adicional |
| Rendimiento | ✅ Optimizado | ✅ Optimizado |

---

## 🐛 Troubleshooting

### Error: "Cannot find module '@tensorflow/tfjs-node'"

```bash
npm install @tensorflow/tfjs-node
```

### Error: "Database connection failed"

Verifica que PostgreSQL esté corriendo y que el `.env` esté configurado:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/tecplin"
```

### Error: "No hay suficientes datos"

Primero genera los datos:

```bash
npm run seed:analytics
```

### Los modelos no mejoran

- Aumenta el número de epochs en el script
- Genera más datos (modifica CONFIG en seed-analytics-data.js)
- Ajusta la arquitectura de las redes neuronales

---

## 📚 Recursos

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Guía Completa](./GUIA_ANALISIS_PREDICTIVO.md)
- [Ejemplos de Uso](./EJEMPLO_USO_RAPIDO.md)

---

## 🎉 ¡Listo!

Tu sistema de Machine Learning está completamente configurado y listo para usar. Ahora puedes:

✅ Predecir demanda de servicios
✅ Estimar tiempos de servicio con precisión
✅ Identificar servicios en riesgo
✅ Detectar anomalías en sensores IoT
✅ Tomar decisiones basadas en datos

**¡Todo sin necesidad de Python! 🚀**
