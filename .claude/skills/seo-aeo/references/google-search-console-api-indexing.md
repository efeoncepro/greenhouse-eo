# Google Search Console API, Platform Properties e indexación

> Sello de investigación: **2026-07-18**. Google está desplegando Platform
> Properties gradualmente y la referencia pública de la API todavía no declara
> sus identificadores ni paridad explícita. Reverificar antes de diseñar o
> prometer soporte.

## Regla de interpretación

Search Console separa tres problemas que no deben mezclarse:

1. **Discovery:** Google encuentra una URL mediante enlaces y sitemaps.
2. **Observación:** Search Console informa rendimiento o estado conocido del
   índice.
3. **Solicitud de recrawl:** una persona puede pedir indexación para unas pocas
   URLs desde URL Inspection en la interfaz.

La API de URL Inspection cubre el segundo punto. **No hace ping, no ejecuta un
live test y no solicita indexación.** Una respuesta correcta tampoco garantiza
que Google indexe o posicione la URL.

## Matriz de capacidad

| Capacidad | Scope mínimo | Uso correcto | Límite operativo |
| --- | --- | --- | --- |
| `sites.list` | `webmasters.readonly` | Descubrir propiedades visibles para la identidad OAuth y su `permissionLevel` | No asumir que sólo devuelve dominios web ni normalizar un `siteUrl` desconocido antes de probarlo |
| `searchAnalytics.query` | `webmasters.readonly` | Consultar clicks, impresiones, CTR y posición por dimensiones/filtros | Devuelve principalmente filas superiores, no garantiza todas; `rowLimit` máximo 25.000 y paginación con `startRow` |
| `urlInspection.index.inspect` | `webmasters.readonly` | Observar la versión conocida por el índice de Google | No prueba la URL live y no tiene operación `request indexing` |
| `sitemaps.list/get` | lectura | Inventariar sitemaps registrados y su estado | No sustituye verificar el XML live ni su contenido |
| `sitemaps.submit` | `webmasters` | Registrar un sitemap nuevo o cambiado deliberadamente | Requiere ampliar OAuth a escritura; no se usa por cada página publicada |
| Sitemap ping legado | no aplica | Ninguno | Retirado; el endpoint responde `404` y no aporta señal útil |
| Indexing API | scope propio | Sólo páginas con `JobPosting` o `BroadcastEvent` dentro de `VideoObject` | No usarla para páginas, landings o artículos genéricos |

`searchAnalytics.query` admite `type=web|image|video|news|discover|googleNews`,
dimensiones como `date`, `hour`, `country`, `device`, `page`, `query` y
`searchAppearance`, filtros RE2, `aggregationType`, `dataState=final|all|hourly_all`
y metadata de datos incompletos. No sumar superficies incompatibles como si
fueran el mismo universo; conservar `type`, agregación, timezone y frescura en
la evidencia.

## Platform Properties

Search Console permite crear propiedades para cuentas o canales de Instagram,
TikTok, X y YouTube. Cada cuenta/canal es una propiedad independiente y la
función se despliega gradualmente. Sus reportes muestran cómo ese contenido
rinde en **Google Search**, y cuando existe tráfico también en Discover y Google
News; no son analítica nativa de la plataforma social.

La documentación de `sites.list` y `searchAnalytics.query` sólo ejemplifica
propiedades URL-prefix y `sc-domain:`. Por tanto, **la UI de Platform Properties
no prueba paridad API**. Antes de incorporarlas a producto:

1. conectar una identidad autorizada y ejecutar `sites.list` sin filtrar;
2. conservar el `siteUrl` crudo y `permissionLevel` que entregue Google;
3. detectar candidatos por evidencia de respuesta, no por un prefijo inventado;
4. lanzar una consulta mínima por propiedad y por `type` soportado;
5. distinguir `unsupported`, `permission_denied`, `no_data_yet` y `ok`;
6. registrar fecha, request shape redacted y respuesta/HTTP status del canary;
7. no habilitar una propiedad en UI/cron hasta que el canary sea reproducible.

Una propiedad recién verificada puede tardar días en mostrar datos. Cero filas
no demuestra por sí solo que la API sea incompatible.

## Nueva URL: procedimiento recomendado

Al publicar una URL indexable:

1. verificar `200`, canonical propia, `index, follow`, HTML útil, enlaces
   internos y ausencia de duplicados;
2. confirmar que aparece en el sitemap correcto con `<lastmod>` honesto;
3. no llamar al sitemap ping retirado ni a la Indexing API genérica;
4. si existe integración de URL Inspection, guardar una observación inicial y
   repetirla en checkpoints razonables, por ejemplo `0h`, `24h` y `72h`;
5. usar la solicitud manual de indexación sólo para unas pocas URLs críticas;
6. interpretar `not indexed`, `discovered`, `crawled`, canonical elegida y
   cobertura como estado observado, no como promesa de resultado.

La publicación puede estar operativamente correcta antes de que Google procese
la URL. El seguimiento asíncrono debe quedar separado del gate de publicación.

## Overlay Greenhouse/Efeonce

La integración actual vive en `src/lib/growth/search-console/`, usa
`webmasters.readonly`, consulta `sites.list` y `searchAnalytics.query`, y modela
una sola `site_url` por organización. No ampliar scopes ni declarar soporte de
Platform Properties sin canary y revisión de seguridad.

La evolución recomendada está especificada en
`docs/tasks/to-do/TASK-1426-search-console-multi-property-discovery.md`: bindings
multi-property, canary de Platform Properties, Search Analytics completa, URL
Inspection y seguimiento post-publicación. Hasta que esa task esté implementada
y verificada, el flujo `0h/24h/72h` es contrato propuesto, no evidencia runtime.

### Caso 2026-10-17: inspección puntual con la conexión de la organización

- La API de URL Inspection se usó en un script local con el token OAuth de la
  conexión por organización (`sc-domain:efeoncepro.com`); todavía no existe un
  cliente `urlInspection` en `src/lib/growth/search-console/`. Resultado
  observado: una landing nueva figuraba como «Google no reconoce esta URL»
  mientras su URL legacy seguía «Enviada e indexada» con último rastreo previo
  al 301.
- **Gotcha:** `listActiveSearchConsoleOrganizations()` devuelve sólo
  `organizationId` y `siteUrl`, sin `tokenSecretRef`. Para obtener el token hay
  que leer `getSearchConsoleConnection(orgId)`; usar la otra lectura produjo un
  `invalid_grant` falso con la conexión sana. Para diagnosticar, refrescar el
  token directo: `listSearchConsoleSitesForOrg` marca la conexión `revoked` ante
  `invalid_grant`.
- La cuenta de servicio de GTM (`greenhouse-gtm-publisher`) no tiene acceso a
  Search Console (`sites.list` vacío); la vía es la conexión OAuth de la org.
- Pedir indexación sigue siendo **sólo por la interfaz** de Search Console.
  Manual operativo: `docs/manual-de-uso/growth/conectar-search-console.md`.

## Fuentes primarias

- [Platform Properties en Search Console](https://support.google.com/webmasters/answer/17148418)
- [`searchAnalytics.query`](https://developers.google.com/webmaster-tools/v1/searchanalytics/query)
- [`urlInspection.index.inspect`](https://developers.google.com/webmaster-tools/v1/urlInspection.index/inspect)
- [`sitemaps.submit`](https://developers.google.com/webmaster-tools/v1/sitemaps/submit)
- [Solicitar a Google que vuelva a rastrear URLs](https://developers.google.com/search/docs/crawling-indexing/ask-google-to-recrawl)
- [Retiro del sitemap ping](https://developers.google.com/search/blog/2023/06/sitemaps-lastmod-ping)
- [Uso permitido de Indexing API](https://developers.google.com/search/apis/indexing-api/v3/using-api)

## Solicitar indexación por la interfaz (runner, 2026-10-26)

La única vía para pedir indexación de una página normal es el botón «Solicitar indexación» de la interfaz
(cupo de unas 10 por día y propiedad). Para que un agente lo haga sin tocar credenciales existe
`pnpm public-website:gsc-index` (`scripts/public-website/gsc-request-indexing.mjs`):

- `launch` abre un Chrome real con perfil propio (`~/.efeonce/gsc-chrome-profile`) y puerto CDP sólo en
  `127.0.0.1:9333`; una **persona** inicia sesión ahí una vez. Sin sesión, Search Console cae en
  `/search-console/about` (no en `accounts.google.com`): el runner lo detecta y deja abierta la pantalla de Google.
- `request <url…>` inspecciona por la barra «Inspecciona cualquier URL» (la URL directa `inspect?id=` responde 404)
  y compara «Último rastreo» con `article:modified_time`/`dateModified` de la página. Por defecto sólo inspecciona;
  `--apply` pide sólo si la URL no está en Google o se rastreó antes del cambio; `--force` pide siempre.
- Se detiene ante captcha, cuenta sin acceso, cupo agotado o falta de confirmación; registra cada URL en
  `scripts/public-website/gsc-indexing/ledger/AAAA-MM.jsonl` y no pasa de 10 solicitudes confirmadas por día.
- No repite una URL con solicitud confirmada en las últimas 24 horas (`already-requested`; `--force` la pide igual).
- La confirmación se lee del texto **visible** (`innerText`), no con un locator: el primer nodo con «Se ha solicitado
  la indexación» puede estar oculto, y esperarlo dio `timeout` en la primera solicitud real (2026-10-26) con la
  solicitud ya hecha. Tras pedirla, «Último rastreo» pasa al minuto de la prueba en vivo de Google.

Manual: `docs/manual-de-uso/public-site/solicitar-indexacion-search-console.md`.
