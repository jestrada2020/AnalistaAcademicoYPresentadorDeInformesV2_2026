# Analista Académico v4

Aplicación web para analizar las notas de uno o varios grupos por competencias y generar informes:

- individuales, para el estudiante y su acudiente;
- grupales, para coordinación;
- globales del programa.

Cada competencia se clasifica por su carácter: **analítico**, **práctico** o **pensamiento crítico**. Con esa clasificación se calcula el desempeño de cada estudiante, de cada grupo y de todo el programa en esas tres dimensiones. Funciona abriendo `index.html` en el navegador: no necesita servidor ni instalación. Requiere internet la primera vez, para cargar las librerías de Excel y PDF.

## Uso rápido

1. **Datos**
   - Cargue una o varias planillas de notas en Excel o CSV (p. ej. `MATEUNOV0.xlsx`). Puede seleccionar o arrastrar varios archivos a la vez. Se crea un grupo por:
     - cada archivo;
     - cada hoja con estudiantes;
     - cada valor de la columna `Grupo` (o `Asignatura`) dentro de una misma hoja.
   - Cargue el catálogo de competencias (`COMPETANCIASporCURSOS.xlsx`); es común a todos los grupos.
   - Elija el curso de competencias de cada grupo en la lista de grupos.
   - Complete los datos del grupo activo. Institución, programa y periodo se aplican a todos los grupos.
   - El **grupo activo** se cambia en el selector de la cabecera; las pestañas 2 a 5 trabajan con él.
2. **Evaluaciones y competencias**
   - Revise el porcentaje de cada evaluación; por defecto los parciales suman 80 % y los quices 20 %.
   - Asigne la fecha de cada evaluación.
   - Ajuste las competencias asociadas; al cargar el catálogo se reparten automáticamente.
   - Revise el **carácter** de cada evaluación. «Automático» lo toma de sus competencias; también puede fijarlo como analítico, práctico o crítico.
   - Agregue o sugiera recursos de estudio: páginas web, videos, ejercicios y herramientas.
   - **Copiar a los demás grupos** pasa esta configuración a los grupos con las mismas evaluaciones.
3. **Análisis del grupo**
   - Indicadores, distribución de promedios, media por evaluación y estados.
   - Desempeño analítico, práctico y crítico del grupo.
   - Estadísticas por evaluación, logro por competencia y alertas tempranas.
4. **Estudiantes**
   - Filtre con varios criterios combinados con Y / O (también por la nota analítica, práctica o crítica), o use un filtro rápido.
   - Marque estudiantes para el informe.
   - Abra la ficha de cada uno para escribir observaciones.
5. **Informes**
   - PDF individual, uno por página, para los seleccionados, los del filtro o todo el grupo.
   - PDF grupal y PDF del programa.
   - Excel consolidado del grupo y Excel del programa.
   - Impresión.
6. **Programa (todos los grupos)**
   - Indicadores globales y brecha entre grupos.
   - Desempeño por carácter en todo el programa y en cada grupo.
   - Hallazgos y recomendaciones automáticas.
   - Comparativo de grupos y resumen por curso.
   - Competencias con menor y mayor logro, y evaluaciones con menor aprobación.
   - Estudiantes en riesgo de todos los grupos.
7. **Manual del usuario**
   - Muestra el PDF del manual con un índice lateral y una búsqueda de temas.
   - El botón **? Ayuda** de la cabecera abre el manual en el capítulo de la pestaña actual.

El trabajo se guarda solo en el navegador. Con **Guardar respaldo** se descarga un `.json` que se recupera con **Abrir respaldo**.

## Cómo se calcula

| Concepto | Cálculo |
|---|---|
| Evaluación **pendiente** | Nadie del grupo tiene nota en ella todavía (p. ej. 4P y Q4 en MATEUNOV0). |
| Celda vacía en evaluación ya calificada | «No presentó»: cuenta como 0, o se ignora si se desactiva la opción en Datos. `NP` se reconoce igual. |
| Nota acumulada | Σ nota × peso / 100 de lo evaluado. |
| Promedio actual | Acumulado ÷ porcentaje evaluado (la nota que lleva en la escala). |
| Nota necesaria | (aprobatoria × peso total − acumulado) ÷ porcentaje restante. |
| Estados | Aprobación asegurada · Va aprobando · En riesgo · Riesgo alto (necesita más de 4.0) · Ya no alcanza · Aprobado / Reprobado (periodo cerrado) · Sin calificaciones. |
| Niveles | Superior ≥ 4.6 · Alto ≥ 4.0 · Básico ≥ 3.0 · Bajo. Son configurables. |
| Competencias a reforzar | Las asociadas a las evaluaciones que el estudiante perdió o no presentó. |
| Competencias críticas | Las que más estudiantes del grupo perdieron o no presentaron. |
| Carácter de una competencia | Automático, por el verbo inicial y las palabras de la competencia y su criterio. **Analítico**: comprender, analizar, interpretar, identificar… **Práctico**: aplicar, resolver, calcular, utilizar, implementar… **Pensamiento crítico**: evaluar, justificar, argumentar, modelar, formular, optimizar…, y resolver problemas en contexto (optimización, modelación, situaciones reales). Se puede corregir en «Revisar el carácter de las competencias». |
| Perfil de una evaluación | Proporción de sus competencias de cada carácter (p. ej. 1P = 67 % analítico y 33 % práctico), o el carácter fijado por el docente. Sin competencias se usa el tipo: talleres → práctico, proyectos → crítico. |
| Nota por carácter | Promedio de las notas del estudiante, ponderado por el peso de cada evaluación y su proporción de ese carácter. |
| Logro | Porcentaje de estudiantes con nota igual o mayor a la aprobatoria (por carácter o por competencia). |
| Programa | Junta los estudiantes de todos los grupos: medias, logro, brecha (mejor grupo − más bajo), competencias y evaluaciones críticas. |

## Formato de los archivos

**Planilla de notas** (Excel `.xlsx/.xls/.ods` o CSV separado por coma, punto y coma o tabulación; en CSV con `;` se acepta la coma decimal). Se leen todas las columnas de la hoja y se clasifican así:

- **Nombres** (obligatoria): `Nombres y Apellidos`, `Estudiante`, `Alumno`, o `Nombres` + `Apellidos` en columnas separadas.
- **Documento**: `ID`, `Documento`, `Código`, `Cédula`…
- **Grupo**: `Grupo`, `Sección`, `Paralelo`, `NRC`… y `Asignatura`, `Materia` o `Curso`. Si tienen varios valores, la hoja se divide en un grupo por valor. `Docente` o `Profesor` completa el docente del grupo.
- **Evaluaciones**: `1P`, `Parcial 2`, `2do parcial`, `Q1`, `Quiz 3`, `Taller 1`, `Seguimiento`, `Proyecto`, `Examen final`, o cualquier columna numérica dentro de la escala.
- **Informativas** (se muestran y no entran en la nota): `DF`/`Definitiva`, `Faltas`/`Inasistencias`, y columnas con valores fuera de la escala (como `NFAC`).
- **Texto por estudiante**:
  - observaciones, incluida una columna sin encabezado como la de «QF»;
  - competencias a reforzar, páginas web, videos, ejercicios y herramientas recomendadas.

  Las recomendaciones se agregan al informe de ese estudiante.
- **Avisos**: se informa de notas fuera de escala, documentos repetidos, valores que no son notas y estudiantes sin notas.

**Catálogo de competencias.** Una hoja por curso con `Competencias` («1. Texto…») y `Criterios de Evaluación`.

- Las columnas opcionales `Páginas web`, `Videos`, `Ejercicios` y `Herramientas` se usan como recursos de cada competencia.
- Las filas sin número al final de la hoja se guardan como notas del curso.
- Si Excel recortó el nombre de la hoja (31 caracteres), se puede corregir en la aplicación.

En **Datos → Descargar plantilla de notas** hay un modelo con instrucciones.

## Estructura

```
index.html            Interfaz (5 pestañas)
css/style.css         Estilos (complementan Tailwind)
js/config.js          Escala, niveles, estados, tipos, herramientas por área
js/utilidades.js      Texto, números, estadística, notificaciones, modales
js/lectura.js         Lectura y clasificación de columnas de los Excel
js/analisis.js        Cálculos, estados, competencias, estadísticas y filtros
js/estado.js          Proyecto con varios grupos y catálogo compartido, guardado, respaldo, distribución de competencias
js/programa.js        Análisis global del programa, hallazgos y recomendaciones
js/recursos.js        Sugerencia de enlaces de estudio por competencia
js/informes.js        Modelos de informe → HTML, PDF (jsPDF + autoTable) y Excel
js/datos-ejemplo.js   Datos de ejemplo
js/ui-*.js, js/app.js Interfaz de cada pestaña (ui-programa.js: pestaña 6) y arranque
tests/                Pruebas automáticas (npm test)
manual/               Manual del usuario: manual_usuario.tex (LaTeX), manual_usuario.pdf, capturas (img/)
                      y manual-indice.js (índice para la pestaña 7). Para regenerarlo: manual/construir_manual.sh
ejemplos/             CSV de muestra con dos grupos (columna Grupo, punto y coma y coma decimal)
docs/historial/       Documentación de versiones anteriores
```

Para ejecutar las pruebas: `npm install` (solo la primera vez) y luego `npm test`.

## Manual del usuario

`manual/manual_usuario.pdf` (50 páginas) se genera desde LaTeX con `manual/construir_manual.sh`, que necesita `latexmk` y `python3`. Para moverse por él:

- **Mapa rápido**: flujo de trabajo con pasos que son enlaces, botones a cada tema y una lista de tareas frecuentes.
- **Índice**: con enlaces a cada capítulo y sección.
- **Marcadores del PDF**: el lector los muestra en su panel lateral.
- **Cabecera de cada página**: enlaces a Mapa, Índice, Glosario y Ayuda.
- **Capítulos**: cada uno empieza con un recuadro «En este capítulo» y termina con botones de anterior/siguiente.
- **Referencias**: las que hay entre secciones son enlaces.
- **Glosario**: cada término lleva a su explicación.

Si cambia el manual, ejecute el script otra vez. Así se actualiza también el índice de la pestaña 7.

## Cambios de la versión 4

- **Varios grupos en un proyecto**
  - Se cargan desde varios archivos, varias hojas o una columna `Grupo`/`Asignatura`.
  - Se aceptan archivos CSV.
  - El catálogo de competencias se comparte entre los grupos.
  - Cada grupo tiene su propio curso de competencias.
  - Al volver a cargar un archivo, sus grupos se actualizan sin duplicarse.
- **Carácter de las competencias**
  - Clasificación automática en analítico, práctico y pensamiento crítico, que el docente puede corregir.
  - Perfil por evaluación y nota por carácter de cada estudiante, que se puede usar como filtro.
  - El carácter aparece en los informes individual y grupal.
- **Pestaña Programa**
  - Análisis global de todos los grupos, con hallazgos y recomendaciones.
  - PDF horizontal del programa.
  - Excel del programa con 7 hojas: Resumen, Grupos, Por curso, Competencias, Evaluaciones, Estudiantes y Clasificación.
- **Datos de ejemplo**: 3 grupos en una sola hoja con columna `Grupo`, con fortalezas distintas en cada carácter.
- Los respaldos de la versión 3 se abren y se convierten automáticamente.

## Cambios frente a la versión 2.3

- **Errores corregidos**
  - «Generar reporte para seleccionados» fallaba siempre: buscaba un elemento `#seleccion-evaluacion` que no existía.
  - El reporte general ignoraba los quices, mostraba «Fecha 1P» como fecha y aprobaba según el aporte (≥ 0.6) en lugar de la nota.
  - Las celdas vacías contaban como 0 sin distinguir «no presentó» de «aún no evaluado».
  - Cualquier columna después de la segunda se tomaba como evaluación, incluidas DF, NFAC y la columna sin encabezado.
  - El PDF era una captura de pantalla reducida a la mitad: texto borroso y páginas cortadas.
- **Nuevo**
  - Lectura de todas las columnas, con su clasificación y avisos.
  - Catálogo de competencias con criterios, búsqueda y distribución automática.
  - Recursos de estudio por evaluación y por competencia.
  - Nota necesaria, estados de riesgo, tendencia, niveles y estadísticas.
  - Competencias críticas.
  - Filtros por cualquier evaluación o indicador.
  - Ficha por estudiante con observaciones.
  - PDF con texto real y enlaces activos.
  - Informe grupal y Excel consolidado con 5 hojas.
  - Guardado automático, respaldo, notificaciones en lugar de `alert` y pruebas automáticas.
