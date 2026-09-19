# Usar reglas publicitarias con Codex y Claude

## Uso automático

Dentro de este repo, describe normalmente la pieza. Los routers detectan formatos publicitarios/sociales,
tipografía de campaña y texto sobre imagen, y cargan `efeonce-advertising-creative` junto con las especialidades
necesarias.

Antes de producir o auditar, abre la
[guía interactiva de tipografía creativa de AXIS](https://axis.efeonce.org/references/creative-typography/).
El asesor permite comparar soporte, longitud e intención y devuelve una receta explicada. Úsala como banco de
pruebas; el agente debe volver a medir la composición final sobre su fondo y tamaño reales.

Ejemplos:

- `Crea un post 4:5 de Efeonce con este copy y entrégame el PNG revisado.`
- `Adapta esta pieza a story 9:16 y cover 16:9 sin perder jerarquía ni safe area.`
- `Audita el peso, tracking, leading y contraste de esta portada de brochure.`
- `Haz un Reel de 9 segundos; Bricolage abre, Poppins explica y Guttery sólo puede cerrar si aporta.`
- `Compón la selección colaborativa sobre este titular; Camila está redimensionando y Producto se mueve por el canvas.`
- `Usa la receta supportingTagline con esta frase; haz que “crecer” sea growth y “sin perder criterio” sea intervention.`

## Uso explícito

Cuando quieras obligar el flujo completo, comienza con:

```text
Usa $efeonce-advertising-creative para...
```

Después entrega el copy literal, formato/dimensiones, objetivo, marca/cliente y assets disponibles. Si ya existe
una pieza, adjunta el master o su ruta. Indica si quieres explorar, producir, corregir o sólo auditar; ninguna de
esas acciones autoriza publicación.

## Qué debe devolverte el agente

1. La pieza visible o el archivo corregido, no sólo un prompt.
2. Las variantes solicitadas como composiciones propias, no simples recortes.
3. Una ficha breve con contrato AXIS leído, familia/archivo, receta/peso/ejes, tamaño, tracking, leading, cortes,
   color/fondo y safe area por tramo.
4. Resultado `PASS | REWORK | DON’T` para jerarquía, tipografía, contraste, marca, formato, movimiento y derechos.
5. Estado real: prueba, revisada, aprobada, programada, publicada o medida.

Si pides selección colaborativa, el agente debe entregarte además el intent o manifest AXIS usado y decir qué
adapter pintó la escena. El bounding box debe seguir el texto/objeto/grupo real; un cursor `acting` apunta a un
anclaje y un cursor `moving` puede no tocar nada. La placa acepta cualquier nombre de persona, rol o departamento
y siempre viaja cerca de su puntero. Greenhouse ya dispone de adapter para `headline`, `support`, `hook` y
`lockup`; si otra superficie no lo tiene, la respuesta correcta es `pending adapter`, no una imitación libre.

Si pides un supporting tagline, entrega la frase literal y, si corresponde, qué fragmentos cumplen las
intenciones `growth` o `intervention`. El agente debe conservar el orden y los espacios naturales, ajustar toda
la frase contra el ancho del lockup y mostrar el resultado en el formato final. La receta funciona con cualquier
copy; no depende de las palabras “escalar” o “automatizar”.

## Cómo revisar la respuesta

- La tesis debe leerse primero al tamaño real y en miniatura.
- ExtraBold debe estar justificado; pide la comparación con una receta menos pesada si no aparece.
- Las líneas deben formar una frase, sin letras pegadas ni huecos excesivos.
- Cursiva y Guttery deben ser breves y opcionales.
- Texto y logo deben sostener contraste sobre el peor sector del fondo, no sólo en promedio.
- Ningún texto o logo crítico debe venir horneado por el generador si debía ser exacto.
- Las guías y notas de revisión no pueden aparecer en el export.

La guía pública ayuda a entender y discutir las decisiones, pero no aprueba una pieza ni convierte una receta
en preset universal. El estado `trial` del contrato exige conservar ficha, evidencia y gate por cada composición.

## Pedir un carrusel con jerarquía de 5 voces y selección colaborativa

Caso de referencia: carrusel «Nivel de búsqueda» (2026-09-19). Método completo en la
[bitácora del caso](../../operations/social/2026-09-19-nivel-de-busqueda-gta6-trendjack-production-method.md).

**Cómo pedirlo.** Entrega el copy por lámina separado en voces y marca los énfasis:

```text
Usa $efeonce-advertising-creative y $social-media-studio. Carrusel 1080×1350, 9 láminas.
Por lámina: etiqueta, entrada, dominante (1–3 palabras), cierre de frase, tarjeta y gesto opcional.
Marca **negrita** para subir peso y [[acento]] para la palabra clave en naranja.
Selección colaborativa sobre el dominante: SEO y Contenido editando, Paid moviéndose por el canvas.
Firma con url-lum. Toma como referencia ai-generations/2026-09-19_nivel-de-busqueda/componer-v2.mjs.
```

**Qué revisar en la entrega.**

- La **hoja de revisión** con todas las láminas en el orden de publicación (una pieza suelta debe venir aparte).
- La **vista a 390 px**: la etiqueta, el dominante y la tarjeta se leen sin ampliar; ninguna voz se funde con la
  vecina (si entrada y dominante tienen el mismo peso y color, pide corrección).
- El **acento naranja legible**: sobre horizonte encendido debe haberse cambiado a peso blanco. Pide el contraste
  por nivel (incluidos los acentos) y, si alguno quedó bajo el umbral, la nota de revisión visual a 390 px.
- Las placas de los cursores dentro del lienzo, con nombres cortos, y sin tapar la frase ni el HUD.
- La firma `efeoncepro.com` visible en el PNG final; si el logo 3D ya protagoniza la escena, no debe haber otro
  logo plano.

**Qué no hacer.**

- No pidas «un cursor solo sin caja»: el cursor que pasea sin seleccionar es un colaborador en movimiento, y la
  pieza siempre conserva un objeto seleccionado.
- No aceptes rectángulos de color detrás del texto como tarjeta: la tarjeta es vidrio esmerilado de la propia escena.
- No pidas Guttery en más de un gesto por pieza ni en frases largas; si la máquina no tiene la fuente, esa capa se
  omite.
- No trates los pesos o colores del caso como plantilla fija: se revalidan con cada fondo y copy.
- Producir la pieza no autoriza programarla ni publicarla.

## Probar el harness en una sesión nueva

Pide la producción normalmente y nombra `$social-media-studio`, `$efeonce-advertising-creative`,
`$design-studio` y `$imagegen`. Indica que primero quieres una base generativa sin copy/logos y luego composición
determinista. El agente debe copiar estos dos archivos al `brief/` de la corrida y reemplazar sus placeholders:

- `.codex/skills/efeonce-advertising-creative/templates/axis-advertising-layout-contract.yaml`;
- `.codex/skills/efeonce-advertising-creative/templates/collaboration-selection-intent.json`.

Después del plate y finish aprobados, la prueba ejecutable es:

```bash
pnpm creative:collaboration:resolve -- \
  --input <campaign-run>/brief/collaboration-selection-intent.json \
  --out <campaign-run>/manifests/collaboration-selection.json
pnpm creative:layout -- --contract <campaign-run>/brief/layout-contract.yaml --mode plan
pnpm creative:layout -- --contract <campaign-run>/brief/layout-contract.yaml --mode compile
pnpm creative:layout -- --contract <campaign-run>/brief/layout-contract.yaml --mode check
```

`plan` y el resolver no llaman a un modelo. `compile` usa los assets tipográficos versionados, conserva el copy
literal, ajusta el supporting tagline, pinta la selección semántica e incrusta el URL Bubble canónico si el contrato
declara `brand.url_bubble`. No reemplaces ese asset por texto ni por un rectángulo: usa
`src/lib/artifact-composer/catalogs/deck-axis/assets/url-lum.svg`, conserva la firma fija `efeoncepro.com` y revisa
que aparezca en el PNG final. `human_release: pending` impide confundir un master técnico con una pieza aprobada o
publicada.

## MCP

No necesitas conectar MCP para usar estas reglas. Si `mcp.efeonce.org` está conectado, úsalo únicamente para las
tools y manuales que anuncia. Hoy no anuncia una herramienta de composición publicitaria; por eso no encontrarás
`efeonce-advertising-creative` en `get_greenhouse_skill`. Esto es deliberado y evita presentar conocimiento local
como una capability de runtime que todavía no existe.

Descripción funcional: [reglas publicitarias para agentes](../../documentation/creative/reglas-publicitarias-para-agentes.md).
Contrato: [Advertising Creative Agent Execution V1](../../operations/ADVERTISING_CREATIVE_AGENT_EXECUTION_V1.md).
