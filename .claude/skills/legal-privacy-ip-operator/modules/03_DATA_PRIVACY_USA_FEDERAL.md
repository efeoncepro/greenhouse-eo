# 03 · Privacidad de Datos — EEUU (federal + sectorial + California)

> **⚠️ No es asesoría legal.** Orienta y cita; valida con abogado de EEUU. **Contexto de apertura:** Efeonce está entrando a EEUU — el modelo es **radicalmente distinto a LATAM**: **no hay una ley federal omnibus de privacidad.** El cumplimiento se arma por capas: (1) federal sectorial + FTC, (2) leyes **estatales** (`03b`), (3) marketing (CAN-SPAM/TCPA). Verifica vigencia siempre.

## El modelo mental gringo (interiorízalo)

- **No hay GDPR federal.** No asumas un régimen único. El riesgo se define por: ¿qué **tipo de dato** (salud, financiero, de menores)? ¿qué **estado** residen los consumidores? ¿qué **canal** (email, SMS, llamadas)?
- **Enforcement por daño/engaño, no por registro.** La **FTC** persigue prácticas "unfair or deceptive"; no hay que "registrarse" como en LATAM, pero **incumplir tu propia privacy policy es sancionable**.
- **Sectorial + estatal**, no general. Se apilan.

## Capa 1 — FTC (el piso federal de facto)

- **FTC Act §5** — prohíbe prácticas "**unfair or deceptive**". En privacidad se traduce en: si prometes algo en tu **privacy policy** y no lo cumples, o recolectas/compartes datos de forma engañosa, la FTC puede actuar (consent decrees, multas).
- **Regla práctica:** tu privacy policy no es decorativa — es **exigible**. Di lo que haces y haz lo que dices.
- La FTC también empuja reglas sobre data brokers, dark patterns, y uso de datos sensibles.

## Capa 2 — Leyes federales sectoriales (por tipo de dato)

Aplican solo si tocas ese sector/dato:

| Ley | Cubre | Relevante para Efeonce si… |
|---|---|---|
| **HIPAA** | datos de salud (PHI) en entidades de salud y sus "business associates" | cliente del rubro salud; podrías ser *business associate* con BAA |
| **GLBA** | datos financieros de consumidores (instituciones financieras) | cliente banca/finanzas/seguros |
| **COPPA** | datos de **niños < 13** online | contenido/apps dirigidas a menores → consentimiento parental verificable |
| **FERPA** | datos educativos de estudiantes | cliente educación |
| **VPPA / otras** | datos de consumo de video, etc. | casos específicos |

**Para una agencia de marketing:** COPPA (audiencias infantiles) y, si atiendes salud/finanzas, HIPAA/GLBA vía contrato (BAA), son los más probables.

## Capa 3 — Marketing / comunicaciones (federal, aplica a campañas)

Load-bearing para una agencia — se cruza con `08` y `09`:

- **CAN-SPAM Act** — email comercial: remitente identificable, asunto no engañoso, dirección física, **opt-out funcional** honrado en ~10 días. **No exige opt-in previo** (a diferencia de LATAM/GDPR), pero sí opt-out fácil. Multas por email infractor.
- **TCPA** — llamadas y **SMS/textos** de marketing: exige **consentimiento previo expreso** (prior express written consent para marketing) y respeto a Do-Not-Call. **Muy litigado** (demandas colectivas caras). El SMS marketing sin consentimiento es de alto riesgo.
- **Telemarketing Sales Rule (TSR)** — reglas de la FTC para telemarketing.

## Capa 4 — California como estándar de facto (CCPA / CPRA)

California es el estado más influyente; muchas empresas adoptan su estándar nacionalmente. Detalle estado-por-estado en `03b`, pero California merece foco:

- **CCPA** (California Consumer Privacy Act, 2018) **reformada por CPRA** (2020, vigente 2023) — el régimen estatal más maduro.
- **Autoridad:** **California Privacy Protection Agency (CPPA)** + Attorney General.
- **Derechos del consumidor:** saber, acceder, **eliminar**, **corregir**, **opt-out de "sale/share"** de datos, limitar uso de **datos sensibles**, no discriminación por ejercer derechos.
- **"Sale/Share":** definición amplia — compartir datos para publicidad conductual cross-context puede contar como "sale/share" → exige el link **"Do Not Sell or Share My Personal Information"** + honrar señales **GPC** (Global Privacy Control).
- **Contractor/Service Provider:** una agencia que trata datos de un cliente suele ser **service provider/contractor** bajo CCPA → requiere **cláusulas contractuales específicas** (limitan el uso de los datos). Igual que el DPA en LATAM/GDPR (`04`, `05`).
- **Umbrales de aplicabilidad (verificado, as-of 2026-07):** la CCPA aplica a negocios con **ingresos brutos anuales > US$25M**, **o** que compran/venden/comparten datos de **≥100.000 residentes u hogares** de California, **o** que derivan **≥50% de sus ingresos** de vender/compartir datos personales. Verifica si tu cliente/tú califican.
- **Nota federal (verificado):** **no hay ley federal omnibus.** La **American Privacy Rights Act (APRA)** expiró sin votación al final del 118° Congreso → no hay preemption federal; se gestiona el "patchwork" estatal directo.

## Aterrizaje para Efeonce entrando a EEUU

1. **Privacy policy exigible** (FTC): publica una veraz y cúmplela (`09`).
2. **Mapa por estado** de dónde están los consumidores (define qué leyes estatales aplican — `03b`).
3. **Señal GPC + opt-out de sale/share** si haces publicidad conductual (`09`).
4. **Consentimiento SMS (TCPA)** antes de cualquier campaña de texto — alto riesgo litigioso.
5. **CAN-SPAM** en todo email comercial (opt-out honrado).
6. **Cláusulas service-provider/DPA** en contratos con clientes US (`04`, `05`).
7. **COPPA** si alguna audiencia puede ser < 13.

## Checklist

- [ ] Privacy policy veraz y cumplida (FTC §5).
- [ ] ¿Toco datos de salud/financieros/menores/educación? → sectorial (HIPAA/GLBA/COPPA/FERPA) + contrato (BAA).
- [ ] Email: CAN-SPAM (opt-out honrado, remitente e ID correctos).
- [ ] SMS/llamadas: TCPA (consentimiento previo expreso) — no lanzar sin él.
- [ ] California: derechos + opt-out sale/share + GPC + cláusulas service-provider.
- [ ] Mapa multi-estado de aplicabilidad → `03b`.

## Hand-off

- Estado por estado (leyes integrales) → `03b`.
- Transferencias / datos que salen de EEUU / GDPR → `04`.
- Cookies/consent/opt-out runtime → `09` + `greenhouse-gtm-ga4-operator`/`growth-forms`.
- Cláusulas service-provider/DPA → `05`.
- **Validación legal** → abogado de EEUU (privacy).
