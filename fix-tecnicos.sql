-- Script para crear registros de técnicos faltantes
-- Ejecutar en PostgreSQL

-- 1. Ver usuarios con rol TECNICO que no tienen registro en la tabla tecnico
SELECT u.id, u.usuario, u.rol
FROM usuario u
LEFT JOIN tecnico t ON t.usuarioid = u.id
WHERE u.rol = 'TECNICO' AND t.id IS NULL;

-- 2. Crear registros de técnico para usuarios que no lo tienen
-- IMPORTANTE: Ajusta los valores según tus necesidades

-- Para el usuario con id=5 (tecnico2)
INSERT INTO tecnico (nombre, especialidad, disponibilidad, usuarioid)
VALUES ('Técnico 2', 'Electricidad', 'DISPONIBLE', 5)
ON CONFLICT (usuarioid) DO NOTHING;

-- Si tienes más técnicos sin registro, agrégalos aquí:
-- INSERT INTO tecnico (nombre, especialidad, disponibilidad, usuarioid)
-- VALUES ('Nombre Técnico', 'Especialidad', 'DISPONIBLE', ID_USUARIO)
-- ON CONFLICT (usuarioid) DO NOTHING;

-- 3. Verificar que se crearon correctamente
SELECT t.id, t.nombre, t.especialidad, t.disponibilidad, u.usuario, u.rol
FROM tecnico t
JOIN usuario u ON u.id = t.usuarioid
WHERE u.rol = 'TECNICO';
