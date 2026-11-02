const test = require('node:test');
const assert = require('node:assert');
const XLSX = require('xlsx');
const RecursosCanal = require('../js/recursos-canal.js');
const Recursos = require('../js/recursos.js');
const Lectura = require('../js/lectura.js');

test('Asociaciones directas usan videos reales del canal y criterios específicos', () => {
    const general = RecursosCanal.videoPara({ texto: 'Comprender el concepto de integral como área bajo una curva.' }, 'Cálculo Integral');
    assert.strictEqual(general.url, 'https://www.youtube.com/watch?v=2r-ceAel25M');
    const partes = RecursosCanal.videoPara({ texto: 'Aplicar integración por partes.', criterio: 'Uso correcto de la tabla.' }, 'Cálculo Integral');
    assert.strictEqual(partes.url, 'https://www.youtube.com/watch?v=-rxVCvNCF8w');
    const trigonometria = RecursosCanal.videoPara({ texto: 'Resolver antiderivadas trigonométricas.' }, 'Cálculo Integral');
    assert.strictEqual(trigonometria.url, 'https://www.youtube.com/watch?v=nLEdXPAQY4U');
    const criterio = RecursosCanal.videoPara({ texto: 'Aplicar un procedimiento.', criterio: 'Integral indefinida correcta.' }, 'Cálculo Integral');
    assert.strictEqual(criterio.url, 'https://www.youtube.com/watch?v=OcRUNuMpNMA');
});

test('Sin coincidencia directa genera búsqueda temática del canal', () => {
    const r = RecursosCanal.recursosPara({ texto: 'Comprender conceptos básicos de programación.' }, 'Programación');
    assert.strictEqual(r.directo, false);
    assert.match(r.videos[0].url, /youtube\.com\/results\?search_query=/);
    assert.match(decodeURIComponent(r.videos[0].url), /john estrada/);
    assert.strictEqual(r.web[0].url, 'https://docs.python.org/es/3/tutorial/');
});

test('Las herramientas de programación tienen prioridad sobre la palabra variables', () => {
    const herramientas = Recursos.herramientasDelArea('Programación: variables, tipos de datos y estructuras de control');
    assert.ok(herramientas.some(x => x.includes('Python Tutor')));
    assert.ok(herramientas.some(x => x.includes('Google Colab')));
    assert.ok(!herramientas.some(x => x.includes('Symbolab')));
});

test('Las 440 competencias tienen web, videos, ejercicios y herramientas sin alterar las columnas originales', () => {
    const actual = XLSX.readFile('COMPETANCIASporCURSOS.xlsx');
    const anterior = XLSX.readFile('COMPETANCIASporCURSOS.recursos.backup.xlsx');
    const catalogo = Lectura.leerCompetencias(Lectura.hojasDeLibro(actual, XLSX));
    let total = 0;
    let directos = 0;
    let busquedas = 0;

    for (const nombre of actual.SheetNames) {
        const a = XLSX.utils.sheet_to_json(actual.Sheets[nombre], { header: 1, defval: '', raw: true });
        const b = XLSX.utils.sheet_to_json(anterior.Sheets[nombre], { header: 1, defval: '', raw: true });
        b.forEach((fila, i) => {
            for (let col = 0; col < 3; col++) assert.strictEqual(a[i][col], fila[col], `${nombre}, fila ${i + 1}, columna ${col + 1}`);
        });
    }

    catalogo.cursos.forEach(curso => curso.competencias.forEach(comp => {
        total++;
        for (const tipo of ['web', 'videos', 'ejercicios', 'herramientas']) {
            assert.ok(comp.recursos[tipo]?.length, `${comp.id}: falta ${tipo}`);
            comp.recursos[tipo].forEach(linea => assert.match(linea, /https:\/\//));
        }
        if (comp.recursos.videos[0].includes('watch?v=')) directos++;
        if (comp.recursos.videos[0].includes('results?search_query=')) busquedas++;
    }));
    assert.strictEqual(total, 440);
    assert.strictEqual(directos, 269);
    assert.strictEqual(busquedas, 171);
});
