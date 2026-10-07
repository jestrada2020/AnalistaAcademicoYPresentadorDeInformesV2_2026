#!/usr/bin/env bash
# Compila el manual (LaTeX -> PDF) y genera manual-indice.js para la pestaña «Manual» de la aplicación.
# Uso: ./construir_manual.sh   (requiere pdflatex/latexmk y python3)
set -euo pipefail
cd "$(dirname "$0")"
latexmk -pdf -interaction=nonstopmode -halt-on-error manual_usuario.tex >/dev/null
python3 generar_indice.py
latexmk -c manual_usuario.tex >/dev/null 2>&1 || true
echo "Listo: manual_usuario.pdf ($(pdfinfo manual_usuario.pdf 2>/dev/null | awk '/Pages/{print $2}') páginas) y manual-indice.js"
