/**
 * Generador de Reportes por Competencias
 * Version 2.0.0 - Refactorizado con mejoras de seguridad y arquitectura
 */

// ==================== CONFIGURACIÓN ====================
const CONFIG = {
    VALIDACION: {
        NOTA_MIN: 0,
        NOTA_MAX: 5,
        PORCENTAJE_TOTAL: 100
    },
    EVALUACIONES: {
        MAX_PARCIALES: 4,
        MAX_QUICES: 5,
        PORCENTAJE_PARCIAL_DEFAULT: 50,  // Ajustado para 1P por defecto
        PORCENTAJE_QUIZ_DEFAULT: 50      // Ajustado para 1Q por defecto
    },
    EXCEL: {
        COLUMNAS_REQUERIDAS: ['Nombres y Apellidos']
    }
};

// ==================== VALIDADORES ====================
class Validators {
    static validarArchivo(file) {
        if (!file) {
            throw new Error('No se ha seleccionado ningún archivo');
        }

        const extension = file.name.split('.').pop().toLowerCase();
        if (!['xlsx', 'xls'].includes(extension)) {
            throw new Error('El archivo debe ser Excel (.xlsx o .xls)');
        }

        return true;
    }

    static validarDatosExcel(jsonData) {
        if (!Array.isArray(jsonData) || jsonData.length === 0) {
            throw new Error('El archivo Excel está vacío o tiene formato inválido');
        }

        if (jsonData.length < 2) {
            throw new Error('El archivo debe contener al menos un encabezado y una fila de datos');
        }

        const headers = jsonData[0];
        const columnasNoEncontradas = [];

        CONFIG.EXCEL.COLUMNAS_REQUERIDAS.forEach(columna => {
            if (!headers.includes(columna)) {
                columnasNoEncontradas.push(columna);
            }
        });

        if (columnasNoEncontradas.length > 0) {
            throw new Error(`Columnas requeridas no encontradas: ${columnasNoEncontradas.join(', ')}`);
        }

        return true;
    }

    static validarNota(nota) {
        const notaNum = parseFloat(nota);
        if (isNaN(notaNum)) {
            throw new Error('La nota debe ser un número válido');
        }
        if (notaNum < CONFIG.VALIDACION.NOTA_MIN || notaNum > CONFIG.VALIDACION.NOTA_MAX) {
            throw new Error(`La nota debe estar entre ${CONFIG.VALIDACION.NOTA_MIN} y ${CONFIG.VALIDACION.NOTA_MAX}`);
        }
        return notaNum;
    }

    static validarPorcentajes(numParciales, numQuices, mostrarAdvertencia = true) {
        let total = 0;

        for (let i = 1; i <= numParciales; i++) {
            const input = document.getElementById(`${i}PPorcentaje`);
            if (input) {
                total += parseFloat(input.value) || 0;
            }
        }

        for (let i = 1; i <= numQuices; i++) {
            const input = document.getElementById(`Q${i}Porcentaje`);
            if (input) {
                total += parseFloat(input.value) || 0;
            }
        }

        // Si no suma 100%, mostrar advertencia pero permitir continuar
        if (Math.abs(total - CONFIG.VALIDACION.PORCENTAJE_TOTAL) > 0.01) {
            if (mostrarAdvertencia) {
                const mensaje = `ADVERTENCIA: Los porcentajes suman ${total.toFixed(2)}% (no 100%).\n\n¿Desea continuar de todas formas?`;
                if (!confirm(mensaje)) {
                    throw new Error('Operación cancelada por el usuario');
                }
            }
            console.warn(`Porcentajes suman ${total.toFixed(2)}% en lugar de 100%`);
        }

        return true;
    }
}

// ==================== MAPEADOR DE EXCEL ====================
class ExcelMapper {
    constructor(headers) {
        this.headers = headers;
        this.columnIndexes = this.mapearColumnas(headers);
    }

    mapearColumnas(headers) {
        const indexes = {
            id: 0, // Asumimos que la primera columna es el ID
            nombre: headers.indexOf('Nombres y Apellidos')
        };

        // Mapear columnas de evaluaciones dinámicamente
        headers.forEach((header, index) => {
            if (index > 1) { // Columnas después de ID y Nombre
                indexes[header] = index;
            }
        });

        return indexes;
    }

    obtenerValor(row, columna) {
        const index = this.columnIndexes[columna];
        if (index === undefined || index === -1) {
            return null;
        }
        return row[index];
    }

    obtenerNota(row, evaluacion) {
        // Buscar la columna correspondiente a la evaluación
        const index = this.columnIndexes[evaluacion];
        if (index === undefined || index === -1) {
            return 0;
        }
        return parseFloat(row[index]) || 0;
    }

    obtenerID(row) {
        return this.obtenerValor(row, 'id');
    }

    obtenerNombre(row) {
        return this.obtenerValor(row, 'nombre');
    }
}

// ==================== CALCULADORES ====================
class Calculators {
    static calcularNotaAcumulada(estudiante, evaluaciones, excelMapper) {
        let notaTotal = 0;

        evaluaciones.forEach(ev => {
            const porcentaje = this.obtenerPorcentajeEvaluacion(ev) / 100;
            const nota = excelMapper.obtenerNota(estudiante, ev);
            notaTotal += (nota * porcentaje);
        });

        return notaTotal;
    }

    static obtenerPorcentajeEvaluacion(evaluacion) {
        const input = document.getElementById(`${evaluacion}Porcentaje`);
        return parseFloat(input?.value || 0);
    }

    static compararNota(notaEstudiante, valorComparacion, tipoComparacion) {
        switch (tipoComparacion) {
            case 'lt':
                return notaEstudiante < valorComparacion;
            case 'lte':
                return notaEstudiante <= valorComparacion;
            case 'gt':
                return notaEstudiante > valorComparacion;
            case 'gte':
                return notaEstudiante >= valorComparacion;
            case 'eq':
                return Math.abs(notaEstudiante - valorComparacion) < 0.01;
            default:
                return false;
        }
    }
}

// ==================== UTILIDADES DOM ====================
class DOMHelpers {
    static crearElemento(tag, atributos = {}, contenido = '') {
        const elemento = document.createElement(tag);

        Object.keys(atributos).forEach(key => {
            if (key === 'className') {
                elemento.className = atributos[key];
            } else if (key === 'textContent') {
                elemento.textContent = atributos[key];
            } else {
                elemento.setAttribute(key, atributos[key]);
            }
        });

        if (contenido && typeof contenido === 'string') {
            elemento.textContent = contenido;
        }

        return elemento;
    }

    static limpiarContenedor(elemento) {
        while (elemento.firstChild) {
            elemento.removeChild(elemento.firstChild);
        }
    }

    static sanitizarTexto(texto) {
        const div = document.createElement('div');
        div.textContent = texto;
        return div.innerHTML;
    }

    static mostrarError(mensaje) {
        alert(`Error: ${mensaje}`);
    }

    static mostrarExito(mensaje) {
        alert(mensaje);
    }
}

// ==================== CLASE PRINCIPAL ====================
class ReporteCompetencias {
    constructor() {
        // Estado de la aplicación
        this.workbook = null;
        this.workbookCompetencias = null; // Nuevo: workbook de competencias
        this.excelMapper = null;
        this.evaluacionActual = '';
        this.competenciasSeleccionadas = {};
        this.estudiantesData = [];
        this.criteriosCounter = 1; // Contador para IDs únicos de criterios

        // Inicializar
        this.inicializar();
    }

    // ========== INICIALIZACIÓN ==========
    inicializar() {
        this.configurarEventListeners();
        this.configurarCriterioInicial();
        this.actualizarEvaluaciones();
    }

    configurarEventListeners() {
        // Carga de archivo
        const fileInput = document.getElementById('excel-file');
        fileInput.addEventListener('change', () => this.cargarArchivoExcel());

        // Selección de hoja
        const seleccionHoja = document.getElementById('seleccion-hoja');
        seleccionHoja.addEventListener('change', () => this.mostrarListaEstudiantes());

        // Botón actualizar evaluaciones (manual)
        const btnActualizarEvaluaciones = document.getElementById('btn-actualizar-evaluaciones');
        if (btnActualizarEvaluaciones) {
            btnActualizarEvaluaciones.addEventListener('click', () => this.actualizarEvaluaciones());
        }

        // Botones principales (se configurarán después de crear el HTML)
        this.configurarBotonesGlobales();
    }

    configurarBotonesGlobales() {
        // Botón procesar archivo (ya configurado en carga de archivo)
        const btnProcesarArchivo = document.getElementById('btn-procesar-archivo');
        if (btnProcesarArchivo) {
            btnProcesarArchivo.addEventListener('click', () => this.cargarArchivoExcel());
        }

        // Botón cargar competencias
        const btnCargarCompetencias = document.getElementById('btn-cargar-competencias');
        if (btnCargarCompetencias) {
            btnCargarCompetencias.addEventListener('click', () => this.cargarArchivoCompetencias());
        }

        // Botones de selección de estudiantes
        const btnSeleccionarTodos = document.getElementById('btn-seleccionar-todos');
        if (btnSeleccionarTodos) {
            btnSeleccionarTodos.addEventListener('click', () => this.selectAllStudents());
        }

        const btnDeseleccionarTodos = document.getElementById('btn-deseleccionar-todos');
        if (btnDeseleccionarTodos) {
            btnDeseleccionarTodos.addEventListener('click', () => this.deselectAllStudents());
        }

        const btnGenerarReporteEstudiante = document.getElementById('btn-generar-reporte-estudiante');
        if (btnGenerarReporteEstudiante) {
            btnGenerarReporteEstudiante.addEventListener('click', () => this.generarReportePorEstudiante());
        }

        // Botón de filtrado por evaluación (múltiples criterios)
        const btnGenerarReporteEvaluacion = document.getElementById('btn-generar-reporte-evaluacion');
        if (btnGenerarReporteEvaluacion) {
            btnGenerarReporteEvaluacion.addEventListener('click', () => this.generarReportePorEvaluacionMultiple());
        }

        // Botones de criterios múltiples
        const btnAgregarCriterio = document.getElementById('btn-agregar-criterio');
        if (btnAgregarCriterio) {
            btnAgregarCriterio.addEventListener('click', () => this.agregarCriterio());
        }

        const btnLimpiarCriterios = document.getElementById('btn-limpiar-criterios');
        if (btnLimpiarCriterios) {
            btnLimpiarCriterios.addEventListener('click', () => this.limpiarCriterios());
        }

        const btnGenerarReporteSeleccionados = document.getElementById('btn-generar-reporte-seleccionados');
        if (btnGenerarReporteSeleccionados) {
            btnGenerarReporteSeleccionados.addEventListener('click', () => this.generarReporteParaSeleccionados());
        }

        // Botones para lista filtrada
        const btnSeleccionarTodosFiltrados = document.getElementById('btn-seleccionar-todos-filtrados');
        if (btnSeleccionarTodosFiltrados) {
            btnSeleccionarTodosFiltrados.addEventListener('click', () => this.seleccionarTodosFiltrados());
        }

        const btnDeseleccionarTodosFiltrados = document.getElementById('btn-deseleccionar-todos-filtrados');
        if (btnDeseleccionarTodosFiltrados) {
            btnDeseleccionarTodosFiltrados.addEventListener('click', () => this.deseleccionarTodosFiltrados());
        }

        // Botones del modal popup
        const btnAplicarSeleccion = document.getElementById('btn-aplicar-seleccion');
        if (btnAplicarSeleccion) {
            btnAplicarSeleccion.addEventListener('click', () => this.aplicarSeleccion());
        }

        const btnCerrarPopup = document.getElementById('btn-cerrar-popup');
        if (btnCerrarPopup) {
            btnCerrarPopup.addEventListener('click', () => this.cerrarPopupExcel());
        }

        // Botón descargar PDF
        const btnDescargarPDF = document.getElementById('btn-descargar-pdf');
        if (btnDescargarPDF) {
            btnDescargarPDF.addEventListener('click', () => this.descargarPDF());
        }
    }

    configurarCriterioInicial() {
        // Configurar event listeners para el criterio inicial cargado desde HTML
        const criterioInicial = document.querySelector('.criterio-row');
        if (criterioInicial) {
            // Configurar listener para el botón eliminar
            const btnEliminar = criterioInicial.querySelector('.btn-remove-criterio');
            if (btnEliminar) {
                btnEliminar.addEventListener('click', (e) => {
                    e.preventDefault();
                    this.eliminarCriterio(criterioInicial);
                });
            }

            // Configurar listeners para inputs y selects del criterio inicial
            const inputs = criterioInicial.querySelectorAll('select, input');
            inputs.forEach(input => {
                input.addEventListener('change', () => this.actualizarResumenCriterios());
            });
        }

        // Configurar listener para el operador lógico
        const operadorLogico = document.getElementById('operador-logico');
        if (operadorLogico) {
            operadorLogico.addEventListener('change', () => this.actualizarResumenCriterios());
        }
    }

    // ========== CARGA DE ARCHIVO ==========
    cargarArchivoExcel() {
        console.log('cargarArchivoExcel called');
        const fileInput = document.getElementById('excel-file');
        const file = fileInput.files[0];

        try {
            Validators.validarArchivo(file);
        } catch (error) {
            DOMHelpers.mostrarError(error.message);
            return;
        }

        const progressBarContainer = document.getElementById('progress-bar-container');
        const progressBar = document.getElementById('progress-bar');
        progressBarContainer.classList.remove('hidden');

        const reader = new FileReader();
        let progress = 0;
        const interval = setInterval(() => {
            progress += 10;
            progressBar.style.width = progress + '%';
            progressBar.textContent = progress + '%';
            if (progress >= 100) {
                clearInterval(interval);
            }
        }, 100);

        reader.onload = (e) => {
            console.log('File loaded');
            clearInterval(interval);
            progressBar.style.width = '100%';
            progressBar.textContent = '100%';

            try {
                const data = new Uint8Array(e.target.result);
                this.workbook = XLSX.read(data, {type: 'array'});
                console.log('Workbook created:', this.workbook);
                this.actualizarSeleccionHoja();
                DOMHelpers.mostrarExito('Archivo cargado exitosamente');
            } catch (error) {
                console.error('Error processing Excel file:', error);
                DOMHelpers.mostrarError('Error al procesar el archivo Excel');
            }

            setTimeout(() => {
                progressBarContainer.classList.add('hidden');
            }, 500);
        };

        reader.onerror = () => {
            clearInterval(interval);
            DOMHelpers.mostrarError('Error al leer el archivo');
            progressBarContainer.classList.add('hidden');
        };

        reader.readAsArrayBuffer(file);
    }

    cargarArchivoCompetencias() {
        console.log('cargarArchivoCompetencias called');
        const fileInput = document.getElementById('competencias-file');
        const file = fileInput.files[0];

        try {
            Validators.validarArchivo(file);
        } catch (error) {
            DOMHelpers.mostrarError(error.message);
            return;
        }

        const statusDiv = document.getElementById('competencias-status');
        statusDiv.textContent = 'Cargando archivo de competencias...';
        statusDiv.style.color = '#007BFF';

        const reader = new FileReader();

        reader.onload = (e) => {
            console.log('Competencias file loaded');

            try {
                const data = new Uint8Array(e.target.result);
                this.workbookCompetencias = XLSX.read(data, {type: 'array'});
                console.log('Workbook competencias created:', this.workbookCompetencias);
                this.actualizarSeleccionHojaCompetencias();

                statusDiv.textContent = '✓ Archivo de competencias cargado exitosamente';
                statusDiv.style.color = '#28a745';

                DOMHelpers.mostrarExito('Archivo de competencias cargado exitosamente');
            } catch (error) {
                console.error('Error processing competencias file:', error);
                statusDiv.textContent = '✗ Error al cargar archivo de competencias';
                statusDiv.style.color = '#dc3545';
                DOMHelpers.mostrarError('Error al procesar el archivo de competencias');
            }
        };

        reader.onerror = () => {
            statusDiv.textContent = '✗ Error al leer el archivo';
            statusDiv.style.color = '#dc3545';
            DOMHelpers.mostrarError('Error al leer el archivo de competencias');
        };

        reader.readAsArrayBuffer(file);
    }

    actualizarSeleccionHojaCompetencias() {
        console.log('actualizarSeleccionHojaCompetencias called');
        const seleccionHoja = document.getElementById('seleccion-hoja-competencias');
        DOMHelpers.limpiarContenedor(seleccionHoja);

        const optionDefault = DOMHelpers.crearElemento('option', {
            value: '',
            textContent: 'Seleccione una hoja'
        });
        seleccionHoja.appendChild(optionDefault);

        if (this.workbookCompetencias && this.workbookCompetencias.SheetNames) {
            console.log('Competencias sheet names:', this.workbookCompetencias.SheetNames);
            this.workbookCompetencias.SheetNames.forEach(sheetName => {
                const option = DOMHelpers.crearElemento('option', {
                    value: sheetName,
                    textContent: sheetName
                });
                seleccionHoja.appendChild(option);
            });
        }
    }

    actualizarSeleccionHoja() {
        console.log('actualizarSeleccionHoja called');
        const seleccionHoja = document.getElementById('seleccion-hoja');
        DOMHelpers.limpiarContenedor(seleccionHoja);

        const optionDefault = DOMHelpers.crearElemento('option', {
            value: '',
            textContent: 'Seleccione una hoja'
        });
        seleccionHoja.appendChild(optionDefault);

        if (this.workbook && this.workbook.SheetNames) {
            console.log('Sheet names:', this.workbook.SheetNames);
            this.workbook.SheetNames.forEach(sheetName => {
                const option = DOMHelpers.crearElemento('option', {
                    value: sheetName,
                    textContent: sheetName
                });
                seleccionHoja.appendChild(option);
            });
        }
    }

    mostrarListaEstudiantes() {
        console.log('mostrarListaEstudiantes called');
        const sheetName = document.getElementById('seleccion-hoja').value;
        console.log('Selected sheet:', sheetName);

        const studentList = document.getElementById('student-list');

        if (!sheetName) {
            DOMHelpers.limpiarContenedor(studentList);
            return;
        }

        try {
            const worksheet = this.workbook.Sheets[sheetName];
            const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

            // Validar datos
            Validators.validarDatosExcel(jsonData);

            this.estudiantesData = jsonData;
            this.excelMapper = new ExcelMapper(jsonData[0]);
            console.log('Sheet data:', jsonData);

            DOMHelpers.limpiarContenedor(studentList);

            const ul = document.createElement('ul');
            jsonData.slice(1).forEach(row => {
                const nombre = this.excelMapper.obtenerNombre(row);
                if (nombre) {
                    const li = DOMHelpers.crearElemento('li', {
                        textContent: nombre
                    });
                    ul.appendChild(li);
                }
            });

            studentList.appendChild(ul);
            this.actualizarSeleccionEstudiante(jsonData);

        } catch (error) {
            console.error('Error displaying student list:', error);
            DOMHelpers.mostrarError(error.message);
        }
    }

    actualizarSeleccionEstudiante(data) {
        const seleccionEstudiante = document.getElementById('seleccion-estudiante');
        DOMHelpers.limpiarContenedor(seleccionEstudiante);

        data.slice(1).forEach(row => {
            const id = this.excelMapper.obtenerID(row);
            const nombre = this.excelMapper.obtenerNombre(row);

            if (id && nombre) {
                const option = DOMHelpers.crearElemento('option', {
                    value: id,
                    textContent: nombre
                });
                seleccionEstudiante.appendChild(option);
            }
        });
    }

    // ========== CONFIGURACIÓN DE EVALUACIONES ==========
    actualizarEvaluaciones() {
        console.log('actualizarEvaluaciones function called');
        const numParciales = parseInt(document.getElementById('num-parciales').value);
        const numQuices = parseInt(document.getElementById('num-quices').value);
        console.log('numParciales:', numParciales, 'numQuices:', numQuices);

        const seleccionDiv = document.getElementById('seleccion-competencias');

        DOMHelpers.limpiarContenedor(seleccionDiv);

        // Almacenar evaluaciones para usar en criterios
        this.evaluacionesDisponibles = [];

        // Crear tabla
        const table = document.createElement('table');
        const thead = document.createElement('thead');
        const headerRow = document.createElement('tr');

        const headers = ['Evaluación', 'Competencias', 'Páginas Web', 'Videos', 'Ejercicios', 'Herramientas', 'Porcentaje (%)'];
        headers.forEach(headerText => {
            const th = DOMHelpers.crearElemento('th', {
                textContent: headerText
            });
            headerRow.appendChild(th);
        });

        thead.appendChild(headerRow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');

        // Agregar parciales
        for (let i = 1; i <= numParciales; i++) {
            const parcialName = `${i}P`;
            this.evaluacionesDisponibles.push(parcialName);
            const row = this.crearFilaEvaluacion(parcialName, CONFIG.EVALUACIONES.PORCENTAJE_PARCIAL_DEFAULT);
            tbody.appendChild(row);
        }

        // Agregar quices
        for (let i = 1; i <= numQuices; i++) {
            const quizId = `Q${i}`;
            this.evaluacionesDisponibles.push(quizId);
            const row = this.crearFilaEvaluacion(quizId, CONFIG.EVALUACIONES.PORCENTAJE_QUIZ_DEFAULT);
            tbody.appendChild(row);
        }

        table.appendChild(tbody);
        seleccionDiv.appendChild(table);

        // Actualizar selectores de criterios
        this.actualizarSelectorCriterios();
    }

    crearFilaEvaluacion(nombre, porcentajeDefault) {
        const tr = document.createElement('tr');

        // Columna de nombre
        const tdNombre = DOMHelpers.crearElemento('td', {
            textContent: nombre
        });
        tr.appendChild(tdNombre);

        // Botones de selección
        const tiposRecursos = ['', 'Web', 'Video', 'Ejercicios', 'Herramientas'];
        tiposRecursos.forEach(tipo => {
            const td = document.createElement('td');
            const button = document.createElement('button');
            const tipoCompleto = nombre + tipo;

            button.textContent = tipo ? `Seleccionar ${tipo}` : 'Seleccionar Competencias';
            button.dataset.evaluacion = tipoCompleto;

            // Usar addEventListener en lugar de onclick
            button.addEventListener('click', () => {
                this.seleccionarCompetencias(tipoCompleto);
            });

            td.appendChild(button);
            tr.appendChild(td);
        });

        // Input de porcentaje
        const tdPorcentaje = document.createElement('td');
        const inputPorcentaje = DOMHelpers.crearElemento('input', {
            type: 'number',
            id: `${nombre}Porcentaje`,
            min: '0',
            max: '100',
            value: porcentajeDefault.toString()
        });
        tdPorcentaje.appendChild(inputPorcentaje);
        tr.appendChild(tdPorcentaje);

        return tr;
    }

    // ========== SELECCIÓN DE COMPETENCIAS ==========
    seleccionarCompetencias(tipo) {
        this.evaluacionActual = tipo;

        // Determinar qué archivo usar: competencias (si está cargado) o estudiantes
        let workbookAUsar = null;
        let sheetName = '';

        if (this.workbookCompetencias) {
            // Usar archivo de competencias
            workbookAUsar = this.workbookCompetencias;
            sheetName = document.getElementById('seleccion-hoja-competencias').value;

            if (!sheetName) {
                DOMHelpers.mostrarError('Por favor, seleccione una hoja del archivo de competencias');
                return;
            }
        } else if (this.workbook) {
            // Usar archivo de estudiantes
            workbookAUsar = this.workbook;
            sheetName = document.getElementById('seleccion-hoja').value;

            if (!sheetName) {
                DOMHelpers.mostrarError('Por favor, seleccione una hoja de Excel o cargue un archivo de competencias');
                return;
            }
        } else {
            DOMHelpers.mostrarError('Por favor, cargue un archivo Excel o un archivo de competencias');
            return;
        }

        const worksheet = workbookAUsar.Sheets[sheetName];
        const jsonData = XLSX.utils.sheet_to_json(worksheet, {header: 1});

        // IMPORTANTE: NO sobrescribir estudiantesData aquí
        // estudiantesData debe mantener los datos de estudiantes siempre
        this.mostrarContenidoExcel(jsonData);
    }

    mostrarContenidoExcel(data) {
        const excelContent = document.getElementById('excel-content');
        DOMHelpers.limpiarContenedor(excelContent);

        const table = document.createElement('table');

        data.forEach((row, rowIndex) => {
            const tr = document.createElement('tr');

            row.forEach((cell, cellIndex) => {
                const td = document.createElement('td');
                td.className = 'excel-cell';
                td.textContent = cell || '';
                td.dataset.row = rowIndex;
                td.dataset.cell = cellIndex;

                // Usar addEventListener en lugar de onclick
                td.addEventListener('click', () => {
                    this.toggleSeleccionCelda(td);
                });

                tr.appendChild(td);
            });

            table.appendChild(tr);
        });

        excelContent.appendChild(table);
        document.getElementById('excel-popup').style.display = 'block';
    }

    toggleSeleccionCelda(cell) {
        cell.classList.toggle('selected');
    }

    aplicarSeleccion() {
        const selectedCells = document.querySelectorAll('#excel-content .selected');
        const competencias = Array.from(selectedCells).map(cell => cell.textContent);
        this.competenciasSeleccionadas[this.evaluacionActual] = competencias;
        this.actualizarBotonesCompetencias(this.evaluacionActual, competencias);
        this.cerrarPopupExcel();
    }

    cerrarPopupExcel() {
        document.getElementById('excel-popup').style.display = 'none';
    }

    actualizarBotonesCompetencias(tipo, competencias) {
        const boton = document.querySelector(`button[data-evaluacion="${tipo}"]`);
        if (boton) {
            const tipoBase = tipo.replace(/Web|Video|Ejercicios|Herramientas/g, '');
            const nombreRecurso = tipo.replace(tipoBase, '') || 'Competencias';
            boton.textContent = `${nombreRecurso} (${competencias.length})`;
            boton.title = competencias.join(', ');
        }
    }

    // ========== MANEJO DE CRITERIOS MÚLTIPLES ==========
    actualizarSelectorCriterios() {
        // Actualizar todos los selectores de evaluación en criterios
        const selectores = document.querySelectorAll('.criterio-evaluacion');
        selectores.forEach(select => {
            const valorActual = select.value;
            DOMHelpers.limpiarContenedor(select);

            const optionDefault = DOMHelpers.crearElemento('option', {
                value: '',
                textContent: 'Seleccione evaluación'
            });
            select.appendChild(optionDefault);

            if (this.evaluacionesDisponibles) {
                this.evaluacionesDisponibles.forEach(ev => {
                    const option = DOMHelpers.crearElemento('option', {
                        value: ev,
                        textContent: ev
                    });
                    select.appendChild(option);
                });
            }

            // Restaurar valor si existía
            if (valorActual) {
                select.value = valorActual;
            }
        });

        this.actualizarResumenCriterios();
    }

    agregarCriterio() {
        this.criteriosCounter++;
        const container = document.getElementById('criterios-container');

        const criterioRow = document.createElement('div');
        criterioRow.className = 'criterio-row';
        criterioRow.dataset.criterioId = this.criteriosCounter;

        criterioRow.innerHTML = `
            <div class="criterio-number">Criterio ${this.criteriosCounter}</div>
            <div class="criterio-controls">
                <div class="filter-item">
                    <label>Evaluación:</label>
                    <select class="criterio-evaluacion">
                        <option value="">Seleccione evaluación</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label>Comparación:</label>
                    <select class="criterio-comparacion">
                        <option value="lt">Menor que (&lt;)</option>
                        <option value="lte">Menor o igual (≤)</option>
                        <option value="gt">Mayor que (&gt;)</option>
                        <option value="gte">Mayor o igual (≥)</option>
                        <option value="eq">Igual que (=)</option>
                    </select>
                </div>

                <div class="filter-item">
                    <label>Valor de Nota:</label>
                    <input type="number" class="criterio-valor" min="0" max="5" step="0.1" placeholder="0.0 - 5.0">
                </div>

                <div class="filter-item">
                    <button class="btn-remove-criterio" title="Eliminar este criterio">❌</button>
                </div>
            </div>
        `;

        container.appendChild(criterioRow);

        // Configurar event listener para botón eliminar
        const btnEliminar = criterioRow.querySelector('.btn-remove-criterio');
        btnEliminar.addEventListener('click', (e) => {
            e.preventDefault();
            this.eliminarCriterio(criterioRow);
        });

        // Configurar event listeners para actualizar resumen
        const inputs = criterioRow.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.actualizarResumenCriterios());
        });

        // Actualizar selector con evaluaciones disponibles
        this.actualizarSelectorCriterios();
    }

    eliminarCriterio(criterioRow) {
        const container = document.getElementById('criterios-container');
        const criterios = container.querySelectorAll('.criterio-row');

        if (criterios.length <= 1) {
            DOMHelpers.mostrarError('Debe mantener al menos un criterio');
            return;
        }

        criterioRow.remove();
        this.renumerarCriterios();
        this.actualizarResumenCriterios();
    }

    renumerarCriterios() {
        const criterios = document.querySelectorAll('.criterio-row');
        criterios.forEach((criterio, index) => {
            const numero = criterio.querySelector('.criterio-number');
            numero.textContent = `Criterio ${index + 1}`;
        });
    }

    limpiarCriterios() {
        const container = document.getElementById('criterios-container');
        DOMHelpers.limpiarContenedor(container);

        this.criteriosCounter = 1;

        // Agregar un criterio por defecto
        container.innerHTML = `
            <div class="criterio-row" data-criterio-id="1">
                <div class="criterio-number">Criterio 1</div>
                <div class="criterio-controls">
                    <div class="filter-item">
                        <label>Evaluación:</label>
                        <select class="criterio-evaluacion">
                            <option value="">Seleccione evaluación</option>
                        </select>
                    </div>

                    <div class="filter-item">
                        <label>Comparación:</label>
                        <select class="criterio-comparacion">
                            <option value="lt">Menor que (&lt;)</option>
                            <option value="lte">Menor o igual (≤)</option>
                            <option value="gt">Mayor que (&gt;)</option>
                            <option value="gte">Mayor o igual (≥)</option>
                            <option value="eq">Igual que (=)</option>
                        </select>
                    </div>

                    <div class="filter-item">
                        <label>Valor de Nota:</label>
                        <input type="number" class="criterio-valor" min="0" max="5" step="0.1" placeholder="0.0 - 5.0">
                    </div>

                    <div class="filter-item">
                        <button class="btn-remove-criterio" title="Eliminar este criterio">❌</button>
                    </div>
                </div>
            </div>
        `;

        // Configurar event listeners
        const btnEliminar = container.querySelector('.btn-remove-criterio');
        btnEliminar.addEventListener('click', (e) => {
            e.preventDefault();
            const criterioRow = e.target.closest('.criterio-row');
            this.eliminarCriterio(criterioRow);
        });

        // Configurar listeners para cambios en inputs
        const criterioRow = container.querySelector('.criterio-row');
        const inputs = criterioRow.querySelectorAll('select, input');
        inputs.forEach(input => {
            input.addEventListener('change', () => this.actualizarResumenCriterios());
        });

        this.actualizarSelectorCriterios();
    }

    obtenerCriterios() {
        const criteriosRows = document.querySelectorAll('.criterio-row');
        const criterios = [];

        criteriosRows.forEach(row => {
            const evaluacion = row.querySelector('.criterio-evaluacion').value;
            const comparacion = row.querySelector('.criterio-comparacion').value;
            const valor = parseFloat(row.querySelector('.criterio-valor').value);

            if (evaluacion && comparacion && !isNaN(valor)) {
                criterios.push({
                    evaluacion: evaluacion,
                    comparacion: comparacion,
                    valor: valor
                });
            }
        });

        return criterios;
    }

    actualizarResumenCriterios() {
        const criterios = this.obtenerCriterios();
        const operador = document.getElementById('operador-logico').value;
        const resumenTexto = document.getElementById('criterios-resumen-texto');

        if (criterios.length === 0) {
            resumenTexto.textContent = 'Agregue al menos un criterio para filtrar';
            return;
        }

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

    // ========== GENERACIÓN DE REPORTES CON MÚLTIPLES CRITERIOS ==========
    generarReportePorEvaluacionMultiple() {
        console.log('generarReportePorEvaluacionMultiple called');

        if (!this.estudiantesData || this.estudiantesData.length === 0) {
            DOMHelpers.mostrarError('No hay datos de estudiantes cargados');
            return;
        }

        const criterios = this.obtenerCriterios();

        if (criterios.length === 0) {
            DOMHelpers.mostrarError('Por favor, configure al menos un criterio válido');
            return;
        }

        const operador = document.getElementById('operador-logico').value;

        try {
            const numParciales = parseInt(document.getElementById('num-parciales').value);
            const numQuices = parseInt(document.getElementById('num-quices').value);
            Validators.validarPorcentajes(numParciales, numQuices);

            const filteredStudents = this.filtrarEstudiantesPorMultiplesCriterios(criterios, operador);

            this.mostrarEstudiantesFiltrados(filteredStudents);

        } catch (error) {
            DOMHelpers.mostrarError(error.message);
        }
    }

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
                // Calcular nota promedio para mostrar
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

    // ========== GENERACIÓN DE REPORTES (LEGACY) ==========
    generarReportePorEvaluacion() {
        console.log('generarReportePorEvaluacion called');

        if (!this.estudiantesData || this.estudiantesData.length === 0) {
            DOMHelpers.mostrarError('No hay datos de estudiantes cargados');
            return;
        }

        const evaluacion = document.getElementById('seleccion-evaluacion').value;
        const tipoComparacion = document.getElementById('tipo-comparacion').value;
        const valorNota = document.getElementById('valor-nota').value;

        if (!evaluacion || !tipoComparacion || !valorNota) {
            DOMHelpers.mostrarError('Por favor, complete todos los criterios de evaluación');
            return;
        }

        try {
            const valorNotaNum = Validators.validarNota(valorNota);
            const numParciales = parseInt(document.getElementById('num-parciales').value);
            const numQuices = parseInt(document.getElementById('num-quices').value);
            Validators.validarPorcentajes(numParciales, numQuices);

            const filteredStudents = this.filtrarEstudiantesPorNota(
                evaluacion,
                tipoComparacion,
                valorNotaNum
            );

            this.mostrarEstudiantesFiltrados(filteredStudents);

        } catch (error) {
            DOMHelpers.mostrarError(error.message);
        }
    }

    filtrarEstudiantesPorNota(evaluacion, tipoComparacion, valorNota) {
        const filtered = [];

        this.estudiantesData.slice(1).forEach(row => {
            const notaAcumulada = Calculators.calcularNotaAcumulada(
                row,
                evaluacion.split('+'),
                this.excelMapper
            );

            if (Calculators.compararNota(notaAcumulada, valorNota, tipoComparacion)) {
                filtered.push({
                    row: row,
                    notaAcumulada: notaAcumulada
                });
            }
        });

        return filtered;
    }

    mostrarEstudiantesFiltrados(filteredStudents) {
        const filteredStudentList = document.getElementById('filtered-student-list');
        DOMHelpers.limpiarContenedor(filteredStudentList);

        filteredStudents.forEach(studentData => {
            const row = studentData.row;
            const id = this.excelMapper.obtenerID(row);
            const nombre = this.excelMapper.obtenerNombre(row);

            const checkbox = DOMHelpers.crearElemento('input', {
                type: 'checkbox',
                value: id,
                id: `student-${id}`
            });

            // NUEVO: Marcar checkbox por defecto
            checkbox.checked = true;

            // Agregar listener para actualizar contador al cambiar
            checkbox.addEventListener('change', () => this.actualizarContadorFiltrados());

            const label = DOMHelpers.crearElemento('label', {
                'for': `student-${id}`,
                textContent: `${nombre} (Nota: ${studentData.notaAcumulada.toFixed(2)})`
            });

            const br = document.createElement('br');

            filteredStudentList.appendChild(checkbox);
            filteredStudentList.appendChild(label);
            filteredStudentList.appendChild(br);
        });

        // Mostrar contador de estudiantes seleccionados
        const container = document.getElementById('filtered-student-list-container');
        container.classList.remove('hidden');

        // Actualizar contador
        this.actualizarContadorFiltrados();
    }

    generarReporteParaSeleccionados() {
        const filteredStudentList = document.getElementById('filtered-student-list');
        const selectedStudents = [...filteredStudentList.querySelectorAll('input[type="checkbox"]:checked')]
            .map(checkbox => checkbox.value);

        if (selectedStudents.length === 0) {
            DOMHelpers.mostrarError('Por favor, seleccione al menos un estudiante');
            return;
        }

        const incluirCompetencias = document.getElementById('incluir-nombres').checked;
        const evaluacion = document.getElementById('seleccion-evaluacion').value;

        let contenidoReporte = '';

        selectedStudents.forEach(estudianteId => {
            const estudiante = this.estudiantesData.find(row =>
                this.excelMapper.obtenerID(row) == estudianteId
            );

            if (!estudiante) {
                return;
            }

            contenidoReporte += this.construirReporteEstudiante(
                estudiante,
                evaluacion.split('+'),
                incluirCompetencias
            );
        });

        this.mostrarVistaPrevia(contenidoReporte);
    }

    construirReporteEstudiante(estudiante, evaluaciones, incluirCompetencias) {
        const nombre = this.excelMapper.obtenerNombre(estudiante);
        let html = `<h4>Informe de ${DOMHelpers.sanitizarTexto(nombre)}</h4>`;
        html += '<table><thead><tr>';
        html += '<th>Evaluación</th><th>Nota</th>';

        if (incluirCompetencias) {
            html += '<th>Competencias a Reforzar</th>';
            html += '<th>Páginas Web Recomendadas</th>';
            html += '<th>Videos Recomendados</th>';
            html += '<th>Páginas y Números de Ejercicios Recomendados</th>';
            html += '<th>Herramientas Virtuales Recomendadas</th>';
        }

        html += '</tr></thead><tbody>';

        let notaAcumulada = 0;

        evaluaciones.forEach(ev => {
            const porcentaje = Calculators.obtenerPorcentajeEvaluacion(ev) / 100;
            const nota = this.excelMapper.obtenerNota(estudiante, ev);
            notaAcumulada += (nota * porcentaje);

            html += '<tr>';
            html += `<td>${DOMHelpers.sanitizarTexto(ev)}</td>`;
            html += `<td>${nota.toFixed(2)}</td>`;

            if (incluirCompetencias) {
                html += `<td>${this.obtenerCompetenciasTexto(ev)}</td>`;
                html += `<td>${this.obtenerCompetenciasTexto(ev + 'Web')}</td>`;
                html += `<td>${this.obtenerCompetenciasTexto(ev + 'Video')}</td>`;
                html += `<td>${this.obtenerCompetenciasTexto(ev + 'Ejercicios')}</td>`;
                html += `<td>${this.obtenerCompetenciasTexto(ev + 'Herramientas')}</td>`;
            }

            html += '</tr>';
        });

        html += '</tbody></table>';
        html += `<p>Nota Acumulada: ${notaAcumulada.toFixed(2)}</p><hr>`;

        return html;
    }

    obtenerCompetenciasTexto(tipo) {
        const competencias = this.competenciasSeleccionadas[tipo];
        if (!competencias || competencias.length === 0) {
            return 'Ninguna seleccionada';
        }
        return competencias.map(c => DOMHelpers.sanitizarTexto(c)).join(', ');
    }

    selectAllStudents() {
        const select = document.getElementById('seleccion-estudiante');
        for (let i = 0; i < select.options.length; i++) {
            select.options[i].selected = true;
        }
    }

    deselectAllStudents() {
        const select = document.getElementById('seleccion-estudiante');
        for (let i = 0; i < select.options.length; i++) {
            select.options[i].selected = false;
        }
    }

    seleccionarTodosFiltrados() {
        const filteredStudentList = document.getElementById('filtered-student-list');
        const checkboxes = filteredStudentList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = true;
        });
        this.actualizarContadorFiltrados();
    }

    deseleccionarTodosFiltrados() {
        const filteredStudentList = document.getElementById('filtered-student-list');
        const checkboxes = filteredStudentList.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(checkbox => {
            checkbox.checked = false;
        });
        this.actualizarContadorFiltrados();
    }

    actualizarContadorFiltrados() {
        const filteredStudentList = document.getElementById('filtered-student-list');
        const totalCheckboxes = filteredStudentList.querySelectorAll('input[type="checkbox"]').length;
        const checkedCheckboxes = filteredStudentList.querySelectorAll('input[type="checkbox"]:checked').length;

        const contador = document.getElementById('contador-filtrados');
        if (contador) {
            contador.textContent = `(${checkedCheckboxes} de ${totalCheckboxes} seleccionados)`;
        }
    }

    generarReportePorEstudiante() {
        const select = document.getElementById('seleccion-estudiante');
        const selectedStudents = [...select.options]
            .filter(option => option.selected)
            .map(option => option.value);

        if (selectedStudents.length === 0) {
            DOMHelpers.mostrarError('Por favor, seleccione al menos un estudiante');
            return;
        }

        try {
            const numParciales = parseInt(document.getElementById('num-parciales').value);
            const numQuices = parseInt(document.getElementById('num-quices').value);
            Validators.validarPorcentajes(numParciales, numQuices);

            let contenidoReporte = '';

            selectedStudents.forEach(estudianteId => {
                const estudiante = this.estudiantesData.find(row =>
                    this.excelMapper.obtenerID(row) == estudianteId
                );

                if (!estudiante) {
                    return;
                }

                contenidoReporte += this.construirReporteGeneralEstudiante(estudiante, numParciales);
            });

            this.mostrarVistaPrevia(contenidoReporte);

        } catch (error) {
            DOMHelpers.mostrarError(error.message);
        }
    }

    construirReporteGeneralEstudiante(estudiante, numParciales) {
        const nombre = this.excelMapper.obtenerNombre(estudiante);

        let html = `<h4>Informe General de Notas del Estudiante: ${DOMHelpers.sanitizarTexto(nombre)}</h4>`;
        html += '<table><thead><tr>';
        html += '<th>Evaluación</th>';
        html += '<th>Fecha de Evaluación</th>';
        html += '<th>Nota</th>';
        html += '<th>Competencias</th>';
        html += '<th>Acumulado (%)</th>';
        html += '<th>Observación</th>';
        html += '</tr></thead><tbody>';

        let totalAcumulado = 0;

        for (let i = 1; i <= numParciales; i++) {
            const parcialName = `${i}P`;
            const nota = this.excelMapper.obtenerNota(estudiante, parcialName);
            const porcentaje = Calculators.obtenerPorcentajeEvaluacion(parcialName) / 100;
            const acumulado = (nota * porcentaje);
            totalAcumulado += acumulado;

            const observacion = acumulado >= 0.6
                ? '<span style="color: blue;">Aprobado</span>'
                : '<span style="color: red;">No Aprobado</span>';

            html += '<tr>';
            html += `<td>${parcialName}</td>`;
            html += `<td>Fecha ${parcialName}</td>`;
            html += `<td>${nota.toFixed(2)}</td>`;
            html += `<td>${this.obtenerCompetenciasTexto(parcialName)}</td>`;
            html += `<td>${acumulado.toFixed(2)}</td>`;
            html += `<td>${observacion}</td>`;
            html += '</tr>';
        }

        html += '</tbody></table>';
        html += `<p>Total Acumulado: ${totalAcumulado.toFixed(2)}</p><hr>`;

        return html;
    }

    mostrarVistaPrevia(contenido) {
        document.getElementById('vista-previa-contenido').innerHTML = contenido;
        document.getElementById('vista-previa-section').classList.remove('hidden');
    }

    descargarPDF() {
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF({
            orientation: document.getElementById('orientacion').value,
            unit: 'pt',
            format: document.getElementById('tamano-hoja').value
        });

        const vistaPrevia = document.getElementById('vista-previa-contenido');
        doc.html(vistaPrevia, {
            callback: function (doc) {
                doc.save('reporte_competencias.pdf');
            },
            x: 10,
            y: 10,
            html2canvas: {
                scale: 0.5
            }
        });
    }
}

// ==================== INICIALIZACIÓN ====================
let appInstance = null;

document.addEventListener('DOMContentLoaded', function() {
    console.log('Inicializando aplicación Generador de Reportes v2.0...');
    appInstance = new ReporteCompetencias();
    console.log('✓ Aplicación inicializada correctamente');
    console.log('✓ Mejoras de seguridad aplicadas');
    console.log('✓ Arquitectura refactorizada');
});
