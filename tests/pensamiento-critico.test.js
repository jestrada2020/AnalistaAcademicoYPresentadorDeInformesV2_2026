const test = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const Lectura = require('../js/lectura.js');
const PensamientoCritico = require('../js/pensamiento-critico.js');
const DatosEjemplo = require('../js/datos-ejemplo.js');
const Analisis = require('../js/analisis.js');
const Informes = require('../js/informes.js');
const Programa = require('../js/programa.js');

const catalogo = () => Lectura.leerCompetencias(Lectura.hojasDeLibro(XLSX.readFile('COMPETANCIASporCURSOS.xlsx'), XLSX));

test('El catálogo tiene 440 evidencias únicas y conserva las columnas originales', () => {
    const actual = XLSX.readFile('COMPETANCIASporCURSOS.xlsx');
    const anterior = XLSX.readFile('COMPETANCIASporCURSOS.backup.xlsx');
    const evidencias = [];
    assert.strictEqual(actual.SheetNames.length, 11);

    for (const nombre of actual.SheetNames) {
        const hojasActual = XLSX.utils.sheet_to_json(actual.Sheets[nombre], { header: 1, defval: '', raw: true });
        const hojasAnterior = XLSX.utils.sheet_to_json(anterior.Sheets[nombre], { header: 1, defval: '', raw: true });
        assert.strictEqual(hojasActual[0][2], 'Pensamiento Critico', nombre);
        assert.match(actual.Sheets[nombre].C1.c[0].t, /0,00–0,99 · No evidente/);
        assert.match(actual.Sheets[nombre].C1.c[0].t, /4,60–5,00 · Superior/);

        hojasAnterior.forEach((fila, i) => {
            assert.strictEqual(hojasActual[i][0], fila[0], `${nombre}, fila ${i + 1}, competencia`);
            assert.strictEqual(hojasActual[i][1], fila[1], `${nombre}, fila ${i + 1}, criterio`);
            if (/^\d+\s*[.)\-–:]/.test(String(fila[0] || ''))) evidencias.push(hojasActual[i][2]);
        });
    }

    assert.strictEqual(evidencias.length, 440);
    assert.strictEqual(new Set(evidencias).size, 440);
    evidencias.forEach(texto => {
        assert.match(texto, /^Evidencia de presencia: observa y describe /);
        assert.match(texto, /situaciones de la realidad/);
        assert.match(texto, /Contrasta su razonamiento con el criterio/);
        assert.match(texto, /Registra por escrito/);
        assert.match(texto, /lo dialoga con otras personas/);
        assert.match(texto, /seguridad y dominio/);
        assert.match(texto, /entornos sociales y académicos/);
    });
});

test('La lectura incorpora la tercera columna y acepta catálogos antiguos', () => {
    const c = catalogo();
    const competencias = c.cursos.flatMap(curso => curso.competencias);
    assert.strictEqual(competencias.length, 440);
    assert.ok(competencias.every(comp => comp.pensamientoCritico.startsWith('Evidencia de presencia:')));
    assert.ok(competencias.every(comp => !Object.keys(comp.datos).includes('Pensamiento Critico')));
    assert.strictEqual(c.cursos.find(curso => /IAs/.test(curso.nombre)).notas.length, 6);

    const antiguo = Lectura.leerCompetencias([{ nombre: 'Curso antiguo', filas: [
        ['Competencias', 'Criterios de Evaluación'],
        ['1. Analizar una situación.', '- Relación correcta de los hechos.']
    ] }]);
    assert.strictEqual(antiguo.cursos[0].competencias[0].criterio, 'Relación correcta de los hechos.');
    assert.strictEqual(antiguo.cursos[0].competencias[0].pensamientoCritico, '');
});

test('La evidencia conserva el tema completo y adapta la reflexión', () => {
    const comprension = PensamientoCritico.generarEvidencia(
        '1. Comprender los conceptos básicos de programación: variables, tipos de datos y estructuras de control.',
        '- Identificación y uso adecuado de variables, tipos de datos y estructuras de control.'
    );
    assert.match(comprension, /tipos de datos y estructuras de control en ejemplos/);
    assert.match(comprension, /relaciones, diferencias, patrones y significados/);

    const validacion = PensamientoCritico.generarEvidencia('2. Validar un modelo con datos reales.', '- Comparación rigurosa de resultados.');
    assert.match(validacion, /^Evidencia de presencia: observa y describe un modelo con datos reales/);
    assert.match(validacion, /Compara perspectivas, examina la pertinencia de la evidencia/);
    assert.match(validacion, /criterio «comparación rigurosa de resultados»/);
});

test('La rúbrica común clasifica los límites y rechaza valores inválidos', () => {
    const casos = [
        [0, 'No evidente'], [0.99, 'No evidente'], [1, 'Incipiente'], [1.99, 'Incipiente'],
        [2, 'En desarrollo'], [2.99, 'En desarrollo'], [3, 'Logrado'], [3.99, 'Logrado'],
        [4, 'Alto'], [4.59, 'Alto'], [4.6, 'Superior'], [5, 'Superior'], ['3,5', 'Logrado']
    ];
    casos.forEach(([valor, nivel]) => assert.strictEqual(PensamientoCritico.nivelDe(valor)?.etiqueta, nivel, String(valor)));
    [-0.01, 5.01, '', 'NP', null, undefined, NaN].forEach(valor => assert.strictEqual(PensamientoCritico.nivelDe(valor), null));
    assert.strictEqual(PensamientoCritico.NIVELES.length, 6);
});

test('Los Excel del grupo y del programa incluyen la evidencia', () => {
    const p = DatosEjemplo.crearProyectoEjemplo();
    p.catalogo.cursos.forEach(curso => curso.competencias.forEach((comp, i) => { comp.pensamientoCritico = `Evidencia de prueba ${curso.id} ${i + 1}`; }));

    const grupo = Analisis.analizarGrupo(p.grupos[0]);
    const libroGrupo = Informes.libroExcel(p.grupos[0], grupo, XLSX);
    const plan = XLSX.utils.sheet_to_json(libroGrupo.Sheets['Plan por estudiante'], { header: 1, defval: '' });
    assert.ok(plan[0].includes('Evidencia de pensamiento crítico'));
    const columna = plan[0].indexOf('Evidencia de pensamiento crítico');
    assert.ok(plan.slice(1).some(fila => String(fila[columna]).includes('Evidencia de prueba')));

    const libroPrograma = Informes.libroExcelPrograma(Programa.analizarPrograma(p.grupos), XLSX);
    const clasificacion = XLSX.utils.sheet_to_json(libroPrograma.Sheets.Clasificación, { header: 1, defval: '' });
    assert.ok(clasificacion[0].includes('Evidencia de pensamiento crítico'));
    const columnaPrograma = clasificacion[0].indexOf('Evidencia de pensamiento crítico');
    assert.ok(clasificacion.slice(1).every(fila => String(fila[columnaPrograma]).startsWith('Evidencia de prueba')));
});
