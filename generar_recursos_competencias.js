const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');
const U = require('./js/utilidades.js');
const Recursos = require('./js/recursos.js');
const RecursosCanal = require('./js/recursos-canal.js');
const PensamientoCritico = require('./js/pensamiento-critico.js');

const argumentoArchivo = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const archivo = path.resolve(argumentoArchivo || 'COMPETANCIASporCURSOS.xlsx');
const comprobar = process.argv.includes('--check');
const respaldo = archivo.replace(/\.xlsx$/i, '.recursos.backup.xlsx');
const libro = XLSX.readFile(archivo, { cellStyles: true, cellDates: true });
let competencias = 0;
let directos = 0;
let escritas = 0;

for (const nombre of libro.SheetNames) {
    const hoja = libro.Sheets[nombre];
    const filas = XLSX.utils.sheet_to_json(hoja, { header: 1, defval: '', raw: true });
    const iEnc = filas.findIndex(fila => fila.some(c => /competencia/i.test(String(c))) && fila.some(c => /criterio/i.test(String(c))));
    if (iEnc < 0) throw new Error(`La hoja «${nombre}» no tiene los encabezados esperados.`);
    const encabezados = filas[iEnc].map(c => U.normalizarTexto(c));
    const colComp = encabezados.findIndex(h => /competencia/.test(h));
    const colCrit = encabezados.findIndex(h => /criterio|indicador|evidencia|desempeno/.test(h) && !/pensamiento critico/.test(h));
    const columnas = {};
    const nuevas = [['web', 'Páginas web'], ['videos', 'Videos'], ['ejercicios', 'Ejercicios'], ['herramientas', 'Herramientas']];
    nuevas.forEach(([tipo, titulo]) => {
        let col = encabezados.findIndex(h => h === U.normalizarTexto(titulo));
        if (col < 0) col = filas[iEnc].length;
        filas[iEnc][col] = titulo;
        columnas[tipo] = col;
    });

    filas.slice(iEnc + 1).forEach((fila, i) => {
        const bruto = String(fila[colComp] || '').trim();
        if (!/^\d+\s*[.)\-–:]/.test(bruto)) return;
        const textoCompetencia = bruto.replace(/^\d+\s*[.)\-–:]\s*/, '');
        const comp = { texto: textoCompetencia, criterio: String(fila[colCrit] || '').trim() };
        const tema = Recursos.temaDeCompetencia(textoCompetencia);
        const personalizados = RecursosCanal.recursosPara(comp, nombre);
        const q = encodeURIComponent(tema).replace(/%20/g, '+');
        const recursos = {
            web: [
                ...personalizados.web.map(RecursosCanal.comoLinea),
                `Khan Academy: ${tema} | https://es.khanacademy.org/search?page_search_query=${q}`
            ],
            videos: personalizados.videos.map(RecursosCanal.comoLinea),
            ejercicios: [`Ejercicios resueltos: ${tema} | https://www.google.com/search?q=${encodeURIComponent(`ejercicios resueltos ${tema} pdf`)}`],
            herramientas: Recursos.herramientasDelArea(`${nombre} ${bruto}`)
        };
        Object.entries(recursos).forEach(([tipo, lineas]) => {
            const col = columnas[tipo];
            if (!process.argv.includes('--force') && String(fila[col] || '').trim()) return;
            fila[col] = lineas.join('\n');
            escritas++;
        });
        competencias++;
        if (personalizados.directo) directos++;
    });

    const hojaNueva = XLSX.utils.aoa_to_sheet(filas);
    Object.keys(hoja).forEach(k => {
        if (!k.startsWith('!') && !hojaNueva[k]) hojaNueva[k] = hoja[k];
        if (!k.startsWith('!') && hoja[k]?.c && !hojaNueva[k]?.c) hojaNueva[k].c = hoja[k].c;
        if (k.startsWith('!') && k !== '!ref' && hojaNueva[k] === undefined) hojaNueva[k] = hoja[k];
    });
    if (U.normalizarTexto(filas[iEnc][2]) === 'pensamiento critico') {
        hojaNueva.C1.c = [{ a: 'Analista Académico', t: PensamientoCritico.textoRubrica() }];
    }
    hojaNueva['!cols'] = hoja['!cols'] || [{ wch: 65 }, { wch: 55 }, { wch: 90 }];
    hojaNueva['!cols'][columnas.web] = { wch: 65 };
    hojaNueva['!cols'][columnas.videos] = { wch: 70 };
    hojaNueva['!cols'][columnas.ejercicios] = { wch: 55 };
    hojaNueva['!cols'][columnas.herramientas] = { wch: 45 };
    hojaNueva[XLSX.utils.encode_cell({ r: iEnc, c: columnas.videos })].c = [{
        a: 'Analista Académico',
        t: `Recursos asociados por competencia y criterio a partir del canal público john estrada: ${RecursosCanal.CANAL}`
    }];
    libro.Sheets[nombre] = hojaNueva;
}

if (!competencias) throw new Error('No se encontraron competencias numeradas.');
console.log(`${competencias} competencias: ${directos} videos directos y ${competencias - directos} búsquedas específicas. ${escritas} celdas nuevas.`);

if (!comprobar) {
    if (!fs.existsSync(respaldo)) fs.copyFileSync(archivo, respaldo);
    XLSX.writeFile(libro, archivo, { bookType: 'xlsx', compression: true });
    console.log(`Recursos incorporados: ${archivo}`);
    console.log(`Copia anterior: ${respaldo}`);
}
