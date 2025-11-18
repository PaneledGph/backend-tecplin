# Comandos para aplicar la migración

## 1. Generar la migración
```bash
cd c:\ie\proyectos\backend-tecplin
npx prisma migrate dev --name expand_orden_fields
```

## 2. Generar el cliente de Prisma
```bash
npx prisma generate
```

## 3. Reiniciar el servidor
```bash
npm run start:dev
```

## Campos nuevos agregados a la tabla `orden`:

### Ubicación con coordenadas GPS:
- `ubicacionLatitud` (Float, opcional)
- `ubicacionLongitud` (Float, opcional)

### Información de contacto expandida:
- `nombreContacto` (String, opcional)
- `telefonoContacto` (String, opcional)
- `emailContacto` (String, opcional)

### Detalles del servicio:
- `horarioPreferido` (String, opcional)
- `materialesRequeridos` (Text, opcional)
- `observaciones` (Text, opcional)

### Imágenes:
- `imagenes` (Array de Strings, URLs de imágenes)

### Costos y tiempos:
- `costoEstimado` (Float, opcional)
- `costoFinal` (Float, opcional)
- `tiempoEstimadoHoras` (Int, opcional)
