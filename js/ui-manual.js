/**
 * Pestaña 7 · Manual del usuario: muestra el PDF del manual (manual/manual_usuario.pdf, generado desde LaTeX)
 * con un índice lateral que lleva a la página de cada tema. El índice lo genera manual/construir_manual.sh
 * en manual/manual-indice.js (window.MANUAL_INDICE).
 */
(function (global) {
    'use strict';

    const U = global.Utilidades;
    const e = U.escaparHTML;
    const $ = id => document.getElementById(id);
    const PDF = 'manual/manual_usuario.pdf';

    let actual = null; // índice del tema mostrado
    let iniciado = false;

    function datos() {
        return global.MANUAL_INDICE || { temas: [], etiquetas: {}, ayuda: {} };
    }

    function urlPagina(pagina) {
        return `${PDF}#page=${pagina || 1}&zoom=page-width`;
    }

    /** Muestra el PDF en una página. Se recarga el visor para que todos los navegadores respeten #page. */
    function irAPagina(pagina, i = null) {
        const visor = $('manualVisor');
        const url = urlPagina(pagina);
        actual = i;
        visor.src = 'about:blank';
        setTimeout(() => { visor.src = url; }, 40);
        $('manualNuevaPestana').href = url;
        const tema = i !== null ? datos().temas[i] : null;
        $('manualTitulo').textContent = tema ? `${tema.numero ? `${tema.numero}. ` : ''}${tema.titulo} · página ${tema.pagina}` : 'Manual del usuario';
        marcarActivo();
    }

    function irATema(i) {
        const t = datos().temas[i];
        if (t) irAPagina(t.pagina, i);
    }

    /** Abre el manual en el capítulo que explica la pestaña indicada. */
    function ayudaDe(pestana) {
        const d = datos();
        const etiqueta = d.ayuda[pestana] || 'mapa';
        const pagina = d.etiquetas[etiqueta] || 1;
        App.irA('manual');
        const i = d.temas.findIndex(t => t.pagina === pagina && t.nivel === 0);
        irAPagina(pagina, i >= 0 ? i : null);
    }

    function marcarActivo() {
        document.querySelectorAll('#manualIndice button').forEach(b => b.classList.toggle('activo', +b.dataset.tema === actual));
        $('manualAnteriorBtn').disabled = actual === null || actual <= 0;
        $('manualSiguienteBtn').disabled = actual !== null && actual >= datos().temas.length - 1;
    }

    function renderIndice() {
        const q = U.normalizarTexto($('manualBuscar').value);
        const temas = datos().temas;
        $('manualIndice').innerHTML = temas.map((t, i) => ({ t, i }))
            .filter(({ t }) => !q || U.normalizarTexto(`${t.numero} ${t.titulo} ${t.claves || ''}`).includes(q))
            .map(({ t, i }) => `<button type="button" class="nivel-${t.nivel}" data-tema="${i}"><span>${t.numero ? `${e(t.numero)}&nbsp;` : ''}${e(t.titulo)}</span><span class="pag">p.&nbsp;${t.pagina}</span></button>`)
            .join('') || '<p class="text-sm text-gray-500">No hay temas que coincidan.</p>';
        marcarActivo();
    }

    function render() {
        renderIndice();
        if (!iniciado) { iniciado = true; irAPagina(1, null); }
    }

    function init() {
        $('manualBuscar').addEventListener('input', renderIndice);
        $('manualIndice').addEventListener('click', ev => {
            const b = ev.target.closest('[data-tema]');
            if (b) irATema(+b.dataset.tema);
        });
        $('manualAnteriorBtn').addEventListener('click', () => irATema(actual === null ? 0 : actual - 1));
        $('manualSiguienteBtn').addEventListener('click', () => irATema(actual === null ? 0 : actual + 1));
    }

    global.UIManual = { init, render, ayudaDe, irAPagina };
})(window);
