# Efeonce — Ideas con dirección / v2

**Estado:** propuesta para aprobación, 25 septiembre 2026. No aprobada para fabricación o publicación.

## Abrir la entrega

- `index.html`: galería completa, navegación y descargas por objeto.
- `revision-efeonce-v2.pdf`: revisión visual de 10 páginas.
- `referencias-efeonce-v2.zip`: 41 vistas aisladas sobre blanco, artes SVG, fichas y manifiesto.
- `01-linea-grafica.png`: tres comportamientos de la línea.
- `00-coleccion.png`: aplicaciones seleccionadas.
- `final/09-estudio.png`: aplicación espacial conceptual.

## Dirección

Una agencia premium, creativa, estratégica y digital. **Ideas con dirección** es un concepto de exploración y copy candidato, no un cambio aprobado de tagline.

El lenguaje combina:

1. **Dirección:** trayectorias abiertas que cambian de rumbo y relacionan partes de la composición; ritmo preciso que puede extenderse a movimiento.
2. **Encuadre:** campos abiertos que ordenan la idea y la acción. En la pizarra cumplen una función real.
3. **Enfoque:** un campo circular revela contenido dentro de un conjunto de posibilidades; es una operación de composición.
4. **Tipografía:** Bricolage Grotesque protagoniza; Poppins estructura. Los contornos se obtuvieron de fuentes reales. Hay contraste de escala y peso, sin estilos simulados.
5. **Material:** porcelana, tela, metal y acrílico, con superficies de descanso.

## Universo e identidad

Efeonce es la marca principal. Globe, Wave y Reach son submarcas, con activación contextual. El ship puede protagonizar una pieza de identidad; su presencia no obliga a una narrativa espacial.

La curva del ship y el globo alimentan hipótesis de apertura/foco; los pliegues de Wave, encuadre/ritmo; Reach, dirección. Estos significados son propuestas creativas. Los isotipos originales permanecen intactos y no se fusionan en una nueva marca.

- Base Efeonce: `#023C70`, `#0375DB`, blanco.
- Globe: el isotipo original del globo es principalmente `#BB1954`, con pequeño acento `#FF6500`; el tema del producto tiene naranja primario. Se muestran ambas opciones de cerámica.
- La familia completa de isotipos no se imprime en cada objeto.

## Aplicaciones

| Objeto | Vistas | Papel de marca |
| --- | --- | --- |
| Agenda azul | 4 | Lenguaje expresivo en la portada; firma al reverso |
| Mug blanco | 4 | “Hacer.” e identificación pequeña al reverso |
| Mug azul | 4 | Color y material |
| Mugs Globe magenta/naranja | 4 por color | Exploración cromática contextual |
| Mac | 4 | Ship oficial + expresión tipográfica |
| Pizarra acrílica | 4 | Firma y campos Enfoque / Ideas / Acción |
| Lapicero | 3 | Material y color |
| Bandeja | 3 | Plano, corte y divisor funcional |
| Sujetalibros | 3 | Pliegue y borde azul; tercera vista elevada |
| Ship 3D | 4 | Forma reutilizada de biblioteca aprobada el 17 septiembre; aplicación pendiente |

Las vistas se recortaron individualmente con límites propios para conservar los objetos completos. Las agendas abiertas y las pizarras de perfil cruzaban las celdas regulares de la hoja original.

## Procedencia y alcance

- Bases: motor de imagen incorporado, generación y edición con referencias locales. Prompts iniciales en `../apertura-v1/prompts.json`.
- Agenda: edición de la base inicial a una tela completamente azul, conservando geometría y cuatro vistas. Tipografía y arte vectorial compuestos después.
- Oficina: `../apertura-v1/office-ficha.json` y `office-batch.json`, producidos con el compilador canónico `foto:prompt`. Mural y cubierta de agenda compuestos después. Estudio vacío como propuesta espacial; no representa una oficina construida.
- Logotipos: SVG oficiales de `public/branding`, hashes en `manifest.json`.
- Ship 3D: `ai-generations/2026-09-17_efeonce-ship-3d/final/`; reutilización de forma aprobada.
- Preflight fotográfico: set curado del 19 septiembre, K1 café y K3 noche revisados visualmente.
- Tipografía: asesor AXIS, soporte Brochure / 1–3 palabras / Impactar. Valores desde `axisAdvertising`, lifecycle `trial`. Fuentes Bricolage y Poppins reales.
- Vistas de producto: fondo blanco como indicó el usuario; no se aplica la composición de fondos reservados para fotografía de campaña.

## Revisión realizada

Revisión visual de la línea, agenda, mug, Mac, pizarra, escritorio, Globe, ship y oficina. Se corrigieron sangrados fuera de las láminas, grosor de contornos, proporción del texto sobre cerámica y recortes que cortaban vistas. Se conservan los SVG originales de la identidad.

Los renders son referencias de diseño, no planos de ingeniería. Deben fijarse después de aprobar la dirección: medidas, modelo real de Mac, materiales definitivos, tintas/colores físicos, técnicas de aplicación y tolerancias. Las geometrías generadas pueden variar entre vistas. No se ha probado aún reconocimiento sin logotipo.

## Reproducir

Desde el repo: `node ai-generations/2026-09-25_efeonce-studio-props/ideas-con-direccion-v2/componer.mjs` y luego `entrega.mjs` en la misma carpeta. `build.mjs` resuelve la tipografía y los artes; `warp.mjs` aplica perspectiva. `documento.py` genera PDF y paquete con el Python del runtime de Codex.

La propuesta anterior `apertura-v1` se conserva como antecedente y base de objetos. La v2 responde a la corrección del usuario: más personalidad creativa, premium, estratégica y digital.
