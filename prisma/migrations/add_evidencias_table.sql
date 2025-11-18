-- Crear tabla para almacenar evidencias fotográficas
CREATE TABLE IF NOT EXISTS evidencia (
    id SERIAL PRIMARY KEY,
    ordenid INTEGER NOT NULL REFERENCES orden(id) ON DELETE CASCADE,
    filename VARCHAR(255) NOT NULL,
    filepath TEXT NOT NULL,
    mimetype VARCHAR(100),
    size INTEGER,
    userid VARCHAR(100),
    userrole VARCHAR(50),
    username VARCHAR(255),
    timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índice para búsquedas rápidas por orden
CREATE INDEX IF NOT EXISTS idx_evidencia_ordenid ON evidencia(ordenid);

-- Índice para búsquedas por timestamp
CREATE INDEX IF NOT EXISTS idx_evidencia_timestamp ON evidencia(timestamp);
