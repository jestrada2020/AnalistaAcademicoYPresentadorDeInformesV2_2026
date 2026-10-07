# Sistema de Criterios Múltiples - v2.3.0

## Descripción General

Se ha implementado un **sistema de criterios múltiples** que permite filtrar estudiantes usando varias condiciones combinadas con operadores lógicos (AND/OR). Esta mejora permite crear filtros complejos como:

- **P1 > 3.0 Y Q1 < 3.0** - Estudiantes que aprobaron P1 pero fallaron Q1
- **P1 < 3.0 O Q1 < 3.0** - Estudiantes que fallaron al menos una evaluación
- **1P ≥ 4.0 Y Q1 ≥ 4.0 Y Q2 ≥ 4.0** - Estudiantes con excelente desempeño en múltiples evaluaciones

---

## Características Principales

### 1. ✅ Criterios Dinámicos

- **Agregar criterios ilimitados**: Use el botón "➕ Agregar Otro Criterio" para añadir tantos criterios como necesite
- **Eliminar criterios**: Cada criterio tiene un botón "❌" para eliminarlo (debe mantener al menos 1 criterio)
- **Renumeración automática**: Los criterios se renumeran automáticamente al eliminar uno

### 2. ✅ Operadores Lógicos

**AND (Y)**: Todos los criterios deben cumplirse
```
Ejemplo: P1 > 3.0 Y Q1 > 3.0
Resultado: Solo estudiantes que aprobaron AMBAS evaluaciones
```

**OR (O)**: Al menos un criterio debe cumplirse
```
Ejemplo: P1 < 3.0 O Q1 < 3.0
Resultado: Estudiantes que fallaron AL MENOS UNA evaluación
```

### 3. ✅ Operadores de Comparación

Cada criterio puede usar diferentes operadores:

| Operador | Símbolo | Ejemplo | Significado |
|----------|---------|---------|-------------|
| **Menor que** | < | P1 < 3.0 | Nota menor a 3.0 |
| **Menor o igual** | ≤ | Q1 ≤ 2.5 | Nota menor o igual a 2.5 |
| **Mayor que** | > | P1 > 4.0 | Nota mayor a 4.0 |
| **Mayor o igual** | ≥ | Q2 ≥ 3.5 | Nota mayor o igual a 3.5 |
| **Igual que** | = | P1 = 5.0 | Nota exactamente 5.0 |

### 4. ✅ Resumen en Tiempo Real

El sistema muestra un **resumen legible** de los criterios configurados:

```
📝 Resumen: Filtrará estudiantes donde: P1 > 3.0 Y Q1 < 2.5 Y Q2 ≥ 4.0
```

Este resumen se actualiza automáticamente al cambiar cualquier valor.

---

## Interfaz de Usuario

### Sección de Criterios Múltiples

```
┌─────────────────────────────────────────────────────────────┐
│ 🎯 Criterios de Filtrado por Nota (Múltiples Criterios)   │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│ Operador Lógico entre Criterios:                           │
│ [Y (AND) - Deben cumplirse TODOS los criterios ▼]          │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Criterio 1                                           │   │
│ │                                                      │   │
│ │ Evaluación: [1P ▼]  Comparación: [> ▼]             │   │
│ │ Valor: [3.0]  [❌]                                   │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ ┌─────────────────────────────────────────────────────┐   │
│ │ Criterio 2                                           │   │
│ │                                                      │   │
│ │ Evaluación: [Q1 ▼]  Comparación: [< ▼]              │   │
│ │ Valor: [3.0]  [❌]                                   │   │
│ └─────────────────────────────────────────────────────┘   │
│                                                             │
│ [➕ Agregar Otro Criterio] [🗑️ Limpiar Todos]            │
│                                                             │
│ ┌───────────────────────────────────────────────────┐     │
│ │ 📝 Resumen: Filtrará estudiantes donde:          │     │
│ │ 1P > 3.0 Y Q1 < 3.0                              │     │
│ └───────────────────────────────────────────────────┘     │
│                                                             │
│ [🔍 Filtrar Estudiantes por Criterios]                     │
└─────────────────────────────────────────────────────────────┘
```

---

## Casos de Uso

### Caso 1: Identificar Estudiantes en Riesgo

**Objetivo**: Encontrar estudiantes que fallaron múltiples evaluaciones

**Configuración**:
1. Agregar Criterio 1: `1P < 3.0`
2. Agregar Criterio 2: `Q1 < 3.0`
3. Operador: **AND (Y)**

**Resultado**: Estudiantes que fallaron tanto el parcial como el quiz

---

### Caso 2: Estudiantes con Alto Desempeño

**Objetivo**: Encontrar estudiantes destacados

**Configuración**:
1. Criterio 1: `1P ≥ 4.5`
2. Criterio 2: `Q1 ≥ 4.5`
3. Criterio 3: `Q2 ≥ 4.5`
4. Operador: **AND (Y)**

**Resultado**: Estudiantes con excelentes notas en todas las evaluaciones

---

### Caso 3: Estudiantes que Necesitan Recuperación

**Objetivo**: Identificar cualquier estudiante con al menos una nota baja

**Configuración**:
1. Criterio 1: `1P < 3.0`
2. Criterio 2: `Q1 < 3.0`
3. Criterio 3: `Q2 < 3.0`
4. Operador: **OR (O)**

**Resultado**: Estudiantes que fallaron en AL MENOS UNA evaluación

---

### Caso 4: Análisis Específico de Mejora

**Objetivo**: Estudiantes que fallaron el parcial pero mejoraron en quices

**Configuración**:
1. Criterio 1: `1P < 3.0`
2. Criterio 2: `Q1 ≥ 3.5`
3. Operador: **AND (Y)**

**Resultado**: Estudiantes con bajo desempeño en parcial pero buen desempeño en quiz

---

### Caso 5: Seguimiento de Progreso

**Objetivo**: Estudiantes que han mejorado consistentemente

**Configuración**:
1. Criterio 1: `1P < 4.0`
2. Criterio 2: `Q1 ≥ 4.0`
3. Criterio 3: `Q2 ≥ 4.5`
4. Operador: **AND (Y)**

**Resultado**: Estudiantes que comenzaron con notas bajas pero mejoraron

---

## Flujo de Trabajo

### Paso 1: Configurar Evaluaciones

```
1. Cargar archivo de estudiantes
2. Configurar número de parciales y quices
3. Clic en "Actualizar Tabla"
```

### Paso 2: Crear Criterios

```
1. En "Criterios de Filtrado", el Criterio 1 ya está creado
2. Seleccionar evaluación (ej: "1P")
3. Seleccionar comparación (ej: ">")
4. Ingresar valor (ej: "3.0")
```

### Paso 3: Agregar Más Criterios (Opcional)

```
1. Clic en "➕ Agregar Otro Criterio"
2. Se crea Criterio 2
3. Configurar evaluación, comparación y valor
4. Repetir para tantos criterios como necesite
```

### Paso 4: Elegir Operador Lógico

```
Seleccionar entre:
- Y (AND): Deben cumplirse TODOS los criterios
- O (OR): Debe cumplirse AL MENOS UN criterio
```

### Paso 5: Filtrar

```
1. Clic en "🔍 Filtrar Estudiantes por Criterios"
2. Sistema evalúa cada estudiante contra los criterios
3. Muestra lista de estudiantes que cumplen las condiciones
```

### Paso 6: Generar Reporte

```
1. Aparece lista con checkboxes marcados
2. (Opcional) Desmarcar estudiantes que no quiere incluir
3. Clic en "📄 Generar Reporte para Seleccionados"
4. Vista previa del reporte aparece
5. Descargar PDF
```

---

## Arquitectura Técnica

### Funciones Principales

#### `actualizarSelectorCriterios()`
**Propósito**: Actualiza los dropdowns de evaluaciones en todos los criterios

```javascript
actualizarSelectorCriterios() {
    const selectores = document.querySelectorAll('.criterio-evaluacion');
    selectores.forEach(select => {
        // Llenar con evaluaciones disponibles
        this.evaluacionesDisponibles.forEach(ev => {
            select.appendChild(option);
        });
    });
    this.actualizarResumenCriterios();
}
```

**Cuándo se llama**:
- Al actualizar evaluaciones (cambiar número de parciales/quices)
- Al agregar un nuevo criterio
- Al limpiar criterios

---

#### `agregarCriterio()`
**Propósito**: Crea y agrega un nuevo criterio al contenedor

```javascript
agregarCriterio() {
    this.criteriosCounter++;
    const criterioRow = document.createElement('div');
    criterioRow.innerHTML = `
        <div class="criterio-number">Criterio ${this.criteriosCounter}</div>
        <select class="criterio-evaluacion">...</select>
        <select class="criterio-comparacion">...</select>
        <input class="criterio-valor">
        <button class="btn-remove-criterio">❌</button>
    `;

    // Configurar event listeners
    // Actualizar selector con evaluaciones
}
```

**Características**:
- Genera HTML dinámicamente
- Configura event listeners automáticamente
- Actualiza selectores de evaluaciones

---

#### `eliminarCriterio(criterioRow)`
**Propósito**: Elimina un criterio específico

```javascript
eliminarCriterio(criterioRow) {
    const criterios = container.querySelectorAll('.criterio-row');

    if (criterios.length <= 1) {
        // Error: Debe mantener al menos 1 criterio
        return;
    }

    criterioRow.remove();
    this.renumerarCriterios();
    this.actualizarResumenCriterios();
}
```

**Validaciones**:
- No permite eliminar si solo hay 1 criterio
- Renumera automáticamente los criterios restantes

---

#### `obtenerCriterios()`
**Propósito**: Extrae todos los criterios válidos configurados

```javascript
obtenerCriterios() {
    const criteriosRows = document.querySelectorAll('.criterio-row');
    const criterios = [];

    criteriosRows.forEach(row => {
        const evaluacion = row.querySelector('.criterio-evaluacion').value;
        const comparacion = row.querySelector('.criterio-comparacion').value;
        const valor = parseFloat(row.querySelector('.criterio-valor').value);

        if (evaluacion && comparacion && !isNaN(valor)) {
            criterios.push({ evaluacion, comparacion, valor });
        }
    });

    return criterios;
}
```

**Retorna**: Array de objetos con estructura:
```javascript
[
    { evaluacion: "1P", comparacion: "gt", valor: 3.0 },
    { evaluacion: "Q1", comparacion: "lt", valor: 2.5 }
]
```

---

#### `actualizarResumenCriterios()`
**Propósito**: Genera el texto del resumen legible

```javascript
actualizarResumenCriterios() {
    const criterios = this.obtenerCriterios();
    const operador = document.getElementById('operador-logico').value;

    const simbolos = {
        'lt': '<',
        'lte': '≤',
        'gt': '>',
        'gte': '≥',
        'eq': '='
    };

    const textos = criterios.map(c =>
        `${c.evaluacion} ${simbolos[c.comparacion]} ${c.valor.toFixed(1)}`
    );

    const operadorTexto = operador === 'AND' ? ' Y ' : ' O ';
    resumenTexto.textContent = `Filtrará estudiantes donde: ${textos.join(operadorTexto)}`;
}
```

**Ejemplos de salida**:
- `Filtrará estudiantes donde: 1P > 3.0 Y Q1 < 2.5`
- `Filtrará estudiantes donde: P1 ≥ 4.0 O Q1 ≥ 4.0 O Q2 ≥ 4.0`

---

#### `filtrarEstudiantesPorMultiplesCriterios(criterios, operador)`
**Propósito**: Filtra estudiantes basado en múltiples criterios y operador lógico

```javascript
filtrarEstudiantesPorMultiplesCriterios(criterios, operador) {
    const filtered = [];

    this.estudiantesData.slice(1).forEach(row => {
        let cumpleCriterios = false;

        if (operador === 'AND') {
            // Deben cumplirse TODOS los criterios
            cumpleCriterios = criterios.every(criterio => {
                const nota = this.excelMapper.obtenerNota(row, criterio.evaluacion);
                return Calculators.compararNota(nota, criterio.valor, criterio.comparacion);
            });
        } else {
            // Debe cumplirse AL MENOS UN criterio
            cumpleCriterios = criterios.some(criterio => {
                const nota = this.excelMapper.obtenerNota(row, criterio.evaluacion);
                return Calculators.compararNota(nota, criterio.valor, criterio.comparacion);
            });
        }

        if (cumpleCriterios) {
            // Calcular nota promedio de las evaluaciones filtradas
            let notaPromedio = 0;
            criterios.forEach(criterio => {
                notaPromedio += this.excelMapper.obtenerNota(row, criterio.evaluacion);
            });
            notaPromedio = notaPromedio / criterios.length;

            filtered.push({
                row: row,
                notaAcumulada: notaPromedio
            });
        }
    });

    return filtered;
}
```

**Operadores**:
- **AND**: Usa `criterios.every()` - todos deben ser verdaderos
- **OR**: Usa `criterios.some()` - al menos uno debe ser verdadero

---

#### `generarReportePorEvaluacionMultiple()`
**Propósito**: Función principal que orquesta el filtrado

```javascript
generarReportePorEvaluacionMultiple() {
    // Validar que hay datos
    if (!this.estudiantesData || this.estudiantesData.length === 0) {
        DOMHelpers.mostrarError('No hay datos de estudiantes cargados');
        return;
    }

    // Obtener criterios configurados
    const criterios = this.obtenerCriterios();

    if (criterios.length === 0) {
        DOMHelpers.mostrarError('Por favor, configure al menos un criterio válido');
        return;
    }

    // Obtener operador lógico
    const operador = document.getElementById('operador-logico').value;

    // Validar porcentajes (warning flexible)
    Validators.validarPorcentajes(numParciales, numQuices);

    // Filtrar estudiantes
    const filteredStudents = this.filtrarEstudiantesPorMultiplesCriterios(criterios, operador);

    // Mostrar lista de estudiantes filtrados
    this.mostrarEstudiantesFiltrados(filteredStudents);
}
```

---

### Clase Calculators

La clase `Calculators` centraliza las comparaciones de notas:

```javascript
static compararNota(nota, valor, tipo) {
    switch(tipo) {
        case 'lt': return nota < valor;
        case 'lte': return nota <= valor;
        case 'gt': return nota > valor;
        case 'gte': return nota >= valor;
        case 'eq': return nota === valor;
        default: return false;
    }
}
```

---

## Estilos CSS

### Operador Lógico

```css
.filter-operator {
    margin-bottom: 20px;
    padding: 15px;
    background-color: #e3f2fd;
    border-radius: 8px;
    border-left: 4px solid #2196F3;
}
```

**Efecto**: Destaca visualmente el operador lógico con tema azul

---

### Filas de Criterios

```css
.criterio-row {
    background-color: #f8f9fa;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 8px;
    border-left: 4px solid #007BFF;
    animation: slideIn 0.3s ease;
}

@keyframes slideIn {
    from {
        opacity: 0;
        transform: translateY(-10px);
    }
    to {
        opacity: 1;
        transform: translateY(0);
    }
}
```

**Efecto**: Animación suave al agregar nuevos criterios

---

### Botones

```css
.btn-remove-criterio {
    background-color: #dc3545;
    color: white;
    padding: 10px 15px;
}

.btn-add {
    background-color: #28a745;
    color: white;
    padding: 12px 24px;
}
```

**Colores**:
- **Rojo**: Eliminar criterio
- **Verde**: Agregar criterio
- **Gris**: Limpiar todos

---

### Resumen de Criterios

```css
.criterios-resumen {
    background-color: #fff3cd;
    padding: 15px;
    border-radius: 8px;
    border-left: 4px solid #ffc107;
    margin: 20px 0;
    font-size: 14px;
}
```

**Efecto**: Caja amarilla destacada con el resumen de criterios

---

## Validaciones

### Validación de Criterios

```javascript
if (criterios.length === 0) {
    DOMHelpers.mostrarError('Por favor, configure al menos un criterio válido');
    return;
}
```

**Verifica**:
- Que haya al menos 1 criterio configurado
- Que cada criterio tenga evaluación, comparación y valor válidos

---

### Validación de Eliminación

```javascript
if (criterios.length <= 1) {
    DOMHelpers.mostrarError('Debe mantener al menos un criterio');
    return;
}
```

**Previene**: Eliminar el último criterio restante

---

### Validación de Datos

```javascript
if (!this.estudiantesData || this.estudiantesData.length === 0) {
    DOMHelpers.mostrarError('No hay datos de estudiantes cargados');
    return;
}
```

**Verifica**: Que se haya cargado un archivo de estudiantes antes de filtrar

---

## Comparación con Sistema Anterior

### ❌ Sistema Anterior (v2.2.0 y anteriores)

**Limitaciones**:
- Solo 1 criterio a la vez
- No se podían combinar múltiples evaluaciones
- Interfaz estática (no podía crecer)

**Ejemplo**:
```
Evaluación: [1P ▼]
Comparación: [< ▼]
Valor: [3.0]
[Generar Reporte]
```

Solo podía filtrar: `P1 < 3.0`

---

### ✅ Sistema Nuevo (v2.3.0)

**Ventajas**:
- Múltiples criterios dinámicos
- Operadores lógicos AND/OR
- Interfaz dinámica (agregar/eliminar)
- Resumen en tiempo real
- Casos de uso complejos

**Ejemplo**:
```
Criterio 1: P1 < 3.0
Criterio 2: Q1 < 3.0
Criterio 3: Q2 ≥ 4.0
Operador: Y (AND)

Resultado: Estudiantes que fallaron P1 y Q1 pero tienen buen desempeño en Q2
```

---

## Compatibilidad

### ✅ Retrocompatible

- El sistema anterior de filtrado simple sigue disponible (función `generarReportePorEvaluacion()` legacy)
- Todas las funcionalidades previas siguen funcionando
- No requiere cambios en archivos Excel

### ✅ Compatible con Versiones Anteriores

- **v2.0.0**: Arquitectura de clases se mantiene
- **v2.1.0**: Validación flexible de porcentajes funciona
- **v2.1.1**: Checkboxes marcados por defecto funciona
- **v2.2.0**: Interfaz de 3 columnas se mantiene

---

## Testing

### Test 1: Criterio Simple

**Pasos**:
1. Cargar archivo de estudiantes
2. Criterio 1: `1P < 3.0`
3. Clic en "Filtrar"

**Resultado Esperado**: Lista de estudiantes con nota de P1 menor a 3.0

---

### Test 2: AND con 2 Criterios

**Pasos**:
1. Criterio 1: `1P < 3.0`
2. Agregar Criterio 2: `Q1 < 3.0`
3. Operador: AND
4. Filtrar

**Resultado Esperado**: Solo estudiantes que fallaron AMBAS evaluaciones

---

### Test 3: OR con 2 Criterios

**Pasos**:
1. Criterio 1: `1P < 3.0`
2. Agregar Criterio 2: `Q1 < 3.0`
3. Operador: OR
4. Filtrar

**Resultado Esperado**: Estudiantes que fallaron AL MENOS UNA de las dos evaluaciones

---

### Test 4: Múltiples Criterios (3+)

**Pasos**:
1. Criterio 1: `1P ≥ 4.0`
2. Criterio 2: `Q1 ≥ 4.0`
3. Criterio 3: `Q2 ≥ 4.0`
4. Operador: AND
5. Filtrar

**Resultado Esperado**: Estudiantes con excelente desempeño en las 3 evaluaciones

---

### Test 5: Eliminar Criterios

**Pasos**:
1. Agregar 3 criterios
2. Eliminar el Criterio 2
3. Verificar renumeración (Criterio 3 se convierte en Criterio 2)

**Resultado Esperado**: Renumeración correcta, resumen actualizado

---

### Test 6: Limpiar Todos

**Pasos**:
1. Agregar 5 criterios
2. Clic en "Limpiar Todos"

**Resultado Esperado**: Vuelve a 1 criterio por defecto vacío

---

### Test 7: Resumen Dinámico

**Pasos**:
1. Configurar Criterio 1: `1P > 3.0`
2. Observar resumen
3. Cambiar a `1P < 3.0`
4. Observar actualización del resumen

**Resultado Esperado**: Resumen se actualiza en tiempo real

---

### Test 8: Validación de Criterio Mínimo

**Pasos**:
1. Tener solo 1 criterio
2. Intentar eliminarlo

**Resultado Esperado**: Error "Debe mantener al menos un criterio"

---

## Problemas Conocidos y Soluciones

### ❌ Problema: Resumen no se actualiza

**Causa**: Event listeners no configurados para el criterio inicial

**Solución**: Función `configurarCriterioInicial()` configura listeners al inicializar

---

### ❌ Problema: Selector de evaluaciones vacío al agregar criterio

**Causa**: No se llama `actualizarSelectorCriterios()` después de agregar

**Solución**: Llamar `actualizarSelectorCriterios()` en `agregarCriterio()`

---

### ❌ Problema: Operador lógico no cambia el filtrado

**Causa**: No se pasa correctamente el operador a la función de filtrado

**Solución**: Obtener operador con `document.getElementById('operador-logico').value`

---

## Mejoras Futuras Sugeridas

### 1. Agrupación de Criterios

Permitir agrupar criterios con paréntesis:
```
(P1 > 3.0 Y Q1 > 3.0) O (P2 > 4.0 Y Q2 > 4.0)
```

### 2. Guardar Configuraciones

Guardar conjuntos de criterios con nombres:
```
"Estudiantes en Riesgo" = P1 < 3.0 Y Q1 < 3.0
"Estudiantes Destacados" = P1 ≥ 4.5 Y Q1 ≥ 4.5
```

### 3. Comparación Entre Evaluaciones

Permitir comparar dos evaluaciones:
```
Q1 > P1 (Quiz mayor que Parcial - indica mejora)
```

### 4. Operadores Matemáticos

Permitir operaciones:
```
(P1 + Q1) / 2 > 3.5 (Promedio mayor a 3.5)
```

### 5. Exportar Criterios

Exportar la configuración de criterios como JSON para reutilizar

---

## Resumen de Cambios en Código

### Archivos Modificados

#### 1. **index.html**
- **Líneas 79-152**: Sección completa de criterios múltiples
- Operador lógico global
- Contenedor dinámico de criterios
- Botones agregar/limpiar
- Resumen de criterios

#### 2. **css/style.css**
- **Líneas 251-358**: Estilos para sistema de criterios
- `.filter-operator`: Operador lógico
- `.criterio-row`: Filas de criterios con animación
- `.btn-remove-criterio`: Botón eliminar
- `.btn-add`: Botón agregar
- `.criterios-resumen`: Caja de resumen

#### 3. **js/main.js**
- **Línea 247**: Propiedad `criteriosCounter = 1`
- **Línea 255**: Llamada a `configurarCriterioInicial()`
- **Líneas 358-383**: Función `configurarCriterioInicial()`
- **Líneas 767-797**: `actualizarSelectorCriterios()`
- **Líneas 800-857**: `agregarCriterio()`
- **Líneas 859-871**: `eliminarCriterio()`
- **Líneas 873-879**: `renumerarCriterios()`
- **Líneas 881-966**: `limpiarCriterios()`
- **Líneas 968-1008**: `obtenerCriterios()`, `actualizarResumenCriterios()`
- **Líneas 1010-1048**: `generarReportePorEvaluacionMultiple()`, `filtrarEstudiantesPorMultiplesCriterios()`

---

## Changelog

### Version 2.3.0 (2025-10-27)

**Nuevas Funcionalidades**:
- ✅ Sistema de criterios múltiples dinámicos
- ✅ Operadores lógicos AND/OR entre criterios
- ✅ 5 tipos de comparación (lt, lte, gt, gte, eq)
- ✅ Resumen legible en tiempo real
- ✅ Agregar/eliminar criterios dinámicamente
- ✅ Animaciones al agregar criterios
- ✅ Validación de al menos 1 criterio
- ✅ Renumeración automática de criterios

**Mejoras UX**:
- ✅ Interfaz intuitiva con colores distintivos
- ✅ Botones claramente etiquetados con emojis
- ✅ Feedback visual inmediato
- ✅ Resumen que explica lo que se filtrará

**Mejoras Técnicas**:
- ✅ Uso de `every()` y `some()` para evaluación eficiente
- ✅ Event listeners dinámicos para criterios agregados
- ✅ Separación de lógica de comparación en clase Calculators
- ✅ Generación dinámica de HTML con `innerHTML`

---

## Conclusión

El sistema de **criterios múltiples v2.3.0** transforma la aplicación de un filtro simple a un **sistema de análisis avanzado** que permite:

✅ **Flexibilidad**: Crear tantos criterios como se necesiten
✅ **Potencia**: Combinar criterios con lógica compleja (AND/OR)
✅ **Usabilidad**: Interfaz intuitiva con feedback en tiempo real
✅ **Precisión**: 5 tipos de comparación para análisis detallado

Esta mejora permite a los educadores identificar patrones complejos en el desempeño estudiantil, como:
- Estudiantes que mejoran progresivamente
- Estudiantes en riesgo que necesitan intervención
- Estudiantes destacados para reconocimiento
- Análisis comparativo entre evaluaciones

**Versión:** 2.3.0
**Fecha:** 2025-10-27
**Estado:** ✅ Implementado y Documentado
