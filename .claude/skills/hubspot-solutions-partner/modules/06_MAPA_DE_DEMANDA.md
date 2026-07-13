# 06 · Mapa de demanda — el método, no el país

> **Efeonce vende a todo el mundo, segmentado por mercados.** Por eso el país es **dato**, no doctrina.
> Este módulo es el **método reproducible** para leer cualquier mercado en ~1 hora.
> Los perfiles ya leídos viven en `markets/`. Cuando entres a un mercado nuevo, corres esto y agregas el perfil.

---

## 0. Por qué esto existe — la evidencia que lo obligó

Semrush, volumen mensual de búsqueda (2026-07-13):

| Keyword | 🇨🇱 Chile | 🇲🇽 México |
|---|---|---|
| `hubspot partner` | **20** | 30 |
| `agencia hubspot` | 20 | 20 |
| `crm para empresas` | **20** | **1.600** |
| `software crm` | 140 | 720 |
| `automatizacion de marketing` | 20 | 210 |

> **Mismo producto. Misma marca. Canal opuesto.**
> En Chile, rankear #1 en `hubspot partner chile` te da **20 impresiones al mes**. Una estrategia de
> contenidos bottom-funnel ahí es **plata quemada**. En México la demanda del **problema** sí existe y ahí
> el inbound sí paga.

**Un playbook global monolítico te haría hacer exactamente lo contrario de lo correcto en cada país.**

---

## 1. Las seis lentes — el método

Corre las seis. En ese orden. Toma ~1 hora por mercado.

### Lente 1 · Demanda de categoría (¿te buscan?)
**Herramienta:** Semrush, base del país.
**Qué corres:** `phrase_these` con el set canónico:
```
hubspot; hubspot partner; agencia hubspot; implementacion hubspot; consultor hubspot;
hubspot precio; hubspot vs salesforce; crm para empresas; software crm; mejor crm;
automatizacion de marketing; crm b2b
```
**Cómo se lee:**

| Volumen de `hubspot partner` + `agencia hubspot` | Veredicto |
|---|---|
| **< 100/mes combinado** | ❌ **No hay demanda de categoría.** El inbound bottom-funnel es plata quemada |
| 100-500 | ⚠️ Marginal. Solo si ya rankeas por otra cosa |
| > 500 | ✅ Hay juego inbound de categoría |

**Y por separado, la demanda de PROBLEMA** (`crm para empresas`, `software crm`): si el problema se busca
aunque la marca no, **hay inbound — pero entrando por el problema, no por HubSpot.**

### Lente 2 · Densidad de partners (¿con quién compites?)
- ¿Cuántos Solutions Partners hay en el directorio de HubSpot para ese país?
- ¿Cuántos son Platinum/Diamond/Elite? *(Los Gold son tu competencia directa; los Elite juegan otro juego.)*
- ¿Quién rankea para las pocas keywords que sí tienen volumen? (`phrase_organic`)
- 🔴 **Este es el análisis competitivo que `docs/context/15_*` NO tiene.** Es un hueco de inteligencia.

### Lente 3 · Presencia de HubSpot (¿tienes co-selling?)
- ¿Hay equipo local? ¿Growth Specialists que hablen el idioma?
- ¿El mercado califica como **growth market** (multiplicador ×2)? ✅ **LATAM sí.**
  ❌ La lista oficial no está publicada — **pídesela al PDM por escrito.**
- ¿Hay eventos, PUGs, co-marketing en ese mercado?
- **Sin presencia local de HubSpot, el partner matching vale poco ahí.**

### Lente 4 · Idioma y registro comercial
- ¿En qué idioma se compra? *(No en qué idioma se habla — en qué idioma se firma un contrato de software.)*
- ¿El registro es de **tuteo** o **de usted**? En cliente enterprise LATAM: **formal**.
  → `feedback_tender_formal_register`.
- ⚠️ **Tu listing del directorio solo está en español.** Si vendes a APAC, EMEA y Norteamérica, eso es una
  vitrina cerrada. → `modules/09_INBOUND_DEMANDA.md`.

### Lente 5 · Moneda y sensibilidad de precio
- ¿HubSpot cotiza en USD o en moneda local en ese mercado?
- ¿Cuál es el TCO **relativo** al costo de un FTE local? 🎯 **Esta es la lente que más cambia el pitch:**
  el argumento *"HubSpot te ahorra un admin de $110k/año"* es demoledor en EEUU y **mucho más débil** donde
  un admin cuesta $25k. **En mercados de salario bajo, el eje del TCO se debilita y el eje de adopción y
  velocidad se fortalece.**
- ¿Compite Odoo u otro ERP local barato? *(En Chile: 32 partners certificados de Odoo ⚠️.)*

### Lente 6 · Marco de datos — trigger **y** dealbreaker
- ¿Hay una ley nueva de datos personales entrando en vigor? → **trigger de venta con fecha impuesta.**
- 🔴 **¿Exige residencia local de datos?** → ✅ **HubSpot no tiene datacenter en LATAM.** **Es un descalificador.**
- **El trigger y el dealbreaker viven en la misma ley. Averigua cuál te toca antes de invertir en el deal.**
- → `legal-privacy-ip-operator` para verificar vigencia y alcance. **No lo cites de memoria.**

---

## 2. La matriz de decisión de canal

Cruza **Lente 1** (demanda) con **Lente 3** (presencia de HubSpot):

| | **HubSpot con presencia local** | **HubSpot sin presencia local** |
|---|---|---|
| **Hay demanda de categoría** | 🟢 **Inbound + partner matching + co-marketing.** El mercado fácil | 🟡 **Inbound puro.** Contenidos + directorio. Sin apoyo de canal |
| **No hay demanda de categoría** | 🟡 **Partner-sourced + outbound + AEO.** El directorio y el matching *son* el canal. **← Chile** | 🔴 **Outbound puro + base instalada.** El más caro. Solo con cuña diferenciada |

**Y en TODOS los cuadrantes, siempre:**
- ✅ **La base instalada** de HubSpot es territorio vendible (deal-based model) → `modules/08`
- ✅ **La cuña AEO** funciona incluso donde no hay búsqueda, porque **el dolor existe igual** → `modules/07`
- ✅ **Tu propia cartera** es el primer mercado, siempre → `modules/03` § 5

---

## 3. Formato del perfil de mercado

Cada perfil en `markets/<CC>.md`. **Fechado.** Se refresca cuando entras en serio o cada 12 meses.

```markdown
# <País> — perfil de mercado · as-of YYYY-MM-DD

## Veredicto en una línea
[Qué canal funciona y cuál es plata quemada. Nada más.]

## 1. Demanda (Semrush, base <cc>)
[Tabla de keywords + volumen]
Categoría: [SÍ/NO]  ·  Problema: [SÍ/NO]

## 2. Partners competidores
[Cuántos, qué tiers, quién rankea]

## 3. Presencia de HubSpot
Growth market: [SÍ/NO — ×2]  ·  Equipo local: [SÍ/NO]  ·  Partner matching útil: [SÍ/NO]

## 4. Idioma y registro
## 5. Moneda y sensibilidad de precio
Costo de un admin de CRM local: [$X] → [el eje TCO es fuerte/débil acá]

## 6. Marco de datos
Trigger: [...]  ·  🔴 ¿Exige residencia local? [SÍ = DESCALIFICADOR]

## Canal recomendado
[Del cuadrante de la matriz]

## Lo que NO hacer acá
[Explícito. Es la parte más valiosa del perfil.]
```

---

## 4. Anti-patrones

| Anti-patrón | Por qué |
|---|---|
| **Aplicar el playbook de un mercado a otro** | Chile y México tienen el **canal opuesto** con el mismo producto |
| **Hacer contenidos bottom-funnel sin correr la Lente 1** | 20 búsquedas al mes. Es dinero prendido fuego |
| **Asumir que un mercado grande = demanda grande** | Brasil es enorme y **podría exigir residencia de datos** — que es un descalificador, no una oportunidad |
| **Usar el argumento de TCO del admin en mercados de salario bajo** | Si un admin cuesta $25k, tu argumento vale menos de la mitad. **Cambia al eje de adopción** |
| **Hardcodear un país en la skill** | El mercado es **dato**. El método es la doctrina. Un perfil nuevo se agrega, no se reescribe la skill |
| **Confiar en un perfil viejo** | Los perfiles llevan `as-of` porque **caducan** |
