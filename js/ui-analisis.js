/**
 * Pestaña 3 · Análisis del grupo: indicadores, gráficos, estadísticas por evaluación,
 * competencias críticas y alertas tempranas.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);

    function badgeEstado(estado) {
        const s = CONFIG.ESTADOS[estado];
        return `<span class="badge-estado" style="background:${s.fondo};color:${s.color}">${e(s.etiqueta)}</span>`;
    }

    function barrasHorizontales(items, total) {
        return items.map(it => `
            <div class="barra-h">
                <span class="truncate" title="${e(it.etiqueta)}">${e(it.etiqueta)}</span>
                <div class="pista"><div style="width:${total ? (it.valor / total) * 100 : 0}%;background:${it.color}"></div></div>
                <span class="text-right font-semibold">${it.valor}</span>
            </div>`).join('');
    }

    function render() {
        const d = Estado.obtener();
        const vacio = !d.estudiantes.length;
        $('analisisVacio').classList.toggle('hidden', !vacio);
        $('analisisContenido').classList.toggle('hidden', vacio);
        if (vacio) return;

        const g = App.grupo();
        const s = g.resumen;
        const dec = d.escala.decimales ?? 2;
        const proms = g.resultados.map(r => r.promedio).filter(v => v !== null);
        const aprobando = g.resultados.filter(r => ['aprobado', 'asegurado', 'aprobando'].includes(r.estado)).length;
        const kpi = (k, v, det, color) => `<div class="kpi"><div class="k">${e(k)}</div><div class="v" ${color ? `style="color:${color}"` : ''}>${e(v)}</div><div class="d">${e(det)}</div></div>`;
        $('kpis').innerHTML = [
            kpi('Estudiantes', s.estudiantes, `${s.porEstado['sin-datos']} sin ninguna nota`),
            kpi('Promedio del grupo', U.formatoNota(U.media(proms), dec), `mediana ${U.formatoNota(U.mediana(proms), dec)} · desv. ${U.formatoNota(U.desviacion(proms), dec)}`),
            kpi('Van aprobando', aprobando, `${s.estudiantes ? U.redondear((aprobando / s.estudiantes) * 100, 0) : 0}% del grupo`, '#047857'),
            kpi('En riesgo o perdiendo', s.enRiesgo, `${s.porEstado.perdido + s.porEstado.reprobado} ya no alcanzan la aprobatoria`, '#b91c1c'),
            kpi('Porcentaje evaluado', `${U.redondear(s.pesoEvaluado, 0)}%`, `de ${U.redondear(s.pesoTotal, 0)}% planeado`)
        ].join('');

        $('avisosAnalisis').innerHTML = g.avisos.length ? `<div class="warning-box mb-6">${g.avisos.map(a => e(a)).join('<br>')}</div>` : '';

        const escala = d.escala;
        $('graficoHistograma').innerHTML = Informes.svgBarras(
            Analisis.histograma(proms, escala).map(b => ({ etiqueta: `${b.desde}–${b.hasta}`, valor: b.n, color: b.desde >= escala.aprobatoria - 1e-9 ? '#2563eb' : '#dc2626' })), { alto: 200 }) +
            '<p class="text-xs text-gray-500 mt-1">Número de estudiantes por rango de promedio actual (rojo: por debajo de la aprobatoria).</p>';
        const medias = g.porEvaluacion.filter(p => p.incluida && p.calificada).map(p => ({ etiqueta: p.clave, valor: U.redondear(p.media, 2), color: p.media < escala.aprobatoria ? '#f97316' : '#4f46e5' }));
        $('graficoMedias').innerHTML = medias.length ? Informes.svgBarras(medias, { alto: 200, max: escala.maxima, linea: escala.aprobatoria, etiquetaLinea: `Aprobatoria ${escala.aprobatoria}` }) : '<p class="text-sm text-gray-500">Aún no hay evaluaciones calificadas.</p>';
        $('graficoEstados').innerHTML = barrasHorizontales(Object.entries(CONFIG.ESTADOS).map(([k, v]) => ({ etiqueta: v.etiqueta, valor: s.porEstado[k], color: v.color })).filter(x => x.valor), s.estudiantes);
        $('graficoNiveles').innerHTML = barrasHorizontales(d.niveles.map(n => ({ etiqueta: `${n.nombre} (≥ ${n.desde})`, valor: s.distribucion[n.nombre] || 0, color: n.color })), proms.length);

        $('tablaEstadisticas').innerHTML = `<thead><tr><th>Evaluación</th><th class="num">Peso</th><th class="num">Notas</th><th class="num">Sin presentar</th><th class="num">Media</th><th class="num">Mediana</th><th class="num">Desv.</th><th class="num">Mín.</th><th class="num">Máx.</th><th>Aprobación</th></tr></thead><tbody>${
            g.porEvaluacion.map(p => {
                const pct = p.n ? (p.aprobados / p.n) * 100 : 0;
                return `<tr class="${p.incluida ? '' : 'fila-excluida'}">
                    <td><b>${e(p.nombre)}</b> <span class="text-xs text-gray-500">${e(p.clave)}</span></td>
                    <td class="num">${U.redondear(p.peso, 2)}%</td>
                    <td class="num">${p.calificada ? p.n : '<span class="badge badge-aviso">Pendiente</span>'}</td>
                    <td class="num">${p.calificada ? p.sinPresentar : '—'}</td>
                    <td class="num ${p.media !== null && p.media < escala.aprobatoria ? 'nota-baja' : ''}">${U.formatoNota(p.media, dec)}</td>
                    <td class="num">${U.formatoNota(p.mediana, dec)}</td>
                    <td class="num">${U.formatoNota(p.desviacion, dec)}</td>
                    <td class="num">${U.formatoNota(p.minimo, dec)}</td>
                    <td class="num">${U.formatoNota(p.maximo, dec)}</td>
                    <td style="min-width:8rem">${p.calificada ? `${U.redondear(pct, 0)}% <div class="barra"><div style="width:${pct}%;background:${pct >= 60 ? '#10b981' : pct >= 40 ? '#f59e0b' : '#ef4444'}"></div></div>` : '—'}</td>
                </tr>`;
            }).join('')}</tbody>`;

        $('dimensionesGrupo').innerHTML = renderDimensiones(d, g, dec);

        const criticas = g.porCompetencia.slice(0, 8);
        $('competenciasCriticas').innerHTML = !d.competencias
            ? '<p class="text-sm text-gray-500">Cargue el catálogo de competencias y asócielas a las evaluaciones (pestañas 1 y 2) para ver qué competencias necesitan refuerzo.</p>'
            : criticas.length ? criticas.map(c => {
                const dim = CONFIG.DIMENSIONES[c.dimension];
                return `<div class="critica">
                    <div class="flex justify-between gap-3"><span><b class="text-indigo-700">${c.competencia.numero}.</b> ${e(c.competencia.texto)} <span class="chip chip-dim" style="background:${dim.fondo};color:${dim.color}">${e(dim.etiqueta)}</span></span><span class="pct whitespace-nowrap" title="Estudiantes con logro">${U.redondear(c.logro ?? 0, 0)}%</span></div>
                    <div class="text-xs text-gray-500 mt-1">${c.logrados} de ${c.n} estudiantes alcanzan la aprobatoria · evaluada en ${e(c.evaluaciones.join(', '))} · media ${U.formatoNota(c.media, dec)}</div>
                </div>`;
            }).join('') : '<p class="text-sm text-gray-500">No hay competencias asociadas a evaluaciones calificadas.</p>';

        const alertas = g.resultados.filter(r => ['riesgo', 'riesgo-alto', 'perdido', 'reprobado', 'sin-datos'].includes(r.estado))
            .sort((a, b) => CONFIG.ESTADOS[b.estado].orden - CONFIG.ESTADOS[a.estado].orden || (b.necesaria ?? 0) - (a.necesaria ?? 0));
        $('alertas').innerHTML = alertas.length ? `<div class="table-wrapper" style="max-height:26rem;overflow:auto"><table class="data-table data-table-compact"><thead><tr><th>Estudiante</th><th class="num">Promedio</th><th class="num">Necesita</th><th>Estado</th></tr></thead><tbody>${
            alertas.map(r => `<tr><td><button type="button" class="nombre-est" data-estudiante="${e(r.id)}">${e(r.nombre)}</button>${r.faltantes.length ? ` <span class="badge badge-aviso" title="Evaluaciones sin presentar">${r.faltantes.length} NP</span>` : ''}</td>
                <td class="num">${U.formatoNota(r.promedio, dec)}</td>
                <td class="num">${r.necesaria === null ? '—' : r.necesaria > escala.maxima ? `<span class="nota-baja">&gt; ${escala.maxima}</span>` : U.formatoNota(r.necesaria, dec)}</td>
                <td>${badgeEstado(r.estado)}</td></tr>`).join('')}</tbody></table></div>`
            : '<p class="text-sm text-green-700">Ningún estudiante está en riesgo. ¡Buen trabajo del grupo!</p>';
    }

    /** Tarjetas de desempeño analítico, práctico y crítico del grupo. */
    function renderDimensiones(d, g, dec) {
        const dims = Object.entries(CONFIG.DIMENSIONES);
        if (!dims.some(([k]) => g.dimensiones[k].n)) {
            return '<p class="text-sm text-gray-500">Para ver este análisis, asocie competencias a las evaluaciones o fije su carácter en la pestaña <b>2. Evaluaciones</b>.</p>';
        }
        const tarjetas = dims.map(([k, dim]) => {
            const x = g.dimensiones[k];
            if (!x.n) return `<div class="dim-card" style="border-top:4px solid ${dim.color}"><div class="k" style="color:${dim.color}">${e(dim.etiqueta)}</div><div class="d">${e(dim.descripcion)}</div><div class="v text-gray-300">—</div><div class="d">Sin evaluaciones calificadas de este carácter${x.pesoPlaneado ? ` (${U.redondear(x.pesoPlaneado, 1)}% del peso aún pendiente)` : ''}.</div></div>`;
            const color = x.logro >= 60 ? '#10b981' : x.logro >= 40 ? '#f59e0b' : '#ef4444';
            return `<div class="dim-card" style="border-top:4px solid ${dim.color}">
                <div class="k" style="color:${dim.color}">${e(dim.etiqueta)}</div>
                <div class="d">${e(dim.descripcion)}</div>
                <div class="v" style="color:${x.media < d.escala.aprobatoria ? '#b91c1c' : '#111827'}">${U.formatoNota(x.media, dec)}</div>
                <div class="d"><b>${U.redondear(x.logro, 0)}%</b> con logro (${x.logrados} de ${x.n}) · ${x.competencias} competencias evaluadas · ${U.redondear(x.pesoPlaneado, 1)}% del peso</div>
                <div class="barra"><div style="width:${x.logro}%;background:${color}"></div></div>
            </div>`;
        }).join('');
        const perfiles = d.evaluaciones.filter(ev => ev.incluida !== false).map(ev => {
            const p = g.perfiles[ev.clave];
            const txt = p ? Object.entries(p).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${CONFIG.DIMENSIONES[k].corta} ${U.redondear(w * 100, 0)}%`).join(' · ') : 'sin definir';
            return `<span class="chip chip-otro" title="${e(ev.nombre)}"><b>${e(ev.clave)}</b> ${e(txt)}</span>`;
        }).join('');
        return `<div class="grid grid-cols-1 md:grid-cols-3 gap-4">${tarjetas}</div><div class="text-xs font-semibold text-gray-600 mt-4 mb-1">Carácter de cada evaluación</div><div class="chips">${perfiles}</div>`;
    }

    function init() {
        $('alertas').addEventListener('click', ev => {
            const b = ev.target.closest('[data-estudiante]');
            if (b) UIEstudiantes.abrirEstudiante(b.dataset.estudiante);
        });
    }

    global.UIAnalisis = { init, render, badgeEstado };
})(window);
