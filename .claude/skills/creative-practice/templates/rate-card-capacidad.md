# Rate card de capacidad — calculadora de composición

> 🔴 **DOCUMENTO INTERNO. NUNCA se entrega al cliente.**
> Ni como anexo, ni como "desglose de transparencia", ni verbalmente, ni "entre nosotros".
>
> **Publicar un precio por rol = publicar un precio unitario** *(regla dura 3)*. Le entregas la calculadora
> para comoditizarte **y** le enseñas a compararte rol por rol con un freelancer.
>
> **Esto no es un tarifario. Es la máquina con la que se compone el precio de un squad.**

---

## 0. Antes de abrir esta planilla

- [ ] ¿Existe el **squad blueprint**? *(`greenhouse-talent-people-operator` → `templates/squad-blueprint.md`)*
      🔴 **Sin blueprint no hay rate card. No inventes el equipo acá.**
- [ ] ¿El **loaded cost** está confirmado con finance? 🩸 *(bruto vs costo empresa · herramientas · utilización
      real — `modules/04_PRICING.md` §3)*
- [ ] ¿Sabes contra **quién compites** de verdad? *(`modules/09_DISPLACEMENT.md` — el comparable, no la agencia
      de la esquina)*

---

## 1. La fórmula

```
precio_venta_rol (100% dedic)  =  loaded_cost_rol × (1 + buffer) / (1 − margen_objetivo)

precio_línea                   =  precio_venta_rol × % de dedicación del rol

precio_total                   =  gobierno/plataforma
                               +  capacidad humana
                               +  Studio Credits
                               +  implementación/IP
                               +  derechos/licencias/pass-through
```

**Con el piso vigente (45%):** `/ (1 − 0,45)` = **× 1,8182**

🔴 **El margen objetivo puede ser MAYOR a 45%. Nunca menor. El 45% es el piso, no la meta.**

---

## 2. Composición del squad

| Rol | Lane | Seniority | Loaded cost *(100%)* | Buffer | % dedic | **Precio línea** |
|---|---|---|---|---|---|---|
| {{rol}} | {{cuenta/estrategia/contenido/diseño/AV/social}} | {{sr/lead}} | {{loaded}} | {{%}} | {{%}} | **{{= loaded × (1+buffer) × 1,8182 × %dedic}}** |
| | | | | | | |
| | | | | | | |
| | | | | | | |
| **Subtotal capacidad** | | | **{{Σ loaded}}** | | **{{Σ %}} = {{FTE}}** | **{{Σ}}** |

> **Referencia de la base de costo creativa** *(INTERNA — squad blueprint SKY, 2026-07)*:
> Creative Operations Lead **USD 1.250** · Senior Visual Designer **USD 800–927** ·
> Creative Social Media Strategist **USD 800** · Creative Copywritter **CLP 650.000** ·
> Creative Content Creator **USD 327**.
> 🩸 **Todos pendientes de confirmar si son bruto o costo empresa.** Roles de estrategia/cuenta: `[EST]`.

---

## 3. 🎯 El chequeo de utilización — el que casi nadie hace

✅ *La utilización promedio de la industria es **65%** firmwide (75% junior/producción, **33% directores**).*

🔴 **El % de dedicación del blueprint asume 100% de tiempo productivo. No lo es. Nunca lo es.**

```
capacidad_real_consumida  =  % dedicación / 0,65
```

| Rol | % dedic en el papel | **% de capacidad real consumida** | ¿Cabe? |
|---|---|---|---|
| {{rol}} | {{30%}} | **{{≈46%}}** | {{sí/no}} |

🔴 **Regla:** ningún miembro puede superar **100% de capacidad real** sumando **todos** sus engagements.
**Si no cabe: o creces el squad (y sube el precio), o achicas el alcance. No hay tercera opción — salvo quemar
gente, que es destruir el activo que estás vendiendo.**

*(Reconciliar contra la capacidad libre real: `greenhouse-ico` + skills matrix.)*

---

## 4. Arquitectura de cinco líneas

### 4.1 Gobierno/plataforma — 🔴 nunca se descuenta

| Componente | Incluido |
|---|---|
| Acceso al portal *(OTD · FTR · RpA · cycle time · stuck assets, por proyecto, con tendencia)* | ✅ |
| Reportería mensual | ✅ |
| Policy, ledger, seguridad y observabilidad | ✅ |
| Soporte base y operación de plataforma asignada | ✅ |
| **Valor de la capa** | **{{monto}}** |

> 🔴 **Tiene costo operativo real y asignado, y sostiene control, transparencia y switching cost.**
> **Un descuento exige reducir alcance/SLA; nunca declares que gobierno cuesta cero.**

---

### 4.2 Capacidad humana

Corresponde al subtotal del squad dimensionado en §2. Account Lead, dirección, curation, QA, producción y
delivery management viven acá; nunca se imputan a gobierno ni se vuelven a esconder dentro de Studio Credits.

### 4.3 Studio Credits — sólo consumo generativo

| Campo | Valor |
|---|---|
| Estado | {{shadow / piloto aprobado / commercially approved}} |
| Pool/envelope | {{}} |
| Capability scope | {{image/video/audio classes + quality tiers}} |
| `credit_rate_version` | {{}} |
| Evidencia de calibración | {{N runs · p50/p75/p95 · estimate accuracy}} |
| Retry/refund reserve | {{}} |
| Budget approver / cap | {{}} |
| Revenue / costo variable esperado | {{}} / {{}} |

🔴 **No derives esta línea desde una pieza o el precio de lista de un provider.** Requiere shadow ledger,
bandas semánticas versionadas, margen total ≥45% y commercial approval. → `modules/14_STUDIO_CREDITS.md`.

### 4.4 Implementación/IP

| Componente | Milestone/aceptación | Valor |
|---|---|---:|
| Onboarding / Brand Profile | {{}} | {{}} |
| Templates/workflows | {{portable / proprietary / shared}} | {{}} |
| Integración/training | {{}} | {{}} |

### 4.5 Derechos de uso y pass-through — aparte

| Dimensión | Lo que pide el cliente | Multiplicador ⚠️ | Valor |
|---|---|---|---|
| **Canal** | {{orgánico / + pauta / OOH / TV}} | *(pauta: +50–100%)* | {{}} |
| **Territorio** | {{CL / LATAM / global}} | | {{}} |
| **Plazo** | {{campaña / 6m / 12m / perpetuo}} | *(6m: +50–100% · perpetuo: +100–150%)* | {{}} |
| **Exclusividad** | {{no excl. / categoría / buyout}} | *(categoría: 2,0× · buyout: 3,5–10×)* | {{}} |

⚠️ **Los múltiplos son direccionales** *(fuente: creator/UGC/fotografía, no publicidad B2B)*. **Sirven para
estructurar la conversación y defender el número, NO para citarlos como autoridad.**
→ `modules/05_SCOPE_SOW.md` §4 · redacción → `legal-privacy-ip-operator`.

🔴 **Si las bases de una licitación exigen cesión total, no es negociación: es un COSTO. Va al precio.**

---

## 5. El número final

| | Monto | Nota |
|---|---|---|
| **Loaded cost total** | {{}} | 🩸 ¿confirmado con finance? |
| **Buffer** *({{%}})* | {{}} | ¿por qué? {{penalidades / plataforma / brief inmaduro / FX}} |
| **Costo + buffer** | {{}} | |
| 🔴 **PISO** *(÷ 0,55)* | **{{}}** | **Bajo esto no se firma. Es aritmética.** |
| **Capa de gobierno** | {{}} | 🔴 no descontable |
| **Capacidad humana** | {{}} | squad dimensionado; sin doble imputación |
| **Studio Credits** | {{}} | sólo si rate/pool aprobados; no precio por pieza |
| **Implementación/IP** | {{}} | milestone/aceptación |
| **Derechos de uso** | {{}} | |
| 🎯 **Precio de lista** | **{{}}** | Anclado al **valor** y al **comparable correcto** |
| **Margen de negociación** | **{{lista − piso}}** | 🔴 **Se calcula ANTES de la reunión. Nunca durante.** |

---

## 6. Sanity check contra el comparable ✅

**Antes de mandar el número, míralo al lado de lo que el cliente tiene como alternativa:**

| Alternativa | Costo mensual para el cliente | Nuestro precio |
|---|---|---|
| **1 art director in-house (US)** | **USD 7.500 – 13.300** *(loaded)* | {{}} |
| **Equipo in-house de 3 (DTC)** | **USD 20.000 – 30.000** | {{}} |
| **Superside** | **~USD 5.000** + ~1.000 plataforma | {{}} |
| **Freelance senior** | **USD 900 – 1.500/día** | {{}} |

🔴 **Si tu precio se ve "caro" al lado de estos números, el problema no es el precio: es que estabas mirando el
comparable equivocado** *(la agencia digital CL de CLP 600k–2,5M)*. → `modules/09_DISPLACEMENT.md`.

⚠️ **Usa el benchmark del país del comprador.** Los de arriba son **EE.UU.** *(válidos para el ICP Globe)*.
→ ⚠️ [VERIFICAR: loaded cost de un director de arte senior en Chile, con cargas].

---

## 7. Checklist de salida

- [ ] Loaded cost **confirmado con finance** 🩸
- [ ] Buffer **declarado y justificado**
- [ ] Piso **computado** *(no sentido)*
- [ ] Chequeo de **utilización 65%** hecho — el squad **cabe**
- [ ] Margen de negociación **calculado**
- [ ] `margin-health` **en verde** en el cotizador
- [ ] La oferta **NO publica** precio por rol ni por pieza
- [ ] Gobierno **cotizado y marcado no descontable**
- [ ] Cinco líneas económicas **separadas**, aunque alguna sea cero/no aplicable
- [ ] Credits calibrados con shadow data/version, sin pieza/provider como unidad
- [ ] Refund/retry reserve, support incremental y p95 incluidos sin doble imputación
- [ ] Commercial approval confirmado antes de precio público/top-up/rollover/expiry
- [ ] Derechos de uso **cotizados aparte**
- [ ] Supuesto de **FX** declarado *(si es multianual con costos en USD)*
- [ ] **Sanity check contra el comparable correcto** hecho

🔴 **Una casilla sin marcar = el precio no sale.**
