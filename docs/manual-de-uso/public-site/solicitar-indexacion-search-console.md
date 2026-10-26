# Solicitar la indexación de una URL en Search Console

> **Tipo de documento:** Manual de uso
> **Version:** 1.0
> **Creado:** 2026-10-26 por Claude (sesión del blog y Search Console)
> **Ultima actualizacion:** 2026-10-26 por Claude
> **Documentacion tecnica:** [`scripts/public-website/gsc-request-indexing.mjs`](../../../scripts/public-website/gsc-request-indexing.mjs) ·
> [capacidades de la API de Search Console](../../../.claude/skills/seo-aeo/references/google-search-console-api-indexing.md) ·
> [publicación agéntica de un post](../../../.claude/skills/efeonce-public-site-wordpress/references/agentic-blogpost-end-to-end.md)

## Para qué sirve

Pedirle a Google que vuelva a rastrear una página de `efeoncepro.com` después de publicarla o cambiarla, con el mismo
botón «Solicitar indexación» que usa una persona en Search Console.

No hay otra vía:

- La API de Search Console no tiene esa operación. Su inspección de URL sólo lee lo que Google ya tiene.
- La Indexing API sólo acepta ofertas de empleo (`JobPosting`) y transmisiones en vivo (`BroadcastEvent`). No sirve para
  artículos ni landings.

Pedirla no garantiza que Google indexe la página ni cuándo. Sirve para que la vea antes.

## Antes de empezar

- **Una persona con acceso a la propiedad** `sc-domain:efeoncepro.com` inicia la sesión una vez, en un Chrome dedicado.
  El runner nunca escribe correos, contraseñas ni códigos.
- **El cupo de Google es de unas 10 solicitudes por día y propiedad.** El runner no deja pasar de 10 en el mismo día
  (UTC), contando su propio registro, y se detiene si Search Console avisa que se agotó.
- **Pide sólo lo que cambió.** Por defecto el runner sólo pide la indexación cuando hace falta (ver abajo).

## Paso a paso

1. **Abre el Chrome dedicado:**

   ```bash
   pnpm public-website:gsc-index launch
   ```

   Abre Google Chrome con un perfil propio (`~/.efeonce/gsc-chrome-profile`, fuera del repo) y un puerto de control que
   sólo escucha en `127.0.0.1:9333`. No es tu Chrome de todos los días: sus sesiones y cookies están aparte.

2. **La primera vez, inicia sesión en esa ventana.** Si no hay sesión, Search Console muestra su página de
   presentación. Haz clic en «Empezar ahora» e inicia sesión con la cuenta de `efeoncepro.com` que tiene acceso a la
   propiedad. Si ya estás en otra cuenta, cámbiala en la esquina superior derecha. La sesión queda guardada en el perfil
   para las próximas veces.

3. **Inspecciona primero, sin pedir nada:**

   ```bash
   pnpm public-website:gsc-index request https://efeoncepro.com/<ruta>/ [más URLs]
   ```

   Por cada URL escribe en la barra «Inspecciona cualquier URL», lee el veredicto y el «Último rastreo», y lo compara
   con la fecha de modificación que declara la propia página (`article:modified_time`, `og:updated_time` o el
   `dateModified` del JSON-LD).

4. **Pide la indexación de las que lo necesitan:**

   ```bash
   pnpm public-website:gsc-index request https://efeoncepro.com/<ruta>/ --apply
   ```

   Hace clic en «Solicitar indexación», espera la prueba de Google (hasta tres minutos) y confirma con el mensaje «Se ha
   solicitado la indexación».

5. **Cierra el Chrome dedicado** cuando termines. Mientras está abierto, cualquier programa del equipo puede
   controlarlo por ese puerto.

## Cuándo pide y cuándo no

| Situación | Qué hace con `--apply` |
|---|---|
| La URL no está en Google | Pide la indexación |
| Google la rastreó **antes** del último cambio | Pide la indexación |
| Google la rastreó **después** del último cambio | No pide: ya la vio |
| No se pudo leer el «Último rastreo» | No pide: revísala a mano |
| La página no declara su fecha de modificación | No pide: usa `--force` si sabes que cambió |
| `--force` | Pide siempre, aunque ya esté rastreada |

## Opciones

| Opción | Por defecto | Para qué |
|---|---|---|
| `--apply` | apagado | Pide la indexación; sin esto sólo inspecciona |
| `--force` | apagado | Pide aunque la página no lo necesite |
| `--property` | `sc-domain:efeoncepro.com` | Otra propiedad de Search Console |
| `--port` | `9333` | Puerto del Chrome dedicado |
| `--max-per-day` | `10` | Tope diario de solicitudes |
| `--profile` | `~/.efeonce/gsc-chrome-profile` | Carpeta del perfil de Chrome |

## Qué significan los resultados

Cada URL deja una línea en `scripts/public-website/gsc-indexing/ledger/AAAA-MM.jsonl`, con la fecha, quién lo corrió,
el veredicto, el último rastreo, la fecha de modificación y el motivo.

| Resultado | Significa |
|---|---|
| `dry-run` | Sólo se inspeccionó |
| `skipped` | Con `--apply`, pero no hacía falta pedirla |
| `requested` | Google confirmó la solicitud |
| `quota` | Search Console dijo que se agotó el cupo del día. El runner se detiene |
| `timeout` | Google no confirmó a tiempo. El runner se detiene; revisa esa URL a mano antes de repetir |

Los códigos de salida: `1` uso o tope diario, `2` no hay Chrome en el puerto, `3` sin sesión o cuenta sin acceso,
`4` captcha, `5` cupo agotado, `6` Search Console no mostró lo esperado a tiempo.

## Qué no hacer

- **No escribas credenciales en el runner ni en un script.** La sesión la inicia una persona en la ventana.
- **No resuelvas ni evites un captcha.** Si Google lo muestra, el runner se detiene; espera o pídelo a mano más tarde.
- **No repitas una solicitud ya confirmada** el mismo día: no acelera nada y gasta cupo.
- **No uses la Indexing API** para artículos o landings: Google la limita a empleos y transmisiones en vivo.
- **No dejes el Chrome dedicado abierto** sin usarlo.

## Problemas comunes

| Síntoma | Causa y qué hacer |
|---|---|
| «Chrome no tiene la sesión iniciada» | El perfil no tiene sesión. El runner deja abierta la pantalla de Google: inicia sesión ahí y repite |
| «La cuenta abierta no tiene acceso» | Estás en otra cuenta. Cámbiala en la esquina superior derecha de esa ventana |
| «No hay Chrome escuchando» | Corre `launch` primero, o revisa `--port` |
| «Search Console no mostró lo esperado a tiempo» | Google tardó o cambió la interfaz. Mira la ventana; si cambió el texto de un botón, actualiza el runner |
| Pide la indexación de una página que no cambió | La página no actualiza su `article:modified_time`. Corrígelo en WordPress o usa el modo inspección |

## Referencias técnicas

- Runner: [`scripts/public-website/gsc-request-indexing.mjs`](../../../scripts/public-website/gsc-request-indexing.mjs);
  pruebas de su lógica: [`gsc-request-indexing.test.ts`](../../../scripts/public-website/gsc-request-indexing.test.ts).
- Qué puede y qué no puede hacer la API de Search Console:
  [`google-search-console-api-indexing.md`](../../../.claude/skills/seo-aeo/references/google-search-console-api-indexing.md).
- Dónde entra en la publicación de un post: [`agentic-blogpost-end-to-end.md`](../../../.claude/skills/efeonce-public-site-wordpress/references/agentic-blogpost-end-to-end.md).
- Conectar la lectura de Search Console por OAuth (otra cosa: leer datos, no pedir indexación):
  [`conectar-search-console.md`](../growth/conectar-search-console.md).
