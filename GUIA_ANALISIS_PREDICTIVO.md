# 🤖 Guía de Análisis Predictivo con TensorFlow - TecPlin

## 📋 Índice
1. [Introducción](#introducción)
2. [Instalación](#instalación)
3. [Generación de Datos](#generación-de-datos)
4. [Modelos de Machine Learning](#modelos-de-machine-learning)
5. [Uso de los Modelos](#uso-de-los-modelos)
6. [Insights para el Admin](#insights-para-el-admin)
7. [API Endpoints](#api-endpoints)

---

## 🎯 Introducción

Este sistema proporciona análisis predictivo avanzado para ayudar al administrador a tomar decisiones basadas en datos. Los modelos de Machine Learning están entrenados con datos históricos enriquecidos que incluyen patrones estacionales, temporales y de comportamiento.

### Casos de Uso Principales

1. **Predicción de Demanda**: Anticipa cuántas órdenes de servicio se recibirán
2. **Optimización de Tiempos**: Estima con precisión la duración de cada servicio
3. **Satisfacción del Cliente**: Predice calificaciones antes de completar el servicio
4. **Detección de Anomalías**: Identifica problemas en sensores IoT antes de que fallen

---

## 🔧 Instalación

### 1. Instalar Dependencias de Python

```bash
cd backend-tecplin
pip install tensorflow numpy pandas scikit-learn psycopg2-binary matplotlib seaborn
```

### 2. Instalar Dependencias de Node.js

```bash
npm install
```

### 3. Configurar Variables de Entorno

Asegúrate de tener configurado `.env` con:

```env
DATABASE_URL="postgresql://usuario:password@localhost:5432/tecplin"
DB_HOST=localhost
DB_PORT=5432
DB_NAME=tecplin
DB_USER=postgres
DB_PASSWORD=tu_password
```

---

## 📊 Generación de Datos

### Paso 1: Ejecutar el Script de Generación

```bash
node scripts/seed-analytics-data.js
```

Este script genera:
- **68 usuarios** (3 admins, 15 técnicos, 50 clientes)
- **600 órdenes** con patrones realistas:
  - Estacionalidad (más demanda en invierno/verano)
  - Patrones semanales (más órdenes entre semana)
  - Patrones horarios (pico entre 8am-6pm)
- **30 sensores IoT** con diferentes tipos
- **3,000+ lecturas** de sensores con:
  - Patrones diarios
  - Tendencias graduales
  - Anomalías ocasionales (2%)

### Características de los Datos Generados

#### Órdenes de Servicio
```javascript
{
  descripcion: "Fuga de agua en Chapinero",
  fechasolicitud: "2024-03-15T10:30:00Z",
  estado: "COMPLETADO",
  prioridad: "ALTA",
  tipoProblema: "Fuga de agua",
  especialidadRequerida: "Plomería",
  tiempoEstimadoHoras: 4,
  costoEstimado: 180000,
  costoFinal: 195000,
  calificacion: 5,
  ubicacionLatitud: 4.6533,
  ubicacionLongitud: -74.0631
}
```

#### Lecturas de Sensores
```javascript
{
  sensorId: 1,
  valor: 24.5,  // Temperatura en °C
  timestamp: "2024-11-09T14:00:00Z",
  sensor: {
    tipo: "TEMPERATURA",
    umbralMin: 15,
    umbralMax: 30
  }
}
```

---

## 🧠 Modelos de Machine Learning

### 1. Predicción de Demanda 📈

**Objetivo**: Predecir cuántas órdenes se recibirán en un período específico

**Features**:
- Mes del año
- Día de la semana
- Hora del día

**Arquitectura**:
```
Input (3) → Dense(64) → Dropout(0.2) → Dense(32) → Dropout(0.2) → Dense(16) → Output(1)
```

**Métricas Esperadas**:
- R² Score: > 0.75
- MAE: < 2 órdenes

**Uso para el Admin**:
```python
# Predecir demanda para mañana a las 10am
mes = 11  # Noviembre
dia_semana = 1  # Lunes
hora = 10

demanda_predicha = modelo.predict([[mes, dia_semana, hora]])
print(f"Se esperan {demanda_predicha[0]:.0f} órdenes")
```

---

### 2. Predicción de Tiempo de Servicio ⏱️

**Objetivo**: Estimar cuánto tiempo tomará completar un servicio

**Features**:
- Tipo de problema (codificado)
- Especialidad requerida (codificado)
- Prioridad (codificado)
- Mes, día de la semana, hora

**Arquitectura**:
```
Input (6) → Dense(128) → BatchNorm → Dropout(0.3) → 
Dense(64) → BatchNorm → Dropout(0.3) → 
Dense(32) → Output(1)
```

**Métricas Esperadas**:
- MAE: < 1 hora
- R² Score: > 0.70

**Uso para el Admin**:
```python
# Estimar tiempo para una orden de plomería
tiempo_estimado = modelo.predict(features)
print(f"Tiempo estimado: {tiempo_estimado[0]:.1f} horas")

# Asignar técnico con disponibilidad adecuada
tecnicos_disponibles = filtrar_por_tiempo(tiempo_estimado)
```

---

### 3. Predicción de Satisfacción ⭐

**Objetivo**: Predecir la calificación que dará el cliente (1-5 estrellas)

**Features**:
- Tipo de problema
- Especialidad del técnico
- Tiempo estimado vs tiempo real
- Mes, día de la semana

**Arquitectura**:
```
Input (7) → Dense(64) → Dropout(0.3) → 
Dense(32) → Dropout(0.3) → 
Dense(16) → Output(5, softmax)
```

**Métricas Esperadas**:
- Accuracy: > 65%
- MAE: < 0.8 estrellas

**Uso para el Admin**:
```python
# Identificar servicios en riesgo
if calificacion_predicha < 3:
    # Alertar al supervisor
    # Asignar técnico más experimentado
    # Ofrecer descuento preventivo
```

---

### 4. Detección de Anomalías 🚨

**Objetivo**: Identificar lecturas anómalas en sensores IoT

**Arquitectura**: Autoencoder
```
Encoder: Input → Dense(16) → Dense(8) → Dense(4)
Decoder: Dense(4) → Dense(8) → Dense(16) → Output
```

**Método**:
- Entrenar con datos normales
- Calcular error de reconstrucción
- Threshold = percentil 95
- Anomalía si error > threshold

**Uso para el Admin**:
```python
# Detectar sensores con problemas
for sensor in sensores:
    error = calcular_error_reconstruccion(lectura)
    if error > threshold:
        crear_alerta(sensor, "Posible falla detectada")
        asignar_tecnico_mantenimiento(sensor)
```

---

## 🚀 Uso de los Modelos

### Entrenar Todos los Modelos

```bash
python scripts/tensorflow-analytics.py
```

**Salida esperada**:
```
🤖 ANÁLISIS PREDICTIVO CON TENSORFLOW - TECPLIN
============================================================

📥 Cargando datos...
✅ 600 órdenes y 3000 lecturas cargadas

🎯 Entrenando modelo de predicción de demanda...
✅ MSE: 1.2345, MAE: 0.8765, R²: 0.8234

⏱️ Entrenando modelo de predicción de tiempo de servicio...
✅ MSE: 0.5678, MAE: 0.6543 horas, R²: 0.7891

⭐ Entrenando modelo de predicción de satisfacción...
✅ Accuracy: 0.6789, MAE: 0.7234 estrellas

🚨 Entrenando modelo de detección de anomalías...
  ✅ TEMPERATURA: threshold=0.1234, anomalías=15
  ✅ PRESION: threshold=0.2345, anomalías=12
  ✅ VIBRACION: threshold=0.3456, anomalías=8

✨ ¡Entrenamiento completado exitosamente!
```

### Modelos Guardados

Después del entrenamiento, encontrarás en `ml_models/`:

```
ml_models/
├── demand_prediction_model.h5
├── demand_scaler_mean.npy
├── demand_scaler_scale.npy
├── service_time_model.h5
├── service_time_scaler_mean.npy
├── service_time_scaler_scale.npy
├── satisfaction_model.h5
├── satisfaction_scaler_mean.npy
├── satisfaction_scaler_scale.npy
├── anomaly_temperatura_model.h5
├── anomaly_temperatura_threshold.npy
├── insights.json
└── ...
```

---

## 📊 Insights para el Admin

### Archivo `insights.json`

```json
{
  "timestamp": "2024-11-09T19:00:00Z",
  "ordenes": {
    "total": 600,
    "completadas": 520,
    "promedio_calificacion": 4.2,
    "especialidad_mas_demandada": "Plomería",
    "hora_pico": 10,
    "dia_mas_ocupado": 2
  },
  "sensores": {
    "total_lecturas": 3000,
    "tipos": 6,
    "promedio_valor_por_tipo": {
      "TEMPERATURA": 22.5,
      "PRESION": 100.2,
      "VIBRACION": 2.1
    }
  },
  "predicciones": {
    "demanda_proxima_semana": [12, 15, 14, 13, 11, 6, 5],
    "tecnicos_necesarios": 8,
    "servicios_en_riesgo": 3
  }
}
```

### Dashboard de Insights

El admin puede visualizar:

1. **Demanda Futura**
   - Gráfico de predicción semanal/mensual
   - Recomendación de contratación de técnicos
   - Alertas de picos de demanda

2. **Eficiencia Operativa**
   - Tiempo promedio real vs estimado
   - Técnicos más eficientes
   - Especialidades con mayor desviación

3. **Satisfacción del Cliente**
   - Tendencia de calificaciones
   - Servicios en riesgo (predicción < 3 estrellas)
   - Factores que afectan la satisfacción

4. **Salud de Equipos**
   - Sensores con anomalías
   - Predicción de fallas
   - Mantenimiento preventivo recomendado

---

## 🔌 API Endpoints

### Integrar Modelos en NestJS

Crear un servicio de ML en NestJS:

```typescript
// src/ml/ml.service.ts
import { Injectable } from '@nestjs/common';
import * as tf from '@tensorflow/tfjs-node';

@Injectable()
export class MLService {
  private demandModel: tf.LayersModel;
  
  async onModuleInit() {
    // Cargar modelo
    this.demandModel = await tf.loadLayersModel(
      'file://./ml_models/demand_prediction_model.h5'
    );
  }
  
  async predictDemand(mes: number, dia: number, hora: number) {
    const input = tf.tensor2d([[mes, dia, hora]]);
    const prediction = this.demandModel.predict(input) as tf.Tensor;
    const result = await prediction.data();
    return Math.round(result[0]);
  }
}
```

### Endpoints Sugeridos

```typescript
// GET /api/analytics/demand-forecast
{
  "proxima_semana": [12, 15, 14, 13, 11, 6, 5],
  "proximo_mes": 280,
  "recomendacion": "Contratar 2 técnicos adicionales"
}

// POST /api/analytics/predict-service-time
{
  "tipoProblema": "Fuga de agua",
  "especialidad": "Plomería",
  "prioridad": "ALTA"
}
// Response:
{
  "tiempo_estimado_horas": 4.2,
  "confianza": 0.85
}

// POST /api/analytics/predict-satisfaction
{
  "ordenId": 123
}
// Response:
{
  "calificacion_predicha": 4,
  "probabilidades": [0.05, 0.10, 0.15, 0.40, 0.30],
  "en_riesgo": false
}

// GET /api/analytics/sensor-anomalies
{
  "anomalias": [
    {
      "sensorId": 5,
      "tipo": "TEMPERATURA",
      "valor": 45.2,
      "threshold": 30,
      "severidad": "ALTA"
    }
  ]
}

// GET /api/analytics/insights
{
  "resumen": { ... },
  "recomendaciones": [
    "Contratar 2 técnicos de plomería",
    "Revisar sensor TEMP-003",
    "Mejorar tiempos en especialidad HVAC"
  ]
}
```

---

## 📈 Visualizaciones Recomendadas

### Para el Dashboard del Admin

1. **Gráfico de Demanda**
   ```javascript
   // Usando Chart.js o react-chartjs-2
   <LineChart
     data={demandaPrediction}
     title="Predicción de Demanda - Próximos 7 Días"
   />
   ```

2. **Mapa de Calor de Servicios**
   ```javascript
   // Mostrar zonas con más demanda
   <HeatMap
     locations={ordenesData}
     center={[4.6097, -74.0817]}
   />
   ```

3. **Indicadores Clave (KPIs)**
   ```javascript
   <KPICard
     title="Satisfacción Promedio"
     value={4.2}
     trend="+0.3"
     icon="⭐"
   />
   ```

4. **Alertas en Tiempo Real**
   ```javascript
   <AlertPanel>
     <Alert severity="high">
       Sensor TEMP-003: Temperatura fuera de rango
     </Alert>
     <Alert severity="medium">
       3 servicios en riesgo de baja calificación
     </Alert>
   </AlertPanel>
   ```

---

## 🎓 Mejores Prácticas

### 1. Reentrenamiento Periódico
```bash
# Cron job para reentrenar modelos semanalmente
0 2 * * 0 cd /path/to/backend && python scripts/tensorflow-analytics.py
```

### 2. Monitoreo de Métricas
- Guardar métricas de cada entrenamiento
- Alertar si las métricas caen significativamente
- A/B testing de nuevos modelos

### 3. Validación Continua
- Comparar predicciones con resultados reales
- Calcular drift de datos
- Ajustar umbrales según feedback

### 4. Seguridad
- No exponer modelos directamente
- Validar inputs antes de predicción
- Rate limiting en endpoints de ML

---

## 🔍 Troubleshooting

### Error: "No module named 'tensorflow'"
```bash
pip install tensorflow
```

### Error: "Database connection failed"
```bash
# Verificar que PostgreSQL esté corriendo
psql -U postgres -d tecplin -c "SELECT 1"
```

### Modelos con baja precisión
- Generar más datos (aumentar CONFIG en seed script)
- Ajustar hiperparámetros (epochs, batch_size)
- Agregar más features relevantes

---

## 📚 Recursos Adicionales

- [TensorFlow.js Docs](https://www.tensorflow.org/js)
- [Scikit-learn Guide](https://scikit-learn.org/stable/)
- [Time Series Forecasting](https://www.tensorflow.org/tutorials/structured_data/time_series)
- [Anomaly Detection](https://www.tensorflow.org/tutorials/generative/autoencoder)

---

## 🤝 Soporte

Para preguntas o problemas:
1. Revisar logs en `ml_models/training.log`
2. Verificar datos con `SELECT COUNT(*) FROM orden`
3. Contactar al equipo de desarrollo

---

**¡Éxito con tu análisis predictivo! 🚀**
