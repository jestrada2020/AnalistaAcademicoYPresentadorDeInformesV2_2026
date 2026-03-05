# Generador de Reportes por Competencias v2.0

> Sistema web para generar reportes personalizados de notas estudiantiles con competencias y recomendaciones

## 🎯 Características

- ✅ Carga y procesamiento de archivos Excel (.xlsx, .xls)
- ✅ Configuración flexible de evaluaciones (parciales y quices)
- ✅ Selección de competencias por evaluación
- ✅ Filtrado de estudiantes por criterios de notas
- ✅ Generación de reportes personalizados
- ✅ Exportación a PDF con múltiples formatos
- ✅ **NUEVO:** Arquitectura modular y segura
- ✅ **NUEVO:** Validaciones robustas
- ✅ **NUEVO:** Mapeo dinámico de columnas Excel

## 🚀 Inicio Rápido

### 1. Abrir la aplicación

```bash
# Simplemente abre el archivo en tu navegador
open index.html  # macOS
start index.html # Windows
xdg-open index.html # Linux
```

O arrastra `index.html` a tu navegador.

### 2. Requisitos

- Navegador moderno (Chrome 90+, Firefox 88+, Edge 90+, Safari 14+)
- Conexión a internet (para cargar librerías CDN)
- Archivo Excel con formato adecuado

## 📖 Guía de Uso

### Paso 1: Cargar Archivo Excel

1. Clic en **"Elegir archivo"**
2. Selecciona tu archivo Excel (.xlsx o .xls)
3. Clic en **"Procesar Archivo"**
4. Espera a que la barra de progreso complete

**Formato requerido del Excel:**
- Debe contener la columna: `Nombres y Apellidos`
- Primera fila: Encabezados
- Filas siguientes: Datos de estudiantes

**Ejemplo:**
```
| ID | Nombres y Apellidos | 1P | 2P | 3P | 4P | Q1 | Q2 |
|----|---------------------|----|----|----|----|----|----|
| 1  | Juan Pérez          | 4.5| 4.0| 4.8| 4.2| 4.0| 4.5|
| 2  | María García        | 3.5| 3.8| 4.0| 3.9| 3.7| 4.0|
```

### Paso 2: Seleccionar Hoja

1. En el dropdown **"Seleccione una hoja"**, elige la hoja del Excel que contiene los datos
2. Se mostrará automáticamente la lista de estudiantes

### Paso 3: Configurar Evaluaciones

1. **Número de Parciales**: Ingresa cuántos parciales hay (1-4)
2. **Número de Quices**: Ingresa cuántos quices hay (1-5)
3. Se generará automáticamente una tabla con todas las evaluaciones

### Paso 4: Configurar Porcentajes

1. Para cada evaluación, ingresa el porcentaje que vale
2. **Importante:** La suma de todos los porcentajes debe ser 100%

**Ejemplo:**
- 1P: 20%
- 2P: 20%
- 3P: 20%
- 4P: 20%
- Q1: 5%
- Q2: 5%
- Q3: 5%
- Q4: 5%
**Total: 100%** ✅

### Paso 5: Seleccionar Competencias (Opcional)

Para cada evaluación puedes seleccionar:

1. **Competencias a Reforzar**: Clic en "Seleccionar Competencias"
2. **Páginas Web**: Clic en "Seleccionar Páginas Web"
3. **Videos**: Clic en "Seleccionar Videos"
4. **Ejercicios**: Clic en "Seleccionar Ejercicios"
5. **Herramientas**: Clic en "Seleccionar Herramientas"

En el modal que aparece:
- Clic en las celdas del Excel que contienen las competencias/recursos
- Las celdas seleccionadas se marcarán en amarillo
- Clic en **"Aplicar Selección"**

### Paso 6: Generar Reportes

#### Opción A: Reporte General por Estudiante

1. En la sección **"Seleccionar Estudiante"**, elige uno o varios estudiantes
2. Clic en **"Seleccionar Todos"** para elegir todos
3. Clic en **"Generar Reporte General de Notas por Estudiante"**

#### Opción B: Reporte Filtrado por Evaluación

1. En **"Seleccione una evaluación"**, elige la evaluación
2. En **"Tipo de comparación"**, elige el criterio:
   - Menor que (<)
   - Menor o igual que (≤)
   - Mayor que (>)
   - Mayor o igual que (≥)
   - Igual que (=)
3. En **"Valor de la Nota"**, ingresa el valor (0-5)
4. Marca o desmarca **"Incluir Nombres y Apellidos en el Informe"**
5. Clic en **"Generar Reporte con Competencias y Recomendaciones"**
6. Se mostrarán los estudiantes que cumplen el criterio
7. Marca los estudiantes deseados
8. Clic en **"Generar Reporte para Seleccionados"**

### Paso 7: Descargar PDF

1. En la vista previa del reporte:
2. Selecciona **Tamaño de Hoja**: Carta u Oficio
3. Selecciona **Orientación**: Vertical u Horizontal
4. Clic en **"Descargar Informe en PDF"**

## 🔒 Mejoras de Seguridad v2.0

Esta versión incluye mejoras críticas de seguridad:

- ✅ **Sin vulnerabilidades XSS**: Todos los datos son sanitizados
- ✅ **Event listeners seguros**: No usa onclick inline
- ✅ **Validaciones robustas**: Verifica integridad de datos
- ✅ **Manejo de errores**: Mensajes descriptivos de error

## 🏗️ Mejoras de Arquitectura v2.0

- ✅ **Código modular**: 5 clases especializadas
- ✅ **Sin variables globales**: Estado encapsulado
- ✅ **Mapeo dinámico**: Se adapta a cualquier estructura Excel
- ✅ **Sin código duplicado**: Funciones reutilizables
- ✅ **Documentación inline**: Comentarios explicativos

## 📁 Estructura de Archivos

```
PROCESO_NOTAS_CON_COMPETENCIAS1/
├── index.html                      # Interfaz principal
├── index.html.backup               # Backup del HTML original
├── css/
│   └── style.css                   # Estilos de la aplicación
├── js/
│   ├── main.js                     # Código refactorizado v2.0
│   └── main.js.backup              # Backup del código original
├── README.md                       # Este archivo
├── mejorasRecomendadas.md          # Análisis y sugerencias
├── CAMBIOS_IMPLEMENTADOS.md        # Detalles de cambios v2.0
├── ALUMNOMATEuno.xlsx              # Archivo de ejemplo 1
├── MATEUNOV0.xlsx                  # Archivo de ejemplo 2
└── COMPETANCIASporCURSOS.xlsx      # Catálogo de competencias
```

## 🛠️ Tecnologías Utilizadas

- **HTML5**: Estructura
- **CSS3**: Estilos
- **JavaScript ES6+**: Lógica (Vanilla JS)
- **XLSX.js 0.16.9**: Procesamiento de Excel
- **jsPDF 2.5.1**: Generación de PDF
- **html2canvas 1.4.1**: Conversión HTML a imagen

## ⚠️ Validaciones y Errores

### Errores comunes y soluciones:

#### "No se ha seleccionado ningún archivo"
- **Causa**: No cargaste un archivo
- **Solución**: Clic en "Elegir archivo" y selecciona un Excel

#### "El archivo debe ser Excel (.xlsx o .xls)"
- **Causa**: Archivo de formato incorrecto
- **Solución**: Asegúrate de usar archivo Excel

#### "Columnas requeridas no encontradas: Nombres y Apellidos"
- **Causa**: El Excel no tiene la columna requerida
- **Solución**: Agrega una columna llamada exactamente "Nombres y Apellidos"

#### "Los porcentajes deben sumar 100%"
- **Causa**: La suma de porcentajes no es 100%
- **Solución**: Ajusta los porcentajes para que sumen exactamente 100%

#### "La nota debe estar entre 0 y 5"
- **Causa**: Ingresaste un valor de nota fuera de rango
- **Solución**: Ingresa un valor entre 0 y 5

#### "No hay datos de estudiantes cargados"
- **Causa**: No has cargado un archivo Excel o no has seleccionado hoja
- **Solución**: Carga un archivo y selecciona una hoja

## 🔧 Solución de Problemas

### La aplicación no carga
1. Verifica conexión a internet (se necesita para CDN)
2. Abre la consola (F12) y busca errores
3. Prueba en otro navegador

### El PDF no se genera
1. Verifica que hay contenido en la vista previa
2. Espera unos segundos (PDFs grandes tardan más)
3. Permite descargas en tu navegador

### Los datos no se muestran correctamente
1. Verifica que tu Excel tiene el formato correcto
2. Asegúrate de que la primera fila son encabezados
3. Verifica que hay datos en las filas siguientes

## 📊 Ejemplos de Uso

### Caso 1: Identificar estudiantes con bajo rendimiento

1. Cargar Excel con notas
2. Configurar evaluaciones y porcentajes
3. Seleccionar: "Menor que (<)" y "Valor de la Nota: 3.0"
4. Generar reporte
5. Ver lista de estudiantes con promedio < 3.0

### Caso 2: Reporte individual con recomendaciones

1. Cargar Excel con notas
2. Seleccionar competencias para cada evaluación
3. Seleccionar un estudiante específico
4. Generar reporte general
5. Descargar PDF con competencias a reforzar

### Caso 3: Reporte de periodo completo

1. Cargar Excel con todas las evaluaciones del periodo
2. Configurar 4 parciales + 4 quices
3. Asignar porcentajes (80% parciales, 20% quices)
4. Seleccionar todos los estudiantes
5. Generar reporte general

## 🚀 Próximas Mejoras Planeadas

Según el análisis en `mejorasRecomendadas.md`:

### Fase 3 (Media Prioridad):
- [ ] Persistencia con localStorage
- [ ] Notificaciones toast (reemplazo de alerts)
- [ ] Loader para operaciones largas
- [ ] Mejoras de accesibilidad

### Fase 4 (Baja Prioridad):
- [ ] Tests unitarios
- [ ] Modo oscuro
- [ ] Exportar a Excel/CSV
- [ ] Historial de reportes

## 📝 Changelog

### Version 2.0.0 (2025-10-27)
- ✅ Refactorización completa del código
- ✅ Arquitectura modular con 5 clases
- ✅ Corrección de vulnerabilidades XSS
- ✅ Eliminación de event handlers inline
- ✅ Validaciones robustas implementadas
- ✅ Mapeo dinámico de columnas Excel
- ✅ Eliminación de código duplicado
- ✅ Documentación completa

### Version 1.3 (Anterior)
- Funcionalidad básica
- Generación de reportes
- Exportación a PDF

## 👥 Soporte

Si encuentras problemas o tienes sugerencias:

1. Revisa `mejorasRecomendadas.md` para más detalles
2. Revisa `CAMBIOS_IMPLEMENTADOS.md` para cambios recientes
3. Abre la consola del navegador (F12) para ver errores

## 📄 Licencia

Este proyecto es de uso educativo/administrativo.

---

**Version:** 2.0.0
**Fecha:** 2025-10-27
**Estado:** ✅ Producción (refactorizado y mejorado)

¡Gracias por usar el Generador de Reportes por Competencias! 🎉
