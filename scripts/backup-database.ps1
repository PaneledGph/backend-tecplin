# Script de Backup de Base de Datos PostgreSQL
# Uso: .\backup-database.ps1

$ErrorActionPreference = "Stop"

# Configuración
$BACKUP_DIR = "backups"
$DATE = Get-Date -Format "yyyyMMdd_HHmmss"
$BACKUP_FILE = "$BACKUP_DIR/tecplin_backup_$DATE.sql"
$RETENTION_DAYS = 30

# Cargar variables de entorno desde .env
if (Test-Path "../.env") {
    Get-Content "../.env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            $key = $matches[1]
            $value = $matches[2]
            [Environment]::SetEnvironmentVariable($key, $value, "Process")
        }
    }
}

# Crear directorio de backups si no existe
if (!(Test-Path $BACKUP_DIR)) {
    New-Item -ItemType Directory -Path $BACKUP_DIR | Out-Null
}

Write-Host "🔄 Iniciando backup de base de datos..." -ForegroundColor Cyan
Write-Host "📁 Archivo: $BACKUP_FILE" -ForegroundColor Gray

try {
    # Extraer información de DATABASE_URL
    $DATABASE_URL = $env:DATABASE_URL
    if ($DATABASE_URL -match 'postgresql://([^:]+):([^@]+)@([^:]+):(\d+)/(.+)') {
        $DB_USER = $matches[1]
        $DB_PASSWORD = $matches[2]
        $DB_HOST = $matches[3]
        $DB_PORT = $matches[4]
        $DB_NAME = $matches[5]
    } else {
        throw "No se pudo parsear DATABASE_URL"
    }

    # Configurar password para pg_dump
    $env:PGPASSWORD = $DB_PASSWORD

    # Ejecutar backup
    & pg_dump -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -F p -f $BACKUP_FILE

    if ($LASTEXITCODE -eq 0) {
        $fileSize = (Get-Item $BACKUP_FILE).Length / 1MB
        Write-Host "✅ Backup completado exitosamente!" -ForegroundColor Green
        Write-Host "📊 Tamaño: $([math]::Round($fileSize, 2)) MB" -ForegroundColor Gray
        
        # Comprimir backup
        Write-Host "🗜️ Comprimiendo backup..." -ForegroundColor Cyan
        Compress-Archive -Path $BACKUP_FILE -DestinationPath "$BACKUP_FILE.zip" -Force
        Remove-Item $BACKUP_FILE
        
        $zipSize = (Get-Item "$BACKUP_FILE.zip").Length / 1MB
        Write-Host "✅ Backup comprimido: $([math]::Round($zipSize, 2)) MB" -ForegroundColor Green
        
        # Limpiar backups antiguos
        Write-Host "🧹 Limpiando backups antiguos (>$RETENTION_DAYS días)..." -ForegroundColor Cyan
        $cutoffDate = (Get-Date).AddDays(-$RETENTION_DAYS)
        Get-ChildItem $BACKUP_DIR -Filter "*.zip" | Where-Object {
            $_.LastWriteTime -lt $cutoffDate
        } | ForEach-Object {
            Write-Host "   Eliminando: $($_.Name)" -ForegroundColor Gray
            Remove-Item $_.FullName
        }
        
        Write-Host "✅ Proceso completado!" -ForegroundColor Green
    } else {
        throw "pg_dump falló con código $LASTEXITCODE"
    }
} catch {
    Write-Host "❌ Error durante el backup: $_" -ForegroundColor Red
    exit 1
} finally {
    # Limpiar password del entorno
    $env:PGPASSWORD = $null
}
