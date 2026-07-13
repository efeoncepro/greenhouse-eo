# CREATIVE_PRACTICE_BOUNDARY — dónde termina esta skill

> **La regla de una línea:**
> **Si la pregunta es _cómo se hace la pieza_ → es del studio. Si es _cuánto vale, qué incluye y hasta dónde
> llega_ → es de acá.**

---

## 1. La frontera con los studios *(el oficio)*

**Esta skill VENDE y SCOPEA. Los studios EJECUTAN. Nunca al revés.**

| Studio | Ejecuta | Esta skill aporta |
|---|---|---|
| **`design-studio`** | Dirección de arte, Key Visual, sistema visual, auditoría de marca | Cuánto cuesta ese KV, cuántas rondas trae, quién se queda con los derechos |
| **`motion-design-studio`** | Video, animación, VFX, spots | Idem — **y el costo de la urgencia** |
| **`audio-studio`** | Voz, música, SFX, sonic branding | Idem — **y la licencia de la música, que es donde se sangra** |
| **`social-media-studio`** | Ejecución social plataforma por plataforma | Idem |
| **`copywriting`** | El craft de las palabras | Idem — *(y su cap: **2 drafts**, no infinitos)* |
| **`content-marketing-studio`** | Motor de contenidos, atomización, distribución | ⚠️ **Si el deal es de contenido/SEO, el pricing de esa lane NO es de acá** → `seo-aeo-practice` |
| **`greenhouse-ai-image-generator`** | El pixel *(CLI `pnpm ai:image`, providers)* | — |

🔴 **NUNCA** describas *cómo* se dirige un KV, cómo se anima o cómo se escribe un copy desde esta skill.
**Delega.** Esta skill **no sabe hacer el trabajo — sabe cuánto vale y hasta dónde llega.**

🎯 **Y al revés:** los studios tienen un `CLIENT_DELIVERY.md` — eso es **cómo se ENTREGA a un cliente Globe**.
**Esto es cómo se COBRA.** Son dos documentos distintos y ninguno reemplaza al otro.

---

## 2. La frontera con las otras skills comerciales

```
efeonce-agency          →  la DOCTRINA          (ASaaS, masterbrand, switching cost. El Manifesto gana.)
        ↓
gtm-architect           →  el MOTION            (a quién, con qué positioning, por qué canales)
        ↓
commercial-expert       →  el MÉTODO            (discovery, MEDDPICC, JOLT, negociación, forecast)
        ↓
🎯 creative-practice    →  el DOMINIO           (qué se vende, a cuánto, con qué alcance)
        ↓
los studios             →  el OFICIO            (cómo se hace)
```

🔴 **NUNCA reinventes el escalón de arriba.** Si te encuentras escribiendo sobre cómo hacer discovery en
general, **estás escribiendo `commercial-expert`. Para.**

---

## 3. Hand-offs específicos — quién manda

| Necesitas… | Skill dueña | Contrato |
|---|---|---|
| **Dimensionar el squad** *(roles, seniority, % dedicación, RACI)* | **`greenhouse-talent-people-operator`** | `references/client-squad-design.md` + `templates/squad-blueprint.md`. 🔴 **El blueprint es SUYO. Esta skill lo PRECIA, no lo diseña.** |
| **El loaded cost real** *(bruto vs costo empresa, cargas, overhead)* | **`greenhouse-finance-accounting-operator`** | 🩸 **El piso sale de acá, no de la intuición.** *(Y hay un hallazgo abierto: `modules/04_PRICING.md` §3.)* |
| **Redactar la cláusula de derechos de uso / MSA / SOW** | **`legal-privacy-ip-operator`** | 🎯 **Esta skill decide QUÉ COBRAR por el uso. Esa decide CÓMO SE REDACTA para que sea exigible.** |
| **Componer el deck** | **`deck-studio`** *(+ Artifact Composer)* | Esta skill es **consumer**. 🔴 **La fuente es el repo, no el PDF.** |
| **Si entra por licitación / RFP formal** | **`greenhouse-public-private-tenders`** | Bases, admisibilidad, garantías, oferta técnica+económica. ⚠️ **Ahí la cesión total suele ser condición de admisibilidad → va al precio, no se negocia.** |
| **El pricing de la lane de contenido/SEO** | **`seo-aeo-practice`** | 🔴 **No dupliques su rate card.** Si el deal es mixto, cada lane la precia su práctica. |
| **El pricing de la lane de CRM/HubSpot** | **`hubspot-solutions-partner`** | Idem. |
| **Las métricas de delivery** *(OTD/FTR/RpA, materializers, trust policy)* | **`greenhouse-ico`** | Esta skill las **vende y las compromete**; no las calcula. 🔴 **Y lo que se compromete, se compromete en `modules/11`.** |
| **Refrescar un dato de mercado** | **`research-benchmark-operator`** + `/deep-research` | 🔴 **Esta skill no guarda hechos de memoria. Verifica.** |
| **El copy visible del portal** *(si el deal toca producto)* | **`greenhouse-ux-writing`** + `src/lib/copy/` | Otro dominio. |

---

## 4. Zonas grises — y cómo se resuelven

| Situación | Quién manda |
|---|---|
| *"¿Cuántas rondas incluye un rebrand?"* | 🎯 **Acá** *(es alcance comercial)*. El **contenido** de las rondas es de `design-studio` |
| *"¿Cuánto cobramos por un spot de 30 segundos?"* | 🎯 **Acá** — **y la respuesta es que no cobramos por spot: cobramos capacidad** *(regla dura 3)* |
| *"El cliente pide 3 rutas creativas antes de firmar"* | 🎯 **Acá** — **es spec work** *(`modules/10_PITCH.md` §4)*, no una pregunta de diseño |
| *"¿Qué le decimos al cliente que dice que lo hace con IA?"* | 🎯 **Acá** *(`modules/09_DISPLACEMENT.md` §6)* |
| *"¿Podemos usar esta imagen generada con IA en una campaña pagada?"* | 🔴 **`legal-privacy-ip-operator`** *(IP y derechos de uso)* — **no lo resuelvas acá** |
| *"El deal es creativo + SEO + HubSpot"* | **Cada lane la precia su práctica.** Esta skill precia **solo la creativa**, y `commercial-expert` arma el deal completo |
| *"¿Cómo dimensionamos el squad para este alcance?"* | 🔴 **`greenhouse-talent-people-operator`** *(el blueprint)*. Acá se **precia** el resultado |
| *"El cliente quiere que le prometamos +20% de awareness"* | 🎯 **Acá — y la respuesta es NO** *(regla dura 10)* |

---

## 5. La prueba de fuego

**Antes de escribir una línea desde esta skill, pregúntate:**

> **¿Esto que voy a decir cambiaría si el servicio fuera SEO en vez de creativo?**
>
> - **Sí cambiaría** → probablemente **es de acá** *(es dominio creativo)*.
> - **No cambiaría** → **es de `commercial-expert` o de `gtm-architect`.** **No lo dupliques.**
