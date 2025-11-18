export type Intent =
  | 'CREAR_ORDEN'
  | 'VER_ORDENES'
  | 'MODIFICAR_ORDEN'
  | 'CANCELAR_ORDEN'
  | 'CAMBIAR_PRIORIDAD'
  | 'CONSULTAR_ESTADO'
  | 'ASIGNAR_TECNICO'
  | 'APROBAR_ORDEN'
  | 'CERRAR_ORDEN'
  | 'SALUDO'
  | 'DESCONOCIDO';

export type NLUResult = {
  intent: Intent;
  slots: Record<string, any>;
};

export interface OrdenData {
  ordenId?: number;
  descripcion?: string;
  prioridad?: 'BAJA' | 'MEDIA' | 'ALTA';
  ubicacion?: string;
  tipoProblema?: string;
  especialidadRequerida?: string;
  tecnicoId?: number;
  nuevoEstado?: string;
}
