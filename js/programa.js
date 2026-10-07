/**
 * Análisis global del programa: compara todos los grupos cargados y consolida el desempeño
 * por carácter de las competencias (analítico, práctico, pensamiento crítico), por competencia,
 * por curso y por estado de riesgo. Genera hallazgos y recomendaciones en lenguaje natural.
 *
 * Funciones puras (no tocan el DOM): reciben los grupos y su análisis.
 */
(function (global) {
    'use strict';

    const CONFIG = global.CONFIG || require('./config.js');
    const U = global.Utilidades || require('./utilidades.js');
    const Analisis = global.Analisis || require('./analisis.js');

    const DIMS = Object.keys(CONFIG.DIMENSIONES);
    const APROBANDO = ['aprobado', 'asegurado', 'aprobando'];
    const RIESGO = ['riesgo', 'riesgo-alto'];
    const PERDIDO = ['perdido', 'reprobado'];

    const pct = (a, b) => (b ? (a / b) * 100 : null);
    const etiquetaDim = k => CONFIG.DIMENSIONES[k].etiqueta;
    /** "lo analítico", "lo práctico", "el pensamiento crítico" */
    const loDim = k => (k === 'critico' ? 'el pensamiento crítico' : `lo ${etiquetaDim(k).toLowerCase()}`);

    function cursoDe(datos) {
        const c = datos.competencias?.cursos?.find(x => x.id === datos.competencias.cursoActivo);
        return c ? c.nombre : '';
    }

    /**
     * @param {Array<object>} grupos Grupos con estudiantes (Estado.gruposConDatos()).
     * @param {{ analizar?: Function }} opciones `analizar(datos)` devuelve el análisis del grupo (permite usar caché).
     */
    function analizarPrograma(grupos, opciones = {}) {
        const analizar = opciones.analizar || Analisis.analizarGrupo;
        const lista = grupos.filter(d => d.estudiantes?.length).map(datos => ({ datos, g: analizar(datos) }));
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(lista[0]?.datos.escala || {}) };
        const ap = escala.aprobatoria;
        const avisos = [];
        if (lista.some(x => x.datos.escala.maxima !== escala.maxima || x.datos.escala.aprobatoria !== ap)) {
            avisos.push('Los grupos no usan la misma escala de calificación; las comparaciones globales se hacen con la escala del primer grupo.');
        }

        // ---------------------------------------------------------------- Por grupo
        const filas = lista.map(({ datos, g }) => {
            const res = g.resultados;
            const proms = res.map(r => r.promedio).filter(v => v !== null);
            const cuenta = estados => res.filter(r => estados.includes(r.estado)).length;
            const dims = {};
            DIMS.forEach(k => { dims[k] = { media: g.dimensiones[k].media, logro: g.dimensiones[k].logro, n: g.dimensiones[k].n, peso: g.dimensiones[k].pesoPlaneado }; });
            const logros = g.porCompetencia.map(c => c.logro).filter(v => v !== null);
            return {
                id: datos.id,
                nombre: datos.nombre || 'Grupo',
                asignatura: datos.curso.asignatura || '',
                grupo: datos.curso.grupo || '',
                docente: datos.curso.docente || '',
                curso: cursoDe(datos),
                estudiantes: res.length,
                conNotas: proms.length,
                pesoEvaluado: g.resumen.pesoEvaluado,
                media: U.media(proms),
                mediana: U.mediana(proms),
                desviacion: U.desviacion(proms),
                aprobando: cuenta(APROBANDO),
                riesgo: cuenta(RIESGO),
                perdidos: cuenta(PERDIDO),
                sinDatos: cuenta(['sin-datos']),
                pctAprobando: pct(cuenta(APROBANDO), res.length),
                pctRiesgo: pct(cuenta(RIESGO) + cuenta(PERDIDO), res.length),
                dims,
                competenciasEvaluadas: g.porCompetencia.length,
                logroCompetencias: U.media(logros),
                datos,
                g
            };
        });

        // ---------------------------------------------------------------- Global
        const todos = lista.flatMap(({ datos, g }) => g.resultados.map(r => ({ r, grupo: datos })));
        const proms = todos.map(x => x.r.promedio).filter(v => v !== null);
        const porEstado = {};
        Object.keys(CONFIG.ESTADOS).forEach(k => { porEstado[k] = todos.filter(x => x.r.estado === k).length; });
        const sum = estados => estados.reduce((s, k) => s + porEstado[k], 0);
        const conMedia = filas.filter(f => f.media !== null);
        const mejor = conMedia.length ? conMedia.reduce((a, b) => (b.media > a.media ? b : a)) : null;
        const peor = conMedia.length ? conMedia.reduce((a, b) => (b.media < a.media ? b : a)) : null;
        const resumen = {
            grupos: filas.length,
            estudiantes: todos.length,
            conNotas: proms.length,
            media: U.media(proms),
            mediana: U.mediana(proms),
            desviacion: U.desviacion(proms),
            aprobando: sum(APROBANDO),
            riesgo: sum(RIESGO),
            perdidos: sum(PERDIDO),
            sinDatos: porEstado['sin-datos'],
            porEstado,
            distribucion: Analisis.distribucionNiveles(lista[0]?.datos || {}, proms),
            histograma: Analisis.histograma(proms, escala),
            brecha: mejor && peor && mejor !== peor ? { valor: mejor.media - peor.media, mejor, peor } : null
        };

        // ---------------------------------------------------------------- Por carácter
        const dimensiones = {};
        DIMS.forEach(k => {
            const valores = lista.flatMap(({ g }) => g.dimensiones[k].valores);
            const participaciones = lista.map(({ g }) => {
                const total = DIMS.reduce((s, x) => s + g.dimensiones[x].pesoPlaneado, 0);
                return total > 0 ? (g.dimensiones[k].pesoPlaneado / total) * 100 : null;
            }).filter(v => v !== null);
            dimensiones[k] = {
                n: valores.length,
                media: U.media(valores),
                logro: pct(valores.filter(v => v >= ap - 1e-9).length, valores.length),
                participacion: U.media(participaciones),
                competencias: new Set(lista.flatMap(({ g }) => g.porCompetencia.filter(c => c.dimension === k).map(c => c.id))).size,
                gruposConDatos: lista.filter(({ g }) => g.dimensiones[k].n > 0).length
            };
        });

        // ---------------------------------------------------------------- Por competencia (todas las de los grupos)
        const comp = new Map();
        lista.forEach(({ datos, g }) => g.porCompetencia.forEach(c => {
            if (!comp.has(c.id)) comp.set(c.id, { id: c.id, competencia: c.competencia, dimension: c.dimension, grupos: [], n: 0, logrados: 0, suma: 0 });
            const x = comp.get(c.id);
            x.grupos.push(datos.nombre);
            x.n += c.n;
            x.logrados += c.logrados;
            x.suma += (c.media ?? 0) * c.n;
        }));
        const competencias = [...comp.values()].filter(x => x.n).map(x => ({
            id: x.id, competencia: x.competencia, curso: x.competencia.curso, dimension: x.dimension, grupos: x.grupos,
            n: x.n, media: x.suma / x.n, logro: pct(x.logrados, x.n)
        })).sort((a, b) => a.logro - b.logro || a.media - b.media);

        // ---------------------------------------------------------------- Por curso (asignatura)
        const cursos = new Map();
        filas.forEach(f => {
            const k = f.curso || f.asignatura || 'Sin curso';
            if (!cursos.has(k)) cursos.set(k, []);
            cursos.get(k).push(f);
        });
        const porCurso = [...cursos.entries()].map(([curso, fs]) => {
            const res = fs.flatMap(f => f.g.resultados);
            const pr = res.map(r => r.promedio).filter(v => v !== null);
            const dims = {};
            DIMS.forEach(k => {
                const v = fs.flatMap(f => f.g.dimensiones[k].valores);
                dims[k] = { media: U.media(v), logro: pct(v.filter(x => x >= ap - 1e-9).length, v.length) };
            });
            return {
                curso, grupos: fs.map(f => f.nombre), estudiantes: res.length, media: U.media(pr),
                pctAprobando: pct(res.filter(r => APROBANDO.includes(r.estado)).length, res.length),
                pctRiesgo: pct(res.filter(r => RIESGO.includes(r.estado) || PERDIDO.includes(r.estado)).length, res.length),
                dims
            };
        }).sort((a, b) => (a.media ?? 9) - (b.media ?? 9));

        // ---------------------------------------------------------------- Evaluaciones con menor aprobación
        const evaluacionesCriticas = lista.flatMap(({ datos, g }) => g.porEvaluacion
            .filter(p => p.incluida && p.calificada && p.n)
            .map(p => ({ grupo: datos.nombre, evaluacion: p.nombre, clave: p.clave, n: p.n, media: p.media, aprobacion: (p.aprobados / p.n) * 100, sinPresentar: p.sinPresentar })))
            .sort((a, b) => a.aprobacion - b.aprobacion || a.media - b.media);

        // ---------------------------------------------------------------- Estudiantes en riesgo
        const riesgo = todos.filter(x => [...RIESGO, ...PERDIDO, 'sin-datos'].includes(x.r.estado))
            .sort((a, b) => CONFIG.ESTADOS[b.r.estado].orden - CONFIG.ESTADOS[a.r.estado].orden || (b.r.necesaria ?? 0) - (a.r.necesaria ?? 0))
            .map(x => ({ grupoId: x.grupo.id, grupo: x.grupo.nombre, r: x.r }));

        const modelo = { escala, avisos, grupos: filas, resumen, dimensiones, competencias, porCurso, evaluacionesCriticas, riesgo };
        modelo.hallazgos = hallazgos(modelo);
        modelo.recomendaciones = recomendaciones(modelo);
        return modelo;
    }

    // ---------------------------------------------------------------- Lectura de resultados

    function hallazgos(m) {
        const f = v => U.formatoNota(v, 2);
        const p = v => `${U.redondear(v ?? 0, 0)}%`;
        const s = m.resumen;
        const lista = [];
        if (!s.estudiantes) return lista;
        lista.push(`El programa reúne ${s.estudiantes} estudiantes en ${s.grupos} grupo${s.grupos === 1 ? '' : 's'}, con promedio actual de ${f(s.media)} (mediana ${f(s.mediana)}). ` +
            `Van aprobando ${s.aprobando} (${p(pct(s.aprobando, s.estudiantes))}), están en riesgo ${s.riesgo} (${p(pct(s.riesgo, s.estudiantes))}) y ${s.perdidos} ya no alcanzan la nota aprobatoria (${p(pct(s.perdidos, s.estudiantes))}).`);

        const conDatos = DIMS.filter(k => m.dimensiones[k].n);
        if (conDatos.length) {
            const orden = [...conDatos].sort((a, b) => m.dimensiones[a].media - m.dimensiones[b].media);
            const baja = orden[0];
            const alta = orden[orden.length - 1];
            if (orden.length > 1) {
                lista.push(`Por carácter de las competencias, el desempeño más bajo está en ${loDim(baja)} (media ${f(m.dimensiones[baja].media)}, ${p(m.dimensiones[baja].logro)} de estudiantes con logro) y el más alto en ${loDim(alta)} (media ${f(m.dimensiones[alta].media)}, ${p(m.dimensiones[alta].logro)} con logro).`);
            } else {
                lista.push(`Solo hay evaluaciones de carácter ${etiquetaDim(baja).toLowerCase()}: media ${f(m.dimensiones[baja].media)} y ${p(m.dimensiones[baja].logro)} de estudiantes con logro.`);
            }
            const participacion = DIMS.map(k => `${etiquetaDim(k).toLowerCase()} ${p(m.dimensiones[k].participacion)}`).join(', ');
            lista.push(`Del peso de las evaluaciones, en promedio por grupo corresponde a: ${participacion}.`);
            DIMS.filter(k => !m.dimensiones[k].n).forEach(k => lista.push(`No hay evaluaciones calificadas que midan ${loDim(k)}; no es posible valorar esa dimensión.`));
        } else {
            lista.push('No se puede analizar el carácter (analítico, práctico, crítico) porque las evaluaciones no tienen competencias asociadas ni carácter definido.');
        }

        if (s.brecha) {
            const b = s.brecha;
            lista.push(`El grupo con mejor promedio es ${b.mejor.nombre} (${f(b.mejor.media)}) y el más bajo ${b.peor.nombre} (${f(b.peor.media)}): una diferencia de ${f(b.valor)}${b.valor >= 0.5 ? ', que es significativa' : ''}.`);
        }
        const bajos = m.grupos.filter(g => g.media !== null && g.media < m.escala.aprobatoria - 1e-9);
        if (bajos.length) lista.push(`${bajos.length === 1 ? 'Un grupo tiene' : `${bajos.length} grupos tienen`} promedio por debajo de la aprobatoria: ${bajos.map(g => `${g.nombre} (${f(g.media)})`).join(', ')}.`);
        m.grupos.filter(g => DIMS.some(k => g.dims[k].n)).forEach(g => {
            const debil = DIMS.filter(k => g.dims[k].n).sort((a, b) => g.dims[a].media - g.dims[b].media)[0];
            if (debil && m.grupos.length > 1 && g.dims[debil].logro !== null && g.dims[debil].logro < 50) {
                lista.push(`En ${g.nombre}, ${loDim(debil)} es la dimensión más débil: solo el ${p(g.dims[debil].logro)} alcanza la aprobatoria.`);
            }
        });
        const criticas = m.competencias.filter(c => c.logro < 50).slice(0, 3);
        if (criticas.length) lista.push(`Competencias con menor logro en el programa: ${criticas.map(c => `«${c.competencia.texto.replace(/\.$/, '')}» (${p(c.logro)})`).join('; ')}.`);
        const ev = m.evaluacionesCriticas[0];
        if (ev) lista.push(`La evaluación con menor aprobación es ${ev.evaluacion} de ${ev.grupo}: aprobó el ${p(ev.aprobacion)} (media ${f(ev.media)}).`);
        if (s.sinDatos) lista.push(`${s.sinDatos} estudiante${s.sinDatos === 1 ? ' no tiene' : 's no tienen'} ninguna nota registrada: conviene verificar si siguen asistiendo (posible deserción).`);
        return lista;
    }

    function recomendaciones(m) {
        const salida = [];
        const s = m.resumen;
        if (!s.estudiantes) return salida;
        const p = v => `${U.redondear(v ?? 0, 0)}%`;
        const conDatos = DIMS.filter(k => m.dimensiones[k].n);
        const debiles = conDatos.filter(k => m.dimensiones[k].logro < 60).sort((a, b) => m.dimensiones[a].logro - m.dimensiones[b].logro);
        const foco = debiles.length ? debiles : conDatos.sort((a, b) => m.dimensiones[a].media - m.dimensiones[b].media).slice(0, 1);
        foco.forEach(k => salida.push({
            titulo: `Fortalecer ${loDim(k)} (${p(m.dimensiones[k].logro)} de logro)`,
            items: CONFIG.DIMENSIONES[k].recomendaciones
        }));
        const critico = m.dimensiones.critico;
        if (!critico.n || (critico.participacion ?? 0) < 15) {
            salida.push({
                titulo: 'Evaluar más el pensamiento crítico',
                items: [
                    `Hoy representa en promedio el ${p(critico.participacion)} del peso de las evaluaciones.`,
                    'Incluir problemas abiertos, estudios de caso, proyectos o preguntas de justificación en parciales y quices.',
                    'Asociar a esas evaluaciones competencias de modelación, validación y argumentación, y marcar su carácter en la pestaña 2.'
                ]
            });
        }
        if (s.riesgo + s.perdidos) {
            salida.push({
                titulo: `Acompañamiento a ${s.riesgo + s.perdidos} estudiantes en riesgo o perdiendo`,
                items: [
                    'Priorizar a quienes necesitan más de 4.0 en lo que falta: tutorías, asesorías y seguimiento semanal.',
                    'Enviar a cada uno su informe individual con las competencias a reforzar y los recursos recomendados.',
                    s.perdidos ? `Definir con coordinación las opciones de recuperación para los ${s.perdidos} que ya no alcanzan la aprobatoria.` : 'Revisar el avance en la siguiente evaluación.'
                ]
            });
        }
        if (s.brecha && s.brecha.valor >= 0.5) {
            salida.push({
                titulo: 'Reducir la brecha entre grupos',
                items: [
                    `Compartir estrategias didácticas entre los docentes de ${s.brecha.mejor.nombre} y ${s.brecha.peor.nombre}.`,
                    'Unificar criterios y rúbricas de evaluación de las competencias comunes.'
                ]
            });
        }
        const criticas = m.competencias.filter(c => c.logro < 60).slice(0, 5);
        if (criticas.length) {
            salida.push({
                titulo: 'Competencias a reforzar en todo el programa',
                items: criticas.map(c => `${c.competencia.texto.replace(/\.$/, '')} (${etiquetaDim(c.dimension).toLowerCase()}, ${p(c.logro)} de logro)`)
            });
        }
        return salida;
    }

    const Programa = { analizarPrograma, hallazgos, recomendaciones, loDim };
    global.Programa = Programa;
    if (typeof module !== 'undefined' && module.exports) module.exports = Programa;
})(typeof window !== 'undefined' ? window : globalThis);
