"""Lee manual_usuario.toc y manual_usuario.aux y escribe manual-indice.js (índice con la página de cada tema).
Las páginas del manual se numeran desde la portada, así que el número impreso es la página del PDF."""
import json
import re
from datetime import date

toc = open('manual_usuario.toc', encoding='utf-8').read()
aux = open('manual_usuario.aux', encoding='utf-8').read()

def limpiar(t):
    t = re.sub(r'\\numberline\s*\{[^}]*\}', '', t)
    t = re.sub(r'\\[a-zA-Z]+\*?\s*', '', t)
    return re.sub(r'[{}]', '', t).replace('~', ' ').strip()

temas = []
for m in re.finditer(r'\\contentsline\s*\{(chapter|section)\}\{(.*)\}\{(\d+)\}\{[^}]*\}%?', toc):
    nivel = 0 if m.group(1) == 'chapter' else 1
    numero = re.search(r'\\numberline\s*\{([^}]*)\}', m.group(2))
    temas.append({'nivel': nivel, 'numero': numero.group(1) if numero else '', 'titulo': limpiar(m.group(2)), 'pagina': int(m.group(3))})

etiquetas = {}
for m in re.finditer(r'\\newlabel\{([^}]+)\}\{\{[^}]*\}\{(\d+)\}', aux):
    if m.group(1).startswith(('cap:', 'sec:', 'tarea:', 'mapa', 'indice')):
        etiquetas[m.group(1)] = int(m.group(2))

# Capítulo del manual que explica cada pestaña (botón «Ayuda»)
ayuda = {'datos': 'cap:datos', 'evaluaciones': 'cap:evaluaciones', 'analisis': 'cap:analisis', 'estudiantes': 'cap:estudiantes',
         'informes': 'cap:informes', 'programa': 'cap:programa', 'manual': 'mapa'}

datos = {'generado': date.today().isoformat(), 'temas': temas, 'etiquetas': etiquetas, 'ayuda': ayuda}
with open('manual-indice.js', 'w', encoding='utf-8') as f:
    f.write('// Generado por generar_indice.py a partir del manual en LaTeX. No editar a mano.\n')
    f.write('window.MANUAL_INDICE = ' + json.dumps(datos, ensure_ascii=False, indent=1) + ';\n')
print(f'{len(temas)} temas, {len(etiquetas)} etiquetas')
