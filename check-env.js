#!/usr/bin/env node

/**
 * Script para verificar las variables de entorno
 * Ejecutar: node check-env.js
 */

require('dotenv').config();

console.log('\n🔍 VERIFICANDO VARIABLES DE ENTORNO...\n');

const required = [
  'DATABASE_URL',
  'JWT_SECRET',
  'JWT_REFRESH_SECRET',
];

const optional = [
  'EMAIL_HOST',
  'EMAIL_USER',
  'EMAIL_PASSWORD',
  'GROQ_API_KEY',
  'GOOGLE_CALENDAR_ID',
  'GOOGLE_CREDENTIALS',
  'WHATSAPP_API_URL',
  'WHATSAPP_PHONE_NUMBER_ID',
  'WHATSAPP_ACCESS_TOKEN',
  'TELEGRAM_BOT_TOKEN',
];

let hasErrors = false;
let warnings = 0;

// Verificar variables requeridas
console.log('📋 VARIABLES REQUERIDAS:\n');
required.forEach((key) => {
  if (process.env[key]) {
    console.log(`✅ ${key}: Configurado`);
  } else {
    console.log(`❌ ${key}: FALTA (REQUERIDO)`);
    hasErrors = true;
  }
});

// Verificar variables opcionales
console.log('\n📋 VARIABLES OPCIONALES:\n');
optional.forEach((key) => {
  if (process.env[key]) {
    console.log(`✅ ${key}: Configurado`);
  } else {
    console.log(`⚠️  ${key}: No configurado (opcional)`);
    warnings++;
  }
});

// Verificaciones especiales
console.log('\n🔍 VERIFICACIONES ESPECIALES:\n');

// JWT Secret length
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.log('⚠️  JWT_SECRET: Debería tener al menos 32 caracteres');
  warnings++;
} else if (process.env.JWT_SECRET) {
  console.log('✅ JWT_SECRET: Longitud adecuada');
}

// Database URL format
if (process.env.DATABASE_URL && !process.env.DATABASE_URL.startsWith('postgresql://')) {
  console.log('⚠️  DATABASE_URL: Debería empezar con postgresql://');
  warnings++;
} else if (process.env.DATABASE_URL) {
  console.log('✅ DATABASE_URL: Formato correcto');
}

// Google Calendar
if (process.env.GOOGLE_CREDENTIALS) {
  try {
    JSON.parse(process.env.GOOGLE_CREDENTIALS);
    console.log('✅ GOOGLE_CREDENTIALS: JSON válido');
  } catch (error) {
    console.log('❌ GOOGLE_CREDENTIALS: JSON inválido');
    hasErrors = true;
  }
} else {
  console.log('ℹ️  Google Calendar: No configurado (el sistema funcionará sin él)');
}

// Groq API Key
if (!process.env.GROQ_API_KEY) {
  console.log('⚠️  GROQ_API_KEY: No configurado (el asistente IA no funcionará)');
  warnings++;
}

// Email
if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
  console.log('ℹ️  Email: No configurado (no se enviarán notificaciones por email)');
}

// Resumen
console.log('\n' + '='.repeat(60));
console.log('📊 RESUMEN:\n');

if (hasErrors) {
  console.log('❌ HAY ERRORES CRÍTICOS - El backend NO funcionará correctamente');
  console.log('   Por favor, configura las variables requeridas en el archivo .env\n');
  process.exit(1);
} else {
  console.log('✅ Todas las variables requeridas están configuradas');
  
  if (warnings > 0) {
    console.log(`⚠️  ${warnings} advertencia(s) - El sistema funcionará pero con funcionalidades limitadas`);
    console.log('   Las integraciones opcionales no estarán disponibles\n');
  } else {
    console.log('🎉 Todas las variables están configuradas correctamente\n');
  }
  
  console.log('✅ El backend puede iniciar correctamente');
  console.log('   Ejecuta: npm run start:dev\n');
  process.exit(0);
}
