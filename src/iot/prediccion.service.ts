import { Injectable } from '@nestjs/common';
import { PrismaService } from 'src/prisma/prisma.service';

export interface PrediccionFallo {
  sensorId: number;
  sensorCodigo: string;
  probabilidadFallo: number; // 0-100
  razon: string;
  recomendacion: string;
  urgencia: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
}

@Injectable()
export class PrediccionService {
  constructor(private prisma: PrismaService) {}

  // -------------------------------------------------------
  // 🔮 PREDECIR FALLOS BASADO EN PATRONES
  // -------------------------------------------------------
  async predecirFallos(): Promise<PrediccionFallo[]> {
    const sensores = await this.prisma.sensor.findMany({
      where: { activo: true },
      include: {
        lecturas: {
          orderBy: { timestamp: 'desc' },
          take: 100, // Últimas 100 lecturas
        },
        alertas: {
          where: { resuelta: false },
        },
      },
    });

    const predicciones: PrediccionFallo[] = [];

    for (const sensor of sensores) {
      const prediccion = await this.analizarSensor(sensor);
      if (prediccion) {
        predicciones.push(prediccion);
      }
    }

    // Ordenar por probabilidad de fallo (mayor a menor)
    return predicciones.sort(
      (a, b) => b.probabilidadFallo - a.probabilidadFallo,
    );
  }

  // -------------------------------------------------------
  // 📊 ANALIZAR SENSOR INDIVIDUAL
  // -------------------------------------------------------
  private async analizarSensor(sensor: any): Promise<PrediccionFallo | null> {
    if (sensor.lecturas.length < 10) {
      return null; // No hay suficientes datos
    }

    let probabilidad = 0;
    const razones: string[] = [];

    // 1. Analizar tendencia de valores
    const valores = sensor.lecturas.map((l) => l.valor);
    const tendencia = this.calcularTendencia(valores);

    if (tendencia === 'CRECIENTE' && sensor.umbralMax) {
      const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
      const margen = (sensor.umbralMax - promedio) / sensor.umbralMax;

      if (margen < 0.1) {
        probabilidad += 40;
        razones.push('Valores cercanos al umbral máximo');
      } else if (margen < 0.2) {
        probabilidad += 25;
        razones.push('Tendencia creciente hacia umbral máximo');
      }
    }

    if (tendencia === 'DECRECIENTE' && sensor.umbralMin) {
      const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
      const margen = (promedio - sensor.umbralMin) / sensor.umbralMin;

      if (margen < 0.1) {
        probabilidad += 40;
        razones.push('Valores cercanos al umbral mínimo');
      } else if (margen < 0.2) {
        probabilidad += 25;
        razones.push('Tendencia decreciente hacia umbral mínimo');
      }
    }

    // 2. Analizar variabilidad (desviación estándar)
    const desviacion = this.calcularDesviacionEstandar(valores);
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const coeficienteVariacion = (desviacion / promedio) * 100;

    if (coeficienteVariacion > 30) {
      probabilidad += 30;
      razones.push('Alta variabilidad en las lecturas');
    } else if (coeficienteVariacion > 20) {
      probabilidad += 15;
      razones.push('Variabilidad moderada en las lecturas');
    }

    // 3. Analizar alertas recientes
    if (sensor.alertas.length > 0) {
      probabilidad += sensor.alertas.length * 10;
      razones.push(`${sensor.alertas.length} alerta(s) activa(s)`);
    }

    // 4. Analizar frecuencia de lecturas fuera de rango
    const lecturasAnormales = valores.filter(
      (v) =>
        (sensor.umbralMax && v > sensor.umbralMax) ||
        (sensor.umbralMin && v < sensor.umbralMin),
    );

    const porcentajeAnormal = (lecturasAnormales.length / valores.length) * 100;

    if (porcentajeAnormal > 20) {
      probabilidad += 35;
      razones.push(
        `${porcentajeAnormal.toFixed(1)}% de lecturas fuera de rango`,
      );
    } else if (porcentajeAnormal > 10) {
      probabilidad += 20;
      razones.push(`${porcentajeAnormal.toFixed(1)}% de lecturas anormales`);
    }

    // 5. Analizar tiempo sin mantenimiento (si existe)
    // Aquí podrías agregar lógica basada en última fecha de mantenimiento

    // Si la probabilidad es muy baja, no retornar predicción
    if (probabilidad < 15) {
      return null;
    }

    // Limitar probabilidad a 100%
    probabilidad = Math.min(probabilidad, 100);

    // Determinar urgencia
    let urgencia: 'BAJA' | 'MEDIA' | 'ALTA' | 'CRITICA';
    if (probabilidad >= 80) urgencia = 'CRITICA';
    else if (probabilidad >= 60) urgencia = 'ALTA';
    else if (probabilidad >= 40) urgencia = 'MEDIA';
    else urgencia = 'BAJA';

    // Generar recomendación
    const recomendacion = this.generarRecomendacion(sensor, urgencia, razones);

    return {
      sensorId: sensor.id,
      sensorCodigo: sensor.codigo,
      probabilidadFallo: Math.round(probabilidad),
      razon: razones.join(', '),
      recomendacion,
      urgencia,
    };
  }

  // -------------------------------------------------------
  // 📈 CALCULAR TENDENCIA
  // -------------------------------------------------------
  private calcularTendencia(
    valores: number[],
  ): 'CRECIENTE' | 'DECRECIENTE' | 'ESTABLE' {
    if (valores.length < 5) return 'ESTABLE';

    const mitad = Math.floor(valores.length / 2);
    const primerasMitad = valores.slice(0, mitad);
    const segundaMitad = valores.slice(mitad);

    const promedioPrimera =
      primerasMitad.reduce((a, b) => a + b, 0) / primerasMitad.length;
    const promedioSegunda =
      segundaMitad.reduce((a, b) => a + b, 0) / segundaMitad.length;

    const diferencia =
      ((promedioSegunda - promedioPrimera) / promedioPrimera) * 100;

    if (diferencia > 5) return 'CRECIENTE';
    if (diferencia < -5) return 'DECRECIENTE';
    return 'ESTABLE';
  }

  // -------------------------------------------------------
  // 📊 CALCULAR DESVIACIÓN ESTÁNDAR
  // -------------------------------------------------------
  private calcularDesviacionEstandar(valores: number[]): number {
    const promedio = valores.reduce((a, b) => a + b, 0) / valores.length;
    const varianza =
      valores.reduce((sum, val) => sum + Math.pow(val - promedio, 2), 0) /
      valores.length;
    return Math.sqrt(varianza);
  }

  // -------------------------------------------------------
  // 💡 GENERAR RECOMENDACIÓN
  // -------------------------------------------------------
  private generarRecomendacion(
    sensor: any,
    urgencia: string,
    razones: string[],
  ): string {
    const recomendaciones = {
      CRITICA: `⚠️ URGENTE: Inspeccionar inmediatamente el sensor ${sensor.codigo}. Riesgo muy alto de fallo.`,
      ALTA: `🔴 Programar mantenimiento preventivo para el sensor ${sensor.codigo} en las próximas 24-48 horas.`,
      MEDIA: `🟡 Monitorear de cerca el sensor ${sensor.codigo}. Considerar mantenimiento preventivo.`,
      BAJA: `🟢 Sensor ${sensor.codigo} requiere atención. Programar revisión de rutina.`,
    };

    return recomendaciones[urgencia] || recomendaciones['BAJA'];
  }

  // -------------------------------------------------------
  // 📊 OBTENER ESTADÍSTICAS DE PREDICCIÓN
  // -------------------------------------------------------
  async obtenerEstadisticas() {
    const predicciones = await this.predecirFallos();

    return {
      totalSensoresAnalizados: predicciones.length,
      criticos: predicciones.filter((p) => p.urgencia === 'CRITICA').length,
      altos: predicciones.filter((p) => p.urgencia === 'ALTA').length,
      medios: predicciones.filter((p) => p.urgencia === 'MEDIA').length,
      bajos: predicciones.filter((p) => p.urgencia === 'BAJA').length,
      probabilidadPromedio:
        predicciones.length > 0
          ? Math.round(
              predicciones.reduce((sum, p) => sum + p.probabilidadFallo, 0) /
                predicciones.length,
            )
          : 0,
    };
  }
}
