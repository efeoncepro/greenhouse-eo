# CDR-006 · CMP-001: BOFU pasa a campaña de conversión, con destino a las landings de servicio

**Estado:** `Accepted` *(alcance reducido a AEO el 2026-09-22)* · **Fecha:** 2026-09-22 · **Decide:** el operador · **Campaña:** CMP-001 «La IA dice de ti»
· **Ámbito:** objetivo, destino, estructura y medición del nivel BOFU.

## Contexto

El [CDR-005](CDR-005-cmp001-embudo-momento-y-accion.md) fijó que cada acción consume el output de la anterior, y
puso BOFU apuntando al panel competitivo. **El operador cambia el destino:** BOFU va **directo a las landings de
servicio** y la campaña pasa de consideración a **conversión**.

Eso no es sólo cambiar una URL. Cambia el objetivo de puja, el evento que se optimiza, la audiencia, el copy y
lo que hay que tener medido antes de gastar el primer peso.

## Destinos — verificados en vivo el 2026-09-22

⚠️ **Cómo se verificó, porque importa:** la primera pasada se hizo con `curl` y **fue inútil** — estas landings
montan sus formularios y su agendamiento **por JavaScript**, así que el HTML inicial no los contiene. Concluyó
«no hay formularios HubSpot» y era falso. **Auditar una landing de conversión exige un navegador real.**

| Línea | URL | Canonical | Formulario (Growth Form) | Agendamiento |
|---|---|---|---|---|
| **SEO** | `/servicios/posicionamiento-seo/` | ✅ propia | **contacto**: nombre, email, empresa, sitio, **contexto**, rol, consentimiento | pop-up por evento + `Hablemos` → `/contacto` |
| **AEO** | `/servicios/aeo/` | 🔴 **apunta a `/aeo-2/`** | **diagnóstico**: nombre, email, marca, sitio, **competidor principal** | `meetings.hubspot.com/efeoncepro/agenda-discovery` |
| **AEO** | `/aeo-2/` | ✅ propia | idem | idem |

🔴 **Las dos líneas NO convierten con lo mismo.** El Growth Form de AEO pide *competidor principal* — alimenta el
grader, es la oferta de diagnóstico. El de SEO pide *contexto, rol y consentimiento* — es un lead comercial.

## 🔴 Dos bloqueos que se resuelven ANTES de pautar

### B1 · La landing AEO no es canónica de sí misma

`/servicios/aeo/` declara `canonical → /aeo-2/`. Pautar a la primera manda **tráfico pagado a una URL que le
dice a Google que la buena es otra**: no rompe la conversión, pero contradice la señal, parte la atribución
entre dos rutas y ensucia el reporting del propio servicio que estamos vendiendo.

**Salidas:** (a) corregir el canonical para que `/servicios/aeo/` sea canónica —coherente con `/servicios/…` del
resto del catálogo—, o (b) pautar a `/aeo-2/`, asumiendo un slug sin significado en el anuncio. **Es decisión del
operador; el trabajo es del carril de sitio público.**

### B2 · La landing AEO ofrece DOS conversiones de etapas distintas, y la que cierra la página es la de TOFU

**Corrección de la primera versión de este CDR**, que afirmó que la acción de mayor compromiso no existía: sí
existe — `meetings.hubspot.com/efeoncepro/agenda-discovery`. El error vino de auditar con `curl`.

Lo que sí es un problema: la landing ofrece **las dos** —diagnóstico gratis (TOFU) y agenda discovery (BOFU)— y
**la sección de cierre es el diagnóstico**. Un BOFU que aterriza sin dirigir cae en la oferta de la etapa que el
usuario ya pasó.

**Regla del embudo: cada etapa pide más compromiso que la anterior.** No falta la acción; **falta dirigir a
ella**: ancla o parámetro que lleve el clic BOFU a la agenda y no al formulario de diagnóstico.

## Decisión

### 1. Dos líneas, no una

BOFU se parte por servicio, porque el destino y la intención son distintos:

| | Destino | Momento del usuario | Acción |
|---|---|---|---|
| **BOFU-SEO** | landing SEO | sabe que su orgánico cae y quiere que alguien lo opere | Growth Form de contacto (contexto + rol) |
| **BOFU-AEO** | landing AEO (canónica) | sabe que no lo citan y quiere corregirlo | **agenda discovery**, no el diagnóstico |

🔴 **El evento de conversión se define POR LÍNEA, no para la campaña:** un envío del Growth Form de SEO y una
reunión agendada en AEO no son la misma acción ni valen lo mismo. Contarlas juntas haría que el optimizador
persiga la más barata.

### 2. El objetivo es conversión, y eso obliga a definir el evento

**No se pauta a conversión sin el evento medido.** Antes del primer peso:

- **Qué cuenta como conversión:** el envío del formulario HubSpot de la landing, no el clic ni la sesión.
- **Cómo se atribuye:** `utm_campaign` debe sobrevivir del clic al contacto y del contacto al deal. Ese puente
  es trabajo pendiente conocido (**`TASK-1886`**, bridge HubSpot click → contact → deal) y **es prerrequisito de
  esta campaña**, no un extra.
- **Convención UTM:** 🔴 **no existe escrita.** La landing SEO ya trae una de fallback
  (`utm_source=landing_posicionamiento_seo · utm_medium=web · utm_campaign=task_1343_growth_form_fallback`),
  que es de otro trabajo y no sirve como estándar. Hay que fijarla en este CDR o en el plan de tracking.

### 3. El copy de BOFU cambia de promesa

El BOFU vigente —«El número primero. Después la propuesta.» → `Habla con quien lo hace` · *Con tu panel en
pantalla*— está construido para llevar **al panel**. Con destino a la landing de servicio, la promesa del
anuncio y la de la página tienen que coincidir: **si el ad promete un panel y la landing ofrece contratar un
servicio, la conversión cae por incoherencia de mensaje**, no por creatividad.

El copy nuevo se escribe **después** de resolver B2, porque la acción que ofrece la landing determina el CTA.

### 4. Lo que NO cambia

- Registro documental y palanca `manos` — el mensaje sigue siendo sobre nosotros.
- El concepto completo de seis voces (entrada · titular · remate + beneficio · CTA · descriptor).
- Los tres ratios (4:5 · 9:16 · 16:9) con plates nativos.
- Las reglas de claims de `SOURCES.md` y la prueba de CDR-005 §5b: **en el ad va el dato que abre los ojos**.

## Cómo se verifica

1. La URL de destino de cada línea es canónica de sí misma.
2. La landing ofrece una acción de **mayor** compromiso que la etapa anterior.
3. El evento de conversión está definido y el `utm_campaign` llega al deal en HubSpot.
4. La promesa del ad y la de la landing son la misma.

## Dependencias

- **`TASK-1886`** — bridge `utm_campaign` HubSpot (click → contact → deal). **Prerrequisito.**
- Carril de sitio público — corrección del canonical AEO (B1) y la acción de conversión BOFU (B2).
- [`CDR-001`](CDR-001-cmp001-always-on-q4-2026.md) — ventana, permisos y derechos ya resueltos; el media plan y
  el plan de tracking siguen pendientes y este CDR los condiciona.


## Delta 2026-09-22 — alcance reducido a AEO, y B1/B2 resueltos

**Decisión del operador: BOFU se hace sólo con la página de AEO.** La línea SEO queda fuera de este alcance;
si vuelve, hereda este mismo contrato.

**B1 resuelto — el destino es `https://efeoncepro.com/aeo-2/`**, la URL canónica. Pautar a `/servicios/aeo/`
sería mandar tráfico pagado a una página que declara que la buena es otra: parte la atribución del servicio que
se está vendiendo. El costo es un slug sin significado, que en un anuncio viaja dentro del botón y casi no se
ve. **Si el canonical se corrige más adelante, el destino se mueve a `/servicios/aeo/` sin tocar el creativo.**

**B2 resuelto por el copy, no por la landing.** La página ofrece diagnóstico (TOFU) y agenda discovery (BOFU),
y su sección de cierre es el diagnóstico. En vez de pedir un cambio de página, **el anuncio nombra la acción
que queremos**: el CTA dice `Agenda tu discovery` y el descriptor `AEO para LatAm · 30 minutos`. Quien llega
sabe a qué va antes de aterrizar.

**El mensaje sale de la propia landing**, que es lo que evita la incoherencia que este CDR advertía: una de sus
secciones dice *«Un tablero te muestra el problema. Cerrarlo es otra cosa»* — el paso exacto después del panel
de MOFU.

| | |
|---|---|
| entrada | El tablero ya te mostró el problema. |
| **titular** | **Cerrarlo es otra cosa.** |
| remate | Eso es lo que **operamos**. |
| beneficio | Método, no improvisación: los seis motores, cada mes. |
| CTA · descriptor | `Agenda tu discovery` · AEO para LatAm · 30 minutos |

**URL con tracking** (convención del media plan):

```
https://efeoncepro.com/aeo-2/?utm_source=meta&utm_medium=paid_social
  &utm_campaign=cmp001_bofu_aeo&utm_content=<pieza>_<ratio>&utm_term=retarget_mofu
```

⚠️ **Los ids internos de las piezas siguen diciendo `b2-primero-el-numero`**, del copy anterior. No se renombran
porque el id ancla el `layout.json` y el `subjectProtection` medido; **el id es interno y no viaja al anuncio.**
