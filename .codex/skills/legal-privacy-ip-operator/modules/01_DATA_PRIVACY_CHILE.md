# 01 · Privacidad de Datos — Chile

> **⚠️ No es asesoría legal.** Orienta y cita; valida con abogado. **Vigencia crítica (verificado vía web, as-of 2026-07):** la **Ley 21.719** fue **publicada el 13 de diciembre de 2024** y **entra en plena vigencia el 1 de diciembre de 2026** (transición de 24 meses) — es decir, **a la vuelta de la esquina desde hoy**. Reemplaza el régimen de la Ley 19.628. Reverifica la fecha y el estado de los reglamentos antes de actuar (fuentes al pie).

## El cambio de régimen (lo más importante)

| | Ley 19.628 (régimen saliente) | **Ley 21.719 (nuevo régimen, GDPR-like)** |
|---|---|---|
| Enfoque | débil, sin autoridad fuerte | robusto, principios tipo GDPR |
| Autoridad | sin agencia especializada | **Agencia de Protección de Datos Personales** (fiscaliza y sanciona) |
| Sanciones | casi inexistentes | multas significativas (escalonadas por gravedad, en UTM) |
| Bases de licitud | consentimiento centrado | consentimiento + otras bases (interés legítimo, contrato, ley…) |
| Transferencias | poco reguladas | régimen de transferencia internacional (`04`) |

**Implicación para Efeonce:** el trabajo de cumplimiento sube de nivel. Todo tratamiento de datos de clientes/usuarios (campañas, formularios, CRM, martech) debe alinearse al nuevo estándar antes de la plena vigencia.

## Principios (Ley 21.719, estilo GDPR)

Trátalos como el estándar objetivo (nombres pueden variar; verifica el texto):

- **Licitud y lealtad** — base legal para cada tratamiento.
- **Finalidad** — datos recogidos para fines determinados, explícitos y lícitos; no usarlos para otra cosa incompatible.
- **Proporcionalidad / minimización** — solo los datos necesarios.
- **Calidad** — exactos y actualizados.
- **Transparencia / información** — informar al titular qué, para qué, por quién.
- **Seguridad** — medidas técnicas y organizativas (→ `greenhouse-secret-hygiene`).
- **Responsabilidad (accountability)** — el responsable debe poder **demostrar** cumplimiento (registros, políticas).
- **Confidencialidad.**

## Bases de licitud

Un tratamiento necesita **al menos una** base. El consentimiento **no es la única**:

- **Consentimiento** — libre, informado, específico, inequívoco; revocable. Para datos sensibles, más estricto.
- **Ejecución de un contrato** con el titular.
- **Obligación legal** del responsable.
- **Interés legítimo** (con test de ponderación — nuevo respecto a 19.628).
- Otras (interés vital, etc.).

**Datos sensibles** (salud, origen, ideología, vida sexual, biométricos, etc.) y **datos de niños/adolescentes** tienen protección reforzada.

## Roles y derechos

- **Responsable del tratamiento** (controller) — decide fines y medios. Efeonce suele ser responsable de sus propios datos y **encargado** (processor) de los datos de sus clientes → el rol cambia el contrato (`04`, `05`).
- **Encargado** (processor) — trata por cuenta del responsable, bajo contrato (DPA).
- **Delegado de Protección de Datos (DPO)** — el nuevo régimen puede exigirlo/recomendarlo según el tratamiento.

**Derechos del titular (ARCO + nuevos):** Acceso, Rectificación, Cancelación/supresión, Oposición, **Portabilidad**, y limitación/bloqueo. Deben poder ejercerse con un canal claro y plazos.

## Brechas de seguridad

El nuevo régimen introduce **deber de notificar brechas** (a la Agencia y, según el caso, a los titulares) en plazos acotados. Ten un **plan de respuesta a incidentes** antes de necesitarlo (coordina con `greenhouse-secret-hygiene` + `arch-architect` para el runtime).

## La Agencia (APDP) — verificado

La **Agencia de Protección de Datos Personales (APDP)** es una **corporación autónoma de derecho público** con potestad para **investigar de oficio, multar, ordenar la suspensión del tratamiento** y publicar un **Registro Nacional de Sanciones**. Es el cambio estructural más grande vs. 19.628: por primera vez hay un regulador con dientes.

## Sanciones

Multas **en UTM**, escalonadas por gravedad de la infracción, aplicadas por la APDP; las sanciones se publican en el **Registro Nacional de Sanciones** (efecto reputacional). El salto respecto a 19.628 es grande → el incumplimiento deja de ser gratis. Verifica los tramos vigentes.

## Checklist operativo (Efeonce como responsable/encargado)

- [ ] Inventario de tratamientos (qué datos, para qué, base de licitud, dónde viven).
- [ ] Base de licitud identificada por tratamiento (no asumir consentimiento por defecto).
- [ ] Aviso/política de privacidad transparente y accesible (sitio, formularios → `09`).
- [ ] Canal para ejercer derechos ARCO+ con plazos.
- [ ] **DPA (contrato de encargo)** con clientes cuando Efeonce trata sus datos, y con sub-encargados (martech) (`04`, `05`).
- [ ] Medidas de seguridad + plan de respuesta a brechas.
- [ ] Registro que **demuestre** cumplimiento (accountability).
- [ ] Revisión de **transferencias internacionales** (CRM/martech en el extranjero) (`04`).

## Hand-off

- Transferencias internacionales / DPA / GDPR → `04`.
- Cookies/consentimiento/política del sitio → `09`.
- Contrato de encargo (DPA) como cláusula → `05`.
- Seguridad/PII en runtime → `greenhouse-secret-hygiene` + `arch-architect`/`greenhouse-backend`.
- **Validación legal** → abogado habilitado en Chile (la skill no dictamina).

## Fuentes (verificado vía web, as-of 2026-07)

- Texto oficial: BCN Ley Chile — Ley 21.719 (`bcn.cl/leychile`, idNorma 1209272).
- Guía de implementación del Estado: `wikiguias.digital.gob.cl/datos-personales`.
- Publicada 13-dic-2024; plena vigencia **1-dic-2026**; crea la APDP (corporación autónoma de derecho público) con potestad de investigar de oficio, multar, suspender tratamiento y publicar Registro Nacional de Sanciones. Reverifica reglamentos y tramos de multa antes de actuar.
