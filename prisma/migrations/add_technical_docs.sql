-- Crear tabla para documentos técnicos (RAG)
CREATE TABLE IF NOT EXISTS technical_docs (
  id SERIAL PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  category VARCHAR(50) DEFAULT 'general',
  embedding_text TEXT, -- Por ahora texto, luego migraremos a pgvector
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Índices para búsqueda rápida
CREATE INDEX IF NOT EXISTS idx_technical_docs_title ON technical_docs(title);
CREATE INDEX IF NOT EXISTS idx_technical_docs_category ON technical_docs(category);
CREATE INDEX IF NOT EXISTS idx_technical_docs_content ON technical_docs USING gin(to_tsvector('spanish', content));

-- Insertar algunos documentos técnicos de ejemplo
INSERT INTO technical_docs (title, content, category) VALUES 
('Procedimiento de Seguridad Eléctrica', 'Antes de trabajar en cualquier instalación eléctrica: 1. Cortar la alimentación en el tablero principal. 2. Verificar ausencia de tensión con multímetro. 3. Usar EPP completo (casco, guantes dieléctricos, calzado de seguridad). 4. Señalizar el área de trabajo.', 'seguridad'),

('Diagnóstico de Motores Trifásicos', 'Para diagnosticar un motor trifásico: 1. Verificar voltaje de alimentación (debe estar entre 380-440V). 2. Medir corriente en cada fase (debe ser equilibrada ±5%). 3. Revisar conexiones en bornera. 4. Verificar resistencia de aislamiento (>1MΩ). 5. Comprobar rodamientos por ruido o vibración.', 'motores'),

('Mantenimiento de Tableros Eléctricos', 'Mantenimiento preventivo de tableros: 1. Limpieza con aire comprimido seco. 2. Ajuste de conexiones con torquímetro. 3. Verificación de protecciones (relés, fusibles). 4. Medición de temperatura en puntos críticos. 5. Prueba de funcionamiento de contactores.', 'tableros'),

('Instalación de Variadores de Frecuencia', 'Pasos para instalar variador: 1. Verificar compatibilidad con motor. 2. Instalar filtros de entrada y salida. 3. Conectar según diagrama (R,S,T entrada - U,V,W salida). 4. Configurar parámetros básicos (frecuencia, rampa). 5. Realizar prueba en vacío antes de conectar carga.', 'variadores'),

('Puesta a Tierra de Equipos', 'Sistema de puesta a tierra: 1. Resistencia máxima 25Ω para equipos industriales. 2. Usar conductor de cobre desnudo mínimo 16mm². 3. Conexión con soldadura exotérmica o conector mecánico. 4. Medir resistencia con telurómetro. 5. Documentar mediciones en protocolo.', 'puesta_tierra');
