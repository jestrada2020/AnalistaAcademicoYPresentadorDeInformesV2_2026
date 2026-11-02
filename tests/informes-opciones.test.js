const test = require('node:test');
const assert = require('node:assert');
const Estado = require('../js/estado.js');
const Analisis = require('../js/analisis.js');
const Programa = require('../js/programa.js');
const Informes = require('../js/informes.js');
const DatosEjemplo = require('../js/datos-ejemplo.js');

function escenario() {
    const d = DatosEjemplo.crearEstadoEjemplo();
    const g = Analisis.analizarGrupo(d);
    const r = g.resultados.find(x => x.dimensiones.critico !== null) || g.resultados[0];
    return { d, g, r };
}

test('Formatos de identificación disponibles y valores predeterminados compatibles', () => {
    assert.deepStrictEqual(Informes.presentacionEstudiante('Pérez Ana', '123', 'nombre'), { nombre: 'Pérez Ana', incluirDocumento: false });
    assert.deepStrictEqual(Informes.presentacionEstudiante('Pérez Ana', '123', 'documento'), { nombre: 'ID / C.C. 123', incluirDocumento: false });
    assert.deepStrictEqual(Informes.presentacionEstudiante('Pérez Ana', '123'), { nombre: 'Pérez Ana', incluirDocumento: true });

    const d = Estado.normalizar({ informe: {} });
    assert.strictEqual(d.informe.formatoEstudiante, 'nombre-documento');
    assert.strictEqual(d.informe.percepcionCritica, 'no');
});

test('El informe individual aplica nombre, nombre con documento o solo documento', () => {
    const { d, g, r } = escenario();
    d.informe.formatoEstudiante = 'nombre';
    let m = Informes.modeloIndividual(d, r, g);
    assert.strictEqual(m.estudiante.nombre, r.nombre);
    assert.ok(!m.estudiante.datos.some(([k]) => k === 'Documento'));

    d.informe.formatoEstudiante = 'nombre-documento';
    m = Informes.modeloIndividual(d, r, g);
    assert.strictEqual(m.estudiante.nombre, r.nombre);
    assert.ok(m.estudiante.datos.some(([k, v]) => k === 'Documento' && v === (r.estudiante.documento || r.id)));

    d.informe.formatoEstudiante = 'documento';
    m = Informes.modeloIndividual(d, r, g);
    assert.strictEqual(m.estudiante.nombre, `ID / C.C. ${r.estudiante.documento || r.id}`);
    assert.ok(!m.estudiante.datos.some(([k]) => k === 'Documento'));
    assert.ok(m.firmas.some(([nombre]) => nombre === r.nombre));
});

test('El formato también se aplica al informe unificado', () => {
    const { d } = escenario();
    d.informe.formatoEstudiante = 'documento';
    const prog = Programa.analizarPrograma([d]);
    const m = Informes.modeloUnificado(prog.personas.personas[0]);
    assert.match(m.estudiante.nombre, /^ID \/ C.C. /);
    assert.ok(!m.estudiante.datos.some(([k]) => k === 'Documento'));
    assert.ok(m.estudiante.datos.some(([k]) => k === 'Unificación'));
});

test('Percepción general y concreta del pensamiento crítico', () => {
    const { d, g, r } = escenario();
    let m = Informes.modeloIndividual(d, r, g);
    assert.strictEqual(m.percepcionCritica, null);

    d.informe.percepcionCritica = 'general';
    m = Informes.modeloIndividual(d, r, g);
    assert.strictEqual(m.percepcionCritica.tipo, 'general');
    assert.match(m.percepcionCritica.texto, /En pensamiento crítico registra/);
    assert.strictEqual(m.percepcionCritica.evidencias.length, 0);
    assert.ok(Informes.htmlIndividual(m).includes('Percepción general del pensamiento crítico'));

    d.competencias.cursos.forEach(curso => curso.competencias.forEach(comp => {
        if (Analisis.dimensionDe(comp) === 'critico') comp.pensamientoCritico = `Evidencia concreta ${comp.id}`;
    }));
    d.informe.percepcionCritica = 'concreta';
    m = Informes.modeloIndividual(d, r, g);
    assert.strictEqual(m.percepcionCritica.tipo, 'concreta');
    assert.ok(m.percepcionCritica.evidencias.length > 0);
    assert.ok(m.percepcionCritica.evidencias.length <= 3);
    assert.match(m.percepcionCritica.evidencias[0], /Evidencia concreta/);
    assert.ok(Informes.htmlIndividual(m).includes('Percepción concreta del pensamiento crítico'));
});

test('Competencias a reforzar incluye pensamiento crítico y tipo de evaluación', () => {
    const { d, g, r } = escenario();
    d.competencias.cursos.forEach(curso => curso.competencias.forEach(comp => { comp.pensamientoCritico = `Evidencia ${comp.id}`; }));
    const m = Informes.modeloIndividual(d, r, g);
    assert.ok(m.competencias.length > 0);
    m.competencias.forEach(comp => {
        assert.match(comp.pensamientoCritico, /^Evidencia /);
        assert.ok(comp.tipos.length > 0);
        assert.ok(comp.evaluaciones.length > 0);
    });
    assert.ok(m.competencias.some(comp => /Parcial|Quiz/.test(comp.tipos)));
    const html = Informes.htmlIndividual(m);
    for (const cabecera of ['Competencia', 'Criterio de evaluación', 'Pensamiento crítico', 'Evaluación', 'Tipo']) {
        assert.ok(html.includes(cabecera), cabecera);
    }
    assert.ok(html.includes('inf-comp-reforzar'));
});
