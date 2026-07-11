# 09 · Compliance Digital (cookies · consentimiento · site terms · anti-spam)

> **⚠️ No es asesoría legal.** Orienta y cita; valida con abogado. Este módulo es donde la privacidad (`01`-`04`) aterriza en el **runtime web y martech** de Efeonce y sus clientes: qué documentos publica el sitio, cómo pide consentimiento, y cómo hace email marketing sin infringir.

## Los documentos legales de un sitio (los 3 imprescindibles)

| Documento | Qué es | Obligatoriedad |
|---|---|---|
| **Política de privacidad / Aviso de privacidad** | qué datos recolectas, para qué, con quién los compartes, transferencias, derechos, contacto | de facto obligatorio en todas las jurisdicciones cubiertas; contenido mínimo varía (México muy formal) |
| **Términos y condiciones (ToS)** | reglas de uso del sitio/servicio, IP, responsabilidad, ley aplicable | recomendado siempre; obligatorio para e-commerce/contratación online |
| **Política de cookies** | qué cookies/trackers usas y cómo gestionarlos | ligada al consentimiento (abajo) |

**Regla FTC (US) + transparencia (LATAM):** la política de privacidad es **exigible** — di lo que haces y haz lo que dices. Una política copiada que no refleje tu tratamiento real es un riesgo, no una protección.

## Consentimiento de cookies / tracking — el matiz por jurisdicción

No es un banner único global; el estándar cambia:

- **GDPR (UE) — opt-in previo:** cookies no esenciales (analytics, ads) requieren **consentimiento previo explícito** ANTES de cargarse. Banner con aceptar/rechazar simétrico; nada de "seguir navegando = aceptar".
- **EEUU — opt-out + señales:** modelo de **opt-out** (no de consentimiento previo). California y varios estados exigen honrar **GPC (Global Privacy Control)** y ofrecer opt-out de "sale/share" / targeted advertising (`03`, `03b`).
- **LATAM (CL/CO/MX/PE) — informar + base:** transparencia + base de licitud; el estándar sube hacia consentimiento con las reformas (Chile 21.719, etc.). Informa y ofrece control.
- **Regla práctica para Efeonce (multi-país):** implementa un **CMP (Consent Management Platform)** geo-consciente que aplique opt-in donde se exige (UE) y opt-out/GPC donde aplica (US), e informe en LATAM. No uses el banner de un país para todos.

## Martech y datos — dónde vive el riesgo

El tracking es recolección de datos personales. Cruza con privacidad (`01`-`04`):

- **GA4 / Google Ads / Meta Pixel:** cargan trackers → requieren base/consentimiento según jurisdicción; declara en la política de privacidad y respeta el CMP. Google exige **Consent Mode** en la UE.
- **HubSpot / CRM / forms:** captura de datos con base de licitud + aviso claro en el formulario (`greenhouse-growth-forms`). Cada campo capturado debe tener finalidad.
- **Lead magnets / formularios:** consentimiento informado al capturar el email; finalidad clara (¿solo el ebook, o también newsletter?). No pre-marcar casillas de consentimiento (dark pattern).
- **La implementación runtime** (tags, consent mode, GPC) es de `greenhouse-gtm-ga4-operator` + `greenhouse-growth-forms`; **legal fija el requisito**, ellos lo ejecutan.

## Email marketing / anti-spam (cruza con `08`)

- **EEUU — CAN-SPAM:** email comercial con remitente identificable, asunto no engañoso, dirección física, **opt-out honrado** (~10 días). **No exige opt-in previo** pero sí opt-out fácil.
- **EEUU — TCPA (SMS/llamadas):** **consentimiento previo expreso** para marketing por SMS/teléfono. Alto riesgo litigioso — no lanzar SMS sin él.
- **LATAM:** varios países exigen consentimiento y respeto a la baja (Chile Ley 19.496 regula el spam/derecho a rechazar; verifica por país). Tendencia a **opt-in**.
- **Regla práctica:** trata el email marketing como **opt-in con opt-out fácil** en todos lados (cumple el estándar más alto), registra el consentimiento, y honra las bajas rápido.

## Dark patterns (evítalos — sancionables)

Interfaces que manipulan el consentimiento son perseguidas (FTC, GDPR, CCPA):

- Botón "Aceptar" destacado y "Rechazar" escondido/ausente.
- Casillas de consentimiento pre-marcadas.
- Opt-out laberíntico ("confirm shaming", pasos infinitos para darse de baja).
- Consentimiento agrupado (no puedes aceptar el servicio sin aceptar el marketing).

## Checklist de un sitio/campaña compliant

- [ ] **Política de privacidad** veraz, accesible y que **refleje el tratamiento real** (adaptada por jurisdicción).
- [ ] **Términos y condiciones** + **política de cookies** publicados.
- [ ] **CMP geo-consciente**: opt-in (UE), opt-out + GPC (US), informar (LATAM).
- [ ] **Consent Mode** en GA/Ads donde aplica; pixel/tags respetan el CMP.
- [ ] **Formularios**: base/consentimiento informado, finalidad clara, sin casillas pre-marcadas.
- [ ] **Email**: opt-in + opt-out honrado (CAN-SPAM/local); **SMS** solo con consentimiento previo (TCPA).
- [ ] **Sin dark patterns** en banners/formularios/bajas.
- [ ] Transferencias y sub-procesadores declarados (`04`).

## Hand-off

- Régimen de privacidad por jurisdicción → `01`-`04`; publicidad/disclosure → `08`.
- Implementación runtime (tags/consent/GPC/forms) → `greenhouse-gtm-ga4-operator` + `greenhouse-growth-forms` + HubSpot.
- Publicación de las páginas legales → `efeonce-public-site-wordpress`.
- **Validación legal** → abogado en la jurisdicción.
