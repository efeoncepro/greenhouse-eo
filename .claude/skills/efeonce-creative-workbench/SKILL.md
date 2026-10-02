---
name: efeonce-creative-workbench
description: Operar y mantener Creative Workbench, el harness multimarcas del equipo Efeonce; producir KV y adaptaciones SKY con sus componentes nativos, fotografía admitida, paquetes privados y corridas gobernadas; consultar íconos SKY y variantes en el Lab, y conservar sus decisiones y continuidad. Aplicar a creative-workbench; no sustituye las skills de identidad Efeonce ni de contenidos Berel.
---

# Efeonce Creative Workbench

Guía operativa viva del harness compartido. Su implementación pertenece al repo privado
`efeoncepro/creative-workbench`; esta skill pertenece a Greenhouse y documenta cómo operarlo.
SKY es el primer cliente habilitado, no el alcance completo del espacio. Todo el equipo puede
trabajar para todas las marcas; cada ejecución tiene una sola identidad visual explícita.

## SKY: composición v7 corregida contra Figma — 2026-10-01

Contenido `designer-rules@1.6.0` y destino `content-flow@1.3.0` (commit local Workbench `695b701`,
sin push). Cada `footer-legal` sigue la alineación de su texto fuente sellado (56 CENTER, 6 LEFT;
antes 54 quedaban LEFT). El origen y los seguidores del destino siguen la **caja de línea** efectiva
más el gap admitido, como el autolayout de Figma (antes, la tinta: badge pegado a ciudades de una
línea); acercamiento acotado al piso de tinta sólo si cruza el borde admitido. 3311 se re-centra en
su frame. Las 42 pilas simples alinean la fila moneda+importe al eje de badge/condiciones. La doble
moneda usa el gap de tinta nativo. El estilo oración preserva PEN, BRL, ARS, UYU, `US$`, `R$`, `S/`, `$U`.
No cambiaron las condiciones 8 px dentro de la flecha en 160×600 (regla 1.1.0 del operador).
Export `prueba-modular-24-v7`; [handoff](references/layout-feedback-handoff.md) y auditoría Workbench
`docs/audits/sky-layout-correction-v7-2026-10-01.md`. Aceptación del operador pendiente.

## SKY: feedback corregido localmente (corte anterior v6) — 2026-10-01

Contenido `designer-rules@1.5.0` y destino `content-flow@1.2.0` en Workbench.
**TODOS los 76 badges tarifarios** usan ancla LEFT (42 pilas simples + 34 Tags complejos/dobles),
por pedido posterior del operador. Los labels siguen centrados DENTRO de sus cápsulas; ancho,
padding, precio y orientación de doble moneda conservan sus contratos. Sólo los footer-legal
1387 de 2611/2668 pasan a CENTER, condiciones LEFT preservadas. 2668 equilibra destino/origen
frente a la flecha completa; 2611/2668 dejan 16 px entre prefijo con icono y ciudad. 4685 es
bloque editorial LEFT con destino/CTA, separado de stickers. Jobs no eligen geometría.

Leer [handoff y cierre del feedback](references/layout-feedback-handoff.md) y el canon Workbench
`docs/audits/sky-layout-feedback-correction-2026-10-01.md`. El export actual es v6;
v3/v4/v5, recursos y corridas anteriores son evidencia inmutable. El pedido posterior autoriza
subagentes, actualización de docs/skills y commit local de lo propio. Registrar su evidencia cuando
exista; implementación local no equivale a aceptación visual/comercial, push, paquete o deploy. El contenido
sigue ficticio y las fotografías source-reference. No ejecutar/alterar CLIs Greenhouse.

## Corte integrado y recorrido recomendado — 2026-10-01

Workbench `main` integra componentes autónomos e identidad Git por PR15 (`2392758`) y
el Lab premium por PR16 (`c3e85b6`) y selectores compartidos por PR17 (`7e4c617`). El snapshot
SKY v6 fue publicado y cotejado con protección inicial; el [acceso actual sin login autorizado](../../../docs/operations/creative-production/WORKBENCH_LAB_ACCESS_STATE.md)
se verifica por separado en `creative-workbench-sky.vercel.app`;
[Lab](references/lab.md) conserva el contrato host/cliente, superficies, motion y menús abiertos.
Greenhouse incorporó la base documental mediante PR246
sobre `develop`; no es una promoción de Greenhouse a producción. La implementación modular
ya permite componer mediante agentes; IA, acceso definitivo y distribución tienen gates aparte.
La extensión de [íconos SKY](references/icons.md) añade selección exacta y `/iconos/`
con QA local; sigue candidata, sin admisión productiva ni nueva publicación acreditada.
Leer primero [flujo de agentes](references/agent-production.md), luego la referencia del paso.
[Estado y pendientes](references/state-continuity.md) distingue código, evidencias y runtime.

## Arranque y fuentes

1. Localizar el checkout de Workbench sin crear otro ni cambiar ramas ajenas. En la máquina
   del operador está en `/Users/jreye/Documents/creative-workbench`; esa ruta no es portable.
2. Leer allí `AGENTS.md`, `README.md`, `clients/brands.json`, el pack del cliente y su brief.
   Revisar rama, HEAD y cambios antes de editar. Ejecutar producción sólo desde Workbench.
3. Cargar [arquitectura](references/architecture.md) y la referencia de la operación elegida.
   Para retomar esta sesión, leer también [estado y continuidad](references/state-continuity.md).
4. Contrastar instrucciones con código y contratos actuales. Una observación fechada no
   prueba acceso, despliegue, habilitación de generación o publicación actuales.

La decisión Greenhouse `docs/architecture/EFEONCE_CREATIVE_WORKBENCH_MULTIBRAND_ISOLATION_DECISION_V1.md`
explica el aislamiento. Sus documentos foundation y el sync antiguo son antecedentes;
el harness nativo y los contratos verificados de Workbench gobiernan su operación actual.
No ejecutar un `creative:sync` total para restaurar comandos retirados.

## Elegir la referencia

| Pedido | Leer |
| --- | --- |
| Comprender motores, autoridad, packs, locks y límites entre repos | [architecture.md](references/architecture.md) |
| Preparar una producción a escala, repartir jobs, ejecutar y cerrar con evidencia | [agent-production.md](references/agent-production.md) |
| Crear una campaña SKY, cambiar imagen/copy, obtener todos los formatos | [sky-production.md](references/sky-production.md) |
| Producir o evaluar fotografía SKY, blur, cielo, color y reservas de texto | [sky-photography.md](references/sky-photography.md) y skill original admitida de SKY |
| Componer por módulos, corregir logo/flecha/CTA/texto/máscara/círculos | [components.md](references/components.md) |
| Inspeccionar cada capa, tokens/bindings, descomponer, extraer o reconstruir SKY por receta | [autonomous-components.md](references/autonomous-components.md) |
| Identificar una composición nombrada, leer su receta y producir adaptaciones por lotes de agentes | [recipes.md](references/recipes.md) |
| Consultar íconos SKY, variantes `kind`/tamaño, fuente Figma, `/iconos/` o admitirlos a una receta | [icons.md](references/icons.md) |
| Usar, mantener o presentar el Lab premium Astro/TS/Tailwind, Efeonce + cliente | [lab.md](references/lab.md) |
| Configurar/verificar identidad Git de cada persona, hooks y evitar rechazo de autor en Vercel | [operations-distribution.md](references/operations-distribution.md), sección de identidad Git |
| Instalar canon, consumir/publicar paquetes, broker, archivo y Vercel | [operations-distribution.md](references/operations-distribution.md) |
| Identidad Google↔GitHub, App mínima, transporte sin bearer GitHub y gate de rollout | [architecture.md](references/architecture.md), [operations-distribution.md](references/operations-distribution.md) y [state-continuity.md](references/state-continuity.md) |
| Comparar las 126 piezas SKY contra Figma y mantener recetas nativas | [components.md](references/components.md) y arquitectura Workbench `workbench-sky-reference-comparison.md` |
| Diagnosticar un fallo o evitar repetir propuestas rechazadas | [lessons.md](references/lessons.md) |
| Presupuesto persona/organización, aumentos del operador, CAS y recuperación sin pago | [budget.md](references/budget.md) |
| Resolver comentarios del PR, gobierno, identidades, presupuesto y errores posreserva | [review-remediation.md](references/review-remediation.md) |
| Retomar los detalles visuales pendientes: legales, huecos, badge/ejes, promoción | [layout-feedback-handoff.md](references/layout-feedback-handoff.md) |
| Retomar, registrar progreso o actualizar esta skill | [state-continuity.md](references/state-continuity.md) |

## Invariantes de operación

- Resolver cliente → `brandId` → pack/version/SHA → operación/IDs. Sin marca por defecto;
  no arrastrar fuentes, prompts, skills, fotos o componentes de la pieza anterior.
- Consultar o descargar una fuente candidata no admite un recurso productivo. Los íconos
  SKY usan IDs y variantes nativas exactas, sin recolor/default/fallback de marca; ver [íconos](references/icons.md).
- Compartir motores neutrales no comparte identidad visual. AXIS no es un default de SKY.
  Un pack gated o recurso ausente falla cerrado; no alterar hashes/cache/policy para aprobarlo.
- Mantener CLIs de Greenhouse intactas. Producción y ports autorizados se hacen en Workbench.
  Crear/actualizar esta skill en Greenhouse no autoriza tocar sus motores locales.
- Los jobs seleccionan recursos admitidos y contenido explícito; no transportan geometría,
  fonts, colores, módulos, código, credenciales ni rutas arbitrarias de salida.
- La atribución declarada no autentica. Las entradas productivas verifican GitHub vivo;
  acceso GitHub no prueba acceso al broker privado, a GCP, Packages o Vercel.
- La candidata de identidad usa Google firmado en ambos headers y un binding server-owned;
  no enviar token general de gh como fallback. Policies draft deniegan; endpoint admitido y
  readback real preceden el merge/distribución de la CLI que lo requiere.
- El adapter real llama una sola vez al guard de pago server-owned tras secreto/body; ledger
  durable → reauth viva → ticket exacto comprobado síncronamente. No consumirlo antes del adapter.
  Ver [budget.md](references/budget.md); fixtures no habilitan IA ni admiten cotizaciones.
- Costo IA: conservar una intención y su UUID. Ante respuesta incierta consultar el mismo
  UUID; no crear otro como retry, lote o alternativa pagada. Respetar la autorización vigente.
- Corridas nuevas y separadas; snapshots/outcome históricos inmutables. Revisión posterior
  ligada a run/SHA, fuera del outcome. Fuentes licenciadas y resultados binarios fuera de Git.
- Inspeccionar el PNG final, su encuadre y texto. Tests, prompt, PNG decodificable y controles
  de procedencia no aprueban diseño, contraste, derechos ni oferta comercial.
- Separar preparado, validado, ejecutado, revisado, aprobado, archivado, publicado y entregado.
  No anunciar el harness completo por cerrar una unidad de componentes.

## Dónde viven los archivos de `ai-generations/`

- Origen: `ai-generations/` de **greenhouse-eo**. Lo **local protegido** (sellado en `scripts/foto/assets.lock.json`, citado por recetas de deck o por `src/**`/`scripts/**`) queda en disco; la exploración, rondas y descartes van al **archivo** `gs://efeonce-group-greenhouse-private-assets-prod/ai-generations/<ruta>`, sólo para el operador.
- **Canon** `gs://efeonce-creative-canon/<la misma ruta del lock>`: lo sellado (identidades, prendas, logo 3D, mascotas, Sparks). Casi todo vive bajo `ai-generations/…`; los Sparks, que vienen del paquete npm, bajo `node_modules/@efeoncepro/axis-brand-assets/…`. Greenhouse lo publica con `pnpm creative:assets:publish`, que desde el 2026-10-02 lista **cada prefijo del lock** (antes sólo `ai-generations/**` y daba los 182 Sparks por faltantes en cada corrida); Workbench lo consume y no lo publica.
- Bajada en Workbench: el contrato de Greenhouse (plantilla y `assets-publish.mjs`) declara `pnpm assets:pull` con sha256; el checkout vigente lo mapea a `tools/legacy-disabled.mjs` ([arquitectura](references/architecture.md)). Verificar la ruta vigente antes de indicarla al equipo; no reactivar un script retirado.
- En Greenhouse, una ruta ausente se rehidrata con `pnpm ai-gen:where` + `pnpm ai-gen:pull`. **NUNCA** regenerar ni aproximar un asset aprobado porque falta, resellar el lock para taparlo ni archivar o borrar a mano. SSOT: [`AI_GENERATIONS_STORAGE_V1.md`](../../../docs/operations/AI_GENERATIONS_STORAGE_V1.md).

## Mantener la memoria operativa

Después de un avance relevante: registrar el contrato en su dueño de Workbench, el resultado
fechado en `docs/operations/HARNESS_STATUS.md` y evaluación/auditoría con evidencia; actualizar
la referencia correspondiente y el corte de esta skill. No copiar assets ni secretos aquí.
Conservar rechazos con su razón. Espejar todo el bundle byte a byte en `.claude/skills/` y
comprobar contenido y referencias. El registro de continuidad indica qué cambiar y qué preservar.

Desde Greenhouse, `python3 .codex/skills/efeonce-creative-workbench/scripts/validate.py` comprueba
ambos bundles, links internos y registro del router sin modificar archivos ni llamar providers.
Este chequeo específico cubre la skill nueva; no atribuir su cobertura al allowlist histórico
de `pnpm skills:mirrors` mientras no se haya registrado allí.

La base integrada contiene 126 adaptaciones y comparación técnica independiente completa.
La escena productiva usa componentes, tokens de propiedades y recetas; los agentes pueden
componer campañas con copy/foto explícitos y revisar cada resultado. Esta disponibilidad de
código no aprueba campañas nuevas, habilita pagos ni certifica acceso de cada integrante.
Refrescar estado, rama y runtime antes de atribuir un rollout o una aprobación actuales.

## Reglas de contenido SKY recibidas de la diseñadora — 2026-10-01

Para producir nuevos KV, leer en Workbench
`docs/architecture/workbench-sky-designer-content-rules.md`. La base local
`sky-airline.content-layout.designer-rules@1.0.0` introdujo por source pins el centrado de
stickers y moneda, importes Metric Black, condiciones en estilo de oración, espaciado
de destino/origen y pilas simples de tarifa con badge adaptativo y legal dentro de la flecha.
`contentLayoutRecipe` aparece en el plan; `contentLayouts` y transformaciones de copy en QA.
El contrato vigente 1.5.0 conserva esos mecanismos y aplica las excepciones tarifarias/editoriales
indicadas en [componentes](references/components.md): 76 badges LEFT y 4685 editorial LEFT.
No reescribir geometría desde un job ni retocar PNGs. Pack y referencias históricas intactos.
Esta extensión se verifica localmente; no equivale a merge, publicación del paquete ni deploy.

La extensión local 1.1.0 fija condiciones compactas en una línea (contenido 1.5.0 conserva LEFT de condiciones y centra sólo los dos footer-legal revisados), con tamaños 12/10/8 px según la variante admitida. Es una regla explícita por fuente, nunca autofit ni permiso para disminuir otros textos. Ver [componentes](references/components.md) y el contrato Workbench.

La extensión local 1.2.0 distingue titulares porcentuales en flecha de stickers. En seis fuentes SKY, conserva el eje izquierdo nativo de HASTA para todas las líneas del titular y las condiciones. No aplicar el centrado de sticker a bloques editoriales; ver contrato de contenido y [componentes](references/components.md).

La implementación de [destinos y espacios adaptativos](references/destination-content-flow.md)
selecciona perfiles Metric finitos en 95 fuentes y refluye por tinta. La regla 1.5.0 separa
footer/condiciones y ancla TODOS los badges tarifarios a LEFT; 1.2.0 de destino equilibra
2668 y separa prefijo/ciudad en 2611/2668. Leer [cierre del feedback](references/layout-feedback-handoff.md).
No concede autofit a otros textos ni aceptación comercial o del operador por pasar tests.
