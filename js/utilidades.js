/**
 * Utilidades compartidas: texto, números, estadística, notificaciones, pantalla de carga y modales.
 * Las funciones que no usan el DOM se pueden probar en Node.
 */
(function (global) {
    'use strict';

    // ---------------------------------------------------------------- Texto

    /** Escapa texto para insertarlo de forma segura dentro de HTML. */
    function escaparHTML(valor) {
        if (valor === null || valor === undefined) return '';
        return String(valor)
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#39;');
    }

    /** Minúsculas, sin tildes ni espacios sobrantes: sirve para comparar textos escritos a mano. */
    function normalizarTexto(valor) {
        return String(valor ?? '')
            .normalize('NFD')
            .replace(/[̀-ͯ]/g, '')
            .toLowerCase()
            .replace(/\s+/g, ' ')
            .trim();
    }

    /** "ARAQUE RUIZ MARIANA" -> "Araque Ruiz Mariana" (respeta nombres ya escritos en mayúsculas y minúsculas). */
    function nombrePropio(texto) {
        const t = String(texto ?? '').replace(/\s+/g, ' ').trim();
        if (t !== t.toUpperCase()) return t;
        return t.toLowerCase().replace(/(^|[\s-])(\p{L})/gu, (m, sep, letra) => sep + letra.toUpperCase());
    }

    function generarId(prefijo = 'id') {
        return `${prefijo}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
    }

    function nombreArchivoSeguro(texto) {
        return normalizarTexto(texto).replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '') || 'archivo';
    }

    function fechaISO() {
        return new Date().toISOString().slice(0, 10);
    }

    /** Fecha legible en español: "7 de octubre de 2026". Acepta "2026-10-07" o un Date. */
    function fechaLarga(valor) {
        const MESES = ['enero', 'febrero', 'marzo', 'abril', 'mayo', 'junio', 'julio', 'agosto', 'septiembre', 'octubre', 'noviembre', 'diciembre'];
        let f = valor instanceof Date ? valor : null;
        const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(valor ?? ''));
        if (!f && m) f = new Date(+m[1], +m[2] - 1, +m[3]);
        if (!f) f = new Date();
        return `${f.getDate()} de ${MESES[f.getMonth()]} de ${f.getFullYear()}`;
    }

    // ---------------------------------------------------------------- Números

    function redondear(valor, decimales = 2) {
        const f = 10 ** decimales;
        return Math.round((Number(valor) || 0) * f + Number.EPSILON) / f;
    }

    /**
     * Interpreta un valor de celda como número: 3.5, "3,5", " 4 " -> número; "", "NP", "-" -> null.
     * @returns {number|null}
     */
    function interpretarNumero(valor) {
        if (valor === null || valor === undefined) return null;
        if (typeof valor === 'number') return Number.isFinite(valor) ? valor : null;
        const t = String(valor).trim().replace(/\s/g, '');
        if (!t) return null;
        if (!/^[-+]?\d*[.,]?\d+$/.test(t)) return null;
        const n = parseFloat(t.replace(',', '.'));
        return Number.isFinite(n) ? n : null;
    }

    /** Nota con los decimales configurados o "—" si no hay valor. */
    function formatoNota(valor, decimales = 2) {
        return valor === null || valor === undefined || Number.isNaN(valor) ? '—' : Number(valor).toFixed(decimales);
    }

    function formatoPorcentaje(valor, decimales = 0) {
        return valor === null || valor === undefined || Number.isNaN(valor) ? '—' : `${redondear(valor, decimales)}%`;
    }

    // ---------------------------------------------------------------- Estadística

    function media(valores) {
        return valores.length ? valores.reduce((a, b) => a + b, 0) / valores.length : null;
    }

    function mediana(valores) {
        if (!valores.length) return null;
        const v = [...valores].sort((a, b) => a - b);
        const m = Math.floor(v.length / 2);
        return v.length % 2 ? v[m] : (v[m - 1] + v[m]) / 2;
    }

    /** Desviación estándar poblacional. */
    function desviacion(valores) {
        if (valores.length < 2) return valores.length ? 0 : null;
        const m = media(valores);
        return Math.sqrt(valores.reduce((s, x) => s + (x - m) ** 2, 0) / valores.length);
    }

    // ---------------------------------------------------------------- Recursos

    /**
     * Interpreta una línea de recurso: "Título | https://..." , "https://..." o texto libre.
     * @returns {{ titulo: string, url: string|null }}
     */
    function interpretarRecurso(linea) {
        const t = String(linea ?? '').trim();
        if (!t) return null;
        const partes = t.split('|').map(s => s.trim());
        const url = partes.find(p => /^https?:\/\//i.test(p)) || (t.match(/https?:\/\/\S+/i) || [])[0] || null;
        let titulo = partes.find(p => p && p !== url) || '';
        if (!titulo && url) titulo = url.replace(/^https?:\/\/(www\.)?/i, '').replace(/\/$/, '');
        if (!titulo) titulo = t;
        return { titulo, url };
    }

    function lineas(texto) {
        return String(texto ?? '').split(/\r?\n/).map(s => s.trim()).filter(Boolean);
    }

    const Utilidades = {
        escaparHTML, normalizarTexto, nombrePropio, generarId, nombreArchivoSeguro, fechaISO, fechaLarga,
        redondear, interpretarNumero, formatoNota, formatoPorcentaje, media, mediana, desviacion,
        interpretarRecurso, lineas
    };

    global.Utilidades = Utilidades;
    if (typeof module !== 'undefined' && module.exports) module.exports = Utilidades;

    if (typeof document === 'undefined') return;

    // ---------------------------------------------------------------- Notificaciones (toast)

    const ICONOS = {
        success: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7"/>',
        error: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/>',
        warning: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"/>',
        info: '<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"/>'
    };

    /**
     * Muestra una notificación flotante.
     * @param {string} titulo
     * @param {string} mensaje Texto plano (se escapa).
     * @param {'info'|'success'|'warning'|'error'} tipo
     * @param {number} duracion Milisegundos visibles.
     */
    function mostrarNotificacion(titulo, mensaje, tipo = 'info', duracion = 5000) {
        const contenedor = document.getElementById('toastContainer');
        if (!contenedor) { console.log(`[${tipo}] ${titulo}: ${mensaje}`); return; }
        if (!ICONOS[tipo]) tipo = 'info';

        // Evitar que se acumulen demasiadas notificaciones
        while (contenedor.children.length >= 4) contenedor.firstElementChild.remove();

        const toast = document.createElement('div');
        toast.className = `toast ${tipo}`;
        toast.setAttribute('role', tipo === 'error' ? 'alert' : 'status');
        toast.innerHTML = `
            <svg class="toast-icon toast-icon-${tipo}" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">${ICONOS[tipo]}</svg>
            <div class="toast-content">
                <div class="toast-title">${escaparHTML(titulo)}</div>
                <div class="toast-message">${escaparHTML(mensaje)}</div>
            </div>
            <button type="button" class="toast-close" aria-label="Cerrar notificación">
                <svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12"/></svg>
            </button>`;
        const cerrar = () => {
            toast.classList.remove('show');
            setTimeout(() => toast.remove(), 400);
        };
        toast.querySelector('.toast-close').addEventListener('click', cerrar);
        contenedor.appendChild(toast);
        requestAnimationFrame(() => toast.classList.add('show'));
        setTimeout(cerrar, tipo === 'error' ? Math.max(duracion, 8000) : duracion);
    }

    // ---------------------------------------------------------------- Pantalla de carga

    /**
     * Muestra u oculta la pantalla de carga.
     * Acepta un booleano (compatibilidad con el código anterior) o un mensaje.
     */
    function mostrarCargando(estadoOMensaje = true) {
        if (estadoOMensaje === false) { ocultarCargando(); return; }
        const pantalla = document.getElementById('loadingScreen');
        if (!pantalla) return;
        const texto = document.getElementById('loadingText');
        if (texto) texto.textContent = typeof estadoOMensaje === 'string' ? estadoOMensaje : 'Procesando...';
        pantalla.classList.add('active');
    }

    function ocultarCargando() {
        const pantalla = document.getElementById('loadingScreen');
        if (!pantalla) return;
        pantalla.classList.remove('active');
        const contenedor = document.getElementById('loadingProgressContainer');
        const barra = document.getElementById('loadingProgressBar');
        if (contenedor) contenedor.style.display = 'none';
        if (barra) barra.style.width = '0%';
    }

    function actualizarProgreso(mensaje, porcentaje) {
        mostrarCargando(mensaje || 'Procesando...');
        const contenedor = document.getElementById('loadingProgressContainer');
        const barra = document.getElementById('loadingProgressBar');
        if (contenedor && barra && porcentaje !== undefined && porcentaje !== null) {
            contenedor.style.display = 'block';
            barra.style.width = `${Math.min(100, Math.max(0, porcentaje))}%`;
        }
    }

    /** Cede el control al navegador para que pinte la interfaz antes de una tarea pesada. */
    function esperarPintado(ms = 30) {
        return new Promise(resolve => requestAnimationFrame(() => setTimeout(resolve, ms)));
    }

    /** Ejecuta una tarea mostrando la pantalla de carga y reportando cualquier error al usuario. */
    async function conCargando(mensaje, tarea) {
        mostrarCargando(mensaje);
        await esperarPintado();
        try {
            return await tarea();
        } catch (error) {
            console.error(error);
            mostrarNotificacion('Error', error?.message || String(error), 'error');
            return undefined;
        } finally {
            ocultarCargando();
        }
    }

    // ---------------------------------------------------------------- Modales

    let ultimoFoco = null;

    function abrirModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        ultimoFoco = document.activeElement;
        modal.classList.remove('hidden');
        modal.classList.add('flex');
        modal.setAttribute('aria-hidden', 'false');
        const enfocable = modal.querySelector('input:not([type=hidden]):not([disabled]), select:not([disabled]), textarea, button');
        if (enfocable) setTimeout(() => enfocable.focus(), 30);
    }

    function cerrarModal(id) {
        const modal = document.getElementById(id);
        if (!modal) return;
        modal.classList.add('hidden');
        modal.classList.remove('flex');
        modal.setAttribute('aria-hidden', 'true');
        if (ultimoFoco && typeof ultimoFoco.focus === 'function') ultimoFoco.focus();
    }

    function modalAbierto() {
        return [...document.querySelectorAll('.modal')].reverse().find(m => !m.classList.contains('hidden'));
    }

    // Cerrar con Escape o con clic en el fondo oscuro
    document.addEventListener('keydown', e => {
        if (e.key !== 'Escape') return;
        const abierto = modalAbierto();
        if (abierto) cerrarModal(abierto.id);
    });
    document.addEventListener('mousedown', e => {
        if (e.target.classList?.contains('modal')) cerrarModal(e.target.id);
    });

    /**
     * Diálogo de confirmación dentro de la página (reemplaza a window.confirm).
     * @returns {Promise<boolean>}
     */
    function confirmar(mensaje, { titulo = 'Confirmar', textoAceptar = 'Aceptar', peligro = false } = {}) {
        return new Promise(resolve => {
            const modal = document.getElementById('modalConfirmar');
            if (!modal) { resolve(window.confirm(mensaje)); return; }
            document.getElementById('confirmarTitulo').textContent = titulo;
            document.getElementById('confirmarMensaje').textContent = mensaje;
            const aceptar = document.getElementById('confirmarAceptarBtn');
            const cancelar = document.getElementById('confirmarCancelarBtn');
            aceptar.textContent = textoAceptar;
            aceptar.className = `btn ${peligro ? 'btn-danger' : 'btn-primary'}`;
            const observador = new MutationObserver(() => {
                if (modal.classList.contains('hidden')) terminar(false);
            });
            let resuelto = false;
            function terminar(valor) {
                if (resuelto) return;
                resuelto = true;
                observador.disconnect();
                aceptar.onclick = cancelar.onclick = null;
                cerrarModal('modalConfirmar');
                resolve(valor);
            }
            aceptar.onclick = () => terminar(true);
            cancelar.onclick = () => terminar(false);
            abrirModal('modalConfirmar');
            observador.observe(modal, { attributes: true, attributeFilter: ['class'] });
            setTimeout(() => aceptar.focus(), 40);
        });
    }

    /** Descarga un texto como archivo. */
    function descargarArchivo(contenido, nombre, tipo = 'application/json') {
        const blob = new Blob([contenido], { type: tipo });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = nombre;
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 1000);
    }

    Object.assign(Utilidades, {
        mostrarNotificacion, mostrarCargando, ocultarCargando, actualizarProgreso, esperarPintado, conCargando,
        abrirModal, cerrarModal, confirmar, descargarArchivo
    });

    // Alias globales usados por el resto de módulos
    Object.assign(global, {
        mostrarNotificacion, mostrarCargando, ocultarCargando, actualizarProgreso, abrirModal, cerrarModal, confirmar
    });
})(typeof window !== 'undefined' ? window : globalThis);
