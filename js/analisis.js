/**
 * Motor de análisis académico: nota acumulada, promedio, proyección, estado de riesgo,
 * competencias a reforzar, estadísticas del grupo y filtros por criterios.
 *
 * Todas las funciones son puras: reciben los datos de la aplicación y no tocan el DOM.
 *
 * Conceptos:
 *  - peso: porcentaje de la nota final que vale una evaluación (la suma debería ser 100).
 *  - evaluación calificada: alguien del grupo ya tiene nota en ella; si nadie la tiene está "pendiente".
 *  - acumulado: Σ nota × peso / 100 de las evaluaciones calificadas (lo ganado hasta hoy, sobre la nota final).
 *  - promedio actual: acumulado ÷ porcentaje evaluado (la nota que lleva en la escala 0–5).
 *  - nota necesaria: la nota promedio que debe sacar en lo que falta para alcanzar la aprobatoria.
 */
(function (global) {
    'use strict';

    const CONFIG = global.CONFIG || require('./config.js');
    const U = global.Utilidades || require('./utilidades.js');

    // ---------------------------------------------------------------- Pesos

    /** Reparte `total` entre n partes con 2 decimales, sin perder centésimas por redondeo. */
    function repartir(total, n) {
        if (n <= 0) return [];
        const base = Math.floor((total / n) * 100) / 100;
        const partes = Array(n).fill(base);
        let resto = Math.round((total - base * n) * 100);
        for (let i = 0; resto > 0; i = (i + 1) % n, resto--) partes[i] = U.redondear(partes[i] + 0.01, 2);
        return partes;
    }

    /**
     * Pesos sugeridos para las evaluaciones incluidas.
     * @param {Array} evaluaciones
     * @param {string} preset 'iguales' | '80-20' | '70-30' | '60-40'
     * @returns {Object<string, number>} clave -> peso
     */
    function pesosSugeridos(evaluaciones, preset = 'auto') {
        const incluidas = evaluaciones.filter(e => e.incluida !== false);
        const pesos = {};
        if (!incluidas.length) return pesos;
        const parciales = incluidas.filter(e => e.tipo === 'parcial' || e.tipo === 'final');
        const quices = incluidas.filter(e => e.tipo === 'quiz');
        const otras = incluidas.filter(e => !parciales.includes(e) && !quices.includes(e));
        let def = CONFIG.PRESETS_PESOS.find(p => p.id === preset);
        if (preset === 'auto') def = parciales.length && quices.length ? CONFIG.PRESETS_PESOS.find(p => p.id === '80-20') : null;
        if (!def || !def.parciales || !parciales.length || !(quices.length || otras.length)) {
            repartir(100, incluidas.length).forEach((p, i) => { pesos[incluidas[i].clave] = p; });
            return pesos;
        }
        // Con otras evaluaciones (talleres, seguimientos) el porcentaje de los quices se comparte con ellas.
        const grupoB = [...quices, ...otras];
        repartir(def.parciales, parciales.length).forEach((p, i) => { pesos[parciales[i].clave] = p; });
        repartir(100 - def.parciales, grupoB.length).forEach((p, i) => { pesos[grupoB[i].clave] = p; });
        return pesos;
    }

    function evaluacionesActivas(datos) {
        return (datos.evaluaciones || []).filter(e => e.incluida !== false && Number(e.peso) > 0);
    }

    /** ¿Alguien del grupo tiene nota en la evaluación? */
    function estaCalificada(datos, ev) {
        return (datos.estudiantes || []).some(e => e.notas[ev.clave] !== null && e.notas[ev.clave] !== undefined);
    }

    function nivelDe(datos, nota) {
        if (nota === null || nota === undefined) return null;
        const niveles = [...(datos.niveles || CONFIG.NIVELES_POR_DEFECTO)].sort((a, b) => b.desde - a.desde);
        return niveles.find(n => nota >= n.desde - 1e-9) || niveles[niveles.length - 1];
    }


    // ---------------------------------------------------------------- Carácter de las competencias

    const DIMS = Object.keys(CONFIG.DIMENSIONES);

    /**
     * Clasifica una competencia como analítica, práctica o de pensamiento crítico según sus verbos y palabras clave.
     * @returns {{ dimension: string, puntajes: Object<string, number> }}
     */
    function clasificarDimension(texto, criterio = '') {
        const t = ` ${U.normalizarTexto(texto)} `;
        const c = ` ${U.normalizarTexto(criterio)} `;
        const puntajes = Object.fromEntries(DIMS.map(k => [k, 0]));
        // Verbos iniciales: "Comprender y aplicar ..." aporta a las dos dimensiones.
        const palabras = t.trim().split(/\s+/);
        const iniciales = [palabras[0]];
        if (/^(y|e|o)$/.test(palabras[1] || '') && palabras[2]) iniciales.push(palabras[2]);
        let primera = null;
        iniciales.forEach((v, i) => DIMS.forEach(k => {
            if (CONFIG.DIMENSIONES[k].verbos.some(x => v === x || v === `${x}se` || (x.length > 5 && v.startsWith(x.slice(0, -1))))) {
                puntajes[k] += i === 0 ? 3 : 2;
                if (i === 0) primera = k;
            }
        }));
        DIMS.forEach(k => CONFIG.DIMENSIONES[k].claves.forEach(clave => {
            if (t.includes(clave)) puntajes[k] += 1;
            if (c.includes(clave)) puntajes[k] += 1;
        }));
        if (/problema/.test(t) && CONFIG.PROBLEMA_EN_CONTEXTO.some(x => t.includes(x))) puntajes.critico += 3;
        // En matemáticas "evaluar una integral / un límite" significa calcularlo.
        if (/^ evaluar (integral|limite|derivada|expresion|funcion|polinomio|serie|determinante)/.test(t.replace(/ (las?|los?|el|una?) /, ' '))) { puntajes.critico -= 3; puntajes.practico += 3; primera = 'practico'; }
        const max = Math.max(...Object.values(puntajes));
        let dimension = max > 0 ? DIMS.filter(k => puntajes[k] === max) : [];
        dimension = dimension.length === 1 ? dimension[0] : (dimension.includes(primera) ? primera : dimension[0] || 'practico');
        return { dimension, puntajes };
    }

    /** Carácter efectivo de una competencia: el corregido por el docente o el automático. */
    function dimensionDe(comp) {
        if (!comp) return null;
        if (CONFIG.DIMENSIONES[comp.dimensionManual]) return comp.dimensionManual;
        if (CONFIG.DIMENSIONES[comp.dimension]) return comp.dimension;
        return clasificarDimension(comp.texto, comp.criterio).dimension;
    }

    /**
     * Perfil de una evaluación: qué proporción de lo que evalúa es analítico, práctico o crítico.
     * Se toma del carácter fijado por el docente o, si no, de sus competencias asociadas;
     * sin competencias, de su tipo (talleres -> práctico, proyectos -> crítico).
     * @returns {Object<string, number>|null} Proporciones que suman 1, o null si no se puede saber.
     */
    function perfilEvaluacion(ev, indice) {
        if (CONFIG.DIMENSIONES[ev.caracter]) return { [ev.caracter]: 1 };
        const comps = (ev.competencias || []).map(id => indice.get(id)).filter(Boolean);
        if (comps.length) {
            const p = {};
            comps.forEach(c => { const k = dimensionDe(c); p[k] = (p[k] || 0) + 1 / comps.length; });
            return p;
        }
        const porTipo = CONFIG.CARACTER_POR_TIPO[ev.tipo];
        return porTipo ? { [porTipo]: 1 } : null;
    }

    function perfilesEvaluaciones(datos, indice = indiceCompetencias(datos)) {
        const perfiles = {};
        (datos.evaluaciones || []).forEach(ev => { perfiles[ev.clave] = perfilEvaluacion(ev, indice); });
        return perfiles;
    }

    /** Nota de un estudiante en cada carácter: promedio ponderado (por peso y proporción) de sus evaluaciones calificadas. */
    function notasPorDimension(detalle, perfiles) {
        const num = {};
        const den = {};
        detalle.forEach(d => {
            const p = perfiles[d.clave];
            if (!p || d.usada === null || d.usada === undefined) return;
            Object.entries(p).forEach(([k, w]) => {
                num[k] = (num[k] || 0) + d.usada * d.peso * w;
                den[k] = (den[k] || 0) + d.peso * w;
            });
        });
        const salida = {};
        DIMS.forEach(k => { salida[k] = den[k] > 1e-9 ? U.redondear(num[k] / den[k], 4) : null; });
        return salida;
    }

    // ---------------------------------------------------------------- Estudiante

    /**
     * Calcula la situación académica de un estudiante.
     * @param {object} datos Estado de la aplicación.
     * @param {object} est Estudiante.
     * @param {Set<string>} [calificadas] Claves de evaluaciones con nota en el grupo (se calcula si no se pasa).
     * @param {object} [perfiles] Perfil de carácter de cada evaluación (se calcula si no se pasa).
     */
    function calcularEstudiante(datos, est, calificadas, perfiles) {
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(datos.escala || {}) };
        const vaciasComoCero = datos.opciones?.vaciasComoCero !== false;
        const activas = evaluacionesActivas(datos);
        calificadas ||= new Set(activas.filter(ev => estaCalificada(datos, ev)).map(ev => ev.clave));
        perfiles ||= perfilesEvaluaciones(datos);

        const detalle = [];
        let acumulado = 0;
        let pesoEvaluado = 0;
        let pesoTotal = 0;
        const perdidas = [];
        const faltantes = [];
        const aprobadas = [];

        activas.forEach(ev => {
            const peso = Number(ev.peso) || 0;
            pesoTotal += peso;
            const nota = est.notas[ev.clave];
            const marca = est.marcas?.[ev.clave] || null;
            let estado;
            let notaUsada = null;
            if (!calificadas.has(ev.clave)) {
                estado = 'pendiente';
            } else if (nota === null || nota === undefined) {
                estado = 'faltante';
                faltantes.push(ev.clave);
                if (vaciasComoCero) { notaUsada = 0; pesoEvaluado += peso; }
            } else {
                notaUsada = nota;
                pesoEvaluado += peso;
                if (nota < escala.aprobatoria - 1e-9) { estado = 'perdida'; perdidas.push(ev.clave); } else { estado = 'aprobada'; aprobadas.push(ev.clave); }
            }
            const aporte = notaUsada === null ? null : (notaUsada * peso) / 100;
            if (aporte !== null) acumulado += aporte;
            detalle.push({ clave: ev.clave, nombre: ev.nombre, tipo: ev.tipo, fecha: ev.fecha || '', peso, nota: nota ?? null, usada: notaUsada, marca, estado, aporte });
        });

        const tieneNotas = detalle.some(d => d.nota !== null);
        const pesoRestante = Math.max(0, pesoTotal - pesoEvaluado);
        // Sin ninguna nota registrada no hay promedio que mostrar (no es lo mismo que un 0.0).
        const promedio = pesoEvaluado > 0 && tieneNotas ? acumulado / (pesoEvaluado / 100) : null;
        const meta = (escala.aprobatoria * pesoTotal) / 100;
        const necesaria = pesoRestante > 1e-9 && tieneNotas ? Math.max(0, (meta - acumulado) / (pesoRestante / 100)) : null;
        const maximoPosible = acumulado + (escala.maxima * pesoRestante) / 100;
        const proyeccion = promedio !== null ? (promedio * pesoTotal) / 100 : null;

        let estado;
        if (!tieneNotas) estado = 'sin-datos';
        else if (pesoRestante <= 1e-9) estado = acumulado >= meta - 1e-9 ? 'aprobado' : 'reprobado';
        else if (acumulado >= meta - 1e-9) estado = 'asegurado';
        else if (maximoPosible < meta - 1e-9) estado = 'perdido';
        else if (promedio >= escala.aprobatoria - 1e-9) estado = 'aprobando';
        else estado = necesaria > (datos.opciones?.umbralRiesgoAlto ?? CONFIG.UMBRAL_RIESGO_ALTO) ? 'riesgo-alto' : 'riesgo';

        // Tendencia: compara el último parcial con el promedio de los anteriores (si hay menos de dos
        // parciales se usan todas las notas en el orden de la planilla).
        const conNota = detalle.filter(d => d.nota !== null);
        const parciales = conNota.filter(d => d.tipo === 'parcial');
        const serie = (parciales.length >= 2 ? parciales : conNota).map(d => d.nota);
        let tendencia = null;
        if (serie.length >= 2) {
            const dif = serie[serie.length - 1] - U.media(serie.slice(0, -1));
            tendencia = dif > 0.3 ? 'mejora' : dif < -0.3 ? 'baja' : 'estable';
        }

        return {
            id: est.id,
            nombre: est.nombre,
            estudiante: est,
            detalle,
            acumulado: U.redondear(acumulado, 4),
            pesoEvaluado: U.redondear(pesoEvaluado, 2),
            pesoTotal: U.redondear(pesoTotal, 2),
            pesoRestante: U.redondear(pesoRestante, 2),
            promedio: promedio === null ? null : U.redondear(promedio, 4),
            necesaria: necesaria === null ? null : U.redondear(necesaria, 4),
            maximoPosible: U.redondear(maximoPosible, 4),
            proyeccion: proyeccion === null ? null : U.redondear(proyeccion, 4),
            nivel: nivelDe(datos, promedio),
            estado,
            perdidas,
            faltantes,
            aprobadas,
            tendencia,
            dimensiones: notasPorDimension(detalle, perfiles)
        };
    }

    // ---------------------------------------------------------------- Competencias

    function indiceCompetencias(datos) {
        const mapa = new Map();
        (datos.competencias?.cursos || []).forEach(curso => curso.competencias.forEach(c => mapa.set(c.id, { ...c, curso: curso.nombre })));
        return mapa;
    }

    /**
     * Competencias a reforzar: las asociadas a evaluaciones perdidas o no presentadas.
     * @returns {Array<{ competencia, evaluaciones: string[] }>}
     */
    function competenciasAReforzar(datos, resultado, indice = indiceCompetencias(datos)) {
        const porId = new Map();
        const claves = [...resultado.perdidas, ...resultado.faltantes];
        claves.forEach(clave => {
            const ev = datos.evaluaciones.find(e => e.clave === clave);
            (ev?.competencias || []).forEach(id => {
                const comp = indice.get(id);
                if (!comp) return;
                if (!porId.has(id)) porId.set(id, { competencia: comp, evaluaciones: [] });
                porId.get(id).evaluaciones.push(ev.nombre);
            });
        });
        return [...porId.values()].sort((a, b) => a.competencia.curso.localeCompare(b.competencia.curso) || a.competencia.numero - b.competencia.numero);
    }

    /**
     * Recursos recomendados para un estudiante: los de las evaluaciones perdidas o no presentadas,
     * los propios de cada competencia y los que traiga la planilla para ese estudiante.
     * @returns {Object<string, Array<{ titulo, url }>>}
     */
    function recursosRecomendados(datos, resultado, reforzar) {
        const salida = {};
        const vistos = {};
        const agregar = (tipo, linea) => {
            const r = typeof linea === 'string' ? U.interpretarRecurso(linea) : linea;
            if (!r) return;
            const k = U.normalizarTexto(r.url || r.titulo);
            (vistos[tipo] ||= new Set());
            if (vistos[tipo].has(k)) return;
            vistos[tipo].add(k);
            (salida[tipo] ||= []).push(r);
        };
        [...resultado.perdidas, ...resultado.faltantes].forEach(clave => {
            const ev = datos.evaluaciones.find(e => e.clave === clave);
            Object.keys(CONFIG.TIPOS_RECURSO).forEach(tipo => U.lineas(ev?.recursos?.[tipo]).forEach(l => agregar(tipo, l)));
        });
        (reforzar || []).forEach(({ competencia }) => {
            Object.entries(competencia.recursos || {}).forEach(([tipo, lista]) => lista.forEach(l => agregar(tipo, l)));
        });
        // Recomendaciones escritas en la propia planilla de notas (columnas de texto por estudiante)
        (datos.columnasTexto || []).forEach(col => {
            if (!CONFIG.TIPOS_RECURSO[col.rol]) return;
            const v = resultado.estudiante.extras?.[col.clave];
            if (v) U.lineas(v).forEach(l => agregar(col.rol, l));
        });
        return salida;
    }

    /** Recomendaciones automáticas en lenguaje natural según la situación del estudiante. */
    function recomendaciones(datos, r) {
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(datos.escala || {}) };
        const f = v => U.formatoNota(v, 1);
        const nombresEv = claves => claves.map(c => datos.evaluaciones.find(e => e.clave === c)?.nombre || c).join(', ');
        const lista = [];
        switch (r.estado) {
            case 'aprobado': lista.push(`Aprobó la asignatura con una nota final de ${f(r.acumulado)}. ¡Felicitaciones!`); break;
            case 'reprobado': lista.push(`La nota final (${f(r.acumulado)}) no alcanzó la mínima aprobatoria de ${f(escala.aprobatoria)}.`); break;
            case 'asegurado': lista.push(`Ya acumuló ${f(r.acumulado)}, suficiente para aprobar. Mantenga su compromiso para mejorar su nota final.`); break;
            case 'aprobando': lista.push(`Su promedio actual es ${f(r.promedio)}. Para aprobar necesita en promedio ${f(r.necesaria)} en el ${U.redondear(r.pesoRestante, 0)}% que falta por evaluar.`); break;
            case 'riesgo':
            case 'riesgo-alto': lista.push(`Su promedio actual (${f(r.promedio)}) está por debajo de ${f(escala.aprobatoria)}. Necesita en promedio ${f(r.necesaria)} en el ${U.redondear(r.pesoRestante, 0)}% restante para aprobar.`); break;
            case 'perdido': lista.push(`Aun sacando ${f(escala.maxima)} en lo que falta, la nota máxima posible sería ${f(r.maximoPosible)}, inferior a ${f(escala.aprobatoria)}. Converse con su docente sobre las opciones de recuperación.`); break;
            default: lista.push('No registra calificaciones en el periodo. Comuníquese con su docente para revisar su situación académica.');
        }
        if (r.faltantes.length) lista.push(`Tiene evaluaciones sin presentar (${nombresEv(r.faltantes)}). Consulte con el docente si es posible presentarlas o justificar la ausencia.`);
        if (r.perdidas.length) lista.push(`Repase los temas de ${nombresEv(r.perdidas)} usando los recursos recomendados y asista a las asesorías.`);
        if (r.tendencia === 'baja') lista.push('Sus últimas notas muestran una tendencia a la baja: revise sus hábitos de estudio y busque apoyo a tiempo.');
        if (r.tendencia === 'mejora') lista.push('Sus últimas notas muestran una mejora: continúe con el esfuerzo.');
        if (['riesgo-alto', 'perdido'].includes(r.estado)) lista.push('Se recomienda acompañamiento académico (tutorías o asesorías) y seguimiento semanal.');
        return lista;
    }

    // ---------------------------------------------------------------- Grupo

    function estadisticas(valores, aprobatoria) {
        return {
            n: valores.length,
            media: U.media(valores),
            mediana: U.mediana(valores),
            desviacion: U.desviacion(valores),
            minimo: valores.length ? Math.min(...valores) : null,
            maximo: valores.length ? Math.max(...valores) : null,
            aprobados: valores.filter(v => v >= aprobatoria - 1e-9).length,
            reprobados: valores.filter(v => v < aprobatoria - 1e-9).length
        };
    }

    /**
     * Analiza el grupo completo.
     * @returns {{ resultados, porEvaluacion, resumen, competenciasCriticas, avisos }}
     */
    function analizarGrupo(datos) {
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(datos.escala || {}) };
        const activas = evaluacionesActivas(datos);
        const calificadas = new Set(activas.filter(ev => estaCalificada(datos, ev)).map(ev => ev.clave));
        const indice = indiceCompetencias(datos);
        const perfiles = perfilesEvaluaciones(datos, indice);
        const resultados = (datos.estudiantes || []).map(est => calcularEstudiante(datos, est, calificadas, perfiles));

        const porEvaluacion = (datos.evaluaciones || []).map(ev => {
            const valores = (datos.estudiantes || []).map(e => e.notas[ev.clave]).filter(v => v !== null && v !== undefined);
            const est = estadisticas(valores, escala.aprobatoria);
            return {
                clave: ev.clave, nombre: ev.nombre, tipo: ev.tipo, peso: Number(ev.peso) || 0, incluida: ev.incluida !== false,
                calificada: valores.length > 0,
                sinPresentar: valores.length ? (datos.estudiantes.length - valores.length) : 0,
                ...est,
                distribucion: distribucionNiveles(datos, valores)
            };
        });

        const conPromedio = resultados.filter(r => r.promedio !== null);
        const promedios = conPromedio.map(r => r.promedio);
        const porEstado = {};
        Object.keys(CONFIG.ESTADOS).forEach(k => { porEstado[k] = 0; });
        resultados.forEach(r => { porEstado[r.estado]++; });

        const pesoTotal = activas.reduce((s, e) => s + (Number(e.peso) || 0), 0);
        const pesoEvaluado = activas.filter(e => calificadas.has(e.clave)).reduce((s, e) => s + (Number(e.peso) || 0), 0);

        // Competencias críticas: por cada competencia asociada, cuántos estudiantes perdieron o no presentaron sus evaluaciones.
        const comp = new Map();
        activas.filter(ev => calificadas.has(ev.clave)).forEach(ev => {
            const st = porEvaluacion.find(p => p.clave === ev.clave);
            (ev.competencias || []).forEach(id => {
                const c = indice.get(id);
                if (!c) return;
                if (!comp.has(id)) comp.set(id, { competencia: c, evaluaciones: [], afectados: new Set(), medias: [] });
                const item = comp.get(id);
                item.evaluaciones.push(ev.nombre);
                if (st.media !== null) item.medias.push(st.media);
                resultados.forEach(r => { if (r.perdidas.includes(ev.clave) || r.faltantes.includes(ev.clave)) item.afectados.add(r.id); });
            });
        });
        const total = resultados.length || 1;
        const competenciasCriticas = [...comp.values()].map(c => ({
            competencia: c.competencia,
            evaluaciones: c.evaluaciones,
            afectados: c.afectados.size,
            porcentaje: (c.afectados.size / total) * 100,
            media: U.media(c.medias)
        })).sort((a, b) => b.porcentaje - a.porcentaje || (a.media ?? 9) - (b.media ?? 9));

        // Logro por competencia: nota de cada estudiante en las evaluaciones calificadas que la evalúan.
        const porComp = new Map();
        activas.filter(ev => calificadas.has(ev.clave)).forEach(ev => (ev.competencias || []).forEach(id => {
            if (!indice.has(id)) return;
            if (!porComp.has(id)) porComp.set(id, []);
            porComp.get(id).push(ev);
        }));
        const porCompetencia = [...porComp.entries()].map(([id, evs]) => {
            const notas = resultados.map(r => {
                let num = 0;
                let den = 0;
                evs.forEach(ev => {
                    const d = r.detalle.find(x => x.clave === ev.clave);
                    if (d && d.usada !== null) { num += d.usada * d.peso; den += d.peso; }
                });
                return den > 0 ? num / den : null;
            }).filter(v => v !== null);
            const c = indice.get(id);
            return {
                id, competencia: c, dimension: dimensionDe(c), evaluaciones: evs.map(ev => ev.nombre),
                n: notas.length, media: U.media(notas),
                logrados: notas.filter(v => v >= escala.aprobatoria - 1e-9).length,
                logro: notas.length ? (notas.filter(v => v >= escala.aprobatoria - 1e-9).length / notas.length) * 100 : null
            };
        }).sort((a, b) => (a.logro ?? 101) - (b.logro ?? 101) || (a.media ?? 9) - (b.media ?? 9));

        // Resumen por carácter (analítico, práctico, crítico)
        const dimensiones = {};
        DIMS.forEach(k => {
            const valores = resultados.map(r => r.dimensiones[k]).filter(v => v !== null);
            const pesoPlaneado = activas.reduce((s, ev) => s + (Number(ev.peso) || 0) * (perfiles[ev.clave]?.[k] || 0), 0);
            const pesoEvaluadoK = activas.filter(ev => calificadas.has(ev.clave)).reduce((s, ev) => s + (Number(ev.peso) || 0) * (perfiles[ev.clave]?.[k] || 0), 0);
            dimensiones[k] = {
                n: valores.length,
                media: U.media(valores),
                logrados: valores.filter(v => v >= escala.aprobatoria - 1e-9).length,
                logro: valores.length ? (valores.filter(v => v >= escala.aprobatoria - 1e-9).length / valores.length) * 100 : null,
                pesoPlaneado: U.redondear(pesoPlaneado, 2),
                pesoEvaluado: U.redondear(pesoEvaluadoK, 2),
                competencias: porCompetencia.filter(c => c.dimension === k).length,
                valores
            };
        });

        const avisos = [];
        const sinPerfil = activas.filter(ev => !perfiles[ev.clave]);
        if (sinPerfil.length && sinPerfil.length < activas.length) avisos.push(`Sin carácter definido (analítico, práctico o crítico): ${sinPerfil.map(e => e.nombre).join(', ')}. Asócieles competencias o fije su carácter en la pestaña 2.`);
        if (Math.abs(pesoTotal - 100) > 0.01) avisos.push(`Los porcentajes de las evaluaciones suman ${U.redondear(pesoTotal, 2)}% (deberían sumar 100%).`);
        const sinComp = activas.filter(ev => !(ev.competencias || []).length);
        if (indice.size && sinComp.length) avisos.push(`Evaluaciones sin competencias asociadas: ${sinComp.map(e => e.nombre).join(', ')}.`);

        return {
            resultados,
            porEvaluacion,
            competenciasCriticas,
            porCompetencia,
            dimensiones,
            perfiles,
            avisos,
            resumen: {
                estudiantes: resultados.length,
                conNotas: conPromedio.length,
                pesoTotal: U.redondear(pesoTotal, 2),
                pesoEvaluado: U.redondear(pesoEvaluado, 2),
                promedios: estadisticas(promedios, escala.aprobatoria),
                distribucion: distribucionNiveles(datos, promedios),
                porEstado,
                enRiesgo: resultados.filter(r => ['riesgo', 'riesgo-alto', 'perdido', 'reprobado'].includes(r.estado)).length,
                histograma: histograma(promedios, escala)
            }
        };
    }

    function distribucionNiveles(datos, valores) {
        const niveles = datos.niveles || CONFIG.NIVELES_POR_DEFECTO;
        const d = {};
        niveles.forEach(n => { d[n.nombre] = 0; });
        valores.forEach(v => { const n = nivelDe(datos, v); if (n) d[n.nombre]++; });
        return d;
    }

    /** Histograma de notas en intervalos de 0.5 (0–0.5, 0.5–1, ..., 4.5–5). */
    function histograma(valores, escala, ancho = 0.5) {
        const barras = [];
        for (let x = escala.minima; x < escala.maxima - 1e-9; x += ancho) barras.push({ desde: U.redondear(x, 2), hasta: U.redondear(Math.min(x + ancho, escala.maxima), 2), n: 0 });
        valores.forEach(v => {
            let i = Math.floor((v - escala.minima) / ancho);
            if (i >= barras.length) i = barras.length - 1;
            if (i < 0) i = 0;
            barras[i].n++;
        });
        return barras;
    }

    // ---------------------------------------------------------------- Filtros

    const CAMPOS_FILTRO = {
        promedio: { etiqueta: 'Promedio actual', tipo: 'numero' },
        acumulado: { etiqueta: 'Nota acumulada', tipo: 'numero' },
        proyeccion: { etiqueta: 'Proyección final', tipo: 'numero' },
        necesaria: { etiqueta: 'Nota necesaria para aprobar', tipo: 'numero' },
        perdidas: { etiqueta: 'N.º de evaluaciones perdidas', tipo: 'numero' },
        faltantes: { etiqueta: 'N.º de evaluaciones sin presentar', tipo: 'numero' },
        estado: { etiqueta: 'Estado académico', tipo: 'opcion' },
        nivel: { etiqueta: 'Nivel de desempeño', tipo: 'opcion' },
        ...Object.fromEntries(Object.entries(CONFIG.DIMENSIONES).map(([k, d]) => [`dim:${k}`, { etiqueta: `Nota en lo ${d.etiqueta === 'Pensamiento crítico' ? 'de pensamiento crítico' : d.etiqueta.toLowerCase()}`, tipo: 'numero' }]))
    };

    const COMPARADORES = {
        lt: { etiqueta: 'menor que', simbolo: '<', f: (a, b) => a < b - 1e-9 },
        lte: { etiqueta: 'menor o igual que', simbolo: '≤', f: (a, b) => a <= b + 1e-9 },
        gt: { etiqueta: 'mayor que', simbolo: '>', f: (a, b) => a > b + 1e-9 },
        gte: { etiqueta: 'mayor o igual que', simbolo: '≥', f: (a, b) => a >= b - 1e-9 },
        eq: { etiqueta: 'igual a', simbolo: '=', f: (a, b) => typeof a === 'number' ? Math.abs(a - b) < 0.005 : a === b },
        neq: { etiqueta: 'diferente de', simbolo: '≠', f: (a, b) => typeof a === 'number' ? Math.abs(a - b) >= 0.005 : a !== b },
        vacia: { etiqueta: 'está vacía (sin nota)', simbolo: 'vacía', sinValor: true },
        novacia: { etiqueta: 'tiene nota', simbolo: 'con nota', sinValor: true }
    };

    function valorCampo(r, campo) {
        if (campo.startsWith('ev:')) return r.estudiante.notas[campo.slice(3)] ?? null;
        if (campo.startsWith('dim:')) return r.dimensiones?.[campo.slice(4)] ?? null;
        switch (campo) {
            case 'perdidas': return r.perdidas.length;
            case 'faltantes': return r.faltantes.length;
            case 'nivel': return r.nivel?.nombre ?? null;
            default: return r[campo] ?? null;
        }
    }

    function cumple(r, criterio) {
        const v = valorCampo(r, criterio.campo);
        if (criterio.comparador === 'vacia') return v === null;
        if (criterio.comparador === 'novacia') return v !== null;
        const comp = COMPARADORES[criterio.comparador];
        if (!comp || v === null) return false;
        const objetivo = typeof v === 'number' ? Number(criterio.valor) : criterio.valor;
        if (typeof v === 'number' && Number.isNaN(objetivo)) return false;
        return comp.f(v, objetivo);
    }

    /** ¿El criterio está completo? */
    function criterioValido(c) {
        if (!c?.campo || !COMPARADORES[c.comparador]) return false;
        if (COMPARADORES[c.comparador].sinValor) return true;
        return c.valor !== '' && c.valor !== null && c.valor !== undefined;
    }

    /**
     * Filtra resultados por varios criterios.
     * @param {Array} resultados
     * @param {Array<{ campo, comparador, valor }>} criterios
     * @param {'Y'|'O'} operador
     */
    function filtrar(resultados, criterios, operador = 'Y') {
        const validos = (criterios || []).filter(criterioValido);
        if (!validos.length) return resultados;
        return resultados.filter(r => operador === 'O' ? validos.some(c => cumple(r, c)) : validos.every(c => cumple(r, c)));
    }

    function describirCriterio(datos, c) {
        const campo = c.campo.startsWith('ev:')
            ? (datos.evaluaciones.find(e => e.clave === c.campo.slice(3))?.nombre || c.campo.slice(3))
            : CAMPOS_FILTRO[c.campo]?.etiqueta || c.campo;
        const comp = COMPARADORES[c.comparador];
        if (!comp) return campo;
        if (comp.sinValor) return `${campo} ${comp.simbolo}`;
        const valor = c.campo === 'estado' ? (CONFIG.ESTADOS[c.valor]?.etiqueta || c.valor) : c.valor;
        return `${campo} ${comp.simbolo} ${valor}`;
    }

    /** Filtros rápidos frecuentes. */
    function filtrosRapidos(datos) {
        const a = (datos.escala || CONFIG.ESCALA_POR_DEFECTO).aprobatoria;
        return {
            riesgo: { etiqueta: 'En riesgo, perdiendo o sin notas', operador: 'O', criterios: ['riesgo', 'riesgo-alto', 'perdido', 'reprobado', 'sin-datos'].map(valor => ({ campo: 'estado', comparador: 'eq', valor })) },
            bajoAprobatoria: { etiqueta: `Promedio menor que ${a}`, operador: 'Y', criterios: [{ campo: 'promedio', comparador: 'lt', valor: a }] },
            perdieron: { etiqueta: 'Perdieron alguna evaluación', operador: 'Y', criterios: [{ campo: 'perdidas', comparador: 'gte', valor: 1 }] },
            sinPresentar: { etiqueta: 'Con evaluaciones sin presentar', operador: 'Y', criterios: [{ campo: 'faltantes', comparador: 'gte', valor: 1 }] },
            destacados: { etiqueta: 'Destacados (≥ 4.5)', operador: 'Y', criterios: [{ campo: 'promedio', comparador: 'gte', valor: 4.5 }] }
        };
    }

    const Analisis = {
        repartir, pesosSugeridos, evaluacionesActivas, estaCalificada, nivelDe, calcularEstudiante,
        indiceCompetencias, competenciasAReforzar, recursosRecomendados, recomendaciones,
        analizarGrupo, estadisticas, histograma, distribucionNiveles,
        clasificarDimension, dimensionDe, perfilEvaluacion, perfilesEvaluaciones, notasPorDimension,
        CAMPOS_FILTRO, COMPARADORES, valorCampo, filtrar, criterioValido, describirCriterio, filtrosRapidos
    };
    global.Analisis = Analisis;
    if (typeof module !== 'undefined' && module.exports) module.exports = Analisis;
})(typeof window !== 'undefined' ? window : globalThis);
