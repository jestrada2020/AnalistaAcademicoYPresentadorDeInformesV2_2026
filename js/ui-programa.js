/**
 * Pestaña 6 · Programa: análisis global de todos los grupos cargados — comparativo de grupos,
 * desempeño por carácter de las competencias (analítico, práctico, pensamiento crítico),
 * competencias y evaluaciones críticas, estudiantes en riesgo, hallazgos y recomendaciones.
 * También contiene la ventana para revisar el carácter de cada competencia del catálogo.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);

    let busqueda = '';

    const pc = v => (v === null || v === undefined ? '—' : `${U.redondear(v, 0)}%`);

    function chipDim(k) {
        const d = CONFIG.DIMENSIONES[k];
        return d ? `<span class="chip chip-dim" style="background:${d.fondo};color:${d.color}">${e(d.etiqueta)}</span>` : '';
    }

    function colorLogro(v) { return v >= 60 ? '#10b981' : v >= 40 ? '#f59e0b' : '#ef4444'; }

    function render() {
        const grupos = Estado.gruposConDatos();
        $('programaVacio').classList.toggle('hidden', grupos.length > 0);
        $('programaContenido').classList.toggle('hidden', !grupos.length);
        if (!grupos.length) return;

        const prog = App.programa();
        const m = Informes.modeloPrograma(prog);
        const s = prog.resumen;
        const dec = prog.escala.decimales ?? 2;
        const f = v => U.formatoNota(v, dec);
        const ap = prog.escala.aprobatoria;

        $('programaSubtitulo').textContent = `${s.grupos} grupo${s.grupos === 1 ? '' : 's'} · ${s.estudiantes} estudiantes${m.encabezado.lineas.find(([k]) => k === 'Programa') ? ` · ${m.encabezado.lineas.find(([k]) => k === 'Programa')[1]}` : ''}`;
        $('programaKpis').innerHTML = m.indicadores.map(i => `<div class="kpi"><div class="k">${e(i.etiqueta)}</div><div class="v" ${i.color ? `style="color:${i.color}"` : ''}>${e(i.valor)}</div><div class="d">${e(i.detalle || '')}</div></div>`).join('');
        $('programaAvisos').innerHTML = prog.avisos.length ? `<div class="warning-box mb-6">${prog.avisos.map(a => e(a)).join('<br>')}</div>` : '';

        // Carácter de las competencias
        $('programaDims').innerHTML = m.dimensiones.map(d => d.n ? `
            <div class="dim-card" style="border-top:4px solid ${d.color}">
                <div class="k" style="color:${d.color}">${e(d.etiqueta)}</div>
                <div class="d">${e(d.descripcion)}</div>
                <div class="v" style="color:${d.media < ap ? '#b91c1c' : '#111827'}">${e(d.texto.media)}</div>
                <div class="d"><b>${e(d.texto.logro)}</b> de los estudiantes con logro · ${d.competencias} competencias evaluadas · ${e(d.texto.participacion)} del peso de las evaluaciones</div>
                <div class="barra"><div style="width:${d.logro}%;background:${colorLogro(d.logro)}"></div></div>
            </div>` : `
            <div class="dim-card" style="border-top:4px solid ${d.color}">
                <div class="k" style="color:${d.color}">${e(d.etiqueta)}</div>
                <div class="d">${e(d.descripcion)}</div>
                <div class="v text-gray-300">—</div>
                <div class="d">Ninguna evaluación calificada mide este carácter.</div>
            </div>`).join('');
        const hayDims = m.dimensiones.some(d => d.n);
        $('programaGraficoDims').innerHTML = hayDims
            ? Informes.svgBarrasAgrupadas(m.graficoGrupos, { max: prog.escala.maxima, linea: ap, alto: 210 })
            : '<p class="text-sm text-gray-500">Asocie competencias a las evaluaciones (pestaña 2) o cargue el catálogo para ver este gráfico.</p>';
        $('programaGraficoGrupos').innerHTML = Informes.svgBarras(m.graficoPromedios, { alto: 210, max: prog.escala.maxima, linea: ap, etiquetaLinea: `Aprobatoria ${ap}` });

        $('programaHallazgos').innerHTML = prog.hallazgos.map(h => `<li>${e(h)}</li>`).join('');
        $('programaRecomendaciones').innerHTML = prog.recomendaciones.map(r => `<div class="recomendacion"><b>${e(r.titulo)}</b><ul>${r.items.map(x => `<li>${e(x)}</li>`).join('')}</ul></div>`).join('') || '<p class="text-sm text-gray-500">Sin recomendaciones por ahora.</p>';

        // Comparativo de grupos
        const dims = Object.entries(CONFIG.DIMENSIONES);
        const activo = Estado.obtener().id;
        $('programaTablaGrupos').innerHTML = `<thead><tr><th>Grupo</th><th>Docente</th><th>Curso de competencias</th><th class="num">Est.</th><th class="num">Evaluado</th><th class="num">Promedio</th><th>Aprobando</th><th class="num">En riesgo</th><th class="num">No alcanzan</th>${dims.map(([, d]) => `<th class="num" style="color:${d.color}" title="${e(d.descripcion)}">${e(d.etiqueta)}</th>`).join('')}</tr></thead><tbody>${
            prog.grupos.map(g => `<tr class="fila-clic ${g.id === activo ? 'seleccionado' : ''}" data-grupo="${e(g.id)}" title="Trabajar con este grupo">
                <td><button type="button" class="nombre-est" data-grupo-ir="${e(g.id)}">${e(g.nombre)}</button></td>
                <td class="text-xs">${e(g.docente || '—')}</td>
                <td class="text-xs">${e(g.curso || '—')}</td>
                <td class="num">${g.estudiantes}</td>
                <td class="num">${U.redondear(g.pesoEvaluado, 0)}%</td>
                <td class="num"><span class="${g.media !== null && g.media < ap ? 'nota-baja px-1' : 'font-semibold'}">${f(g.media)}</span></td>
                <td style="min-width:7rem">${pc(g.pctAprobando)}<div class="barra"><div style="width:${g.pctAprobando || 0}%;background:${colorLogro(g.pctAprobando)}"></div></div></td>
                <td class="num">${g.riesgo}</td>
                <td class="num">${g.perdidos}</td>
                ${dims.map(([k]) => `<td class="num">${g.dims[k].n ? `<span class="${g.dims[k].media < ap ? 'nota-baja px-1' : ''}">${f(g.dims[k].media)}</span> <span class="text-xs text-gray-500">(${pc(g.dims[k].logro)})</span>` : '<span class="text-gray-300">—</span>'}</td>`).join('')}
            </tr>`).join('')}</tbody>`;
        $('programaPorCurso').innerHTML = prog.porCurso.length > 1 ? `<h4 class="font-semibold text-sm text-gray-700 mb-2">Por curso</h4><div class="table-wrapper"><table class="data-table data-table-compact"><thead><tr><th>Curso</th><th>Grupos</th><th class="num">Est.</th><th class="num">Promedio</th><th class="num">Aprobando</th><th class="num">Riesgo o perdiendo</th>${dims.map(([, d]) => `<th class="num" style="color:${d.color}">${e(d.corta)}</th>`).join('')}</tr></thead><tbody>${
            prog.porCurso.map(c => `<tr><td><b>${e(c.curso)}</b></td><td class="text-xs">${e(c.grupos.join(', '))}</td><td class="num">${c.estudiantes}</td><td class="num">${f(c.media)}</td><td class="num">${pc(c.pctAprobando)}</td><td class="num">${pc(c.pctRiesgo)}</td>${dims.map(([k]) => `<td class="num">${f(c.dims[k].media)}</td>`).join('')}</tr>`).join('')}</tbody></table></div>` : '';

        renderCompetencias(prog, f);

        $('programaEvaluaciones').innerHTML = prog.evaluacionesCriticas.length ? `<div class="table-wrapper"><table class="data-table data-table-compact"><thead><tr><th>Grupo</th><th>Evaluación</th><th class="num">Notas</th><th class="num">Media</th><th>Aprobación</th></tr></thead><tbody>${
            prog.evaluacionesCriticas.slice(0, 20).map(x => `<tr><td class="text-xs">${e(x.grupo)}</td><td>${e(x.evaluacion)}</td><td class="num">${x.n}</td><td class="num ${x.media < ap ? 'nota-baja' : ''}">${f(x.media)}</td>
                <td style="min-width:7rem">${pc(x.aprobacion)}<div class="barra"><div style="width:${x.aprobacion}%;background:${colorLogro(x.aprobacion)}"></div></div></td></tr>`).join('')}</tbody></table></div>`
            : '<p class="text-sm text-gray-500">Aún no hay evaluaciones calificadas.</p>';

        if (!$('programaFiltroEstado').options.length) {
            $('programaFiltroEstado').innerHTML = '<option value="">Todos los estados de alerta</option>' + ['riesgo', 'riesgo-alto', 'perdido', 'reprobado', 'sin-datos'].map(k => `<option value="${k}">${e(CONFIG.ESTADOS[k].etiqueta)}</option>`).join('');
        }
        renderRiesgo(prog, f);
    }

    function renderCompetencias(prog, f) {
        const sel = $('programaFiltroDim');
        if (!sel.options.length) sel.innerHTML = '<option value="">Todos los caracteres</option>' + Object.entries(CONFIG.DIMENSIONES).map(([k, d]) => `<option value="${k}">${e(d.etiqueta)}</option>`).join('');
        const dim = sel.value;
        let lista = prog.competencias.filter(c => !dim || c.dimension === dim);
        if ($('programaOrdenComp').value === 'alto') lista = [...lista].sort((a, b) => b.logro - a.logro || b.media - a.media);
        $('programaCompetencias').innerHTML = !prog.competencias.length
            ? '<p class="text-sm text-gray-500">Cargue el catálogo de competencias y asócielas a las evaluaciones para ver el logro por competencia en todo el programa.</p>'
            : lista.map(c => `<div class="critica">
                <div class="flex justify-between gap-3"><span><b class="text-indigo-700">${c.competencia.numero}.</b> ${e(c.competencia.texto)} ${chipDim(c.dimension)}</span>
                    <span class="whitespace-nowrap font-bold" style="color:${colorLogro(c.logro)}" title="Estudiantes con logro">${pc(c.logro)}</span></div>
                <div class="text-xs text-gray-500 mt-1">${e(c.curso || '')} · ${c.n} estudiantes evaluados en ${c.grupos.length} grupo(s) · media ${f(c.media)}</div>
            </div>`).join('') || '<p class="text-sm text-gray-500">No hay competencias evaluadas de este carácter.</p>';
    }

    function renderRiesgo(prog, f) {
        const q = U.normalizarTexto(busqueda);
        const estado = $('programaFiltroEstado').value;
        const lista = prog.riesgo.filter(x => (!estado || x.r.estado === estado) && (!q || U.normalizarTexto(`${x.r.nombre} ${x.r.id} ${x.grupo}`).includes(q)));
        const dims = Object.entries(CONFIG.DIMENSIONES);
        const max = prog.escala.maxima;
        $('programaConteoRiesgo').textContent = `${lista.length} de ${prog.riesgo.length} estudiantes con alerta`;
        $('programaRiesgo').innerHTML = `<thead><tr><th>Estudiante</th><th>Grupo</th><th class="num">Promedio</th><th class="num">Necesita</th><th>Estado</th>${dims.map(([, d]) => `<th class="num" style="color:${d.color}">${e(d.corta)}</th>`).join('')}</tr></thead><tbody>${
            lista.map(x => `<tr><td><button type="button" class="nombre-est" data-estudiante="${e(x.r.id)}" data-de-grupo="${e(x.grupoId)}">${e(x.r.nombre)}</button></td>
                <td class="text-xs">${e(x.grupo)}</td>
                <td class="num">${f(x.r.promedio)}</td>
                <td class="num">${x.r.necesaria === null ? '—' : x.r.necesaria > max ? `<span class="nota-baja">&gt; ${max}</span>` : f(x.r.necesaria)}</td>
                <td>${UIAnalisis.badgeEstado(x.r.estado)}</td>
                ${dims.map(([k]) => `<td class="num">${f(x.r.dimensiones?.[k])}</td>`).join('')}</tr>`).join('') || `<tr><td colspan="${5 + dims.length}" class="vacio">Ningún estudiante con alerta coincide con la búsqueda.</td></tr>`}</tbody>`;
    }

    function irAGrupo(id, pestana = 'analisis') {
        if (!Estado.activar(id)) return;
        Estado.confirmar({ origen: 'grupo', sinRedibujar: true });
        App.irA(pestana);
        mostrarNotificacion('Grupo activo', Estado.obtener().nombre, 'info', 2500);
    }

    // ---------------------------------------------------------------- Carácter de las competencias (modal)

    function cursosEnUso() {
        const ids = new Set(Estado.gruposConDatos().map(g => g.competencias?.cursoActivo).filter(Boolean));
        const cursos = Estado.obtenerProyecto().catalogo?.cursos || [];
        return [...cursos.filter(c => ids.has(c.id)), ...cursos.filter(c => !ids.has(c.id))].map(c => ({ curso: c, enUso: ids.has(c.id) }));
    }

    function abrirDimensiones() {
        const lista = cursosEnUso();
        if (!lista.length) { mostrarNotificacion('Sin catálogo', 'Primero cargue el archivo de competencias en la pestaña 1.', 'warning'); return; }
        const actual = Estado.obtener().competencias?.cursoActivo;
        $('dimCurso').innerHTML = lista.map(({ curso, enUso }) => `<option value="${e(curso.id)}" ${curso.id === actual ? 'selected' : ''}>${e(curso.nombre)}${enUso ? ' · en uso' : ''}</option>`).join('');
        if (!$('dimFiltro').options.length) $('dimFiltro').innerHTML = '<option value="">Todos los caracteres</option>' + Object.entries(CONFIG.DIMENSIONES).map(([k, d]) => `<option value="${k}">${e(d.etiqueta)}</option>`).join('');
        $('dimBuscar').value = '';
        renderDimensionesModal();
        abrirModal('modalDimensiones');
    }

    function cursoModal() {
        return (Estado.obtenerProyecto().catalogo?.cursos || []).find(c => c.id === $('dimCurso').value);
    }

    function renderDimensionesModal() {
        const curso = cursoModal();
        if (!curso) return;
        const filtro = $('dimFiltro').value;
        const q = U.normalizarTexto($('dimBuscar').value);
        const cuenta = {};
        curso.competencias.forEach(c => { const k = Analisis.dimensionDe(c); cuenta[k] = (cuenta[k] || 0) + 1; });
        $('dimResumen').innerHTML = Object.entries(CONFIG.DIMENSIONES).map(([k, d]) => `<span class="chip chip-dim" style="background:${d.fondo};color:${d.color}" title="${e(d.descripcion)}">${e(d.etiqueta)}: ${cuenta[k] || 0}</span>`).join('') +
            `<span class="chip chip-otro">Corregidas a mano: ${curso.competencias.filter(c => c.dimensionManual).length}</span>`;
        const visibles = curso.competencias.filter(c => (!filtro || Analisis.dimensionDe(c) === filtro) && (!q || U.normalizarTexto(`${c.numero} ${c.texto} ${c.criterio}`).includes(q)));
        $('dimLista').innerHTML = visibles.map(c => {
            const auto = CONFIG.DIMENSIONES[c.dimension] || CONFIG.DIMENSIONES[Analisis.clasificarDimension(c.texto, c.criterio).dimension];
            return `<div class="comp-dim" data-comp="${e(c.id)}">
                <b class="text-indigo-700">${c.numero}.</b>
                <div>${e(c.texto)}${c.criterio ? `<div class="crit">Criterio: ${e(c.criterio)}</div>` : ''}${c.dimensionManual ? `<div class="manual">Corregida (automática: ${e(auto.etiqueta)})</div>` : ''}</div>
                <select class="form-input" aria-label="Carácter de la competencia ${c.numero}" style="border-left:4px solid ${CONFIG.DIMENSIONES[Analisis.dimensionDe(c)].color}">
                    ${Object.entries(CONFIG.DIMENSIONES).map(([k, d]) => `<option value="${k}" ${Analisis.dimensionDe(c) === k ? 'selected' : ''}>${e(d.etiqueta)}${c.dimension === k ? ' (automático)' : ''}</option>`).join('')}
                </select>
            </div>`;
        }).join('') || '<p class="text-sm text-gray-500">No hay competencias que coincidan.</p>';
    }

    // ---------------------------------------------------------------- Eventos

    function init() {
        $('programaPdfBtn').addEventListener('click', () => UIInformes.descargarPDF('programa'));
        $('programaExcelBtn').addEventListener('click', () => UIInformes.exportarExcelPrograma());
        $('programaCaracterBtn').addEventListener('click', abrirDimensiones);
        $('programaTablaGrupos').addEventListener('click', ev => {
            const fila = ev.target.closest('[data-grupo]');
            if (fila) irAGrupo(fila.dataset.grupo);
        });
        $('programaFiltroDim').addEventListener('change', () => renderCompetencias(App.programa(), v => U.formatoNota(v, Estado.obtener().escala.decimales ?? 2)));
        $('programaOrdenComp').addEventListener('change', () => renderCompetencias(App.programa(), v => U.formatoNota(v, Estado.obtener().escala.decimales ?? 2)));
        const refrescarRiesgo = () => renderRiesgo(App.programa(), v => U.formatoNota(v, Estado.obtener().escala.decimales ?? 2));
        $('programaBuscar').addEventListener('input', ev => { busqueda = ev.target.value; refrescarRiesgo(); });
        $('programaFiltroEstado').addEventListener('change', refrescarRiesgo);
        $('programaRiesgo').addEventListener('click', ev => {
            const b = ev.target.closest('[data-estudiante]');
            if (!b) return;
            if (Estado.obtener().id !== b.dataset.deGrupo) { Estado.activar(b.dataset.deGrupo); Estado.confirmar({ origen: 'grupo', sinRedibujar: true }); }
            UIEstudiantes.abrirEstudiante(b.dataset.estudiante, App.grupo().resultados.map(r => r.id));
        });

        $('dimCurso').addEventListener('change', renderDimensionesModal);
        $('dimFiltro').addEventListener('change', renderDimensionesModal);
        $('dimBuscar').addEventListener('input', renderDimensionesModal);
        $('dimLista').addEventListener('change', ev => {
            const fila = ev.target.closest('[data-comp]');
            const comp = fila && Estado.competencia(fila.dataset.comp);
            if (!comp) return;
            if (ev.target.value === comp.dimension) delete comp.dimensionManual; else comp.dimensionManual = ev.target.value;
            Estado.confirmar({ origen: 'dimensiones' });
            renderDimensionesModal();
        });
        $('dimRestablecerBtn').addEventListener('click', async () => {
            const curso = cursoModal();
            const n = curso?.competencias.filter(c => c.dimensionManual).length || 0;
            if (!n) { mostrarNotificacion('Sin cambios', 'Este curso no tiene correcciones manuales.', 'info'); return; }
            if (!await confirmar(`Se quitarán las ${n} correcciones manuales de «${curso.nombre}».`, { titulo: 'Volver a la clasificación automática', textoAceptar: 'Restablecer' })) return;
            curso.competencias.forEach(c => { delete c.dimensionManual; });
            Estado.confirmar({ origen: 'dimensiones' });
            renderDimensionesModal();
        });
    }

    global.UIPrograma = { init, render, abrirDimensiones, irAGrupo };
})(window);
