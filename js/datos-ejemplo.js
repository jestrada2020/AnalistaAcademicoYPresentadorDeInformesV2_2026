/**
 * Datos de ejemplo para conocer la aplicación sin tener archivos a la mano: tres grupos de
 * Cálculo Diferencial en una sola hoja (columnas Asignatura, Grupo y Docente).
 * Las filas pasan por el mismo lector que los archivos reales, incluida la división por grupo.
 */
(function (global) {
    'use strict';

    const Lectura = global.Lectura || require('./lectura.js');
    const Estado = global.Estado || require('./estado.js');

    const APELLIDOS = ['Álvarez', 'Benítez', 'Cardona', 'Díaz', 'Echeverri', 'Franco', 'García', 'Hernández', 'Isaza', 'Jaramillo', 'López', 'Marín', 'Naranjo', 'Ochoa', 'Pérez', 'Quiroz', 'Restrepo', 'Sánchez', 'Toro', 'Uribe', 'Vélez', 'Zapata', 'Gómez', 'Ríos', 'Mejía', 'Ospina', 'Tobón', 'Henao', 'Salazar', 'Montoya'];
    const NOMBRES = ['Laura', 'Santiago', 'Valentina', 'Juan José', 'Sara', 'Miguel Ángel', 'Isabella', 'Tomás', 'Mariana', 'Samuel', 'Daniela', 'Emmanuel', 'Antonia', 'David', 'Luciana', 'Nicolás', 'Gabriela', 'Matías', 'Salomé', 'Andrés', 'Manuela', 'Jerónimo', 'Sofía', 'Alejandro'];

    // El orden importa: «Distribuir competencias» da a 1P las 3 primeras (sobre todo analíticas),
    // a 2P las 3 siguientes (prácticas y de pensamiento crítico) y a 3P las 4 últimas.
    const COMPETENCIAS = [
        ['1. Comprender el concepto de límite de una función.', '- Interpretación del límite en gráficas y tablas.'],
        ['2. Analizar la continuidad de una función en un punto y en un intervalo.', '- Identificación de discontinuidades y su tipo.'],
        ['3. Aplicar las reglas básicas de derivación.', '- Uso correcto de las reglas de la potencia, producto y cociente.'],
        ['4. Aplicar la regla de la cadena.', '- Derivación correcta de funciones compuestas.'],
        ['5. Resolver problemas de razón de cambio en contextos físicos y económicos.', '- Planteamiento y solución de problemas aplicados.'],
        ['6. Justificar la existencia de máximos y mínimos con los criterios de la derivada.', '- Argumentación de cada paso del análisis.'],
        ['7. Interpretar la derivada como pendiente y como razón de cambio.', '- Interpretación geométrica y física de la derivada.'],
        ['8. Calcular derivadas de funciones trigonométricas, exponenciales y logarítmicas.', '- Precisión en la derivación de funciones trascendentes.'],
        ['9. Formular y resolver modelos de optimización en situaciones reales.', '- Modelado, solución y validación del resultado en el contexto.'],
        ['10. Trazar gráficas de funciones usando la derivada.', '- Construcción completa de la gráfica: crecimiento, concavidad y asíntotas.']
    ];

    // Cada grupo tiene fortalezas distintas por carácter, para que el análisis del programa lo muestre.
    const GRUPOS = [
        { grupo: '01', docente: 'Ana María Restrepo', n: 20, base: 3.2, efecto: { analitico: 0.4, practico: 0.2, critico: -0.7 } },
        { grupo: '02', docente: 'Carlos Andrés Gil', n: 18, base: 2.8, efecto: { analitico: -0.5, practico: 0.3, critico: -0.3 } },
        { grupo: '03', docente: 'Luisa Fernanda Mora', n: 22, base: 3.4, efecto: { analitico: 0.1, practico: -0.1, critico: 0.2 } }
    ];

    // Carácter aproximado de cada evaluación calificada (según las competencias que le tocan al distribuir).
    const PERFIL = {
        '1P': { analitico: 2 / 3, practico: 1 / 3 }, Q1: { analitico: 2 / 3, practico: 1 / 3 },
        '2P': { practico: 1 / 3, critico: 2 / 3 }, Q2: { practico: 1 / 3, critico: 2 / 3 },
        TALLER1: { critico: 1 }
    };

    /** Generador pseudoaleatorio con semilla (siempre produce los mismos datos). */
    function aleatorio(semilla) {
        let s = semilla;
        return () => { s = (s * 1103515245 + 12345) % 2147483648; return s / 2147483648; };
    }

    function filasNotas() {
        const r = aleatorio(2026);
        const filas = [['Documento', 'Nombres y Apellidos', 'Asignatura', 'Grupo', 'Docente', '1P', '2P', '3P', 'Q1', 'Q2', 'Q3', 'Taller 1', 'Definitiva', 'Inasistencias', 'Observaciones']];
        let k = 0;
        GRUPOS.forEach(gr => {
            for (let i = 0; i < gr.n; i++, k++) {
                const nombre = `${APELLIDOS[k % APELLIDOS.length]} ${APELLIDOS[(k * 7 + 3) % APELLIDOS.length]} ${NOMBRES[(k * 5) % NOMBRES.length]}`;
                const capacidad = gr.base + (r() - 0.5) * 3;
                const nota = (clave, desv = 0.7) => {
                    const efecto = Object.entries(PERFIL[clave]).reduce((s, [d, w]) => s + gr.efecto[d] * w, 0);
                    return Math.max(0, Math.min(5, Math.round((capacidad + efecto + (r() - 0.5) * 2 * desv) * 10) / 10));
                };
                const fila = [String(1000100200 + k * 137), nombre, 'Cálculo Diferencial', gr.grupo, gr.docente,
                    nota('1P'), nota('2P'), '', nota('Q1', 1.1), nota('Q2', 1.1), '', nota('TALLER1', 0.5)];
                if (k === 6) fila[6] = 'NP';
                if (k === 13) fila[8] = '';
                if (k === 45) [5, 6, 8, 9, 11].forEach(c => { fila[c] = ''; }); // estudiante que no volvió
                const n = c => (typeof fila[c] === 'number' ? fila[c] : 0);
                const def = Math.round((n(5) * 0.3 + n(6) * 0.3 + n(8) * 0.1 + n(9) * 0.1 + n(11) * 0.2) * 10) / 10;
                fila.push(def, Math.floor(r() * 6), k === 4 ? 'Presentó incapacidad médica en semana 6' : '');
                filas.push(fila);
            }
        });
        return filas;
    }

    /** Proyecto de ejemplo con tres grupos y el catálogo de competencias compartido. */
    function crearProyectoEjemplo() {
        const partes = Lectura.dividirPorGrupo(filasNotas());
        const catalogo = Lectura.leerCompetencias([{ nombre: 'Cálculo Diferencial', filas: [['Competencias', 'Criterios de Evaluación'], ...COMPETENCIAS] }]);
        const pesos = { '1P': 20, '2P': 20, '3P': 20, Q1: 8, Q2: 8, Q3: 8, TALLER1: 16 };
        const fechas = { '1P': '2026-08-21', '2P': '2026-09-18', '3P': '2026-10-30', Q1: '2026-08-14', Q2: '2026-09-11', Q3: '2026-10-23', TALLER1: '2026-09-25' };
        let cursos = null;
        const grupos = partes.map(p => {
            const d = Estado.grupoInicial();
            const r = Lectura.leerNotas(p.filas, { hoja: 'Notas' });
            d.origen = { archivo: 'ejemplo.xlsx', hoja: 'Notas', valor: p.valor };
            d.curso = { institucion: 'Institución Universitaria de Ejemplo', programa: 'Ingeniería de Sistemas', asignatura: r.grupo.asignatura, grupo: r.grupo.grupo, periodo: '2026-2', docente: r.grupo.docente, correo: '', ciudad: 'Medellín' };
            Estado.aplicarNotas(r, 'ejemplo.xlsx', d);
            Estado.aplicarCompetencias(catalogo, 'ejemplo_competencias.xlsx', d);
            if (cursos) d.competencias.cursos = cursos; else cursos = d.competencias.cursos;
            d.evaluaciones.forEach(ev => { ev.peso = pesos[ev.clave] ?? ev.peso; ev.fecha = fechas[ev.clave] || ''; });
            Estado.distribuirCompetencias(d.competencias.cursoActivo, d);
            const taller = d.evaluaciones.find(e => e.clave === 'TALLER1');
            if (taller) { taller.nombre = 'Proyecto de modelación'; taller.caracter = 'critico'; taller.competencias = ['calculo_diferencial#5', 'calculo_diferencial#9']; }
            const p1 = d.evaluaciones.find(e => e.clave === '1P');
            if (p1) {
                p1.recursos.web = 'Límites – Khan Academy | https://es.khanacademy.org/math/calculus-all-old/limits-and-continuity-calc';
                p1.recursos.videos = 'Julioprofe – Límites por factorización | https://www.youtube.com/results?search_query=julioprofe+limites+factorizacion';
                p1.recursos.ejercicios = 'Stewart, Cálculo de una variable: sección 2.3, ejercicios 11 a 32';
                p1.recursos.herramientas = 'GeoGebra | https://www.geogebra.org/calculator\nDesmos | https://www.desmos.com/calculator';
            }
            d.informe.mensaje = 'Asesorías: martes y jueves de 2:00 a 4:00 p. m. en la oficina B-305.';
            d.nombre = Estado.nombreSugerido(d);
            return d;
        });
        grupos[0].observaciones[grupos[0].estudiantes[0].id] = 'Participa activamente en clase. Debe practicar más ejercicios de la regla de la cadena.';
        return { version: 4, grupos, activo: grupos[0].id, catalogo: { archivo: 'ejemplo_competencias.xlsx', cursos, avisos: [] } };
    }

    /** Un solo grupo de ejemplo (el primero). */
    function crearEstadoEjemplo() {
        return crearProyectoEjemplo().grupos[0];
    }

    const DatosEjemplo = { crearProyectoEjemplo, crearEstadoEjemplo, filasNotas };
    global.DatosEjemplo = DatosEjemplo;
    if (typeof module !== 'undefined' && module.exports) module.exports = DatosEjemplo;
})(typeof window !== 'undefined' ? window : globalThis);
