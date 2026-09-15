# Operar y revisar la landing Contacto

## Antes de tocarla

- Lee el [contrato técnico](../../architecture/public-site/CONTACTO_LANDING_RUNTIME_V1.md), el [brief](../../public-site/CONTACT_PAGE_REBUILD_BRIEF_V1.md)
  y la referencia de Contacto de la skill WordPress.
- Comprueba `git status --short`; el checkout es compartido.
- Para una mutación WordPress identifica primero page ID/hash, toma snapshot y usa `Document::save`; nunca edites
  `_elementor_data` directamente.

## Revisión visual mínima

Comprueba `/contacto/` en 1440, 1280, 890 y 390 px. Revisa hero, formulario, rama Careers, agenda, datos
institucionales, FAQ y footer. Con el selector abierto verifica que `scrollWidth === clientWidth`, que el
chevron cerrado mire abajo y que al abrir gire 180° hacia arriba. Recorre el formulario sólo con teclado y
comprueba foco visible, etiquetas, consentimiento y restauración del foco al cerrar la agenda.

Usa los verificadores existentes cuando correspondan:

```bash
pnpm public-website:runtime-status
node scripts/public-website/verify-contacto-seo.cjs
pnpm docs:closure-check
```

El verificador responsive y el selector de país pueden describir un candidato local; no los marques como
publicados sin readback del runtime, purge y evidencia GVC.

## Cambios seguros

- Copy, iconos y layout deben permanecer page-scoped; no corrijas un incidente local alterando header/footer
  globales de Ohio.
- Mantén `hola@efeoncepro.com` y la línea `600 914 0660` diferenciada como teléfono exclusivo de Chile.
- Careers debe seguir siendo un desvío: no agregues campos de candidatura ni envío de CV al formulario.
- No agregues horarios, WhatsApp, mapa, SLA, `LocalBusiness` o destinos de CRM sin owner y evidencia.
- Después de un cambio, actualiza primero el documento canónico, luego esta guía y la referencia espejada de la
  skill; ejecuta closure-check y el context gate al final si tocaste Handoff/changelog.

## Rollback y escalamiento

Para un cambio Elementor, restaura el snapshot gobernado y purga la caché Kinsta. Para un cambio Growth Forms o
Meetings, revierte la versión/binding mediante sus comandos canónicos; no borres submissions. Si el runtime no
coincide con el repo, registra `code complete, rollout pendiente` y escala al owner de Public Site/Growth Forms.
