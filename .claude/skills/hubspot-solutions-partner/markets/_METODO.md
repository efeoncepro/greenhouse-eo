# Método — cómo se lee un mercado nuevo

> **El mercado es DATO. El método es la doctrina.**
> Efeonce vende a todo el mundo, segmentado por mercados. Por eso el país nunca se hardcodea en la skill:
> se corre este método (~1 hora) y se agrega un perfil acá.
>
> Doctrina completa: `modules/06_MAPA_DE_DEMANDA.md`.

---

## Por qué existe

| Keyword | 🇨🇱 CL | 🇲🇽 MX |
|---|---|---|
| `crm para empresas` | **20** | **1.600** |

**Mismo producto. Misma marca. Canal opuesto.**
Un playbook global monolítico te haría hacer contenidos en Chile (donde nadie busca) y outbound en México
(donde 1.600 personas al mes buscan el problema que resuelves). **Exactamente lo contrario de lo correcto.**

---

## Las seis lentes — córrelas en orden

### 1 · Demanda (¿te buscan?)
Semrush, base del país, `phrase_these`:
```
hubspot; hubspot partner; agencia hubspot; implementacion hubspot; consultor hubspot;
hubspot precio; hubspot vs salesforce; crm para empresas; software crm; mejor crm;
automatizacion de marketing; crm b2b
```
| `hubspot partner` + `agencia hubspot` | Veredicto |
|---|---|
| **< 100/mes** | ❌ **Sin demanda de categoría.** El inbound bottom-funnel es plata quemada |
| 100-500 | ⚠️ Marginal |
| > 500 | ✅ Hay juego |

**Y aparte, la demanda de PROBLEMA** (`crm para empresas`, `software crm`): si el problema se busca aunque la
marca no → **hay inbound, entrando por el problema.** *(Es el caso de México.)*

⚠️ **No confundas volumen de marca con demanda.** `hubspot` tiene 14.800 en Chile: son usuarios buscando
el login, no compradores.

### 2 · Partners competidores
Cuántos hay en el directorio · qué tiers · quién rankea para las keywords con volumen (`phrase_organic`).
Los de tu mismo tier son la competencia directa; los Platinum+ juegan otro juego (acreditaciones + prioridad
en el matching).

### 3 · Presencia de HubSpot
¿Growth market (**×2**)? ¿Equipo local? ¿Growth Specialists? ¿Eventos?
**Sin presencia local, el partner matching vale poco ahí.**
✅ LATAM es growth market. ✅ **LATAM lo es** (confirmado por el operador). HubSpot no publica la lista, pero el hecho está establecido.

### 4 · Idioma y registro
En qué idioma **se firma un contrato de software** (no en qué idioma se habla).
Enterprise LATAM → **formal, de usted**.
⚠️ **Un listing en un solo idioma es una vitrina cerrada** para los otros mercados que declaras servir.

### 5 · Moneda y sensibilidad de precio
🎯 **La lente que más cambia el pitch:** ¿cuánto cuesta un admin de CRM local?
*"HubSpot te ahorra un admin de USD 110k/año"* es demoledor en EEUU y **débil donde un admin cuesta USD 25k**.
**En mercados de salario bajo: cambia el eje del TCO al eje de adopción y velocidad.**
¿Compite un ERP local barato? *(Chile: 32 partners de Odoo.)*

### 6 · Marco de datos — trigger **y** dealbreaker
¿Ley nueva de datos entrando en vigor? → **trigger con fecha impuesta por el Estado.**
🔴 **¿Exige residencia local?** → ✅ **HubSpot no tiene datacenter en LATAM. Es un descalificador.**
**El trigger y el dealbreaker viven en la misma ley.** Averigua cuál te toca **antes** de invertir.
→ `legal-privacy-ip-operator`. **Nunca de memoria.**

---

## La matriz de canal

| | **HubSpot con presencia local** | **Sin presencia local** |
|---|---|---|
| **Con demanda de categoría** | 🟢 Inbound + matching + co-marketing | 🟡 Inbound puro |
| **Sin demanda de categoría** | 🟡 **Partner-sourced + outbound + AEO** ← Chile | 🔴 Outbound puro + base instalada |

**En todos los cuadrantes, siempre:** tu propia cartera primero · la base instalada es territorio ✅ ·
la cuña AEO funciona aunque no haya búsqueda, **porque el dolor existe igual**.

---

## Plantilla del perfil

```markdown
# <País> — perfil de mercado · as-of YYYY-MM-DD

## Veredicto en una línea
[Qué canal funciona y cuál es plata quemada. Nada más.]

## 1. Demanda (Semrush, base <cc>)      Categoría: [SÍ/NO] · Problema: [SÍ/NO]
## 2. Partners competidores
## 3. Presencia de HubSpot               Growth market: [SÍ/NO ×2] · Matching útil: [SÍ/NO]
## 4. Idioma y registro
## 5. Moneda y sensibilidad              Costo de un admin local: [$X] → eje TCO [fuerte/débil]
## 6. Marco de datos                     Trigger: [...] · 🔴 ¿Residencia local? [SÍ = DESCALIFICADOR]
## 7. Canal recomendado                  [Del cuadrante]
## 8. 🔴 Lo que NO hacer acá             [Explícito. La parte más valiosa del perfil.]
## 9. Pendientes
```

---

## Perfiles existentes

| Mercado | Veredicto | Archivo |
|---|---|---|
| 🇨🇱 **Chile** | 🔴 Sin demanda de categoría **ni de problema**. Inbound = plata quemada | `CL.md` |
| 🇲🇽 **México** | ✅ **Demanda de problema real** (80× Chile). Híbrido inbound + outbound | `MX.md` |
| 🇨🇴 Colombia | ⬜ Pendiente *(hay oficina en Bogotá)* | — |
| 🇵🇪 Perú | ⬜ Pendiente | — |
| 🇺🇸 EEUU | ⬜ Pendiente *(mercado grande, saturado de partners Elite; cambia el battlecard **y** el eje del TCO — ahí sí funciona el argumento del admin)* | — |

**Regla:** un perfil **caduca**. Lleva `as-of` y se refresca al entrar en serio a ese mercado, o cada 12 meses.
