const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const XLSX = require('xlsx');
const Lectura = require('../js/lectura.js');
const Estado = require('../js/estado.js');
const Analisis = require('../js/analisis.js');
const Recursos = require('../js/recursos.js');
const DatosEjemplo = require('../js/datos-ejemplo.js');

const raiz = path.join(__dirname, '..');
const libro = n => XLSX.readFile(path.join(raiz, n));

function cargarMateUno() {
    const d = Estado.estadoInicial();
    Estado.aplicarNotas(Lectura.leerLibroNotas(libro('MATEUNOV0.xlsx'), XLSX).hojas[0].resultado, 'MATEUNOV0.xlsx', d);
    Estado.aplicarCompetencias(Lectura.leerCompetencias(Lectura.hojasDeLibro(libro('COMPETANCIASporCURSOS.xlsx'), XLSX)), 'COMPETANCIASporCURSOS.xlsx', d);
    return d;
}

test('MATEUNOV0: lee estudiantes, evaluaciones, pendientes y la columna sin encabezado', () => {
    const r = Lectura.leerLibroNotas(libro('MATEUNOV0.xlsx'), XLSX).hojas[0].resultado;
    assert.strictEqual(r.estudiantes.length, 35);
    assert.deepStrictEqual(r.evaluaciones.map(e => e.clave), ['1P', '2P', '3P', '4P', 'Q1', 'Q2', 'Q3', 'Q4']);
    assert.deepStrictEqual(r.evaluaciones.filter(e => !e.calificadas).map(e => e.clave), ['4P', 'Q4']);
    assert.strictEqual(r.extras.length, 1);
    const vannesa = r.estudiantes.find(e => e.id === '1022003435');
    assert.strictEqual(vannesa.extras[r.extras[0].clave], 'QF');
    assert.strictEqual(vannesa.notas['1P'], 1);
    assert.strictEqual(vannesa.notas.Q1, null);
});

test('ALUMNOMATEuno: definitiva, columna fuera de escala, recursos por estudiante y notas inválidas', () => {
    const r = Lectura.leerLibroNotas(libro('ALUMNOMATEuno.xlsx'), XLSX).hojas[0].resultado;
    assert.deepStrictEqual(r.informativas.map(c => c.tipo), ['definitiva', 'informativa']);
    assert.deepStrictEqual(r.extras.map(c => c.rol), ['competencias', 'web', 'videos', 'ejercicios', 'herramientas']);
    assert.ok(r.evaluaciones.some(e => e.clave === '5P'));
    assert.ok(r.avisos.some(a => /11 en Q4/.test(a)));
    assert.strictEqual(new Set(r.estudiantes.map(e => e.id)).size, r.estudiantes.length);
});

test('Competencias: 11 cursos de 40, notas aclaratorias separadas', () => {
    const c = Lectura.leerCompetencias(Lectura.hojasDeLibro(libro('COMPETANCIASporCURSOS.xlsx'), XLSX));
    assert.strictEqual(c.cursos.length, 11);
    c.cursos.forEach(k => assert.strictEqual(k.competencias.length, 40, k.nombre));
    const ia = c.cursos.find(k => /IAs/.test(k.nombre));
    assert.strictEqual(ia.notas.length, 6);
    assert.strictEqual(c.cursos[0].competencias[0].criterio, 'Precisión en las operaciones.');
    assert.ok(!/^\d/.test(c.cursos[0].competencias[0].texto));
});

test('Encabezados de evaluación reconocidos', () => {
    const t = h => Lectura.clasificarEncabezado(h)?.tipo;
    assert.strictEqual(t('1P'), 'parcial');
    assert.strictEqual(t('Parcial 2'), 'parcial');
    assert.strictEqual(t('2do parcial'), 'parcial');
    assert.strictEqual(t('Q3'), 'quiz');
    assert.strictEqual(t('Quiz 1'), 'quiz');
    assert.strictEqual(t('Taller 2'), 'taller');
    assert.strictEqual(t('Examen final'), 'final');
    assert.strictEqual(t('Observaciones'), undefined);
    assert.strictEqual(Lectura.clasificarInformativa('DF'), 'definitiva');
    assert.strictEqual(Lectura.clasificarInformativa('Inasistencias'), 'faltas');
});

test('Pesos sugeridos: 80/20 y suma exacta de 100', () => {
    const d = cargarMateUno();
    const pesos = d.evaluaciones.map(e => e.peso);
    assert.deepStrictEqual(pesos, [20, 20, 20, 20, 5, 5, 5, 5]);
    const tres = Analisis.repartir(100, 3);
    assert.strictEqual(Math.round(tres.reduce((a, b) => a + b, 0) * 100), 10000);
    const iguales = Analisis.pesosSugeridos(d.evaluaciones, 'iguales');
    assert.strictEqual(Object.values(iguales).reduce((a, b) => a + b, 0), 100);
});

test('Cálculo individual: acumulado, promedio, nota necesaria y estado', () => {
    const d = cargarMateUno();
    const g = Analisis.analizarGrupo(d);
    const mariana = g.resultados.find(r => r.nombre === 'Araque Ruiz Mariana');
    // 1P 3.1, 2P 3, 3P 2 (20% c/u) + Q1 1, Q2 4, Q3 3 (5% c/u) = 1.62 + 0.4 = 2.02
    assert.strictEqual(Math.round(mariana.acumulado * 100) / 100, 2.02);
    assert.strictEqual(mariana.pesoEvaluado, 75);
    assert.strictEqual(Math.round(mariana.promedio * 100) / 100, 2.69);
    assert.strictEqual(Math.round(mariana.necesaria * 100) / 100, 3.92);
    assert.strictEqual(mariana.estado, 'riesgo');
    assert.deepStrictEqual(mariana.perdidas, ['3P', 'Q1']);

    const sierra = g.resultados.find(r => r.nombre === 'Sierra Sherin Tatiana');
    assert.strictEqual(sierra.estado, 'sin-datos');
    assert.strictEqual(sierra.promedio, null);

    const ana = g.resultados.find(r => r.nombre === 'Santiago Castrillón Ana Sofia');
    assert.strictEqual(ana.estado, 'asegurado');
    assert.strictEqual(g.resumen.conNotas, 34);
    assert.strictEqual(g.resumen.pesoEvaluado, 75);
});

test('Vacías como cero o ignoradas', () => {
    const d = cargarMateUno();
    const buitrago = () => Analisis.analizarGrupo(d).resultados.find(r => r.nombre === 'Buitrago Morales Yanceli');
    const conCero = buitrago();
    assert.deepStrictEqual(conCero.faltantes, ['1P', 'Q1', 'Q3']);
    assert.strictEqual(conCero.pesoEvaluado, 75);
    d.opciones.vaciasComoCero = false;
    const sinCero = buitrago();
    assert.strictEqual(sinCero.pesoEvaluado, 45);
    assert.ok(sinCero.promedio > conCero.promedio);
});

test('Filtros por varios criterios (Y / O) y filtros rápidos', () => {
    const d = cargarMateUno();
    const g = Analisis.analizarGrupo(d);
    const y = Analisis.filtrar(g.resultados, [{ campo: 'ev:2P', comparador: 'lt', valor: 3 }, { campo: 'ev:Q2', comparador: 'lt', valor: 3 }], 'Y');
    const o = Analisis.filtrar(g.resultados, [{ campo: 'ev:2P', comparador: 'lt', valor: 3 }, { campo: 'ev:Q2', comparador: 'lt', valor: 3 }], 'O');
    assert.ok(y.length > 0 && o.length >= y.length);
    y.forEach(r => assert.ok(r.estudiante.notas['2P'] < 3 && r.estudiante.notas.Q2 < 3));
    const vacias = Analisis.filtrar(g.resultados, [{ campo: 'ev:1P', comparador: 'vacia' }]);
    assert.strictEqual(vacias.length, 3);
    const riesgo = Analisis.filtrosRapidos(d).riesgo;
    assert.strictEqual(Analisis.filtrar(g.resultados, riesgo.criterios, riesgo.operador).length, 21);
    // Criterios incompletos no filtran
    assert.strictEqual(Analisis.filtrar(g.resultados, [{ campo: 'promedio', comparador: 'lt', valor: '' }]).length, 35);
});

test('Competencias a reforzar y recursos recomendados', () => {
    const d = cargarMateUno();
    Estado.distribuirCompetencias('algebra_basica', d);
    assert.strictEqual(d.evaluaciones.find(e => e.clave === 'Q2').competencias[0], 'algebra_basica#11');
    const s = Recursos.sugerir(d, d.evaluaciones.find(e => e.clave === '2P'));
    assert.strictEqual(s.web.length, 3);
    d.evaluaciones.find(e => e.clave === '2P').recursos.ejercicios = 'Baldor pág. 120, ejercicios 1 a 20';
    const g = Analisis.analizarGrupo(d);
    const r = g.resultados.find(x => x.perdidas.includes('2P'));
    const reforzar = Analisis.competenciasAReforzar(d, r);
    assert.ok(reforzar.some(x => x.competencia.id === 'algebra_basica#11'));
    const rec = Analisis.recursosRecomendados(d, r, reforzar);
    assert.deepStrictEqual(rec.ejercicios, [{ titulo: 'Baldor pág. 120, ejercicios 1 a 20', url: null }]);
    assert.ok(g.competenciasCriticas.length > 0);
    assert.ok(Analisis.recomendaciones(d, r).length >= 1);
});

test('Conserva la configuración al recargar la misma planilla', () => {
    const d = cargarMateUno();
    d.evaluaciones[0].peso = 30;
    d.evaluaciones[0].fecha = '2026-08-20';
    Estado.aplicarNotas(Lectura.leerLibroNotas(libro('MATEUNOV0.xlsx'), XLSX).hojas[0].resultado, 'MATEUNOV0.xlsx', d);
    assert.strictEqual(d.evaluaciones[0].peso, 30);
    assert.strictEqual(d.evaluaciones[0].fecha, '2026-08-20');
});

test('Datos de ejemplo e informes (modelos y Excel)', () => {
    const Informes = require('../js/informes.js');
    const d = DatosEjemplo.crearEstadoEjemplo();
    assert.strictEqual(d.estudiantes.length, 20);
    const g = Analisis.analizarGrupo(d);
    assert.deepStrictEqual(g.avisos, []);
    const m = Informes.modeloIndividual(d, g.resultados[0], g);
    assert.strictEqual(m.indicadores.length, 5);
    assert.ok(m.observacion);
    assert.ok(Informes.htmlIndividual(m).includes(g.resultados[0].nombre));
    const mg = Informes.modeloGrupal(d, g);
    assert.strictEqual(mg.consolidado.filas.length, 20);
    const wb = Informes.libroExcel(d, g, XLSX);
    assert.deepStrictEqual(wb.SheetNames, ['Consolidado', 'Estadísticas', 'Competencias críticas', 'Plan por estudiante', 'Configuración']);
    assert.strictEqual(Informes.txt('≥ 4 – ok'), '>= 4 - ok');
});

test('Respaldo: exportar e importar conserva todo', () => {
    const d = DatosEjemplo.crearEstadoEjemplo();
    const copia = Estado.normalizar(JSON.parse(JSON.stringify(d)));
    assert.strictEqual(copia.estudiantes.length, d.estudiantes.length);
    assert.deepStrictEqual(copia.evaluaciones.map(e => e.peso), d.evaluaciones.map(e => e.peso));
});
