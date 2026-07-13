# 12 · La implementación — como argumento de venta y como negocio

> **La implementación es donde está el margen (capa 2) y es el argumento con el que se gana la licencia
> (capa 1).** Pero **no es el negocio**: el negocio es lo que viene después (capa 3).
> Un cliente implementado y no gestionado **se te evapora en 60 días**. → `modules/03_MOTOR_LIBRO.md`.

---

## 1. Por qué la implementación gana la licencia

En mid-market y enterprise **nadie compra un CRM: compran salir del problema en el que están.**
La licencia es la consecuencia de haber ganado el argumento de **cómo se sale**.

Y el arbitraje lo hace concreto: ✅ **HubSpot ya le va a cobrar $3.000-$7.000 de onboarding obligatorio.**
La pregunta no es si va a pagar por arrancar — es **quién lo va a arrancar**. → `modules/11` § 2.

**Tu diferenciador real, y no es genérico:**
- **Kortex** — deployment programático sobre HubSpot. No configuras a mano: despliegas.
- **Greenhouse** — el dashboard donde el cliente ve su operación después.
- **Dogfooding** — Efeonce **corre su propia operación** sobre HubSpot. *"Le muestro nuestro portal real,
  no una demo."* Eso no lo puede copiar un competidor en una reunión.

---

## 2. Las fases — y la victoria visible a los 30 días

```
F0 · DESCUBRIMIENTO TÉCNICO        (1-2 sem)  Modelo de datos · integraciones · límites · lo que NO se puede
F1 · ARQUITECTURA                  (1-2 sem)  Objetos · propiedades · pipelines · permisos · convenciones
F2 · MIGRACIÓN DE DATOS            (2-6 sem)  Limpieza · dedup · mapeo · carga · validación
F3 · AUTOMATIZACIÓN Y REPORTING    (2-4 sem)  Workflows · secuencias · dashboards
F4 · INTEGRACIONES                 (2-6 sem)  ERP · facturación · producto · lo custom
F5 · ADOPCIÓN                      (2-4 sem)  Training por rol · hypercare 30 días
F6 · HANDOFF A MANAGED OPS         (1 sem)   🔴 NO ES OPCIONAL. Es el negocio.
```

🎯 **Regla de oro: una victoria visible a los 30 días.** El champion necesita algo que mostrar antes de que
el proyecto se ponga aburrido. *(Un dashboard que el CEO abre. Un reporte que antes tomaba tres días.)*
**Un big bang de seis meses sin victorias intermedias es un champion quemado.**

---

## 3. Migraciones desde Salesforce / Marketo

### Duración ⚠️ (consenso de implementadores; ❌ **no hay dato auditado**)
| Perfil | Duración |
|---|---|
| <10 usuarios, básico | 1-2 semanas |
| Mid-market con custom objects + automatizaciones | **4-8 semanas** |
| **Enterprise 100+ usuarios, custom objects, múltiples integraciones** | **16-24 semanas** |
| Con Apex complejo | 3-6 meses |

### Costo ⚠️
Rango **$25.000-$150.000+**. Mid-market con 3-4 integraciones: **$40.000-$75.000**
(migración de datos + config + training + 30 días de hypercare).
✅ **Más el onboarding obligatorio de HubSpot** ($1.500-$7.000).

### 🔴 Qué se rompe — **dilo tú antes de que lo descubran**
1. **Apex triggers, managed packages, Visualforce.** **No migran.** Se reescriben como workflows o se pierden.
2. **CPQ.** Si tienen Salesforce CPQ en producción, es **un proyecto aparte** y potencialmente un dealbreaker.
3. **Field mappings**: el límite es **500 por objeto** ✅.
4. **Reportes históricos y forecasting multinivel.** Se rehacen.
5. **Integraciones custom vía API de Salesforce.** Todas se reescriben.
6. **Los datos sucios.** Migrar basura a HubSpot te da basura más cara. **Cotiza la limpieza o no migres.**

> **Ponerlo en el SOW no es defensivo: es lo que te salva del churn en el mes ocho.**
> Y el churn te corta la comisión ✅ y te mata el tier.

❌ **Tasa de fracaso de migraciones SF→HubSpot: no existe dato público confiable. No inventes uno.**

### La estadística que sí puedes usar — a tu favor
⚠️ Sobre proyectos CRM en general: la **baja adopción explica ~38% de los fracasos**; change management 22%;
calidad de datos 18%. **Más del 75% de los fracasos son de personas y proceso, no de tecnología.**

> *"El 38% de los fracasos de CRM son por **adopción**. Por eso la fase 5 no es un extra: es la fase que
> decide si esto funcionó."*

---

## 4. Time-to-value — la promesa que se vende y hay que cumplir

**Lo que puedes prometer honestamente:**
- Una **victoria visible a los 30 días**.
- Un **CRM operativo** (no perfecto) al final de F3.
- **Adopción medida**, no asumida. *(El caso publicado: 48% → 94% en 60 días ⚠️ — fuente interesada,
  preséntalo como caso, no como benchmark.)*

**Lo que NO puedes prometer:**
- ❌ Un ranking en un LLM.
- ❌ Una flota de agentes de IA (**solo tres Breeze Agents están en GA** ✅).
- ❌ Paridad de features con lo que dejaron atrás (**no la va a haber, y está bien** — dilo).

---

## 5. El handoff a Managed Ops — la fase que casi todos se saltan

🔴 **F6 no es opcional. Es donde la implementación deja de ser un proyecto y se vuelve un negocio.**

**Qué tiene que quedar armado el día del handoff:**

| Pieza | Por qué |
|---|---|
| **Acceso de partner admin activo** | ✅ **Sin acceso no hay acción; sin acción no hay puntos managed.** El acceso **es** el activo |
| **La cadencia de 45 días agendada** | Los puntos managed **expiran a los 60**. Deja el calendario puesto |
| **El primer QBR agendado** | No lo va a pedir el cliente. Y cuando llame, será para cancelar |
| **La línea base de adopción medida** | Sin baseline, el QBR no tiene nada que mostrar |
| **El mapa de expansión** | Qué Hub le falta y cuál es la señal que lo va a disparar → `modules/03` § 5 |

> **Implementar y soltar es el error más caro de la práctica.** El cliente sigue pagando, tú sigues sin
> puntos, y **bajo Best Partner Wins otro partner puede firmarle un POI mañana.**

---

## 6. Anti-patrones

| Anti-patrón | Costo |
|---|---|
| **Implementar y soltar** | Cero puntos managed a los 60 días. Y territorio abierto para otro partner |
| **Migrar datos sucios** | Basura más cara. Y la culpa te la llevas tú |
| **Prometer paridad de features con Salesforce** | No la va a haber. **Dilo antes, no después** |
| **Big bang sin victorias intermedias** | El champion se quema y el proyecto pierde su patrocinador |
| **No poner los límites en el SOW** | Churn en el mes ocho → comisión cortada → tier en riesgo |
| **Saltarse la fase de adopción** | Es el **38% de los fracasos** de CRM. Es también tu mejor argumento de venta — **no lo traiciones en el delivery** |
| **Cotizar la migración sin auditar el origen** | Los custom objects, Apex y CPQ del cliente **cambian el proyecto por completo** |
