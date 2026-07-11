# 07 · AI Content (con gobernanza, sin slop)

La IA multiplica la producción de contenido; también multiplica la basura. La regla del studio: **la IA acelera el motor, no reemplaza la barra de calidad ni la voz.** Nunca output crudo publicado. Nunca reimplementar el motor de producción existente.

## Doctrina 2026: la barra sube, no baja

- Los motores IA y las personas **filtran lo thin/regurgitado**. Contenido generado sin insight original es invisible (o peor, daña la marca).
- La IA es buena para **acelerar** (research, borradores, variantes, atomización, refactors), no para **decidir el POV** ni **garantizar la verdad**. El insight y el juicio son humanos.
- **AI slop** = contenido genérico, sin ángulo, con voz de nadie. Es el antipatrón central de este módulo.

## Dónde la IA ayuda de verdad (en el pipeline `02`)

| Estación | Uso sano de IA | Riesgo a vigilar |
|---|---|---|
| **Brief/research** | resumir fuentes, encontrar ángulos, mapear preguntas de audiencia | fuentes inventadas → factcheck |
| **Draft** | primer borrador desde un brief fuerte, variantes de estructura | voz genérica, claims falsos |
| **Asset** | imágenes/variantes (studios de asset + `greenhouse-ai-image-generator`) | brand safety, coherencia visual |
| **Atomización** (`04`) | derivar átomos por canal desde el pilar | copia-pega no nativo |
| **Refresh** | actualizar evergreen (datos/año/ejemplos) | perder el contexto original |
| **Medición** | clasificar/resumir feedback y performance | sobre-interpretar |

## Reglas de gobernanza (duras)

1. **Fidelidad de voz.** Todo output IA se ajusta a la voz Efeonce (doctrina → `efeonce-agency`; craft → `copywriting`). La homogenización IA es el enemigo de la marca.
2. **Barra de edición humana obligatoria.** Ningún contenido generado se publica sin curaduría humana (insight, verdad, voz, brand safety). El gate de REVIEW (`02`) aplica igual o más fuerte al contenido IA.
3. **Factcheck de todo claim/dato.** La IA alucina fuentes y cifras. Verifica y cita. Crítico para citabilidad (`seo-aeo`) y confianza.
4. **Insight original igual.** La IA no te exime de la barra de originalidad — la sube (todos tienen IA; el diferencial es tu dato/POV/expertise).
5. **Brand safety + confidencialidad.** No metas data sensible/cliente/NDA en herramientas sin gobernanza; respeta la política de la marca/cliente.
6. **Transparencia según contexto/regulación** sobre contenido asistido por IA cuando aplique.

## El motor real de Efeonce: Content Factory (no reimplementar)

Efeonce tiene un **AI Content Factory** en el repo (`src/lib/public-site/content-factory/`): planificación/validación de posts Gutenberg, catálogo de patrones, patch/refresh de posts, deep-inspection. **Es la herramienta de producción/publicación; se opera vía `efeonce-public-site-wordpress`, no se reimplementa.**

- El studio **decide qué contenido** y aplica la barra de calidad/voz; el Content Factory **produce/publica** en el sitio.
- El **refresh** de evergreen (`04`) tiene soporte en el factory (`refresh-plan`, `existing-post-refresh-draft-plan`) — opéralo vía la skill dueña.
- Golden examples y recipes de autoría Gutenberg viven en `docs/documentation/public-site/`. Ver overlay Efeonce.
- **Regla dura:** nunca publiques output crudo del factory — pasa por el gate de REVIEW (`02`) y la barra de insight/voz.

## Media / assets con IA

- Imagen/video/audio generativo para las piezas → studios de asset (`design-studio`, `motion-design-studio`, `audio-studio`) + `greenhouse-ai-image-generator`. El **Content Factory de media / Media Foundry** (provider-neutral) es la primitive de media; opérala vía su skill/runtime, no inventes generación ad-hoc.
- Los assets IA siguen las mismas reglas: brand safety, coherencia de marca, revisión humana.

## Agentes de contenido (frontera)

- La operación **agéntica** de contenido dentro del portal (que Nexa/consumers operen el motor) sigue el contrato de **Full API Parity** + acción gobernada (`greenhouse-nexa-conversational` + arquitectura Nexa): reads directos; writes vía `propose→confirm→execute`, nunca el LLM escribe/publica directo. El studio no construye eso; lo respeta si el trabajo lo toca.

## Checklist de salida del módulo

- [ ] IA usada para **acelerar**, no para decidir POV ni garantizar verdad.
- [ ] **Fidelidad de voz** + **edición humana** + **factcheck** aplicados a todo output IA.
- [ ] Barra de **insight original** mantenida (no slop).
- [ ] Content Factory/media **operado vía su skill dueña**, nunca reimplementado ni output crudo.
- [ ] Brand safety + confidencialidad respetados.

## Cross-links

- Pipeline/gate → `02`; atomización/refresh → `04`; medición → `06`.
- Voz → `efeonce-agency` + `copywriting`; publicación/Content Factory → `efeonce-public-site-wordpress`; media → studios de asset; agéntico → `greenhouse-nexa-conversational`.
- Caso Efeonce → `efeonce/EFEONCE_OVERLAY.md`.
