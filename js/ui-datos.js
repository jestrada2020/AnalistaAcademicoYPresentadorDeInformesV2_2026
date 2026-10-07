/**
 * Pestaña 1 · Datos: carga de una o varias planillas de notas (Excel o CSV; cada archivo, hoja o valor
 * de la columna Grupo es un grupo), catálogo de competencias, datos del grupo, escala y niveles.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);

    function esCSV(archivo) { return /\.(csv|txt)$/i.test(archivo.name); }

    function leerComo(archivo, modo, codificacion) {
        return new Promise((resolve, reject) => {
            const lector = new FileReader();
            lector.onload = ev => resolve(ev.target.result);
            lector.onerror = () => reject(new Error(`No se pudo abrir «${archivo.name}».`));
            if (modo === 'texto') lector.readAsText(archivo, codificacion); else lector.readAsArrayBuffer(archivo);
        });
    }

    /** Lee un Excel (o CSV) como libro de SheetJS. Los CSV se leen en UTF-8 y, si no lo son, en Windows-1252 (Excel en español). */
    async function leerLibro(archivo) {
        if (typeof XLSX === 'undefined') throw new Error('No se cargó la librería de Excel (SheetJS). Revise la conexión a internet y recargue la página.');
        try {
            if (esCSV(archivo)) {
                let texto = await leerComo(archivo, 'texto', 'utf-8');
                if (texto.includes('�')) texto = await leerComo(archivo, 'texto', 'windows-1252');
                return Lectura.leerTextoCSV(texto, XLSX, 'CSV');
            }
            return XLSX.read(new Uint8Array(await leerComo(archivo, 'binario')), { type: 'array', cellDates: true });
        } catch (err) {
            throw new Error(`No se pudo leer «${archivo.name}»: ${err.message}`);
        }
    }

    function validarArchivo(archivo) {
        if (!archivo) return false;
        if (!/\.(xlsx|xlsm|xls|csv|txt|ods)$/i.test(archivo.name)) {
            mostrarNotificacion('Archivo no válido', `«${archivo.name}» no es una hoja de cálculo (.xlsx, .xls, .csv u .ods).`, 'error');
            return false;
        }
        return true;
    }

    // ---------------------------------------------------------------- Notas (uno o varios grupos)

    async function cargarNotas(archivos) {
        const lista = [...archivos].filter(validarArchivo);
        if (!lista.length) return;
        await U.conCargando(`Leyendo ${lista.length === 1 ? 'la planilla' : `${lista.length} archivos`}...`, async () => {
            const cargados = [];
            const errores = [];
            let catalogo = null;
            for (const archivo of lista) {
                try {
                    const libro = await leerLibro(archivo);
                    const lectura = Lectura.leerLibroNotas(libro, XLSX, { escala: Estado.obtener().escala });
                    const validas = lectura.hojas.filter(h => h.resultado);
                    if (lectura.competencias && !catalogo) catalogo = { resultado: lectura.competencias, archivo: archivo.name };
                    if (!validas.length) {
                        if (!lectura.competencias) errores.push(`${archivo.name}: no se encontraron estudiantes (${lectura.hojas.map(h => h.error).filter(Boolean)[0] || 'el libro no tiene hojas'}).`);
                        continue;
                    }
                    validas.forEach(h => cargados.push({ ...Estado.agregarGrupo(h, archivo.name), archivo: archivo.name }));
                } catch (err) {
                    errores.push(err.message);
                }
            }
            if (catalogo && (!Estado.obtenerProyecto().catalogo || !cargados.length)) {
                Estado.aplicarCompetencias(catalogo.resultado, catalogo.archivo);
                mostrarNotificacion('Competencias encontradas', `«${catalogo.archivo}» trae un catálogo de competencias; se cargó para todos los grupos.`, 'info');
            }
            if (cargados.length) Estado.activar(cargados[0].grupo.id);
            Estado.confirmar({ origen: 'notas' });
            if (cargados.length) {
                const nuevos = cargados.filter(c => c.nuevo).length;
                const est = cargados.reduce((s, c) => s + c.grupo.estudiantes.length, 0);
                mostrarNotificacion(cargados.length === 1 ? 'Grupo cargado' : `${cargados.length} grupos cargados`,
                    `${cargados.map(c => `${c.grupo.nombre} (${c.grupo.estudiantes.length})`).join(' · ')}. Total: ${est} estudiantes.` +
                    (cargados.length - nuevos ? ` ${cargados.length - nuevos} grupo(s) se actualizaron porque ya estaban cargados.` : ''), 'success', 8000);
            }
            if (errores.length) mostrarNotificacion('Algunos archivos no se cargaron', errores.join('\n'), 'error', 10000);
        });
    }

    // ---------------------------------------------------------------- Grupos

    async function eliminarGrupo(id) {
        const g = Estado.grupos().find(x => x.id === id);
        if (!g) return;
        if (!await confirmar(`Se quitará el grupo «${g.nombre}» con sus ${g.estudiantes.length} estudiantes, porcentajes y observaciones.`, { titulo: 'Quitar grupo', textoAceptar: 'Quitar', peligro: true })) return;
        Estado.eliminarGrupo(id);
        Estado.confirmar({ origen: 'grupos' });
        mostrarNotificacion('Grupo quitado', g.nombre, 'info', 3000);
    }

    function renderListaGrupos() {
        const cont = $('listaGrupos');
        const grupos = Estado.grupos();
        const activo = Estado.obtener();
        const conDatos = grupos.filter(g => g.estudiantes.length);
        if (!conDatos.length) { cont.innerHTML = ''; return; }
        const cursos = Estado.obtenerProyecto().catalogo?.cursos || [];
        const total = conDatos.reduce((s, g) => s + g.estudiantes.length, 0);
        cont.innerHTML = `<div class="flex items-center justify-between mb-2"><span class="text-sm font-semibold text-gray-700">Grupos cargados: ${conDatos.length} · ${total} estudiantes</span>
            ${conDatos.length > 1 ? '<button type="button" class="btn btn-ghost btn-sm" data-ir-programa>Ver análisis del programa →</button>' : ''}</div>
            <div class="table-wrapper"><table class="data-table data-table-compact lista-grupos"><thead><tr><th>Grupo y origen</th><th class="num">Est.</th>${cursos.length ? '<th>Curso de competencias</th>' : ''}<th class="text-right">Acciones</th></tr></thead><tbody>${
            conDatos.map(g => `<tr data-grupo="${e(g.id)}" class="${g.id === activo.id ? 'grupo-activo' : ''}">
                <td><input class="form-input input-tabla" data-nombre-grupo value="${e(g.nombre)}" aria-label="Nombre del grupo" title="Puede cambiar el nombre del grupo">
                    <div class="text-xs text-gray-500 mt-1 truncate" title="${e(g.archivoNotas?.nombre || '')}">${e(g.archivoNotas?.nombre || '')}${g.origen?.hoja && !/^(csv)$/i.test(g.origen.hoja) ? ` · ${e(g.origen.hoja)}` : ''}${g.origen?.valor ? ` · <b>${e(g.origen.valor)}</b>` : ''}</div></td>
                <td class="num">${g.estudiantes.length}</td>
                ${cursos.length ? `<td><select class="form-input input-tabla" data-curso-grupo aria-label="Curso de competencias de ${e(g.nombre)}">${cursos.map(c => `<option value="${e(c.id)}" ${c.id === g.competencias?.cursoActivo ? 'selected' : ''}>${e(c.nombre)}</option>`).join('')}</select></td>` : ''}
                <td class="whitespace-nowrap text-right">${g.id === activo.id ? '<span class="badge badge-ok" title="Las pestañas 2 a 5 muestran este grupo">Activo</span>' : '<button type="button" class="btn btn-secondary btn-sm" data-activar title="Mostrar este grupo en las pestañas 2 a 5">Activar</button>'}
                    <button type="button" class="icon-btn peligro" data-quitar-grupo aria-label="Quitar grupo ${e(g.nombre)}" title="Quitar grupo">✕</button></td>
            </tr>`).join('')}</tbody></table></div>`;
    }

    // ---------------------------------------------------------------- Competencias

    async function cargarCompetencias(archivo) {
        if (!validarArchivo(archivo)) return;
        await U.conCargando('Leyendo el catálogo de competencias...', async () => {
            const libro = await leerLibro(archivo);
            const resultado = Lectura.leerCompetencias(Lectura.hojasDeLibro(libro, XLSX));
            aplicarCatalogo(resultado, archivo.name);
        });
    }

    function aplicarCatalogo(resultado, nombreArchivo) {
        Estado.aplicarCompetencias(resultado, nombreArchivo);
        let repartidos = 0;
        Estado.grupos().forEach(g => {
            if (g.evaluaciones.length && g.competencias?.cursoActivo && g.evaluaciones.every(ev => !(ev.competencias || []).length)) {
                Estado.distribuirCompetencias(g.competencias.cursoActivo, g);
                repartidos++;
            }
        });
        Estado.confirmar({ origen: 'competencias' });
        const total = resultado.cursos.reduce((s, c) => s + c.competencias.length, 0);
        const porDim = {};
        resultado.cursos.forEach(c => c.competencias.forEach(x => { const k = Analisis.dimensionDe(x); porDim[k] = (porDim[k] || 0) + 1; }));
        mostrarNotificacion('Competencias cargadas',
            `${resultado.cursos.length} cursos y ${total} competencias: ${Object.entries(CONFIG.DIMENSIONES).map(([k, d]) => `${porDim[k] || 0} ${d.etiqueta.toLowerCase()}`).join(', ')}.` +
            (repartidos ? ` Se repartieron automáticamente entre las evaluaciones de ${repartidos} grupo(s); puede ajustarlas en la pestaña 2.` : ''), 'success', 8000);
    }

    async function cambiarCursoGrupo(g, id) {
        if (!g.competencias) return;
        g.competencias.cursoActivo = id;
        const asignadas = g.evaluaciones.some(ev => (ev.competencias || []).length);
        const delCurso = g.evaluaciones.some(ev => (ev.competencias || []).some(c => c.startsWith(`${id}#`)));
        if (g.evaluaciones.length && !delCurso && (!asignadas || await confirmar(`¿Desea reemplazar las competencias asociadas a las evaluaciones de «${g.nombre}» por las de este curso?\n\nSe repartirán automáticamente; después puede ajustarlas en la pestaña 2.`, { titulo: 'Cambiar de curso', textoAceptar: 'Reemplazar' }))) {
            Estado.distribuirCompetencias(id, g);
        }
        Estado.confirmar({ origen: 'curso' });
    }

    async function cursoATodos() {
        const d = Estado.obtener();
        const id = d.competencias?.cursoActivo;
        if (!id) return;
        const otros = Estado.gruposConDatos().filter(g => g.id !== d.id && g.competencias?.cursoActivo !== id);
        if (!otros.length) { mostrarNotificacion('Sin cambios', 'Todos los grupos ya usan este curso.', 'info'); return; }
        if (!await confirmar(`Los ${otros.length} grupo(s) restantes usarán «${Estado.cursoActivo(d).nombre}» y sus competencias se repartirán automáticamente entre sus evaluaciones.`, { titulo: 'Usar el curso en todos los grupos', textoAceptar: 'Aplicar' })) return;
        otros.forEach(g => { g.competencias.cursoActivo = id; Estado.distribuirCompetencias(id, g); });
        Estado.confirmar({ origen: 'curso' });
        mostrarNotificacion('Curso aplicado', `${otros.length} grupo(s) actualizados.`, 'success');
    }

    // ---------------------------------------------------------------- Plantilla y ejemplo

    function descargarPlantilla() {
        const libro = XLSX.utils.book_new();
        const notas = XLSX.utils.aoa_to_sheet([
            ['ID', 'Nombres y Apellidos', 'Asignatura', 'Grupo', 'Docente', '1P', '2P', '3P', '4P', 'Q1', 'Q2', 'Q3', 'Q4', 'Taller 1', 'Observaciones'],
            [1000000001, 'Apellido Apellido Nombre', 'Álgebra Básica', '01', 'Nombre del docente', 3.5, '', '', '', 4, '', '', '', '', ''],
            [1000000002, 'Apellido Apellido Nombre', 'Álgebra Básica', '01', 'Nombre del docente', 'NP', '', '', '', 2.8, '', '', '', '', 'Ejemplo de observación'],
            [1000000003, 'Apellido Apellido Nombre', 'Álgebra Básica', '02', 'Otro docente', 4.1, '', '', '', 3.6, '', '', '', '', '']
        ]);
        notas['!cols'] = [{ wch: 14 }, { wch: 34 }, { wch: 18 }, { wch: 7 }, { wch: 20 }, ...Array(9).fill({ wch: 7 }), { wch: 30 }];
        XLSX.utils.book_append_sheet(libro, notas, 'Notas');
        const comp = XLSX.utils.aoa_to_sheet([
            ['Competencias', 'Criterios de Evaluación', 'Páginas web', 'Videos', 'Ejercicios', 'Herramientas'],
            ['1. Comprender el concepto de ...', '- Interpretación correcta de ...', 'Título | https://...', '', 'Libro guía pág. 10, ej. 1-15', 'GeoGebra | https://www.geogebra.org'],
            ['2. Aplicar ... para resolver ...', '- Uso correcto de ...'],
            ['3. Justificar / evaluar / modelar ... en situaciones reales.', '- Argumentación y validación del resultado.']
        ]);
        comp['!cols'] = [{ wch: 60 }, { wch: 50 }, { wch: 30 }, { wch: 30 }, { wch: 30 }, { wch: 30 }];
        XLSX.utils.book_append_sheet(libro, comp, 'Competencias (ejemplo)');
        const ayuda = XLSX.utils.aoa_to_sheet([
            ['Cómo llenar la planilla'],
            ['• Una fila por estudiante. La columna de nombres es obligatoria; el documento (ID) es recomendado.'],
            ['• Varios grupos: use una hoja por grupo, un archivo por grupo, o una sola hoja con la columna «Grupo» (y si quiere «Asignatura» y «Docente»).'],
            ['• También se aceptan archivos CSV (separados por coma o punto y coma) con las mismas columnas.'],
            ['• Parciales: 1P, 2P… o «Parcial 1». Quices: Q1, Q2… Talleres: «Taller 1». Examen final: «Final».'],
            ['• Deje vacías las evaluaciones que aún no se han hecho: se consideran pendientes.'],
            ['• Escriba NP si el estudiante no presentó una evaluación.'],
            ['• Columnas como Definitiva, Faltas u Observaciones se leen y se muestran en los informes, pero no entran en la nota.'],
            ['• El catálogo de competencias puede ir en otro archivo: una hoja por curso con «Competencias» y «Criterios de Evaluación».'],
            ['• Cada competencia se clasifica por su verbo inicial: analítica (comprender, analizar, interpretar…), práctica (aplicar, resolver, calcular…) o de pensamiento crítico (evaluar, justificar, modelar, formular…).']
        ]);
        ayuda['!cols'] = [{ wch: 120 }];
        XLSX.utils.book_append_sheet(libro, ayuda, 'Instrucciones');
        XLSX.writeFile(libro, 'plantilla_notas_competencias.xlsx');
    }

    async function cargarEjemplo() {
        const hay = Estado.gruposConDatos().length;
        if (hay && !await confirmar('Se reemplazarán todos los grupos cargados por los de ejemplo. ¿Continuar?\n\nSi quiere conservarlos, use antes «Guardar respaldo».', { titulo: 'Cargar ejemplo', textoAceptar: 'Cargar ejemplo', peligro: true })) return;
        Estado.reemplazarProyecto(DatosEjemplo.crearProyectoEjemplo());
        mostrarNotificacion('Ejemplo cargado', '3 grupos de Cálculo Diferencial (60 estudiantes) con 7 evaluaciones y 10 competencias analíticas, prácticas y de pensamiento crítico. Vea la pestaña 6 para el análisis del programa.', 'success', 8000);
    }

    // ---------------------------------------------------------------- Render

    function chip(texto, clase, titulo = '') {
        return `<span class="chip ${clase}" ${titulo ? `title="${e(titulo)}"` : ''}>${e(texto)}</span>`;
    }

    function renderResumenNotas(d) {
        const cont = $('resumenNotas');
        if (!d.estudiantes.length) {
            cont.innerHTML = Estado.gruposConDatos().length ? '' : '<p class="text-sm text-gray-500">Aún no se ha cargado ninguna planilla. Puede cargar varios archivos a la vez (uno por grupo) o un solo archivo con varias hojas o con una columna «Grupo».</p>';
            return;
        }
        const a = d.archivoNotas || {};
        const pend = d.evaluaciones.filter(ev => !Analisis.estaCalificada(d, ev));
        let h = `<div class="archivo-cargado">✔ <span>Grupo activo: <b>${e(d.nombre)}</b> · ${e(a.nombre || 'Datos')}${a.hoja ? ` · hoja «${e(a.hoja)}»` : ''} · ${d.estudiantes.length} estudiantes${a.fecha ? ` · cargado el ${e(a.fecha)}` : ''}</span></div>`;
        h += `<div class="text-xs font-semibold text-gray-600 mb-1">Evaluaciones (${d.evaluaciones.length})</div><div class="chips mb-3">${d.evaluaciones.map(ev => {
            const p = pend.includes(ev);
            return chip(`${ev.encabezado || ev.clave}${p ? ' · pendiente' : ''}`, `chip-${ev.tipo}${p ? ' chip-pendiente' : ''}`, `${ev.nombre} – ${CONFIG.TIPOS_EVALUACION[ev.tipo] || ev.tipo}`);
        }).join('') || '<span class="text-sm text-gray-500">Ninguna</span>'}</div>`;
        if (d.columnasInfo.length || d.columnasTexto.length) {
            h += `<div class="text-xs font-semibold text-gray-600 mb-1">Otras columnas leídas (se muestran en los informes)</div><div class="chips mb-3">
                ${d.columnasInfo.map(c => chip(`${c.encabezado} · ${CONFIG.TIPOS_INFORMATIVA[c.tipo] || c.tipo}`, 'chip-info')).join('')}
                ${d.columnasTexto.map(c => chip(`${c.nombre} · ${CONFIG.TIPOS_RECURSO[c.rol] || ({ competencias: 'competencias', observacion: 'observación' }[c.rol]) || 'texto'}`, 'chip-texto')).join('')}</div>`;
        }
        if (d.avisosLectura?.length) {
            h += `<details class="warning-box mt-2" ${d.avisosLectura.length <= 4 ? 'open' : ''}><summary class="cursor-pointer font-semibold text-sm">Observaciones de la lectura (${d.avisosLectura.length})</summary><ul class="lista-avisos mt-2">${d.avisosLectura.map(x => `<li>${e(x)}</li>`).join('')}</ul></details>`;
        }
        cont.innerHTML = h;
    }

    function renderCompetencias(d) {
        const cont = $('resumenCompetencias');
        const c = d.competencias;
        $('cursoWrap').classList.toggle('hidden', !c);
        $('accionesCompetencias').classList.toggle('hidden', !c);
        if (!c) { cont.innerHTML = '<p class="text-sm text-gray-500">Opcional, pero necesario para el análisis por carácter: cargue el catálogo para asociar competencias a cada evaluación, clasificarlas (analíticas, prácticas o de pensamiento crítico) y recomendar qué reforzar.</p>'; return; }
        $('cursoActivo').innerHTML = c.cursos.map(k => `<option value="${e(k.id)}" ${k.id === c.cursoActivo ? 'selected' : ''}>${e(k.nombre)} (${k.competencias.length})</option>`).join('');
        const curso = Estado.cursoActivo(d);
        if (document.activeElement !== $('nombreCurso')) $('nombreCurso').value = curso?.nombre || '';
        $('cursoATodosBtn').classList.toggle('hidden', Estado.gruposConDatos().length < 2);
        const usadas = new Set(d.evaluaciones.flatMap(ev => ev.competencias || []));
        let h = `<div class="archivo-cargado">✔ <span><b>${e(c.archivo || 'Catálogo')}</b> · ${c.cursos.length} cursos · ${c.cursos.reduce((s, k) => s + k.competencias.length, 0)} competencias</span></div>`;
        if (curso) {
            const asociadas = curso.competencias.filter(x => usadas.has(x.id)).length;
            const porDim = {};
            curso.competencias.forEach(x => { const k = Analisis.dimensionDe(x); porDim[k] = (porDim[k] || 0) + 1; });
            h += `<p class="text-sm mb-2"><b>${e(curso.nombre)}</b>: ${curso.competencias.length} competencias, ${asociadas} asociadas a evaluaciones del grupo activo.</p>`;
            h += `<div class="chips mb-2">${Object.entries(CONFIG.DIMENSIONES).map(([k, dim]) => `<span class="chip chip-dim" style="background:${dim.fondo};color:${dim.color}" title="${e(dim.descripcion)}">${e(dim.etiqueta)}: ${porDim[k] || 0}</span>`).join('')}</div>`;
            h += `<ol class="text-sm text-gray-700 space-y-1 max-h-48 overflow-y-auto pr-2">${curso.competencias.map(x => {
                const dim = CONFIG.DIMENSIONES[Analisis.dimensionDe(x)];
                return `<li><b class="text-indigo-700">${x.numero}.</b> ${e(x.texto)} <span class="chip chip-dim" style="background:${dim.fondo};color:${dim.color}">${e(dim.corta)}</span>${usadas.has(x.id) ? ' <span class="badge badge-ok">asociada</span>' : ''}</li>`;
            }).join('')}</ol>`;
            if (curso.notas?.length) h += `<details class="notas-curso"><summary class="cursor-pointer font-semibold">Notas del curso (${curso.notas.length})</summary><ul class="list-disc pl-5 mt-1">${curso.notas.map(n => `<li>${e(n)}</li>`).join('')}</ul></details>`;
        }
        if (c.avisos?.length) h += `<details class="warning-box mt-3"><summary class="cursor-pointer font-semibold text-sm">Observaciones (${c.avisos.length})</summary><ul class="lista-avisos mt-2">${c.avisos.map(x => `<li>${e(x)}</li>`).join('')}</ul></details>`;
        cont.innerHTML = h;
    }

    function asignarSiNoEnfocado(el, valor) {
        if (el && document.activeElement !== el) el.value = valor ?? '';
    }

    function renderFormularios(d) {
        document.querySelectorAll('#formCurso [data-campo]').forEach(el => asignarSiNoEnfocado(el, d.curso[el.dataset.campo]));
        document.querySelectorAll('[data-escala]').forEach(el => asignarSiNoEnfocado(el, d.escala[el.dataset.escala]));
        $('opcionVacias').checked = d.opciones.vaciasComoCero !== false;
        asignarSiNoEnfocado($('opcionUmbral'), d.opciones.umbralRiesgoAlto);
        const editor = $('nivelesEditor');
        if (!editor.contains(document.activeElement)) {
            editor.innerHTML = d.niveles.map((n, i) => `
                <div class="pref-card p-2" style="border-left:4px solid ${e(n.color)}">
                    <input class="form-input input-tabla mb-1" data-nivel="${i}" data-prop="nombre" value="${e(n.nombre)}" aria-label="Nombre del nivel ${i + 1}">
                    <input class="form-input input-tabla" type="number" step="0.1" data-nivel="${i}" data-prop="desde" value="${e(n.desde)}" aria-label="Nota desde la que aplica el nivel ${e(n.nombre)}">
                </div>`).join('');
        }
    }

    function render() {
        const d = Estado.obtener();
        renderListaGrupos();
        renderResumenNotas(d);
        renderCompetencias(d);
        renderFormularios(d);
    }

    // ---------------------------------------------------------------- Eventos

    function configurarZona(zonaId, inputId, alCargar, multiple = false) {
        const zona = $(zonaId);
        const input = $(inputId);
        input.addEventListener('change', () => { const f = [...input.files]; input.value = ''; if (f.length) alCargar(multiple ? f : f[0]); });
        ['dragenter', 'dragover'].forEach(t => zona.addEventListener(t, ev => { ev.preventDefault(); zona.classList.add('arrastrando'); }));
        ['dragleave', 'drop'].forEach(t => zona.addEventListener(t, () => zona.classList.remove('arrastrando')));
        zona.addEventListener('drop', ev => { ev.preventDefault(); const f = [...ev.dataTransfer.files]; if (f.length) alCargar(multiple ? f : f[0]); });
    }

    // Campos del curso que son del programa (se copian a todos los grupos)
    const CAMPOS_COMUNES = ['institucion', 'programa', 'periodo'];

    function init() {
        configurarZona('zonaNotas', 'archivoNotas', cargarNotas, true);
        configurarZona('zonaCompetencias', 'archivoCompetencias', cargarCompetencias);
        $('cursoActivo').addEventListener('change', ev => cambiarCursoGrupo(Estado.obtener(), ev.target.value));
        $('nombreCurso').addEventListener('change', ev => {
            const curso = Estado.cursoActivo();
            const nombre = ev.target.value.trim();
            if (curso && nombre) { curso.nombre = nombre; Estado.confirmar({ origen: 'curso' }); }
        });
        $('cursoATodosBtn').addEventListener('click', cursoATodos);
        $('revisarCaracterBtn').addEventListener('click', () => UIPrograma.abrirDimensiones());

        const lista = $('listaGrupos');
        lista.addEventListener('click', ev => {
            if (ev.target.closest('[data-ir-programa]')) { App.irA('programa'); return; }
            const fila = ev.target.closest('[data-grupo]');
            if (!fila) return;
            if (ev.target.closest('[data-activar]')) { Estado.activar(fila.dataset.grupo); Estado.confirmar({ origen: 'grupo' }); }
            if (ev.target.closest('[data-quitar-grupo]')) eliminarGrupo(fila.dataset.grupo);
        });
        lista.addEventListener('change', ev => {
            const fila = ev.target.closest('[data-grupo]');
            const g = fila && Estado.grupos().find(x => x.id === fila.dataset.grupo);
            if (!g) return;
            if (ev.target.matches('[data-nombre-grupo]')) { g.nombre = ev.target.value.trim() || Estado.nombreSugerido(g); Estado.confirmar({ origen: 'grupo' }); }
            if (ev.target.matches('[data-curso-grupo]')) cambiarCursoGrupo(g, ev.target.value);
        });

        document.querySelectorAll('#formCurso [data-campo]').forEach(el => el.addEventListener('change', () => {
            const d = Estado.obtener();
            const campo = el.dataset.campo;
            const valor = el.value.trim();
            const nombreAutomatico = d.nombre === Estado.nombreSugerido(d);
            if (CAMPOS_COMUNES.includes(campo)) Estado.aplicarATodos(g => { g.curso[campo] = valor; }); else d.curso[campo] = valor;
            // Si el nombre del grupo era el automático, se actualiza con la nueva asignatura o grupo
            if (nombreAutomatico && (campo === 'asignatura' || campo === 'grupo')) d.nombre = Estado.nombreSugerido(d);
            Estado.confirmar({ origen: 'curso' });
        }));
        document.querySelectorAll('[data-escala]').forEach(el => el.addEventListener('change', () => {
            const d = Estado.obtener();
            const v = parseFloat(el.value);
            if (Number.isNaN(v)) { el.value = d.escala[el.dataset.escala]; return; }
            const nueva = { ...d.escala, [el.dataset.escala]: el.dataset.escala === 'decimales' ? Math.max(0, Math.min(3, Math.round(v))) : v };
            if (!(nueva.minima < nueva.maxima) || nueva.aprobatoria < nueva.minima || nueva.aprobatoria > nueva.maxima) {
                mostrarNotificacion('Escala no válida', 'La nota mínima debe ser menor que la máxima y la aprobatoria debe estar entre ambas.', 'warning');
                el.value = d.escala[el.dataset.escala];
                return;
            }
            Estado.aplicarATodos(g => { g.escala = { ...nueva }; });
            Estado.confirmar({ origen: 'escala' });
        }));
        $('opcionVacias').addEventListener('change', ev => { Estado.aplicarATodos(g => { g.opciones.vaciasComoCero = ev.target.checked; }); Estado.confirmar({ origen: 'opciones' }); });
        $('opcionUmbral').addEventListener('change', ev => {
            const v = parseFloat(ev.target.value);
            if (!Number.isNaN(v)) { Estado.aplicarATodos(g => { g.opciones.umbralRiesgoAlto = v; }); Estado.confirmar({ origen: 'opciones' }); }
        });
        $('nivelesEditor').addEventListener('change', ev => {
            const el = ev.target;
            if (!el.dataset.nivel) return;
            const i = +el.dataset.nivel;
            const v = parseFloat(el.value);
            if (el.dataset.prop === 'desde' && Number.isNaN(v)) return;
            Estado.aplicarATodos(g => {
                const nivel = g.niveles[i];
                if (!nivel) return;
                if (el.dataset.prop === 'desde') nivel.desde = v; else nivel.nombre = el.value.trim() || nivel.nombre;
            });
            Estado.confirmar({ origen: 'niveles' });
        });
        $('cargarEjemploBtn').addEventListener('click', cargarEjemplo);
        $('descargarPlantillaBtn').addEventListener('click', () => {
            if (typeof XLSX === 'undefined') { mostrarNotificacion('Sin conexión', 'No se cargó la librería de Excel.', 'error'); return; }
            descargarPlantilla();
        });
    }

    global.UIDatos = { init, render, cargarNotas, cargarCompetencias };
})(window);
