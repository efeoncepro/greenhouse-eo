---
last-revised: 2026-05-07
type: greenhouse-overlay
---

# Product Suite Positioning

Decision tree para posicionar los 4 productos Efeonce (servicio agencia / Kortex / Verk / Greenhouse portal) según el cliente. Aligned con `docs/strategy/ASAAS_MANIFESTO_V1.md` §5.

**Regla maestra**: nunca pitch los 4 a la vez. 1 producto como eje + 0-2 como leverage. Greenhouse portal siempre foregrounded como plumbing.

---

## Los 4 productos (canonized)

| Producto | Categoría | Standalone? | ¿Vendible separado? | Función primary |
|---|---|---|---|---|
| **Servicio agencia** | Agencia productizada | Sí (MSA + SOWs) | Sí | Capacidad humana creative + strategic + operations |
| **Kortex** | CRM platform | Sí (SaaS sub) | Sí | CRM data unification, customer ops platform |
| **Verk** | Data / AI tooling | Sí (SaaS sub) | Sí | Analytics + AI tooling for marketing teams |
| **Greenhouse portal** | Operational portal | No standalone | NO — siempre con servicio | Operational visibility + accountability layer |

**Nota crítica**: Greenhouse portal NO se vende standalone. Es el plumbing operativo del servicio + integration backbone para los SaaS. Si un cliente quiere "solo Greenhouse", probablemente quiere un competitor de Asana / Monday.

---

## Matrix de combinaciones canónicas

| Tipo de cliente | Productos | Posicionamiento eje | Soporte |
|---|---|---|---|
| **Globe Active Account (estratégico + operativo)** | Servicio + Greenhouse + (Kortex y/o Verk según needs) | Servicio agencia (eje) | Greenhouse foregrounded; Kortex/Verk según data/CRM/AI need |
| **Globe Active Account (data-heavy)** | Servicio + Greenhouse + Verk | Servicio + Verk (co-eje) | Greenhouse foregrounded |
| **Globe Active Account (CRM-heavy)** | Servicio + Greenhouse + Kortex | Servicio + Kortex (co-eje) | Greenhouse foregrounded |
| **Self-Serve Kortex standalone** | Kortex | Kortex (eje único) | None |
| **Self-Serve Verk standalone** | Verk | Verk (eje único) | None |
| **Self-Serve Kortex + onboarding service tier** | Kortex + servicio onboarding | Kortex (eje) | Servicio onboarding light como upsell |
| **Project Customer (one-off)** | Servicio + Greenhouse | Servicio (eje, scope-limited) | Greenhouse foregrounded para delivery transparency |
| **Project + tech adoption potential** | Servicio + Greenhouse + (Kortex o Verk Self-Serve potential) | Servicio (eje) | Greenhouse + Kortex/Verk como future expansion path |

---

## Decision tree de pitch focus (cold pitch)

Cuando entrás a discovery con un Globe Account:

```
Step 1: ¿Cuál es el dolor primario del cliente?
├── Saturation team in-house + need strategic capacity → SERVICIO AGENCIA como eje
├── Data fragmentation across CRM tools → KORTEX como eje
├── Analytics maturity gap (no tienen analytics in-house) → VERK como eje
├── Operational visibility / accountability gap → SERVICIO + GREENHOUSE foregrounded
└── Mix de varios → SERVICIO como eje (Active Account default), otros como leverage

Step 2: ¿Cuál es el segundo dolor?
├── Si emerge tech adoption need → AGREGAR Kortex o Verk como leverage
├── Si emerge accountability / transparency → AGREGAR Greenhouse foregrounded
└── Si no emerge → mantener pitch focused en eje único

Step 3: Verify ICP fit antes de positioning
├── Si Active Account fit → SERVICIO eje
├── Si Self-Serve fit → KORTEX o VERK eje, NO servicio
└── Si Project fit → SERVICIO scope-limited

Step 4: Avoid los 4 productos a la vez
├── Si tentación de pitch los 4 → STOP, refinar discovery
└── Si cliente pregunta "¿qué más tienen?" → defer ("primero validemos si el eje resuelve, después vemos extensions")
```

---

## Storytelling per producto (cómo lo presentás)

### Servicio agencia (eje en Active Accounts)

> **Pitch core**: "Te damos un team Efeonce que opera como extensión de tu in-house team — estratégico + creative + operativo — productizado con scope canónico, telemetría de delivery, y economía unitaria explícita. No es retainer flat con lipstick. Es servicio operado como producto."

**Proof points**:
- Case study Active Account similar (Sky / ANAM / Aguas según vertical)
- MEDDPICC outcomes declarados al cierre del último deal Active comparable
- Sample dashboard Greenhouse portal mostrando real telemetría

**No-go**:
- NO pitch como "creative agency" puro (categorical trap)
- NO pitch sin contexto operacional

### Kortex (CRM platform)

> **Pitch core (Self-Serve)**: "Kortex unifica tu CRM data sin vendor lock-in. Built for marketing teams que necesitan operar customer journeys cross-canal. Se integra con tu stack actual; no te encierra."

> **Pitch core (componente Active)**: "Kortex resuelve la data fragmentation que vimos en discovery. Es el CRM platform que tu team in-house puede operar autonomously, integrado al servicio."

**Proof points**:
- Demo en vivo (PLG-friendly)
- Free trial offer (Self-Serve path)
- Integration list + portability story (counter vendor lock-in objection)

### Verk (data + AI tooling)

> **Pitch core**: "Verk es analytics + AI tooling para marketing teams. No es 'dashboard pretty'; es insights accionables con AI assistance built-in. Replica el output que tendrías con un data analyst senior dedicated, escalable per usage."

**Proof points**:
- Demo del output (real insights de un caso real anonymized)
- Use case stories (e.g., "agency reduce time-to-insight from 2 days to 2 hours")
- AI capabilities transparency (qué hace, qué no, why)

### Greenhouse portal (siempre foregrounded como soporte)

> **Pitch core**: "Greenhouse es el portal operacional que da transparency real entre nosotros y vos. Sprints, tasks, ICO metrics, audit trail, evidence upload — todo visible. La opacidad operativa que tenés con vendors actuales se elimina. Cuando tu CFO pregunta '¿qué hizo Efeonce este mes?', vos tenés la answer."

**Proof points**:
- Live walkthrough portal con cliente test
- Specific features: capability gates, ICO health score, lifecycle case visibility
- Audit log demo (transparency proof)

**Notas**:
- Greenhouse foregrounded en cada Active Account pitch
- Muestra el commitment a transparency operativa (manifesto §10 Doctrina 5)
- Diferencia clara vs. agency tradicional opaca

---

## Cross-product synergies (cuando aplican)

### Servicio + Kortex (Active Account con CRM gap)

Servicio adopta Kortex como CRM operativo + custom extensions. Beneficio: cliente obtiene un CRM platform robusto + servicio que lo opera.

### Servicio + Verk (Active Account con data gap)

Servicio integra Verk para analytics deeper + AI-assisted insights. Beneficio: cliente obtiene data capability sin hire a senior analyst in-house.

### Servicio + Kortex + Verk (full stack Active Account, raro pero high LTV)

Cliente full integrated. Active Account de máximo LTV. Pricing premium justificado.

### Greenhouse portal + cualquier producto

Always-on. No hay Active Account o Project sin Greenhouse portal foregrounded.

---

## Anti-pattern: el pitch "tenemos de todo"

> "Tenemos servicios + Kortex + Verk + Greenhouse. ¿Qué necesitás?"

Por qué falla:
- Choice overload buyer (anti-pattern catalog #8 demo early)
- Categorical confusion ("¿qué son ustedes? agency? saas vendor? consultora?")
- Sin focus, sin memoria post-pitch
- Procurement no sabe cómo evaluarlo

Antídoto: discovery first, pitch focus second. NUNCA mover step 2 antes que step 1 esté solid.

---

## Cuándo decir NO a vendor un producto

Hay configuraciones donde es OK rechazar venta:

### Self-Serve quiere servicio agencia

Cliente Self-Serve (Kortex / Verk standalone) pide pitch para servicio agencia. Si su tamaño / fit no justifica Active Account → recommend stay Self-Serve, transition path documented.

Razón: Active Account requires recursos. Forzar Active fit con cliente Self-Serve quema unit economics ambos lados.

### Active prospect quiere solo Greenhouse portal

Cliente quiere comprar solo el portal sin servicio + sin SaaS. NO. Greenhouse no es vendible standalone.

Razón: portal sin servicio = Asana / Monday competitor. No core fit con modelo ASaaS.

### Project Customer quiere migrar a Active prematuramente

Project de $20K quiere convertir a Active sin demonstrating fit. Validate primero (next Project go well, ICP fit verified) antes de Active commitment.

---

## Output canónico cuando proposes positioning

```markdown
## Product Positioning — [Account] [Discovery context]

### Pain primario identificado
- [pain]
- evidence: [from discovery]

### Producto eje recomendado
- [producto]
- razón: [why this matches pain primary]

### Productos soporte (si aplica)
- [producto soporte]: [cuándo aplica + cómo articularlo]

### Productos NO posicionados (deliberate)
- [producto no posicionado]: [por qué no en este pitch]

### Pitch arc proposed
1. Discovery confirm (acknowledge pain)
2. Reframe (Challenger teach if applicable)
3. Eje product introduction
4. Proof point (case study + metrics)
5. Soporte product mention (if applicable)
6. Greenhouse portal foregrounding
7. Next step (deeper discovery, demo, pilot, proposal)

### Risks / objections anticipated
- [objection]: [counter]
```

---

## Cross-references

- **Manifesto ASaaS** — `docs/strategy/ASAAS_MANIFESTO_V1.md` §5
- **Globe ICP** — `greenhouse-overlay/globe-clients-icp.md`
- **ASaaS positioning** — `greenhouse-overlay/asaas-positioning.md`
- **Client kind playbooks** — `greenhouse-overlay/client-kind-playbooks.md`
- **Discovery framework** — `frameworks/meddpicc.md` + `frameworks/jtbd-forces-of-progress.md` (global skill)
