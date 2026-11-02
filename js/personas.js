/**
 * Unifica matrículas de una misma persona entre archivos y grupos.
 * La coincidencia normal exige documento y nombre; sin documento usa el nombre exacto normalizado.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades || require('./utilidades.js');

    function normalizarDocumento(valor) {
        return String(valor ?? '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
    }

    function normalizarNombre(valor) {
        return U.normalizarTexto(valor).replace(/[^a-z0-9 ]/g, '').replace(/\s+/g, ' ').trim();
    }

    function esIdAutomatico(estudiante) {
        if (estudiante.idGenerado === true) return true;
        return !estudiante.documento && /^EST-\d{3,}(?:-\d+)?$/i.test(estudiante.id || '');
    }

    function documentoDe(estudiante) {
        return esIdAutomatico(estudiante) ? '' : normalizarDocumento(estudiante.documento || estudiante.id);
    }

    /**
     * @param {object} prog Resultado de Programa.analizarPrograma.
     * @returns {{ personas: Array, comunes: Array, conflictos: Array, avisos: string[], resumen: object }}
     */
    function unificarEstudiantes(prog) {
        const mapa = new Map();
        const porDocumento = new Map();
        let matriculas = 0;

        (prog.grupos || []).forEach(({ datos, g }) => {
            g.resultados.forEach(r => {
                matriculas++;
                const documento = documentoDe(r.estudiante);
                const nombre = normalizarNombre(r.nombre);
                const clave = documento ? `D:${documento}|N:${nombre}` : `N:${nombre}`;
                if (!mapa.has(clave)) {
                    mapa.set(clave, {
                        clave, documento, nombre: r.nombre, nombres: new Set(), metodo: documento ? 'documento-nombre' : 'nombre',
                        registros: []
                    });
                }
                const persona = mapa.get(clave);
                persona.nombres.add(r.nombre);
                persona.registros.push({ datos, g, r, grupoId: datos.id, grupo: datos.nombre, archivo: datos.archivoNotas?.nombre || '' });

                if (documento) {
                    if (!porDocumento.has(documento)) porDocumento.set(documento, new Map());
                    const nombres = porDocumento.get(documento);
                    if (!nombres.has(nombre)) nombres.set(nombre, { nombre: r.nombre, grupos: new Set() });
                    nombres.get(nombre).grupos.add(datos.nombre);
                }
            });
        });

        const personas = [...mapa.values()].map(p => {
            const grupos = new Set(p.registros.map(x => x.grupoId));
            const promedios = p.registros.map(x => x.r.promedio).filter(v => v !== null);
            return {
                ...p,
                nombres: [...p.nombres],
                grupos,
                comun: grupos.size > 1,
                promedio: U.media(promedios),
                aprobando: p.registros.filter(x => ['aprobado', 'asegurado', 'aprobando'].includes(x.r.estado)).length,
                enRiesgo: p.registros.filter(x => ['riesgo', 'riesgo-alto', 'perdido', 'reprobado'].includes(x.r.estado)).length,
                sinDatos: p.registros.filter(x => x.r.estado === 'sin-datos').length
            };
        }).sort((a, b) => U.normalizarTexto(a.nombre).localeCompare(U.normalizarTexto(b.nombre), 'es'));

        const comunes = personas.filter(p => p.comun);
        const conflictos = [...porDocumento.entries()].filter(([, nombres]) => nombres.size > 1).map(([documento, nombres]) => ({
            documento,
            variantes: [...nombres.values()].map(x => ({ nombre: x.nombre, grupos: [...x.grupos] }))
        }));
        const avisos = conflictos.map(c => `Documento ${c.documento} con nombres distintos; las matrículas con nombres distintos se mantuvieron separadas: ${c.variantes.map(v => `${v.nombre} (${v.grupos.join(', ')})`).join(' · ')}.`);
        const porNombre = comunes.filter(p => p.metodo === 'nombre').length;
        if (porNombre) avisos.push(`${porNombre} estudiante(s) común(es) se unificaron solo por nombre exacto normalizado porque no tienen documento; revise posibles homónimos.`);

        return {
            personas,
            comunes,
            conflictos,
            avisos,
            resumen: {
                matriculas,
                personas: personas.length,
                comunes: comunes.length,
                conflictos: conflictos.length,
                comunesPorNombre: porNombre
            }
        };
    }

    const Personas = { normalizarDocumento, normalizarNombre, documentoDe, unificarEstudiantes };
    global.Personas = Personas;
    if (typeof module !== 'undefined' && module.exports) module.exports = Personas;
})(typeof window !== 'undefined' ? window : globalThis);
