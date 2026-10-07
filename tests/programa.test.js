const test = require('node:test');
const assert = require('node:assert');
const path = require('node:path');
const XLSX = require('xlsx');
const Lectura = require('../js/lectura.js');
const Estado = require('../js/estado.js');
const Analisis = require('../js/analisis.js');
const Programa = require('../js/programa.js');
const Informes = require('../js/informes.js');
const DatosEjemplo = require('../js/datos-ejemplo.js');

const raiz = path.join(__dirname, '..');
const libro = n => XLSX.readFile(path.join(raiz, n));
const catalogo = () => Lectura.leerCompetencias(Lectura.hojasDeLibro(libro('COMPETANCIASporCURSOS.xlsx'), XLSX));

test('Carácter de las competencias: analítico, práctico y pensamiento crítico', () => {
    const d = t => Analisis.clasificarDimension(t).dimension;
    assert.strictEqual(d('Comprender el concepto de derivada de una función.'), 'analitico');
    assert.strictEqual(d('Analizar la continuidad y discontinuidad de funciones.'), 'analitico');
    assert.strictEqual(d('Resolver operaciones con números naturales, enteros y decimales.'), 'practico');
    assert.strictEqual(d('Aplicar la regla de la cadena.'), 'practico');
    assert.strictEqual(d('Evaluar el rendimiento de modelos de clasificación.'), 'critico');
    assert.strictEqual(d('Resolver problemas de optimización geométrica.'), 'critico');
    assert.strictEqual(d('Evaluar integrales definidas por sustitución.'), 'practico');
    const c = catalogo();
    const total = { analitico: 0, practico: 0, critico: 0 };
    c.cursos.forEach(k => k.competencias.forEach(x => { total[Analisis.clasificarDimension(x.texto, x.criterio).dimension]++; }));
    assert.ok(total.analitico > 50 && total.practico > 200 && total.critico > 10, JSON.stringify(total));
});

test('Una hoja con columna Grupo se divide en varios grupos', () => {
    const partes = Lectura.dividirPorGrupo(DatosEjemplo.filasNotas());
    assert.deepStrictEqual(partes.map(p => p.valor), ['Cálculo Diferencial · 01', 'Cálculo Diferencial · 02', 'Cálculo Diferencial · 03']);
    const r = Lectura.leerNotas(partes[1].filas);
    assert.strictEqual(r.estudiantes.length, 18);
    assert.deepStrictEqual(r.grupo, { asignatura: 'Cálculo Diferencial', grupo: '02', docente: 'Carlos Andrés Gil' });
    // Las columnas Asignatura, Grupo y Docente no se leen como evaluaciones ni como texto
    assert.ok(!r.evaluaciones.some(e => /GRUPO|DOCENTE|ASIGNATURA/.test(e.clave)));
    assert.ok(!r.extras.some(e => /Grupo|Docente|Asignatura/.test(e.nombre)));
    assert.strictEqual(Lectura.dividirPorGrupo(Lectura.hojasDeLibro(libro('MATEUNOV0.xlsx'), XLSX)[0].filas), null);
});

test('CSV con punto y coma, coma decimal, comillas y grupos', () => {
    const csv = '﻿Documento;Nombres y Apellidos;Grupo;1P;2P;Q1;Observaciones\n0123;Pérez Ana;A;3,5;4;"2,0";"Bien; atenta"\n0456;Gómez Luis;A;2;NP;3;\n789;Ruiz Eva;B;4,2;3,1;5;\n';
    const lectura = Lectura.leerLibroNotas(Lectura.leerTextoCSV(csv, XLSX, 'CSV'), XLSX);
    assert.strictEqual(lectura.hojas.length, 2);
    const a = lectura.hojas[0].resultado;
    assert.strictEqual(a.estudiantes[0].id, '0123');
    assert.deepStrictEqual(a.estudiantes[0].notas, { '1P': 3.5, '2P': 4, Q1: 2 });
    assert.strictEqual(a.estudiantes[1].marcas['2P'], 'NP');
    assert.strictEqual(Object.values(a.estudiantes[0].extras)[0], 'Bien; atenta');
    const b = lectura.hojas[1].resultado;
    assert.deepStrictEqual(b.evaluaciones.map(e => e.clave), ['1P', '2P', 'Q1']);
    const coma = Lectura.leerLibroNotas(Lectura.leerTextoCSV('Estudiante,1P,2P\nAna,3.5,4\nLuis,2,1.5\n', XLSX), XLSX).hojas[0].resultado;
    assert.deepStrictEqual(coma.estudiantes[1].notas, { '1P': 2, '2P': 1.5 });
});

test('Proyecto con varios archivos: agrega, actualiza sin duplicar y comparte el catálogo', () => {
    Estado.reiniciar();
    const mate = Lectura.leerLibroNotas(libro('MATEUNOV0.xlsx'), XLSX).hojas[0];
    Estado.agregarGrupo(mate, 'MATEUNOV0.xlsx');
    Estado.aplicarCompetencias(catalogo(), 'COMPETANCIASporCURSOS.xlsx');
    Lectura.leerLibroNotas(libro('ALUMNOMATEuno.xlsx'), XLSX).hojas.filter(h => h.resultado).forEach(h => Estado.agregarGrupo(h, 'ALUMNOMATEuno.xlsx'));
    Estado.grupos()[0].evaluaciones[0].peso = 30;
    Estado.agregarGrupo(mate, 'MATEUNOV0.xlsx'); // misma planilla otra vez
    assert.strictEqual(Estado.gruposConDatos().length, 2);
    assert.strictEqual(Estado.grupos()[0].evaluaciones[0].peso, 30);
    assert.strictEqual(Estado.grupos()[0].competencias.cursos, Estado.grupos()[1].competencias.cursos);
    assert.ok(Estado.grupos().every(g => g.evaluaciones.some(ev => ev.competencias.length)));
    // El respaldo guarda el catálogo una sola vez y se recupera completo
    const json = Estado.exportarRespaldo();
    assert.strictEqual(json.split('"criterio"').length - 1, 440);
    Estado.reiniciar();
    Estado.importarRespaldo(json);
    assert.strictEqual(Estado.gruposConDatos().length, 2);
    assert.strictEqual(Estado.grupos()[1].competencias.cursos.length, 11);
});

test('Respaldo de la versión anterior (un solo grupo) se convierte a proyecto', () => {
    const viejo = { ...DatosEjemplo.crearEstadoEjemplo() };
    delete viejo.id;
    const p = Estado.normalizarProyecto(JSON.parse(JSON.stringify(viejo)));
    assert.strictEqual(p.grupos.length, 1);
    assert.ok(p.catalogo.cursos.length === 1);
    assert.strictEqual(p.grupos[0].competencias.cursoActivo, 'calculo_diferencial');
});

test('Notas por carácter de cada estudiante y del grupo', () => {
    const p = DatosEjemplo.crearProyectoEjemplo();
    const d = p.grupos[0];
    const g = Analisis.analizarGrupo(d);
    const r = g.resultados.find(x => x.estado !== 'sin-datos');
    // Recalcular a mano la nota crítica: perfiles ponderados por peso
    let num = 0;
    let den = 0;
    r.detalle.forEach(x => { const w = g.perfiles[x.clave]?.critico || 0; if (x.usada !== null && w) { num += x.usada * x.peso * w; den += x.peso * w; } });
    assert.ok(Math.abs(r.dimensiones.critico - num / den) < 1e-3);
    assert.deepStrictEqual(g.perfiles.TALLER1, { critico: 1 });
    assert.ok(g.perfiles['3P'] && g.dimensiones.critico.n === 20);
    assert.ok(g.porCompetencia.length >= 6);
    assert.ok(g.porCompetencia[0].logro <= g.porCompetencia.at(-1).logro);
    const filtro = Analisis.filtrar(g.resultados, [{ campo: 'dim:critico', comparador: 'lt', valor: 3 }]);
    assert.ok(filtro.length > 0 && filtro.every(x => x.dimensiones.critico < 3));
    // Corregir a mano el carácter de una competencia cambia el perfil
    const comp = d.competencias.cursos[0].competencias.find(c => c.numero === 1);
    comp.dimensionManual = 'critico';
    assert.ok(Analisis.analizarGrupo(d).perfiles['1P'].critico > 0);
    delete comp.dimensionManual;
});

test('Análisis global del programa, informe y Excel', () => {
    const p = DatosEjemplo.crearProyectoEjemplo();
    const prog = Programa.analizarPrograma(p.grupos);
    assert.strictEqual(prog.resumen.grupos, 3);
    assert.strictEqual(prog.resumen.estudiantes, 60);
    assert.strictEqual(prog.resumen.sinDatos, 1);
    assert.ok(prog.resumen.brecha.valor > 0.5);
    assert.ok(prog.dimensiones.critico.media < prog.dimensiones.analitico.media);
    assert.ok(prog.hallazgos.some(h => /pensamiento crítico/.test(h)));
    assert.ok(prog.recomendaciones.length >= 3);
    assert.ok(prog.competencias.length >= 6);
    const m = Informes.modeloPrograma(prog);
    assert.strictEqual(m.tablaGrupos.length, 3);
    assert.ok(Informes.htmlPrograma(m).includes('Comparativo de grupos'));
    const wb = Informes.libroExcelPrograma(prog, XLSX);
    assert.deepStrictEqual(wb.SheetNames, ['Resumen', 'Grupos', 'Por curso', 'Competencias', 'Evaluaciones', 'Estudiantes', 'Clasificación']);
    const est = XLSX.utils.sheet_to_json(wb.Sheets.Estudiantes, { header: 1 });
    assert.strictEqual(est.length, 61);
});
