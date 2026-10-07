/**
 * Sugerencia automática de recursos de estudio para una evaluación, a partir de sus competencias
 * y del área del curso. Genera enlaces de búsqueda (no requiere conexión para crearlos) que el
 * docente puede revisar, editar o reemplazar.
 */
(function (global) {
    'use strict';

    const CONFIG = global.CONFIG || require('./config.js');
    const U = global.Utilidades || require('./utilidades.js');
    const Analisis = global.Analisis || require('./analisis.js');

    /** "Resolver ecuaciones lineales con una incógnita." -> "ecuaciones lineales con una incógnita" */
    function temaDeCompetencia(texto) {
        let t = String(texto || '').replace(/\.$/, '').replace(/\s*\(.*?\)\s*/g, ' ').trim();
        // Quitar el verbo inicial ("Resolver", "Comprender y aplicar", "Identificarse con")
        const sinVerbo = t.replace(/^\p{L}+(?:ar|er|ir)(?:se)?(?:\s+(?:y|e|o)\s+\p{L}+(?:ar|er|ir)(?:se)?)?\s+/iu, '');
        if (sinVerbo.split(/\s+/).length >= 2) t = sinVerbo.replace(/^(con|a|de|en|por|sobre|para)\s+/i, '');
        if (t.length > 80) t = t.slice(0, 80).replace(/\s+\S*$/, '');
        return t.charAt(0).toLowerCase() + t.slice(1);
    }

    function herramientasDelArea(texto) {
        const t = U.normalizarTexto(texto);
        const area = CONFIG.HERRAMIENTAS_POR_AREA.find(a => a.patron.test(t));
        return area ? area.herramientas : ['Khan Academy | https://es.khanacademy.org', 'GeoGebra | https://www.geogebra.org'];
    }

    /**
     * @param {object} datos Estado de la aplicación.
     * @param {object} evaluacion
     * @param {number} maximo Competencias a usar para las búsquedas.
     * @returns {Object<string, string[]>} líneas "Título | URL" por tipo de recurso.
     */
    function sugerir(datos, evaluacion, maximo = 3) {
        const indice = Analisis.indiceCompetencias(datos);
        const comps = (evaluacion.competencias || []).map(id => indice.get(id)).filter(Boolean).slice(0, maximo);
        const curso = comps[0]?.curso || datos.curso?.asignatura || '';
        const temas = comps.length ? comps.map(c => temaDeCompetencia(c.texto)) : [curso || evaluacion.nombre];
        const q = s => encodeURIComponent(s).replace(/%20/g, '+');
        const salida = { web: [], videos: [], ejercicios: [], herramientas: [] };
        temas.forEach(tema => {
            CONFIG.BUSQUEDAS.web.slice(0, 1).forEach(b => salida.web.push(`${b.nombre}: ${tema} | ${b.url}${q(tema)}`));
            CONFIG.BUSQUEDAS.videos.forEach(b => salida.videos.push(`Video: ${tema} | ${b.url}${q(`${tema} explicación`)}`));
            salida.ejercicios.push(`Ejercicios resueltos: ${tema} | https://www.google.com/search?q=${q(`ejercicios resueltos ${tema} pdf`)}`);
        });
        salida.herramientas = herramientasDelArea(`${curso} ${datos.curso?.asignatura || ''}`);
        return salida;
    }

    const Recursos = { sugerir, temaDeCompetencia, herramientasDelArea };
    global.Recursos = Recursos;
    if (typeof module !== 'undefined' && module.exports) module.exports = Recursos;
})(typeof window !== 'undefined' ? window : globalThis);
