# Script de Restauración de Base de Datos PostgreSQL
# Uso: .\restore-database.ps1 <archivo_backup.zip>

param(
    [Parameter(Mandatory=$true)]
    [string]$BackupFile
)

$ErrorActionPreference = "Stop"

if (!(Test-Path $BackupFile)) {
    Write-Host "❌ Archivo no encontrado: $BackupFile" -ForegroundColor Red
    exit 1
}

# Cargar variables de entorno
if (Test-Path "../.env") {
    Get-Content "../.env" | ForEach-Object {
        if ($_ -match '^([^=]+)=(.*)$') {
            [Environment]::SetEnvironmentVariable($matches[1], $matches[2], "Process")
        }
    }
}

Write-Host "🔄 Iniciando restauración de base de datos..." -ForegroundColor Cyan
Write-Host "📁 Desde: $BackupFile" -ForegroundColor Gray

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

    # Descomprimir backup
    Write-Host "📦 Descomprimiendo backup..." -ForegroundColor Cyan
    $tempDir = "temp_restore"
    if (Test-Path $tempDir) {
        Remove-Item $tempDir -Recurse -Force
    }
    Expand-Archive -Path $BackupFile -DestinationPath $tempDir
    $sqlFile = Get-ChildItem $tempDir -Filter "*.sql" | Select-Object -First 1

    if (!$sqlFile) {
        throw "No se encontró archivo SQL en el backup"
    }

    Write-Host "⚠️ ADVERTENCIA: Esto eliminará todos los datos actuales!" -ForegroundColor Yellow
    $confirm = Read-Host "¿Continuar? (yes/no)"
    
    if ($confirm -ne "yes") {
        Write-Host "❌ Restauración cancelada" -ForegroundColor Red
        exit 0
    }

    # Configurar password
    $env:PGPASSWORD = $DB_PASSWORD

    # Restaurar
    Write-Host "🔄 Restaurando base de datos..." -ForegroundColor Cyan
    & psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f $sqlFile.FullName

    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Restauración completada exitosamente!" -ForegroundColor Green
    } else {
        throw "psql falló con código $LASTEXITCODE"
    }

    # Limpiar
    Remove-Item $tempDir -Recurse -Force

} catch {
    Write-Host "❌ Error durante la restauración: $_" -ForegroundColor Red
    exit 1
} finally {
    $env:PGPASSWORD = $null
}
