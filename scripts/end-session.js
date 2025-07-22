#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import readline from 'readline';
import { execSync } from 'child_process';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script de finalización de sesión para NEXUS AI Studio
 * Recopila información de la sesión y prepara contexto para la próxima
 */

async function endSession() {
  console.log('💾 Finalizando sesión de desarrollo...');
  console.log('=' .repeat(50));
  
  try {
    // Cargar sesión actual
    const currentSession = loadCurrentSession();
    if (!currentSession) {
      console.error('❌ No se encontró sesión activa');
      process.exit(1);
    }
    
    console.log(`📋 Sesión activa: ${currentSession.id}`);
    console.log(`⏰ Iniciada: ${new Date(currentSession.startTime).toLocaleString()}`);
    
    // Crear interfaz de readline
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    // Recopilar información de cierre
    console.log('\n📝 Recopilando información de la sesión...');
    
    const objectives = await askQuestion(rl, '🎯 ¿Cuáles fueron los objetivos principales de esta sesión? ');
    const completed = await askQuestion(rl, '✅ ¿Qué objetivos/tareas se completaron? (separados por comas) ');
    const pending = await askQuestion(rl, '⏳ ¿Qué quedó pendiente? (separados por comas) ');
    const decisions = await askQuestion(rl, '🧠 ¿Qué decisiones importantes se tomaron? ');
    const challenges = await askQuestion(rl, '🚧 ¿Qué desafíos o problemas se encontraron? ');
    const nextPriority = await askQuestion(rl, '🎯 ¿Cuál es la prioridad para la próxima sesión? ');
    const nextContext = await askQuestion(rl, '📝 Contexto adicional para la próxima sesión: ');
    
    rl.close();
    
    // Obtener estado final de Git
    const finalGitStatus = getGitStatus();
    
    // Calcular métricas de la sesión
    const metrics = calculateSessionMetrics(currentSession, finalGitStatus);
    
    // Actualizar sesión con información de cierre
    const completedSession = {
      ...currentSession,
      endTime: new Date().toISOString(),
      objectives: objectives.split(',').map(s => s.trim()).filter(s => s),
      completed: completed.split(',').map(s => s.trim()).filter(s => s),
      pending: pending.split(',').map(s => s.trim()).filter(s => s),
      decisions: decisions ? [{
        decision: decisions,
        timestamp: new Date().toISOString(),
        impact: 'To be evaluated'
      }] : [],
      challenges: challenges ? challenges.split(',').map(s => s.trim()).filter(s => s) : [],
      nextSession: {
        priority: nextPriority || 'Continuar desarrollo',
        context: nextContext || `Continuar desde: ${pending}`,
        suggestedTasks: generateSuggestedTasks(pending, nextPriority)
      },
      finalGitStatus: finalGitStatus,
      metrics: metrics
    };
    
    // Actualizar memoria de sesión
    updateSessionMemory(completedSession);
    
    // Generar reporte de sesión
    generateSessionReport(completedSession);
    
    // Actualizar estado del proyecto
    updateProjectState(completedSession);
    
    // Limpiar sesión actual
    cleanupCurrentSession();
    
    // Mostrar resumen final
    displaySessionSummary(completedSession);
    
    console.log('\n✅ Sesión finalizada exitosamente');
    console.log('📋 Contexto preparado para próxima sesión');
    console.log('💡 Usa "npm run session:start" para iniciar una nueva sesión');
    
  } catch (error) {
    console.error('❌ Error al finalizar sesión:', error.message);
    process.exit(1);
  }
}

function loadCurrentSession() {
  try {
    const sessionPath = 'project-state/CURRENT_SESSION.json';
    if (!fs.existsSync(sessionPath)) {
      return null;
    }
    return JSON.parse(fs.readFileSync(sessionPath, 'utf8'));
  } catch (error) {
    console.error('Error cargando sesión actual:', error.message);
    return null;
  }
}

function askQuestion(rl, question) {
  return new Promise(resolve => {
    rl.question(question, answer => resolve(answer || ''));
  });
}

function getGitStatus() {
  try {
    const branch = execSync('git branch --show-current', { encoding: 'utf8' }).trim();
    const lastCommit = execSync('git log -1 --oneline', { encoding: 'utf8' }).trim();
    const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();
    const hasChanges = status.length > 0;
    
    // Obtener estadísticas de commits desde el inicio de la sesión
    let commitsInSession = 0;
    try {
      const sessionStart = new Date().toISOString().split('T')[0]; // Aproximación
      const commits = execSync(`git log --since="${sessionStart}" --oneline`, { encoding: 'utf8' });
      commitsInSession = commits.trim().split('\n').filter(line => line.trim()).length;
    } catch {
      // Ignorar errores en el conteo de commits
    }
    
    return { branch, lastCommit, hasChanges, status, commitsInSession };
  } catch (error) {
    return { error: 'Git no disponible' };
  }
}

function calculateSessionMetrics(session, finalGitStatus) {
  const startTime = new Date(session.startTime);
  const endTime = new Date();
  const duration = Math.round((endTime - startTime) / (1000 * 60)); // minutos
  
  return {
    duration: `${duration} minutos`,
    startTime: session.startTime,
    endTime: endTime.toISOString(),
    commitsCreated: finalGitStatus.commitsInSession || 0,
    filesChanged: finalGitStatus.status ? finalGitStatus.status.split('\n').length : 0,
    productivity: duration > 0 ? (duration < 30 ? 'quick' : duration < 120 ? 'normal' : 'extended') : 'unknown'
  };
}

function generateSuggestedTasks(pending, priority) {
  const tasks = [];
  
  if (priority) {
    tasks.push(`Prioridad: ${priority}`);
  }
  
  if (pending && pending.length > 0) {
    pending.forEach(item => {
      if (item.trim()) {
        tasks.push(`Completar: ${item.trim()}`);
      }
    });
  }
  
  // Tareas generales si no hay específicas
  if (tasks.length === 0) {
    tasks.push(
      'Revisar componentes pendientes',
      'Añadir tests unitarios',
      'Actualizar documentación',
      'Verificar arquitectura'
    );
  }
  
  return tasks.slice(0, 5); // Máximo 5 tareas
}

function updateSessionMemory(sessionData) {
  try {
    let memory;
    const memoryPath = 'project-state/session-memory.json';
    
    if (fs.existsSync(memoryPath)) {
      memory = JSON.parse(fs.readFileSync(memoryPath, 'utf8'));
    } else {
      memory = { sessions: [] };
    }
    
    // Añadir nueva sesión
    memory.sessions.push(sessionData);
    
    // Mantener solo las últimas 10 sesiones
    if (memory.sessions.length > 10) {
      memory.sessions = memory.sessions.slice(-10);
    }
    
    // Actualizar resumen
    memory.summary = {
      totalSessions: memory.sessions.length,
      totalObjectivesCompleted: memory.sessions.reduce((acc, s) => acc + (s.completed?.length || 0), 0),
      totalDecisions: memory.sessions.reduce((acc, s) => acc + (s.decisions?.length || 0), 0),
      averageProductivity: calculateAverageProductivity(memory.sessions),
      lastSessionDate: sessionData.endTime.split('T')[0],
      projectCompletionEstimate: estimateProjectCompletion(memory.sessions)
    };
    
    fs.writeFileSync(memoryPath, JSON.stringify(memory, null, 2));
    console.log('💾 Memoria de sesión actualizada');
    
  } catch (error) {
    console.error('Error actualizando memoria de sesión:', error.message);
  }
}

function calculateAverageProductivity(sessions) {
  if (sessions.length === 0) return 'unknown';
  
  const productivityScores = sessions.map(s => {
    const completed = s.completed?.length || 0;
    const duration = s.metrics?.duration ? parseInt(s.metrics.duration) : 60;
    return completed / (duration / 60); // completados por hora
  });
  
  const average = productivityScores.reduce((a, b) => a + b, 0) / productivityScores.length;
  
  if (average > 2) return 'high';
  if (average > 1) return 'medium';
  return 'low';
}

function estimateProjectCompletion(sessions) {
  // Estimación simple basada en el progreso reciente
  const recentSessions = sessions.slice(-3);
  const totalCompleted = recentSessions.reduce((acc, s) => acc + (s.completed?.length || 0), 0);
  const totalPending = recentSessions.reduce((acc, s) => acc + (s.pending?.length || 0), 0);
  
  if (totalCompleted + totalPending === 0) return '90%'; // Valor por defecto
  
  const completionRate = totalCompleted / (totalCompleted + totalPending);
  return Math.round(90 + (completionRate * 10)) + '%'; // Base 90% + progreso
}

function generateSessionReport(session) {
  const reportDir = 'project-state/reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const reportPath = path.join(reportDir, `${session.id}.md`);
  
  const report = `# Reporte de Sesión - ${session.id}

## ⏰ Información Temporal
- **Inicio**: ${new Date(session.startTime).toLocaleString()}
- **Fin**: ${new Date(session.endTime).toLocaleString()}
- **Duración**: ${session.metrics?.duration || 'N/A'}

## 🎯 Objetivos
${session.objectives?.map(obj => `- ${obj}`).join('\n') || '- No especificados'}

## ✅ Completado
${session.completed?.map(item => `- ${item}`).join('\n') || '- Ninguno'}

## ⏳ Pendiente
${session.pending?.map(item => `- ${item}`).join('\n') || '- Ninguno'}

## 🧠 Decisiones Tomadas
${session.decisions?.map(d => `- **${d.decision}** (${new Date(d.timestamp).toLocaleString()})`).join('\n') || '- Ninguna'}

## 🚧 Desafíos Encontrados
${session.challenges?.map(challenge => `- ${challenge}`).join('\n') || '- Ninguno reportado'}

## 📊 Métricas
- **Productividad**: ${session.metrics?.productivity || 'N/A'}
- **Commits creados**: ${session.metrics?.commitsCreated || 0}
- **Archivos modificados**: ${session.metrics?.filesChanged || 0}

## 📝 Estado de Git
${session.finalGitStatus?.error ? `- Error: ${session.finalGitStatus.error}` : `
- **Branch**: ${session.finalGitStatus?.branch || 'N/A'}
- **Último commit**: ${session.finalGitStatus?.lastCommit || 'N/A'}
- **Cambios pendientes**: ${session.finalGitStatus?.hasChanges ? 'Sí' : 'No'}
`}

## 🎯 Próxima Sesión
- **Prioridad**: ${session.nextSession?.priority || 'No definida'}
- **Contexto**: ${session.nextSession?.context || 'No definido'}

### 📋 Tareas Sugeridas
${session.nextSession?.suggestedTasks?.map(task => `- ${task}`).join('\n') || '- No definidas'}

---
*Reporte generado automáticamente el ${new Date().toLocaleString()}*
`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`📄 Reporte generado: ${reportPath}`);
}

function updateProjectState(session) {
  try {
    const statePath = 'project-state/project-dashboard.json';
    let projectState = {};
    
    if (fs.existsSync(statePath)) {
      projectState = JSON.parse(fs.readFileSync(statePath, 'utf8'));
    }
    
    // Actualizar última modificación
    projectState.lastUpdate = new Date().toISOString();
    
    // Actualizar métricas de calidad si hay información
    if (session.completed && session.completed.length > 0) {
      if (!projectState.codeQuality) projectState.codeQuality = {};
      projectState.codeQuality.lastQualityCheck = new Date().toISOString();
    }
    
    // Actualizar sprint si es necesario
    if (!projectState.currentSprint) {
      projectState.currentSprint = {
        number: 1,
        startDate: session.startTime.split('T')[0],
        endDate: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
        goals: session.objectives || []
      };
    }
    
    fs.writeFileSync(statePath, JSON.stringify(projectState, null, 2));
    console.log('📊 Estado del proyecto actualizado');
    
  } catch (error) {
    console.error('Error actualizando estado del proyecto:', error.message);
  }
}

function cleanupCurrentSession() {
  try {
    const sessionPath = 'project-state/CURRENT_SESSION.json';
    if (fs.existsSync(sessionPath)) {
      fs.unlinkSync(sessionPath);
      console.log('🧹 Sesión actual limpiada');
    }
  } catch (error) {
    console.error('Error limpiando sesión actual:', error.message);
  }
}

function displaySessionSummary(session) {
  console.log('\n📊 Resumen de la sesión:');
  console.log('=' .repeat(40));
  console.log(`⏰ Duración: ${session.metrics?.duration || 'N/A'}`);
  console.log(`✅ Completados: ${session.completed?.length || 0} objetivos`);
  console.log(`⏳ Pendientes: ${session.pending?.length || 0} tareas`);
  console.log(`🧠 Decisiones: ${session.decisions?.length || 0}`);
  console.log(`📝 Commits: ${session.metrics?.commitsCreated || 0}`);
  console.log(`📈 Productividad: ${session.metrics?.productivity || 'N/A'}`);
  
  if (session.nextSession?.priority) {
    console.log(`\n🎯 Próxima prioridad: ${session.nextSession.priority}`);
  }
}

// Ejecutar script
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  endSession();
}

export { endSession };