# CDR-006 · CMP-001: BOFU pasa a campaña de conversión, con destino a las landings de servicio

**Estado:** `Proposed` · **Fecha:** 2026-09-22 · **Decide:** el operador · **Campaña:** CMP-001 «La IA dice de ti»
· **Ámbito:** objetivo, destino, estructura y medición del nivel BOFU.

## Contexto

El [CDR-005](CDR-005-cmp001-embudo-momento-y-accion.md) fijó que cada acción consume el output de la anterior, y
puso BOFU apuntando al panel competitivo. **El operador cambia el destino:** BOFU va **directo a las landings de
servicio** y la campaña pasa de consideración a **conversión**.

Eso no es sólo cambiar una URL. Cambia el objetivo de puja, el evento que se optimiza, la audiencia, el copy y
lo que hay que tener medido antes de gastar el primer peso.

## Destinos — verificados en vivo el 2026-09-22

| Línea | URL | HTTP | Canonical | Conversión disponible **hoy** |
|---|---|---|---|---|
| **SEO** | `/servicios/posicionamiento-seo/` | 200 | ✅ propia | ancla `#contacto` + 2 formularios HubSpot |
| **AEO** | `/servicios/aeo/` | 200 | 🔴 **apunta a `/aeo-2/`** | ancla `#diagnostico` |
| **AEO** | `/aeo-2/` | 200 | ✅ propia | ancla `#diagnostico` |

## 🔴 Dos bloqueos que se resuelven ANTES de pautar

### B1 · La landing AEO no es canónica de sí misma

`/servicios/aeo/` declara `canonical → /aeo-2/`. Pautar a la primera manda **tráfico pagado a una URL que le
dice a Google que la buena es otra**: no rompe la conversión, pero contradice la señal, parte la atribución
entre dos rutas y ensucia el reporting del propio servicio que estamos vendiendo.

**Salidas:** (a) corregir el canonical para que `/servicios/aeo/` sea canónica —coherente con `/servicios/…` del
resto del catálogo—, o (b) pautar a `/aeo-2/`, asumiendo un slug sin significado en el anuncio. **Es decisión del
operador; el trabajo es del carril de sitio público.**

### B2 · La landing AEO sólo ofrece la conversión de TOFU

Su última sección es **«Empieza con tu diagnóstico gratis»**, que es exactamente el CTA de TOFU. Un BOFU que
aterriza ahí **le pide a quien ya recorrió el embudo lo mismo que al que recién llega**, y aplana la progresión
que el CDR-005 vino a construir.

**Regla del embudo: cada etapa pide más compromiso que la anterior.** BOFU necesita una acción de mayor
compromiso —reunión agendada, solicitud de propuesta, contacto con alcance— disponible en la landing. Hoy no
existe en AEO; en SEO sí (`#contacto`).

## Decisión

### 1. Dos líneas, no una

BOFU se parte por servicio, porque el destino y la intención son distintos:

| | Destino | Momento del usuario | Acción |
|---|---|---|---|
| **BOFU-SEO** | landing SEO | sabe que su orgánico cae y quiere que alguien lo opere | contacto con alcance |
| **BOFU-AEO** | landing AEO (canónica) | sabe que no lo citan y quiere corregirlo | *(pendiente de B2)* |

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
