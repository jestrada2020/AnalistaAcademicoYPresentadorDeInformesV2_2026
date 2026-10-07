/**
 * Estado de la aplicación: un proyecto con uno o varios grupos y un catálogo de competencias compartido.
 *
 *  proyecto = { version, grupos: [grupo...], activo: idDelGrupoActivo, catalogo: { archivo, cursos, avisos } | null }
 *  grupo    = planilla de notas, evaluaciones, curso, escala, observaciones, filtro... (ver grupoInicial)
 *
 * Las pestañas 1 a 5 trabajan sobre el grupo activo (Estado.obtener()); la pestaña Programa usa todos.
 * En cada grupo, `competencias` es { archivo, cursos (los del catálogo compartido), cursoActivo, avisos }.
 * Se guarda automáticamente en el navegador (localStorage) y puede exportarse como respaldo JSON.
 */
(function (global) {
    'use strict';

    const CONFIG = global.CONFIG || require('./config.js');
    const U = global.Utilidades || require('./utilidades.js');
    const Analisis = global.Analisis || require('./analisis.js');

    function grupoInicial() {
        return {
            version: 4,
            id: U.generarId('grupo'),
            nombre: '',
            origen: null, // { archivo, hoja, valor } de donde se leyó (para actualizarlo al volver a cargar el archivo)
            curso: { institucion: '', programa: '', asignatura: '', grupo: '', periodo: '', docente: '', correo: '', ciudad: '' },
            escala: { ...CONFIG.ESCALA_POR_DEFECTO },
            niveles: CONFIG.NIVELES_POR_DEFECTO.map(n => ({ ...n })),
            opciones: { vaciasComoCero: true, umbralRiesgoAlto: CONFIG.UMBRAL_RIESGO_ALTO },
            archivoNotas: null,
            estudiantes: [],
            evaluaciones: [],
            columnasInfo: [],
            columnasTexto: [],
            avisosLectura: [],
            competencias: null,
            observaciones: {},
            filtro: { operador: 'Y', criterios: [] },
            seleccion: [],
            informe: {
                tamano: 'letter', orientacion: 'p', incluirCompetencias: true, incluirRecursos: true,
                incluirRecomendaciones: true, incluirDimensiones: true, incluirFirmas: true, incluirDatosArchivo: true, mensaje: ''
            }
        };
    }

    /** Compatibilidad: antes la aplicación tenía un solo grupo y su estado se llamaba así. */
    const estadoInicial = grupoInicial;

    function proyectoInicial() {
        const g = grupoInicial();
        return { version: 4, grupos: [g], activo: g.id, catalogo: null };
    }

    let proyecto = proyectoInicial();

    function recursosVacios() {
        const r = {};
        Object.keys(CONFIG.TIPOS_RECURSO).forEach(k => { r[k] = ''; });
        return r;
    }

    /** Completa un grupo leído (localStorage o respaldo) con los campos que falten. */
    function normalizar(datos) {
        const base = grupoInicial();
        if (!datos || typeof datos !== 'object') return base;
        const d = { ...base, ...datos };
        d.id = datos.id || base.id;
        d.curso = { ...base.curso, ...(datos.curso || {}) };
        d.escala = { ...base.escala, ...(datos.escala || {}) };
        d.opciones = { ...base.opciones, ...(datos.opciones || {}) };
        d.informe = { ...base.informe, ...(datos.informe || {}) };
        d.filtro = { ...base.filtro, ...(datos.filtro || {}) };
        d.niveles = Array.isArray(datos.niveles) && datos.niveles.length ? datos.niveles : base.niveles;
        d.estudiantes = Array.isArray(datos.estudiantes) ? datos.estudiantes : [];
        d.evaluaciones = (Array.isArray(datos.evaluaciones) ? datos.evaluaciones : []).map(ev => ({
            incluida: true, peso: 0, fecha: '', descripcion: '', caracter: '', competencias: [], ...ev,
            recursos: { ...recursosVacios(), ...(ev.recursos || {}) }
        }));
        d.observaciones = datos.observaciones && typeof datos.observaciones === 'object' ? datos.observaciones : {};
        d.seleccion = Array.isArray(datos.seleccion) ? datos.seleccion : [];
        if (!d.nombre) d.nombre = nombreSugerido(d);
        return d;
    }

    /** Completa un proyecto; acepta también el formato antiguo de un solo grupo (versión 3). */
    function normalizarProyecto(datos) {
        if (!datos || typeof datos !== 'object') return proyectoInicial();
        if (!Array.isArray(datos.grupos)) {
            // Formato v3: el catálogo estaba dentro del grupo
            const g = normalizar(datos);
            const catalogo = datos.competencias?.cursos ? { archivo: datos.competencias.archivo || '', cursos: datos.competencias.cursos, avisos: datos.competencias.avisos || [] } : null;
            const p = { version: 4, grupos: [g], activo: g.id, catalogo };
            vincularCatalogo(p);
            if (catalogo) g.competencias.cursoActivo = datos.competencias.cursoActivo || catalogo.cursos[0]?.id || null;
            return p;
        }
        const grupos = datos.grupos.map(normalizar);
        if (!grupos.length) grupos.push(grupoInicial());
        const ids = new Set();
        grupos.forEach(g => { while (ids.has(g.id)) g.id = U.generarId('grupo'); ids.add(g.id); });
        const p = {
            version: 4,
            grupos,
            activo: grupos.some(g => g.id === datos.activo) ? datos.activo : grupos[0].id,
            catalogo: datos.catalogo?.cursos ? { archivo: datos.catalogo.archivo || '', cursos: datos.catalogo.cursos, avisos: datos.catalogo.avisos || [] } : null
        };
        vincularCatalogo(p);
        return p;
    }

    /** Hace que cada grupo vea el catálogo compartido (conservando el curso elegido en cada uno). */
    function vincularCatalogo(p = proyecto) {
        p.grupos.forEach(g => {
            if (!p.catalogo) { g.competencias = null; return; }
            const previo = g.competencias?.cursoActivo;
            const valido = previo && p.catalogo.cursos.some(c => c.id === previo);
            g.competencias = { archivo: p.catalogo.archivo, cursos: p.catalogo.cursos, avisos: p.catalogo.avisos, cursoActivo: valido ? previo : null };
            if (!valido) g.competencias.cursoActivo = sugerirCurso(p.catalogo.cursos, g)?.id || null;
        });
    }

    // ---------------------------------------------------------------- Acceso

    function obtener() {
        return proyecto.grupos.find(g => g.id === proyecto.activo) || proyecto.grupos[0];
    }

    function obtenerProyecto() { return proyecto; }

    function grupos() { return proyecto.grupos; }

    /** Grupos con estudiantes (los que entran en el análisis del programa). */
    function gruposConDatos() { return proyecto.grupos.filter(g => g.estudiantes.length); }

    function activar(id) {
        if (!proyecto.grupos.some(g => g.id === id)) return false;
        proyecto.activo = id;
        return true;
    }

    /** Reemplaza el contenido del grupo activo (se conserva su identificador). */
    function reemplazar(nuevo) {
        const actual = obtener();
        const g = normalizar({ ...nuevo, id: actual.id });
        proyecto.grupos[proyecto.grupos.indexOf(actual)] = g;
        vincularCatalogo();
        confirmar();
    }

    function reemplazarProyecto(nuevo) {
        proyecto = normalizarProyecto(nuevo);
        confirmar();
    }

    // ---------------------------------------------------------------- Guardado

    /** Copia del proyecto lista para guardar: el catálogo va una sola vez, no repetido en cada grupo. */
    function serializar() {
        return {
            version: 4,
            activo: proyecto.activo,
            catalogo: proyecto.catalogo,
            grupos: proyecto.grupos.map(g => ({ ...g, competencias: g.competencias ? { cursoActivo: g.competencias.cursoActivo } : null }))
        };
    }

    function guardar() {
        try {
            if (typeof localStorage !== 'undefined') localStorage.setItem(CONFIG.CLAVE_ALMACENAMIENTO, JSON.stringify(serializar()));
        } catch (e) {
            console.warn('No se pudo guardar en el navegador:', e);
        }
    }

    function cargar() {
        try {
            let crudo = null;
            if (typeof localStorage !== 'undefined') {
                crudo = localStorage.getItem(CONFIG.CLAVE_ALMACENAMIENTO) || localStorage.getItem(CONFIG.CLAVE_ANTERIOR);
            }
            proyecto = normalizarProyecto(crudo ? JSON.parse(crudo) : null);
        } catch (e) {
            console.warn('Datos guardados ilegibles; se empieza de cero.', e);
            proyecto = proyectoInicial();
        }
        return obtener();
    }

    /** Guarda y avisa a la interfaz que los datos cambiaron. */
    function confirmar(detalle = {}) {
        guardar();
        if (typeof document !== 'undefined') document.dispatchEvent(new CustomEvent('datos-cambiados', { detail: detalle }));
    }

    function reiniciar() {
        proyecto = proyectoInicial();
        confirmar();
    }

    // ---------------------------------------------------------------- Grupos

    /** Nombre corto para mostrar el grupo en listas y en el informe del programa. */
    function nombreSugerido(d) {
        const c = d.curso || {};
        if (c.asignatura || c.grupo) {
            const g = c.grupo ? (/^grupo/i.test(c.grupo) ? c.grupo : `Grupo ${c.grupo}`) : '';
            return [c.asignatura, g].filter(Boolean).join(' · ');
        }
        const o = d.origen || {};
        const base = String(o.archivo || d.archivoNotas?.nombre || '').replace(/\.[^.]+$/, '');
        const hoja = o.hoja && !/^(sheet|hoja|csv)\s*\d*$/i.test(o.hoja) ? o.hoja : '';
        return [base, hoja, o.valor].filter(Boolean).join(' · ') || 'Grupo sin nombre';
    }

    function claveOrigen(o) {
        return o ? `${o.archivo}|${o.hoja}|${o.valor || ''}` : '';
    }

    /**
     * Agrega (o actualiza, si ya se había cargado del mismo archivo, hoja y grupo) un grupo leído con Lectura.
     * El grupo nuevo hereda la escala, niveles, opciones e institución/programa/periodo del grupo activo.
     * @param {object} lectura Elemento de Lectura.leerLibroNotas(...).hojas con resultado.
     * @param {string} archivo Nombre del archivo.
     * @returns {{ grupo: object, nuevo: boolean }}
     */
    function agregarGrupo(lectura, archivo) {
        const r = lectura.resultado;
        const origen = { archivo, hoja: lectura.hoja || r.hoja || '', valor: lectura.valor || '' };
        const clave = claveOrigen(origen);
        let g = proyecto.grupos.find(x => claveOrigen(x.origen) === clave);
        let nuevo = false;
        if (!g) {
            const vacio = proyecto.grupos.find(x => !x.estudiantes.length && !x.origen);
            const modelo = obtener();
            g = vacio || grupoInicial();
            if (!vacio) {
                g.escala = { ...modelo.escala };
                g.niveles = modelo.niveles.map(n => ({ ...n }));
                g.opciones = { ...modelo.opciones };
                g.informe = { ...modelo.informe };
                ['institucion', 'programa', 'periodo'].forEach(k => { g.curso[k] = modelo.curso[k] || ''; });
                proyecto.grupos.push(g);
            }
            g.origen = origen;
            nuevo = true;
        }
        aplicarNotas(r, archivo, g);
        // Datos del grupo escritos en la planilla (columnas Asignatura, Grupo, Docente)
        const meta = r.grupo || {};
        if (meta.asignatura) g.curso.asignatura = meta.asignatura;
        if (meta.grupo) g.curso.grupo = meta.grupo;
        if (meta.docente) g.curso.docente = meta.docente;
        if (lectura.valor && !meta.grupo && !meta.asignatura) g.curso.grupo = lectura.valor;
        if (nuevo || !g.nombre) g.nombre = nombreSugerido(g);
        if (proyecto.catalogo) {
            if (nuevo && g.competencias) g.competencias.cursoActivo = null; // que se sugiera según la nueva planilla
            vincularCatalogo();
            if (!g.competencias.cursoActivo) g.competencias.cursoActivo = obtener().competencias?.cursoActivo || proyecto.catalogo.cursos[0]?.id || null;
            if (g.evaluaciones.every(ev => !(ev.competencias || []).length) && g.competencias.cursoActivo) distribuirCompetencias(g.competencias.cursoActivo, g);
        }
        return { grupo: g, nuevo };
    }

    function eliminarGrupo(id) {
        const i = proyecto.grupos.findIndex(g => g.id === id);
        if (i < 0) return;
        proyecto.grupos.splice(i, 1);
        if (!proyecto.grupos.length) {
            const g = grupoInicial();
            proyecto.grupos.push(g);
            vincularCatalogo();
        }
        if (!proyecto.grupos.some(g => g.id === proyecto.activo)) proyecto.activo = proyecto.grupos[Math.max(0, i - 1)].id;
    }

    /** Aplica un cambio a todos los grupos (escala, niveles, opciones, institución...). */
    function aplicarATodos(fn) {
        proyecto.grupos.forEach(fn);
    }

    // ---------------------------------------------------------------- Importación

    /**
     * Incorpora una hoja de notas leída con Lectura.leerNotas en un grupo.
     * Conserva la configuración (peso, fecha, carácter, competencias, recursos) de las evaluaciones que ya existían.
     */
    function aplicarNotas(resultado, archivo, d = obtener()) {
        const previas = new Map(d.evaluaciones.map(e => [e.clave, e]));
        const mismasClaves = resultado.evaluaciones.length === previas.size && resultado.evaluaciones.every(e => previas.has(e.clave));
        d.evaluaciones = resultado.evaluaciones.map(ev => {
            const p = previas.get(ev.clave);
            return {
                clave: ev.clave, encabezado: ev.encabezado, tipo: p?.tipo || ev.tipo, numero: ev.numero,
                nombre: p?.nombre || ev.nombre, incluida: p ? p.incluida !== false : true,
                peso: p ? p.peso : 0, fecha: p?.fecha || '', descripcion: p?.descripcion || '', caracter: p?.caracter || '',
                competencias: p?.competencias || [], recursos: { ...recursosVacios(), ...(p?.recursos || {}) },
                calificadas: ev.calificadas
            };
        });
        if (!mismasClaves) {
            const pesos = Analisis.pesosSugeridos(d.evaluaciones, 'auto');
            d.evaluaciones.forEach(ev => { ev.peso = pesos[ev.clave] || 0; });
        }
        d.estudiantes = resultado.estudiantes;
        d.columnasInfo = resultado.informativas;
        d.columnasTexto = resultado.extras;
        d.avisosLectura = resultado.avisos;
        d.archivoNotas = { nombre: archivo || '', hoja: resultado.hoja, fecha: U.fechaISO(), filaEncabezado: resultado.filaEncabezado };
        const ids = new Set(d.estudiantes.map(e => e.id));
        d.seleccion = d.seleccion.filter(id => ids.has(id));
        if (!d.curso.asignatura && archivo) d.curso.asignatura = resultado.grupo?.asignatura || sugerirAsignatura(archivo, resultado.hoja);
        return d;
    }

    /** "MATEUNOV0.xlsx" -> "Mateunov0"; si la hoja tiene nombre propio ("Cálculo 2A") se prefiere. */
    function sugerirAsignatura(archivo, hoja) {
        if (hoja && !/^(sheet|hoja|csv)\s*\d*$/i.test(hoja.trim())) return hoja.trim();
        const base = String(archivo).replace(/\.[^.]+$/, '').replace(/[_-]+/g, ' ').trim();
        return base ? base.charAt(0).toUpperCase() + base.slice(1).toLowerCase() : '';
    }

    /** Carácter automático de cada competencia; conserva la corrección manual si la competencia ya existía. */
    function clasificarCursos(cursos, previos = []) {
        const manual = new Map();
        previos.forEach(c => c.competencias.forEach(x => { if (x.dimensionManual) manual.set(x.id, x.dimensionManual); }));
        cursos.forEach(c => c.competencias.forEach(x => {
            x.dimension = Analisis.clasificarDimension(x.texto, x.criterio).dimension;
            if (manual.has(x.id)) x.dimensionManual = manual.get(x.id);
        }));
    }

    /**
     * Incorpora un catálogo de competencias.
     * - Sin `d`: lo comparte con todos los grupos del proyecto (uso normal).
     * - Con `d`: lo aplica solo a ese grupo suelto (uso en pruebas y datos de ejemplo).
     * Conserva los nombres de curso y el carácter corregidos por el usuario.
     */
    function aplicarCompetencias(resultado, archivo, d) {
        const anteriores = (d ? d.competencias?.cursos : proyecto.catalogo?.cursos) || [];
        const previos = new Map(anteriores.map(c => [c.id, c]));
        const cursos = resultado.cursos.map(c => ({ ...c, nombre: previos.get(c.id)?.nombre || c.nombre }));
        clasificarCursos(cursos, anteriores);
        const validas = new Set(cursos.flatMap(c => c.competencias.map(x => x.id)));
        const limpiar = g => g.evaluaciones.forEach(ev => { ev.competencias = (ev.competencias || []).filter(id => validas.has(id)); });
        if (d) {
            const activo = d.competencias?.cursoActivo && cursos.some(c => c.id === d.competencias.cursoActivo)
                ? d.competencias.cursoActivo
                : sugerirCurso(cursos, d)?.id || cursos[0]?.id || null;
            d.competencias = { archivo: archivo || '', cursos, cursoActivo: activo, avisos: resultado.avisos || [] };
            limpiar(d);
            return d;
        }
        proyecto.catalogo = { archivo: archivo || '', cursos, avisos: resultado.avisos || [] };
        vincularCatalogo();
        proyecto.grupos.forEach(g => {
            limpiar(g);
            if (!g.competencias.cursoActivo) g.competencias.cursoActivo = cursos[0]?.id || null;
        });
        return obtener();
    }

    /** Intenta adivinar el curso a partir del nombre de la asignatura o del archivo de notas. */
    function sugerirCurso(cursos, d = obtener()) {
        const texto = U.normalizarTexto(`${d.curso.asignatura} ${d.archivoNotas?.nombre || ''} ${d.archivoNotas?.hoja || ''} ${d.origen?.valor || ''}`);
        if (!texto.trim()) return null;
        let mejor = null;
        cursos.forEach(c => {
            const palabras = U.normalizarTexto(c.nombre).split(/\s+/).filter(p => p.length > 3);
            const puntos = palabras.filter(p => texto.includes(p)).length / (palabras.length || 1);
            if (puntos > 0 && (!mejor || puntos > mejor.puntos)) mejor = { curso: c, puntos };
        });
        return mejor?.curso || null;
    }

    function cursoActivo(d = obtener()) {
        return d.competencias?.cursos.find(c => c.id === d.competencias.cursoActivo) || null;
    }

    /** Busca una competencia del catálogo por su identificador. */
    function competencia(id) {
        for (const c of proyecto.catalogo?.cursos || obtener().competencias?.cursos || []) {
            const x = c.competencias.find(k => k.id === id);
            if (x) return x;
        }
        return null;
    }

    /**
     * Reparte las competencias del curso entre las evaluaciones, en orden:
     * los parciales (o, si no hay, todas las evaluaciones) reciben bloques consecutivos de competencias
     * y cada quiz recibe las del parcial con su mismo número (o del bloque correspondiente).
     */
    function distribuirCompetencias(cursoId, d = obtener()) {
        const curso = d.competencias?.cursos.find(c => c.id === cursoId);
        if (!curso) return 0;
        const incluidas = d.evaluaciones.filter(e => e.incluida !== false);
        const parciales = incluidas.filter(e => e.tipo === 'parcial' || e.tipo === 'final');
        const principales = parciales.length ? parciales : incluidas;
        if (!principales.length) return 0;
        const comps = curso.competencias.map(c => c.id);
        const bloques = principales.map((_, i) => comps.slice(Math.floor((i * comps.length) / principales.length), Math.floor(((i + 1) * comps.length) / principales.length)));
        principales.forEach((ev, i) => { ev.competencias = bloques[i]; });
        incluidas.filter(e => !principales.includes(e)).forEach((ev, i, otras) => {
            let k = ev.numero ? principales.findIndex(p => p.numero === ev.numero) : -1;
            if (k < 0) k = Math.min(principales.length - 1, Math.floor((i * principales.length) / otras.length));
            ev.competencias = [...bloques[k]];
        });
        return incluidas.length;
    }

    // ---------------------------------------------------------------- Respaldo

    function exportarRespaldo() {
        return JSON.stringify({ aplicacion: 'AnalistaAcademico', version: CONFIG.VERSION, fecha: new Date().toISOString(), datos: serializar() }, null, 2);
    }

    function importarRespaldo(texto) {
        const json = JSON.parse(texto);
        const datos = json?.datos || json;
        if (!datos || !(Array.isArray(datos.grupos) || Array.isArray(datos.estudiantes))) throw new Error('El archivo no es un respaldo válido de esta aplicación.');
        reemplazarProyecto(datos);
    }

    function hayDatos(d = obtener()) { return d.estudiantes.length > 0; }

    const Estado = {
        estadoInicial, grupoInicial, proyectoInicial, normalizar, normalizarProyecto,
        obtener, obtenerProyecto, grupos, gruposConDatos, activar, reemplazar, reemplazarProyecto,
        guardar, cargar, confirmar, reiniciar, serializar,
        agregarGrupo, eliminarGrupo, aplicarATodos, nombreSugerido,
        aplicarNotas, aplicarCompetencias, sugerirCurso, sugerirAsignatura, cursoActivo, competencia, distribuirCompetencias,
        exportarRespaldo, importarRespaldo, hayDatos, recursosVacios
    };
    global.Estado = Estado;
    if (typeof module !== 'undefined' && module.exports) module.exports = Estado;
})(typeof window !== 'undefined' ? window : globalThis);
