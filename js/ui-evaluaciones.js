/**
 * Pestaña 2 · Evaluaciones: porcentajes, tipo, fecha, competencias y recursos de cada evaluación.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);

    let claveActual = null;       // evaluación abierta en un modal
    let seleccionComp = new Set(); // competencias marcadas en el modal

    function evaluacion(clave) {
        return Estado.obtener().evaluaciones.find(ev => ev.clave === clave);
    }

    /** Guarda un cambio pequeño sin redibujar la tabla (para no perder el foco al pasar de un campo a otro). */
    function guardarSinRedibujar() {
        Estado.confirmar({ origen: 'evaluaciones', sinRedibujar: true });
        renderTotal();
    }

    function contarRecursos(ev) {
        return Object.keys(CONFIG.TIPOS_RECURSO).reduce((s, t) => s + U.lineas(ev.recursos?.[t]).length, 0);
    }

    function renderTotal() {
        const d = Estado.obtener();
        const total = U.redondear(d.evaluaciones.filter(ev => ev.incluida !== false).reduce((s, ev) => s + (Number(ev.peso) || 0), 0), 2);
        const badge = $('totalPesos');
        badge.textContent = `${total}%`;
        badge.className = `badge text-base ${Math.abs(total - 100) < 0.01 ? 'badge-ok' : 'badge-alerta'}`;
        const evaluado = U.redondear(d.evaluaciones.filter(ev => ev.incluida !== false && Analisis.estaCalificada(d, ev)).reduce((s, ev) => s + (Number(ev.peso) || 0), 0), 2);
        const avisos = [];
        if (d.evaluaciones.length && Math.abs(total - 100) >= 0.01) avisos.push(`<div class="warning-box mb-2">Los porcentajes suman <b>${total}%</b>. Ajústelos para que sumen 100% (puede usar «Repartir porcentajes»). Mientras tanto, las notas se calculan sobre ${total}%.</div>`);
        if (d.evaluaciones.length) avisos.push(`<div class="info-box">Hasta ahora se ha evaluado el <b>${evaluado}%</b> del curso. Las evaluaciones sin notas en la planilla se consideran pendientes y sirven para calcular la nota que cada estudiante necesita.</div>`);
        $('avisosEvaluaciones').innerHTML = avisos.join('');
    }

    function render() {
        const d = Estado.obtener();
        const tbody = $('tablaEvaluaciones').querySelector('tbody');
        $('presetPesos').innerHTML = CONFIG.PRESETS_PESOS.map(p => `<option value="${p.id}">${e(p.etiqueta)}</option>`).join('');
        if (!d.evaluaciones.length) {
            tbody.innerHTML = '<tr><td colspan="10" class="vacio">Cargue una planilla de notas en la pestaña 1 para configurar las evaluaciones.</td></tr>';
            renderTotal();
            return;
        }
        const tipos = Object.entries(CONFIG.TIPOS_EVALUACION);
        const indice = Analisis.indiceCompetencias(d);
        const opcionesCaracter = Object.entries(CONFIG.DIMENSIONES);
        tbody.innerHTML = d.evaluaciones.map(ev => {
            const n = d.estudiantes.filter(est => est.notas[ev.clave] !== null && est.notas[ev.clave] !== undefined).length;
            const comps = (ev.competencias || []).filter(id => indice.has(id));
            const nRec = contarRecursos(ev);
            return `<tr data-clave="${e(ev.clave)}" class="${ev.incluida === false ? 'fila-excluida' : ''}">
                <td><input type="checkbox" data-prop="incluida" ${ev.incluida !== false ? 'checked' : ''} aria-label="Incluir ${e(ev.nombre)} en la nota"></td>
                <td><input class="form-input input-tabla" data-prop="nombre" value="${e(ev.nombre)}" aria-label="Nombre de la evaluación"></td>
                <td><span class="chip chip-${e(ev.tipo)}">${e(ev.encabezado || ev.clave)}</span></td>
                <td><select class="form-input input-tabla" data-prop="tipo" aria-label="Tipo" style="min-width:7.5rem">${tipos.map(([k, v]) => `<option value="${k}" ${k === ev.tipo ? 'selected' : ''}>${e(v)}</option>`).join('')}</select></td>
                <td><input class="form-input input-tabla" type="date" data-prop="fecha" value="${e(ev.fecha || '')}" aria-label="Fecha"></td>
                <td><input class="form-input input-tabla input-peso" type="number" min="0" max="100" step="0.5" data-prop="peso" value="${e(ev.peso)}" aria-label="Porcentaje"></td>
                <td>${n ? `<span class="badge badge-ok">${n} / ${d.estudiantes.length}</span>` : '<span class="badge badge-aviso" title="Nadie tiene nota todavía">Pendiente</span>'}</td>
                <td><button type="button" class="btn btn-secondary btn-sm" data-accion="competencias" title="${e(comps.map(id => `${indice.get(id).numero}. ${indice.get(id).texto}`).join('\n'))}">${comps.length ? `${comps.length} asociadas` : 'Asociar'}</button></td>
                <td><select class="form-input input-tabla" data-prop="caracter" aria-label="Carácter de ${e(ev.nombre)}">
                        <option value="">Automático</option>${opcionesCaracter.map(([k, dim]) => `<option value="${k}" ${ev.caracter === k ? 'selected' : ''}>${e(dim.etiqueta)}</option>`).join('')}
                    </select><span class="perfil-ev" data-perfil>${e(textoPerfil(ev, indice))}</span></td>
                <td><button type="button" class="btn btn-secondary btn-sm" data-accion="recursos">${nRec ? `${nRec} recursos` : 'Agregar'}</button></td>
            </tr>`;
        }).join('');
        renderTotal();
    }

    /** Texto corto del carácter efectivo de una evaluación (lo que se usa en el análisis). */
    function textoPerfil(ev, indice) {
        const p = Analisis.perfilEvaluacion(ev, indice);
        if (!p) return 'Sin definir: asocie competencias';
        if (CONFIG.DIMENSIONES[ev.caracter]) return 'Fijado por el docente';
        return Object.entries(p).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${CONFIG.DIMENSIONES[k].corta} ${U.redondear(w * 100, 0)}%`).join(' · ') + ((ev.competencias || []).length ? '' : ' (por tipo)');
    }

    /**
     * Copia la configuración del grupo activo (porcentajes, fechas, tipo, carácter, competencias y recursos)
     * a los demás grupos que tengan evaluaciones con las mismas claves.
     */
    async function copiarAGrupos() {
        const d = Estado.obtener();
        const otros = Estado.gruposConDatos().filter(g => g.id !== d.id);
        if (!otros.length) { mostrarNotificacion('Un solo grupo', 'Cargue más grupos en la pestaña 1 para copiarles esta configuración.', 'info'); return; }
        const compatibles = otros.filter(g => g.evaluaciones.some(ev => d.evaluaciones.some(x => x.clave === ev.clave)));
        if (!compatibles.length) { mostrarNotificacion('Sin evaluaciones comunes', 'Ningún otro grupo tiene evaluaciones con las mismas columnas.', 'warning'); return; }
        if (!await confirmar(`Se copiarán porcentajes, fechas, tipo, carácter, competencias y recursos de las evaluaciones de «${d.nombre}» a ${compatibles.length} grupo(s): ${compatibles.map(g => g.nombre).join(', ')}.

Solo se modifican las evaluaciones con la misma columna (por ejemplo 1P, Q2).`, { titulo: 'Copiar a los demás grupos', textoAceptar: 'Copiar' })) return;
        compatibles.forEach(g => {
            if (d.competencias?.cursoActivo && g.competencias) g.competencias.cursoActivo = d.competencias.cursoActivo;
            g.evaluaciones.forEach(ev => {
                const m = d.evaluaciones.find(x => x.clave === ev.clave);
                if (!m) return;
                Object.assign(ev, { peso: m.peso, fecha: m.fecha, tipo: m.tipo, nombre: m.nombre, incluida: m.incluida, caracter: m.caracter || '', competencias: [...(m.competencias || [])], recursos: { ...m.recursos } });
            });
        });
        Estado.confirmar({ origen: 'evaluaciones' });
        mostrarNotificacion('Configuración copiada', `${compatibles.length} grupo(s) actualizados.`, 'success');
    }

    // ---------------------------------------------------------------- Modal de competencias

    function abrirCompetencias(clave) {
        const d = Estado.obtener();
        if (!d.competencias) {
            mostrarNotificacion('Sin catálogo', 'Primero cargue el archivo de competencias en la pestaña 1.', 'warning');
            return;
        }
        claveActual = clave;
        const ev = evaluacion(clave);
        seleccionComp = new Set(ev.competencias || []);
        $('tituloModalComp').textContent = `Competencias que evalúa: ${ev.nombre}`;
        $('compCurso').innerHTML = d.competencias.cursos.map(c => `<option value="${e(c.id)}" ${c.id === d.competencias.cursoActivo ? 'selected' : ''}>${e(c.nombre)}</option>`).join('');
        $('compBuscar').value = '';
        renderListaCompetencias();
        abrirModal('modalCompetencias');
    }

    function renderListaCompetencias() {
        const d = Estado.obtener();
        const curso = d.competencias.cursos.find(c => c.id === $('compCurso').value);
        const filtro = U.normalizarTexto($('compBuscar').value);
        const usos = {};
        d.evaluaciones.forEach(ev => { if (ev.clave !== claveActual) (ev.competencias || []).forEach(id => { (usos[id] ||= []).push(ev.clave); }); });
        const visibles = curso.competencias.filter(c => !filtro || U.normalizarTexto(`${c.numero} ${c.texto} ${c.criterio}`).includes(filtro));
        $('compLista').innerHTML = (visibles.map(c => `
            <label class="comp-item ${seleccionComp.has(c.id) ? 'marcada' : ''}">
                <input type="checkbox" value="${e(c.id)}" ${seleccionComp.has(c.id) ? 'checked' : ''}>
                <span class="num">${c.numero}.</span>
                <span><span>${e(c.texto)}</span> ${chipDim(c)}${c.criterio ? `<div class="crit">Criterio: ${e(c.criterio)}</div>` : ''}${usos[c.id] ? `<div class="usada">También en: ${e(usos[c.id].join(', '))}</div>` : ''}</span>
            </label>`).join('') || '<p class="text-gray-500 text-sm">No hay competencias que coincidan con la búsqueda.</p>') +
            (curso.notas?.length ? `<div class="notas-curso"><b>Notas del curso:</b><ul class="list-disc pl-5">${curso.notas.map(n => `<li>${e(n)}</li>`).join('')}</ul></div>` : '');
        $('compConteo').textContent = `${seleccionComp.size} competencia(s) marcada(s)`;
    }

    function chipDim(c) {
        const dim = CONFIG.DIMENSIONES[Analisis.dimensionDe(c)];
        return `<span class="chip chip-dim" style="background:${dim.fondo};color:${dim.color}" title="${e(dim.descripcion)}">${e(dim.etiqueta)}</span>`;
    }

    function guardarCompetencias() {
        const ev = evaluacion(claveActual);
        if (!ev) return;
        ev.competencias = [...seleccionComp];
        cerrarModal('modalCompetencias');
        Estado.confirmar({ origen: 'evaluaciones' });
        mostrarNotificacion('Competencias guardadas', `${ev.nombre}: ${ev.competencias.length} competencia(s).`, 'success', 3000);
    }

    // ---------------------------------------------------------------- Modal de recursos

    function abrirRecursos(clave) {
        claveActual = clave;
        const ev = evaluacion(clave);
        $('tituloModalRec').textContent = `Recursos de estudio: ${ev.nombre}`;
        $('recursosCampos').innerHTML = Object.entries(CONFIG.TIPOS_RECURSO).map(([k, v]) => `
            <div><label class="form-label" for="rec-${k}">${e(v)}</label>
            <textarea id="rec-${k}" data-tipo="${k}" class="form-input text-sm" rows="6" placeholder="${k === 'ejercicios' ? 'Libro guía, pág. 45, ejercicios 1 a 20' : 'Título | https://...'}">${e(ev.recursos?.[k] || '')}</textarea></div>`).join('');
        abrirModal('modalRecursos');
    }

    function combinar(texto, nuevas) {
        const actuales = U.lineas(texto);
        const vistos = new Set(actuales.map(l => U.normalizarTexto(l)));
        nuevas.forEach(l => { if (!vistos.has(U.normalizarTexto(l))) actuales.push(l); });
        return actuales.join('\n');
    }

    function sugerirEnModal() {
        const ev = evaluacion(claveActual);
        const s = Recursos.sugerir(Estado.obtener(), ev);
        document.querySelectorAll('#recursosCampos textarea').forEach(t => { t.value = combinar(t.value, s[t.dataset.tipo] || []); });
        if (!(ev.competencias || []).length) mostrarNotificacion('Sugerencias generales', 'Esta evaluación no tiene competencias asociadas; las búsquedas se hicieron con el nombre del curso.', 'info');
    }

    function guardarRecursos() {
        const ev = evaluacion(claveActual);
        if (!ev) return;
        document.querySelectorAll('#recursosCampos textarea').forEach(t => { ev.recursos[t.dataset.tipo] = U.lineas(t.value).join('\n'); });
        cerrarModal('modalRecursos');
        Estado.confirmar({ origen: 'evaluaciones' });
    }

    function sugerirTodos() {
        const d = Estado.obtener();
        let n = 0;
        d.evaluaciones.filter(ev => ev.incluida !== false && !contarRecursos(ev)).forEach(ev => {
            const s = Recursos.sugerir(d, ev);
            Object.keys(CONFIG.TIPOS_RECURSO).forEach(t => { ev.recursos[t] = (s[t] || []).join('\n'); });
            n++;
        });
        if (!n) { mostrarNotificacion('Nada que sugerir', 'Todas las evaluaciones incluidas ya tienen recursos.', 'info'); return; }
        Estado.confirmar({ origen: 'evaluaciones' });
        mostrarNotificacion('Recursos sugeridos', `Se agregaron enlaces de estudio a ${n} evaluación(es). Revíselos y complételos con su material.`, 'success');
    }

    async function distribuir() {
        const d = Estado.obtener();
        if (!d.competencias) { mostrarNotificacion('Sin catálogo', 'Primero cargue el archivo de competencias en la pestaña 1.', 'warning'); return; }
        const curso = Estado.cursoActivo(d);
        if (d.evaluaciones.some(ev => (ev.competencias || []).length) &&
            !await confirmar(`Se reemplazarán las competencias asociadas a todas las evaluaciones por las ${curso.competencias.length} de «${curso.nombre}», repartidas en orden entre los parciales. Cada quiz toma las de su parcial.`, { titulo: 'Distribuir competencias', textoAceptar: 'Distribuir' })) return;
        Estado.distribuirCompetencias(curso.id, d);
        Estado.confirmar({ origen: 'evaluaciones' });
        mostrarNotificacion('Competencias distribuidas', `Revise y ajuste las de cada evaluación con el botón de la columna «Competencias».`, 'success');
    }

    // ---------------------------------------------------------------- Eventos

    function init() {
        const tbody = $('tablaEvaluaciones').querySelector('tbody');
        tbody.addEventListener('change', ev => {
            const el = ev.target;
            const fila = el.closest('tr[data-clave]');
            if (!fila || !el.dataset.prop) return;
            const evaluacionActual = evaluacion(fila.dataset.clave);
            const prop = el.dataset.prop;
            if (prop === 'incluida') {
                evaluacionActual.incluida = el.checked;
                fila.classList.toggle('fila-excluida', !el.checked);
            } else if (prop === 'peso') {
                const v = parseFloat(el.value);
                if (Number.isNaN(v) || v < 0 || v > 100) { el.value = evaluacionActual.peso; mostrarNotificacion('Porcentaje no válido', 'Escriba un valor entre 0 y 100.', 'warning'); return; }
                evaluacionActual.peso = v;
            } else if (prop === 'nombre') {
                evaluacionActual.nombre = el.value.trim() || evaluacionActual.encabezado || evaluacionActual.clave;
            } else {
                evaluacionActual[prop] = el.value;
            }
            if (prop === 'caracter') fila.querySelector('[data-perfil]').textContent = textoPerfil(evaluacionActual, Analisis.indiceCompetencias(Estado.obtener()));
            guardarSinRedibujar();
        });
        tbody.addEventListener('click', ev => {
            const btn = ev.target.closest('[data-accion]');
            if (!btn) return;
            const clave = btn.closest('tr').dataset.clave;
            if (btn.dataset.accion === 'competencias') abrirCompetencias(clave); else abrirRecursos(clave);
        });
        $('aplicarPresetBtn').addEventListener('click', () => {
            const d = Estado.obtener();
            if (!d.evaluaciones.length) return;
            const pesos = Analisis.pesosSugeridos(d.evaluaciones, $('presetPesos').value);
            d.evaluaciones.forEach(ev => { ev.peso = pesos[ev.clave] || 0; });
            Estado.confirmar({ origen: 'evaluaciones' });
        });
        $('distribuirCompBtn').addEventListener('click', distribuir);
        $('sugerirTodosBtn').addEventListener('click', sugerirTodos);
        $('configATodosBtn').addEventListener('click', copiarAGrupos);

        $('compCurso').addEventListener('change', renderListaCompetencias);
        $('compBuscar').addEventListener('input', renderListaCompetencias);
        $('compLista').addEventListener('change', ev => {
            if (ev.target.type !== 'checkbox') return;
            if (ev.target.checked) seleccionComp.add(ev.target.value); else seleccionComp.delete(ev.target.value);
            ev.target.closest('.comp-item').classList.toggle('marcada', ev.target.checked);
            $('compConteo').textContent = `${seleccionComp.size} competencia(s) marcada(s)`;
        });
        $('compTodasBtn').addEventListener('click', () => { document.querySelectorAll('#compLista input[type=checkbox]').forEach(c => seleccionComp.add(c.value)); renderListaCompetencias(); });
        $('compNingunaBtn').addEventListener('click', () => { seleccionComp.clear(); renderListaCompetencias(); });
        $('compGuardarBtn').addEventListener('click', guardarCompetencias);
        $('recSugerirBtn').addEventListener('click', sugerirEnModal);
        $('recGuardarBtn').addEventListener('click', guardarRecursos);
    }

    global.UIEvaluaciones = { init, render };
})(window);
