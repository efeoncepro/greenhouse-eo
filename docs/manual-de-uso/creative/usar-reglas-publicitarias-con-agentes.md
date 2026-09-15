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
