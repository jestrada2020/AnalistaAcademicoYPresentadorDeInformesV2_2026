# Cambios Adicionales - Version 2.1.0

## Resumen de Nuevas Mejoras

Se implementaron dos mejoras solicitadas por el usuario:

1. ✅ **Validación de Porcentajes Flexible** - Ya no bloquea si no suman 100%
2. ✅ **Carga de Competencias desde Archivo Separado** - Permite usar COMPETANCIASporCURSOS.xlsx

---

## 1. VALIDACIÓN DE PORCENTAJES FLEXIBLE

### Problema Original:
La aplicación bloqueaba completamente si los porcentajes no sumaban exactamente 100%, impidiendo generar reportes parciales.

**Error anterior:**
```
Error: Los porcentajes deben sumar 100%. Actualmente suman: 20.00%
```

### Solución Implementada:

Ahora la validación muestra una **advertencia** en lugar de un error bloqueante, permitiendo al usuario decidir si desea continuar.

**Comportamiento nuevo:**

#### Código Modificado (main.js:75-104):

```javascript
static validarPorcentajes(numParciales, numQuices, mostrarAdvertencia = true) {
    let total = 0;

    // Calcular total de porcentajes...

    // Si no suma 100%, mostrar advertencia pero permitir continuar
    if (Math.abs(total - CONFIG.VALIDACION.PORCENTAJE_TOTAL) > 0.01) {
        if (mostrarAdvertencia) {
            const mensaje = `ADVERTENCIA: Los porcentajes suman ${total.toFixed(2)}% (no 100%).

¿Desea continuar de todas formas?`;
            if (!confirm(mensaje)) {
                throw new Error('Operación cancelada por el usuario');
            }
        }
        console.warn(`Porcentajes suman ${total.toFixed(2)}% en lugar de 100%`);
    }

    return true;
}
```

### Ejemplos de Uso:

#### Caso 1: Reporte de Solo un Parcial (20%)
```
Configuración:
- 1P: 20%
- 2P: 0%
- 3P: 0%
- 4P: 0%
Total: 20%

Resultado:
✓ Muestra advertencia: "Los porcentajes suman 20% (no 100%)"
✓ Pregunta: "¿Desea continuar de todas formas?"
✓ Si acepta → Genera el reporte
✓ Si cancela → No genera el reporte
```

#### Caso 2: Reporte de Mitad de Periodo (50%)
```
Configuración:
- 1P: 20%
- 2P: 20%
- Q1: 5%
- Q2: 5%
Total: 50%

Resultado:
✓ Muestra advertencia: "Los porcentajes suman 50% (no 100%)"
✓ Usuario puede continuar
✓ Las notas se calculan correctamente sobre 50%
```

#### Caso 3: Reporte Completo (100%)
```
Configuración:
- 1P: 20%
- 2P: 20%
- 3P: 20%
- 4P: 20%
- Q1-Q4: 5% cada uno
Total: 100%

Resultado:
✓ No muestra advertencia
✓ Genera el reporte directamente
```

### Beneficios:

- ✅ Mayor flexibilidad para reportes parciales
- ✅ Usuario tiene control sobre la decisión
- ✅ Warning se registra en consola para debugging
- ✅ Mantiene validación para casos donde suma exactamente 100%

---

## 2. CARGA DE COMPETENCIAS DESDE ARCHIVO SEPARADO

### Problema Original:
Las competencias solo podían seleccionarse del mismo archivo de estudiantes, no desde un archivo dedicado de competencias (`COMPETANCIASporCURSOS.xlsx`).

### Solución Implementada:

Ahora puedes cargar un **archivo separado** específicamente para competencias.

### Cambios en la Interfaz (HTML):

#### Nueva Sección Agregada (index.html:40-46):

```html
<h3>Cargar Archivo de Competencias (Opcional)</h3>
<input type="file" id="competencias-file" accept=".xlsx, .xls">
<button id="btn-cargar-competencias">Cargar Competencias</button>
<select id="seleccion-hoja-competencias">
    <option value="">Primero cargue el archivo</option>
</select>
<div id="competencias-status" style="margin-top: 10px; font-size: 12px; color: #666;"></div>
```

### Cambios en el Código (JavaScript):

#### 1. Nueva Variable de Estado (main.js:241):

```javascript
constructor() {
    this.workbook = null;
    this.workbookCompetencias = null; // NUEVO: almacena el archivo de competencias
    this.excelMapper = null;
    // ...
}
```

#### 2. Nueva Función de Carga (main.js:398-444):

```javascript
cargarArchivoCompetencias() {
    // 1. Validar archivo
    // 2. Mostrar status de carga
    // 3. Cargar archivo Excel
    // 4. Actualizar selector de hojas
    // 5. Mostrar mensaje de éxito
}
```

#### 3. Lógica Inteligente de Selección (main.js:669-702):

```javascript
seleccionarCompetencias(tipo) {
    // Prioridad 1: Si hay archivo de competencias cargado, usarlo
    if (this.workbookCompetencias) {
        workbookAUsar = this.workbookCompetencias;
        sheetName = seleccion-hoja-competencias;
    }
    // Prioridad 2: Si no, usar archivo de estudiantes
    else if (this.workbook) {
        workbookAUsar = this.workbook;
        sheetName = seleccion-hoja;
    }
    // Si ninguno está cargado, mostrar error
    else {
        mostrarError('Cargue un archivo Excel o de competencias');
    }
}
```

### Cómo Usar la Nueva Funcionalidad:

#### Opción A: Usando Archivo Separado de Competencias (RECOMENDADO)

**Paso 1: Cargar Archivo de Estudiantes**
1. Clic en "Elegir archivo" (sección izquierda)
2. Seleccionar archivo con notas (ej: ALUMNOMATEuno.xlsx)
3. Clic en "Procesar Archivo"
4. Seleccionar hoja con datos de estudiantes

**Paso 2: Cargar Archivo de Competencias**
1. En la nueva sección "Cargar Archivo de Competencias (Opcional)"
2. Clic en "Elegir archivo"
3. Seleccionar `COMPETANCIASporCURSOS.xlsx`
4. Clic en "Cargar Competencias"
5. Seleccionar la hoja del archivo de competencias

**Paso 3: Configurar Evaluaciones**
1. Configurar número de parciales y quices
2. Configurar porcentajes

**Paso 4: Seleccionar Competencias**
1. Clic en "Seleccionar Competencias" para cualquier evaluación
2. **Se abrirá el archivo de competencias** (COMPETANCIASporCURSOS.xlsx)
3. Seleccionar las celdas con las competencias deseadas
4. Clic en "Aplicar Selección"

**Paso 5: Generar Reporte**
1. Configurar criterios de evaluación
2. Generar reporte
3. Las competencias seleccionadas aparecerán en el reporte

#### Opción B: Usando Mismo Archivo de Estudiantes (Método Anterior)

**Paso 1: Cargar Archivo**
1. Cargar archivo de estudiantes que también contiene competencias
2. Seleccionar hoja

**Paso 2: NO cargar archivo de competencias**
- Dejar la sección "Cargar Archivo de Competencias" vacía

**Paso 3: Seleccionar Competencias**
1. Clic en "Seleccionar Competencias"
2. Se abrirá la hoja de estudiantes actual
3. Seleccionar competencias de esa misma hoja

### Indicadores Visuales:

El sistema muestra el estado de carga con códigos de color:

| Estado | Color | Mensaje |
|--------|-------|---------|
| **Cargando** | 🔵 Azul | "Cargando archivo de competencias..." |
| **Éxito** | 🟢 Verde | "✓ Archivo de competencias cargado exitosamente" |
| **Error** | 🔴 Rojo | "✗ Error al cargar archivo de competencias" |

### Beneficios:

- ✅ **Separación de responsabilidades**: Archivo de notas separado del de competencias
- ✅ **Más organizado**: COMPETANCIASporCURSOS.xlsx puede tener todas las competencias del colegio
- ✅ **Flexible**: Puedes usar archivo separado o el mismo
- ✅ **Prioridad inteligente**: Si cargas archivo de competencias, ese tiene prioridad
- ✅ **Retrocompatible**: Funciona igual que antes si no cargas archivo separado

---

## 3. FLUJO DE TRABAJO RECOMENDADO

### Escenario: Generar Reportes Mensuales (Reporte Parcial)

**Objetivo:** Generar reporte solo del primer mes (1 parcial + 1 quiz = 25%)

1. **Cargar Datos:**
   - Archivo de estudiantes: `ALUMNOMATEuno.xlsx`
   - Archivo de competencias: `COMPETANCIASporCURSOS.xlsx`

2. **Configurar Evaluaciones:**
   ```
   Número de Parciales: 4
   Número de Quices: 4

   Porcentajes:
   1P: 20% ✓ (evaluado)
   2P: 0%  (no evaluado aún)
   3P: 0%  (no evaluado aún)
   4P: 0%  (no evaluado aún)
   Q1: 5%  ✓ (evaluado)
   Q2-Q4: 0% (no evaluados aún)

   Total: 25%
   ```

3. **Seleccionar Competencias:**
   - Para 1P: Seleccionar competencias del archivo COMPETANCIASporCURSOS.xlsx
   - Para Q1: Seleccionar competencias del archivo COMPETANCIASporCURSOS.xlsx

4. **Generar Reporte:**
   - Sistema pregunta: "ADVERTENCIA: Los porcentajes suman 25% (no 100%). ¿Desea continuar?"
   - Clic en "Aceptar"
   - Se genera el reporte con las notas parciales

5. **Resultado:**
   ```
   Informe de Juan Pérez

   Evaluación | Nota | Competencias
   -----------|------|-------------
   1P         | 4.5  | [Competencias seleccionadas]
   Q1         | 4.0  | [Competencias seleccionadas]

   Nota Acumulada: 1.10 (sobre 1.25 posible, que es 25% de 5.0)
   ```

---

## 4. EJEMPLOS DE USO DE AMBAS MEJORAS JUNTAS

### Ejemplo 1: Reporte de Primer Bimestre (40%)

```javascript
Configuración:
- Archivo estudiantes: ALUMNOMATEuno.xlsx
- Archivo competencias: COMPETANCIASporCURSOS.xlsx

Evaluaciones:
- 1P: 20% ✓
- 2P: 20% ✓
- Q1: 0%
- Q2: 0%
Total: 40%

Resultado:
1. Sistema muestra advertencia: "40% (no 100%)"
2. Usuario acepta
3. Se genera reporte con competencias de COMPETANCIASporCURSOS.xlsx
4. Notas calculadas sobre 40%
```

### Ejemplo 2: Reporte Final Completo (100%)

```javascript
Configuración:
- Archivo estudiantes: ALUMNOMATEuno.xlsx
- Archivo competencias: COMPETANCIASporCURSOS.xlsx

Evaluaciones:
- 1P: 20%, 2P: 20%, 3P: 20%, 4P: 20%
- Q1-Q4: 5% cada uno
Total: 100%

Resultado:
1. Sin advertencias (suma 100%)
2. Se genera reporte directamente
3. Competencias de COMPETANCIASporCURSOS.xlsx
4. Notas completas del periodo
```

### Ejemplo 3: Reporte de Recuperación (Solo un Parcial)

```javascript
Configuración:
- Solo 1P habilitado: 20%
- Resto: 0%

Resultado:
1. Advertencia: "20% (no 100%)"
2. Usuario acepta
3. Reporte solo de ese parcial
4. Ideal para recuperaciones o evaluaciones únicas
```

---

## 5. COMPATIBILIDAD

### Retrocompatibilidad:

✅ **Totalmente compatible** con la versión anterior:
- Si NO cargas archivo de competencias → Funciona igual que antes
- Si NO aceptas la advertencia de porcentajes → No genera reporte (comportamiento similar al anterior)

### Nuevas Capacidades:

- ✅ Reportes parciales (antes: bloqueado, ahora: permitido con advertencia)
- ✅ Competencias desde archivo separado (antes: no posible, ahora: posible)
- ✅ Prioridad inteligente de archivos (nuevo)

---

## 6. ARCHIVOS MODIFICADOS

### HTML:
- **index.html** - Agregada sección "Cargar Archivo de Competencias (Opcional)"

### JavaScript:
- **js/main.js** - Modificaciones:
  1. `Validators.validarPorcentajes()` - Líneas 75-104
  2. `ReporteCompetencias.constructor()` - Línea 241 (nueva variable)
  3. `cargarArchivoCompetencias()` - Líneas 398-444 (nueva función)
  4. `actualizarSeleccionHojaCompetencias()` - Líneas 446-467 (nueva función)
  5. `seleccionarCompetencias()` - Líneas 669-702 (modificada)
  6. `configurarBotonesGlobales()` - Líneas 284-287 (nuevo listener)

---

## 7. VALIDACIONES Y MENSAJES

### Nuevos Mensajes de Error/Advertencia:

| Situación | Mensaje |
|-----------|---------|
| **Porcentajes no suman 100%** | "ADVERTENCIA: Los porcentajes suman XX% (no 100%). ¿Desea continuar de todas formas?" |
| **No se seleccionó hoja de competencias** | "Por favor, seleccione una hoja del archivo de competencias" |
| **No hay archivo cargado** | "Por favor, cargue un archivo Excel o un archivo de competencias" |
| **Error al cargar competencias** | "Error al procesar el archivo de competencias" |

### Mensajes de Éxito:

| Situación | Mensaje |
|-----------|---------|
| **Competencias cargadas** | "Archivo de competencias cargado exitosamente" |
| **Status visual** | "✓ Archivo de competencias cargado exitosamente" (verde) |

---

## 8. TESTING

### Casos de Prueba:

#### Test 1: Validación Flexible de Porcentajes
- ✅ Configurar solo 1P (20%)
- ✅ Intentar generar reporte
- ✅ Verificar que aparece advertencia
- ✅ Aceptar advertencia
- ✅ Verificar que genera reporte

#### Test 2: Archivo de Competencias Separado
- ✅ Cargar ALUMNOMATEuno.xlsx
- ✅ Cargar COMPETANCIASporCURSOS.xlsx
- ✅ Seleccionar hoja de competencias
- ✅ Clic en "Seleccionar Competencias" para 1P
- ✅ Verificar que abre el archivo de competencias
- ✅ Seleccionar competencias
- ✅ Verificar que se aplican correctamente

#### Test 3: Retrocompatibilidad
- ✅ NO cargar archivo de competencias
- ✅ Usar solo archivo de estudiantes
- ✅ Seleccionar competencias
- ✅ Verificar que abre el archivo de estudiantes (comportamiento anterior)

#### Test 4: Porcentajes Exactos (100%)
- ✅ Configurar porcentajes que sumen 100%
- ✅ Generar reporte
- ✅ Verificar que NO aparece advertencia
- ✅ Verificar que genera reporte directamente

---

## 9. PROBLEMAS CONOCIDOS Y SOLUCIONES

### Problema: "No se seleccionó hoja de competencias"

**Causa:** Cargaste el archivo de competencias pero no seleccionaste una hoja

**Solución:**
1. En el dropdown "Seleccion de hoja" (debajo de "Cargar Competencias")
2. Elige la hoja que contiene las competencias

### Problema: Sigue usando archivo de estudiantes para competencias

**Causa:** El archivo de competencias no se cargó correctamente

**Solución:**
1. Verifica el status (debe decir "✓ Archivo de competencias cargado exitosamente" en verde)
2. Si no, recarga el archivo
3. Verifica que el archivo sea .xlsx o .xls válido

---

## 10. CHANGELOG

### Version 2.1.0 (2025-10-27)

**Nuevas Funcionalidades:**
- ✅ Validación flexible de porcentajes (warning en lugar de error bloqueante)
- ✅ Carga de archivo de competencias separado
- ✅ Prioridad inteligente: archivo de competencias tiene prioridad sobre archivo de estudiantes
- ✅ Status visual de carga de competencias

**Mejoras:**
- ✅ Mayor flexibilidad para reportes parciales
- ✅ Mejor organización de competencias en archivo dedicado
- ✅ Retrocompatibilidad total con versión 2.0

**Correcciones:**
- ✅ Ya no bloquea cuando porcentajes no suman 100%
- ✅ Permite usar competencias de archivo externo

---

## CONCLUSIÓN

Estas dos mejoras hacen la aplicación mucho más flexible y práctica:

1. **Validación Flexible:** Permite generar reportes de evaluaciones parciales sin estar bloqueado por la suma de 100%

2. **Competencias Separadas:** Permite mantener un archivo maestro de competencias (COMPETANCIASporCURSOS.xlsx) independiente de los archivos de notas

**Impacto:**
- 🎯 **Mayor Flexibilidad:** Reportes mensuales, bimestrales o personalizados
- 📚 **Mejor Organización:** Competencias centralizadas en un solo archivo
- ✅ **Retrocompatible:** No rompe funcionalidad anterior
- 🚀 **Más Eficiente:** Menos duplicación de datos de competencias

**Versión:** 2.1.0
**Fecha:** 2025-10-27
**Estado:** ✅ Completado y Probado
