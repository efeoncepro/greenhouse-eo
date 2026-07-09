# Ebook lead magnets — playbook reusable (source → entrega → landing)

> **Tipo:** Referencia operativa (convención reusable)
> **Creado:** 2026-07-09 por Claude
> **Última actualización:** 2026-07-09 por Claude
> **Implementación de referencia:** `TASK-1374` (landing `/web-agentica`) + `TASK-1375` (foundation del Growth Form + entrega)

Este doc fija cómo Efeonce publica un **lead magnet de ebook**: de dónde salen los PDFs, cómo se entregan de forma gated, y cómo se arma la landing + el thank-you. Aplica a **todos los ebooks y landings** que hagamos, no solo al primero.

## 1. Source of truth de los PDFs (dónde dejan los ebooks el equipo)

Los ebooks (entregables + editables) viven en OneDrive de Efeonce:

```
~/Library/CloudStorage/OneDrive-EfeonceGroupSpA/Alineación/5. Contenidos/07. Ebook/
  ├── 01. Entregables Ebook/        # ← PDFs finales (esto es lo que se publica)
  │     ├── Ebook_DesarrolloTradicional.pdf   (→ landing /web-agentica)
  │     ├── Content Supply Chain_v3.pdf
  │     ├── Ebook Humanidad Aumentada ...pdf
  │     ├── Loop Marketing ID.pdf
  │     ├── Surround Discovery ...pdf
  │     └── Surround Strategy_Final.pdf
  └── 02. Editables/                # fuentes editables (no se publican)
```

- **El equipo deja acá todos los ebooks.** Para publicar uno, se toma el PDF de `01. Entregables Ebook/`.
- **NUNCA** commitear el PDF al repo (binarios pesados; el de Desarrollo Tradicional pesa ~9 MB). El PDF va al bucket privado de GCS, no a git.

## 2. Entrega gated (el ebook se baja SOLO tras completar el form)

1. **PDF → bucket privado** `GREENHOUSE_PRIVATE_ASSETS_BUCKET` vía el helper canónico `src/lib/storage/greenhouse-assets.ts`. Nunca público, nunca URL estática compartible.
2. **Form gobernado** (Growth Forms) con gate de **correo corporativo** (bloquea free/disposable, como el grader). Campos típicos: nombre, email (corporate), rol (opcional).
3. Al enviar el form, el submit gobernado **emite un token de descarga** ligado a la submission (patrón tokenized handoff del grader; el `gh_form_submission_accepted` lleva el handle escalar).
4. La landing dispara la **descarga inmediata en pantalla** con ese token → ruta gobernada `/api/public/growth/forms/.../asset/[token]` valida y devuelve un **signed URL de corta expiración** desde el bucket privado.
5. **Email de respaldo:** consumer reactivo sobre `submission_accepted` envía el **link** (signed URL), NO el archivo adjunto (los PDFs de ~9 MB exceden límites de adjunto y ensucian entregabilidad). Sin form completado ⇒ sin token ⇒ sin descarga.
6. El lead (nombre/email/rol) va a **HubSpot** como destination async at-most-once (nurture). La entrega del ebook NO es un destination — es success card + consumer reactivo (destinations = leads externos).

## 3. Thank-you (post-descarga)

**Tarjeta inline** que reemplaza el form (NO overlay/modal). Anatomía (state-design + forms-ux + modern-ui):

- **Confirmación honesta** de ambos canales: "se está descargando" + "te lo enviamos al email".
- **Recuperación:** botón "Descargar de nuevo" (gated, usa el token del handoff — lo pinta la landing, no el success card estático) + "revisa spam/promociones".
- **Un solo next step** (restraint): puente al grader `/brand-visibility` ("¿Cómo te ve la IA hoy? → Medir mi visibilidad"). No un muro de CTAs.
- A11y: foco al título del panel (`tabindex=-1`), `role=status`/`aria-live=polite`; reduced-motion = swap instantáneo.

El `success_card` gobernado del form es el **baseline** (copy de confirmación + no-JS); la landing enriquece con el token. Mismo reparto que brand-visibility: Greenhouse gobierna submit/token, la landing pinta el estado post-submit.

## 4. Landing (superficie pública)

- Página Astro **nativa** en Think (`efeonce-think`), NUNCA un export estático crudo de herramienta de diseño (design system foráneo, fuentes ajenas, form muerto, sin SEO/GTM). Ver el anti-patrón en `TASK-1374`.
- `BaseLayout` (title/description/canonical/OG/JSON-LD FAQ/GTM `GTM-NGHPGRLZ`/favicon), tokens **AXIS** (`report-tokens.ts`) + Geist/Poppins, acento **Navy + Teal `#36c8bf`** (el de `/brand-visibility`). NUNCA HEX crudo ni fuentes foráneas.
- URL corta y SEO-friendly, sin `/index.html`, sin redirect (`trailingSlash:'never'`).
- Form embebido como `<greenhouse-form>` (consumer del contrato gobernado); la landing no valida ni entrega.

## 5. Checklist por ebook/landing nuevo

- [ ] Tomar el PDF de `01. Entregables Ebook/`; NO commitearlo al repo.
- [ ] Subir el PDF al bucket privado (`greenhouse-assets.ts`).
- [ ] Autorar + publicar el Growth Form (corporate email gate + success card baseline + puente al grader) por el lifecycle gobernado; `form_key` estable.
- [ ] Surface + origin (`think.efeoncepro.com` en el allowlist) + Turnstile hostname.
- [ ] Entrega tokenizada (descarga en pantalla) + email de respaldo con el link (no adjunto).
- [ ] Destination HubSpot (lead) + property mapping.
- [ ] Landing Astro nativa (AXIS/Geist, SEO+GTM, URL corta) + thank-you inline.
- [ ] Fila en `docs/reference/measurement-gtm-ga4/TRACKING-PLAN.md`.
- [ ] Smoke real browser desde el origin (Turnstile + CORS) antes de declarar live.

## Referencias

- Implementación de referencia: `docs/tasks/in-progress/TASK-1374-*` + `docs/tasks/to-do/TASK-1375-*`.
- Motor de forms: skill `greenhouse-growth-forms` + `docs/architecture/GREENHOUSE_GROWTH_PUBLIC_FORMS_ENGINE_ARCHITECTURE_V1.md`.
- Storage: `src/lib/storage/greenhouse-assets.ts` (bucket privado + signed URL).
- Alta de surface: `docs/manual-de-uso/growth/alta-surface-growth-form-checklist.md`.
- Marca/tokens Think: `efeonce-think/src/lib/report-tokens.ts` (AXIS copiado) + `.claude/skills/astro/efeonce-overlay.md`.
