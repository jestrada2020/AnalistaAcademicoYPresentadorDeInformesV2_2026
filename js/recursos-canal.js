/** Recursos públicos del canal john estrada y sitios del docente, asociados por tema. */
(function (global) {
    'use strict';

    const U = global.Utilidades || require('./utilidades.js');
    const CANAL = 'https://www.youtube.com/channel/UCe_8YXWBojXgfgaiQODPWTg/videos';
    const video = id => `https://www.youtube.com/watch?v=${id}`;

    const REGLAS = [
        { patron: /antiderivadas? trigonometric|integrales? .*trigonometric/, titulo: 'Antiderivadas trigonométricas: tabla e integrales indefinidas (Parte 2)', url: video('nLEdXPAQY4U') },
        { patron: /tabla de antiderivadas|tabla de integrales/, titulo: 'Tabla de antiderivadas completa: integrales indefinidas (Parte 3)', url: video('vPwoyn0rsRY') },
        { patron: /antiderivada|integral indefinida|primitiva/, titulo: 'Antiderivadas: concepto y tabla de integrales indefinidas (Parte 1)', url: video('OcRUNuMpNMA') },
        { patron: /integracion por partes/, titulo: 'Técnica de la tabla para integración por partes', url: video('-rxVCvNCF8w') },
        { patron: /sustitucion.*integral|integral.*sustitucion|cambio de variable.*integral/, titulo: 'Técnica de sustitución para integrales indefinidas', url: video('Ews4MBYBeBI') },
        { patron: /fracciones parciales|descomposicion.*fracciones/, titulo: 'Fracciones parciales: descomposición', url: video('WWaSswSs5nk') },
        { patron: /formula de reduccion.*seno|reduccion.*funcion seno/, titulo: 'Fórmula de reducción para integrales indefinidas con la función seno', url: video('qPTCl3_RK3c') },
        { patron: /formula de reduccion.*exponencial|reduccion.*exponencial/, titulo: 'Fórmula de reducción para integrar exponenciales', url: video('UgrYC9JMQyM') },
        { patron: /x-simple/, titulo: 'Región x-simple: área de un triángulo formado por tres segmentos', url: video('331rg5F3izI') },
        { patron: /y-simple/, titulo: 'Región y-simple: área entre una recta y una parábola', url: video('iA2Dyw4BEj0') },
        { patron: /nicotina.*boxplot|boxplot.*nicotina/, titulo: 'Bioestadística: ejemplo de la nicotina Boxplot', url: video('J7DueVawEUU') },
        { patron: /refrescos.*boxplot|boxplot.*refrescos/, titulo: 'Bioestadística: ejemplo de los refrescos Boxplot', url: video('gO3wYcMn9Ps') },
        { patron: /datos no agrupados.*par|numero par de datos/, titulo: 'Datos no agrupados con un número par de datos', url: video('vmT6VJk53hQ') },
        { patron: /datos no agrupados.*impar|numero impar de datos/, titulo: 'Datos no agrupados con un número impar de datos', url: video('6fzk_ZVkcas') },
        { patron: /nicotina.*datos agrupados/, titulo: 'Bioestadística: nicotina para datos agrupados', url: video('dU1oXqfb7fA') },
        { patron: /nicotina.*datos no agrupados/, titulo: 'Bioestadística: nicotina datos no agrupados', url: video('Ycv8CPkG2Jw') },
        { patron: /refrescos.*datos agrupados/, titulo: 'Bioestadística: refrescos datos agrupados', url: video('3BY6ltTFi_s') },
        { patron: /refrescos.*datos no agrupados/, titulo: 'Bioestadística: refrescos manejo de datos no agrupados', url: video('oo-eZAWszgo') },
        { patron: /unidad de observacion.*quimica|base de datos.*quimica/, titulo: 'De la unidad de observación a una base de datos en química', url: video('_m5ddwI-9zo') },
        { patron: /unidad de observacion.*fisica|base de datos.*fisica/, titulo: 'De la unidad de observación a una base de datos en física', url: video('c9DTa2An1qg') },
        { patron: /unidad de observacion.*ecologia|base de datos.*ecologia|dataframe.*ecologia/, titulo: 'De la unidad de observación a un dataframe en ecología', url: video('zd2Ku40ahB0') },
        { patron: /unidad de observacion|construccion.*base de datos|base de datos dataframe/, titulo: 'Construcción de una base de datos dataframe en biología', url: video('3c4oRkL2_2w') },
        { patron: /filtros.*desigualdades.*pandas|pandas.*desigualdades/, titulo: 'Dataframes: filtros con desigualdades y pandas', url: video('gzN7VTDyWPw') },
        { patron: /filtrado logico.*pandas|pandas.*filtrado logico/, titulo: 'Dataframe y filtrado lógico con pandas', url: video('eT1nRAJGDNg') },
        { patron: /operaciones entre filas|operaciones entre columnas/, titulo: 'Dataframes: operaciones entre filas y columnas con pandas', url: video('A9X0-QJSV2Q') },
        { patron: /dataframe|pandas/, titulo: 'Dataframes y pandas en Python', url: video('U_Yp9cA7hH4') },
        { patron: /excel.*csv|csv.*excel/, titulo: 'Google Colab: convertir Excel a CSV y cargarlo', url: video('A4FUP3M9ZDk') },
        { patron: /cargar datos.*csv|csv.*cargar datos/, titulo: 'Google Colab: cómo cargar datos en formato CSV', url: video('lm7MwqMPNJM') },
        { patron: /proyecto colaborativo|datos colaborativos|trabajo colaborativo/, titulo: 'Google Colab: configuración de proyectos colaborativos', url: video('tw9FqCLlLqo') },
        { patron: /google colab|colab/, titulo: 'Google Colab: tutorial para personalizar la configuración', url: video('5-Ded09PCKI') },
        { patron: /import.*from|from.*import/, titulo: 'Qué es import y qué es from en Python', url: video('Kqx45kvgahw') },
        { patron: /libreria math|biblioteca math/, titulo: 'Uso de la librería Math en Python', url: video('UgRuNxvQDYk') },
        { patron: /botones shiny|shiny for python/, titulo: 'Botones Shiny for Python (Parte 1)', url: video('mDglHFySmzA') },
        { patron: /punto fijo/, titulo: 'CASIO fx-350MS: método de punto fijo', url: video('bvoAqmacLVo') },
        { patron: /metodo secante/, titulo: 'CASIO fx-350MS: método secante para obtener raíces irracionales', url: video('TKXL_WrIEV0') },
        { patron: /biseccion/, titulo: 'CASIO fx-350MS: método de bisección', url: video('St2kbl1BIjs') },
        { patron: /newton|newthon/, titulo: 'CASIO fx-350MS: método de Newton-Raphson', url: video('b_uw2kAXpkA') },
        { patron: /cardano|cubica/, titulo: 'CASIO fx-350MS: solución de ecuación cúbica con el método de Cardano', url: video('RfaZt2wPU84') },
        { patron: /sarrus/, titulo: 'CASIO fx-350MS: regla de Sarrus para un determinante 3 por 3', url: video('pYtqfE_rtXE') },
        { patron: /cramer/, titulo: 'CASIO fx-350MS: regla de Cramer para un sistema 3X3', url: video('LjiBzs3f2fg') },
        { patron: /infinitas soluciones/, titulo: 'Solución por eliminación para un sistema de infinitas soluciones', url: video('ijjFz3qFB9I') },
        { patron: /ninguna solucion/, titulo: 'Sistemas de ecuaciones lineales 2 por 2: caso ninguna solución', url: video('Q5L_XibOiSE') },
        { patron: /sustitucion.*eliminacion.*cramer|eliminacion.*cramer/, titulo: 'Sistemas 2 por 2: sustitución, eliminación y regla de Cramer', url: video('HO42U1C-2rQ') },
        { patron: /sistema.*2 por 2|sistema.*2x2|sistemas? lineales? dos por dos/, titulo: 'Método de eliminación o reducción para un sistema lineal 2 por 2', url: video('DDACwvcwUbw') },
        { patron: /sistema.*3 por 3|sistema.*3x3/, titulo: 'Calculadora Casio fx-350MS: solución de un sistema 3 por 3', url: video('EpSmyXrbwWc') },
        { patron: /ecuaciones de la recta|ecuacion de la recta|linea recta/, titulo: 'Ecuaciones de la recta en el plano', url: video('QDvAAkKkSRk') },
        { patron: /funcion de dos variables|funciones multivariables|varias variables/, titulo: 'Concepto de función de dos variables reales', url: video('K1FwMyE1_1E') },
        { patron: /derivada parcial/, titulo: 'Concepto e interpretación geométrica de la derivada parcial en x e y', url: video('LvLwY4Yl7OY') },
        { patron: /superficie/, titulo: 'Superficies claves para los conceptos básicos de varias variables', url: video('7SFfhykkiVc') },
        { patron: /espacio 3d|puntos en el espacio/, titulo: 'Espacio 3D: ubicación de puntos en el espacio', url: video('ldSFlbdCy3k') },
        { patron: /criterio.*recta vertical|funcion en una variable/, titulo: 'Concepto de función en una variable real y criterio de la recta vertical', url: video('AWSXzPKzm-4') },
        { patron: /logistica/, titulo: 'Deducción de la ecuación logística: dos métodos de demostración', url: video('VFdqLxqz4M4') },
        { patron: /bio.?reactor/, titulo: 'Bio Reactor (Parte 1)', url: video('Y0XPC_ohq1s') },
        { patron: /dos tanques/, titulo: 'Deducción del sistema para dos tanques', url: video('_LTU2PCMKCU') },
        { patron: /mezclas|drenado/, titulo: 'Ejemplos de EDO: mezclas y drenado', url: video('GvSta_CuU84') },
        { patron: /ecuaciones diferenciales|\bedo\b|\bedp\b/, titulo: 'Concepto de EDO y EDP', url: video('JrUiXg_ewM4') },
        { patron: /completacion.*cuadrado|completar.*trinomio/, titulo: 'Trinomio cuadrado perfecto por completación', url: video('_XxheAlRoI4') },
        { patron: /discriminante|expresion cuadratica|ecuacion cuadratica/, titulo: 'Expresión cuadrática, ecuación cuadrática y discriminante', url: video('L1gwHr7Gv3s') },
        { patron: /factorizacion.*po shen|po shen lop|po shen loh/, titulo: 'Po Shen Loh: método e interpretación gráfica', url: video('6-FSlGjCGhg') },
        { patron: /factorizacion|trinomios cuadrados/, titulo: 'Factorización de trinomios cuadrados', url: video('NicDdU1HdBU') },
        { patron: /potenciacion y radicales|radicales.*potenciacion/, titulo: 'Simplificación de expresiones usando potenciación y radicales', url: video('rP9HljBaN0Y') },
        { patron: /potenciacion con fracciones/, titulo: 'Potenciación con fracciones', url: video('39pPj2mzZ9E') },
        { patron: /operaciones mixtas con fracciones/, titulo: 'Operaciones mixtas con fracciones', url: video('lmHpxDThezI') },
        { patron: /operaciones aritmeticas con fracciones|operaciones con fracciones|fracciones y decimales/, titulo: 'Operaciones aritméticas con fracciones', url: video('0ghKPQplRaE') },
        { patron: /regla de tres compuesta/, titulo: 'Regla de tres compuesta', url: video('tZqsQ1WhmqI') },
        { patron: /regla de tres inversa/, titulo: 'Regla de tres inversa', url: video('-MjFh-aIBnQ') },
        { patron: /regla de tres|proporciones|proporcionalidad|porcentajes/, titulo: 'Regla de tres simple directa e inversa', url: video('drsfOPmwddk') },
        { patron: /despeje de variable|despejar.*variable/, titulo: 'Despeje de variable aplicado en diversos campos de ciencias', url: video('ZorbD4FDix8') },
        { patron: /desigualdades con fracciones/, titulo: 'Método de los signos aplicado a desigualdades con fracciones', url: video('IF_4f2wSvEQ') },
        { patron: /palabras a simbolos.*desigualdades/, titulo: 'De palabras a símbolos con desigualdades', url: video('kQZrffu3PeQ') },
        { patron: /tecnica de los signos|metodo de los signos/, titulo: 'Técnica de los signos: tres casos', url: video('BiYSEn1r8QQ') },
        { patron: /teoria de conjuntos|conjuntos de la recta real|conjuntos numericos/, titulo: 'Teoría de conjuntos y sus propiedades', url: video('vd_cFLjyk3w') },
        { patron: /conjuntos/, titulo: 'Conjuntos: teoría de conjuntos y conceptos clave', url: video('6uRsqlEzDG8') },
        { patron: /areas.*volumenes|volumenes.*areas/, titulo: 'Áreas y volúmenes de conceptos geométricos clave', url: video('XUDgJga7zSI') },
        { patron: /conceptos geometricos|geometria.*problemas/, titulo: 'Conceptos geométricos claves en el planteo y solución de problemas', url: video('WadkpkbyfRY') },
        { patron: /edades/, titulo: 'Planteo y solución de problemas con G. Polya: modelo de edades', url: video('C01tANWnSNU') },
        { patron: /agropecuaria|agropecuarios/, titulo: 'Planteo y solución de problemas con G. Polya aplicados al agro', url: video('11bNyZW9tlY') },
        { patron: /problema|modelar|modelacion|planteo y solucion/, titulo: 'Planteo y solución de problemas con la metodología de G. Polya', url: video('YDp9lOeFBXI') },
        { patron: /parentesis|corchetes|llaves/, titulo: 'Manejo de paréntesis, corchetes y llaves en operaciones', url: video('AwS2nmRv-U4') },
        { patron: /orden de operaciones/, titulo: 'Orden de operaciones aritméticas', url: video('Kio46hWuFJ0') },
        { patron: /manejo de signos/, titulo: 'Manejo de signos en expresiones algebraicas', url: video('_FNf5w7p8_U') },
        { patron: /conversion de unidades|unidades de medida/, titulo: 'Conversión de unidades', url: video('cC8CXtesWNg') },
        { patron: /integrales?|integral/, titulo: 'Tabla de integrales', url: video('2r-ceAel25M') },
        { patron: /operaciones con numeros/, titulo: 'Orden de operaciones aritméticas', url: video('Kio46hWuFJ0') },
        { patron: /calculadora casio|casio fx/, titulo: 'Manejo básico de la calculadora Casio fx-350MS', url: video('PqjJrjjaNk4') }
    ];

    function textoDe(competencia, curso = '') {
        return U.normalizarTexto(`${curso} ${competencia?.texto || competencia || ''} ${competencia?.criterio || ''}`);
    }

    function videoPara(competencia, curso = '') {
        const texto = textoDe(competencia, curso);
        return REGLAS.find(regla => regla.patron.test(texto)) || null;
    }

    function webPara(competencia, curso = '') {
        const texto = textoDe(competencia, curso);
        if (/python|programacion|algoritm|pandas|dataframe|software|codigo/.test(texto)) {
            return { titulo: 'Tutorial oficial de Python', url: 'https://docs.python.org/es/3/tutorial/' };
        }
        if (/inteligencia artificial|machine learning|aprendizaje automatico|aprendizaje profundo|redes neuronales|\bias?\b/.test(texto)) {
            return { titulo: 'Google: aprendizaje automático', url: 'https://developers.google.com/machine-learning?hl=es-419' };
        }
        if (/varias variables|ecuaciones diferenciales|analisis numerico/.test(texto)) {
            return { titulo: 'Matemáticas Tres UCES', url: 'https://jestrada2020.github.io/MatematicasTres2026/' };
        }
        if (/calculo|algebra lineal/.test(texto)) {
            return { titulo: 'Matemáticas Dos UCES', url: 'https://jestrada2020.github.io/MatematicasDos/' };
        }
        return { titulo: 'Matemáticas Uno UCES', url: 'https://jestrada2020.github.io/MatematicaUnoCES2026/' };
    }

    function recursosPara(competencia, curso = '') {
        const directo = videoPara(competencia, curso);
        const tema = (competencia?.texto || String(competencia || '')).replace(/^\s*\d+\s*[.)\-–:]\s*/, '');
        const busqueda = {
            titulo: `Búsqueda en YouTube: john estrada ${tema}`,
            url: `https://www.youtube.com/results?search_query=${encodeURIComponent(`john estrada ${tema}`)}`
        };
        return {
            web: [webPara(competencia, curso)],
            videos: [directo || busqueda],
            directo: Boolean(directo),
            canal: CANAL
        };
    }

    function comoLinea(recurso) {
        return `${recurso.titulo} | ${recurso.url}`;
    }

    const RecursosCanal = { CANAL, REGLAS, videoPara, webPara, recursosPara, comoLinea };
    global.RecursosCanal = RecursosCanal;
    if (typeof module !== 'undefined' && module.exports) module.exports = RecursosCanal;
})(typeof window !== 'undefined' ? window : globalThis);
