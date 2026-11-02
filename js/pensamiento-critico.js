/**
 * Evidencias observables y rúbrica común para valorar la presencia de pensamiento crítico.
 * La rúbrica orienta la valoración docente; no calcula una nota a partir de la competencia.
 */
(function (global) {
    'use strict';

    const U = global.Utilidades || require('./utilidades.js');

    const NIVELES = [
        {
            desde: 0, hasta: 0.99, etiqueta: 'No evidente',
            descripcion: 'No describe lo observado ni relaciona ideas con el criterio. Su escritura o conversación requiere guía constante y todavía no comunica lo aprendido con seguridad.'
        },
        {
            desde: 1, hasta: 1.99, etiqueta: 'Incipiente',
            descripcion: 'Reconoce aspectos obvios de la realidad y expresa opiniones con poca justificación. Escribe o conversa de forma fragmentaria y necesita preguntas de apoyo para explicar lo aprendido.'
        },
        {
            desde: 2, hasta: 2.99, etiqueta: 'En desarrollo',
            descripcion: 'Observa datos relevantes, reflexiona parcialmente sobre causas, procedimientos o resultados y contrasta algunas ideas. Su escritura es ordenada y conversa con cierta seguridad, aunque aún depende de apoyo para profundizar o considerar otras perspectivas.'
        },
        {
            desde: 3, hasta: 3.99, etiqueta: 'Logrado',
            descripcion: 'Observa y describe la realidad con precisión, reflexiona con base en el criterio y sustenta conclusiones. Comunica lo aprendido por escrito y en conversación con seguridad y dominio, escucha otros argumentos y adapta su explicación a entornos sociales y académicos.'
        },
        {
            desde: 4, hasta: 4.59, etiqueta: 'Alto',
            descripcion: 'Analiza críticamente la realidad, evalúa alternativas y revisa sus propios supuestos con evidencia. Dialoga de manera constructiva y adapta con autonomía sus explicaciones escritas y orales a distintos públicos y contextos.'
        },
        {
            desde: 4.6, hasta: 5, etiqueta: 'Superior',
            descripcion: 'Integra la observación, la reflexión y el diálogo para formular juicios matizados, transferir lo aprendido y cuestionar constructivamente distintas perspectivas. Escribe y conversa con independencia, seguridad y dominio en entornos sociales y académicos diversos.'
        }
    ];

    function nivelDe(valor) {
        const n = U.interpretarNumero(valor);
        if (n === null || n < 0 || n > 5) return null;
        return NIVELES.find(nivel => n >= nivel.desde && n <= nivel.hasta + 1e-9) || null;
    }

    function rango(nivel) {
        return `${nivel.desde.toFixed(2).replace('.', ',')}–${nivel.hasta.toFixed(2).replace('.', ',')}`;
    }

    function textoRubrica() {
        return [
            'Rúbrica común para valorar la evidencia de pensamiento crítico (0–5).',
            'No es una nota automática de la competencia: el docente valora la evidencia observable.',
            '',
            ...NIVELES.map(n => `${rango(n)} · ${n.etiqueta}: ${n.descripcion}`)
        ].join('\n');
    }

    function fragmento(texto) {
        const t = String(texto || '').replace(/\s+/g, ' ').replace(/^[-–•*]\s*/, '').replace(/[.]\s*$/, '').trim();
        return t ? t.charAt(0).toLowerCase() + t.slice(1) : '';
    }

    function generarEvidencia(competencia, criterio = '') {
        const texto = String(competencia || '').replace(/^\s*\d+\s*[.)\-–:]\s*/, '').trim();
        let tema = texto.replace(/\.$/, '').trim();
        const sinVerbo = tema.replace(/^\p{L}+(?:ar|er|ir)(?:se)?(?:\s+(?:y|e|o)\s+\p{L}+(?:ar|er|ir)(?:se)?)?\s+/iu, '');
        if (sinVerbo.split(/\s+/).length >= 2) tema = sinVerbo.replace(/^(con|a|de|en|por|sobre|para)\s+/i, '');
        tema = fragmento(tema) || 'la situación objeto de aprendizaje';
        const criterioTexto = fragmento(criterio) || 'la calidad de la actuación y del resultado';
        const normal = U.normalizarTexto(texto);
        let reflexion;

        if (/^(evaluar|valorar|validar|verificar|justificar|argumentar|contrastar|comparar|cuestionar|debatir)/.test(normal)) {
            reflexion = 'compara perspectivas, examina la pertinencia de la evidencia y revisa sus supuestos antes de formular un juicio fundamentado';
        } else if (/^(formular|modelar|disenar|crear|proponer|plantear|optimizar|decidir|investigar|innovar)/.test(normal)) {
            reflexion = 'reflexiona sobre las necesidades del contexto, las decisiones tomadas, las alternativas posibles y las consecuencias de su propuesta';
        } else if (/problema|context|situacion|real|fenomeno|econom|fisic|social|ambient|cotidian/.test(normal)) {
            reflexion = 'reflexiona sobre la relación entre lo aprendido y la realidad, las decisiones posibles, sus efectos y la información que falta para actuar con criterio';
        } else if (/^(analizar|interpretar|identificar|comprender|estudiar|determinar|describir|representar|establecer|reconocer|distinguir|explicar|clasificar|relacionar|examinar|demostrar|deducir)/.test(normal)) {
            reflexion = 'reflexiona sobre relaciones, diferencias, patrones y significados, formula preguntas y contrasta su interpretación con ejemplos y contraejemplos';
        } else {
            reflexion = 'reflexiona sobre los pasos seguidos, las decisiones, los resultados y los errores, y considera cómo mejorar o transferir el procedimiento a otra situación';
        }

        return `Evidencia de presencia: observa y describe ${tema} en ejemplos o situaciones de la realidad, distinguiendo información relevante y formulando preguntas sobre lo observado. ${reflexion.charAt(0).toUpperCase()}${reflexion.slice(1)}. Contrasta su razonamiento con el criterio «${criterioTexto}». Registra por escrito lo aprendido, sus decisiones y sus dudas; después lo dialoga con otras personas, escucha argumentos y responde con seguridad y dominio, adaptando la explicación a sus entornos sociales y académicos.`;
    }

    const PensamientoCritico = { NIVELES, nivelDe, rango, textoRubrica, generarEvidencia };
    global.PensamientoCritico = PensamientoCritico;
    if (typeof module !== 'undefined' && module.exports) module.exports = PensamientoCritico;
})(typeof window !== 'undefined' ? window : globalThis);
