#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Script de verificación de arquitectura para NEXUS AI Studio
 * Valida que el código siga los patrones y reglas establecidos
 */

function verifyArchitecture() {
  console.log('🔍 Verificando arquitectura del proyecto NEXUS AI Studio...');
  console.log('=' .repeat(60));
  
  const errors = [];
  const warnings = [];
  const suggestions = [];
  
  try {
    // Verificar estructura de directorios
    console.log('📁 Verificando estructura de directorios...');
    verifyDirectoryStructure(errors, warnings);
    
    // Verificar patrones de naming
    console.log('🏷️  Verificando patrones de naming...');
    verifyNamingPatterns(errors, warnings);
    
    // Verificar imports
    console.log('📦 Verificando patrones de imports...');
    verifyImportPatterns(errors, warnings);
    
    // Verificar documentación de componentes
    console.log('📚 Verificando documentación...');
    verifyComponentDocumentation(warnings, suggestions);
    
    // Verificar patrones de código
    console.log('🧩 Verificando patrones de código...');
    verifyCodePatterns(errors, warnings, suggestions);
    
    // Verificar configuraciones
    console.log('⚙️  Verificando configuraciones...');
    verifyConfigurations(warnings, suggestions);
    
    // Mostrar resultados
    displayResults(errors, warnings, suggestions);
    
    // Generar reporte
    generateVerificationReport(errors, warnings, suggestions);
    
    // Determinar código de salida
    if (errors.length > 0) {
      console.log('\n❌ Verificación fallida - Se encontraron errores críticos');
      process.exit(1);
    } else if (warnings.length > 0) {
      console.log('\n⚠️  Verificación completada con advertencias');
      process.exit(0);
    } else {
      console.log('\n✅ Verificación exitosa - Arquitectura correcta');
      process.exit(0);
    }
    
  } catch (error) {
    console.error('💥 Error durante la verificación:', error.message);
    process.exit(1);
  }
}

function verifyDirectoryStructure(errors, warnings) {
  const requiredDirs = [
    'src',
    'project-state',
    'scripts'
  ];
  
  const recommendedDirs = [
    'src/components',
    'src/components/ui',
    'src/components/layout',
    'src/components/project',
    'src/contexts',
    'src/hooks',
    'src/services',
    'src/utils',
    'src/types',
    'src/assets',
    'tests',
    'docs'
  ];
  
  // Verificar directorios requeridos
  requiredDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      errors.push(`Directorio requerido no existe: ${dir}`);
    }
  });
  
  // Verificar directorios recomendados
  recommendedDirs.forEach(dir => {
    if (!fs.existsSync(dir)) {
      warnings.push(`Directorio recomendado no existe: ${dir}`);
    }
  });
  
  // Verificar estructura de components
  if (fs.existsSync('src/components')) {
    const componentDirs = fs.readdirSync('src/components', { withFileTypes: true })
      .filter(dirent => dirent.isDirectory())
      .map(dirent => dirent.name);
    
    const expectedComponentDirs = ['ui', 'layout', 'project', 'ai'];
    expectedComponentDirs.forEach(expectedDir => {
      if (!componentDirs.includes(expectedDir)) {
        warnings.push(`Directorio de componentes recomendado no existe: src/components/${expectedDir}`);
      }
    });
  }
}

function verifyNamingPatterns(errors, warnings) {
  // Verificar componentes React
  const componentFiles = glob.sync('src/components/**/*.{tsx,jsx}');
  componentFiles.forEach(file => {
    const fileName = path.basename(file, path.extname(file));
    
    // Los componentes deben usar PascalCase
    if (!/^[A-Z][a-zA-Z0-9]*$/.test(fileName)) {
      errors.push(`Componente con naming incorrecto (debe ser PascalCase): ${file}`);
    }
    
    // Verificar que el archivo contenga un componente con el mismo nombre
    try {
      const content = fs.readFileSync(file, 'utf8');
      const componentRegex = new RegExp(`(const|function)\\s+${fileName}\\s*[=:]`);
      if (!componentRegex.test(content)) {
        warnings.push(`Componente ${fileName} no encontrado en ${file}`);
      }
    } catch (error) {
      warnings.push(`Error leyendo archivo ${file}: ${error.message}`);
    }
  });
  
  // Verificar hooks
  const hookFiles = glob.sync('src/hooks/**/*.{ts,tsx}');
  hookFiles.forEach(file => {
    const fileName = path.basename(file, path.extname(file));
    
    // Los hooks deben empezar con 'use' y usar camelCase
    if (!/^use[A-Z][a-zA-Z0-9]*$/.test(fileName)) {
      errors.push(`Hook con naming incorrecto (debe ser use + PascalCase): ${file}`);
    }
  });
  
  // Verificar contextos
  const contextFiles = glob.sync('src/contexts/**/*.{ts,tsx}');
  contextFiles.forEach(file => {
    const fileName = path.basename(file, path.extname(file));
    
    // Los contextos deben terminar con 'Context'
    if (!/^[A-Z][a-zA-Z0-9]*Context$/.test(fileName)) {
      warnings.push(`Contexto con naming recomendado (debe terminar en Context): ${file}`);
    }
  });
  
  // Verificar servicios
  const serviceFiles = glob.sync('src/services/**/*.{ts,tsx}');
  serviceFiles.forEach(file => {
    const fileName = path.basename(file, path.extname(file));
    
    // Los servicios deben usar camelCase y terminar con 'Service'
    if (!/^[a-z][a-zA-Z0-9]*Service$/.test(fileName)) {
      warnings.push(`Servicio con naming recomendado (debe ser camelCase + Service): ${file}`);
    }
  });
}

function verifyImportPatterns(errors, warnings) {
  const tsFiles = glob.sync('src/**/*.{ts,tsx}');
  
  tsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const lines = content.split('\n');
      
      let importSection = true;
      let lastImportType = 0;
      let hasReactImport = false;
      
      lines.forEach((line, index) => {
        const trimmedLine = line.trim();
        
        if (trimmedLine.startsWith('import ')) {
          if (!importSection) {
            warnings.push(`Import fuera de sección en ${file}:${index + 1}`);
          }
          
          // Verificar si es un archivo React component que necesita React import
          if (file.endsWith('.tsx') && trimmedLine.includes('from \'react\'')) {
            hasReactImport = true;
          }
          
          // Verificar orden de imports
          const currentType = getImportType(trimmedLine);
          if (currentType < lastImportType) {
            warnings.push(`Orden de imports incorrecto en ${file}:${index + 1}`);
          }
          lastImportType = Math.max(lastImportType, currentType);
          
          // Verificar imports relativos
          if (trimmedLine.includes('../../../')) {
            warnings.push(`Import relativo muy profundo en ${file}:${index + 1} - considerar alias`);
          }
          
        } else if (trimmedLine && !trimmedLine.startsWith('//') && !trimmedLine.startsWith('/*')) {
          importSection = false;
        }
      });
      
      // Verificar que componentes React tengan import de React (si usan JSX)
      if (file.endsWith('.tsx') && !hasReactImport && content.includes('<')) {
        warnings.push(`Componente React sin import de React: ${file}`);
      }
      
    } catch (error) {
      warnings.push(`Error verificando imports en ${file}: ${error.message}`);
    }
  });
}

function getImportType(importLine) {
  // 1: React y librerías externas
  if (importLine.includes('from \'react\'') || 
      (!importLine.includes('./') && !importLine.includes('../') && !importLine.includes('from \'@/'))) {
    return 1;
  }
  
  // 2: Imports internos con alias (@/)
  if (importLine.includes('from \'@/')) {
    return 2;
  }
  
  // 3: Imports relativos
  if (importLine.includes('./') || importLine.includes('../')) {
    return 3;
  }
  
  // 4: Imports de tipos
  if (importLine.includes('import type')) {
    return 4;
  }
  
  return 2; // Por defecto
}

function verifyComponentDocumentation(warnings, suggestions) {
  const componentFiles = glob.sync('src/components/**/*.{tsx,jsx}');
  
  componentFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      const fileName = path.basename(file, path.extname(file));
      
      // Verificar JSDoc
      if (!content.includes('/**')) {
        warnings.push(`Componente sin documentación JSDoc: ${file}`);
      }
      
      // Verificar displayName
      if (!content.includes('.displayName =')) {
        suggestions.push(`Considerar añadir displayName a: ${file}`);
      }
      
      // Verificar export de tipos de props
      if (!content.includes(`export type`) || !content.includes('Props')) {
        suggestions.push(`Considerar exportar tipos de Props en: ${file}`);
      }
      
      // Verificar PropTypes o TypeScript interfaces
      if (!content.includes('interface') && !content.includes('type') && !content.includes('PropTypes')) {
        warnings.push(`Componente sin definición de tipos de props: ${file}`);
      }
      
      // Verificar ejemplos de uso
      if (!content.includes('@example')) {
        suggestions.push(`Considerar añadir ejemplo de uso en JSDoc: ${file}`);
      }
      
    } catch (error) {
      warnings.push(`Error verificando documentación en ${file}: ${error.message}`);
    }
  });
}

function verifyCodePatterns(errors, warnings, suggestions) {
  const tsFiles = glob.sync('src/**/*.{ts,tsx}');
  
  tsFiles.forEach(file => {
    try {
      const content = fs.readFileSync(file, 'utf8');
      
      // Verificar uso de console.log en producción
      if (content.includes('console.log') && !file.includes('test') && !file.includes('spec')) {
        warnings.push(`console.log encontrado en ${file} - considerar usar logger`);
      }
      
      // Verificar uso de any
      if (content.includes(': any') || content.includes('<any>')) {
        warnings.push(`Uso de 'any' encontrado en ${file} - considerar tipos específicos`);
      }
      
      // Verificar funciones muy largas (más de 50 líneas)
      const functions = content.match(/function\s+\w+|const\s+\w+\s*=\s*\(/g);
      if (functions) {
        // Análisis básico de longitud de funciones
        const lines = content.split('\n');
        let inFunction = false;
        let functionStart = 0;
        let braceCount = 0;
        
        lines.forEach((line, index) => {
          if (line.includes('function ') || line.includes('const ') && line.includes(' = (')) {
            inFunction = true;
            functionStart = index;
            braceCount = 0;
          }
          
          if (inFunction) {
            braceCount += (line.match(/{/g) || []).length;
            braceCount -= (line.match(/}/g) || []).length;
            
            if (braceCount === 0 && index > functionStart) {
              const functionLength = index - functionStart;
              if (functionLength > 50) {
                suggestions.push(`Función larga (${functionLength} líneas) en ${file}:${functionStart + 1} - considerar refactorizar`);
              }
              inFunction = false;
            }
          }
        });
      }
      
      // Verificar imports no utilizados (análisis básico)
      const importLines = content.match(/import\s+{[^}]+}\s+from/g);
      if (importLines) {
        importLines.forEach(importLine => {
          const imports = importLine.match(/{([^}]+)}/)?.[1];
          if (imports) {
            imports.split(',').forEach(imp => {
              const cleanImport = imp.trim();
              if (cleanImport && !content.includes(cleanImport.replace(/\s+as\s+\w+/, ''))) {
                suggestions.push(`Posible import no utilizado '${cleanImport}' en ${file}`);
              }
            });
          }
        });
      }
      
    } catch (error) {
      warnings.push(`Error verificando patrones de código en ${file}: ${error.message}`);
    }
  });
}

function verifyConfigurations(warnings, suggestions) {
  const configFiles = [
    { file: 'package.json', required: true },
    { file: 'tsconfig.json', required: true },
    { file: 'vite.config.ts', required: false },
    { file: '.eslintrc.js', required: false },
    { file: '.eslintrc.json', required: false },
    { file: 'tailwind.config.js', required: false },
    { file: '.gitignore', required: true },
    { file: 'README.md', required: false }
  ];
  
  configFiles.forEach(({ file, required }) => {
    if (!fs.existsSync(file)) {
      if (required) {
        warnings.push(`Archivo de configuración requerido no encontrado: ${file}`);
      } else {
        suggestions.push(`Considerar añadir archivo de configuración: ${file}`);
      }
    }
  });
  
  // Verificar package.json
  if (fs.existsSync('package.json')) {
    try {
      const packageJson = JSON.parse(fs.readFileSync('package.json', 'utf8'));
      
      // Verificar scripts esenciales
      const essentialScripts = ['dev', 'build', 'test'];
      essentialScripts.forEach(script => {
        if (!packageJson.scripts?.[script]) {
          warnings.push(`Script esencial no encontrado en package.json: ${script}`);
        }
      });
      
      // Verificar dependencias de desarrollo
      const devDeps = ['typescript', '@types/react', '@types/node'];
      devDeps.forEach(dep => {
        if (!packageJson.devDependencies?.[dep] && !packageJson.dependencies?.[dep]) {
          suggestions.push(`Considerar añadir dependencia de desarrollo: ${dep}`);
        }
      });
      
    } catch (error) {
      warnings.push(`Error leyendo package.json: ${error.message}`);
    }
  }
  
  // Verificar .gitignore
  if (fs.existsSync('.gitignore')) {
    try {
      const gitignore = fs.readFileSync('.gitignore', 'utf8');
      const essentialIgnores = ['node_modules', 'dist', '.env', '.DS_Store'];
      
      essentialIgnores.forEach(ignore => {
        if (!gitignore.includes(ignore)) {
          suggestions.push(`Considerar añadir a .gitignore: ${ignore}`);
        }
      });
      
    } catch (error) {
      warnings.push(`Error leyendo .gitignore: ${error.message}`);
    }
  }
}

function displayResults(errors, warnings, suggestions) {
  console.log('\n📊 Resultados de la verificación:');
  console.log('=' .repeat(50));
  
  if (errors.length > 0) {
    console.log(`\n❌ Errores (${errors.length}):`);
    errors.forEach((error, index) => {
      console.log(`   ${index + 1}. ${error}`);
    });
  }
  
  if (warnings.length > 0) {
    console.log(`\n⚠️  Advertencias (${warnings.length}):`);
    warnings.forEach((warning, index) => {
      console.log(`   ${index + 1}. ${warning}`);
    });
  }
  
  if (suggestions.length > 0) {
    console.log(`\n💡 Sugerencias (${suggestions.length}):`);
    suggestions.forEach((suggestion, index) => {
      console.log(`   ${index + 1}. ${suggestion}`);
    });
  }
  
  if (errors.length === 0 && warnings.length === 0 && suggestions.length === 0) {
    console.log('\n🎉 ¡Excelente! No se encontraron problemas.');
  }
  
  // Mostrar resumen
  console.log('\n📈 Resumen:');
  console.log(`   Errores: ${errors.length}`);
  console.log(`   Advertencias: ${warnings.length}`);
  console.log(`   Sugerencias: ${suggestions.length}`);
  
  const score = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 2));
  console.log(`   Puntuación de calidad: ${score}/100`);
}

function generateVerificationReport(errors, warnings, suggestions) {
  const reportDir = 'project-state/reports';
  if (!fs.existsSync(reportDir)) {
    fs.mkdirSync(reportDir, { recursive: true });
  }
  
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  const reportPath = path.join(reportDir, `architecture-verification-${timestamp}.md`);
  
  const score = Math.max(0, 100 - (errors.length * 10) - (warnings.length * 2));
  
  const report = `# Reporte de Verificación de Arquitectura

**Fecha**: ${new Date().toLocaleString()}  
**Puntuación**: ${score}/100

## 📊 Resumen
- **Errores**: ${errors.length}
- **Advertencias**: ${warnings.length}
- **Sugerencias**: ${suggestions.length}

## ❌ Errores Críticos
${errors.length > 0 ? errors.map((error, i) => `${i + 1}. ${error}`).join('\n') : 'Ninguno encontrado ✅'}

## ⚠️ Advertencias
${warnings.length > 0 ? warnings.map((warning, i) => `${i + 1}. ${warning}`).join('\n') : 'Ninguna encontrada ✅'}

## 💡 Sugerencias de Mejora
${suggestions.length > 0 ? suggestions.map((suggestion, i) => `${i + 1}. ${suggestion}`).join('\n') : 'Ninguna sugerencia adicional ✅'}

## 🎯 Recomendaciones

### Prioridad Alta
${errors.length > 0 ? '- Corregir todos los errores críticos antes de continuar' : '- Mantener el excelente trabajo'}

### Prioridad Media
${warnings.length > 0 ? '- Revisar y corregir advertencias cuando sea posible' : '- Considerar implementar las sugerencias de mejora'}

### Prioridad Baja
- Implementar sugerencias de mejora gradualmente
- Mantener documentación actualizada
- Revisar arquitectura periódicamente

---
*Reporte generado automáticamente por el sistema de verificación de NEXUS AI Studio*
`;
  
  fs.writeFileSync(reportPath, report);
  console.log(`\n📄 Reporte detallado generado: ${reportPath}`);
}

// Ejecutar script
if (process.argv[1] && import.meta.url.endsWith(process.argv[1].replace(/\\/g, '/'))) {
  verifyArchitecture();
}

export { verifyArchitecture };