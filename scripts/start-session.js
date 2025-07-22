#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script de inicio de sesión para NEXUS AI Studio
 * Automatiza la carga del contexto y verificación del estado del proyecto
 */

function startSession() {
  console.log('🚀 Iniciando nueva sesión de desarrollo...');
  console.log('=' .repeat(50));
  
  const sessionId = `session-${new Date().toISOString().split('T')[0]}-${Date.now()}`;
  const timestamp = new Date().toISOString();
  
  try {
    // Verificar estructura del proyecto
    verifyProjectStructure();
    
    // Cargar contexto anterior
    const previousContext = loadPreviousContext();
    
    // Obtener estado de Git
    const gitStatus = getGitStatus();
    
    // Crear archivo de sesión actual
    const sessionData = {
      id: sessionId,
      startTime: timestamp,
      objectives: [],
      context: previousContext,
      gitStatus: gitStatus,
      projectState: loadProjectState(),
      contextLinks: loadContextLinks()
    };
    
    // Guardar sesión actual
    saveCurrentSession(sessionData);
    
    // Mostrar resumen del estado
    displaySessionSummary(sessionData);
    
    // Verificar integridad del proyecto
    console.log('\n🔍 Verificando integridad del proyecto...');
    try {
      // Verificar que npm esté disponible
      execSync('npm --version', { stdio: 'pipe' });
      
      // Verificar dependencias
      if (fs.existsSync('package.json')) {
        console.log('✅ package.json encontrado');
        
        // Verificar node_modules
        if (!fs.existsSync('node_modules')) {
          console.log('⚠️  node_modules no encontrado, ejecutando npm install...');
          execSync('npm install', { stdio: 'inherit' });
        } else {
          console.log('✅ node_modules verificado');
        }
      }
      
      console.log('✅ Integridad del proyecto verificada');
    } catch (error) {
      console.warn('⚠️  No se pudo verificar completamente la integridad:', error.message);
    }
    
    // Sugerir próximos pasos
    suggestNextSteps(previousContext);
    
    console.log('\n🎯 Sesión iniciada exitosamente!');
    console.log(`📋 ID de sesión: ${sessionId}`);
    console.log('💡 Usa "npm run session:end" para finalizar la sesión');
    
  } catch (error) {
    console.error('❌ Error al iniciar sesión:', error.message);
    process.exit(1);
  }
}

function verifyProjectStructure() {
  const requiredDirs = [
    'project-state',
    'project-state/reports',
    'scripts'
  ];
  
  const optionalDirs = [
    'src',
    'src/components',
    'src/components/ui',
    'src/components/layout',
    'src/components/project'
  ];
  
  console.log('📁 Verificando estructura del proyecto...');
  
  // Verificar directorios requeridos
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      console.log(`📁 Creando directorio requerido: ${dir}`);
      fs.mkdirSync(dir, { recursive: true });
    }
  });
  
  // Verificar directorios opcionales
  optionalDirs.forEach(dir => {
    if (fs.existsSync(dir)) {
      console.log(`✅ ${dir}`);
    } else {
      console.log(`⚠️  ${dir} (opcional, no encontrado)`);
    }
  });
}

function loadPreviousContext() {
  try {
    const memoryPath = 'project-state/session-memory.json';
    if (!fs.existsSync(memoryPath)) {
      console.log('📝 No se encontró memoria de sesiones anteriores');
      return {};
    }
    
    const memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    const lastSession = memory.sessions[memory.sessions.length - 1];
    
    if (lastSession && lastSession.nextSession) {
      console.log('🧠 Contexto anterior cargado:');
      console.log(`   Prioridad: ${lastSession.nextSession.priority}`);
      console.log(`   Contexto: ${lastSession.nextSession.context}`);
      return lastSession.nextSession;
    }
    
    return {};
  } catch (error) {
    console.warn('⚠️  Error cargando contexto anterior:', error.message);
    return {};
  }
}

function getGitStatus() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    const hasChanges = status.length > 0;
    
    console.log('📊 Estado de Git:');
    console.log(`   Branch: ${branch}`);
    console.log(`   Último commit: ${lastCommit}`);
    console.log(`   Cambios pendientes: ${hasChanges ? 'Sí' : 'No'}`);
    
    return { branch, lastCommit, hasChanges, status };
  } catch (error) {
    console.warn('⚠️  No es un repositorio Git o Git no está disponible');
    return { error: 'Git no disponible' };
  }
}

function loadProjectState() {
  try {
    const statePath = 'project-state/project-dashboard.json';
    if (fs.existsSync(statePath)) {
      return JSON.parse(fs.readFileSync(statePath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Error cargando estado del proyecto:', error.message);
  }
  return null;
}

function loadContextLinks() {
  try {
    const linksPath = 'project-state/context-links.json';
    if (fs.existsSync(linksPath)) {
      return JSON.parse(fs.readFileSync(linksPath, 'utf8'));
    }
  } catch (error) {
    console.warn('⚠️  Error cargando enlaces de contexto:', error.message);
  }
  return null;
}

function saveCurrentSession(sessionData) {
  const sessionPath = 'project-state/CURRENT_SESSION.json';
  fs.writeFileSync(sessionPath, JSON.stringify(sessionData, null, 2));
  console.log('💾 Sesión actual guardada');
}

function displaySessionSummary(sessionData) {
  console.log('\n📊 Resumen del estado actual:');
  console.log('=' .repeat(40));
  
  // Estado del proyecto
  if (sessionData.projectState) {
    const state = sessionData.projectState;
    console.log(`🏗️  Arquitectura:`);
    console.log(`   Componentes core: ${state.architecture?.coreComponents || 'N/A'}`);
    console.log(`   Análisis completado: ${state.architecture?.analysisProgress?.percentage || 'N/A'}%`);
    
    console.log(`🧪 Calidad del código:`);
    console.log(`   Cobertura de tests: ${state.codeQuality?.testCoverage || 0}%`);
    console.log(`   Errores ESLint: ${state.codeQuality?.eslintErrors || 0}`);
  }
  
  // Enlaces de contexto
  if (sessionData.contextLinks) {
    const links = sessionData.contextLinks;
    console.log(`🧩 Componentes:`);
    console.log(`   Total implementados: ${links.metadata?.totalComponents || 0}`);
    console.log(`   Contextos: ${links.metadata?.totalContexts || 0}`);
    console.log(`   Hooks: ${links.metadata?.totalHooks || 0}`);
  }
  
  // Estado de Git
  if (sessionData.gitStatus && !sessionData.gitStatus.error) {
    console.log(`📝 Git:`);
    console.log(`   Branch: ${sessionData.gitStatus.branch}`);
    console.log(`   Cambios: ${sessionData.gitStatus.hasChanges ? 'Pendientes' : 'Limpios'}`);
  }
}

function suggestNextSteps(previousContext) {
  console.log('\n💡 Sugerencias para esta sesión:');
  console.log('=' .repeat(40));
  
  if (previousContext.priority) {
    console.log(`🎯 Prioridad: ${previousContext.priority}`);
  }
  
  if (previousContext.suggestedTasks && previousContext.suggestedTasks.length > 0) {
    console.log('📋 Tareas sugeridas:');
    previousContext.suggestedTasks.forEach((task, index) => {
      console.log(`   ${index + 1}. ${task}`);
    });
  } else {
    // Sugerencias por defecto basadas en el estado del proyecto
    console.log('📋 Tareas generales sugeridas:');
    console.log('   1. Revisar componentes pendientes de implementación');
    console.log('   2. Añadir tests unitarios a componentes existentes');
    console.log('   3. Completar documentación de componentes');
    console.log('   4. Verificar y optimizar arquitectura');
    console.log('   5. Revisar y actualizar dependencias');
  }
}

// Ejecutar script
if (require.main === module) {
  startSession();
}

module.exports = { startSession };