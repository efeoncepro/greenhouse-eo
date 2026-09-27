# Usar la identidad sonora de Efeonce — Manual de uso

> **Tipo de documento:** Manual de uso / runbook
> **Version:** 1.0
> **Creado:** 2026-09-26 por Claude
> **Ultima actualizacion:** 2026-09-26 por Claude
> **Modulo:** Creative · marca propia de Efeonce (identidad sonora)
> **Ruta en portal:** no aplica — es un sistema de marca; los archivos viven en el bucket público de AXIS
> **Estado:** recomendada, **no canon**; Glitch pendiente
> **Documentacion relacionada:** [Documentación funcional](../../documentation/creative/identidad-sonora-efeonce.md) · [Norma V1](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md) · [ADR](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md) · [Usar la línea gráfica](./usar-linea-grafica-efeonce.md)

## Para qué sirve

Este manual explica cómo ponerle el sonido de Efeonce a una pieza de la marca (video, reel, webinar, lanzamiento,
evento): qué archivo elegir, de dónde bajarlo, cómo calzarlo con la imagen y a qué volumen entregarlo.

**No se usa** en piezas de clientes, en la interfaz de Greenhouse ni en la pantalla de recepción.

## Antes de empezar

- **Confirma que la pieza es de Efeonce.** Si es para un cliente o para el portal, este manual no aplica.
- **Ten claro el destino:** video y redes, o podcast. Define el volumen de entrega.
- **Revisa si la pieza tiene locución.** Define el registro: con voz encima, siempre fondo.
- **Identifica la línea de servicio** si la pieza es de una sola (Growth, Brand, Engine, Voice o Revenue).
- **Recuerda el estado:** es la versión recomendada, no canon. Úsala en piezas propias; antes de pautar con
  presupuesto, confirma con el operador (falta la prueba de reconocimiento sin logo y confirmar licencias).

## Paso a paso

### Paso 1 · Elige el registro

| Si la pieza… | Registro |
|---|---|
| tiene locución, es un webinar o un explicativo | **fondo** (sereno) |
| es un lanzamiento, un post de redes con ritmo o un evento | **energía** (rock) |

Un registro por pieza. Nunca pongas la pieza de energía debajo de alguien hablando.

### Paso 2 · Elige la pieza

| Situación | Archivo | Carpeta del kit |
|---|---|---|
| Cierre de video | reveal; con voz (Brian) si el video no cierra con locución, sin voz si sí | `03-motion` |
| Inicio de video | apertura (termina en el anillo abierto) | `03-motion` |
| Reel, cortinilla o cierre de menos de 2 s | sting | `03-motion` |
| Video con locución o webinar | pieza larga de fondo | `04-piezas-largas` |
| Lanzamiento, redes con ritmo, evento | pieza larga de energía, o el cierre de energía (5,1 s) | `04-piezas-largas` · `05-cierre-energia` |
| Pieza de una sola línea de servicio | logo sonoro o etiqueta con voz de esa línea | `01-logo-sonoro` · `02-etiqueta-voz` |
| Sólo la voz, para montarla tú | voz sin música | `06-voz-sola` |
| Podcast Glitch | **no hay pieza aprobada**: consulta al operador | — |

Cada línea tiene su timbre en la última nota: Growth campana, Brand marimba, Engine FM, Voice eco y Revenue campana
grave (HubSpot y Salesforce usan la misma). Elige el archivo de tu línea; no cambies el timbre tú.

### Paso 3 · Baja el archivo

1. **Página de AXIS** (cuando esté publicada): [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/).
   Escucha cada pieza y descárgala desde ahí.
2. **Bucket público** (siempre disponible):
   [storage.googleapis.com/efeonce-group-axis-public-media/sonic/v1/](https://storage.googleapis.com/efeonce-group-axis-public-media/sonic/v1/)
   - `masters/` → archivos para editar y entregar (en `03-motion`, WAV y MP4 en 16:9 y 9:16).
   - `web/` → MP3, MP4 a 720p y pósters WebP, para vistas previas y la web.
3. **Si eres un agente:** lee el JSON [sonic-brand.json](https://axis.efeonce.org/references/sonic-brand.json) (esquema
   `axis.efeonce-sonic-brand.v1`). Trae la URL, la duración, los LUFS, el pico y el SHA-256 de cada archivo; verifica
   el SHA-256 después de bajar.

Para las animaciones del logo, usa las de `sonic/v1/masters/03-motion`. Las de `motion/logo/v1.1/` siguen con el sonido
anterior.

### Paso 4 · Sincroniza con la imagen

- **Animaciones del logo:** ya vienen sincronizadas. La esfera cae con el encaje de la nave: sting 0,58 s, reveal
  1,87 s, apertura 1,15 s. En el reveal con voz, «Growth» y el acorde caen a 3,05–3,08 s, cuando termina de entrar el
  eslogan. No muevas el audio respecto del video.
- **Deja la cola:** cada animación trae 1 s extra con el cuadro final para que se oiga cómo se apaga el acorde. No la
  cortes.
- **Logo o etiqueta sobre tu propio montaje:** haz coincidir la última nota (la esfera) con el golpe visual principal
  de tu pieza. Es el único golpe: no agregues otro.
- **Pieza larga bajo locución:** ponla unos 15 dB por debajo de la voz.

### Paso 5 · Nivela para el destino

| Destino | Sonoridad | Pico máximo |
|---|---|---|
| Video y redes | −14 LUFS | −1 dBFS |
| Podcast | −16 LUFS | −1 dBFS |

- Nivela **por sonoridad (LUFS), nunca por pico**.
- Nunca comprimas el golpe de la esfera.
- Si trabajas en el repo, el script de masterización lo hace en dos pasadas:

  ```bash
  bash ai-generations/2026-09-26_branding-sonoro/motor/master.sh entrada.wav salida.wav -14
  ```

  El cuarto argumento (`shelf`) es opcional; déjalo vacío salvo indicación del operador.

### Paso 6 · Revisa antes de entregar

- [ ] El registro es uno solo y corresponde (fondo con voz, energía sin voz).
- [ ] La esfera suena una sola vez y cae con el golpe visual.
- [ ] El eslogan, si va, está en inglés y con la voz de Brian.
- [ ] La cola del acorde no quedó cortada.
- [ ] La sonoridad está al objetivo del destino y el pico no pasa de −1 dBFS.
- [ ] No es una pieza de cliente, del portal ni de la pantalla de recepción.

## Qué significan los estados

| Estado | Qué significa para ti |
|---|---|
| **Recomendada** (hoy) | se puede usar en piezas propias de Efeonce; puede cambiar al canonizar |
| **Canon** (futuro) | valores en los tokens de AXIS y animaciones de la línea gráfica con el sonido nuevo |
| **Pendiente** (Glitch) | no hay pieza aprobada; no uses las versiones exploradas |

## Qué no hacer

- Regenerar el logo, la voz o la esfera con una herramienta de IA: usa los archivos del kit.
- Cambiar la melodía, su pausa o el timbre de la línea.
- Cambiar de registro dentro de una pieza.
- Poner la pieza de energía debajo de una locución.
- Comprimir el golpe o subir el volumen «hasta el techo».
- Traducir el eslogan o usar otra voz para decirlo.
- Sonorizar la pantalla de recepción, o usar el sonido en clientes o en la UI de Greenhouse.
- Usar las versiones exploradas de Glitch.

## Problemas comunes

| Problema | Causa probable | Qué hacer |
|---|---|---|
| La página de AXIS no carga | el PR de AXIS #4 aún no se mergea | baja los archivos desde el bucket público |
| La animación del logo suena con el sonido viejo | bajaste de `motion/logo/v1.1/` | usa `sonic/v1/masters/03-motion` |
| Una pieza suena mucho más fuerte o más baja que otra | se niveló por pico | vuelve a nivelar por sonoridad al objetivo del destino |
| Los logos Brand, Voice y Revenue miden cerca de −15 LUFS | el golpe toca el techo de pico y no se comprime | es esperado; no lo comprimas para subirlo |
| La música tapa la voz | usaste energía o la pieza de fondo muy alta | usa fondo, ~15 dB bajo la voz |
| (Agentes) El conector MCP de ElevenLabs falla con `api_key_id_used_as_api_key` | la credencial cargada es el ID de la clave, no la clave | usa ElevenLabs vía fal |
| (Agentes) Stable Audio devuelve un archivo más corto | redondea la duración a segundos enteros | haz la maqueta de duración entera |
| (Agentes) Un trabajo de música en fal vence a los 120 s | espera por defecto de `runFalModel` | sube `pollTimeoutMs`; recupera el trabajo con `recuperar.ts` sin volver a pagar |

## Referencias técnicas

- Norma: [`EFEONCE_SONIC_IDENTITY_V1.md`](../../operations/brand-sonic/EFEONCE_SONIC_IDENTITY_V1.md)
- Decisión: [`EFEONCE_SONIC_IDENTITY_DECISION_V1.md`](../../architecture/EFEONCE_SONIC_IDENTITY_DECISION_V1.md)
- Referencia viva: [axis.efeonce.org/references/sonic-brand](https://axis.efeonce.org/references/sonic-brand/) ·
  [JSON](https://axis.efeonce.org/references/sonic-brand.json) · guía `docs/agent-composition/sonic-brand.md` (repo AXIS)
- Archivos: `gs://efeonce-group-axis-public-media/sonic/v1/`
- Producción: [`ai-generations/2026-09-26_branding-sonoro/LEEME.md`](../../../ai-generations/2026-09-26_branding-sonoro/LEEME.md)
- Movimiento: [lenguaje de movimiento de la órbita](../../operations/brand-graphic-line/EFEONCE_ORBIT_MOTION_LANGUAGE_V1.md)
