/**
 * Arranque de la aplicación: pestañas, respaldo y coordinación entre módulos.
 * Cuando los datos cambian (evento "datos-cambiados") se recalcula el análisis y se redibuja la pestaña visible.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const $ = id => document.getElementById(id);
    const MODULOS = { datos: 'UIDatos', evaluaciones: 'UIEvaluaciones', analisis: 'UIAnalisis', estudiantes: 'UIEstudiantes', informes: 'UIInformes', programa: 'UIPrograma', manual: 'UIManual' };

    let pestana = 'datos';
    let cacheAnalisis = new Map(); // id de grupo -> análisis
    let cacheFiltrados = null;
    let cachePrograma = null;

    /** Análisis de un grupo (se calcula una vez por cada cambio de datos). */
    function analizar(datos) {
        if (!cacheAnalisis.has(datos.id)) cacheAnalisis.set(datos.id, Analisis.analizarGrupo(datos));
        return cacheAnalisis.get(datos.id);
    }

    /** Análisis del grupo activo. */
    function grupo() {
        return analizar(Estado.obtener());
    }

    /** Análisis global de todos los grupos con estudiantes. */
    function programa() {
        if (!cachePrograma) cachePrograma = Programa.analizarPrograma(Estado.gruposConDatos(), { analizar });
        return cachePrograma;
    }

    /** Estudiantes que cumplen el filtro de la pestaña 4. */
    function filtrados() {
        if (!cacheFiltrados) {
            const f = Estado.obtener().filtro;
            cacheFiltrados = Analisis.filtrar(grupo().resultados, f.criterios, f.operador);
        }
        return cacheFiltrados;
    }

    function renderPestana(nombre = pestana) {
        try {
            global[MODULOS[nombre]]?.render();
        } catch (err) {
            console.error(err);
            mostrarNotificacion('Error al mostrar la pestaña', err.message, 'error');
        }
    }

    function actualizarCabecera() {
        const d = Estado.obtener();
        const grupos = Estado.gruposConDatos();
        $('badgeGrupos').textContent = grupos.length;
        $('selectorGrupoWrap').classList.toggle('hidden', grupos.length < 2);
        $('numGrupos').textContent = grupos.length;
        $('selectorGrupo').innerHTML = grupos.map(g => `<option value="${U.escaparHTML(g.id)}" ${g.id === d.id ? 'selected' : ''}>${U.escaparHTML(g.nombre)} (${g.estudiantes.length})</option>`).join('');
        $('badgeEvaluaciones').textContent = d.evaluaciones.filter(ev => ev.incluida !== false).length;
        $('badgeEstudiantes').textContent = d.estudiantes.length;
        const partes = [d.curso.asignatura, d.curso.grupo && `Grupo ${d.curso.grupo}`, d.curso.periodo, d.curso.docente].filter(Boolean);
        $('subtituloCurso').textContent = partes.length ? partes.join(' · ') : 'Análisis de notas por competencias e informes';
    }

    function irA(nombre) {
        if (!MODULOS[nombre]) return;
        pestana = nombre;
        document.querySelectorAll('.tab-link').forEach(t => {
            const activa = t.dataset.tab === nombre;
            t.classList.toggle('active', activa);
            t.setAttribute('aria-selected', activa);
        });
        document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${nombre}`));
        try { sessionStorage.setItem('analistaPestana', nombre); } catch (e) { /* sin almacenamiento */ }
        renderPestana(nombre);
        document.querySelector(`.tab-link[data-tab="${nombre}"]`)?.scrollIntoView({ block: 'nearest', inline: 'nearest' });
    }

    function alCambiarDatos(ev) {
        cacheAnalisis = new Map();
        cacheFiltrados = null;
        cachePrograma = null;
        actualizarCabecera();
        if (!ev.detail?.sinRedibujar) renderPestana();
    }

    async function nuevo() {
        if (!Estado.gruposConDatos().length && !Estado.obtenerProyecto().catalogo) { Estado.reiniciar(); return; }
        if (!await confirmar('Se borrarán todos los grupos, las competencias, los porcentajes y las observaciones guardadas en este navegador.\n\nSi quiere conservarlos, use antes «Guardar respaldo».', { titulo: 'Empezar de cero', textoAceptar: 'Borrar todo', peligro: true })) return;
        Estado.reiniciar();
        irA('datos');
        mostrarNotificacion('Listo', 'Se borraron todos los datos.', 'info');
    }

    function guardarRespaldo() {
        const d = Estado.obtener();
        const n = Estado.gruposConDatos().length;
        U.descargarArchivo(Estado.exportarRespaldo(), `respaldo_analista_${U.nombreArchivoSeguro(n > 1 ? `${n}_grupos` : (d.curso.asignatura || 'curso'))}_${U.fechaISO()}.json`);
        mostrarNotificacion('Respaldo guardado', 'Guarde el archivo .json: con «Abrir respaldo» recupera todo el trabajo.', 'success');
    }

    function abrirRespaldo(archivo) {
        if (!archivo) return;
        const lector = new FileReader();
        lector.onload = () => {
            try {
                Estado.importarRespaldo(lector.result);
                const grupos = Estado.gruposConDatos();
                mostrarNotificacion('Respaldo abierto', `${grupos.length} grupo(s) y ${grupos.reduce((s, g) => s + g.estudiantes.length, 0)} estudiantes recuperados.`, 'success');
            } catch (err) {
                mostrarNotificacion('No se pudo abrir el respaldo', err.message, 'error');
            }
        };
        lector.readAsText(archivo);
    }

    function init() {
        Estado.cargar();
        Object.values(MODULOS).forEach(m => global[m].init());

        document.querySelectorAll('.tab-link').forEach(t => t.addEventListener('click', () => irA(t.dataset.tab)));
        document.querySelectorAll('[data-cerrar]').forEach(b => b.addEventListener('click', () => cerrarModal(b.dataset.cerrar)));
        $('guardarRespaldoBtn').addEventListener('click', guardarRespaldo);
        $('abrirRespaldoInput').addEventListener('change', ev => { abrirRespaldo(ev.target.files[0]); ev.target.value = ''; });
        $('nuevoBtn').addEventListener('click', nuevo);
        $('ayudaBtn').addEventListener('click', () => UIManual.ayudaDe(pestana));
        $('selectorGrupo').addEventListener('change', ev => {
            Estado.activar(ev.target.value);
            Estado.confirmar({ origen: 'grupo' });
        });
        document.addEventListener('datos-cambiados', alCambiarDatos);

        if (typeof XLSX === 'undefined' || !global.jspdf) {
            mostrarNotificacion('Librerías sin cargar', 'Algunas funciones (leer Excel o crear PDF) necesitan conexión a internet la primera vez. Revise la conexión y recargue.', 'warning', 10000);
        }

        actualizarCabecera();
        let inicial = 'datos';
        try { inicial = sessionStorage.getItem('analistaPestana') || (Estado.gruposConDatos().length > 1 ? 'programa' : Estado.hayDatos() ? 'analisis' : 'datos'); } catch (e) { /* sin almacenamiento */ }
        irA(inicial);
    }

    global.App = { grupo, programa, analizar, filtrados, irA, refrescar: () => renderPestana() };
    document.addEventListener('DOMContentLoaded', init);
})(window);
