# Mejoras aplicables — Analista Académico v4

## Alcance de la revisión

Se revisaron la interfaz actual (`index.html`), los módulos cargados desde `js/`, los estilos, la lectura de Excel/CSV, el estado y los respaldos, los cálculos académicos, el análisis del programa, los informes y las pruebas existentes.

La aplicación tiene una base sólida: separa lectura, análisis, estado, interfaz e informes; escapa de forma sistemática los datos insertados en HTML; valida pesos y escalas; y dispone de pruebas para los cálculos principales. Este documento no repite como pendientes las mejoras de versiones antiguas que ya están implementadas.

**Comprobaciones realizadas:**

- `npm test`: **19 pruebas superadas, 0 fallos**.
- `node --check` sobre todos los archivos `js/*.js`: **sin errores de sintaxis**.
- Revisión estática de seguridad, persistencia, accesibilidad, rendimiento y consistencia de los cálculos.

**Límite de la revisión:** no se ejecutó una prueba visual automatizada en navegador ni una comparación visual de los PDF impresos. Esas comprobaciones se incluyen como mejoras de verificación.

## Prioridad resumida

- **P0 — proteger datos y disponibilidad:** respaldos, guardado local y dependencias externas.
- **P1 — evitar resultados ambiguos y mejorar el flujo principal:** importación, escala, comparabilidad, accesibilidad, impresión, rendimiento y pruebas.
- **P2 — completar robustez y mantenimiento:** Unicode, duplicados entre grupos y limpieza técnica.

---

## P0 — Prioridad alta

### 1. Confirmar y validar la apertura de respaldos antes de reemplazar el trabajo

**Situación actual**

`abrirRespaldo()` importa directamente el archivo seleccionado (`js/app.js:102-115`). La importación termina llamando a `reemplazarProyecto()` (`js/estado.js:416-421`), de modo que un respaldo válido sustituye inmediatamente todos los grupos actuales, sin confirmación ni resumen previo.

La validación solo comprueba que exista `grupos` o `estudiantes`. `normalizar()` y `normalizarProyecto()` completan campos, pero no validan de forma estricta tipos, escalas, evaluaciones, competencias ni tamaño del archivo (`js/estado.js:61-107`).

**Mejora aplicable**

1. Leer y validar el JSON en un objeto temporal, sin modificar el proyecto activo.
2. Limitar el tamaño aceptado y rechazar estructuras incorrectas con mensajes concretos.
3. Validar cada grupo: identificadores únicos, arreglos esperados, notas finitas dentro de escala, pesos válidos y referencias de competencias existentes.
4. Mostrar un resumen antes de importar: número de grupos, estudiantes, cursos y fecha del respaldo.
5. Pedir confirmación indicando que se reemplazará el trabajo actual y ofrecer descargar antes un respaldo.
6. Sustituir el estado únicamente después de que toda la validación termine correctamente.

Conviene separar `validarRespaldo()` de `importarRespaldo()` para probar la validación sin efectos secundarios.

**Criterios de aceptación**

- Cancelar la confirmación deja el proyecto exactamente igual.
- Un JSON malformado o con datos inválidos no borra ni altera el proyecto.
- Un respaldo correcto conserva grupos, notas, observaciones, selección, filtros y configuración.
- Un archivo excesivamente grande se rechaza antes de bloquear la interfaz.

---

### 2. Hacer visible un fallo de guardado y reforzar la privacidad de los datos locales

**Situación actual**

El proyecto contiene nombres, documentos, notas y observaciones. Se guarda automáticamente en `localStorage`, pero cualquier excepción —cuota agotada, almacenamiento deshabilitado o modo privado restrictivo— solo produce un aviso en la consola (`js/estado.js:166-171`). La interfaz puede seguir funcionando y el usuario puede suponer que su trabajo quedó guardado.

Además, la duración y disponibilidad de `localStorage` al abrir archivos mediante `file://` depende del navegador; no debe darse por garantizada sin una comprobación real.

**Mejora aplicable**

- Hacer que `guardar()` devuelva un resultado de éxito o error y que `confirmar()` lo propague.
- Mostrar una alerta persistente cuando falle el guardado: **“Los cambios solo están en memoria; descargue un respaldo”**.
- Comprobar al inicio si el almacenamiento está disponible y mostrar su estado en Datos.
- Recordar periódicamente la descarga del respaldo cuando existan cambios no exportados, sin bloquear el trabajo.
- Explicar junto a las opciones de respaldo qué datos se conservan localmente y cómo eliminarlos con **Nuevo**.
- Valorar una opción “no conservar datos al cerrar” para equipos compartidos. El cifrado local no sustituye el control de acceso al equipo ni la protección frente a scripts del mismo origen.

**Criterios de aceptación**

- Al simular `QuotaExceededError` o almacenamiento deshabilitado, aparece un aviso visible y sigue disponible la descarga del respaldo.
- Al recargar, el usuario puede distinguir un proyecto recuperado de uno que no pudo guardarse.
- La documentación deja de prometer persistencia idéntica en todos los navegadores y contextos `file://`.

---

### 3. Ofrecer una distribución realmente autónoma y controlar las dependencias externas

**Situación actual**

Tailwind, SheetJS, jsPDF y autoTable se cargan desde tres CDN (`index.html:8` y `index.html:484-486`). Aunque el procesamiento de notas es local, la aplicación necesita esos recursos externos para sus funciones principales y no declara integridad de subrecursos (SRI).

La versión de SheetJS está fijada en `0.18.5` tanto en el CDN como en `package.json`. Debe revisarse y actualizarse desde el canal oficial del proveedor, verificando los avisos de seguridad aplicables, en lugar de asumir que una versión antigua sigue siendo la opción recomendada.

**Mejora aplicable**

1. Incluir localmente las versiones revisadas de Tailwind, SheetJS, jsPDF y autoTable en una carpeta de dependencias distribuibles.
2. Mantener una página de arranque que funcione sin peticiones a CDN y sin necesidad de instalar Node para el usuario final.
3. Si temporalmente se conservan CDN, añadir SRI, `crossorigin` y una política CSP compatible; esto no reemplaza el empaquetado local.
4. Actualizar SheetJS siguiendo la documentación oficial y repetir las pruebas con los libros reales del proyecto.
5. Añadir una comprobación de red que confirme que abrir la distribución no genera solicitudes externas al cargar, analizar o exportar.

**Criterios de aceptación**

- Con la red desactivada se pueden cargar los datos de ejemplo, leer Excel/CSV y generar PDF/Excel.
- No aparecen solicitudes a CDN en las herramientas de red del navegador.
- Los archivos `MATEUNOV0.xlsx`, `ALUMNOMATEuno.xlsx` y `COMPETANCIASporCURSOS.xlsx` conservan los resultados esperados tras actualizar dependencias.

---

## P1 — Corrección funcional y experiencia de uso

### 4. Añadir una vista de confirmación y mapeo al importar planillas

**Situación actual**

La clasificación automática de columnas es amplia, pero necesariamente heurística (`js/lectura.js:144-183`). Una columna numérica desconocida puede convertirse en evaluación o en dato informativo según su contenido. La cabecera solo se busca en las primeras 20 filas (`js/lectura.js:82-89`). Actualmente el usuario revisa avisos después de que los grupos ya fueron agregados.

**Mejora aplicable**

Antes de confirmar la carga, mostrar por archivo y hoja:

- fila detectada como encabezado;
- columna de nombre y documento;
- columnas de grupo, asignatura y docente;
- evaluaciones detectadas y columnas excluidas;
- valores inválidos, documentos repetidos y estudiantes sin notas;
- división prevista en grupos.

Permitir corregir el tipo de columna, elegir otra fila de encabezado y excluir hojas antes de modificar el estado. La detección actual puede conservarse como valor inicial.

**Criterios de aceptación**

- Ningún grupo se crea o actualiza hasta confirmar la vista previa.
- Un ajuste manual de columna cambia las notas y los avisos resultantes.
- Recargar la misma planilla conserva tanto la configuración de evaluaciones como las decisiones manuales de mapeo que sean compatibles.

---

### 5. Eliminar valores fijos de la escala 0–5 en filtros, recomendaciones y gráficos

**Situación actual**

La escala es configurable, pero quedan supuestos propios de 0–5:

- El filtro “Destacados” usa siempre `4.5` (`js/analisis.js:583-592`).
- Las recomendaciones del programa priorizan a quienes necesitan más de `4.0` (`js/programa.js:249-255`), aunque el umbral de riesgo es configurable.
- El histograma utiliza intervalos fijos de `0.5` (`js/analisis.js:493-503`), lo que puede producir demasiadas barras en una escala 0–100.

**Mejora aplicable**

- Derivar “Destacados” del nivel superior configurado por el usuario.
- Calcular el umbral de riesgo alto desde las opciones del grupo correspondiente y expresarlo en la escala activa.
- Elegir el ancho del histograma según el rango y limitar el número de intervalos a una cantidad legible.
- Revisar otros textos y ejemplos para diferenciar valores predeterminados de reglas realmente fijas.

**Criterios de aceptación**

- Los mismos flujos funcionan con escalas 0–5, 0–10 y 0–100 sin umbrales imposibles ni textos contradictorios.
- Cambiar el nivel superior cambia también el filtro rápido.
- Cambiar el umbral de riesgo modifica coherentemente los estados y las recomendaciones.

---

### 6. Hacer más prudentes y comparables las conclusiones del programa

**Situación actual**

El análisis global ya muestra promedios, cantidad de estudiantes y porcentaje evaluado. Sin embargo, califica una brecha igual o superior a `0.5` como “significativa” únicamente por ese umbral (`js/programa.js:206-209`). No es una significancia estadística y la palabra puede inducir a una interpretación incorrecta.

También pueden compararse grupos con distinto porcentaje evaluado o distintas evaluaciones sin que el hallazgo advierta esa limitación junto a la conclusión.

**Mejora aplicable**

- Sustituir “significativa” por “diferencia descriptiva igual o superior al umbral configurado”.
- Mostrar junto a cada comparación: estudiantes con nota, porcentaje evaluado, evaluaciones incluidas y pesos.
- Añadir un aviso de comparabilidad cuando los grupos no tengan evaluaciones o ponderaciones equivalentes.
- Permitir configurar el umbral descriptivo de brecha.
- Si en el futuro se agregan intervalos de confianza o pruebas estadísticas, documentar supuestos, tamaño muestral y método; no presentarlos como simples diferencias de medias.

**Criterios de aceptación**

- Ningún texto afirma significancia estadística sin un cálculo que la sustente.
- Las diferencias entre grupos con coberturas distintas muestran una advertencia visible en pantalla, PDF y Excel.
- Las recomendaciones conservan un lenguaje descriptivo y pedagógico, no causal.

---

### 7. Completar la navegación por teclado y la accesibilidad de diálogos, pestañas y gráficos

**Situación actual**

Hay etiquetas, foco visible, enlace para saltar contenido, cierre con Escape y regiones vivas. Como base es positiva. Faltan, sin embargo:

- asociación completa `tab`/`tabpanel`, `aria-controls`, `aria-labelledby` y navegación con flechas (`index.html:33-49`, `js/app.js:65-77`);
- `aria-modal="true"`, retención del foco con Tab y bloqueo del fondo mientras un diálogo está abierto (`js/utilidades.js:243-279`);
- ordenación accesible mediante botones y estados `aria-sort`, en lugar de depender del clic en `th` (`js/ui-estudiantes.js:105-131`, `js/ui-estudiantes.js:227-235`);
- nombres accesibles y alternativas tabulares o textuales consistentes para los SVG (`js/informes.js:323-382`);
- una preferencia `prefers-reduced-motion` para animaciones de pestañas, diálogos, avisos y carga (`css/style.css`).

**Mejora aplicable**

Implementar el patrón ARIA de pestañas y diálogos, manteniendo la restauración del foco ya existente. Al cerrar un diálogo, devolver el foco al control que lo abrió. No aplicar `aria-hidden` al contenedor que conserva el foco.

**Criterios de aceptación**

- Todas las funciones principales pueden operarse solo con teclado.
- Tab y Shift+Tab permanecen dentro del diálogo activo; Escape cierra y restaura el foco.
- Los lectores de pantalla anuncian pestaña seleccionada, título del diálogo y columna ordenada.
- Una auditoría automática no reporta errores graves de ARIA, nombres o foco; después se realiza una revisión manual.

---

### 8. Unificar el alcance de la vista previa, la impresión y el PDF

**Situación actual**

La vista previa individual está limitada a ocho informes (`MAX_VISTA` en `js/ui-informes.js:10` y `js/ui-informes.js:51-53`). El PDF sí contiene todos, pero **Imprimir vista previa** imprime el DOM limitado (`js/ui-informes.js:136-139`). El aviso en pantalla lo explica, aunque puede sorprender a quien espera imprimir todos los seleccionados.

**Mejora aplicable**

Elegir y comunicar un comportamiento único:

- opción recomendada: generar para impresión todos los modelos seleccionados en un contenedor específico de impresión, manteniendo la vista interactiva paginada;
- alternativa: paginar la vista y ofrecer “Imprimir página actual” e “Imprimir todos” como acciones distintas.

Mostrar antes de imprimir el número total de estudiantes y páginas estimadas.

**Criterios de aceptación**

- Con más de ocho estudiantes, PDF e impresión contienen el mismo conjunto cuando se elige “todos”.
- La vista previa indica claramente qué subconjunto muestra.
- No se duplican informes ni se imprime la interfaz de navegación.

---

### 9. Evitar bloqueos con archivos e informes grandes

**Situación actual**

La lectura de libros, el análisis, el renderizado de tablas y la generación de PDF/Excel se ejecutan principalmente en el hilo de la interfaz. `conCargando()` permite pintar el indicador antes de empezar, pero no divide el trabajo posterior (`js/utilidades.js:223-240`). La generación del PDF recorre todos los modelos sin pausas (`js/informes.js:881-890`).

Además, cada cambio serializa el proyecto completo en `localStorage` (`js/estado.js:166-191`), incluso para filtros, selección y observaciones.

**Mejora aplicable**

1. Medir primero con un proyecto representativo grande y registrar tiempos de lectura, análisis, renderizado y exportación.
2. Validar tamaño y cantidad de archivos antes de leerlos.
3. Mover el parseo intensivo a un Web Worker cuando sea compatible con la distribución local.
4. Ceder el control entre estudiantes o bloques durante PDF/Excel y actualizar progreso real.
5. Paginar o virtualizar las tablas de estudiantes y riesgo.
6. Aplazar escrituras no críticas de `localStorage` y conservar un guardado inmediato al descargar respaldo o salir de una ficha.
7. Precalcular mapas de detalles por evaluación para reducir búsquedas repetidas en el análisis por competencia.

**Criterios de aceptación**

- La pantalla de carga responde y el progreso representa trabajo real.
- Un proyecto de referencia con varios grupos y al menos 1.000 registros puede analizarse y exportarse sin que la interfaz quede congelada prolongadamente.
- No se pierden cambios al introducir escrituras diferidas.

---

### 10. Ampliar las pruebas hacia reglas límite y flujos reales de navegador

**Situación actual**

Las 19 pruebas actuales cubren lectura real de archivos, cálculos, filtros, catálogo, respaldo, análisis del programa, modelos HTML y estructura de Excel. No ejercitan los controladores DOM, los eventos, la descarga real de PDF, la impresión ni la disponibilidad sin red.

**Mejora aplicable**

**Pruebas unitarias adicionales:**

- escalas 0–10 y 0–100;
- todos los pesos en cero, pesos distintos de 100 y periodo cerrado;
- evaluaciones completamente vacías y estudiantes con solo NP;
- respaldos corruptos, campos con tipos incorrectos y cancelación de importación;
- competencias duplicadas, referencias inexistentes y documentos repetidos entre grupos;
- caracteres no Latin-1 en nombres y observaciones;
- criterios de comparabilidad entre grupos.

**Pruebas de extremo a extremo en navegador:**

1. cargar datos de ejemplo y cambiar de grupo;
2. importar una planilla, revisar mapeo y modificar pesos;
3. filtrar, seleccionar y escribir una observación;
4. recargar y comprobar persistencia;
5. descargar PDF y Excel, abrir los archivos generados y verificar contenido;
6. imprimir más de ocho estudiantes;
7. abrir y cancelar un respaldo sin alterar el proyecto;
8. repetir el flujo principal sin conexión y con teclado.

**Criterios de aceptación**

- `npm test` conserva las pruebas actuales y añade los casos límite.
- Existe un comando repetible para las pruebas de navegador.
- Los PDF se validan tanto por número de páginas y texto como por una revisión visual de cortes, tablas y caracteres.

---

## P2 — Robustez y mantenimiento

### 11. Conservar Unicode en los PDF

**Situación actual**

`txt()` elimina caracteres fuera del rango admitido por las fuentes estándar (`js/informes.js:478-480`). Esto afecta nombres u observaciones con alfabetos no latinos y algunos símbolos. Las tildes y la ñ propias del español sí están contempladas por Latin-1.

**Mejora aplicable**

Incorporar una fuente Unicode con licencia distribuible, como Noto Sans, en jsPDF y registrar sus variantes normal, negrita e itálica. Mantener `txt()` solo para incompatibilidades que sigan siendo necesarias, no como sustituto de una fuente adecuada.

**Criterios de aceptación**

- Los PDF conservan nombres en español, caracteres no latinos y símbolos utilizados en los informes.
- La fuente queda incluida en la distribución sin conexión.
- Se revisa el impacto en tamaño del archivo y tiempo de generación.

---

### 12. Detectar posibles estudiantes duplicados entre grupos sin fusionarlos automáticamente

**Situación actual**

Los documentos repetidos dentro de una hoja reciben un sufijo (`js/lectura.js:187-197`). El análisis del programa suma los resultados de todos los grupos (`js/programa.js:79-103`), por lo que una misma persona cargada en dos grupos cuenta como dos registros. Esto puede ser correcto si representa dos matrículas, pero debe quedar claro.

**Mejora aplicable**

- Informar coincidencias de documento entre grupos y mostrar nombre y origen.
- Permitir marcar si el total representa **matrículas** o **personas únicas**, solo si existe una regla de deduplicación explícita.
- No unir grupos ni eliminar registros automáticamente.
- Añadir una revisión de nombres similares únicamente como sugerencia; el documento debe ser la clave principal.

**Criterios de aceptación**

- Las coincidencias aparecen como aviso antes de consolidar el programa.
- Las cifras indican si cuentan matrículas o personas únicas.
- La deduplicación, si se habilita, es reversible y queda documentada en PDF y Excel.

---

### 13. Reducir deuda técnica sin cambiar innecesariamente la arquitectura

**Situación actual**

La modularización actual es suficiente para el proyecto; no hace falta migrar a un framework. Sí hay oportunidades concretas:

- `js/informes.js` concentra modelos, HTML, SVG, PDF y Excel en más de mil líneas.
- `js/main.js`, `js/main.js.backup` e `index.html.backup` pertenecen a versiones anteriores y no se cargan desde el `index.html` actual.
- `mejorasRecomendadas.md` analiza una versión antigua y contiene pendientes ya resueltos; puede confundir futuras revisiones.
- No hay un archivo de bloqueo de dependencias ni una tarea de análisis estático en `package.json`.

**Mejora aplicable**

1. Separar `informes.js` en modelos, renderizado HTML/SVG, PDF y Excel, conservando la API durante la transición.
2. Mover el código histórico a `docs/historial/` o retirarlo después de confirmar que no se usa; no mantener dos fuentes aparentemente activas.
3. Rotular `mejorasRecomendadas.md` como análisis histórico y usar este documento para la versión 4.
4. Incorporar un lockfile y una configuración mínima de lint para los módulos actuales.
5. Actualizar README y manual cuando cambien importación, almacenamiento, impresión o funcionamiento sin conexión.

**Criterios de aceptación**

- La división de informes no altera HTML, PDF ni Excel.
- El arranque ya no depende de archivos heredados ambiguos.
- Las pruebas y el lint pueden ejecutarse con comandos documentados y reproducibles.

---

## Orden recomendado de implementación

### Etapa 1 — Protección del trabajo

1. Validación y confirmación de respaldos.
2. Avisos reales de fallo de guardado.
3. Dependencias locales y actualización controlada.
4. Pruebas de regresión para estos tres puntos.

### Etapa 2 — Fiabilidad académica e importación

1. Vista previa y mapeo de planillas.
2. Eliminación de valores fijos de escala.
3. Advertencias de comparabilidad y lenguaje descriptivo.
4. Nuevas pruebas unitarias de límites.

### Etapa 3 — Experiencia completa

1. Accesibilidad de pestañas, diálogos y tablas.
2. Impresión coherente con PDF.
3. Rendimiento con proyectos grandes.
4. Unicode y aviso de duplicados.

### Etapa 4 — Mantenimiento continuo

1. Pruebas de navegador integradas al flujo de desarrollo.
2. Separación progresiva de informes.
3. Limpieza de archivos históricos, lockfile y lint.
4. Actualización del manual con cada cambio visible.

## Mejoras que no es necesario volver a plantear

Para evitar duplicar el informe histórico, estos elementos ya están presentes en la versión revisada:

- arquitectura separada por responsabilidades;
- escape de datos en las plantillas HTML actuales;
- delegación de eventos, sin dependencia de `onclick` inline en la interfaz activa;
- mapeo dinámico de columnas;
- validación de pesos y escala;
- notificaciones, diálogos de confirmación y pantalla de carga;
- persistencia y respaldo JSON;
- análisis de varios grupos;
- pruebas automáticas de cálculo y lectura.

La prioridad inmediata no es reescribir la aplicación, sino **impedir la pérdida silenciosa de datos, hacer el paquete autónomo y verificar en navegador el flujo completo de importación, análisis e informes**.
