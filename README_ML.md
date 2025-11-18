# 🤖 Sistema de Análisis Predictivo - TecPlin

## 🚀 Inicio Rápido

### 1. Generar Datos y Entrenar Modelos

```bash
npm run ml:setup
```

Este comando ejecuta automáticamente:
1. **Generación de datos** - 1,200+ órdenes y 5,000+ lecturas de sensores
2. **Entrenamiento de modelos** - 4 modelos de ML con regresión lineal

### 2. Iniciar el Backend

```bash
npm run start:dev
```

### 3. Probar los Endpoints

```bash
# Ver insights completos
curl http://localhost:3000/api/analytics/insights

# Predicción de demanda (próximos 7 días)
curl http://localhost:3000/api/analytics/demand-forecast?days=7

# Predecir tiempo de servicio
curl -X POST http://localhost:3000/api/analytics/predict-service-time ^
  -H "Content-Type: application/json" ^
  -d "{\"tipoProblema\":\"Fuga de agua\",\"especialidad\":\"Plomería\",\"prioridad\":\"ALTA\"}"

# Predecir satisfacción del cliente
curl http://localhost:3000/api/analytics/predict-satisfaction/1

# Detectar anomalías en sensores
curl http://localhost:3000/api/analytics/sensor-anomalies

# Eficiencia de técnicos
curl http://localhost:3000/api/analytics/technician-efficiency
```

---

## 📊 Modelos Implementados

### 1. Predicción de Demanda 📈
- **Objetivo**: Predecir cuántas órdenes se recibirán
- **Uso**: Planificación de recursos, contratación
- **Algoritmo**: Regresión lineal

### 2. Predicción de Tiempo de Servicio ⏱️
- **Objetivo**: Estimar duración de servicios
- **Uso**: Estimaciones precisas, optimización de agenda
- **Algoritmo**: Regresión lineal multivariable

### 3. Predicción de Satisfacción ⭐
- **Objetivo**: Predecir calificación del cliente (1-5)
- **Uso**: Identificar servicios en riesgo
- **Algoritmo**: Regresión lineal con clasificación

### 4. Detección de Anomalías 🚨
- **Objetivo**: Identificar lecturas anómalas en sensores
- **Uso**: Mantenimiento predictivo
- **Algoritmo**: Análisis estadístico (media + 2σ)

---

## 📁 Estructura de Archivos

```
backend-tecplin/
├── scripts/
│   ├── seed-analytics-data.js      # Genera datos de prueba
│   └── train-ml-models.js          # Entrena modelos de ML
├── src/
│   └── ml/
│       ├── ml-integration.service.ts    # Lógica de ML
│       ├── ml-integration.controller.ts # Endpoints API
│       └── ml-integration.module.ts     # Módulo NestJS
├── ml_models/                      # Modelos entrenados
│   ├── demand_model.json
│   ├── service_time_model.json
│   ├── satisfaction_model.json
│   ├── anomalies.json
│   └── insights.json
└── README_ML.md                    # Esta guía
```

---

## 🔄 Comandos NPM

```bash
# Generar solo datos
npm run seed:analytics

# Entrenar solo modelos
npm run train:ml

# Todo en uno (generar + entrenar)
npm run ml:setup

# Iniciar backend
npm run start:dev
```

---

## 📊 Ejemplo de Respuesta

### GET /api/analytics/insights

```json
{
  "timestamp": "2024-11-09T19:00:00.000Z",
  "resumen": {
    "ordenes": {
      "total": 1209,
      "completadas": 1197,
      "pendientes": 12,
      "tasa_completado": 99
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
    "especialidad_mas_demandada": "Electricidad"
  },
  "predicciones": {
    "demanda": {
      "forecast": [
        { "fecha": "2024-11-10", "demanda_predicha": 15, "dia_semana": "Dom" },
        { "fecha": "2024-11-11", "demanda_predicha": 12, "dia_semana": "Lun" }
      ],
      "resumen": {
        "demanda_promedio": 13,
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
      "tipo": "MANTENIMIENTO",
      "prioridad": "ALTA",
      "mensaje": "2 sensores con anomalías detectadas",
      "accion": "Programar mantenimiento preventivo"
    }
  ]
}
```

---

## 💡 Ventajas del Sistema

- ✅ **Sin Python** - Todo en JavaScript/Node.js
- ✅ **Fácil instalación** - Sin dependencias complejas
- ✅ **Modelos funcionales** - Regresión lineal optimizada
- ✅ **Listo para producción** - Código limpio y documentado
- ✅ **Insights en tiempo real** - Basados en datos reales
- ✅ **Compatible con Windows** - Sin problemas de compilación

---

## 🔄 Reentrenamiento

Para mantener los modelos actualizados:

```bash
# Reentrenar con datos existentes
npm run train:ml

# Regenerar datos y reentrenar
npm run ml:setup
```

**Recomendación**: Reentrenar semanalmente con datos reales.

---

## 🐛 Troubleshooting

### Error: "No hay suficientes datos"
```bash
npm run seed:analytics
```

### Error: "Cannot GET /api/analytics/insights"
Verifica que el módulo esté importado en `src/app.module.ts`:
```typescript
import { MLIntegrationModule } from './ml/ml-integration.module';
```

### Los modelos no son precisos
- Genera más datos (modifica CONFIG en `seed-analytics-data.js`)
- Reentrenar con datos reales de producción
- Ajustar parámetros de los modelos

---

## 📚 Documentación Adicional

- [Guía Completa](./GUIA_ANALISIS_PREDICTIVO.md)
- [Ejemplos de Uso](./EJEMPLO_USO_RAPIDO.md)
- [Resumen Ejecutivo](./RESUMEN_ANALISIS_PREDICTIVO.md)

---

## 🎯 Próximos Pasos

1. ✅ Datos generados
2. ✅ Modelos entrenados
3. ✅ API funcionando
4. ⏳ Crear dashboard de visualización
5. ⏳ Integrar con app móvil
6. ⏳ Configurar reentrenamiento automático

---

**¡Tu sistema de análisis predictivo está listo! 🚀**
