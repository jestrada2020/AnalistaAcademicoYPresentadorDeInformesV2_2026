/**
 * Informes: se arma un "modelo" con el contenido (independiente del formato) y luego se dibuja
 * como HTML (vista previa) o como PDF (jsPDF + autoTable, con texto real y enlaces activos).
 * También exporta el consolidado a Excel.
 */
(function (global) {
    'use strict';

    const CONFIG = global.CONFIG || require('./config.js');
    const U = global.Utilidades || require('./utilidades.js');
    const Analisis = global.Analisis || require('./analisis.js');

    const ESTADO_EVALUACION = {
        aprobada: { texto: 'Aprobada', color: '#047857' },
        perdida: { texto: 'Por mejorar', color: '#b91c1c' },
        faltante: { texto: 'Sin presentar', color: '#b45309' },
        pendiente: { texto: 'Pendiente', color: '#6b7280' }
    };

    // ---------------------------------------------------------------- Modelos

    function encabezado(datos, titulo) {
        const c = datos.curso || {};
        const lineas = [
            ['Asignatura', c.asignatura], ['Grupo', c.grupo], ['Periodo', c.periodo], ['Programa', c.programa],
            ['Docente', c.docente], ['Fecha', U.fechaLarga(U.fechaISO())]
        ].filter(([, v]) => v);
        return { institucion: c.institucion || '', titulo, lineas };
    }

    function f2(datos, v) { return U.formatoNota(v, datos.escala?.decimales ?? 2); }

    /** {analitico: 0.67, practico: 0.33} -> "Analítico 67% · Práctico 33%" */
    function describirPerfil(perfil) {
        if (!perfil) return 'Sin definir';
        return Object.entries(perfil).sort((a, b) => b[1] - a[1]).map(([k, w]) => `${CONFIG.DIMENSIONES[k].etiqueta} ${U.redondear(w * 100, 0)}%`).join(' · ');
    }

    /**
     * Modelo del informe individual de un estudiante.
     * @param {object} datos Estado.
     * @param {object} r Resultado de Analisis.calcularEstudiante.
     * @param {object} grupo Resultado de Analisis.analizarGrupo (para comparar con la media del grupo).
     */
    function modeloIndividual(datos, r, grupo) {
        const op = datos.informe || {};
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(datos.escala || {}) };
        const est = CONFIG.ESTADOS[r.estado];
        const mediaDe = clave => grupo?.porEvaluacion.find(p => p.clave === clave)?.media ?? null;

        const datosEst = [['Documento', r.id]];
        if (op.incluirDatosArchivo !== false) {
            (datos.columnasInfo || []).forEach(c => {
                const v = r.estudiante.info?.[c.clave];
                if (v !== null && v !== undefined && v !== '') datosEst.push([c.nombre, typeof v === 'number' ? String(U.redondear(v, 2)) : v]);
            });
            (datos.columnasTexto || []).filter(c => !CONFIG.TIPOS_RECURSO[c.rol] && c.rol !== 'competencias').forEach(c => {
                const v = r.estudiante.extras?.[c.clave];
                if (v) datosEst.push([c.nombre, v]);
            });
        }

        const indicadores = [
            { etiqueta: 'Nota acumulada', valor: f2(datos, r.acumulado), detalle: `de ${escala.maxima} · ${U.redondear(r.pesoEvaluado, 0)}% evaluado` },
            { etiqueta: 'Promedio actual', valor: f2(datos, r.promedio), detalle: 'sobre lo evaluado' },
            { etiqueta: 'Desempeño', valor: r.nivel?.nombre || '—', detalle: r.nivel ? `desde ${r.nivel.desde}` : '', color: r.nivel?.color },
            { etiqueta: 'Estado', valor: est.etiqueta, color: est.color, fondo: est.fondo },
            r.pesoRestante > 0
                ? { etiqueta: 'Necesita para aprobar', valor: r.necesaria === null ? '—' : (r.necesaria > escala.maxima ? `> ${escala.maxima}` : f2(datos, r.necesaria)), detalle: `en el ${U.redondear(r.pesoRestante, 0)}% restante` }
                : { etiqueta: 'Nota final', valor: f2(datos, r.acumulado), detalle: 'periodo cerrado' }
        ];

        const evaluaciones = r.detalle.map(d => {
            const ev = ESTADO_EVALUACION[d.estado];
            return {
                nombre: d.nombre,
                tipo: CONFIG.TIPOS_EVALUACION[d.tipo] || d.tipo,
                fecha: d.fecha || '',
                peso: `${U.redondear(d.peso, 2)}%`,
                nota: d.nota !== null ? f2(datos, d.nota) : (d.estado === 'faltante' ? (d.marca === 'NP' ? 'NP' : (datos.opciones?.vaciasComoCero !== false ? '0 (vacía)' : '—')) : '—'),
                aporte: d.aporte !== null ? f2(datos, d.aporte) : '—',
                media: f2(datos, mediaDe(d.clave)),
                estado: ev.texto,
                color: ev.color
            };
        });

        const reforzar = Analisis.competenciasAReforzar(datos, r);
        const competencias = reforzar.map(x => ({ numero: x.competencia.numero, texto: x.competencia.texto, criterio: x.competencia.criterio, curso: x.competencia.curso, evaluaciones: x.evaluaciones.join(', ') }));
        // Competencias escritas directamente en la planilla para este estudiante
        (datos.columnasTexto || []).filter(c => c.rol === 'competencias').forEach(c => {
            const v = r.estudiante.extras?.[c.clave];
            if (v) U.lineas(v).forEach(t => competencias.push({ numero: '', texto: t, criterio: '', curso: '', evaluaciones: 'Registrada en la planilla' }));
        });

        // Para que el informe sea legible se muestran primero las competencias comprometidas en más evaluaciones.
        const maxComp = Number(op.maxCompetencias) || 12;
        const totalCompetencias = competencias.length;
        const competenciasMostradas = [...competencias]
            .sort((a, b) => b.evaluaciones.split(',').length - a.evaluaciones.split(',').length || (a.numero || 0) - (b.numero || 0))
            .slice(0, maxComp)
            .sort((a, b) => (a.numero || 0) - (b.numero || 0));

        const grafico = r.detalle.filter(d => d.estado !== 'pendiente').map(d => ({ etiqueta: d.clave, valor: d.nota ?? 0, sinNota: d.nota === null, media: mediaDe(d.clave) }));

        // Desempeño por carácter de las competencias (analítico, práctico, pensamiento crítico)
        const dimensiones = op.incluirDimensiones === false ? [] : Object.entries(CONFIG.DIMENSIONES)
            .filter(([k]) => r.dimensiones?.[k] !== null && r.dimensiones?.[k] !== undefined)
            .map(([k, dim]) => {
                const nota = r.dimensiones[k];
                const media = grupo?.dimensiones?.[k]?.media ?? null;
                return {
                    clave: k, etiqueta: dim.etiqueta, descripcion: dim.descripcion, color: dim.color,
                    nota: f2(datos, nota), valor: nota, media: f2(datos, media), valorMedia: media,
                    nivel: Analisis.nivelDe(datos, nota)?.nombre || '—',
                    lectura: nota >= escala.aprobatoria - 1e-9 ? (media !== null && nota >= media ? 'Fortaleza' : 'Logrado') : 'Por fortalecer'
                };
            });

        return {
            tipo: 'individual',
            encabezado: encabezado(datos, 'Informe de desempeño académico por competencias'),
            estudiante: { nombre: r.nombre, datos: datosEst },
            indicadores,
            evaluaciones,
            grafico,
            escala,
            dimensiones,
            competencias: op.incluirCompetencias !== false ? competenciasMostradas : [],
            competenciasOmitidas: op.incluirCompetencias !== false ? totalCompetencias - competenciasMostradas.length : 0,
            recursos: op.incluirRecursos !== false ? Analisis.recursosRecomendados(datos, r, reforzar) : {},
            recomendaciones: op.incluirRecomendaciones !== false ? Analisis.recomendaciones(datos, r) : [],
            observacion: datos.observaciones?.[r.id] || '',
            mensaje: op.mensaje || '',
            firmas: op.incluirFirmas !== false ? [[datos.curso?.docente || 'Docente', 'Docente'], [r.nombre, 'Estudiante'], ['', 'Acudiente / padre de familia']] : []
        };
    }

    /** Modelo del informe grupal (para el docente, la coordinación o el comité académico). */
    function modeloGrupal(datos, grupo, resultados = grupo.resultados) {
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(datos.escala || {}) };
        const s = grupo.resumen;
        const aprobando = resultados.filter(r => ['aprobado', 'asegurado', 'aprobando'].includes(r.estado)).length;
        const enRiesgo = resultados.filter(r => ['riesgo', 'riesgo-alto', 'perdido', 'reprobado'].includes(r.estado));
        const proms = resultados.map(r => r.promedio).filter(v => v !== null);
        const evaluaciones = (datos.evaluaciones || []).filter(e => e.incluida !== false);

        const indicadores = [
            { etiqueta: 'Estudiantes', valor: String(resultados.length), detalle: `${resultados.filter(r => r.estado === 'sin-datos').length} sin notas` },
            { etiqueta: 'Promedio del grupo', valor: f2(datos, U.media(proms)), detalle: `mediana ${f2(datos, U.mediana(proms))}` },
            { etiqueta: 'Van aprobando', valor: String(aprobando), detalle: resultados.length ? `${U.redondear((aprobando / resultados.length) * 100, 0)}% del grupo` : '' , color: '#047857' },
            { etiqueta: 'En riesgo o perdiendo', valor: String(enRiesgo.length), detalle: resultados.length ? `${U.redondear((enRiesgo.length / resultados.length) * 100, 0)}% del grupo` : '', color: '#b91c1c' },
            { etiqueta: 'Evaluado', valor: `${U.redondear(s.pesoEvaluado, 0)}%`, detalle: `de ${U.redondear(s.pesoTotal, 0)}% planeado` }
        ];

        const tablaEvaluaciones = grupo.porEvaluacion.filter(p => p.incluida).map(p => [
            p.nombre, `${U.redondear(p.peso, 2)}%`, p.calificada ? String(p.n) : 'Pendiente', p.calificada ? String(p.sinPresentar) : '—',
            f2(datos, p.media), f2(datos, p.mediana), f2(datos, p.desviacion), f2(datos, p.minimo), f2(datos, p.maximo),
            p.calificada && p.n ? `${U.redondear((p.aprobados / p.n) * 100, 0)}%` : '—'
        ]);

        const consolidado = {
            cabecera: ['#', 'Estudiante', ...evaluaciones.map(e => e.clave), 'Acum.', 'Prom.', 'Nivel', 'Estado', 'Necesita'],
            filas: resultados.map((r, i) => [
                String(i + 1), r.nombre,
                ...evaluaciones.map(e => {
                    const n = r.estudiante.notas[e.clave];
                    if (n !== null && n !== undefined) return f2(datos, n);
                    return r.detalle.find(x => x.clave === e.clave)?.estado === 'faltante' ? 'NP' : '';
                }),
                f2(datos, r.acumulado), f2(datos, r.promedio), r.nivel?.nombre || '—', CONFIG.ESTADOS[r.estado].etiqueta,
                r.necesaria === null ? '—' : (r.necesaria > escala.maxima ? `>${escala.maxima}` : f2(datos, r.necesaria))
            ]),
            columnasNota: evaluaciones.map((_, i) => i + 2),
            colEstado: evaluaciones.length + 5
        };

        const riesgo = [...enRiesgo].sort((a, b) => (b.necesaria ?? 99) - (a.necesaria ?? 99)).map(r => [
            r.nombre, f2(datos, r.promedio), CONFIG.ESTADOS[r.estado].etiqueta,
            r.necesaria === null ? '—' : (r.necesaria > escala.maxima ? `> ${escala.maxima}` : f2(datos, r.necesaria)),
            r.perdidas.map(c => datos.evaluaciones.find(e => e.clave === c)?.clave || c).join(', ') || '—',
            r.faltantes.join(', ') || '—'
        ]);

        const criticas = grupo.competenciasCriticas.slice(0, 15).map(c => [
            String(c.competencia.numero), c.competencia.texto, c.evaluaciones.join(', '), `${c.afectados} (${U.redondear(c.porcentaje, 0)}%)`, f2(datos, c.media)
        ]);

        const ranking = [...resultados].filter(r => r.promedio !== null).sort((a, b) => b.promedio - a.promedio).slice(0, 10)
            .map((r, i) => [String(i + 1), r.nombre, f2(datos, r.promedio), r.nivel?.nombre || '—']);

        const estados = Object.entries(CONFIG.ESTADOS).map(([k, e]) => ({ etiqueta: e.corta || e.etiqueta, valor: resultados.filter(r => r.estado === k).length, color: e.color })).filter(e => e.valor > 0);
        const niveles = (datos.niveles || CONFIG.NIVELES_POR_DEFECTO).map(n => ({ etiqueta: n.nombre, valor: proms.filter(v => Analisis.nivelDe(datos, v)?.nombre === n.nombre).length, color: n.color }));
        const medias = grupo.porEvaluacion.filter(p => p.incluida && p.calificada).map(p => ({ etiqueta: p.clave, valor: p.media ?? 0 }));

        const dims = Object.entries(CONFIG.DIMENSIONES).map(([k, dim]) => {
            const x = grupo.dimensiones?.[k] || {};
            return { clave: k, etiqueta: dim.etiqueta, color: dim.color, media: x.media ?? null, logro: x.logro ?? null, n: x.n || 0, peso: x.pesoPlaneado || 0, competencias: x.competencias || 0 };
        });
        const tablaDimensiones = dims.map(x => [x.etiqueta, x.n ? f2(datos, x.media) : '—', x.n ? `${U.redondear(x.logro, 0)}%` : '—', `${U.redondear(x.peso, 1)}%`, String(x.competencias)]);
        const logroCompetencias = (grupo.porCompetencia || []).slice(0, 15).map(c => [
            String(c.competencia.numero), c.competencia.texto, CONFIG.DIMENSIONES[c.dimension]?.etiqueta || '', String(c.n), f2(datos, c.media), c.logro === null ? '—' : `${U.redondear(c.logro, 0)}%`
        ]);

        return {
            tipo: 'grupal',
            dimensiones: dims.filter(x => x.n).map(x => ({ etiqueta: x.etiqueta, valor: U.redondear(x.media, 2), color: x.color })),
            tablaDimensiones, logroCompetencias,
            encabezado: encabezado(datos, 'Informe de rendimiento académico del grupo'),
            indicadores,
            escala,
            histograma: Analisis.histograma(proms, escala).map(b => ({ etiqueta: `${b.desde}–${b.hasta}`, valor: b.n, color: b.desde >= escala.aprobatoria - 1e-9 ? '#2563eb' : '#dc2626' })),
            estados, niveles, medias,
            tablaEvaluaciones, consolidado, riesgo, criticas, ranking,
            avisos: grupo.avisos,
            mensaje: datos.informe?.mensaje || ''
        };
    }


    /**
     * Modelo del informe global del programa (todos los grupos).
     * @param {object} prog Resultado de Programa.analizarPrograma.
     */
    function modeloPrograma(prog, opciones = {}) {
        const escala = prog.escala;
        const fm = v => U.formatoNota(v, escala.decimales ?? 2);
        const pc = v => (v === null || v === undefined ? '—' : `${U.redondear(v, 0)}%`);
        const s = prog.resumen;
        const primero = prog.grupos[0]?.datos.curso || {};
        const comun = (campo) => { const v = new Set(prog.grupos.map(g => g.datos.curso[campo]).filter(Boolean)); return v.size === 1 ? [...v][0] : ''; };
        const mismaAsignatura = new Set(prog.grupos.map(g => g.asignatura)).size === 1;
        const corta = g => (mismaAsignatura && g.grupo ? (/^grupo/i.test(g.grupo) ? g.grupo : `Grupo ${g.grupo}`) : g.nombre);
        const dims = Object.entries(CONFIG.DIMENSIONES);

        const indicadores = [
            { etiqueta: 'Grupos', valor: String(s.grupos), detalle: `${new Set(prog.grupos.map(g => g.docente).filter(Boolean)).size || '—'} docente(s)` },
            { etiqueta: 'Estudiantes', valor: String(s.estudiantes), detalle: `${s.sinDatos} sin notas` },
            { etiqueta: 'Promedio del programa', valor: fm(s.media), detalle: `mediana ${fm(s.mediana)}` },
            { etiqueta: 'Van aprobando', valor: String(s.aprobando), detalle: `${pc(s.estudiantes ? (s.aprobando / s.estudiantes) * 100 : null)} del total`, color: '#047857' },
            { etiqueta: 'En riesgo o perdiendo', valor: String(s.riesgo + s.perdidos), detalle: `${s.perdidos} ya no alcanzan`, color: '#b91c1c' },
            { etiqueta: 'Brecha entre grupos', valor: s.brecha ? fm(s.brecha.valor) : '—', detalle: s.brecha ? 'mejor vs. más bajo' : 'un solo grupo' }
        ];

        const dimensiones = dims.map(([k, d]) => ({
            clave: k, etiqueta: d.etiqueta, descripcion: d.descripcion, color: d.color, fondo: d.fondo,
            n: prog.dimensiones[k].n, media: prog.dimensiones[k].media, logro: prog.dimensiones[k].logro,
            participacion: prog.dimensiones[k].participacion, competencias: prog.dimensiones[k].competencias,
            texto: { media: fm(prog.dimensiones[k].media), logro: pc(prog.dimensiones[k].logro), participacion: pc(prog.dimensiones[k].participacion) }
        }));

        const graficoGrupos = {
            categorias: prog.grupos.map(corta),
            series: dims.map(([k, d]) => ({ nombre: d.etiqueta, color: d.color, valores: prog.grupos.map(g => g.dims[k].media) }))
        };
        const graficoPromedios = prog.grupos.map(g => ({ etiqueta: corta(g), valor: U.redondear(g.media ?? 0, 2), color: g.media !== null && g.media < escala.aprobatoria ? '#f97316' : '#4f46e5' }));

        const tablaGrupos = prog.grupos.map(g => [
            g.nombre, g.docente || '—', g.curso || g.asignatura || '—', String(g.estudiantes), `${U.redondear(g.pesoEvaluado, 0)}%`, fm(g.media),
            pc(g.pctAprobando), pc(g.pctRiesgo), ...dims.map(([k]) => (g.dims[k].n ? `${fm(g.dims[k].media)} (${pc(g.dims[k].logro)})` : '—'))
        ]);
        const tablaCursos = prog.porCurso.map(c => [
            c.curso, String(c.grupos.length), String(c.estudiantes), fm(c.media), pc(c.pctAprobando), pc(c.pctRiesgo),
            ...dims.map(([k]) => (c.dims[k].media !== null ? `${fm(c.dims[k].media)} (${pc(c.dims[k].logro)})` : '—'))
        ]);
        const filaComp = c => [c.competencia.texto, c.curso || '', CONFIG.DIMENSIONES[c.dimension]?.etiqueta || '', String(c.grupos.length), String(c.n), fm(c.media), pc(c.logro)];
        const competenciasCriticas = prog.competencias.slice(0, opciones.maxCompetencias || 15).map(filaComp);
        const competenciasFuertes = [...prog.competencias].sort((a, b) => b.logro - a.logro || b.media - a.media).slice(0, 5).map(filaComp);
        const evaluacionesCriticas = prog.evaluacionesCriticas.slice(0, 10).map(x => [x.grupo, x.evaluacion, String(x.n), fm(x.media), pc(x.aprobacion), String(x.sinPresentar)]);
        const riesgo = prog.riesgo.filter(x => x.r.estado !== 'sin-datos').map(x => [
            x.r.nombre, x.grupo, fm(x.r.promedio), CONFIG.ESTADOS[x.r.estado].etiqueta,
            x.r.necesaria === null ? '—' : x.r.necesaria > escala.maxima ? `> ${escala.maxima}` : fm(x.r.necesaria),
            ...dims.map(([k]) => fm(x.r.dimensiones?.[k]))
        ]);
        const sinNotas = prog.riesgo.filter(x => x.r.estado === 'sin-datos').map(x => `${x.r.nombre} (${x.grupo})`);
        const estados = Object.entries(CONFIG.ESTADOS).map(([k, e]) => ({ etiqueta: e.corta || e.etiqueta, valor: s.porEstado[k], color: e.color })).filter(e => e.valor > 0);

        const lineas = [
            ['Programa', comun('programa')], ['Periodo', comun('periodo')], ['Grupos', String(s.grupos)],
            ['Fecha', U.fechaLarga(U.fechaISO())]
        ].filter(([, v]) => v);
        return {
            tipo: 'programa',
            encabezado: { institucion: comun('institucion') || primero.institucion || '', titulo: 'Informe global del programa: análisis por competencias', lineas },
            indicadores, escala, dimensiones, graficoGrupos, graficoPromedios, estados,
            histograma: s.histograma.map(b => ({ etiqueta: `${b.desde}–${b.hasta}`, valor: b.n, color: b.desde >= escala.aprobatoria - 1e-9 ? '#2563eb' : '#dc2626' })),
            tablaGrupos, tablaCursos, competenciasCriticas, competenciasFuertes, evaluacionesCriticas, riesgo, sinNotas,
            cabeceraDims: dims.map(([, d]) => d.corta),
            hallazgos: prog.hallazgos, recomendaciones: prog.recomendaciones, avisos: prog.avisos,
            mensaje: opciones.mensaje || ''
        };
    }

    // ---------------------------------------------------------------- HTML

    const e = U.escaparHTML;

    function htmlEncabezado(enc) {
        return `<div class="inf-encabezado">
            ${enc.institucion ? `<div class="inf-institucion">${e(enc.institucion)}</div>` : ''}
            <h2>${e(enc.titulo)}</h2>
            <div class="inf-lineas">${enc.lineas.map(([k, v]) => `<span><b>${e(k)}:</b> ${e(v)}</span>`).join('')}</div>
        </div>`;
    }

    function htmlIndicadores(lista) {
        return `<div class="inf-indicadores">${lista.map(i => `
            <div class="inf-indicador" ${i.fondo ? `style="background:${i.fondo}"` : ''}>
                <div class="k">${e(i.etiqueta)}</div>
                <div class="v" ${i.color ? `style="color:${i.color}"` : ''}>${e(i.valor)}</div>
                ${i.detalle ? `<div class="d">${e(i.detalle)}</div>` : ''}
            </div>`).join('')}</div>`;
    }

    function htmlTabla(cabecera, filas, opciones = {}) {
        return `<table class="inf-tabla ${opciones.clase || ''}"><thead><tr>${cabecera.map(c => `<th>${e(c)}</th>`).join('')}</tr></thead>
            <tbody>${filas.map(f => `<tr>${f.map((c, i) => {
                const estilo = opciones.estilo ? opciones.estilo(c, i, f) : '';
                return `<td${estilo ? ` style="${estilo}"` : ''}>${e(c)}</td>`;
            }).join('')}</tr>`).join('') || `<tr><td colspan="${cabecera.length}" class="inf-vacio">Sin datos</td></tr>`}</tbody></table>`;
    }

    /** Gráfico de barras en SVG (también lo usa la pestaña de análisis). */
    function svgBarras(datos, { alto = 160, max = null, linea = null, etiquetaLinea = '', colorPorDefecto = '#4f46e5', serie2 = null } = {}) {
        const n = datos.length || 1;
        const ancho = Math.max(320, n * 46);
        const top = 14;
        const base = alto - 26;
        const maximo = max ?? Math.max(1, ...datos.map(d => d.valor), ...(serie2 || []).filter(v => v !== null));
        const escalaY = v => base - ((base - top) * Math.max(0, v)) / maximo;
        const paso = (ancho - 30) / n;
        const bw = Math.min(34, paso * (serie2 ? 0.38 : 0.62));
        let s = `<svg viewBox="0 0 ${ancho} ${alto}" class="inf-svg" role="img" preserveAspectRatio="xMidYMid meet">`;
        s += `<line x1="24" y1="${base}" x2="${ancho - 4}" y2="${base}" stroke="#cbd5e1"/>`;
        datos.forEach((d, i) => {
            const x = 28 + i * paso + (paso - (serie2 ? bw * 2 + 3 : bw)) / 2;
            const y = escalaY(d.valor);
            s += `<rect x="${x}" y="${y}" width="${bw}" height="${Math.max(0, base - y)}" rx="3" fill="${d.sinNota ? '#fca5a5' : (d.color || colorPorDefecto)}"><title>${e(d.etiqueta)}: ${e(Number.isInteger(d.valor) ? d.valor : U.redondear(d.valor, 2))}</title></rect>`;
            s += `<text x="${x + bw / 2}" y="${y - 3}" font-size="9" text-anchor="middle" fill="#374151">${d.sinNota ? 'sin nota' : e(Number.isInteger(d.valor) ? d.valor : U.redondear(d.valor, 2))}</text>`;
            if (serie2 && serie2[i] !== null && serie2[i] !== undefined) {
                const y2 = escalaY(serie2[i]);
                s += `<rect x="${x + bw + 3}" y="${y2}" width="${bw}" height="${Math.max(0, base - y2)}" rx="3" fill="#cbd5e1"><title>Media del grupo: ${U.redondear(serie2[i], 2)}</title></rect>`;
            }
            s += `<text x="${x + (serie2 ? bw + 1.5 : bw / 2)}" y="${base + 13}" font-size="9" text-anchor="middle" fill="#4b5563">${e(d.etiqueta)}</text>`;
        });
        if (linea !== null) {
            const y = escalaY(linea);
            s += `<line x1="24" y1="${y}" x2="${ancho - 4}" y2="${y}" stroke="#dc2626" stroke-dasharray="4 3"/><text x="21" y="${y + 3}" font-size="9" text-anchor="end" fill="#dc2626">${e(linea)}</text>`;
        }
        s += '</svg>';
        return linea !== null && etiquetaLinea ? `${s}<div class="inf-leyenda"><span class="sw" style="border-top:2px dashed #dc2626;height:0"></span> ${e(etiquetaLinea)}</div>` : s;
    }

    /** Barras agrupadas en SVG: una categoría (grupo) con una barra por serie (carácter). */
    function svgBarrasAgrupadas({ categorias, series }, { alto = 190, max = 5, linea = null } = {}) {
        const n = categorias.length || 1;
        const k = series.length || 1;
        const ancho = Math.max(340, n * (k * 16 + 30));
        const top = 14;
        const base = alto - 30;
        const escalaY = v => base - ((base - top) * Math.max(0, Math.min(v, max))) / max;
        const paso = (ancho - 30) / n;
        const bw = Math.min(22, (paso * 0.8) / k);
        let s = `<svg viewBox="0 0 ${ancho} ${alto}" class="inf-svg" role="img" preserveAspectRatio="xMidYMid meet">`;
        s += `<line x1="24" y1="${base}" x2="${ancho - 4}" y2="${base}" stroke="#cbd5e1"/>`;
        categorias.forEach((c, i) => {
            const x0 = 28 + i * paso + (paso - bw * k) / 2;
            series.forEach((se, j) => {
                const v = se.valores[i];
                if (v === null || v === undefined) return;
                const y = escalaY(v);
                s += `<rect x="${x0 + j * bw}" y="${y}" width="${bw - 2}" height="${Math.max(0, base - y)}" rx="2" fill="${se.color}"><title>${e(c)} · ${e(se.nombre)}: ${U.redondear(v, 2)}</title></rect>`;
                s += `<text x="${x0 + j * bw + (bw - 2) / 2}" y="${y - 3}" font-size="8" text-anchor="middle" fill="#374151">${U.redondear(v, 1)}</text>`;
            });
            s += `<text x="${28 + i * paso + paso / 2}" y="${base + 13}" font-size="9" text-anchor="middle" fill="#4b5563">${e(String(c).length > 22 ? `${String(c).slice(0, 21)}…` : c)}</text>`;
        });
        if (linea !== null) {
            const y = escalaY(linea);
            s += `<line x1="24" y1="${y}" x2="${ancho - 4}" y2="${y}" stroke="#dc2626" stroke-dasharray="4 3"/><text x="21" y="${y + 3}" font-size="9" text-anchor="end" fill="#dc2626">${e(linea)}</text>`;
        }
        s += '</svg>';
        return `${s}<div class="inf-leyenda">${series.map(se => `<span class="sw" style="background:${se.color}"></span> ${e(se.nombre)}`).join(' ')}${linea !== null ? ' <span class="sw" style="border-top:2px dashed #dc2626;height:0"></span> Aprobatoria' : ''}</div>`;
    }

    function htmlRecursos(recursos) {
        const tipos = Object.keys(CONFIG.TIPOS_RECURSO).filter(t => recursos[t]?.length);
        if (!tipos.length) return '';
        return `<div class="inf-recursos">${tipos.map(t => `
            <div><h5>${e(CONFIG.TIPOS_RECURSO[t])}</h5><ul>${recursos[t].map(r => `<li>${r.url ? `<a href="${e(r.url)}" target="_blank" rel="noopener">${e(r.titulo)}</a>` : e(r.titulo)}</li>`).join('')}</ul></div>`).join('')}</div>`;
    }

    function htmlIndividual(m) {
        let h = `<article class="inf-pagina">${htmlEncabezado(m.encabezado)}`;
        h += `<div class="inf-estudiante"><div class="inf-nombre">${e(m.estudiante.nombre)}</div>
            <div class="inf-lineas">${m.estudiante.datos.map(([k, v]) => `<span><b>${e(k)}:</b> ${e(v)}</span>`).join('')}</div></div>`;
        h += htmlIndicadores(m.indicadores);
        h += `<h4>Resultados por evaluación</h4>`;
        h += htmlTabla(['Evaluación', 'Tipo', 'Fecha', 'Peso', 'Nota', 'Aporte', 'Media grupo', 'Resultado'],
            m.evaluaciones.map(x => [x.nombre, x.tipo, x.fecha, x.peso, x.nota, x.aporte, x.media, x.estado]),
            { estilo: (c, i, f) => i === 7 ? `color:${m.evaluaciones.find(x => x.nombre === f[0])?.color};font-weight:600` : '' });
        if (m.grafico.length) h += `<div class="inf-grafico"><div class="inf-leyenda"><span class="sw" style="background:#4f46e5"></span> Estudiante <span class="sw" style="background:#cbd5e1"></span> Media del grupo</div>${svgBarras(m.grafico, { max: m.escala.maxima, linea: m.escala.aprobatoria, etiquetaLinea: `Aprobatoria ${m.escala.aprobatoria}`, serie2: m.grafico.map(g => g.media) })}</div>`;
        if (m.dimensiones?.length) {
            h += `<h4>Desempeño por carácter de las competencias</h4>`;
            h += htmlTabla(['Carácter', 'Qué evalúa', 'Nota', 'Media grupo', 'Nivel', 'Lectura'], m.dimensiones.map(x => [x.etiqueta, x.descripcion, x.nota, x.media, x.nivel, x.lectura]),
                { estilo: (c, i) => i === 5 ? `font-weight:600;color:${c === 'Por fortalecer' ? '#b91c1c' : '#047857'}` : i === 0 ? 'font-weight:600' : '' });
        }
        if (m.competencias.length) {
            h += `<h4>Competencias a reforzar</h4>`;
            h += htmlTabla(['N.º', 'Competencia', 'Criterio de evaluación', 'Evaluación'], m.competencias.map(c => [c.numero, c.texto, c.criterio, c.evaluaciones]), { clase: 'inf-comp' });
            if (m.competenciasOmitidas) h += `<p class="text-xs text-gray-500 mt-1">Se muestran ${m.competencias.length} de ${m.competencias.length + m.competenciasOmitidas} competencias por reforzar (las comprometidas en más evaluaciones). El listado completo está en la hoja «Plan por estudiante» del Excel consolidado.</p>`;
        }
        const recursos = htmlRecursos(m.recursos);
        if (recursos) h += `<h4>Recursos recomendados para el plan de mejoramiento</h4>${recursos}`;
        if (m.recomendaciones.length) h += `<h4>Recomendaciones</h4><ul class="inf-lista">${m.recomendaciones.map(r => `<li>${e(r)}</li>`).join('')}</ul>`;
        if (m.observacion) h += `<h4>Observaciones del docente</h4><p class="inf-parrafo">${e(m.observacion)}</p>`;
        if (m.mensaje) h += `<p class="inf-parrafo inf-mensaje">${e(m.mensaje)}</p>`;
        if (m.firmas.length) h += `<div class="inf-firmas">${m.firmas.map(([n, c]) => `<div><div class="linea"></div><div>${e(n)}</div><small>${e(c)}</small></div>`).join('')}</div>`;
        return `${h}</article>`;
    }

    function htmlGrupal(m) {
        let h = `<article class="inf-pagina">${htmlEncabezado(m.encabezado)}${htmlIndicadores(m.indicadores)}`;
        h += `<div class="inf-graficos">
            <div><h5>Distribución de promedios</h5>${svgBarras(m.histograma, { alto: 150 })}</div>
            <div><h5>Media por evaluación</h5>${svgBarras(m.medias, { alto: 150, max: m.escala.maxima, linea: m.escala.aprobatoria, etiquetaLinea: 'Aprobatoria' })}</div>
            <div><h5>Estado académico</h5>${svgBarras(m.estados, { alto: 150 })}</div>
            <div><h5>Niveles de desempeño</h5>${svgBarras(m.niveles, { alto: 150 })}</div>
        </div>`;
        if (m.avisos.length) h += `<div class="inf-aviso">${m.avisos.map(a => e(a)).join('<br>')}</div>`;
        if (m.dimensiones.length) {
            h += `<h4>Desempeño por carácter de las competencias</h4><div class="inf-graficos"><div>${svgBarras(m.dimensiones, { alto: 140, max: m.escala.maxima, linea: m.escala.aprobatoria, etiquetaLinea: 'Aprobatoria' })}</div>
                <div>${htmlTabla(['Carácter', 'Media', 'Logro', 'Peso', 'Competencias'], m.tablaDimensiones)}</div></div>`;
        }
        h += `<h4>Estadísticas por evaluación</h4>${htmlTabla(['Evaluación', 'Peso', 'Notas', 'Sin presentar', 'Media', 'Mediana', 'Desv.', 'Mín.', 'Máx.', '% aprob.'], m.tablaEvaluaciones)}`;
        h += `<h4>Estudiantes en riesgo o perdiendo (${m.riesgo.length})</h4>${htmlTabla(['Estudiante', 'Promedio', 'Estado', 'Necesita', 'Perdidas', 'Sin presentar'], m.riesgo)}`;
        if (m.logroCompetencias.length) h += `<h4>Logro por competencia (las de menor logro primero)</h4>${htmlTabla(['N.º', 'Competencia', 'Carácter', 'Estudiantes', 'Media', 'Logro'], m.logroCompetencias, { clase: 'inf-comp' })}`;
        if (m.criticas.length) h += `<h4>Competencias críticas</h4>${htmlTabla(['N.º', 'Competencia', 'Evaluaciones', 'Estudiantes afectados', 'Media'], m.criticas, { clase: 'inf-comp' })}`;
        h += `<h4>Mejores promedios</h4>${htmlTabla(['#', 'Estudiante', 'Promedio', 'Nivel'], m.ranking)}`;
        const ap = m.escala.aprobatoria;
        h += `<h4>Consolidado de notas</h4>${htmlTabla(m.consolidado.cabecera, m.consolidado.filas, {
            clase: 'inf-consolidado',
            estilo: (c, i) => (m.consolidado.columnasNota.includes(i) || i === m.consolidado.columnasNota.length + 2 || i === m.consolidado.columnasNota.length + 3) && c !== '' && !Number.isNaN(+c) && +c < ap ? 'color:#b91c1c;font-weight:600' : (c === 'NP' ? 'color:#b45309' : '')
        })}`;
        if (m.mensaje) h += `<p class="inf-parrafo inf-mensaje">${e(m.mensaje)}</p>`;
        return `${h}</article>`;
    }

    function htmlPrograma(m) {
        let h = `<article class="inf-pagina">${htmlEncabezado(m.encabezado)}${htmlIndicadores(m.indicadores)}`;
        if (m.avisos.length) h += `<div class="inf-aviso">${m.avisos.map(a => e(a)).join('<br>')}</div>`;
        h += `<h4>Hallazgos principales</h4><ul class="inf-lista">${m.hallazgos.map(x => `<li>${e(x)}</li>`).join('')}</ul>`;
        h += `<h4>Desempeño por carácter de las competencias</h4><div class="inf-dims">${m.dimensiones.map(d => `
            <div class="inf-dim" style="border-top:4px solid ${d.color}">
                <div class="k">${e(d.etiqueta)}</div><div class="d">${e(d.descripcion)}</div>
                <div class="v" style="color:${d.color}">${d.n ? e(d.texto.media) : '—'}</div>
                <div class="d">${d.n ? `${e(d.texto.logro)} de estudiantes con logro · ${d.competencias} competencias evaluadas · ${e(d.texto.participacion)} del peso` : 'Sin evaluaciones calificadas de este carácter'}</div>
            </div>`).join('')}</div>`;
        h += `<div class="inf-graficos"><div><h5>Media por carácter en cada grupo</h5>${svgBarrasAgrupadas(m.graficoGrupos, { max: m.escala.maxima, linea: m.escala.aprobatoria })}</div>
            <div><h5>Promedio actual por grupo</h5>${svgBarras(m.graficoPromedios, { alto: 170, max: m.escala.maxima, linea: m.escala.aprobatoria, etiquetaLinea: 'Aprobatoria' })}</div>
            <div><h5>Distribución de promedios del programa</h5>${svgBarras(m.histograma, { alto: 150 })}</div>
            <div><h5>Estado académico</h5>${svgBarras(m.estados, { alto: 150 })}</div></div>`;
        h += `<h4>Comparativo de grupos</h4>${htmlTabla(['Grupo', 'Docente', 'Curso', 'Est.', 'Evaluado', 'Promedio', 'Aprobando', 'Riesgo', ...m.cabeceraDims], m.tablaGrupos, { clase: 'inf-consolidado' })}`;
        if (m.tablaCursos.length > 1) h += `<h4>Por curso</h4>${htmlTabla(['Curso', 'Grupos', 'Est.', 'Promedio', 'Aprobando', 'Riesgo', ...m.cabeceraDims], m.tablaCursos)}`;
        if (m.competenciasCriticas.length) {
            h += `<h4>Competencias con menor logro en el programa</h4>${htmlTabla(['Competencia', 'Curso', 'Carácter', 'Grupos', 'Estud.', 'Media', 'Logro'], m.competenciasCriticas, { clase: 'inf-comp' })}`;
            h += `<h4>Competencias mejor logradas</h4>${htmlTabla(['Competencia', 'Curso', 'Carácter', 'Grupos', 'Estud.', 'Media', 'Logro'], m.competenciasFuertes, { clase: 'inf-comp' })}`;
        }
        if (m.evaluacionesCriticas.length) h += `<h4>Evaluaciones con menor aprobación</h4>${htmlTabla(['Grupo', 'Evaluación', 'Notas', 'Media', 'Aprobación', 'Sin presentar'], m.evaluacionesCriticas)}`;
        if (m.recomendaciones.length) h += `<h4>Recomendaciones para el programa</h4>${m.recomendaciones.map(r => `<div class="inf-recomendacion"><b>${e(r.titulo)}</b><ul class="inf-lista">${r.items.map(x => `<li>${e(x)}</li>`).join('')}</ul></div>`).join('')}`;
        h += `<h4>Estudiantes en riesgo o perdiendo (${m.riesgo.length})</h4>${htmlTabla(['Estudiante', 'Grupo', 'Promedio', 'Estado', 'Necesita', ...m.cabeceraDims], m.riesgo, { clase: 'inf-consolidado' })}`;
        if (m.sinNotas.length) h += `<p class="inf-parrafo"><b>Sin ninguna nota (${m.sinNotas.length}):</b> ${e(m.sinNotas.join(', '))}.</p>`;
        if (m.mensaje) h += `<p class="inf-parrafo inf-mensaje">${e(m.mensaje)}</p>`;
        return `${h}</article>`;
    }

    // ---------------------------------------------------------------- PDF

    /** jsPDF con las fuentes estándar solo admite caracteres Latin-1/WinAnsi. */
    function txt(s) {
        return String(s ?? '').replace(/≥/g, '>=').replace(/≤/g, '<=').replace(/≠/g, '<>').replace(/[–]/g, '-').replace(/[“”]/g, '"').replace(/[‘’]/g, "'").replace(/·/g, '-').replace(/[^\x00-\xff—•…]/g, '');
    }

    function hexARgb(hex) {
        const m = /^#?([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i.exec(hex || '');
        return m ? [parseInt(m[1], 16), parseInt(m[2], 16), parseInt(m[3], 16)] : [55, 65, 81];
    }

    const PRIMARIO = [79, 70, 229];

    function crearDocumento(opciones = {}) {
        const { jsPDF } = global.jspdf;
        const doc = new jsPDF({ orientation: opciones.orientacion === 'l' ? 'landscape' : 'portrait', unit: 'mm', format: opciones.tamano || 'letter' });
        if (typeof doc.autoTable !== 'function') throw new Error('No se cargó la librería de tablas PDF (jspdf-autotable). Revise la conexión a internet.');
        return doc;
    }

    function Lienzo(doc) {
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        const M = 14;
        const l = { doc, W, H, M, y: M, ancho: W - 2 * M };
        l.espacio = h => { if (l.y + h > H - 16) { doc.addPage(); l.y = M; return true; } return false; };
        l.titulo = t => {
            l.espacio(14);
            l.y += 3;
            doc.setFont('helvetica', 'bold'); doc.setFontSize(11); doc.setTextColor(...PRIMARIO);
            doc.text(txt(t), M, l.y);
            doc.setDrawColor(...PRIMARIO); doc.setLineWidth(0.3); doc.line(M, l.y + 1.2, M + l.ancho, l.y + 1.2);
            l.y += 5;
            doc.setTextColor(17, 24, 39);
        };
        l.parrafo = (t, { tam = 9, color = [55, 65, 81], estilo = 'normal', sangria = 0, vineta = false } = {}) => {
            doc.setFont('helvetica', estilo); doc.setFontSize(tam); doc.setTextColor(...color);
            const lineas = doc.splitTextToSize(txt(t), l.ancho - sangria - (vineta ? 4 : 0));
            const alto = tam * 0.42;
            lineas.forEach((ln, i) => {
                l.espacio(alto + 1);
                if (vineta && i === 0) doc.text('•', M + sangria, l.y);
                doc.text(ln, M + sangria + (vineta ? 4 : 0), l.y);
                l.y += alto;
            });
            l.y += 1.2;
        };
        l.tabla = (cabecera, filas, extra = {}) => {
            doc.autoTable({
                startY: l.y, head: [cabecera.map(txt)], body: filas.map(f => f.map(txt)), theme: 'grid', margin: { left: M, right: M, bottom: 16 },
                styles: { fontSize: 8, cellPadding: 1.4, lineColor: [226, 232, 240], lineWidth: 0.1, textColor: [31, 41, 55], overflow: 'linebreak' },
                headStyles: { fillColor: PRIMARIO, textColor: 255, fontStyle: 'bold' },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                ...extra
            });
            l.y = doc.lastAutoTable.finalY + 4;
        };
        return l;
    }

    function pdfEncabezado(l, enc) {
        const { doc, M } = l;
        doc.setFillColor(...PRIMARIO);
        doc.rect(0, 0, l.W, 21, 'F');
        doc.setTextColor(255);
        doc.setFont('helvetica', 'bold'); doc.setFontSize(enc.institucion ? 10 : 13);
        if (enc.institucion) {
            doc.text(txt(enc.institucion), M, 8);
            doc.setFontSize(13); doc.text(txt(enc.titulo), M, 15.5);
        } else {
            doc.text(txt(enc.titulo), M, 12.5);
        }
        l.y = 26;
        doc.setTextColor(55, 65, 81); doc.setFontSize(8.5);
        let x = M;
        enc.lineas.forEach(([k, v]) => {
            const parte = `${txt(k)}: `;
            doc.setFont('helvetica', 'bold');
            const anchoParte = doc.getTextWidth(parte);
            doc.setFont('helvetica', 'normal');
            const ancho = anchoParte + doc.getTextWidth(txt(v)) + 6;
            if (x + ancho > M + l.ancho) { x = M; l.y += 4.2; }
            doc.setFont('helvetica', 'bold'); doc.text(parte, x, l.y);
            doc.setFont('helvetica', 'normal'); doc.text(txt(v), x + anchoParte, l.y);
            x += ancho;
        });
        l.y += 5;
    }

    function pdfIndicadores(l, lista) {
        const { doc, M } = l;
        const gap = 2.5;
        const w = (l.ancho - gap * (lista.length - 1)) / lista.length;
        const h = 17;
        l.espacio(h + 2);
        lista.forEach((it, i) => {
            const x = M + i * (w + gap);
            if (it.fondo) { doc.setFillColor(...hexARgb(it.fondo)); } else { doc.setFillColor(248, 250, 252); }
            doc.setDrawColor(226, 232, 240);
            doc.roundedRect(x, l.y, w, h, 1.5, 1.5, 'FD');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(107, 114, 128);
            doc.text(txt(it.etiqueta).toUpperCase(), x + 2.5, l.y + 4.5);
            doc.setFont('helvetica', 'bold'); doc.setFontSize(txt(it.valor).length > 12 ? 9 : 12.5);
            doc.setTextColor(...(it.color ? hexARgb(it.color) : [17, 24, 39]));
            doc.text(doc.splitTextToSize(txt(it.valor), w - 4)[0], x + 2.5, l.y + 10.5);
            if (it.detalle) { doc.setFont('helvetica', 'normal'); doc.setFontSize(6.5); doc.setTextColor(107, 114, 128); doc.text(doc.splitTextToSize(txt(it.detalle), w - 4)[0], x + 2.5, l.y + 14.8); }
        });
        l.y += h + 4;
        doc.setTextColor(17, 24, 39);
    }

    /** Gráfico de barras dibujado con primitivas de jsPDF. */
    function pdfBarras(l, x, y, w, h, datos, { max = null, linea = null, serie2 = null, titulo = '' } = {}) {
        const { doc } = l;
        if (titulo) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(55, 65, 81); doc.text(txt(titulo), x, y); y += 3; h -= 3; }
        const base = y + h - 5;
        const top = y + 3;
        const maximo = max ?? Math.max(1, ...datos.map(d => d.valor));
        const escalaY = v => base - ((base - top) * Math.max(0, Math.min(v, maximo))) / maximo;
        const paso = w / Math.max(1, datos.length);
        const bw = Math.min(9, paso * (serie2 ? 0.36 : 0.6));
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(x, base, x + w, base);
        datos.forEach((d, i) => {
            const bx = x + i * paso + (paso - (serie2 ? bw * 2 + 0.8 : bw)) / 2;
            const by = escalaY(d.valor);
            doc.setFillColor(...hexARgb(d.sinNota ? '#fca5a5' : (d.color || '#4f46e5')));
            if (base - by > 0.1) doc.rect(bx, by, bw, base - by, 'F');
            doc.setFont('helvetica', 'normal'); doc.setFontSize(6); doc.setTextColor(55, 65, 81);
            doc.text(d.sinNota ? '-' : String(Number.isInteger(d.valor) ? d.valor : U.redondear(d.valor, 1)), bx + bw / 2, by - 0.8, { align: 'center' });
            if (serie2 && serie2[i] !== null && serie2[i] !== undefined) {
                const y2 = escalaY(serie2[i]);
                doc.setFillColor(203, 213, 225);
                doc.rect(bx + bw + 0.8, y2, bw, base - y2, 'F');
            }
            doc.setFontSize(6); doc.setTextColor(75, 85, 99);
            doc.text(txt(d.etiqueta).slice(0, 12), bx + (serie2 ? bw + 0.4 : bw / 2), base + 3.2, { align: 'center' });
        });
        if (linea !== null) {
            const ly = escalaY(linea);
            doc.setDrawColor(220, 38, 38); doc.setLineDashPattern([1, 0.8], 0); doc.line(x, ly, x + w, ly); doc.setLineDashPattern([], 0);
            doc.setFontSize(6); doc.setTextColor(220, 38, 38); doc.text(String(linea), x + w, ly - 0.8, { align: 'right' });
        }
        doc.setTextColor(17, 24, 39);
    }

    function pdfIndividual(l, m) {
        const { doc, M } = l;
        pdfEncabezado(l, m.encabezado);
        // Datos del estudiante
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(17, 24, 39);
        doc.text(txt(m.estudiante.nombre), M, l.y + 3);
        l.y += 7.5;
        doc.setFontSize(8.5);
        const datosTxt = m.estudiante.datos.map(([k, v]) => `${k}: ${v}`).join('   |   ');
        l.parrafo(datosTxt, { tam: 8.5 });
        l.y += 1;
        pdfIndicadores(l, m.indicadores);

        l.titulo('Resultados por evaluación');
        const colores = m.evaluaciones.map(x => hexARgb(x.color));
        l.tabla(['Evaluación', 'Tipo', 'Fecha', 'Peso', 'Nota', 'Aporte', 'Media grupo', 'Resultado'],
            m.evaluaciones.map(x => [x.nombre, x.tipo, x.fecha, x.peso, x.nota, x.aporte, x.media, x.estado]), {
                columnStyles: { 3: { halign: 'right' }, 4: { halign: 'right', fontStyle: 'bold' }, 5: { halign: 'right' }, 6: { halign: 'right' } },
                didParseCell: d => { if (d.section === 'body' && d.column.index === 7) { d.cell.styles.textColor = colores[d.row.index]; d.cell.styles.fontStyle = 'bold'; } }
            });
        if (m.grafico.length) {
            const h = 34;
            l.espacio(h + 2);
            pdfBarras(l, M, l.y, Math.min(l.ancho, 16 + m.grafico.length * 16), h, m.grafico, { max: m.escala.maxima, linea: m.escala.aprobatoria, serie2: m.grafico.map(g => g.media), titulo: 'Notas del estudiante (color) frente a la media del grupo (gris)' });
            l.y += h + 3;
        }
        if (m.dimensiones?.length) {
            l.titulo('Desempeño por carácter de las competencias');
            l.tabla(['Carácter', 'Qué evalúa', 'Nota', 'Media grupo', 'Nivel', 'Lectura'], m.dimensiones.map(x => [x.etiqueta, x.descripcion, x.nota, x.media, x.nivel, x.lectura]), {
                columnStyles: { 0: { fontStyle: 'bold', cellWidth: 30 }, 2: { halign: 'right', fontStyle: 'bold' }, 3: { halign: 'right' } },
                didParseCell: d => { if (d.section === 'body' && d.column.index === 5) { d.cell.styles.fontStyle = 'bold'; d.cell.styles.textColor = d.cell.raw === 'Por fortalecer' ? [185, 28, 28] : [4, 120, 87]; } }
            });
        }
        if (m.competencias.length) {
            l.titulo('Competencias a reforzar');
            l.tabla(['N.º', 'Competencia', 'Criterio de evaluación', 'Evaluación'], m.competencias.map(c => [String(c.numero), c.texto, c.criterio, c.evaluaciones]), {
                styles: { fontSize: 7.5, cellPadding: 1.2, overflow: 'linebreak' },
                columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: l.ancho * 0.42 }, 3: { cellWidth: 26 } }
            });
            if (m.competenciasOmitidas) l.parrafo(`Se muestran ${m.competencias.length} de ${m.competencias.length + m.competenciasOmitidas} competencias por reforzar (las comprometidas en más evaluaciones). El listado completo está en la hoja «Plan por estudiante» del Excel consolidado.`, { tam: 7.5, color: [107, 114, 128] });
        }
        const tipos = Object.keys(CONFIG.TIPOS_RECURSO).filter(t => m.recursos[t]?.length);
        if (tipos.length) {
            l.titulo('Recursos recomendados para el plan de mejoramiento');
            tipos.forEach(t => {
                l.espacio(8);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(55, 65, 81);
                doc.text(txt(CONFIG.TIPOS_RECURSO[t]), M, l.y); l.y += 4;
                m.recursos[t].forEach(r => {
                    doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
                    const lineas = doc.splitTextToSize(txt(r.titulo), l.ancho - 6);
                    lineas.forEach((ln, i) => {
                        l.espacio(4);
                        if (i === 0) { doc.setTextColor(55, 65, 81); doc.text('•', M + 1, l.y); }
                        if (r.url) { doc.setTextColor(37, 99, 235); doc.textWithLink(ln, M + 5, l.y, { url: r.url }); } else { doc.setTextColor(55, 65, 81); doc.text(ln, M + 5, l.y); }
                        l.y += 3.6;
                    });
                });
                l.y += 1.5;
            });
        }
        if (m.recomendaciones.length) {
            l.titulo('Recomendaciones');
            m.recomendaciones.forEach(r => l.parrafo(r, { vineta: true }));
        }
        if (m.observacion) { l.titulo('Observaciones del docente'); l.parrafo(m.observacion); }
        if (m.mensaje) { l.y += 2; l.parrafo(m.mensaje, { estilo: 'italic' }); }
        if (m.firmas.length) {
            l.espacio(26);
            l.y += 16;
            const w = (l.ancho - 12) / m.firmas.length;
            m.firmas.forEach(([nombre, cargo], i) => {
                const x = M + i * (w + 6);
                doc.setDrawColor(107, 114, 128); doc.setLineWidth(0.25); doc.line(x, l.y, x + w, l.y);
                doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(17, 24, 39);
                if (nombre) doc.text(doc.splitTextToSize(txt(nombre), w)[0], x, l.y + 4);
                doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(107, 114, 128);
                doc.text(txt(cargo), x, l.y + (nombre ? 7.5 : 4));
            });
            l.y += 10;
        }
    }

    function pdfGrupal(l, m) {
        const { doc, M } = l;
        pdfEncabezado(l, m.encabezado);
        pdfIndicadores(l, m.indicadores);
        // Gráficos en dos columnas
        const gw = (l.ancho - 8) / 2;
        const gh = 38;
        l.espacio(gh * 2 + 8);
        pdfBarras(l, M, l.y, gw, gh, m.histograma, { titulo: 'Distribución de promedios' });
        pdfBarras(l, M + gw + 8, l.y, gw, gh, m.medias, { max: m.escala.maxima, linea: m.escala.aprobatoria, titulo: 'Media por evaluación' });
        l.y += gh + 4;
        pdfBarras(l, M, l.y, gw, gh, m.estados, { titulo: 'Estado académico' });
        pdfBarras(l, M + gw + 8, l.y, gw, gh, m.niveles, { titulo: 'Niveles de desempeño' });
        l.y += gh + 3;
        if (m.avisos.length) m.avisos.forEach(a => l.parrafo(a, { tam: 8, color: [146, 64, 14] }));

        if (m.dimensiones.length) {
            l.titulo('Desempeño por carácter de las competencias');
            l.espacio(36);
            const y0 = l.y;
            pdfBarras(l, M, y0, gw * 0.8, 32, m.dimensiones, { max: m.escala.maxima, linea: m.escala.aprobatoria });
            doc.autoTable({
                startY: y0, head: [['Carácter', 'Media', 'Logro', 'Peso', 'Comp.'].map(txt)], body: m.tablaDimensiones.map(f => f.map(txt)), theme: 'grid',
                margin: { left: M + gw + 8, right: M }, styles: { fontSize: 8, cellPadding: 1.3 }, headStyles: { fillColor: PRIMARIO, textColor: 255 }
            });
            l.y = Math.max(y0 + 34, doc.lastAutoTable.finalY + 4);
        }
        l.titulo('Estadísticas por evaluación');
        l.tabla(['Evaluación', 'Peso', 'Notas', 'Sin presentar', 'Media', 'Mediana', 'Desv.', 'Mín.', 'Máx.', '% aprob.'], m.tablaEvaluaciones, {
            columnStyles: Object.fromEntries([1, 2, 3, 4, 5, 6, 7, 8, 9].map(i => [i, { halign: 'right' }]))
        });
        l.titulo(`Estudiantes en riesgo o perdiendo (${m.riesgo.length})`);
        l.tabla(['Estudiante', 'Promedio', 'Estado', 'Necesita', 'Perdidas', 'Sin presentar'], m.riesgo, { columnStyles: { 1: { halign: 'right' }, 3: { halign: 'right' } } });
        if (m.logroCompetencias.length) {
            l.titulo('Logro por competencia (las de menor logro primero)');
            l.tabla(['N.º', 'Competencia', 'Carácter', 'Estud.', 'Media', 'Logro'], m.logroCompetencias, { styles: { fontSize: 7.5, cellPadding: 1.2 }, columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: l.ancho * 0.52 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } } });
        }
        if (m.criticas.length) {
            l.titulo('Competencias críticas');
            l.tabla(['N.º', 'Competencia', 'Evaluaciones', 'Afectados', 'Media'], m.criticas, { styles: { fontSize: 7.5, cellPadding: 1.2 }, columnStyles: { 0: { cellWidth: 9, halign: 'center' }, 1: { cellWidth: l.ancho * 0.5 } } });
        }
        l.titulo('Mejores promedios');
        l.tabla(['#', 'Estudiante', 'Promedio', 'Nivel'], m.ranking, { columnStyles: { 0: { cellWidth: 9 }, 2: { halign: 'right' } } });

        l.titulo('Consolidado de notas');
        const ap = m.escala.aprobatoria;
        const numericas = new Set([...m.consolidado.columnasNota, m.consolidado.columnasNota.length + 2, m.consolidado.columnasNota.length + 3]);
        l.tabla(m.consolidado.cabecera, m.consolidado.filas, {
            styles: { fontSize: m.consolidado.cabecera.length > 14 ? 6.5 : 7.5, cellPadding: 1 },
            columnStyles: { 0: { cellWidth: 7 }, 1: { cellWidth: l.W > 250 ? 55 : 42 } },
            didParseCell: d => {
                if (d.section !== 'body') return;
                const v = d.cell.raw;
                if (numericas.has(d.column.index)) {
                    d.cell.styles.halign = 'right';
                    if (v !== '' && !Number.isNaN(+v) && +v < ap) { d.cell.styles.textColor = [185, 28, 28]; d.cell.styles.fontStyle = 'bold'; }
                }
                if (v === 'NP') d.cell.styles.textColor = [180, 83, 9];
            }
        });
        if (m.mensaje) l.parrafo(m.mensaje, { estilo: 'italic' });
    }

    /** Barras agrupadas con primitivas de jsPDF. */
    function pdfBarrasAgrupadas(l, x, y, w, h, { categorias, series }, { max = 5, linea = null, titulo = '' } = {}) {
        const { doc } = l;
        if (titulo) { doc.setFont('helvetica', 'bold'); doc.setFontSize(8); doc.setTextColor(55, 65, 81); doc.text(txt(titulo), x, y); y += 3; h -= 3; }
        const base = y + h - 9;
        const top = y + 3;
        const escalaY = v => base - ((base - top) * Math.max(0, Math.min(v, max))) / max;
        const paso = w / Math.max(1, categorias.length);
        const bw = Math.min(7, (paso * 0.8) / Math.max(1, series.length));
        doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.2); doc.line(x, base, x + w, base);
        categorias.forEach((c, i) => {
            const x0 = x + i * paso + (paso - bw * series.length) / 2;
            series.forEach((se, j) => {
                const v = se.valores[i];
                if (v === null || v === undefined) return;
                const by = escalaY(v);
                doc.setFillColor(...hexARgb(se.color));
                if (base - by > 0.1) doc.rect(x0 + j * bw, by, bw - 0.6, base - by, 'F');
                doc.setFont('helvetica', 'normal'); doc.setFontSize(5.5); doc.setTextColor(55, 65, 81);
                doc.text(String(U.redondear(v, 1)), x0 + j * bw + (bw - 0.6) / 2, by - 0.7, { align: 'center' });
            });
            doc.setFontSize(6); doc.setTextColor(75, 85, 99);
            doc.text(doc.splitTextToSize(txt(c), paso - 1)[0], x + i * paso + paso / 2, base + 3.2, { align: 'center' });
        });
        if (linea !== null) {
            const ly = escalaY(linea);
            doc.setDrawColor(220, 38, 38); doc.setLineDashPattern([1, 0.8], 0); doc.line(x, ly, x + w, ly); doc.setLineDashPattern([], 0);
            doc.setFontSize(6); doc.setTextColor(220, 38, 38); doc.text(String(linea), x + w, ly - 0.8, { align: 'right' });
        }
        // Leyenda
        let lx = x;
        series.forEach(se => {
            doc.setFillColor(...hexARgb(se.color)); doc.rect(lx, base + 5.2, 2.5, 2.5, 'F');
            doc.setFontSize(6.5); doc.setTextColor(55, 65, 81); doc.text(txt(se.nombre), lx + 3.3, base + 7.3);
            lx += doc.getTextWidth(txt(se.nombre)) + 8;
        });
        doc.setTextColor(17, 24, 39);
    }

    function pdfPrograma(l, m) {
        const { doc, M } = l;
        pdfEncabezado(l, m.encabezado);
        pdfIndicadores(l, m.indicadores);
        if (m.avisos.length) m.avisos.forEach(a => l.parrafo(a, { tam: 8, color: [146, 64, 14] }));
        l.titulo('Hallazgos principales');
        m.hallazgos.forEach(x => l.parrafo(x, { vineta: true, tam: 8.5 }));

        l.titulo('Desempeño por carácter de las competencias');
        pdfIndicadores(l, m.dimensiones.map(d => ({
            etiqueta: d.etiqueta, valor: d.n ? d.texto.media : '—', color: d.color, fondo: d.fondo,
            detalle: d.n ? `${d.texto.logro} con logro - ${d.texto.participacion} del peso` : 'sin evaluaciones'
        })));
        const gw = (l.ancho - 8) / 2;
        const gh = 46;
        l.espacio(gh + 4);
        pdfBarrasAgrupadas(l, M, l.y, gw, gh, m.graficoGrupos, { max: m.escala.maxima, linea: m.escala.aprobatoria, titulo: 'Media por carácter en cada grupo' });
        pdfBarras(l, M + gw + 8, l.y, gw, gh - 6, m.graficoPromedios, { max: m.escala.maxima, linea: m.escala.aprobatoria, titulo: 'Promedio actual por grupo' });
        l.y += gh + 3;

        const numDims = m.cabeceraDims.length;
        l.titulo('Comparativo de grupos');
        l.tabla(['Grupo', 'Docente', 'Curso', 'Est.', 'Evaluado', 'Promedio', 'Aprobando', 'Riesgo', ...m.cabeceraDims], m.tablaGrupos, {
            styles: { fontSize: 7, cellPadding: 1.1 },
            columnStyles: Object.fromEntries([3, 4, 5, 6, 7, ...Array.from({ length: numDims }, (_, i) => 8 + i)].map(i => [i, { halign: 'right' }]))
        });
        if (m.tablaCursos.length > 1) {
            l.titulo('Por curso');
            l.tabla(['Curso', 'Grupos', 'Est.', 'Promedio', 'Aprobando', 'Riesgo', ...m.cabeceraDims], m.tablaCursos, { styles: { fontSize: 7.5, cellPadding: 1.1 } });
        }
        if (m.competenciasCriticas.length) {
            const opc = { styles: { fontSize: 7, cellPadding: 1.1 }, columnStyles: { 0: { cellWidth: l.ancho * 0.42 }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' }, 6: { halign: 'right', fontStyle: 'bold' } } };
            l.titulo('Competencias con menor logro en el programa');
            l.tabla(['Competencia', 'Curso', 'Carácter', 'Grupos', 'Estud.', 'Media', 'Logro'], m.competenciasCriticas, opc);
            l.titulo('Competencias mejor logradas');
            l.tabla(['Competencia', 'Curso', 'Carácter', 'Grupos', 'Estud.', 'Media', 'Logro'], m.competenciasFuertes, opc);
        }
        if (m.evaluacionesCriticas.length) {
            l.titulo('Evaluaciones con menor aprobación');
            l.tabla(['Grupo', 'Evaluación', 'Notas', 'Media', 'Aprobación', 'Sin presentar'], m.evaluacionesCriticas, { styles: { fontSize: 7.5, cellPadding: 1.1 }, columnStyles: { 2: { halign: 'right' }, 3: { halign: 'right' }, 4: { halign: 'right' }, 5: { halign: 'right' } } });
        }
        if (m.recomendaciones.length) {
            l.titulo('Recomendaciones para el programa');
            m.recomendaciones.forEach(r => {
                l.espacio(10);
                l.parrafo(r.titulo, { estilo: 'bold', tam: 9, color: [17, 24, 39] });
                r.items.forEach(x => l.parrafo(x, { vineta: true, sangria: 2, tam: 8.5 }));
            });
        }
        l.titulo(`Estudiantes en riesgo o perdiendo (${m.riesgo.length})`);
        l.tabla(['Estudiante', 'Grupo', 'Promedio', 'Estado', 'Necesita', ...m.cabeceraDims], m.riesgo, {
            styles: { fontSize: 7, cellPadding: 1 },
            columnStyles: Object.fromEntries([2, 4, ...Array.from({ length: numDims }, (_, i) => 5 + i)].map(i => [i, { halign: 'right' }]))
        });
        if (m.sinNotas.length) l.parrafo(`Sin ninguna nota (${m.sinNotas.length}): ${m.sinNotas.join(', ')}.`, { tam: 8 });
        if (m.mensaje) l.parrafo(m.mensaje, { estilo: 'italic' });
    }

    function piePaginas(doc, texto) {
        const n = doc.getNumberOfPages();
        const W = doc.internal.pageSize.getWidth();
        const H = doc.internal.pageSize.getHeight();
        for (let i = 1; i <= n; i++) {
            doc.setPage(i);
            doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(156, 163, 175);
            doc.text(txt(texto), 14, H - 8);
            doc.text(`Página ${i} de ${n}`, W - 14, H - 8, { align: 'right' });
        }
    }

    /**
     * Genera el PDF de una lista de modelos (un estudiante por página o el informe grupal).
     * @returns {jsPDF}
     */
    function generarPDF(modelos, opciones = {}) {
        const doc = crearDocumento(opciones);
        modelos.forEach((m, i) => {
            if (i > 0) doc.addPage();
            const l = Lienzo(doc);
            if (m.tipo === 'grupal') pdfGrupal(l, m); else if (m.tipo === 'programa') pdfPrograma(l, m); else pdfIndividual(l, m);
        });
        piePaginas(doc, opciones.pie || `Generado con Analista Académico · ${U.fechaLarga(U.fechaISO())}`);
        doc.setProperties({ title: opciones.titulo || 'Informe académico', creator: 'Analista Académico' });
        return doc;
    }

    // ---------------------------------------------------------------- Excel

    /** Libro de Excel con el consolidado, estadísticas, competencias críticas, plan por estudiante y configuración. */
    function libroExcel(datos, grupo, XLSX) {
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(datos.escala || {}) };
        const evs = (datos.evaluaciones || []).filter(e => e.incluida !== false);
        const r2 = v => (v === null || v === undefined ? '' : U.redondear(v, 2));
        const libro = XLSX.utils.book_new();
        const agregar = (nombre, filas, anchos) => {
            const hoja = XLSX.utils.aoa_to_sheet(filas);
            if (anchos) hoja['!cols'] = anchos.map(w => ({ wch: w }));
            XLSX.utils.book_append_sheet(libro, hoja, nombre);
        };

        const c = datos.curso || {};
        const cabecera = ['Documento', 'Estudiante', ...evs.map(e => `${e.clave} (${U.redondear(e.peso, 2)}%)`),
            ...(datos.columnasInfo || []).map(x => x.nombre),
            'Acumulado', '% evaluado', 'Promedio actual', 'Nivel', 'Estado', 'Nota necesaria', 'Máximo posible',
            ...Object.values(CONFIG.DIMENSIONES).map(x => x.etiqueta), 'Evaluaciones perdidas', 'Sin presentar', 'Tendencia', 'Observaciones'];
        agregar('Consolidado', [
            [`${c.institucion || ''} ${c.asignatura ? `- ${c.asignatura}` : ''} ${c.grupo ? `- Grupo ${c.grupo}` : ''} ${c.periodo ? `- ${c.periodo}` : ''}`.trim()],
            [],
            cabecera,
            ...grupo.resultados.map(r => [
                r.id, r.nombre,
                ...evs.map(e => r.estudiante.notas[e.clave] ?? (r.estudiante.marcas?.[e.clave] || '')),
                ...(datos.columnasInfo || []).map(x => r.estudiante.info?.[x.clave] ?? ''),
                r2(r.acumulado), r.pesoEvaluado, r2(r.promedio), r.nivel?.nombre || '', CONFIG.ESTADOS[r.estado].etiqueta,
                r2(r.necesaria), r2(r.maximoPosible), ...Object.keys(CONFIG.DIMENSIONES).map(k => r2(r.dimensiones?.[k])),
                r.perdidas.join(', '), r.faltantes.join(', '), r.tendencia || '', datos.observaciones?.[r.id] || ''
            ])
        ], [14, 34, ...evs.map(() => 9), ...(datos.columnasInfo || []).map(() => 12), 11, 10, 12, 10, 18, 12, 12, 12, 12, 12, 18, 16, 10, 40]);

        agregar('Estadísticas', [
            ['Evaluación', 'Clave', 'Tipo', 'Peso (%)', 'Fecha', 'Notas', 'Sin presentar', 'Media', 'Mediana', 'Desviación', 'Mínimo', 'Máximo', 'Aprobados', 'Reprobados', '% aprobación'],
            ...grupo.porEvaluacion.map(p => {
                const ev = datos.evaluaciones.find(e => e.clave === p.clave);
                return [p.nombre, p.clave, CONFIG.TIPOS_EVALUACION[p.tipo] || p.tipo, p.peso, ev?.fecha || '', p.n, p.sinPresentar, r2(p.media), r2(p.mediana), r2(p.desviacion), r2(p.minimo), r2(p.maximo), p.aprobados, p.reprobados, p.n ? U.redondear((p.aprobados / p.n) * 100, 1) : ''];
            }),
            [],
            ['Resumen del grupo'],
            ['Estudiantes', grupo.resumen.estudiantes],
            ['Promedio del grupo', r2(grupo.resumen.promedios.media)],
            ['Mediana', r2(grupo.resumen.promedios.mediana)],
            ['Porcentaje evaluado', grupo.resumen.pesoEvaluado],
            ...Object.entries(grupo.resumen.porEstado).filter(([, n]) => n).map(([k, n]) => [CONFIG.ESTADOS[k].etiqueta, n]),
            ...Object.entries(grupo.resumen.distribucion).map(([k, n]) => [`Nivel ${k}`, n])
        ], [24, 8, 14, 9, 12, 8, 12, 8, 9, 10, 8, 8, 10, 11, 12]);

        if (grupo.competenciasCriticas.length) {
            agregar('Competencias críticas', [
                ['Curso', 'N.º', 'Competencia', 'Criterio de evaluación', 'Evaluaciones', 'Estudiantes afectados', '% del grupo', 'Media de las evaluaciones'],
                ...grupo.competenciasCriticas.map(x => [x.competencia.curso, x.competencia.numero, x.competencia.texto, x.competencia.criterio, x.evaluaciones.join(', '), x.afectados, U.redondear(x.porcentaje, 1), r2(x.media)])
            ], [24, 6, 60, 50, 22, 12, 10, 12]);
        }

        agregar('Plan por estudiante', [
            ['Documento', 'Estudiante', 'Estado', 'Competencias a reforzar', 'Recursos recomendados', 'Recomendaciones'],
            ...grupo.resultados.map(r => {
                const reforzar = Analisis.competenciasAReforzar(datos, r);
                const recursos = Analisis.recursosRecomendados(datos, r, reforzar);
                return [r.id, r.nombre, CONFIG.ESTADOS[r.estado].etiqueta,
                    reforzar.map(x => `${x.competencia.numero}. ${x.competencia.texto}`).join('\n'),
                    Object.entries(recursos).map(([t, l]) => `${CONFIG.TIPOS_RECURSO[t]}:\n${l.map(x => `- ${x.titulo}${x.url ? ` (${x.url})` : ''}`).join('\n')}`).join('\n'),
                    Analisis.recomendaciones(datos, r).join('\n')];
            })
        ], [14, 34, 16, 70, 70, 70]);

        agregar('Configuración', [
            ['Evaluación', 'Clave', 'Columna en el archivo', 'Tipo', 'Incluida', 'Peso (%)', 'Fecha', 'Carácter', 'Competencias asociadas'],
            ...datos.evaluaciones.map(e => [e.nombre, e.clave, e.encabezado, CONFIG.TIPOS_EVALUACION[e.tipo] || e.tipo, e.incluida !== false ? 'Sí' : 'No', e.peso, e.fecha || '',
                describirPerfil(grupo.perfiles?.[e.clave]), (e.competencias || []).join(', ')]),
            [],
            ['Escala', `${escala.minima} a ${escala.maxima}`],
            ['Nota aprobatoria', escala.aprobatoria],
            ['Celdas vacías en evaluaciones calificadas', datos.opciones?.vaciasComoCero !== false ? 'Cuentan como 0' : 'No se cuentan'],
            ...(datos.niveles || []).map(n => [`Nivel ${n.nombre}`, `desde ${n.desde}`])
        ], [24, 8, 18, 16, 8, 9, 12, 30, 60]);
        return libro;
    }

    /** Libro de Excel del programa: resumen, grupos, carácter, competencias, cursos, evaluaciones, estudiantes y clasificación. */
    function libroExcelPrograma(prog, XLSX) {
        const r2 = v => (v === null || v === undefined ? '' : U.redondear(v, 2));
        const r1 = v => (v === null || v === undefined ? '' : U.redondear(v, 1));
        const dims = Object.entries(CONFIG.DIMENSIONES);
        const libro = XLSX.utils.book_new();
        const agregar = (nombre, filas, anchos) => {
            const hoja = XLSX.utils.aoa_to_sheet(filas);
            if (anchos) hoja['!cols'] = anchos.map(w => ({ wch: w }));
            XLSX.utils.book_append_sheet(libro, hoja, nombre);
        };
        const s = prog.resumen;
        agregar('Resumen', [
            ['Informe global del programa', U.fechaLarga(U.fechaISO())],
            [],
            ['Grupos', s.grupos], ['Estudiantes', s.estudiantes], ['Con notas', s.conNotas],
            ['Promedio del programa', r2(s.media)], ['Mediana', r2(s.mediana)], ['Desviación', r2(s.desviacion)],
            ['Van aprobando', s.aprobando], ['En riesgo', s.riesgo], ['Ya no alcanzan / reprobados', s.perdidos], ['Sin notas', s.sinDatos],
            ['Brecha entre grupos', s.brecha ? r2(s.brecha.valor) : ''],
            [],
            ['Carácter', 'Descripción', 'Media', '% con logro', '% del peso', 'Competencias evaluadas', 'Estudiantes con nota'],
            ...dims.map(([k, d]) => [d.etiqueta, d.descripcion, r2(prog.dimensiones[k].media), r1(prog.dimensiones[k].logro), r1(prog.dimensiones[k].participacion), prog.dimensiones[k].competencias, prog.dimensiones[k].n]),
            [],
            ['Hallazgos'],
            ...prog.hallazgos.map(h => [h]),
            [],
            ['Recomendaciones'],
            ...prog.recomendaciones.flatMap(r => [[r.titulo], ...r.items.map(x => ['', x])])
        ], [34, 60, 10, 12, 10, 14, 12]);

        agregar('Grupos', [
            ['Grupo', 'Asignatura', 'Grupo (código)', 'Docente', 'Curso de competencias', 'Estudiantes', 'Con notas', '% evaluado', 'Promedio', 'Mediana', 'Desviación',
                'Van aprobando', '% aprobando', 'En riesgo', 'Ya no alcanzan', '% riesgo o perdiendo', 'Sin notas',
                ...dims.flatMap(([, d]) => [`${d.etiqueta}: media`, `${d.etiqueta}: % logro`, `${d.etiqueta}: % del peso`]),
                'Competencias evaluadas', 'Logro medio de competencias (%)'],
            ...prog.grupos.map(g => [g.nombre, g.asignatura, g.grupo, g.docente, g.curso, g.estudiantes, g.conNotas, g.pesoEvaluado, r2(g.media), r2(g.mediana), r2(g.desviacion),
                g.aprobando, r1(g.pctAprobando), g.riesgo, g.perdidos, r1(g.pctRiesgo), g.sinDatos,
                ...dims.flatMap(([k]) => [r2(g.dims[k].media), r1(g.dims[k].logro), r1(g.dims[k].peso)]),
                g.competenciasEvaluadas, r1(g.logroCompetencias)])
        ], [30, 22, 10, 24, 24, 10, 9, 10, 9, 9, 10, 10, 10, 9, 10, 12, 9, ...dims.flatMap(() => [10, 10, 10]), 12, 14]);

        if (prog.porCurso.length) {
            agregar('Por curso', [
                ['Curso', 'Grupos', 'Estudiantes', 'Promedio', '% aprobando', '% riesgo o perdiendo', ...dims.flatMap(([, d]) => [`${d.etiqueta}: media`, `${d.etiqueta}: % logro`])],
                ...prog.porCurso.map(c => [c.curso, c.grupos.join(', '), c.estudiantes, r2(c.media), r1(c.pctAprobando), r1(c.pctRiesgo), ...dims.flatMap(([k]) => [r2(c.dims[k].media), r1(c.dims[k].logro)])])
            ], [30, 40, 10, 9, 10, 12, ...dims.flatMap(() => [10, 10])]);
        }

        agregar('Competencias', [
            ['Curso', 'N.º', 'Competencia', 'Criterio de evaluación', 'Carácter', 'Grupos', 'Estudiantes evaluados', 'Media', '% con logro'],
            ...prog.competencias.map(c => [c.curso, c.competencia.numero, c.competencia.texto, c.competencia.criterio, CONFIG.DIMENSIONES[c.dimension]?.etiqueta || '', c.grupos.join(', '), c.n, r2(c.media), r1(c.logro)])
        ], [24, 6, 60, 46, 16, 30, 10, 8, 10]);

        agregar('Evaluaciones', [
            ['Grupo', 'Evaluación', 'Clave', 'Notas', 'Media', '% aprobación', 'Sin presentar'],
            ...prog.evaluacionesCriticas.map(x => [x.grupo, x.evaluacion, x.clave, x.n, r2(x.media), r1(x.aprobacion), x.sinPresentar])
        ], [30, 24, 8, 8, 8, 12, 12]);

        agregar('Estudiantes', [
            ['Grupo', 'Documento', 'Estudiante', 'Acumulado', '% evaluado', 'Promedio actual', 'Nivel', 'Estado', 'Nota necesaria', ...dims.map(([, d]) => d.etiqueta), 'Evaluaciones perdidas', 'Sin presentar', 'Tendencia'],
            ...prog.grupos.flatMap(g => g.g.resultados.map(r => [g.nombre, r.id, r.nombre, r2(r.acumulado), r.pesoEvaluado, r2(r.promedio), r.nivel?.nombre || '', CONFIG.ESTADOS[r.estado].etiqueta, r2(r.necesaria),
                ...dims.map(([k]) => r2(r.dimensiones?.[k])), r.perdidas.join(', '), r.faltantes.join(', '), r.tendencia || '']))
        ], [28, 14, 34, 10, 10, 12, 10, 18, 12, ...dims.map(() => 12), 18, 16, 10]);

        // Clasificación de las competencias de los cursos en uso (para revisarla o justificarla)
        const enUso = new Map();
        prog.grupos.forEach(g => {
            const c = g.datos.competencias?.cursos?.find(x => x.id === g.datos.competencias.cursoActivo);
            if (c) enUso.set(c.id, c);
        });
        if (enUso.size) {
            agregar('Clasificación', [
                ['Curso', 'N.º', 'Competencia', 'Criterio', 'Carácter asignado', 'Clasificación automática', 'Corregida por el docente'],
                ...[...enUso.values()].flatMap(c => c.competencias.map(x => [c.nombre, x.numero, x.texto, x.criterio,
                    CONFIG.DIMENSIONES[Analisis.dimensionDe(x)]?.etiqueta || '', CONFIG.DIMENSIONES[x.dimension]?.etiqueta || '', x.dimensionManual ? 'Sí' : '']))
            ], [24, 6, 60, 46, 18, 20, 12]);
        }
        return libro;
    }

    const Informes = {
        modeloIndividual, modeloGrupal, modeloPrograma, htmlIndividual, htmlGrupal, htmlPrograma, svgBarras, svgBarrasAgrupadas,
        generarPDF, libroExcel, libroExcelPrograma, describirPerfil, txt, ESTADO_EVALUACION
    };
    global.Informes = Informes;
    if (typeof module !== 'undefined' && module.exports) module.exports = Informes;
})(typeof window !== 'undefined' ? window : globalThis);
