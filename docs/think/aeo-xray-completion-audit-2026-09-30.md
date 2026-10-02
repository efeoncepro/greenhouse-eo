# AEO X-Ray — auditoría del alcance y cierre comercial

Fecha: 2026-09-30. Owner: Growth / Think + Platform para foundation pendiente.
Resultado: **muestra comercial Pichincha terminada por el operador y publicada en Think;
foundation Greenhouse preparada localmente, rollout separado pendiente**.

Esta versión reemplaza la fotografía inicial «sólo local/aceptación pendiente» de esta auditoría.
El historial inicial queda recuperable en Git/expediente de trabajo; no se transforma en evidencia de release.
La entrega no requirió promover Greenhouse. [Dossier técnico y de experiencia](aeo-xray-implementation-dossier-2026-09-30.md).

## Matriz de comprobación

| Requisito | Evidencia actual | Resultado y límite |
|---|---|---|
| Extender el original y preservar recorrido | Experience compartida, Article/Instrument reutilizados,4 etapas, linaje y gate legacy 46 | Cumplido en Think; renderer reducido paralelo retirado |
| Composición/token por cliente | Manifest AXIS 0.1.0, acceptance boundary y provenance; starter/CLI de cliente nuevo | Reusable; publicación npm separada no certificada |
| Landing del banco | Referencia visual real/logo SVG, hero y módulos de beneficios/comparación/condiciones/proceso/FAQ/documentos/relacionado/CTA | Publicada como muestra; no producto bancario publicado |
| Artículo | Texto/TOC/respuestas/tablas/FAQ/fuentes/CTA, foto Pexels y 2 banners contextuales | Publicado como muestra con procedencia |
| SEO/AEO útil y verificable | Scope/status/source/asOf, ValueExplorer, anotaciones técnicas, JSON-LD inerte | Propuesta+implementación demostrable; no rendimiento causado ni cita IA real |
| Investigación KW | Snapshot DataForSEO y descripción de método Perú/español/fecha; volúmenes no sumados | Research externo, no tráfico esperado; separado de fuentes editoriales |
| Derivados sociales reales |3 feeds WebP 1080×1350,Story 1080×1920,MP4 H.264 720×1280×10s,poster/transcripción | Producidos para muestra; no publicados en Instagram |
| Video reproducible | CTA Play directo, controles/error/retry/descarga, pause al salir/cambiar, gate media 113 | Fix incorporado; toma generada Gemini Omni 1.1 con disclosure |
| UI y personalización | Logo Efeonce AEO + logo Pichincha, selector premium/iconos/footer/Opportunity | Operador dio por terminados ajustes; no certificación WCAG total |
| Motion preservado/enriquecido | ClientRouter/query, geometría compartida, identidad de artefacto, Back/Forward,49 checks local | Movimiento real verificado; reduced-motion mantiene significado |
| Telón | Dialog modal/noJS, foco/scroll/sessionStorage,1400 ms/easing simétrico, fix CSS ms/s |44 checks local y producción; no cierre instantáneo por minificación |
| Sample independiente | Registry Think; sin fetch Greenhouse; assets 302 a paths estáticos | Operativo; distribución no listada, no grant/auth/TTL real |
| Grant revocable y asset privado | Código Greenhouse+API + migración + tests PG efímero | **Pendiente entorno compartido**; no cubierto por sample |
| Publicación Think | SHA be8d4841e1124818bd7f4c88d0d7ad7b970e5122 / deployment dpl_7AEWYHEiiWWUyCiwrcTj1US1e3vB / alias Think | Evidencia release READY en archivo privado y readback HTTP 200 actual |
| Privacidad de página | private/no-store,noindex/nofollow,no-referrer,nosniff; sin JSON-LD activo/GTM en HTML | Verificado HTTP; medios sample son públicos, no privados |
| Correo previo a reunión | Redacción robusta con brochure HubSpot,X-Ray e Insights; reunión ya agendada | Preparado en conversación; no se atribuye envío efectivo desde agente |

## Evidencias concretas y vigencia

Think `main` confirmado en esta auditoría con `git rev-parse HEAD`.
`.captures/aeo-xray-selector/release.json` registra deployment READY/productivo/alias y SHA exacto.
Readback HTTP nuevo contra muestra en alias:200 y headers efectivos indicados arriba; selector/telón
presentes en HTML y ausencia de JSON-LD activo/GTM. La key no se imprime ni versiona en esta auditoría.

Counts conservados en evidencias del cierre (no todos reejecutados durante esta edición documental):

- Flujo: `.captures/aeo-xray-extension/verification.json`,198 checks.
- Motion: `.captures/aeo-xray-motion/verification.json`,49 checks.
- Telón: `.captures/aeo-xray-curtain/verification.json`,44 checks; último cierre local+producción.
- Medios: `.captures/aeo-xray-media/verification.json`,113 checks.
- Valor: `.captures/aeo-xray-value/verification.json`,87 checks.
- Contratos:19 tests en iteración final previa; legacy 46. Consultar run exacto antes de atribuirlos a otra SHA.

En el turno de cierre documental, root reejecutó foundation Greenhouse: 22 tests PASS y un test
PostgreSQL opt-in SKIP, integración del kit 1 PASS, distribución idéntica en 7 archivos; AXIS 34 PASS
y export check de 8 archivos. El skip no prueba el entorno PostgreSQL compartido.

Estas carpetas son ignoradas y pueden contener URLs privadas; no añadir dumps al repo. Capturas/GIF
se revisaron en las iteraciones visuales y se compartieron en la conversación. Un count no sustituye
la inspección de píxeles, movimiento real ni revisión editorial de las tres capas de prosa.

## Correcciones que deben permanecer

1. Se recuperó Experience original ante implementación reducida: derivados y coreografía son invariantes.
2. Fotografías estáticas ficticias rechazadas: reemplazo por referencia oficial/foto real con crédito.
3. Hero desktop: especificidad `.landing .landing-photo` evita que `.blk` anule posición absoluta.
4. Landing real: módulos completos, comparación/proceso/FAQ/documentos/CTA, no sólo un banner.
5. Fuentes y condiciones: bancos/SBS/FSD separadas de research; DataForSEO fuera del listado editorial,
   provenance conservado; no confundir mantenimiento gratuito con toda operación gratuita.
6. Story/video: reproducción disparada por click directo y manejo de error/descarga; asset MP4 real.
7. Motion query: `ClientRouter` y destino real; no morph de entidades distintas; Back/Forward conservados.
8. Telón producción: parser distingue 1.4s de 1400 ms; easing gradual propio de apertura de viewport.
9. Snapshot del selector: etiquetas por encima de cápsula activa para no desaparecer en transición.
10. Search scene: espera al telón y prepara query sin fade visible; ilustración no atribuida a Google AI.

## Pendientes fuera del cierre comercial

- Platform: autorizar y ejecutar migración, roles/actor/storage/configuración en entorno compartido.
- Platform/Think: canary real case→draft→edition→grant→media→revocación y deny de todas las rutas.
- Media grant: confirmar formato privado para vídeo/SVG; reader actual está acotado a imágenes.
- Growth: reverificar tasas/documentos antes de reutilizar o publicar en el CMS del cliente.
- Medición: ningún gate sustituye field CWV, citación IA real, Search Console o métricas de apertura.
- Comercial: envío/reunión/seguimiento CRM siguen su propio readback; no se deducen del deployment.

TASK-1950/1951 deben conservar estado runtime honesto. Publicar el sample resuelve el envío solicitado,
no finaliza automáticamente todo el dominio compartido. [Siguiente paso/rollback](aeo-xray-release-handoff.md).
