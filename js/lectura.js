/**
 * Lectura de los libros de Excel: planilla de notas y catálogo de competencias.
 *
 * Se leen TODAS las columnas de la hoja y se clasifican por su encabezado y su contenido:
 *  - evaluaciones (1P, Parcial 2, Q1, Taller 3, Seguimiento...) -> entran en la nota;
 *  - columnas informativas numéricas (DF/definitiva, faltas, valores fuera de escala) -> se muestran como referencia;
 *  - columnas de texto (observaciones, competencias a reforzar, páginas web, videos...) -> datos por estudiante.
 * No depende del DOM: recibe filas (arreglos) y se prueba en Node.
 */
(function (global) {
    'use strict';

    const CONFIG = global.CONFIG || require('./config.js');
    const U = global.Utilidades || require('./utilidades.js');

    const RE_NOMBRE_COMPLETO = /^(nombres? (y|&) apellidos?|apellidos? (y|&) nombres?|nombre completo|nombre del estudiante|estudiantes?|alumnos?|nombres? completos?)$/;
    const RE_NOMBRES = /^(nombres?|primer nombre)$/;
    const RE_APELLIDOS = /^(apellidos?|primer apellido)$/;
    const RE_ID = /^(id|identificacion|n(o|ro|um|umero)?\.? ?(de )?(identificacion|documento)|documento|doc|cedula|c\.?c\.?|t\.?i\.?|codigo|cod|carne|matricula)$/;
    // Columnas que identifican el grupo dentro de un archivo con varios grupos.
    const RE_GRUPO = /^(grupos?|secci(on|ones)|paralelo|nrc|grado|salon|aula|cohorte|jornada|grupo academico|codigo (de )?grupo)$/;
    const RE_ASIGNATURA = /^(asignaturas?|materias?|cursos?|espacio academico|modulo|nombre (del|de la) (asignatura|materia|curso))$/;
    const RE_DOCENTE = /^(docentes?|profesor(es|a)?|maestr[oa]|tutor)$/;
    const RE_NO_PRESENTO = /^(np|n\.p\.?|no presento|no present[oó]|ausente|aus|inasistente|-+|x|sn|s\.n\.?)$/;

    /** Roles que se reconocen en columnas de texto por estudiante. */
    const ROLES_TEXTO = [
        { rol: 'competencias', patron: /competencia/ },
        { rol: 'ejercicios', patron: /ejercicio|taller/ },
        { rol: 'web', patron: /pagina|web|sitio|enlace/ },
        { rol: 'videos', patron: /video/ },
        { rol: 'herramientas', patron: /herramienta|software|aplicaci/ },
        { rol: 'observacion', patron: /observ|coment|nota del docente|anotaci/ }
    ];

    function letraColumna(indice) {
        let s = '';
        let n = indice + 1;
        while (n > 0) { const r = (n - 1) % 26; s = String.fromCharCode(65 + r) + s; n = Math.floor((n - 1) / 26); }
        return s;
    }

    /**
     * Reconoce el tipo de evaluación por el encabezado.
     * @returns {{ tipo: string, numero: number|null, nombre: string } | null}
     */
    function clasificarEncabezado(encabezado) {
        const h = U.normalizarTexto(encabezado).replace(/[°º#]/g, '').replace(/\s+/g, ' ');
        if (!h) return null;
        let m;
        if ((m = /^(\d+)\s*(p|par|parc|parcial)\.?$/.exec(h)) || (m = /^(?:p|par|parc|parcial)\.?\s*(\d+)$/.exec(h)) || (m = /^(\d+)(?:er|do|ro|to|vo|no|mo)?\s*parcial$/.exec(h))) {
            return { tipo: 'parcial', numero: +m[1], nombre: `Parcial ${+m[1]}` };
        }
        if (h === 'parcial') return { tipo: 'parcial', numero: null, nombre: 'Parcial' };
        if ((m = /^(?:q|qz|quiz|quices|quizes|quiz)\.?\s*(\d+)$/.exec(h)) || (m = /^(\d+)\s*(?:q|quiz)$/.exec(h))) {
            return { tipo: 'quiz', numero: +m[1], nombre: `Quiz ${+m[1]}` };
        }
        if (/^(quiz|quices|quizes)$/.test(h)) return { tipo: 'quiz', numero: null, nombre: 'Quiz' };
        if ((m = /^(?:t|tall|taller|trabajo|tarea|lab|laboratorio|practica|exposicion|expo)\.?\s*(\d*)$/.exec(h))) {
            const base = { t: 'Taller', tall: 'Taller', taller: 'Taller', trabajo: 'Trabajo', tarea: 'Tarea', lab: 'Laboratorio', laboratorio: 'Laboratorio', practica: 'Práctica', exposicion: 'Exposición', expo: 'Exposición' }[h.replace(/[.\s\d]/g, '')] || 'Taller';
            return { tipo: 'taller', numero: m[1] ? +m[1] : null, nombre: m[1] ? `${base} ${+m[1]}` : base };
        }
        if ((m = /^(?:seg|seguimiento)\.?\s*(\d*)$/.exec(h))) return { tipo: 'seguimiento', numero: m[1] ? +m[1] : null, nombre: m[1] ? `Seguimiento ${+m[1]}` : 'Seguimiento' };
        if ((m = /^(?:proy|proyecto)\.?\s*(\d*)$/.exec(h))) return { tipo: 'proyecto', numero: m[1] ? +m[1] : null, nombre: m[1] ? `Proyecto ${+m[1]}` : 'Proyecto' };
        if (/^(ef|examen final|final|ex final|evaluacion final)$/.test(h)) return { tipo: 'final', numero: null, nombre: 'Examen final' };
        return null;
    }

    /** Columnas numéricas que no son evaluaciones (definitiva registrada, faltas...). */
    function clasificarInformativa(encabezado) {
        const h = U.normalizarTexto(encabezado);
        if (/^(df|def|definitiva|nota definitiva|nota final|nf|nd|promedio|prom|acumulado|acum|total|nota acumulada)$/.test(h)) return 'definitiva';
        if (/(falta|fallas?|inasist|ausencia)/.test(h)) return 'faltas';
        return null;
    }

    function rolTexto(encabezado) {
        const h = U.normalizarTexto(encabezado);
        return (ROLES_TEXTO.find(r => r.patron.test(h)) || { rol: 'dato' }).rol;
    }

    /** Busca la fila de encabezados (la primera que tenga una columna de nombre) entre las primeras 20. */
    function buscarFilaEncabezado(filas) {
        for (let i = 0; i < Math.min(filas.length, 20); i++) {
            const fila = filas[i] || [];
            const normal = fila.map(c => U.normalizarTexto(c));
            if (normal.some(c => RE_NOMBRE_COMPLETO.test(c) || RE_NOMBRES.test(c) || RE_APELLIDOS.test(c))) return i;
        }
        return -1;
    }

    /**
     * Lee una hoja de notas.
     * @param {Array<Array>} filas Filas de la hoja (sheet_to_json con header:1).
     * @param {{ escala?: object, hoja?: string }} opciones
     */
    function leerNotas(filas, opciones = {}) {
        const escala = { ...CONFIG.ESCALA_POR_DEFECTO, ...(opciones.escala || {}) };
        const avisos = [];
        const iEnc = buscarFilaEncabezado(filas);
        if (iEnc < 0) throw new Error('No se encontró la columna de nombres (por ejemplo "Nombres y Apellidos" o "Estudiante").');

        const encabezados = (filas[iEnc] || []).map(c => String(c ?? '').trim());
        const datos = filas.slice(iEnc + 1);
        const ancho = Math.max(encabezados.length, ...datos.map(f => (f || []).length));
        const normal = encabezados.map(h => U.normalizarTexto(h));

        let colNombre = normal.findIndex(h => RE_NOMBRE_COMPLETO.test(h));
        let colNombres = -1;
        let colApellidos = -1;
        if (colNombre < 0) {
            colNombres = normal.findIndex(h => RE_NOMBRES.test(h));
            colApellidos = normal.findIndex(h => RE_APELLIDOS.test(h));
            colNombre = colNombres >= 0 ? colNombres : colApellidos;
        }
        let colId = normal.findIndex(h => RE_ID.test(h));
        // Si no hay columna de identificación con nombre conocido, se usa la primera columna si parece un código.
        if (colId < 0 && colNombre !== 0) {
            const valores = datos.map(f => f?.[0]).filter(v => v !== '' && v !== null && v !== undefined);
            if (valores.length && valores.every(v => /^[\w.-]+$/.test(String(v).trim()))) colId = 0;
        }
        const meta = columnasMeta(normal);
        const usadas = new Set([colNombre, colNombres, colApellidos, colId, meta.grupo, meta.asignatura, meta.docente].filter(i => i >= 0));

        // Filas de estudiantes: las que tienen nombre
        const filasEst = datos.filter(f => {
            const n = [colApellidos, colNombre, colNombres].filter(i => i >= 0).map(i => String(f?.[i] ?? '').trim()).join('');
            return n && !/^(total|promedio|media|resumen)/i.test(n);
        });
        if (!filasEst.length) throw new Error('La hoja no tiene filas de estudiantes con nombre.');

        const evaluaciones = [];
        const informativas = [];
        const extras = [];
        const claves = new Set();
        const claveUnica = base => {
            let c = base || 'COL';
            let k = 2;
            while (claves.has(c)) c = `${base}_${k++}`;
            claves.add(c);
            return c;
        };

        for (let col = 0; col < ancho; col++) {
            if (usadas.has(col)) continue;
            const encabezado = encabezados[col] || '';
            const valores = filasEst.map(f => f?.[col]).filter(v => v !== '' && v !== null && v !== undefined && String(v).trim() !== '');
            if (!encabezado && !valores.length) continue; // columna vacía
            const nombreCol = encabezado || `Columna ${letraColumna(col)}`;
            const numericos = valores.map(U.interpretarNumero).filter(v => v !== null);
            const textos = valores.filter(v => U.interpretarNumero(v) === null && !RE_NO_PRESENTO.test(U.normalizarTexto(v)));
            const clasif = clasificarEncabezado(encabezado);
            const info = clasificarInformativa(encabezado);
            const fueraEscala = numericos.filter(v => v < escala.minima || v > escala.maxima);

            // Columna con encabezado pero sin datos y que no es una evaluación reconocida (p. ej. «Observaciones» vacía)
            if (!valores.length && !clasif && !info) {
                if (rolTexto(encabezado) !== 'dato') extras.push({ clave: claveUnica(`TXT_${letraColumna(col)}`), columna: col, nombre: nombreCol, rol: rolTexto(encabezado) });
                continue;
            }
            if (info) {
                informativas.push({ clave: claveUnica(encabezado.toUpperCase()), columna: col, encabezado: nombreCol, nombre: info === 'definitiva' ? 'Definitiva registrada' : nombreCol, tipo: info });
                continue;
            }
            if (clasif) {
                if (textos.length > numericos.length && textos.length > 2) {
                    avisos.push(`La columna "${nombreCol}" parece una evaluación pero tiene sobre todo texto; se leyó como dato del estudiante.`);
                } else {
                    evaluaciones.push({ clave: claveUnica(encabezado.toUpperCase().replace(/\s+/g, '')), columna: col, encabezado: nombreCol, ...clasif });
                    continue;
                }
            }
            if (textos.length && textos.length >= numericos.length) {
                extras.push({ clave: claveUnica(`TXT_${letraColumna(col)}`), columna: col, nombre: nombreCol, rol: encabezado ? rolTexto(encabezado) : 'observacion' });
                continue;
            }
            if (fueraEscala.length) {
                informativas.push({ clave: claveUnica(encabezado ? encabezado.toUpperCase() : `INFO_${letraColumna(col)}`), columna: col, encabezado: nombreCol, nombre: nombreCol, tipo: 'informativa' });
                avisos.push(`La columna "${nombreCol}" tiene valores fuera de la escala ${escala.minima}–${escala.maxima} (p. ej. ${fueraEscala[0]}); se tomó como dato informativo y no entra en la nota.`);
                continue;
            }
            evaluaciones.push({ clave: claveUnica(encabezado ? encabezado.toUpperCase().replace(/\s+/g, '') : `EV_${letraColumna(col)}`), columna: col, encabezado: nombreCol, tipo: 'otro', numero: null, nombre: nombreCol });
            if (!encabezado) avisos.push(`La columna ${letraColumna(col)} no tiene encabezado y contiene notas; se agregó como "${nombreCol}".`);
        }
        if (!evaluaciones.length) avisos.push('No se reconoció ninguna columna de evaluación.');

        // Estudiantes
        const ids = new Set();
        const estudiantes = filasEst.map((f, i) => {
            let nombre;
            if (colNombres >= 0 && colApellidos >= 0) nombre = `${String(f[colApellidos] ?? '').trim()} ${String(f[colNombres] ?? '').trim()}`.trim();
            else nombre = String(f[colNombre] ?? '').trim();
            nombre = U.nombrePropio(nombre);
            let id = colId >= 0 ? String(f[colId] ?? '').trim() : '';
            if (!id) id = `EST-${String(i + 1).padStart(3, '0')}`;
            if (ids.has(id)) { avisos.push(`El documento ${id} está repetido (${nombre}); se le agregó un sufijo.`); id = `${id}-${i + 1}`; }
            ids.add(id);

            const notas = {};
            const marcas = {};
            evaluaciones.forEach(ev => {
                const bruto = f[ev.columna];
                const n = U.interpretarNumero(bruto);
                if (n === null) {
                    notas[ev.clave] = null;
                    const t = String(bruto ?? '').trim();
                    if (t) {
                        marcas[ev.clave] = RE_NO_PRESENTO.test(U.normalizarTexto(t)) ? 'NP' : t;
                        if (marcas[ev.clave] !== 'NP') avisos.push(`${nombre}: el valor "${t}" en ${ev.encabezado} no es una nota; se dejó vacío.`);
                    }
                } else if (n < escala.minima || n > escala.maxima) {
                    notas[ev.clave] = null;
                    marcas[ev.clave] = String(bruto);
                    avisos.push(`${nombre}: la nota ${n} en ${ev.encabezado} está fuera de la escala; se dejó vacía.`);
                } else {
                    notas[ev.clave] = n;
                }
            });
            const info = {};
            informativas.forEach(c => {
                const n = U.interpretarNumero(f[c.columna]);
                info[c.clave] = n !== null ? n : (String(f[c.columna] ?? '').trim() || null);
            });
            const textos = {};
            extras.forEach(c => {
                const t = f[c.columna];
                if (t !== '' && t !== null && t !== undefined && String(t).trim()) textos[c.clave] = String(t).trim();
            });
            return { id, nombre, notas, marcas, info, extras: textos };
        });

        evaluaciones.forEach(ev => {
            ev.calificadas = estudiantes.filter(e => e.notas[ev.clave] !== null).length;
            if (!ev.calificadas) avisos.push(`${ev.nombre} (${ev.encabezado}) aún no tiene notas: se considera pendiente por evaluar.`);
        });
        const sinNotas = estudiantes.filter(e => evaluaciones.every(ev => e.notas[ev.clave] === null));
        if (sinNotas.length) avisos.push(`${sinNotas.length} estudiante(s) sin ninguna nota: ${sinNotas.map(e => e.nombre).join(', ')}.`);

        // Datos del grupo escritos en la propia hoja (columnas Grupo, Asignatura, Docente): se toma el valor más frecuente.
        const valorMeta = col => {
            if (col < 0) return '';
            const cuenta = {};
            filasEst.forEach(f => { const v = String(f?.[col] ?? '').trim(); if (v) cuenta[v] = (cuenta[v] || 0) + 1; });
            return Object.entries(cuenta).sort((a, b) => b[1] - a[1])[0]?.[0] || '';
        };
        const grupo = { asignatura: valorMeta(meta.asignatura), grupo: valorMeta(meta.grupo), docente: valorMeta(meta.docente) };

        return {
            hoja: opciones.hoja || '',
            grupo,
            filaEncabezado: iEnc + 1,
            estudiantes,
            evaluaciones: evaluaciones.map(({ columna, ...ev }) => ev),
            informativas: informativas.map(({ columna, ...c }) => c),
            extras: extras.map(({ columna, ...c }) => c),
            avisos
        };
    }

    /** Índices de las columnas Grupo, Asignatura y Docente (-1 si no existen). */
    function columnasMeta(normal) {
        return {
            grupo: normal.findIndex(h => RE_GRUPO.test(h)),
            asignatura: normal.findIndex(h => RE_ASIGNATURA.test(h)),
            docente: normal.findIndex(h => RE_DOCENTE.test(h))
        };
    }

    /**
     * Si la hoja tiene columna de grupo o de asignatura con varios valores, la divide en una hoja por grupo
     * (conservando las filas de encabezado). Devuelve null si la hoja es de un solo grupo.
     * @returns {Array<{ valor: string, filas: Array<Array> }>|null}
     */
    function dividirPorGrupo(filas) {
        const iEnc = buscarFilaEncabezado(filas);
        if (iEnc < 0) return null;
        const meta = columnasMeta((filas[iEnc] || []).map(c => U.normalizarTexto(c)));
        const cols = [meta.asignatura, meta.grupo].filter(i => i >= 0);
        if (!cols.length) return null;
        const partes = new Map();
        filas.slice(iEnc + 1).forEach(f => {
            if (!(f || []).some(c => String(c ?? '').trim())) return;
            const valor = cols.map(i => String(f?.[i] ?? '').trim()).filter(Boolean).join(' · ') || 'Sin grupo';
            if (!partes.has(valor)) partes.set(valor, []);
            partes.get(valor).push(f);
        });
        if (partes.size < 2) return null;
        const cabecera = filas.slice(0, iEnc + 1);
        return [...partes.entries()]
            .sort((a, b) => a[0].localeCompare(b[0], 'es', { numeric: true }))
            .map(([valor, filasGrupo]) => ({ valor, filas: [...cabecera, ...filasGrupo] }));
    }

    /** ¿La hoja parece un catálogo de competencias (y no una planilla de notas)? */
    function esHojaCompetencias(filas) {
        for (let i = 0; i < Math.min(filas.length, 10); i++) {
            const n = (filas[i] || []).map(c => U.normalizarTexto(c));
            if (n.some(c => /^competencias?/.test(c))) return buscarFilaEncabezado(filas) < 0;
        }
        return false;
    }

    /**
     * Lee el catálogo de competencias: una hoja por curso, con columnas de competencia y criterio de evaluación.
     * Se conservan las demás columnas (recursos por competencia o cualquier otro dato).
     * @param {Array<{ nombre: string, filas: Array<Array> }>} hojas
     */
    function leerCompetencias(hojas) {
        const cursos = [];
        const avisos = [];
        const ids = new Set();
        hojas.forEach(({ nombre, filas }) => {
            if (!filas.some(f => (f || []).some(c => String(c ?? '').trim()))) return;
            let iEnc = -1;
            for (let i = 0; i < Math.min(filas.length, 10); i++) {
                if ((filas[i] || []).some(c => /competencia/.test(U.normalizarTexto(c)))) { iEnc = i; break; }
            }
            const enc = iEnc >= 0 ? (filas[iEnc] || []).map(c => String(c ?? '').trim()) : [];
            const norm = enc.map(h => U.normalizarTexto(h));
            let colComp = norm.findIndex(h => /competencia/.test(h));
            if (colComp < 0) colComp = 0;
            let colCrit = norm.findIndex(h => /criterio|indicador|evidencia|desempeno/.test(h));
            if (colCrit < 0 && iEnc < 0) colCrit = 1;
            const otras = enc.map((h, i) => ({ h, i })).filter(c => c.h && c.i !== colComp && c.i !== colCrit)
                .map(c => ({ ...c, rol: rolTexto(c.h) }));

            const competencias = [];
            const notas = [];
            const filasDatos = filas.slice(iEnc + 1);
            const numeradas = filasDatos.filter(f => /^\d+\s*[.)\-–:]/.test(String(f?.[colComp] ?? '').trim())).length;
            filasDatos.forEach((f, k) => {
                const bruto = String(f?.[colComp] ?? '').trim();
                if (!bruto) return;
                const m = /^(\d+)\s*[.)\-–:]\s*(.+)$/s.exec(bruto);
                // En hojas numeradas, un texto sin número ni criterio es una nota aclaratoria del curso.
                if (!m && numeradas >= 3 && !String(f?.[colCrit] ?? '').trim()) { notas.push(bruto); return; }
                const numero = m ? +m[1] : competencias.length + 1;
                const texto = (m ? m[2] : bruto).trim();
                const criterio = colCrit >= 0 ? String(f?.[colCrit] ?? '').trim().replace(/^[-–•*]\s*/, '') : '';
                const recursos = {};
                const datos = {};
                otras.forEach(c => {
                    const v = String(f?.[c.i] ?? '').trim();
                    if (!v) return;
                    if (CONFIG.TIPOS_RECURSO[c.rol]) (recursos[c.rol] ||= []).push(...U.lineas(v));
                    else datos[c.h] = v;
                });
                competencias.push({ numero, texto, criterio, recursos, datos, fila: iEnc + 2 + k });
            });
            if (!competencias.length) { avisos.push(`La hoja "${nombre}" no tiene competencias.`); return; }

            let id = U.nombreArchivoSeguro(nombre);
            while (ids.has(id)) id += '_';
            ids.add(id);
            competencias.forEach(c => { c.id = `${id}#${c.numero}`; });
            const repetidos = competencias.length - new Set(competencias.map(c => c.id)).size;
            if (repetidos) {
                competencias.forEach((c, i) => { c.id = `${id}#${i + 1}`; });
                avisos.push(`La hoja "${nombre}" tiene numeraciones repetidas; se renumeraron.`);
            }
            if (nombre.length === 31) avisos.push(`El nombre de la hoja "${nombre}" parece recortado por Excel (31 caracteres); puede corregirlo en la aplicación.`);
            cursos.push({ id, nombre, hoja: nombre, competencias, notas });
        });
        if (!cursos.length) throw new Error('El archivo no contiene hojas con competencias.');
        return { cursos, avisos };
    }

    /**
     * Lee un CSV (separado por coma, punto y coma o tabulación) como libro de SheetJS.
     * Si se usa ";" como separador, la coma se interpreta como decimal ("3,5").
     */
    function leerTextoCSV(texto, XLSX, nombreHoja = 'CSV') {
        const limpio = String(texto).replace(/^\uFEFF/, '');
        const muestra = limpio.split(/\r?\n/).slice(0, 10).join('\n');
        const cuenta = sep => (muestra.match(new RegExp(sep === '\t' ? '\t' : `\\${sep}`, 'g')) || []).length;
        const sep = [';', '\t', ','].sort((a, b) => cuenta(b) - cuenta(a))[0];
        const filas = parsearCSV(limpio, sep).map(f => f.map(v => {
            const t = v.trim();
            if (t === '') return '';
            const n = U.interpretarNumero(t);
            return n !== null && /^[-+]?\d+([.,]\d+)?$/.test(t) && !/^0\d/.test(t) ? n : t;
        }));
        const libro = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(libro, XLSX.utils.aoa_to_sheet(filas), String(nombreHoja).slice(0, 31) || 'CSV');
        return libro;
    }

    /** Separa un CSV respetando comillas ("texto, con coma" y comillas dobles escapadas). */
    function parsearCSV(texto, sep) {
        const filas = [];
        let fila = [];
        let campo = '';
        let comillas = false;
        for (let i = 0; i < texto.length; i++) {
            const ch = texto[i];
            if (comillas) {
                if (ch === '"' && texto[i + 1] === '"') { campo += '"'; i++; } else if (ch === '"') comillas = false; else campo += ch;
            } else if (ch === '"' && campo.trim() === '') { comillas = true; campo = ''; } else if (ch === sep) { fila.push(campo); campo = ''; } else if (ch === '\n' || ch === '\r') {
                if (ch === '\r' && texto[i + 1] === '\n') i++;
                fila.push(campo); filas.push(fila); fila = []; campo = '';
            } else campo += ch;
        }
        if (campo !== '' || fila.length) { fila.push(campo); filas.push(fila); }
        return filas.filter(f => f.some(c => String(c).trim() !== ''));
    }

    /** Convierte un libro de SheetJS en [{ nombre, filas }]. */
    function hojasDeLibro(libro, XLSX) {
        return libro.SheetNames.map(nombre => ({
            nombre,
            filas: XLSX.utils.sheet_to_json(libro.Sheets[nombre], { header: 1, defval: '', raw: true, blankrows: false })
        }));
    }

    /**
     * Analiza un libro de notas (Excel u hoja CSV): lee cada hoja con estudiantes, la divide por grupo
     * si tiene una columna Grupo/Asignatura con varios valores, y detecta hojas de competencias incluidas.
     * @returns {{ hojas: Array<{ nombre, hoja, valor, resultado?, error? }>, competencias: object|null }}
     *   Cada elemento de `hojas` con resultado es un grupo.
     */
    function leerLibroNotas(libro, XLSX, opciones = {}) {
        const hojas = hojasDeLibro(libro, XLSX);
        const resultado = { hojas: [], competencias: null };
        const hojasComp = [];
        hojas.forEach(h => {
            if (esHojaCompetencias(h.filas)) { hojasComp.push(h); return; }
            const partes = dividirPorGrupo(h.filas) || [{ valor: '', filas: h.filas }];
            partes.forEach(p => {
                const nombre = p.valor ? `${h.nombre} · ${p.valor}` : h.nombre;
                try {
                    resultado.hojas.push({ nombre, hoja: h.nombre, valor: p.valor, resultado: leerNotas(p.filas, { ...opciones, hoja: h.nombre }) });
                } catch (e) {
                    resultado.hojas.push({ nombre, hoja: h.nombre, valor: p.valor, error: e.message });
                }
            });
        });
        if (hojasComp.length) {
            try { resultado.competencias = leerCompetencias(hojasComp); } catch (e) { /* sin competencias */ }
        }
        return resultado;
    }

    const Lectura = {
        leerNotas, leerCompetencias, leerLibroNotas, hojasDeLibro, esHojaCompetencias, dividirPorGrupo, columnasMeta, leerTextoCSV,
        clasificarEncabezado, clasificarInformativa, letraColumna
    };
    global.Lectura = Lectura;
    if (typeof module !== 'undefined' && module.exports) module.exports = Lectura;
})(typeof window !== 'undefined' ? window : globalThis);
