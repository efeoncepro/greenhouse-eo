# TASK-1875 — flujo de la vista web compartida de Insights (Think)

Diseño inicial 2026-09-15; **reescrito el 2026-09-28 para describir lo construido y aprobado** (dirección A,
«tablero de respuestas»). La versión anterior no tenía interacción con estado propio (índice + anchors + `<details>`);
lo construido suma hallazgos que se abren en su lugar, filtros por módulo, interruptor gráfico/tabla, enlaces
directos por hallazgo, copia de enlace y un modo presentación en diálogo. Nodo **S6** del master flow
`docs/ui/flows/EPIC-045-efeonce-insights-UI-FLOW.md`. Contrato de datos: TASK-1848 (`InsightWebModelV1` 1.x,
resolver y proxies). La UI no decide autorización: cada request se valida en Greenhouse. Fuente verificable:
`efeonce-think/src/pages/insights/r/[token].astro` y `efeonce-think/src/scripts/insights-report.ts`.

## Surface Inventory

- `think.efeoncepro.com/insights/r/<token>` — página SSR del informe compartido (única ruta de esta task).
- Variantes de la MISMA URL, para que el HTML nunca escriba el token:
  - `?descargar=report_pdf|deck_pdf` → proxy de descarga (Greenhouse revalida el grant).
  - `?logo=1` → proxy del logo del cliente (mismo gate del token).
  - `#h-<claimId>` → enlace directo a un hallazgo (lo abre al cargar).
  - `#hallazgos`, `#plan`, `#metodologia`, `#descargas`, `#cap-NN` → anclas internas.
- Estados a pantalla completa en la misma ruta: `not_found` (404), `gone` (410), `rate_limited` (429), `error` (502).
- Capa superpuesta: modo presentación (diálogo modal a pantalla completa, sin cambiar la URL).
- Entradas: enlace del correo de entrega (TASK-1848, ShareGrant) · «Copiar enlace» del portal (TASK-1849) · reenvío
  del cliente a terceros · enlace copiado desde esta misma página (a la página o a un hallazgo).
- Salidas: descargas por proxy · correo de ventas desde `not_found`/`gone` · ninguna navegación privada.

## State and Transition Contract

1. Visitante abre la URL → Astro SSR resuelve el token contra Greenhouse (sin cache, sin pre-render), con la llave
   de Think (`x-efeonce-think-key`) para no caer en el guard de ráfagas del WAF.
2. `200` → render completo del modelo. `404` → `not_found` (desconocido, expirado, malformado o flag OFF,
   indistinguibles; sin identidad). `410` → `gone` (revocado o retirado). `429` → `rate_limited`. `5xx`, red caída o
   `modelVersion` mayor no soportada → `error` (502).
3. Al cargar con `#h-<claimId>` que corresponde a un hallazgo → se abre ese hallazgo y se desplaza hasta él.
4. **Hallazgo** (cerrado ↔ abierto): clic o Enter/Espacio en la tarjeta abre su evidencia en el lugar, cierra
   cualquier otro abierto (uno a la vez), escribe `#h-<claimId>` con `history.replaceState` (sin entrada nueva en el
   historial) y desplaza la tarjeta al tope. «Cerrar», un segundo clic o Escape lo cierran y limpian el hash.
5. **Filtro por módulo** (`Todo` ↔ `seo|aeo|ico`): oculta hallazgos y escenas de otros módulos (los hallazgos sin
   módulo quedan siempre); plan, metodología, descargas y pie no se filtran. Si el lector está más abajo del
   tablero, lo lleva a «Lo esencial del mes» para que vea el efecto.
6. **Gráfico ↔ Tabla** por figura: cambia la vista de esa figura; volver a «Gráfico» re-arma su entrada.
7. **Copiar enlace** (barra, dock o hallazgo): arma la URL desde `location` (página, o página + `#h-<claimId>`), la
   copia al portapapeles y muestra el toast «Enlace copiado» 2,2 s. Si el portapapeles falla, no muestra nada.
8. **Descargar**: `?descargar=<output>` en la misma URL → archivo con `no-store`; si no hay archivo (revocado,
   expirado, aún no generado) → 303 de vuelta al informe, que muestra el estado real.
9. **Presentar**: abre el diálogo en la lámina 1 (portada) → hallazgos → decisión → plan → cierre. Avanza con
   ArrowRight/ArrowDown/PageDown/Espacio o clic en el escenario; retrocede con ArrowLeft/ArrowUp/PageUp; Home/End
   van al inicio/fin; Esc sale. En pantallas ≥ 900 px y con motion permitido pide pantalla completa; salir de ella
   con el sistema también cierra la presentación.
10. Recarga posterior: siempre vuelve al paso 1; un grant revocado entre visitas cambia el resultado (revocar
    revoca). Deep links autenticados (correo al portal) NO entran aquí: van a Greenhouse.

## Focus and Recovery

- Skip link → `#hallazgos` (h2 con `tabindex="-1"`). Anclas a plan y capítulos llevan a h2 enfocables.
- Hallazgo: el botón conserva el foco al abrir; al cerrar (botón, «Cerrar» o Escape) el foco vuelve al botón de la
  tarjeta.
- Presentación: al abrir, el foco pasa al diálogo; Tab y Shift+Tab quedan atrapados en sus controles; al salir, el
  foco vuelve al botón «Presentar» que la abrió (y se repite dos cuadros después, porque al salir de pantalla
  completa el navegador reubica el foco).
- Estados de error: sólo la salida segura (texto de recuperación; CTA de correo en `not_found`/`gone`), sin enlaces
  a la biblioteca ni identidad del cliente.
- Sin dirty state, sin formularios, sin commands. Previews de correo y escáneres sólo hacen GET: no cambian nada.
- Mejora progresiva: sin JS todo queda abierto (evidencias visibles, gráfico y tabla a la vez) y la página se lee
  de corrido; si el script no monta en 3 s, se retiran las clases de motion y JS.

## GVC Scenario Plan

- Quality profile: `premium`; desktop 1440×900 y mobile 390×844.
- `efeonce-think/scripts/capture-insights-report.mjs`: portada, «Lo esencial», hallazgo abierto, figura narrada,
  tabla equivalente, capítulos AEO/ICO, período parcial, límites, descargas disponibles/no disponibles, los cuatro
  estados seguros, pie y dos láminas del modo presentación.
- `efeonce-think/scripts/verify-insights-report.mjs` (Todo verde): abrir un hallazgo muestra la evidencia y actualiza
  `aria-expanded`; el filtro «Respuestas de IA» oculta lo de SEO; la presentación abre en «1 de N», avanza a «2 de N»
  con ArrowRight, muestra una sola lámina y Esc la cierra devolviendo el foco al botón; descarga sin archivo → 303;
  sin scroll horizontal antes y después de interactuar.
- `efeonce-think/scripts/audit-insights-a11y.mjs`: recorrido con Tab (64–71 paradas, todas con foco visible) en 1440
  y 390.
- Dossier: `docs/ui/reviews/TASK-1875-efeonce-insights-shared-web-render-think/`.

## Design Decision Log

- Una sola ruta con estados a pantalla completa (patrón del Grader), en vez de rutas por estado.
- Descarga y logo por query en la misma URL, y copia de enlace desde `location`: el token nunca queda escrito en el
  HTML, en analytics ni en el Referer.
- Hallazgo que se abre en su lugar, no en modal: la evidencia queda junto a la cifra y el enlace directo
  `#h-<claimId>` sirve para citar un hallazgo en una conversación. `replaceState` para no llenar el historial.
- Filtros en la barra fija, no en un menú: son pocos (máximo tres módulos) y cambian toda la página.
- Modo presentación como diálogo sobre el mismo HTML: las láminas ya vienen renderizadas, no crea contenido ni pide
  otra ruta.
- Resolución por request como invariante de producto. Alternativa descartada: vista compartida dentro del portal
  (decisión del operador 2026-09-15).
