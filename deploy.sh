#!/bin/bash

echo "🚀 Preparando despliegue de TecPlin Backend..."

# Verificar que estemos en la rama correcta
BRANCH=$(git branch --show-current)
echo "📍 Rama actual: $BRANCH"

if [ "$BRANCH" != "main" ]; then
    echo "⚠️  Cambiando a rama main..."
    git checkout main
fi

# Verificar que no haya cambios sin commitear
if [ -n "$(git status --porcelain)" ]; then
    echo "📝 Hay cambios sin commitear. Commiteando..."
    git add .
    git commit -m "Preparar para despliegue - $(date '+%Y-%m-%d %H:%M:%S')"
fi

# Verificar que el build funcione
echo "🔨 Verificando build..."
npm run build

if [ $? -eq 0 ]; then
    echo "✅ Build exitoso"
else
    echo "❌ Error en build. Abortando despliegue."
    exit 1
fi

# Push a GitHub
echo "📤 Subiendo cambios a GitHub..."
git push origin main

if [ $? -eq 0 ]; then
    echo "✅ Cambios subidos exitosamente"
    echo ""
    echo "🎉 ¡Listo para desplegar en Render!"
    echo ""
    echo "📋 Próximos pasos:"
    echo "1. Ve a https://render.com"
    echo "2. Crea un nuevo Web Service"
    echo "3. Conecta este repositorio"
    echo "4. Configura las variables de entorno"
    echo "5. ¡Despliega!"
    echo ""
    echo "📖 Guía completa: DEPLOY_RENDER.md"
else
    echo "❌ Error al subir cambios"
    exit 1
fi
