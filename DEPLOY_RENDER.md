# 🚀 Despliegue en Render.com - TecPlin Backend

## 📋 Pasos para Desplegar

### 1. Preparar el Repositorio
```bash
# Asegúrate de que todos los cambios estén committeados
git add .
git commit -m "Preparar para despliegue en Render"
git push origin main
```

### 1.1 Paso a paso
1. `git add .`
2. `git commit -m "feat: despliegue render + storage"`
3. `git push origin main`
4. Entrar a Render → servicio backend → "Manual Deploy" → "Deploy latest commit".
5. Revisar logs en Render para confirmar arranque (`storage` inicializado, `Nest application successfully started`).

### 2. Crear Cuenta en Render
1. Ve a [render.com](https://render.com)
2. Regístrate con GitHub
3. Conecta tu repositorio `backend-tecplin`

### 3. Crear Base de Datos PostgreSQL
1. En Render Dashboard → "New" → "PostgreSQL"
2. **Name**: `tecplin-db`
3. **Database Name**: `tecplin`
4. **User**: `tecplin_user`
5. **Plan**: Free
6. Clic en "Create Database"
7. **¡IMPORTANTE!** Copia la "External Database URL" que aparece

### 4. Crear Web Service
1. En Render Dashboard → "New" → "Web Service"
2. Conecta tu repositorio GitHub `backend-tecplin`
3. Configurar:
   - **Name**: `backend-tecplin`
   - **Runtime**: `Node`
   - **Build Command**: `npm install && npx prisma generate && npm run build`
   - **Start Command**: `npm run start:prod`
   - **Plan**: Free

### 5. Configurar Variables de Entorno
En la sección "Environment Variables":

#### Variables Obligatorias:
```
NODE_ENV=production
PORT=10000
DATABASE_URL=[Pegar la URL de la base de datos del paso 3]
JWT_SECRET=[Generar un string aleatorio de 32+ caracteres]
```

#### Variables Opcionales (para IA):
```
GEMINI_API_KEY=[Tu API key de Google Gemini]
GROQ_API_KEY=[Tu API key de Groq]
EMAIL_HOST=smtp.ethereal.email
EMAIL_PORT=587
EMAIL_USER=[Tu usuario de Ethereal]
EMAIL_PASS=[Tu password de Ethereal]
```

#### Variables de Storage (Cloudflare R2)
```
STORAGE_BUCKET=tecplin-evidencias
STORAGE_ACCOUNT_ID=[Tu ID de cuenta de Cloudflare]
STORAGE_ENDPOINT=[Tu endpoint de Cloudflare]
STORAGE_PUBLIC_URL=[Tu URL pública de Cloudflare]
STORAGE_REGION=[Tu región de Cloudflare]
STORAGE_ACCESS_KEY=[Tu access key de Cloudflare]
STORAGE_SECRET_KEY=[Tu secret key de Cloudflare]
```

### 6. Desplegar
1. Clic en "Create Web Service"
2. Render automáticamente:
   - Clona tu repositorio
   - Instala dependencias
   - Genera Prisma Client
   - Construye la aplicación
   - Ejecuta migraciones de base de datos
   - Inicia el servidor

### 7. Verificar Despliegue
Una vez completado, tu API estará disponible en:
```
https://backend-tecplin.onrender.com
```

Endpoints para probar:
- `GET /health` - Health check
- `GET /api/docs` - Documentación Swagger
- `POST /auth/login` - Login

## 🔧 Configuración Adicional

### Dominio Personalizado (Opcional)
1. En Render Dashboard → Tu servicio → "Settings"
2. Sección "Custom Domains"
3. Agregar: `api.tecplin.com`
4. Configurar DNS en tu proveedor

### Monitoreo
- Render proporciona logs automáticos
- Métricas de CPU/memoria
- Alertas por email

### Actualizaciones
Render se actualiza automáticamente cuando haces push a `main`:
```bash
git add .
git commit -m "Actualización"
git push origin main
```

## 📱 Actualizar App Móvil

Después del despliegue, actualiza la URL en tu app React Native:

```javascript
// En tu archivo de configuración
const API_URL = __DEV__ 
  ? 'http://localhost:3000' 
  : 'https://backend-tecplin.onrender.com';
```

## ⚠️ Limitaciones del Plan Free

- **Sleep**: La app se duerme después de 15 minutos de inactividad
- **Tiempo de arranque**: ~30 segundos para despertar
- **Recursos**: 512MB RAM, 0.1 CPU
- **Horas**: 750 horas/mes (suficiente para uso continuo)

## 🆙 Upgrade a Plan Pagado

Para producción real, considera el plan Starter ($7/mes):
- Sin sleep
- Más recursos
- SSL automático
- Mejor rendimiento

## 🐛 Troubleshooting

### Error de Build
```bash
# Verificar localmente
npm install
npx prisma generate
npm run build
npm run start:prod
```

### Error de Base de Datos
- Verificar que DATABASE_URL esté correcta
- Comprobar que la base de datos esté activa
- Revisar logs en Render Dashboard

### Error de Variables de Entorno
- Verificar que todas las variables obligatorias estén configuradas
- JWT_SECRET debe tener al menos 32 caracteres
- NODE_ENV debe ser "production"

## 📞 Soporte

Si tienes problemas:
1. Revisa los logs en Render Dashboard
2. Verifica la configuración paso a paso
3. Prueba el build localmente primero
