import { Intent, NLUResult } from './assistant.types';

// RegEx sencillos para extraer descripción/prioridad
const prioridadMap: Record<string, 'BAJA'|'MEDIA'|'ALTA'> = {
  baja: 'BAJA',
  media: 'MEDIA',
  alta: 'ALTA',
};

export function nlu(texto: string): NLUResult {
  const t = (texto || '').toLowerCase().trim();

  // CREAR_ORDEN
  // ejemplos: "crear orden x", "registra una orden de x prioridad alta"
  if (/(crear|genera|registra)\s+orden/.test(t)) {
    const prMatch = t.match(/\b(prioridad)\s+(baja|media|alta)\b/);
    const prioridad = prMatch ? prioridadMap[prMatch[2]] : 'MEDIA';

    // intenta extraer descripción luego de "orden" o "de"
    let descripcion = t.replace(/.*(crear|genera|registra)\s+orden/i, '').trim();
    if (descripcion.startsWith('de ')) descripcion = descripcion.slice(3);
    if (!descripcion) descripcion = 'Orden sin descripción';

    return { intent: 'CREAR_ORDEN', slots: { descripcion, prioridad } };
  }

  // VER_ORDENES
  if (/\b(mis\s+órdenes|mis\s+ordenes|ver\s+mis\s+órdenes|listar\s+mis)\b/.test(t)) {
    return { intent: 'VER_ORDENES', slots: {} };
  }

  // CONSULTAR_ESTADO
  if (/\b(última|ultima)\s+orden\b/.test(t)) {
    return { intent: 'CONSULTAR_ESTADO', slots: {} };
  }

  // MODIFICAR_ORDEN
  if (/(modificar|cambiar|actualizar)\s+orden/.test(t)) {
    const ordenMatch = t.match(/orden\s+#?(\d+)/);
    const ordenId = ordenMatch ? parseInt(ordenMatch[1]) : undefined;
    return { intent: 'MODIFICAR_ORDEN', slots: { ordenId } };
  }

  // CANCELAR_ORDEN
  if (/(cancelar|anular)\s+orden/.test(t)) {
    const ordenMatch = t.match(/orden\s+#?(\d+)/);
    const ordenId = ordenMatch ? parseInt(ordenMatch[1]) : undefined;
    return { intent: 'CANCELAR_ORDEN', slots: { ordenId } };
  }

  // SALUDO
  if (/\b(hola|buenos|buenas|saludos|hey)\b/.test(t)) {
    return { intent: 'SALUDO', slots: {} };
  }

  return { intent: 'DESCONOCIDO', slots: {} };
}
