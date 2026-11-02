const test = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const Lectura = require('../js/lectura.js');
const Estado = require('../js/estado.js');
const Analisis = require('../js/analisis.js');
const Informes = require('../js/informes.js');

function escenarioReal() {
    const d = Estado.grupoInicial();
    Estado.aplicarNotas(Lectura.leerLibroNotas(XLSX.readFile('MATEUNOV0.xlsx'), XLSX).hojas[0].resultado, 'MATEUNOV0.xlsx', d);
    Estado.aplicarCompetencias(Lectura.leerCompetencias(Lectura.hojasDeLibro(XLSX.readFile('COMPETANCIASporCURSOS.xlsx'), XLSX)), 'COMPETANCIASporCURSOS.xlsx', d);
    Estado.distribuirCompetencias(d.competencias.cursoActivo, d);
    return { d, g: Analisis.analizarGrupo(d) };
}

test('Nota 1,00 en Quiz 1 produce evidencia muy incipiente y acciones de mejora', () => {
    const { d, g } = escenarioReal();
    const r = g.resultados.find(x => x.nombre === 'Araque Ruiz Mariana');
    const m = Informes.modeloIndividual(d, r, g);
    const comp = m.competencias.find(c => c.evaluaciones === 'Quiz 1');
    assert.ok(comp);
    assert.match(comp.pensamientoCritico, /^Evidencia muy incipiente de pensamiento crítico \(Quiz 1, nota 1.00\)/);
    assert.match(comp.pensamientoCritico, /muy por debajo de la aprobatoria/);
    assert.match(comp.pensamientoCritico, /Para mejorar: observar y describir/);
    assert.match(comp.pensamientoCritico, /Reflexionar sobre los pasos seguidos/);
    assert.match(comp.pensamientoCritico, /después dialogarlo con otras personas/);
    assert.ok(!comp.pensamientoCritico.includes('aprendido.,'));
    assert.ok(!comp.pensamientoCritico.includes('Evidencia de presencia:'));
});

test('Nota 2,00 en Parcial 3 produce evidencia limitada', () => {
    const { d, g } = escenarioReal();
    const r = g.resultados.find(x => x.nombre === 'Araque Ruiz Mariana');
    const m = Informes.modeloIndividual(d, r, g);
    const comp = m.competencias.find(c => c.evaluaciones === 'Parcial 3');
    assert.ok(comp);
    assert.match(comp.pensamientoCritico, /^Evidencia limitada de pensamiento crítico \(Parcial 3, nota 2.00\)/);
    assert.match(comp.pensamientoCritico, /por debajo de la aprobatoria/);
    assert.match(comp.pensamientoCritico, /Para mejorar:/);
});

test('Evaluación sin presentar produce evidencia insuficiente y no afirma dominio', () => {
    const { d, g } = escenarioReal();
    const r = g.resultados.find(x => x.nombre === 'Buitrago Morales Yanceli');
    d.informe.maxCompetencias = 50;
    const m = Informes.modeloIndividual(d, r, g);
    const comp = m.competencias.find(c => c.evaluaciones.includes('Parcial 1'));
    assert.ok(comp);
    assert.match(comp.pensamientoCritico, /^Evidencia insuficiente de pensamiento crítico \(Parcial 1, sin presentar/);
    assert.match(comp.pensamientoCritico, /no contar con una actuación evaluada/);
    assert.match(comp.pensamientoCritico, /todavía no puede demostrar con seguridad y dominio/);
});
