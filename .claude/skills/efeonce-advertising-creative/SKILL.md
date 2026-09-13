---
name: efeonce-advertising-creative
description: Orquesta piezas publicitarias y de social media con texto —posts, stories, reels, covers, banners, key visuals, brochure, OOH y motion— aplicando el contrato tipográfico de AXIS, Bricolage/Poppins/Guttery reales, contraste y accesibilidad. Úsala al crear, corregir o auditar una pieza, elegir pesos/estilos, componer texto sobre imagen o preparar variantes por formato. No sustituye la estrategia de canal ni autoriza publicación.
---

# Efeonce Advertising Creative

Convierte las reglas publicitarias de AXIS en decisiones de producción verificables para Codex y Claude. Es
una orquestadora: no duplica valores tipográficos ni reemplaza las skills de oficio.

## Fuentes y orden de carga

1. Lee el contrato operativo en
   [ADVERTISING_CREATIVE_AGENT_EXECUTION_V1](../../../docs/operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
2. Consulta primero la guía portable
   `../axis-design-system/docs/creative-applications/advertising-social/DESIGN.md` y abre el
   [Creative Typography Workbench](https://axis.efeonce.org/references/creative-typography/). Usa su asesor con
   el soporte, largo e intención reales para obtener una receta candidata y un caso comparable; después resuelve
   cada valor desde el export `axisAdvertising` y el contrato `efeonce.advertising-typography`. El contrato
   versionado prevalece ante cualquier drift. Su lifecycle `trial` obliga a conservar evidencia y evita
   presentarlo como estable antes del segundo consumidor real.
3. Carga la skill tipográfica activa y sólo las referencias que apliquen:
   - [ink, jerarquía y espaciado](../../../.codex/skills/greenhouse-typography-accessibility/references/campaign-ink-metrics-and-hierarchy.md);
   - [casos reales y reconstrucciones didácticas](../../../.codex/skills/greenhouse-typography-accessibility/references/real-campaign-typography-cases.md).
4. Para social, compón con `social-media-studio`; para imagen generada, con
   `greenhouse-ai-image-generator` y `greenhouse-ai-creative-rights-governance`; para video/motion, con
   `motion-design-studio`; para copy, con `copywriting`; para marca Efeonce, con `efeonce-brand-studio`.
   Si una de esas skills ya inició el encargo, no la vuelvas a cargar ni reinicies el brief.
5. Usa [brief y gate de calidad](references/creative-brief-and-qa.md) para registrar la decisión y revisar
   el archivo final.

## Bucle de trabajo

1. **Resuelve el encargo.** Define marca/cliente, objetivo, soporte, dimensiones, audiencia, copy literal,
   CTA, activos disponibles, derechos y estado esperado. Aprovecha el contexto ya entregado; pregunta sólo
   por una ausencia que cambie materialmente la pieza.
2. **Asigna funciones, no fuentes por gusto.** Declara una voz display dominante, una voz estructural y, si
   aporta sentido, un gesto breve. Prueba el encargo en el asesor del Workbench y usa su resultado como hipótesis:
   Bricolage instala la idea, Poppins estructura y Guttery sólo aparece como gesto opcional. Elige los valores
   definitivos desde AXIS después de conocer longitud, fondo, tamaño final y distancia de lectura.
3. **Construye el medio limpio.** Genera o selecciona imagen/video sin texto ni logotipos inventados. Compón
   tipografía, marcas y legales de forma determinista con los archivos oficiales.
4. **Diseña contraste.** Prueba peso, ancho, tamaño, leading, tracking, cortes y densidad juntos. ExtraBold no
   es un default; una cursiva o Guttery larga tampoco. El contraste útil puede venir de peso, escala, espacio,
   color, posición o tiempo, pero cada capa debe conservar una función.
5. **Protege lectura y marca.** Mide contraste sobre los píxeles reales de cada zona. Si falla, cambia
   encuadre, posición, color, plate o scrim antes de añadir contornos/sombras decorativas. Un logo negativo
   sobre una zona clara o variable es un DON’T aunque el archivo sea oficial.
6. **Revisa en el tamaño de uso.** Comprueba composición completa y vista reducida, safe areas, ritmo,
   desbordes, solapamientos, contraste, logo, subtítulos y `prefers-reduced-motion` cuando corresponda.
   Ningún texto de diagnóstico, caja de selección o guía puede quedar dentro del entregable.
7. **Entrega evidencia honesta.** Muestra la pieza y conserva formato, fuente editable/export, decisiones
   tipográficas, provenance y resultado del gate. Distingue prueba producida, revisada, aprobada, programada,
   publicada y medida.

## Reglas duras

- Usa archivos tipográficos reales y `font-synthesis: none`; no simules cursiva, bold ni Guttery con otra
  familia. Si falta el archivo autorizado, detén esa capa y usa una receta permitida que sí exista.
- Bricolage puede dominar titulares; Poppins ordena apoyo, continuidad y énfasis breve; Guttery funciona como
  gesto corto y opcional. La pieza manda sobre el nombre de la familia: si dos voces compiten, retira una.
- No copies cifras desde esta skill ni inventes presets universales. Lee la versión vigente de
  `axisAdvertising`; un valor de campaña sólo se reutiliza si el nuevo formato reproduce sus condiciones.
- No incrustes copy crítico o logos dentro de una generación cuando el texto debe ser exacto.
- No uses rectángulos decorativos detrás de palabras como solución automática. Un plate existe para asegurar
  contraste y debe responder a la composición, no parecer una etiqueta accidental.
- No conviertas un ejemplo aprobado en regla universal ni un mockup didáctico en campaña publicada.
- No presentes una receta del Workbench como aprobación creativa. La recomendación aún requiere composición,
  QA tipográfico, contraste sobre píxeles reales y las aprobaciones de marca/cliente que correspondan.
- Producir y corregir son acciones reversibles autorizadas por el encargo. Programar, publicar, enviar o gastar
  presupuesto sigue requiriendo la autoridad correspondiente.

## MCP

`mcp.efeonce.org` puede aportar herramientas y contexto cuando el dominio conectado los expone, pero hoy no
publica este manual: el catálogo `get_greenhouse_skill` sólo acepta manuales que gobiernan tools MCP reales y
la superficie federada no contiene una tool de composición publicitaria. No asocies este conocimiento a una
tool ajena ni presentes la conexión MCP como fuente de fonts, logos o aprobación. Cuando exista una capability
creativa federada, su manual podrá proyectar este mismo contrato sin duplicarlo.
