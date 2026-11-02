const test = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const Lectura = require('../js/lectura.js');
const Estado = require('../js/estado.js');
const Programa = require('../js/programa.js');
const Informes = require('../js/informes.js');

function proyectoReal() {
    Estado.reiniciar();
    for (const archivo of ['MATEUNOV0.xlsx', 'ALUMNOMATEuno.xlsx']) {
        const hojas = Lectura.leerLibroNotas(XLSX.readFile(archivo), XLSX).hojas.filter(h => h.resultado);
        hojas.forEach(h => Estado.agregarGrupo(h, archivo));
    }
    return Programa.analizarPrograma(Estado.gruposConDatos());
}

test('Archivos reales: unifica por documento y nombre y separa conflictos', () => {
    const prog = proyectoReal();
    assert.deepStrictEqual(prog.personas.resumen, {
        matriculas: 88, personas: 53, comunes: 35, conflictos: 5, comunesPorNombre: 0
    });
    assert.strictEqual(prog.personas.avisos.length, 5);

    const sara = prog.personas.comunes.find(p => p.nombre === 'Arroyave Herrera Sara');
    assert.ok(sara);
    assert.strictEqual(sara.registros.length, 2);
    assert.deepStrictEqual(sara.registros.map(x => x.grupo), ['Mateunov0', 'Alumnomateuno']);
    assert.strictEqual(sara.metodo, 'documento-nombre');

    const otra = prog.personas.personas.find(p => p.nombre === 'Bohorquez Ma Lady Steffanny');
    assert.ok(otra);
    assert.strictEqual(otra.comun, false);
    assert.strictEqual(otra.registros.length, 1);
    assert.ok(!prog.personas.comunes.some(p => p.registros.some(x => x.r.nombre === 'Bohorquez Ma Lady Steffanny' && x.grupo === 'Mateunov0')));
});

test('Informe unificado conserva una sección independiente por matrícula', () => {
    const prog = proyectoReal();
    const sara = prog.personas.comunes.find(p => p.nombre === 'Arroyave Herrera Sara');
    const modelo = Informes.modeloUnificado(sara);
    assert.strictEqual(modelo.tipo, 'unificado');
    assert.strictEqual(modelo.registros.length, 2);
    assert.notStrictEqual(modelo.registros[0].modelo.evaluaciones.length, 0);
    assert.notStrictEqual(modelo.registros[1].modelo.evaluaciones.length, 0);
    assert.match(modelo.avisos[0], /no es una nota final combinada/);

    const html = Informes.htmlUnificado(modelo);
    assert.match(html, /Informe académico unificado por estudiante/);
    assert.match(html, /Matrícula 1: Mateunov0/);
    assert.match(html, /Matrícula 2: Alumnomateuno/);
    assert.match(html, /Resultados por evaluación/);
    assert.ok(!html.includes('<script'));
});

test('Excel del programa contiene personas, comunes y conflictos', () => {
    const prog = proyectoReal();
    const wb = Informes.libroExcelPrograma(prog, XLSX);
    assert.ok(wb.SheetNames.includes('Personas unificadas'));
    assert.ok(wb.SheetNames.includes('Estudiantes comunes'));
    assert.ok(wb.SheetNames.includes('Conflictos identidad'));
    assert.strictEqual(XLSX.utils.sheet_to_json(wb.Sheets['Personas unificadas'], { header: 1 }).length, 54);
    assert.strictEqual(XLSX.utils.sheet_to_json(wb.Sheets['Estudiantes comunes'], { header: 1 }).length, 36);
    assert.strictEqual(XLSX.utils.sheet_to_json(wb.Sheets['Conflictos identidad'], { header: 1 }).length, 6);
});

test('Sin documento solo unifica nombres exactos normalizados y deja aviso', () => {
    const grupos = ['A', 'B'].map((nombre, i) => {
        const d = Estado.grupoInicial();
        d.id = `grupo-${nombre}`;
        d.nombre = `Grupo ${nombre}`;
        const leido = Lectura.leerNotas([
            ['Nombres y Apellidos', '1P'],
            ['  María   José Pérez  ', 4 - i]
        ]);
        Estado.aplicarNotas(leido, `${nombre}.xlsx`, d);
        return d;
    });
    assert.ok(grupos.every(g => g.estudiantes[0].idGenerado));
    const prog = Programa.analizarPrograma(grupos);
    assert.strictEqual(prog.personas.personas.length, 1);
    assert.strictEqual(prog.personas.comunes.length, 1);
    assert.strictEqual(prog.personas.comunes[0].metodo, 'nombre');
    assert.strictEqual(prog.personas.comunes[0].registros.length, 2);
    assert.match(prog.personas.avisos[0], /posibles homónimos/);
});

test('Cinco archivos y cursos distintos conservan todas las matrículas de cada persona', () => {
    Estado.reiniciar();
    const archivos = ['MATEUNOV0.xlsx', 'ALUMNOMATEuno.xlsx', 'BIO-ESTADISTICA_00.xlsx', 'MATTEMATICAS_3_00.xlsx', 'PROGRAMACION-BIO_00.xlsx'];
    archivos.forEach(archivo => {
        const hojas = Lectura.leerLibroNotas(XLSX.readFile(archivo), XLSX).hojas.filter(h => h.resultado);
        hojas.forEach(h => Estado.agregarGrupo(h, archivo));
    });
    const prog = Programa.analizarPrograma(Estado.gruposConDatos());
    assert.deepStrictEqual(prog.personas.resumen, {
        matriculas: 125, personas: 80, comunes: 37, conflictos: 8, comunesPorNombre: 0
    });
    const tres = prog.personas.comunes.find(p => p.nombre === 'Ciro Arroyave Susana');
    assert.ok(tres);
    assert.strictEqual(tres.registros.length, 3);
    assert.deepStrictEqual(tres.registros.map(x => x.grupo), ['Mateunov0', 'Alumnomateuno', 'Mattematicas 3 00']);
    const modelo = Informes.modeloUnificado(tres);
    assert.deepStrictEqual(modelo.registros.map(x => x.modelo.evaluaciones.length), [8, 9, 8]);
    assert.strictEqual(modelo.registros[0].modelo.indicadores[1].valor, '3.57');
    assert.strictEqual(modelo.registros[1].modelo.indicadores[1].valor, '3.39');
    assert.strictEqual(modelo.registros[2].modelo.indicadores[1].valor, '0.91');
});
