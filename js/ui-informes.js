/**
 * Pestaña 5 · Informes: vista previa, PDF (individual, grupal o del programa), Excel consolidado e impresión.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);
    const MAX_VISTA = 8;

    function tipoActual() {
        return document.querySelector('input[name="tipoInforme"]:checked')?.value || 'seleccionados';
    }

    /** Resultados de los estudiantes que van en el informe según el tipo elegido. */
    function resultadosPara(tipo, ids) {
        const g = App.grupo();
        const d = Estado.obtener();
        if (tipo === 'ids') return g.resultados.filter(r => ids.includes(r.id));
        if (tipo === 'seleccionados') { const s = new Set(d.seleccion); return g.resultados.filter(r => s.has(r.id)); }
        if (tipo === 'filtrados') return App.filtrados();
        return g.resultados;
    }

    function modelos(tipo, ids) {
        const d = Estado.obtener();
        if (tipo === 'programa') return Estado.gruposConDatos().length ? [Informes.modeloPrograma(App.programa(), { mensaje: d.informe.mensaje })] : [];
        const g = App.grupo();
        if (tipo === 'grupal') return [Informes.modeloGrupal(d, g)];
        return resultadosPara(tipo, ids).map(r => Informes.modeloIndividual(d, r, g));
    }

    function renderVista() {
        const d = Estado.obtener();
        const cont = $('vistaPrevia');
        const tipo = tipoActual();
        if (!d.estudiantes.length && !(tipo === 'programa' && Estado.gruposConDatos().length)) {
            cont.innerHTML = '<div class="vacio">Cargue una planilla de notas para generar informes.</div>';
            $('infoVistaPrevia').textContent = '';
            return;
        }
        const lista = modelos(tipo);
        if (!lista.length) {
            cont.innerHTML = `<div class="vacio">${tipo === 'seleccionados'
                ? 'No hay estudiantes seleccionados. Márquelos en la pestaña <b>4. Estudiantes</b> o elija otro tipo de informe.'
                : 'Ningún estudiante cumple el filtro actual.'}</div>`;
            $('infoVistaPrevia').textContent = '';
            return;
        }
        const mostrados = lista.slice(0, MAX_VISTA);
        cont.innerHTML = mostrados.map(m => m.tipo === 'grupal' ? Informes.htmlGrupal(m) : m.tipo === 'programa' ? Informes.htmlPrograma(m) : Informes.htmlIndividual(m)).join('') +
            (lista.length > MAX_VISTA ? `<div class="vacio">… y ${lista.length - MAX_VISTA} informe(s) más. El PDF incluye los ${lista.length}.</div>` : '');
        $('infoVistaPrevia').textContent = tipo === 'grupal' ? `(informe grupal · ${d.nombre})` : tipo === 'programa' ? `(informe del programa · ${Estado.gruposConDatos().length} grupos)` : `(${lista.length} informe${lista.length === 1 ? '' : 's'} de ${d.nombre}, uno por página)`;
    }

    function render() {
        const d = Estado.obtener();
        $('numSeleccionados').textContent = `(${d.seleccion.length})`;
        $('numFiltrados').textContent = `(${d.estudiantes.length ? App.filtrados().length : 0})`;
        $('numGruposInforme').textContent = `(${Estado.gruposConDatos().length})`;
        $('tamanoHoja').value = d.informe.tamano || 'letter';
        $('orientacion').value = d.informe.orientacion || 'p';
        document.querySelectorAll('[data-opcion]').forEach(el => { el.checked = d.informe[el.dataset.opcion] !== false; });
        if (document.activeElement !== $('mensajeInforme')) $('mensajeInforme').value = d.informe.mensaje || '';
        renderVista();
    }

    /** Selecciona un tipo de informe y muestra la pestaña. */
    function mostrar(tipo) {
        const radio = document.querySelector(`input[name="tipoInforme"][value="${tipo}"]`);
        if (radio) radio.checked = true;
        App.irA('informes');
    }

    function nombreArchivo(tipo, lista) {
        const d = Estado.obtener();
        const base = U.nombreArchivoSeguro(d.curso.asignatura || 'curso');
        if (tipo === 'grupal') return `informe_grupal_${U.nombreArchivoSeguro(d.nombre || base)}.pdf`;
        if (tipo === 'programa') return `informe_programa_${U.nombreArchivoSeguro(d.curso.programa || 'grupos')}_${U.fechaISO()}.pdf`;
        if (lista.length === 1) return `informe_${U.nombreArchivoSeguro(lista[0].estudiante.nombre)}.pdf`;
        return `informes_${base}_${lista.length}_estudiantes.pdf`;
    }

    async function descargarPDF(tipo = tipoActual(), ids = []) {
        if (!(tipo === 'programa' ? Estado.gruposConDatos().length : Estado.hayDatos())) { mostrarNotificacion('Sin datos', 'Cargue primero una planilla de notas.', 'warning'); return; }
        if (!global.jspdf) { mostrarNotificacion('Sin conexión', 'No se cargó la librería de PDF (jsPDF). Revise la conexión a internet y recargue la página.', 'error'); return; }
        const lista = modelos(tipo, ids);
        if (!lista.length) { mostrarNotificacion('Nada que exportar', tipo === 'seleccionados' ? 'No hay estudiantes seleccionados.' : 'No hay estudiantes para este informe.', 'warning'); return; }
        await U.conCargando(`Generando PDF (${lista.length} página${lista.length === 1 ? '' : 's'} o más)...`, async () => {
            const d = Estado.obtener();
            const doc = Informes.generarPDF(lista, {
                tamano: d.informe.tamano, orientacion: tipo === 'programa' ? 'l' : d.informe.orientacion,
                titulo: tipo === 'grupal' ? 'Informe grupal' : tipo === 'programa' ? 'Informe del programa' : 'Informes individuales',
                pie: (tipo === 'programa'
                    ? [d.curso.institucion, d.curso.programa, d.curso.periodo, `${Estado.gruposConDatos().length} grupos`]
                    : [d.curso.institucion, d.curso.asignatura, d.curso.grupo && `Grupo ${d.curso.grupo}`, d.curso.periodo]).filter(Boolean).join(' · ') || 'Analista Académico'
            });
            doc.save(nombreArchivo(tipo, lista));
            const que = tipo === 'programa' ? 'Informe del programa (horizontal)' : tipo === 'grupal' ? 'Informe grupal' : lista.length === 1 ? '1 informe' : `${lista.length} informes`;
            mostrarNotificacion('PDF generado', `${que} · ${doc.getNumberOfPages()} página(s).`, 'success');
        });
    }

    function exportarExcel() {
        if (!Estado.hayDatos()) { mostrarNotificacion('Sin datos', 'Cargue primero una planilla de notas.', 'warning'); return; }
        if (typeof XLSX === 'undefined') { mostrarNotificacion('Sin conexión', 'No se cargó la librería de Excel.', 'error'); return; }
        const d = Estado.obtener();
        const libro = Informes.libroExcel(d, App.grupo(), XLSX);
        XLSX.writeFile(libro, `consolidado_${U.nombreArchivoSeguro(d.curso.asignatura || 'curso')}.xlsx`);
        mostrarNotificacion('Excel exportado', 'Hojas: Consolidado, Estadísticas, Competencias críticas, Plan por estudiante y Configuración.', 'success');
    }

    function exportarExcelPrograma() {
        if (!Estado.gruposConDatos().length) { mostrarNotificacion('Sin datos', 'Cargue primero una o varias planillas de notas.', 'warning'); return; }
        if (typeof XLSX === 'undefined') { mostrarNotificacion('Sin conexión', 'No se cargó la librería de Excel.', 'error'); return; }
        const d = Estado.obtener();
        XLSX.writeFile(Informes.libroExcelPrograma(App.programa(), XLSX), `programa_${U.nombreArchivoSeguro(d.curso.programa || 'grupos')}_${U.fechaISO()}.xlsx`);
        mostrarNotificacion('Excel del programa exportado', 'Hojas: Resumen, Grupos, Por curso, Competencias, Evaluaciones, Estudiantes y Clasificación.', 'success');
    }

    function init() {
        document.querySelectorAll('input[name="tipoInforme"]').forEach(r => r.addEventListener('change', renderVista));
        const guardarOpcion = (clave, valor) => {
            Estado.obtener().informe[clave] = valor;
            Estado.confirmar({ origen: 'informe', sinRedibujar: true });
            renderVista();
        };
        $('tamanoHoja').addEventListener('change', ev => guardarOpcion('tamano', ev.target.value));
        $('orientacion').addEventListener('change', ev => guardarOpcion('orientacion', ev.target.value));
        document.querySelectorAll('[data-opcion]').forEach(el => el.addEventListener('change', () => guardarOpcion(el.dataset.opcion, el.checked)));
        $('mensajeInforme').addEventListener('change', ev => guardarOpcion('mensaje', ev.target.value.trim()));
        $('descargarPdfBtn').addEventListener('click', () => descargarPDF());
        $('exportarExcelBtn').addEventListener('click', exportarExcel);
        $('exportarExcelProgramaBtn').addEventListener('click', exportarExcelPrograma);
        $('imprimirBtn').addEventListener('click', () => {
            if (!$('vistaPrevia').querySelector('.inf-pagina')) { mostrarNotificacion('Nada que imprimir', 'La vista previa está vacía.', 'warning'); return; }
            window.print();
        });
    }

    global.UIInformes = { init, render, mostrar, descargarPDF, exportarExcel, exportarExcelPrograma };
})(window);
