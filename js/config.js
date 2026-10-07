/**
 * Configuración global del Analista Académico.
 */
(function (global) {
    'use strict';

    const CONFIG = {
        VERSION: '4.0.0',
        CLAVE_ALMACENAMIENTO: 'analistaAcademicoV4',
        CLAVE_ANTERIOR: 'analistaAcademicoV3',

        ESCALA_POR_DEFECTO: { minima: 0, maxima: 5, aprobatoria: 3, decimales: 2 },

        // Niveles de desempeño (escala colombiana, Decreto 1290). "desde" es el límite inferior incluido.
        NIVELES_POR_DEFECTO: [
            { nombre: 'Superior', desde: 4.6, color: '#047857' },
            { nombre: 'Alto', desde: 4.0, color: '#2563eb' },
            { nombre: 'Básico', desde: 3.0, color: '#d97706' },
            { nombre: 'Bajo', desde: 0, color: '#dc2626' }
        ],

        TIPOS_EVALUACION: {
            parcial: 'Parcial',
            quiz: 'Quiz',
            taller: 'Taller / trabajo',
            seguimiento: 'Seguimiento',
            proyecto: 'Proyecto',
            final: 'Examen final',
            otro: 'Otra evaluación'
        },

        // Columnas numéricas que se leen pero no forman parte de la nota (se muestran como referencia).
        TIPOS_INFORMATIVA: {
            definitiva: 'Definitiva registrada',
            faltas: 'Inasistencias',
            informativa: 'Dato informativo'
        },

        // Estado académico de cada estudiante según lo evaluado y lo que falta por evaluar.
        ESTADOS: {
            aprobado: { etiqueta: 'Aprobado', corta: 'Aprobado', color: '#047857', fondo: '#d1fae5', orden: 0 },
            asegurado: { etiqueta: 'Aprobación asegurada', corta: 'Asegurada', color: '#047857', fondo: '#d1fae5', orden: 1 },
            aprobando: { etiqueta: 'Va aprobando', corta: 'Aprobando', color: '#2563eb', fondo: '#dbeafe', orden: 2 },
            riesgo: { etiqueta: 'En riesgo', corta: 'En riesgo', color: '#b45309', fondo: '#fef3c7', orden: 3 },
            'riesgo-alto': { etiqueta: 'Riesgo alto', corta: 'Riesgo alto', color: '#c2410c', fondo: '#ffedd5', orden: 4 },
            perdido: { etiqueta: 'Ya no alcanza', corta: 'No alcanza', color: '#b91c1c', fondo: '#fee2e2', orden: 5 },
            reprobado: { etiqueta: 'Reprobado', corta: 'Reprobado', color: '#b91c1c', fondo: '#fee2e2', orden: 6 },
            'sin-datos': { etiqueta: 'Sin calificaciones', corta: 'Sin notas', color: '#4b5563', fondo: '#f3f4f6', orden: 7 }
        },


        /**
         * Carácter (dimensión) de cada competencia. Se clasifica automáticamente por los verbos y sustantivos
         * de la competencia y de su criterio (taxonomía de Bloom simplificada); el docente puede corregirlo.
         *  - verbos: verbo con el que empieza la competencia (pesa 3).
         *  - claves: raíces de palabras en el texto o el criterio (pesan 1).
         */
        DIMENSIONES: {
            analitico: {
                etiqueta: 'Analítico', corta: 'Anal.', color: '#2563eb', fondo: '#dbeafe',
                descripcion: 'Comprender, interpretar, analizar y relacionar conceptos',
                verbos: ['comprender', 'analizar', 'identificar', 'interpretar', 'estudiar', 'determinar', 'describir', 'representar', 'comparar', 'establecer', 'reconocer', 'distinguir', 'explicar', 'clasificar', 'relacionar', 'examinar', 'demostrar', 'deducir', 'definir', 'caracterizar', 'visualizar', 'familiarizarse', 'conocer', 'entender', 'estimar', 'observar', 'abstraer'],
                claves: ['analisis', 'interpret', 'identific', 'comprension', 'reconoc', 'clasific', 'comparac', 'relacion', 'deduc', 'detecc', 'descripc', 'representac', 'concept', 'demostrac', 'propiedad', 'teorema', 'definicion'],
                recomendaciones: [
                    'Trabajar mapas conceptuales y pedir que expliquen los conceptos con sus propias palabras.',
                    'Analizar ejemplos resueltos: identificar cada paso del procedimiento y por qué se hace.',
                    'Incluir preguntas de interpretación de gráficas, tablas y resultados en clases y evaluaciones.'
                ]
            },
            practico: {
                etiqueta: 'Práctico', corta: 'Prác.', color: '#059669', fondo: '#d1fae5',
                descripcion: 'Aplicar procedimientos, resolver ejercicios, calcular y usar herramientas',
                verbos: ['resolver', 'aplicar', 'utilizar', 'usar', 'calcular', 'implementar', 'desarrollar', 'trabajar', 'emplear', 'simplificar', 'construir', 'manejar', 'operar', 'factorizar', 'manipular', 'documentar', 'desplegar', 'entrenar', 'realizar', 'configurar', 'ejecutar', 'programar', 'graficar', 'trazar', 'derivar', 'integrar', 'expresar', 'convertir', 'medir', 'elaborar', 'codificar', 'participar', 'hallar', 'encontrar', 'efectuar', 'practicar'],
                claves: ['aplicac', ' uso ', 'resolucion', 'calculo', 'precision', 'implementac', 'desarrollo', 'manejo', 'construcc', 'ejecuc', 'procedimiento', 'operacion', 'ejercicio', 'herramienta', 'software', 'codific', 'algoritm'],
                recomendaciones: [
                    'Talleres de ejercitación graduada (de lo básico a lo complejo) con retroalimentación inmediata.',
                    'Práctica con herramientas digitales (GeoGebra, Symbolab, Colab) para verificar los procedimientos.',
                    'Asesorías de resolución de ejercicios tipo examen y listas de ejercicios por tema.'
                ]
            },
            critico: {
                etiqueta: 'Pensamiento crítico', corta: 'Crít.', color: '#9333ea', fondo: '#f3e8ff',
                descripcion: 'Evaluar, argumentar, justificar, modelar y decidir ante problemas',
                verbos: ['evaluar', 'valorar', 'validar', 'justificar', 'argumentar', 'juzgar', 'criticar', 'optimizar', 'disenar', 'crear', 'modelar', 'formular', 'plantear', 'proponer', 'decidir', 'seleccionar', 'elegir', 'contrastar', 'verificar', 'reflexionar', 'cuestionar', 'debatir', 'inferir', 'sintetizar', 'concluir', 'generalizar', 'investigar', 'innovar'],
                claves: ['evaluacion', 'justific', 'argument', 'verific', 'validac', 'modelad', 'modelo', 'planteamiento', 'formulac', 'decision', 'creacion', 'optimiz', 'critic', 'context', 'situaciones reales', 'problemas reales', 'problemas aplicados', 'eleccion', 'pertinen', ' etica', 'sesgo', 'limitacion', 'mejora', 'adaptac', 'interpretacion de resultados'],
                recomendaciones: [
                    'Plantear problemas abiertos y contextualizados en los que el estudiante deba justificar sus decisiones.',
                    'Pedir que validen y critiquen soluciones propias y ajenas: ¿el resultado es razonable?, ¿hay otra vía?',
                    'Usar debates, coevaluación y escritura de argumentos (explicar por qué, no solo cómo).'
                ]
            }
        },

        // Resolver problemas en contexto (optimización, modelación, fenómenos reales...) se considera pensamiento crítico.
        PROBLEMA_EN_CONTEXTO: ['optimiz', 'model', 'context', 'aplicad', ' real', 'fenomeno', 'econom', 'fisic', 'ingenier', 'financ', 'decision', 'situacion'],

        // Carácter sugerido para evaluaciones sin competencias asociadas, según su tipo.
        CARACTER_POR_TIPO: { taller: 'practico', seguimiento: 'practico', proyecto: 'critico' },

        // Si la nota necesaria para aprobar supera este valor se considera "riesgo alto".
        UMBRAL_RIESGO_ALTO: 4.0,

        TIPOS_RECURSO: {
            web: 'Páginas web',
            videos: 'Videos',
            ejercicios: 'Ejercicios recomendados',
            herramientas: 'Herramientas virtuales'
        },

        // Herramientas sugeridas según palabras del nombre del curso.
        HERRAMIENTAS_POR_AREA: [
            { patron: /calculo|integral|diferencial|variables|funcion/, herramientas: ['GeoGebra | https://www.geogebra.org/calculator', 'Desmos | https://www.desmos.com/calculator', 'Symbolab | https://es.symbolab.com', 'WolframAlpha | https://www.wolframalpha.com'] },
            { patron: /algebra lineal|matriz|matrices|vector/, herramientas: ['GeoGebra 3D | https://www.geogebra.org/3d', 'Matrix Calculator | https://matrixcalc.org/es/', 'WolframAlpha | https://www.wolframalpha.com'] },
            { patron: /geometr|trigonom/, herramientas: ['GeoGebra Geometría | https://www.geogebra.org/geometry', 'Desmos | https://www.desmos.com/calculator'] },
            { patron: /ecuaciones diferenciales|edo/, herramientas: ['WolframAlpha | https://www.wolframalpha.com', 'GeoGebra (campos de pendientes) | https://www.geogebra.org/calculator', 'Symbolab | https://es.symbolab.com'] },
            { patron: /numeric|metodos/, herramientas: ['Google Colab (Python) | https://colab.research.google.com', 'GeoGebra | https://www.geogebra.org/calculator'] },
            { patron: /program|algoritm|python|codigo/, herramientas: ['Python Tutor | https://pythontutor.com', 'Google Colab | https://colab.research.google.com', 'Replit | https://replit.com'] },
            { patron: /\bia\b|ias|inteligencia artificial|machine|aprendizaje/, herramientas: ['Google Colab | https://colab.research.google.com', 'Teachable Machine | https://teachablemachine.withgoogle.com', 'Kaggle Learn | https://www.kaggle.com/learn'] },
            { patron: /aritmet|algebra|matemat|mate/, herramientas: ['GeoGebra | https://www.geogebra.org/calculator', 'Khan Academy | https://es.khanacademy.org', 'Symbolab | https://es.symbolab.com'] },
            { patron: /estadist|probabil/, herramientas: ['GeoGebra Probabilidad | https://www.geogebra.org/probability', 'Google Colab | https://colab.research.google.com'] }
        ],

        // Plantillas de enlaces de búsqueda para sugerir recursos a partir del texto de una competencia.
        BUSQUEDAS: {
            web: [
                { nombre: 'Khan Academy', url: 'https://es.khanacademy.org/search?page_search_query=' },
                { nombre: 'Búsqueda académica', url: 'https://www.google.com/search?q=' }
            ],
            videos: [
                { nombre: 'YouTube', url: 'https://www.youtube.com/results?search_query=' }
            ]
        },

        PRESETS_PESOS: [
            { id: 'iguales', etiqueta: 'Todas iguales' },
            { id: '80-20', etiqueta: 'Parciales 80% · Quices 20%', parciales: 80 },
            { id: '70-30', etiqueta: 'Parciales 70% · Quices 30%', parciales: 70 },
            { id: '60-40', etiqueta: 'Parciales 60% · Quices 40%', parciales: 60 }
        ]
    };

    global.CONFIG = CONFIG;
    if (typeof module !== 'undefined' && module.exports) module.exports = CONFIG;
})(typeof window !== 'undefined' ? window : globalThis);
