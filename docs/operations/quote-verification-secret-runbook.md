# Quote Verification Secret — Runbook Operativo

> **Tipo de documento:** Runbook operativo (rotación + audit trail de secrets)
> **Owner:** Ops + finance lead
> **Última revisión:** 2026-04-24 (creación post TASK-629)
> **Por qué existe:** TASK-629 introdujo el QR firmado en el PDF de cotizaciones. La firma usa HMAC-SHA256 con `GREENHOUSE_QUOTE_VERIFICATION_SECRET`. Este doc captura el procedimiento de rotación, el inventario por ambiente y los criterios de aislamiento.

## Inventario por ambiente

| Vercel env scope | Branch deploys | Secret value | Configurado |
|---|---|---|---|
| `Production` | `main` | secret_A (64-char hex, 256 bits HMAC key) | 2026-04-24 |
| `staging` (custom env) | `develop` | secret_B (diferente a producción) | 2026-04-24 |
| `Preview (develop)` | preview de `develop` | secret_C (diferente a producción y staging) | 2026-04-24 |

Cada ambiente tiene un secret **diferente y aislado** — esto previene que un QR generado en staging valide como auténtico en producción y viceversa, manteniendo el aislamiento de ambientes.

## Cuándo rotar

Eventos que requieren rotación inmediata:

- **Compromiso confirmado**: secret leakeado en logs, repo, screenshots o sospecha razonable.
- **Ex-empleado con acceso**: cualquier persona que tuvo acceso al Vercel dashboard del proyecto y deja de trabajar en Efeonce.
- **Auditoría programada**: cada 12 meses como mínimo (best practice — cooldown estándar para HMAC keys).

Eventos que **NO** requieren rotación:

- Renovación de tokens de HubSpot u otros services externos.
- Deploys regulares.
- Cambios de UI o lógica del PDF.

## Procedimiento de rotación

### Paso 1 — Generar nuevo secret

```bash
# 32 bytes (64 hex chars) — 256 bits de entropía, suficiente para HMAC-SHA256
NEW_SECRET=$(openssl rand -hex 32)
echo "$NEW_SECRET" > /tmp/quote-verify-secret-rotation.txt
chmod 600 /tmp/quote-verify-secret-rotation.txt
```

### Paso 2 — Reemplazar en Vercel (por ambiente afectado)

**Production:**

```bash
vercel env rm GREENHOUSE_QUOTE_VERIFICATION_SECRET production --yes
cat /tmp/quote-verify-secret-rotation.txt | vercel env add GREENHOUSE_QUOTE_VERIFICATION_SECRET production
```

**Staging custom env:**

```bash
vercel env rm GREENHOUSE_QUOTE_VERIFICATION_SECRET staging --yes
cat /tmp/quote-verify-secret-rotation.txt | vercel env add GREENHOUSE_QUOTE_VERIFICATION_SECRET staging
```

**Preview (develop):**

```bash
vercel env rm GREENHOUSE_QUOTE_VERIFICATION_SECRET preview develop --yes
vercel env add GREENHOUSE_QUOTE_VERIFICATION_SECRET preview --value "$(cat /tmp/quote-verify-secret-rotation.txt)" --yes develop
```

> **Importante:** generar UN secret por ambiente (no reutilizar entre prod / staging / preview) — vuelve a correr `openssl rand -hex 32` para cada uno.

### Paso 3 — Triggear redeploy

Vercel necesita un nuevo deploy para que el runtime pickeé el nuevo env. Triggear via:

- Push vacío a la branch del ambiente afectado:

  ```bash
  git commit --allow-empty -m "chore: trigger redeploy post quote-verify-secret rotation"
  git push origin main      # o develop, según ambiente
  ```

- O via dashboard Vercel → Deployments → "Redeploy" en el último build.

### Paso 4 — Smoke test post-rotación

1. Generar un PDF de cotización en el ambiente rotado:
   - Production: `https://greenhouse.efeoncepro.com/api/finance/quotes/[id]/pdf`
   - Staging: `https://dev-greenhouse.efeoncepro.com/api/finance/quotes/[id]/pdf` (o vía `pnpm staging:request /api/finance/quotes/...`)
2. Escanear el QR de la página 8 (Signatures + QR).
3. Verificar que el endpoint público abre correctamente y muestra "**Documento auténtico**" + datos del quote.
4. Si muestra "Documento inválido" → el deploy aún no recogió el nuevo env, repetir Paso 3.

### Paso 5 — Cleanup local

```bash
rm -f /tmp/quote-verify-secret-rotation.txt
```

### Paso 6 — Documentar la rotación

Actualizar este doc:

- "Última revisión" al inicio del documento → fecha actual.
- "Inventario por ambiente" → fecha de "Configurado" en la fila correspondiente.
- Agregar entrada al changelog al final del documento.

## Impacto de la rotación en QRs ya emitidos

**CRÍTICO**: rotar el secret invalida **todos** los QRs ya emitidos en PDFs anteriores. Los clientes que escaneen QRs viejos verán "Documento inválido" desde la página pública.

**Mitigaciones:**

1. **No rotar sin necesidad real** — la rotación es destructiva para audit trail histórico de propuestas activas.
2. **Re-emitir PDFs activos** — si la rotación es inevitable, regenerar los PDFs de propuestas vigentes en `status='issued'` o `status='sent'` (los nuevos PDFs tendrán QR válido contra el nuevo secret). El sales rep puede simplemente re-descargar el PDF y re-enviar al cliente.
3. **Comunicar el cambio** — si la propuesta ya fue firmada física u online, no afecta la validez legal — solo afecta la verificación QR online.

## Comportamiento sin secret

Si `GREENHOUSE_QUOTE_VERIFICATION_SECRET` no está configurado en el ambiente:

- El PDF se renderiza idéntico pero **omite la sección del QR** (degradación gracefully).
- El endpoint público `/public/quote/...` responde "verificación no disponible".
- No se rompe el flujo de cotización, solo se pierde la capacidad de verificación online.

Esta es la razón por la que el secret puede setearse o rotarse sin downtime — el sistema degrada antes de fallar.

## Comportamiento ante alteración offline del PDF

El token del QR incluye el `pdfHash = sha256(quotationId + versionNumber + total + currency + lineCount).slice(0, 16)`. El endpoint público recompute el hash desde la DB al validar.

Resultado:

- Si **alguien altera el PDF offline** (ej. modifica el monto en un PDF editor), el hash en el token sigue apuntando al monto original. Cuando se escanea el QR, el endpoint recompute el hash desde DB → match. Hasta acá la alteración no se detecta.
- Si **alguien altera el monto en la DB directamente** (ataque interno con acceso DB), el hash del token NO matchea el recomputado → "Documento inválido". Detección efectiva.
- Si **alguien clona el QR a otro PDF con datos diferentes**, el endpoint sigue consultando DB con el `quotationId + versionNumber` del token → muestra los datos REALES, no los del PDF clonado. La discrepancia visual entre el PDF mostrado y los datos del endpoint debería levantar la sospecha.

**Lo que NO detecta**: alteración offline del PDF que mantiene el QR original sin cambiar la DB. El cliente que confía SOLO en el PDF impreso sin escanear el QR está expuesto. Por eso la sección de Signatures incluye el bloque "Verifica la autenticidad" como invitación explícita a escanear.

## Changelog

- **2026-04-24** — Configuración inicial post-TASK-629. 3 secrets generados (uno por ambiente: prod / staging / preview-develop). Aislamiento entre ambientes confirmado.

## Referencias

- [TASK-629](../tasks/complete/TASK-629-pdf-cotizacion-enterprise-redesign.md) — task que introdujo el secret
- [`src/lib/finance/pdf/qr-verification.ts`](../../src/lib/finance/pdf/qr-verification.ts) — implementación HMAC + QR generation
- [`src/app/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx`](../../src/app/public/quote/[quotationId]/[versionNumber]/[token]/page.tsx) — endpoint público de verificación
- [Doc funcional PDF Cotización Enterprise](../documentation/finance/pdf-cotizacion-enterprise.md) — uso operativo del PDF
