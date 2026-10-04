# Growth Forms · comportamiento de entrada AXIS

Fecha: 2026-10-04. Dirección de implementación autorizada por el operador. Estado de adopción:
**AXIS en `main`; adaptador Greenhouse local optativo; publicación del package y rollout pendientes**.
AXIS incorpora las entradas en `a0c6130` y sincroniza assets en `6fff346`; el código de
`axis-ui-primitives@0.5.0` no constituye una versión instalable publicada.

## Decisión y ownership

AXIS posee presentación/formato portable, input behavior y adapters HTML/React. Growth Forms conserva
schemas, country policy, documentos admitidos, validación autoritativa, consentimiento, Turnstile,
telemetría, cifrado, envíos y delivery. Extiende la decisión de UI compartida y el contrato del motor,
sin sustituir sus render contracts ni introducir React en el web component.

`FormRendererOptions.inputBehaviors` y la propiedad `GreenhouseFormElement.inputBehaviors` aceptan un
factory explícito. En el custom element debe asignarse antes de conectarlo. Sin factory, se conserva
el comportamiento publicado. `createAxisGrowthInputFactory` mapea email, URL, teléfono y national_id CL
por tipo, nunca por heurística de nombre. Number/date y documentos de otros países conservan su ruta.

No hay copia de los formateadores de AXIS ni import relativo al repo hermano dentro del runtime.
La inyección permite probar el código real antes de instalar una versión todavía no publicada.
Después de la release, el punto de composición importa `/input-behavior` y `/input-phone` desde la
versión exacta del package y conecta los factories. Cada renderer distribuido sigue siendo autocontenido.

## Catálogo telefónico y composición

AXIS `/input-phone` exporta `phoneCountries`, `phoneCallingCode` y
`phoneCountryOptions(locale, countries?)`. El catálogo se deriva de `libphonenumber-js/min`:
**245 países y territorios en el corte del 04/10/2026**; el número depende de la versión de sus metadatos.
`Intl.DisplayNames` localiza nombres e `Intl.Collator` los ordena con el locale explícito. Una lista
opcional no vacía, única y soportada limita el selector según decisión del consumidor; nunca se
reconstruye a mano una tabla paralela de prefijos. Runtime consumidor debe soportar estas APIs de Intl.

`PhoneField` recibe país controlado, lista, etiqueta y `onCountryChange`. Para listas amplias,
`countrySearch` activa `Combobox` con mensajes localizados de vacío/inválido y búsqueda por nombre o
prefijo. Sin esa prop conserva `Select`. El país seleccionado debe pertenecer a la lista. El Lab
consume el catálogo completo y compone país/teléfono, correo/URL y RUT/importe por filas; cada fila
se adapta a una columna en móvil sin fijar la altura de las ayudas.

**Growth Forms conserva 18 países en su selector actual**, derivado de `CALLING_CODES` en
`src/lib/growth/forms/validators/phone.ts` a través de `src/growth-forms-renderer/mask.ts`.
El adapter opt-in comparte formato, no reemplaza este catálogo ni instala el `PhoneField` React.
Esos 18 prefijos no constituyen una allowlist de negocio: un número con `+` sigue la validación E.164
existente. Adoptar los 245 requiere mapear explícitamente selección, normalización y validación en
el motor y probar su render contract. El Lab no recibe países desde Growth Forms ni lo actualiza.

## Invariantes

- `display` es texto editable; `value` es string normalizado o null; `ready` nunca significa validado.
- En caso incompleto/inválido se conserva el texto para validación; no se vacía ni se recorta.
- No hay transformación durante IME. Formato al salir, conservando edición/selección nativa.
- Teléfono usa país explícito y metadatos del package; `+` explícito conserva la identidad internacional.
- Correo no tiene máscara ni se cambia de mayúsculas. La política corporativa sigue en el motor.
- El formato RUT no verifica su dígito. URL no constituye validación de SSRF/destino.
- Decimal exacto existe en AXIS, pero no reemplaza el tipo number de Growth Forms automáticamente:
  locale, precisión y moneda requieren contrato de producto; nunca inferirlos de la apariencia.
- Sin cambios a pins, contratos publicados, theme `--ghf-*`, consentimiento ni endpoints.

## Verificación y promoción

Prueba local reproducible (primero compilar primitives en AXIS):
`node scripts/verify-growth-axis-inputs.mjs /ruta/absoluta/axis-design-system`.
El script bundlea el renderer real y los exports compilados del package en una carpeta temporal,
prueba teléfono internacional/exceso de dígitos, correo, RUT, URL, binder DOM, IME/reset/cleanup y elimina
el bundle. No conecta red ni escribe formularios. El script no prueba una instalación publicada.

Antes de activar: publicar e instalar versión exacta, medir bundle real, validar en preview del motor
y en host WordPress/Astro con sus resets/overrides, autofill y AT/dispositivos reales; comprobar mismos
payloads/errores de servidor, consentimiento/Turnstile y eventos sin PII. Promoción por renderer/surface
versionado y rollback a su versión previa. La migración visual a forms.css es otra decisión de adopción;
este slice sólo comparte comportamiento de entrada.
