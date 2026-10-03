# Bricolage Grotesque

- **Fuente:** Google Fonts, familia `Bricolage Grotesque`
- **Archivo:** `BricolageGrotesque-Variable.ttf`
- **Origen:** https://github.com/google/fonts/tree/main/ofl/bricolagegrotesque
- **Archivo upstream:** `BricolageGrotesque[opsz,wdth,wght].ttf`
- **Licencia:** SIL Open Font License 1.1 (`BricolageGrotesque-OFL.txt`)
- **Ejes variables:** `opsz`, `wdth`, `wght`
- **Fuente descargada:** 2026-09-12
- **SHA-256:** `413e7357809ddd12fd80a96a8a396de0e401638d4acd3cb3e37532f0472ac682`

El asset queda disponible para diseños y composiciones. No activa por sí mismo una tercera familia tipográfica en
el runtime de Greenhouse; la UI mantiene el contrato vigente de Poppins para display y Geist para el resto.

## Instancias estáticas para AI Visibility Report (TASK-1938)

El PDF registra familias nuevas `AI Visibility Bricolage 320`, `400`, `700`, `720`, `740` y `760`, sin cambiar las
familias que usan otros PDFs o la UI. Son derivados de la fuente anterior, no descargas ni sustituciones.

- Script: `scripts/pdf/build-ai-visibility-fonts.py`.
- Generación: `uv run --no-project --with fonttools==4.60.1 --no-python-downloads python scripts/pdf/build-ai-visibility-fonts.py`.
- Verificación reproducible: el mismo comando con `--check`.
- Ejes: `opsz=96`, `wdth=100` (defaults del archivo fuente), `wght` igual al peso de cada instancia.
- El script rechaza cambios en el SHA del origen, ejes inesperados, fuentes todavía variables y glifos necesarios
  ausentes. Conserva el timestamp del origen y registra SHA-256/bytes/ejes/familia de cada TTF en
  `BricolageGrotesque-AiVisibility.manifest.json`.
- Licencia: SIL OFL 1.1, conservada en `BricolageGrotesque-OFL.txt`.
