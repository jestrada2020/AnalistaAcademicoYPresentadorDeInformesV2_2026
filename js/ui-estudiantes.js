/**
 * Pestaña 4 · Estudiantes: filtro por varios criterios, tabla con la situación de cada estudiante,
 * selección para informes y ficha individual con observaciones.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);

    let orden = { col: null, dir: 1 };
    let busqueda = '';
    let visibles = [];          // resultados que se muestran en la tabla (tras filtro y búsqueda)
    let fichaLista = [];        // ids que se recorren con Anterior/Siguiente en la ficha
    let fichaId = null;
    let temporizadorObs = null;

    // ---------------------------------------------------------------- Filtro

    function opcionesCampo(d, valor) {
        const op = ([k, v]) => `<option value="${k}" ${k === valor ? 'selected' : ''}>${e(v.etiqueta)}</option>`;
        const campos = Object.entries(Analisis.CAMPOS_FILTRO);
        const calc = campos.filter(([k]) => !k.startsWith('dim:')).map(op).join('');
        const dims = campos.filter(([k]) => k.startsWith('dim:')).map(op).join('');
        const evs = d.evaluaciones.map(ev => `<option value="ev:${e(ev.clave)}" ${`ev:${ev.clave}` === valor ? 'selected' : ''}>${e(ev.nombre)} (${e(ev.clave)})</option>`).join('');
        return `<optgroup label="Situación del estudiante">${calc}</optgroup><optgroup label="Carácter de las competencias">${dims}</optgroup>${evs ? `<optgroup label="Nota de una evaluación">${evs}</optgroup>` : ''}`;
    }

    function esOpcion(campo) { return Analisis.CAMPOS_FILTRO[campo]?.tipo === 'opcion'; }

    function opcionesComparador(campo, valor) {
        const permitidos = esOpcion(campo) ? ['eq', 'neq'] : campo.startsWith('ev:') ? Object.keys(Analisis.COMPARADORES) : Object.keys(Analisis.COMPARADORES).filter(k => !Analisis.COMPARADORES[k].sinValor);
        return permitidos.map(k => `<option value="${k}" ${k === valor ? 'selected' : ''}>${e(Analisis.COMPARADORES[k].etiqueta)}</option>`).join('');
    }

    function controlValor(d, c) {
        if (Analisis.COMPARADORES[c.comparador]?.sinValor) return '<span class="text-xs text-gray-400">—</span>';
        if (c.campo === 'estado') return `<select class="form-input input-tabla" data-parte="valor" aria-label="Valor">${Object.entries(CONFIG.ESTADOS).map(([k, v]) => `<option value="${k}" ${k === c.valor ? 'selected' : ''}>${e(v.etiqueta)}</option>`).join('')}</select>`;
        if (c.campo === 'nivel') return `<select class="form-input input-tabla" data-parte="valor" aria-label="Valor">${d.niveles.map(n => `<option value="${e(n.nombre)}" ${n.nombre === c.valor ? 'selected' : ''}>${e(n.nombre)}</option>`).join('')}</select>`;
        const entero = c.campo === 'perdidas' || c.campo === 'faltantes';
        return `<input class="form-input input-tabla" type="number" data-parte="valor" step="${entero ? 1 : 0.1}" min="0" value="${e(c.valor ?? '')}" placeholder="${entero ? 'cantidad' : 'nota'}" aria-label="Valor">`;
    }

    function renderCriterios() {
        const d = Estado.obtener();
        $('operadorFiltro').value = d.filtro.operador || 'Y';
        $('filtrosRapidos').innerHTML = Object.entries(Analisis.filtrosRapidos(d)).map(([k, f]) => `<button type="button" class="chip-filtro" data-rapido="${k}">${e(f.etiqueta)}</button>`).join('');
        $('criteriosFiltro').innerHTML = d.filtro.criterios.map((c, i) => `
            <div class="criterio-fila" data-indice="${i}">
                <select class="form-input input-tabla" data-parte="campo" aria-label="Campo del criterio ${i + 1}">${opcionesCampo(d, c.campo)}</select>
                <select class="form-input input-tabla" data-parte="comparador" aria-label="Comparación">${opcionesComparador(c.campo, c.comparador)}</select>
                ${controlValor(d, c)}
                <button type="button" class="icon-btn peligro" data-quitar="${i}" aria-label="Quitar criterio" title="Quitar criterio">✕</button>
            </div>`).join('') || '<p class="text-sm text-gray-500">Sin criterios: se muestran todos los estudiantes. Use un filtro rápido o agregue un criterio.</p>';
        renderResumenFiltro();
    }

    function renderResumenFiltro() {
        const d = Estado.obtener();
        const validos = d.filtro.criterios.filter(Analisis.criterioValido);
        $('resumenFiltro').textContent = validos.length
            ? `Se muestran los estudiantes con: ${validos.map(c => Analisis.describirCriterio(d, c)).join(d.filtro.operador === 'O' ? ' O ' : ' Y ')}.`
            : '';
    }

    function filtroCambiado(redibujarCriterios = false) {
        Estado.confirmar({ origen: 'filtro', sinRedibujar: true });
        if (redibujarCriterios) renderCriterios(); else renderResumenFiltro();
        renderTabla();
    }

    // ---------------------------------------------------------------- Tabla

    function valorOrden(r, col) {
        if (col === 'nombre') return U.normalizarTexto(r.nombre);
        if (col === 'id') return r.id;
        if (col === 'estado') return CONFIG.ESTADOS[r.estado].orden;
        if (col === 'nivel') return r.promedio ?? -1;
        if (col.startsWith('ev:')) return r.estudiante.notas[col.slice(3)] ?? -1;
        if (col.startsWith('dim:')) return r.dimensiones?.[col.slice(4)] ?? -1;
        return r[col] ?? -1;
    }

    function renderTabla() {
        const d = Estado.obtener();
        const tabla = $('tablaEstudiantes');
        if (!d.estudiantes.length) {
            tabla.innerHTML = '<tbody><tr><td class="vacio">Cargue una planilla de notas en la pestaña 1.</td></tr></tbody>';
            $('conteoEstudiantes').textContent = '';
            visibles = [];
            return;
        }
        const filtrados = App.filtrados();
        const q = U.normalizarTexto(busqueda);
        visibles = q ? filtrados.filter(r => U.normalizarTexto(`${r.nombre} ${r.id}`).includes(q)) : [...filtrados];
        if (orden.col) visibles.sort((a, b) => { const x = valorOrden(a, orden.col); const y = valorOrden(b, orden.col); return (x < y ? -1 : x > y ? 1 : 0) * orden.dir; });

        const evs = d.evaluaciones.filter(ev => ev.incluida !== false);
        const g = App.grupo();
        const dims = Object.entries(CONFIG.DIMENSIONES).filter(([k]) => g.dimensiones[k].n);
        const sel = new Set(d.seleccion);
        const ap = d.escala.aprobatoria;
        const dec = d.escala.decimales ?? 2;
        const th = (col, texto, num = false, titulo = '') => `<th class="ordenable ${num ? 'num' : ''}" data-orden="${e(col)}" ${titulo ? `title="${e(titulo)}"` : ''}>${texto}${orden.col === col ? `<span class="flecha">${orden.dir > 0 ? '▲' : '▼'}</span>` : ''}</th>`;
        const todosSel = visibles.length && visibles.every(r => sel.has(r.id));
        let h = `<thead><tr><th><input type="checkbox" id="selTodos" ${todosSel ? 'checked' : ''} aria-label="Seleccionar todos los mostrados"></th>${th('nombre', 'Estudiante')}${th('id', 'Documento')}`;
        h += evs.map(ev => th(`ev:${ev.clave}`, e(ev.clave), true, `${ev.nombre} · ${U.redondear(ev.peso, 2)}%`)).join('');
        h += `${th('acumulado', 'Acum.', true, 'Nota acumulada sobre la nota final')}${th('promedio', 'Prom.', true, 'Promedio de lo evaluado')}${th('nivel', 'Nivel')}${th('estado', 'Estado')}${th('necesaria', 'Necesita', true, 'Nota promedio que necesita en lo que falta para aprobar')}${dims.map(([k, dim]) => th(`dim:${k}`, `<span style="color:${dim.color}">${e(dim.corta)}</span>`, true, `Nota en ${dim.etiqueta.toLowerCase()}: ${dim.descripcion}`)).join('')}</tr></thead><tbody>`;
        h += visibles.map(r => {
            const celdas = evs.map(ev => {
                const n = r.estudiante.notas[ev.clave];
                const det = r.detalle.find(x => x.clave === ev.clave);
                if (n === null || n === undefined) {
                    return det?.estado === 'faltante' ? `<td class="num"><span class="nota-np px-1" title="No presentó">${r.estudiante.marcas?.[ev.clave] === 'NP' ? 'NP' : '0'}</span></td>` : '<td class="num text-gray-300">·</td>';
                }
                return `<td class="num"><span class="${n < ap - 1e-9 ? 'nota-baja px-1' : ''}">${U.formatoNota(n, dec)}</span></td>`;
            }).join('');
            return `<tr class="${sel.has(r.id) ? 'seleccionado' : ''}" data-id="${e(r.id)}">
                <td><input type="checkbox" data-sel="${e(r.id)}" ${sel.has(r.id) ? 'checked' : ''} aria-label="Seleccionar a ${e(r.nombre)}"></td>
                <td><button type="button" class="nombre-est" data-estudiante="${e(r.id)}">${e(r.nombre)}</button>${d.observaciones[r.id] ? ' <span title="Tiene observaciones">📝</span>' : ''}${r.tendencia === 'baja' ? ' <span title="Tendencia a la baja" class="text-red-600">↘</span>' : r.tendencia === 'mejora' ? ' <span title="Tendencia a la mejora" class="text-green-600">↗</span>' : ''}</td>
                <td class="text-xs text-gray-500">${e(r.id)}</td>${celdas}
                <td class="num font-semibold">${U.formatoNota(r.acumulado, dec)}</td>
                <td class="num"><span class="${r.promedio !== null && r.promedio < ap - 1e-9 ? 'nota-baja px-1' : 'font-semibold'}">${U.formatoNota(r.promedio, dec)}</span></td>
                <td>${r.nivel ? `<span class="badge" style="color:${r.nivel.color}">${e(r.nivel.nombre)}</span>` : '—'}</td>
                <td>${UIAnalisis.badgeEstado(r.estado)}</td>
                <td class="num">${r.necesaria === null ? '—' : r.necesaria > d.escala.maxima ? `<span class="nota-baja px-1">&gt; ${d.escala.maxima}</span>` : U.formatoNota(r.necesaria, dec)}</td>
                ${dims.map(([k]) => { const v = r.dimensiones?.[k]; return `<td class="num"><span class="${v !== null && v !== undefined && v < ap - 1e-9 ? 'nota-baja px-1' : ''}">${U.formatoNota(v, dec)}</span></td>`; }).join('')}
            </tr>`;
        }).join('') || `<tr><td colspan="${evs.length + 8 + dims.length}" class="vacio">Ningún estudiante cumple los criterios.</td></tr>`;
        tabla.innerHTML = `${h}</tbody>`;
        $('conteoEstudiantes').textContent = `${visibles.length} de ${d.estudiantes.length} estudiantes · ${d.seleccion.length} seleccionados`;
    }

    function render() {
        renderCriterios();
        renderTabla();
    }

    function cambiarSeleccion(ids, marcar) {
        const d = Estado.obtener();
        const sel = new Set(d.seleccion);
        ids.forEach(id => { if (marcar) sel.add(id); else sel.delete(id); });
        // Conservar el orden de la planilla
        d.seleccion = d.estudiantes.map(x => x.id).filter(id => sel.has(id));
        Estado.confirmar({ origen: 'seleccion', sinRedibujar: true });
    }

    // ---------------------------------------------------------------- Ficha del estudiante

    function abrirEstudiante(id, lista) {
        fichaLista = lista || (visibles.some(r => r.id === id) ? visibles.map(r => r.id) : App.grupo().resultados.map(r => r.id));
        fichaId = id;
        renderFicha();
        abrirModal('modalEstudiante');
    }

    function renderFicha() {
        const d = Estado.obtener();
        const g = App.grupo();
        const r = g.resultados.find(x => x.id === fichaId);
        if (!r) return;
        const i = fichaLista.indexOf(fichaId);
        $('tituloModalEst').textContent = `${r.nombre}${fichaLista.length > 1 ? `  (${i + 1} de ${fichaLista.length})` : ''}`;
        $('estAnteriorBtn').disabled = i <= 0;
        $('estSiguienteBtn').disabled = i < 0 || i >= fichaLista.length - 1;
        if (document.activeElement !== $('estObservacion')) $('estObservacion').value = d.observaciones[r.id] || '';
        $('estSeleccionado').checked = d.seleccion.includes(r.id);
        $('estVista').innerHTML = Informes.htmlIndividual(Informes.modeloIndividual(d, r, g));
    }

    function moverFicha(paso) {
        const i = fichaLista.indexOf(fichaId) + paso;
        if (i < 0 || i >= fichaLista.length) return;
        guardarObservacion();
        fichaId = fichaLista[i];
        $('estObservacion').value = Estado.obtener().observaciones[fichaId] || '';
        renderFicha();
    }

    function guardarObservacion() {
        clearTimeout(temporizadorObs);
        if (!fichaId) return;
        const d = Estado.obtener();
        const texto = $('estObservacion').value.trim();
        if ((d.observaciones[fichaId] || '') === texto) return;
        if (texto) d.observaciones[fichaId] = texto; else delete d.observaciones[fichaId];
        Estado.confirmar({ origen: 'observacion', sinRedibujar: true });
    }

    // ---------------------------------------------------------------- Eventos

    function init() {
        $('operadorFiltro').addEventListener('change', ev => { Estado.obtener().filtro.operador = ev.target.value; filtroCambiado(); });
        $('agregarCriterioBtn').addEventListener('click', () => {
            const d = Estado.obtener();
            d.filtro.criterios.push({ campo: 'promedio', comparador: 'lt', valor: d.escala.aprobatoria });
            filtroCambiado(true);
        });
        $('limpiarFiltroBtn').addEventListener('click', () => { Estado.obtener().filtro = { operador: 'Y', criterios: [] }; filtroCambiado(true); });
        $('filtrosRapidos').addEventListener('click', ev => {
            const b = ev.target.closest('[data-rapido]');
            if (!b) return;
            const f = Analisis.filtrosRapidos(Estado.obtener())[b.dataset.rapido];
            Estado.obtener().filtro = { operador: f.operador, criterios: f.criterios.map(c => ({ ...c })) };
            filtroCambiado(true);
        });
        $('criteriosFiltro').addEventListener('change', ev => {
            const fila = ev.target.closest('[data-indice]');
            if (!fila) return;
            const c = Estado.obtener().filtro.criterios[+fila.dataset.indice];
            const parte = ev.target.dataset.parte;
            c[parte] = ev.target.value;
            if (parte === 'campo') {
                if (c.campo === 'estado') { c.comparador = 'eq'; c.valor = 'riesgo'; } else if (c.campo === 'nivel') { c.comparador = 'eq'; c.valor = Estado.obtener().niveles.at(-1).nombre; } else if (esOpcion(c.campo) === false && ['eq', 'neq'].includes(c.comparador) && typeof c.valor === 'string' && Number.isNaN(+c.valor)) { c.comparador = 'lt'; c.valor = Estado.obtener().escala.aprobatoria; }
            }
            filtroCambiado(parte !== 'valor');
        });
        $('criteriosFiltro').addEventListener('click', ev => {
            const b = ev.target.closest('[data-quitar]');
            if (!b) return;
            Estado.obtener().filtro.criterios.splice(+b.dataset.quitar, 1);
            filtroCambiado(true);
        });

        $('buscarEstudiante').addEventListener('input', ev => { busqueda = ev.target.value; renderTabla(); });
        const tabla = $('tablaEstudiantes');
        tabla.addEventListener('click', ev => {
            const thOrden = ev.target.closest('[data-orden]');
            if (thOrden) {
                const col = thOrden.dataset.orden;
                orden = orden.col === col ? { col, dir: -orden.dir } : { col, dir: col === 'nombre' || col === 'id' ? 1 : -1 };
                renderTabla();
                return;
            }
            const b = ev.target.closest('[data-estudiante]');
            if (b) abrirEstudiante(b.dataset.estudiante);
        });
        tabla.addEventListener('change', ev => {
            if (ev.target.id === 'selTodos') { cambiarSeleccion(visibles.map(r => r.id), ev.target.checked); renderTabla(); return; }
            const id = ev.target.dataset.sel;
            if (!id) return;
            cambiarSeleccion([id], ev.target.checked);
            ev.target.closest('tr').classList.toggle('seleccionado', ev.target.checked);
            $('conteoEstudiantes').textContent = `${visibles.length} de ${Estado.obtener().estudiantes.length} estudiantes · ${Estado.obtener().seleccion.length} seleccionados`;
        });
        $('seleccionarVisiblesBtn').addEventListener('click', () => { cambiarSeleccion(visibles.map(r => r.id), true); renderTabla(); });
        $('quitarSeleccionBtn').addEventListener('click', () => { Estado.obtener().seleccion = []; Estado.confirmar({ origen: 'seleccion', sinRedibujar: true }); renderTabla(); });
        $('informeSeleccionadosBtn').addEventListener('click', () => {
            if (!Estado.obtener().seleccion.length) { mostrarNotificacion('Sin selección', 'Marque uno o más estudiantes en la tabla (o use «Seleccionar los mostrados»).', 'warning'); return; }
            UIInformes.mostrar('seleccionados');
        });

        $('estAnteriorBtn').addEventListener('click', () => moverFicha(-1));
        $('estSiguienteBtn').addEventListener('click', () => moverFicha(1));
        $('estObservacion').addEventListener('input', () => { clearTimeout(temporizadorObs); temporizadorObs = setTimeout(() => { guardarObservacion(); renderFicha(); }, 700); });
        $('estObservacion').addEventListener('blur', () => { guardarObservacion(); renderFicha(); });
        $('estSeleccionado').addEventListener('change', ev => { cambiarSeleccion([fichaId], ev.target.checked); renderTabla(); });
        $('estPdfBtn').addEventListener('click', () => { guardarObservacion(); UIInformes.descargarPDF('ids', [fichaId]); });
        document.addEventListener('keydown', ev => {
            if ($('modalEstudiante').classList.contains('hidden') || ev.target.tagName === 'TEXTAREA') return;
            if (ev.key === 'ArrowLeft') moverFicha(-1);
            if (ev.key === 'ArrowRight') moverFicha(1);
        });
        // Al cerrar la ficha se guardan las observaciones y se actualiza la tabla (ícono de nota).
        new MutationObserver(() => { if ($('modalEstudiante').classList.contains('hidden') && fichaId) { guardarObservacion(); renderTabla(); } })
            .observe($('modalEstudiante'), { attributes: true, attributeFilter: ['class'] });
    }

    global.UIEstudiantes = { init, render, renderTabla, abrirEstudiante };
})(window);
