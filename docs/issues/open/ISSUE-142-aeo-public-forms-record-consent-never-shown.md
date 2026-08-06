# ISSUE-142 — Los dos formularios públicos del AEO registran consentimiento a una política que nunca se le mostró al usuario

## Ambiente

production — `think.efeoncepro.com/brand-visibility` (form `ai-visibility-grader`) y `efeoncepro.com/aeo-2/` (form `efeonce-aeo-diagnostic`).

## Detectado

2026-08-05, durante el cierre de `TASK-1327`, al inspeccionar la definición pública del form contra producción. No lo reportó un usuario ni una alerta: apareció al leer el contrato real en vez del doc.

## Síntoma

Los dos formularios públicos del AEO capturan datos personales (email de trabajo, nombre y apellido, marca, sitio web) **sin mostrar ningún aviso de privacidad ni casilla de consentimiento en pantalla**, y aun así el sistema persiste una submission con consentimiento afirmativo a una versión de política nombrada.

La submission queda registrada así, sin que nada de eso haya ocurrido frente al usuario:

```json
"consent": { "consentPolicyVersion": "ai-visibility-grader-consent-v1", "checkboxes": [] }
```

## Causa raíz

Cadena de tres piezas, cada una razonable por separado:

1. **Las definiciones publicadas no traen bloque de consent visible.** Verificado contra producción el 2026-08-05:

   | Form | `checkboxes` | `noticeText` | `consentPolicyVersion` |
   |---|---|---|---|
   | `ai-visibility-grader` | **0** | **ausente** | `ai-visibility-grader-consent-v1` |
   | `efeonce-aeo-diagnostic` | **0** | **ausente** | `efeonce-aeo-diagnostic-consent-v1` |
   | `efeonce-lead-gen-web` | 1 | presente | `efeonce-lead-gen-web-consent-v1` |
   | `efeonce-seo-diagnostic` | 1 | presente | `efeonce-seo-diagnostic-v1` |
   | `efeonce-web-agentica-ebook` | 1 | presente | `efeonce-web-agentica-ebook-consent-v2` |

2. **El renderer no pinta nada** cuando no hay ni checkboxes ni aviso — `renderConsent()` en [`src/growth-forms-renderer/renderer.ts`](../../../src/growth-forms-renderer/renderer.ts) retorna `null`:

   ```ts
   if (!consent || !consent.checkboxes || consent.checkboxes.length === 0) {
     if (consent?.noticeText) return el(this.doc, 'p', { class: 'ghf-help' }, consent.noticeText)
     return null
   }
   ```

3. **El renderer envía `consent: true` de todos modos.** El fallback trata "sin checkboxes" como "consentimiento otorgado":

   ```ts
   consent: this.contract.consent
     ? consentCheckboxes.length > 0 || (this.contract.consent.checkboxes ?? []).length === 0
     : true,
   ```

El gate server-side **existe y es correcto** (`commands.ts:404-406`: `consentRequired && !input.consent → consent_required`), pero recibe un `true` fabricado por el cliente, así que pasa. Ese `.length === 0` es lo que convierte una omisión de configuración en un registro afirmativo silencioso.

**No es una falla del motor Growth Forms**: 3 de 5 formularios publicados tienen su bloque de consent correcto. Es que estos dos se publicaron sin él, y el fallback lo volvió invisible en vez de ruidoso.

## Impacto

- **Legal/cumplimiento (Ley 21.719, CL).** El consentimiento debe ser informado y específico. Acá no hay aviso, no hay casilla y no hay enlace a política; sin embargo el registro afirma consentimiento a una versión de política concreta. El registro es **peor que un vacío**: un vacío se ve; esto documenta algo que no pasó.
- **Alcance:** todo lead capturado por ambos formularios mientras estuvieron publicados así. La landing de Think está live y sirviendo tráfico; `/aeo-2/` también.
- **Evidencia de auditoría contaminada.** Si mañana alguien audita `grader_leads` / las submissions, verá consentimiento válido por política versionada. La traza no delata el hueco.
- **Bug class latente en el motor:** cualquier form futuro que se publique sin bloque de consent hereda el mismo comportamiento silencioso.

## Solución

Propuesta; **ninguna parte se aplicó** — publicar una versión nueva de un formulario público con texto legal es decisión del operador + legal, no de un agente.

1. **Contención (decisión del operador):** definir si los dos formularios siguen capturando mientras se corrige. Es una decisión de riesgo comercial vs. cumplimiento, no técnica.
2. **Fix de las dos definiciones:** publicar versión nueva de `ai-visibility-grader` y `efeonce-aeo-diagnostic` con `noticeText` + casilla de consentimiento con copy aprobado por legal y enlace a la política, alineado a lo que ya hacen los otros tres formularios. Ojo con la regresión de `TASK-1321`: `authorDraftForm` no propaga `style_variant`, y una republicación descuidada tumba los selects premium.
3. **Fix del bug class (el que importa):** `(checkboxes ?? []).length === 0 → consent: true` debe dejar de ser silencioso. Opciones, en orden de preferencia:
   - exigir `noticeText` o ≥1 checkbox para publicar un form con `form_kind !== 'survey'` (gate en el compilador/publicación, no en runtime);
   - y/o que el servidor rechace `consent: true` cuando la definición no declara ni aviso ni casilla, en vez de confiar en el cliente.
4. **Decidir el destino de los registros ya capturados** con ese consent afirmativo (¿re-consent, anotación, purga?). Decisión legal.
5. **Backfill del criterio en `TASK-1255`** (PII hardening Ley 21.719, hoy en `EPIC-040`), que es donde vive la postura PII del motor.

## Verificación

- `GET /api/public/growth/forms/ai-visibility-grader` y `…/efeonce-aeo-diagnostic` contra producción devuelven `consent.checkboxes.length >= 1` o `consent.noticeText` presente.
- El form renderizado en `think.efeoncepro.com/brand-visibility` muestra el aviso/casilla en pantalla (verificar en el frame real, no en el HTML estático: el form lo pinta el web component en runtime).
- Un submit sin marcar la casilla es rechazado con `consent_required`.
- Un form nuevo publicado sin bloque de consent **falla la publicación** (gate del punto 3), en vez de publicarse y registrar consentimiento inventado.

## Estado

open

## Relacionado

- `TASK-1246` — Public Launch Readiness: su sign-off legal de consent es el dueño natural de la decisión. Este issue es su input, y estaba anotado como "confirmar, no asumir" antes de tener la evidencia.
- `TASK-1327` — cerrada `complete` el 2026-08-05; su nota de cierre dejó el hallazgo señalado.
- `TASK-1255` — Growth Forms PII hardening (Ley 21.719), `EPIC-040`.
- `TASK-1321` — toca `efeonce-aeo-diagnostic`; cualquier republicación debe coordinarse (y arrastra el bug latente de `style_variant`).
- `EPIC-040` — Growth Public Forms Engine (dueño del motor y del fallback del renderer).
- Código: [`src/growth-forms-renderer/renderer.ts`](../../../src/growth-forms-renderer/renderer.ts) (`renderConsent`, armado del payload) · [`src/lib/growth/forms/commands.ts`](../../../src/lib/growth/forms/commands.ts) (gate server-side).
