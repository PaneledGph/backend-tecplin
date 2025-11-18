-- Agregar campos de calificación a la tabla orden
ALTER TABLE orden ADD COLUMN IF NOT EXISTS calificacion INTEGER;
ALTER TABLE orden ADD COLUMN IF NOT EXISTS comentario_calificacion TEXT;

-- Agregar restricción para que la calificación esté entre 1 y 5
ALTER TABLE orden ADD CONSTRAINT calificacion_check CHECK (calificacion >= 1 AND calificacion <= 5);
