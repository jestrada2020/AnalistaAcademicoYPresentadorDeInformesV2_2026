const fs = require('node:fs');
const path = require('node:path');
const XLSX = require('xlsx');
const PensamientoCritico = require('./js/pensamiento-critico.js');

const argumentoArchivo = process.argv.slice(2).find(arg => !arg.startsWith('--'));
const archivo = path.resolve(argumentoArchivo || 'COMPETANCIASporCURSOS.xlsx');
const comprobar = process.argv.includes('--check');
const respaldo = archivo.replace(/\.xlsx$/i, '.backup.xlsx');
const libro = XLSX.readFile(archivo, { cellStyles: true, cellDates: true });
let competencias = 0;

for (const nombre of libro.SheetNames) {
    const hoja = libro.Sheets[nombre];
    const rango = XLSX.utils.decode_range(hoja['!ref'] || 'A1');
    let filaEncabezado = -1;

    for (let fila = rango.s.r; fila <= Math.min(rango.e.r, rango.s.r + 9); fila++) {
        const a = hoja[XLSX.utils.encode_cell({ r: fila, c: 0 })];
        const b = hoja[XLSX.utils.encode_cell({ r: fila, c: 1 })];
        if (/competencia/i.test(String(a?.v || '')) && /criterio/i.test(String(b?.v || ''))) {
            filaEncabezado = fila;
            break;
        }
    }
    if (filaEncabezado < 0) throw new Error(`La hoja «${nombre}» no tiene encabezados de competencias y criterios.`);

    const celdaEncabezado = XLSX.utils.encode_cell({ r: filaEncabezado, c: 2 });
    hoja[celdaEncabezado] = {
        t: 's',
        v: 'Pensamiento Critico',
        c: [{ a: 'Analista Académico', t: PensamientoCritico.textoRubrica() }]
    };

    for (let fila = filaEncabezado + 1; fila <= rango.e.r; fila++) {
        const a = hoja[XLSX.utils.encode_cell({ r: fila, c: 0 })];
        const b = hoja[XLSX.utils.encode_cell({ r: fila, c: 1 })];
        const competencia = String(a?.v || '').trim();
        if (!/^\d+\s*[.)\-–:]/.test(competencia)) continue;
        const evidencia = PensamientoCritico.generarEvidencia(competencia, String(b?.v || '').trim());
        hoja[XLSX.utils.encode_cell({ r: fila, c: 2 })] = { t: 's', v: evidencia };
        competencias++;
    }

    rango.e.c = Math.max(rango.e.c, 2);
    hoja['!ref'] = XLSX.utils.encode_range(rango);
    const columnas = hoja['!cols'] || [{ wch: 65 }, { wch: 55 }];
    columnas[2] = { wch: 90 };
    hoja['!cols'] = columnas;
}

if (!competencias) throw new Error('No se encontraron competencias numeradas.');
console.log(`${libro.SheetNames.length} hojas revisadas; ${competencias} evidencias preparadas.`);

if (!comprobar) {
    if (!fs.existsSync(respaldo)) fs.copyFileSync(archivo, respaldo);
    XLSX.writeFile(libro, archivo, { bookType: 'xlsx', compression: true });
    console.log(`Catálogo actualizado: ${archivo}`);
    console.log(`Copia del archivo anterior: ${respaldo}`);
}
