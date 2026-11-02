# Manual técnico — Analista Académico v4

## 1. Propósito y arquitectura

Analista Académico es una aplicación web estática para leer planillas de notas y catálogos de competencias, analizar grupos y generar informes. El procesamiento se realiza en el navegador; no hay servidor de aplicación.

- **Ejecución:** `index.html`, JavaScript sin transpilación, CSS y bibliotecas cargadas en el navegador.
- **Desarrollo y pruebas:** Node.js, el runner nativo `node:test` y SheetJS (`xlsx`).
- **Persistencia:** proyecto serializado en `localStorage` y respaldos JSON.
- **Informes:** modelos compartidos para HTML, PDF con jsPDF/autoTable y Excel con SheetJS.

Los módulos se cargan en este orden:

1. `config.js`: escala, niveles, estados y catálogos de configuración.
2. `utilidades.js`: texto, números, estadística, notificaciones y diálogos.
3. `analisis.js`: cálculos académicos y filtros, sin DOM.
4. `lectura.js`: lectura y clasificación de planillas y catálogos, sin DOM.
5. `estado.js`: proyecto, grupos, persistencia y respaldos.
6. `programa.js`: agregación y hallazgos globales.
7. `recursos.js`: enlaces de estudio sugeridos.
8. `pensamiento-critico.js`: generación de evidencias y rúbrica común.
9. `informes.js`: modelos y salidas HTML, PDF y Excel.
10. `datos-ejemplo.js`, `ui-*.js` y `app.js`: datos de demostración, interfaz y arranque.

## 2. Catálogo con evidencia de pensamiento crítico

### 2.1 Estructura del libro

`COMPETANCIASporCURSOS.xlsx` conserva una hoja por curso y 440 competencias distribuidas en 11 cursos. Cada hoja contiene:

| Orden | Columna | Contenido |
|---|---|---|
| 1 | `Competencias` | Número y redacción original de la competencia. No se modificó. |
| 2 | `Criterios de Evaluación` | Criterio original. No se modificó. |
| 3 | `Pensamiento Critico` | Evidencia observable derivada de las dos columnas anteriores. |

El encabezado de la tercera columna contiene un comentario de Excel con la rúbrica completa. El ancho asignado a esta columna es 90 caracteres para facilitar su lectura.

El archivo anterior se conserva como `COMPETANCIASporCURSOS.backup.xlsx`. El generador no sobrescribe esa copia en ejecuciones posteriores.

### 2.2 Modelo pedagógico de la evidencia

Cada evidencia se redacta a partir del tema de la competencia y del criterio de evaluación e incluye cuatro vías relacionadas:

1. **Observación de la realidad:** descripción de ejemplos o situaciones, identificación de información relevante y formulación de preguntas.
2. **Reflexión:** análisis de supuestos, relaciones, decisiones, procedimientos, resultados, errores, alternativas o consecuencias, según el verbo y el contexto de la competencia.
3. **Diálogo mediante escritura:** registro de lo aprendido, las decisiones y las dudas.
4. **Conversación:** contraste de argumentos, escucha y explicación con seguridad y dominio, adaptada a entornos sociales y académicos.

La generación es determinista y local. No utiliza un servicio de IA ni envía el catálogo a terceros. El texto generado es una propuesta que el docente puede revisar en Excel.

### 2.3 Rúbrica común 0–5

La rúbrica clasifica la **presencia de la evidencia observada en la actuación del estudiante**. No asigna una puntuación a la competencia ni modifica automáticamente las notas de las evaluaciones.

| Intervalo | Nivel | Interpretación resumida |
|---|---|---|
| 0,00–0,99 | No evidente | No describe lo observado ni relaciona ideas con el criterio; requiere guía constante. |
| 1,00–1,99 | Incipiente | Reconoce aspectos obvios, opina con poca justificación y explica de forma fragmentaria. |
| 2,00–2,99 | En desarrollo | Observa datos relevantes, reflexiona parcialmente y comunica con cierta seguridad, pero aún necesita apoyo. |
| 3,00–3,99 | Logrado | Observa con precisión, reflexiona con base en el criterio, sustenta conclusiones y comunica con seguridad en entornos sociales y académicos. |
| 4,00–4,59 | Alto | Evalúa alternativas, revisa supuestos, dialoga constructivamente y adapta explicaciones con autonomía. |
| 4,60–5,00 | Superior | Integra observación, reflexión y diálogo para formular juicios matizados y transferir lo aprendido con independencia. |

La fuente única de esta rúbrica es `NIVELES` en `js/pensamiento-critico.js`. La función `nivelDe(valor)` clasifica valores numéricos y devuelve `null` para entradas no numéricas o fuera de 0–5. `rango(nivel)` produce la representación con coma decimal y `textoRubrica()` genera el comentario de Excel.

## 3. Regeneración del catálogo

Ejecutar desde la raíz del proyecto:

```bash
npm run catalogo:pensamiento-critico
```

O directamente:

```bash
node generar_catalogo_pensamiento_critico.js
```

Para revisar cuántas evidencias se generarían sin escribir el archivo:

```bash
node generar_catalogo_pensamiento_critico.js --check
```

También se puede indicar otro libro:

```bash
node generar_catalogo_pensamiento_critico.js ruta/al/catalogo.xlsx
```

El generador:

1. localiza los encabezados de competencias y criterios en las primeras diez filas;
2. procesa únicamente filas cuya competencia empieza con numeración;
3. conserva las dos primeras columnas y las notas aclaratorias;
4. escribe o actualiza la tercera columna sin duplicarla;
5. añade el comentario con la rúbrica;
6. crea una copia `.backup.xlsx` antes de la primera escritura.

## 4. Lectura y modelo de datos

`leerCompetencias()` en `js/lectura.js` localiza por separado:

- `colComp`: competencia;
- `colCrit`: criterio, excluyendo el encabezado de pensamiento crítico;
- `colPensamiento`: coincidencia exacta del encabezado normalizado `pensamiento critico`.

Cada competencia queda representada así:

```js
{
  numero: 1,
  texto: 'Resolver operaciones…',
  criterio: 'Precisión en las operaciones.',
  pensamientoCritico: 'Evidencia de presencia: observa y describe…',
  recursos: {},
  datos: {},
  fila: 2,
  id: 'aritmetica_basica#1'
}
```

La tercera columna no se trata como recurso ni como dato adicional genérico. Los catálogos antiguos de dos columnas siguen siendo válidos: `pensamientoCritico` queda como cadena vacía.

La propiedad se incluye en respaldos y en el catálogo compartido sin requerir migración de versión. Al recargar un catálogo se conservan el nombre del curso y `dimensionManual`, como antes.

## 5. Presentación y exportación

- **Asociar competencias (`ui-evaluaciones.js`):** cada elemento muestra competencia, criterio y evidencia cuando existe.
- **Revisar carácter (`ui-programa.js`):** muestra la evidencia y una tabla desplegable con la rúbrica común.
- **Plantilla descargable (`ui-datos.js`):** incluye la tercera columna y el comentario de rúbrica.
- **Excel del grupo (`informes.js`):** «Plan por estudiante» incorpora la columna `Evidencia de pensamiento crítico` para las competencias a reforzar.
- **Excel del programa:** «Clasificación» incorpora la evidencia de todas las competencias de los cursos en uso.
- **Estilos:** `.evidencia-pc` y `.rubrica-pc` en `css/style.css`.

La nota por carácter se sigue calculando con las evaluaciones y ponderaciones definidas en `analisis.js`. La nueva evidencia y su rúbrica no cambian ese cálculo.

### 5.1 Unificación de estudiantes entre archivos y grupos

`js/personas.js` consolida las matrículas del programa sin alterar los resultados de cada grupo. La identidad se determina así:

- **Con documento:** coinciden el documento normalizado (mayúsculas y caracteres alfanuméricos) y el nombre normalizado (sin tildes, signos, diferencias de mayúsculas ni espacios repetidos).
- **Sin documento:** solo se unifica el nombre exacto normalizado y se muestra una advertencia de posibles homónimos.
- **Conflicto:** si un documento aparece con nombres diferentes, las variantes permanecen separadas y se registran en `conflictos`.

`Lectura.leerNotas()` conserva `documento`, `idGenerado`, `id` y `nombre`. El `id` sigue siendo único dentro de la planilla; `documento` permite reconocer la identidad original aunque un duplicado haya recibido sufijo.

`Programa.analizarPrograma()` agrega `modelo.personas` con:

- `personas`: todas las identidades, incluso las de un solo grupo;
- `comunes`: identidades presentes en dos o más grupos;
- `conflictos`: documentos con variantes de nombre;
- `avisos` y `resumen`: matrículas, personas, comunes, conflictos y coincidencias solo por nombre.

Cada persona conserva `registros`, y cada registro contiene `datos`, análisis del grupo `g`, resultado `r`, grupo y archivo. Por ello, dos columnas llamadas `1P` en grupos distintos nunca se combinan.

`Informes.modeloUnificado()` produce un informe por persona con indicadores globales y un `modeloIndividual` por matrícula. El promedio global es una media descriptiva de promedios actuales, no una nota final combinada. `htmlUnificado()` y `pdfUnificado()` presentan cada matrícula por separado.

La pestaña Informes admite:

- `comunes`: informes unificados solo para estudiantes presentes en varios grupos;
- `unificados`: informes unificados para todas las personas;
- `grupos`: un `modeloGrupal` independiente por cada grupo en un solo PDF.

El Excel del programa añade `Personas unificadas`, `Estudiantes comunes` y `Conflictos identidad`. Las pruebas están en `tests/personas.test.js`. Con dos archivos reales verifican 88 matrículas, 53 personas, 35 estudiantes comunes y 5 conflictos de identidad. Con los cinco archivos disponibles verifican además 125 matrículas, 80 personas, 37 comunes y 8 conflictos, incluida una persona con tres matrículas y evaluaciones distintas en cada curso.

### 5.2 Reparto de porcentajes

`Analisis.pesosSugeridos()` reparte los presets `80-20`, `70-30` y `60-40` exclusivamente entre evaluaciones de tipo `parcial`/`final` y `quiz`. Las evaluaciones de otros tipos reciben 0 % para no compartir el porcentaje de los quices ni alterar el total de 100 %.

`UIEvaluaciones.render()` conserva el valor seleccionado de `#presetPesos` al redibujar la tabla. Al aplicar, se actualizan los pesos y se muestra una notificación con los totales por categoría. `renderTotal()` advierte qué evaluaciones incluidas tienen 0 %, ya que no entran en el cálculo hasta que el docente les asigne un peso manual.

Las pruebas de `tests/analisis.test.js` verifican 80/20 y 70/30 con y sin taller, reparto exacto de centésimas y total de 100 %. La validación en navegador comprueba también que el selector permanece en `80-20` después de aplicar.

### 5.3 Identificación y percepción en informes individuales

El estado `grupo.informe` incluye estas opciones persistentes con valores compatibles para respaldos anteriores:

- `formatoEstudiante`: `nombre`, `nombre-documento` (predeterminado) o `documento`.
- `percepcionCritica`: `no` (predeterminado), `general` o `concreta`.
- `incluirPensamientoCritico`: `true` por defecto; controla la columna de la tabla en HTML y PDF.
- `incluirRecursos`: `true` por defecto; si no hay recursos, HTML y PDF muestran una explicación en lugar de omitir silenciosamente la sección.

Los selectores de `index.html` usan `data-informe-select`; `UIInformes` los guarda con la misma función del resto de opciones y vuelve a generar la vista previa.

`presentacionEstudiante()` en `informes.js` define el encabezado y si el documento debe repetirse en los datos. Con `documento`, el encabezado es `ID / C.C. <documento>` y las firmas conservan el nombre. `modeloUnificado()` aplica la opción del primer grupo de la persona sin cambiar la clave de identidad usada para unificar.

`percepcionPensamientoCritico()` devuelve `null` cuando no se solicita. En modo `general` genera una lectura breve de la nota por carácter. En modo `concreta` añade la media del grupo y hasta tres evidencias, priorizando competencias críticas a reforzar y completando con otras competencias de evaluaciones con perfil crítico. Si no hay catálogo, genera una recomendación observable genérica.

La percepción se renderiza en HTML y PDF antes de competencias a reforzar. No usa `PensamientoCritico.nivelDe()` ni asigna la rúbrica automáticamente a partir de notas: es una lectura formativa y la valoración de evidencia sigue siendo docente.

La tabla `Competencias a reforzar` incluye `pensamientoCritico` y `tipos` en cada elemento del modelo. Los tipos se obtienen de las evaluaciones asociadas y se traducen con `CONFIG.TIPOS_EVALUACION`; las competencias escritas directamente en la planilla usan `No especificado`.

`evidenciaCriticaParaResultado()` adapta la evidencia a `r.detalle`: `Evidencia insuficiente` si no presentó, `muy incipiente` si la nota está por debajo del 40 % de la escala y `limitada` si está por debajo de la aprobatoria. Incluye evaluación y nota o ausencia y convierte la redacción del catálogo en acciones de mejora mediante `accionDesdeEvidencia()`. La percepción concreta usa la misma función. Las pruebas de `tests/evidencia-resultados.test.js` comprueban nota 1,00, nota 2,00 y evaluación no presentada.

HTML usa seis columnas y la clase `inf-comp-reforzar`, con `table-layout: fixed`, texto justificado en competencia/criterio/pensamiento crítico y anchos 20/20/32 % para esos campos. PDF usa las mismas seis columnas, fuente 6,5 y `halign: justify`; pensamiento crítico recibe el 34 % del ancho disponible. La evidencia vacía se representa con `—`.

Las pruebas están en `tests/informes-opciones.test.js` y cubren formatos, compatibilidad, informe unificado, percepción general/concreta y las nuevas columnas de la tabla.

### 5.4 Recursos personalizados por competencia y criterio

`js/recursos-canal.js` contiene reglas temáticas para el canal público **john estrada** (`UCe_8YXWBojXgfgaiQODPWTg`). Se extrajeron 136 videos públicos del canal, sin acceder al panel privado de YouTube Studio.

`videoPara()` busca por texto normalizado de competencia, criterio y curso. Prioriza coincidencias específicas —por ejemplo, antiderivadas trigonométricas antes que integrales— y devuelve una búsqueda con `john estrada` y el tema cuando no hay coincidencia razonable. `webPara()` asigna:

- Matemáticas Uno, Dos o Tres UCES según el área;
- tutorial oficial de Python para programación;
- Google Machine Learning para inteligencia artificial.

`Recursos.sugerir()` coloca primero esos recursos y después las búsquedas de Khan Academy, YouTube y Google. `herramientasDelArea()` prioriza programación e IA antes que coincidencias genéricas como «variables».

`Estado.completarCatalogo()` se ejecuta al aplicar o vincular un catálogo y al normalizar respaldos. Si falta `pensamientoCritico`, genera la evidencia; si faltan `recursos.web` o `recursos.videos`, usa las reglas del canal. No reemplaza contenido existente. Esto evita que un respaldo antiguo muestre la columna vacía u omita los recursos sin explicación. Las pruebas de compatibilidad están en `tests/visibilidad-recursos.test.js`.

El comando `npm run recursos:competencias` ejecuta `generar_recursos_competencias.js` y escribe web, videos, ejercicios y herramientas en las 440 competencias. Conserva las celdas existentes salvo `--force`; `--check` no escribe. La copia anterior se guarda como `COMPETANCIASporCURSOS.recursos.backup.xlsx`.

Resultado actual: 269 videos directos y 171 búsquedas específicas. Competencia, criterio y pensamiento crítico se conservan sin cambios. Las pruebas de `tests/recursos-canal.test.js` verifican cobertura, coincidencias, fuentes web y contenido del libro.

Fuentes: [canal](https://www.youtube.com/channel/UCe_8YXWBojXgfgaiQODPWTg/videos), [Matemáticas Uno](https://jestrada2020.github.io/MatematicaUnoCES2026/), [Matemáticas Dos](https://jestrada2020.github.io/MatematicasDos/) y [Matemáticas Tres](https://jestrada2020.github.io/MatematicasTres2026/).

## 6. Manual de usuario

La fuente es `manual/manual_usuario.tex`; el PDF y el índice se regeneran con:

```bash
cd manual
./construir_manual.sh
```

Requiere `latexmk`, LaTeX, `python3` y, para informar el número de páginas, `pdfinfo`. El script actualiza:

- `manual/manual_usuario.pdf`;
- `manual/manual-indice.js`, utilizado por la pestaña 7.

No editar `manual-indice.js` manualmente. Tras cambiar el contenido del manual deben revisarse enlaces, índice, tablas y saltos de página en el PDF generado.

## 7. Verificación

Comandos estándar:

```bash
npm test
for f in js/*.js generar_catalogo_pensamiento_critico.js; do node --check "$f" || exit 1; done
node generar_catalogo_pensamiento_critico.js --check
```

Las pruebas específicas están en `tests/pensamiento-critico.test.js` y comprueban:

- las 11 hojas y las 440 evidencias;
- la conservación de competencias y criterios respecto al respaldo;
- la presencia del comentario de rúbrica;
- lectura de la tercera columna y compatibilidad con catálogos antiguos;
- contenido de las vías pedagógicas;
- límites y valores inválidos de la escala 0–5;
- exportación de evidencias a Excel.

También deben ejecutarse las pruebas anteriores para detectar regresiones en lectura, análisis, respaldos e informes.

## 8. Mantenimiento

- Cambiar la rúbrica únicamente en `js/pensamiento-critico.js` y regenerar catálogo, plantilla, pruebas y manuales de forma coordinada.
- Revisar manualmente una muestra de evidencias de cada curso después de modificar las reglas de redacción.
- No introducir puntuaciones generadas automáticamente: requieren observación docente.
- Mantener la compatibilidad con catálogos de dos columnas y respaldos anteriores.
- Las mejoras generales pendientes y su prioridad están en `Mejoras_aplicables.md`.
