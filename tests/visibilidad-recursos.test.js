const test = require('node:test');
const assert = require('node:assert');
const Estado = require('../js/estado.js');
const Analisis = require('../js/analisis.js');
const Informes = require('../js/informes.js');
const DatosEjemplo = require('../js/datos-ejemplo.js');

test('Respaldos antiguos completan pensamiento crítico, web y videos sin reemplazar contenido existente', () => {
    const viejo = DatosEjemplo.crearProyectoEjemplo();
    viejo.catalogo.cursos.forEach(curso => curso.competencias.forEach((comp, i) => {
        delete comp.pensamientoCritico;
        comp.recursos = i === 0 ? { web: ['Recurso propio | https://example.com'] } : {};
    }));
    const p = Estado.normalizarProyecto(JSON.parse(JSON.stringify(viejo)));
    const competencias = p.catalogo.cursos.flatMap(c => c.competencias);
    assert.ok(competencias.every(c => c.pensamientoCritico.startsWith('Evidencia de presencia:')));
    assert.ok(competencias.every(c => c.recursos.web.length && c.recursos.videos.length));
    assert.strictEqual(competencias[0].recursos.web[0], 'Recurso propio | https://example.com');
});

test('La columna de pensamiento crítico se puede incluir o retirar sin perder las demás columnas', () => {
    const d = DatosEjemplo.crearEstadoEjemplo();
    const g = Analisis.analizarGrupo(d);
    d.informe.incluirPensamientoCritico = true;
    let m = Informes.modeloIndividual(d, g.resultados[0], g);
    let html = Informes.htmlIndividual(m);
    assert.ok(html.includes('<th>Pensamiento crítico</th>'));
    assert.ok(m.competencias.every(c => c.pensamientoCritico));

    d.informe.incluirPensamientoCritico = false;
    m = Informes.modeloIndividual(d, g.resultados[0], g);
    html = Informes.htmlIndividual(m);
    assert.ok(!html.includes('<th>Pensamiento crítico</th>'));
    assert.ok(html.includes('<th>Criterio de evaluación</th>'));
    assert.ok(html.includes('<th>Evaluación</th>'));
    assert.ok(html.includes('<th>Tipo</th>'));
});

test('Sin recursos se muestra una explicación y no una sección vacía', () => {
    const d = DatosEjemplo.crearEstadoEjemplo();
    d.evaluaciones.forEach(ev => { ev.recursos = Estado.recursosVacios(); });
    d.competencias.cursos.forEach(curso => curso.competencias.forEach(comp => { comp.recursos = {}; }));
    d.columnasTexto = [];
    const g = Analisis.analizarGrupo(d);
    const m = Informes.modeloIndividual(d, g.resultados[0], g);
    assert.deepStrictEqual(m.recursos, {});
    const html = Informes.htmlIndividual(m);
    assert.ok(html.includes('Recursos recomendados para el plan de mejoramiento'));
    assert.ok(html.includes('No hay recursos asociados'));

    d.informe.incluirRecursos = false;
    const oculto = Informes.modeloIndividual(d, g.resultados[0], g);
    assert.strictEqual(oculto.incluirRecursos, false);
    assert.ok(!Informes.htmlIndividual(oculto).includes('No hay recursos asociados'));
});
