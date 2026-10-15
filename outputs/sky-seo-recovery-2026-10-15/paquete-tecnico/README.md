# SKY · Paquete técnico de recuperación preparado

Corte: 15 de octubre de 2026. Cero cambios ejecutados, cero costo pagado. Este paquete permite revisión y asignación por SKY. No certifica aprobación de cambios, acceso a WordPress/Azure/Cloudflare/HubSpot ni implementación.

Hay 21 destinos actuales 404 deduplicados: 20 con enlaces contextuales desde 68 artículos y 1 sonda histórica de alto tráfico. Las 70 aristas artículo→destino no son 70 artículos. La lista combina 18 destinos finales del censo legado y 6 directos, con 4 destinos en común, más la sonda histórica. No suma poblaciones superpuestas. El CTA externo 404 es un problema adicional, no uno de esos 21 destinos.

## Archivos para operar

| Archivo | Cobertura | Uso |
|---|---:|---|
| redirects-candidates.json / .csv |21 destinos|Decisión individual; ninguna 301 aprobada |
| link-corrections-manifest.json |70 aristas/68 IDs|Enlace y párrafo exactos, fuente y propuesta contextual |
| layouts-manifest.json |14 IDs cpt_layouts|Noindex/exclusión sitemap sin romper el tema |
| cta-native-manifest.json |68 IDs/70 tokens|Tokens y hash del contenido; bloqueos de activo/destino |
| metadata-schema-manifest.json |1.697 IDs/10 propuestas|Todos los artículos afectados; 9 metas del brief editorial + 1 adicional del curso |
| azure-host-manifest.json |1 host/3 muestras|Decisión por función de infraestructura |
| first-batch-actions.json |12 acciones|Primer lote con dependencias y responsables por función |
| package-validation.json |Conteos y readback|Verificación local, no verificación de cambios en producción |
| candidate-validation.json |9 GETs|8 destinos editoriales 200 y 1 landing CTA 404 |
| archive-flight-long-discovery.json |1 sujeto/2 consultas|Sin copia recuperada de la guía larga; no prueba que nunca existió |

Los destinos propuestos en `proposed_destination_url` son para `corregir_enlace`, no reglas de redirección. `redirect_destination_url` permanece null en los 21 ítems; `redirect_approved` es false. Para fuentes de intención mixta la propuesta es indicativa y exige aprobar cada ancla. No hay reglas masivas ejecutables.

GA4 usa 28 días 25/08–21/09/2025 frente a 06/10–02/11/2025, Organic Search, prefijos histórico y actual. Null significa sin registro disponible, nunca cero. Sesiones por página no se suman para estimar sesiones del sitio. El tráfico histórico no prueba que un 404 actual ocurriera durante la migración.

## Primer lote y nivel de preparación

B01/B02: decisiones sobre la guía histórica de cambios y restaurantes temáticos, con recuperación de contenido pendiente. B03: 11 fuentes del sur argentino, candidata Patagonia leída. B04: 4 fuentes de Desierto Florido, bloqueadas por contradicción geográfica del destino. B05: 9 fuentes de Florianópolis, bloqueadas por validación de rutas y contexto. B06: 5 fuentes de Río, propuesta contextual revisable. B07: 8 fuentes de gastronomía, elegir guía conceptual o destinos según cada párrafo. B08: piloto CTA nativo, bloqueado por landing 404 y definiciones faltantes. B09: 14 layouts, requiere staging/owner. B10: nueve metas del lote editorial y una adicional del curso, con esquema sujeto a validación. B11: host Azure, requiere confirmar función. B12: CTA comercial `href="blank"` de WP 3235, requiere URL comercial aprobada.

B03/B06/B07 son propuestas con evidencia contextual para revisión editorial concreta; tampoco están autorizadas para ejecución desatendida. Los 12 ítems comparten preflight y reversión. Ninguno se presenta como aplicado o como 301 lista.

## Runbook de WordPress: enlaces y 404

1. SKY asigna responsable editorial/SEO, administrador WordPress y responsable comercial para condiciones, rutas o landings. Los nombres nominales no se infieren. Confirma staging, permisos mínimos y ventana.
2. Para cada ID de `link-corrections-manifest.json`, guarda revisión previa, HTML/body original y hash. Compara la cadena exacta `href_before`, ancla y párrafo. Revisa el destino 200, canonical, indexabilidad e intención en el momento de ejecutar.
3. Cambia sólo los enlaces expresamente aprobados; conserva texto/ancla y no usa reemplazo global por substring. En turismo gastronómico selecciona por contexto la guía conceptual o de destinos. Para mascotas sólo la fuente que habla de cabina tiene propuesta puntual; validar política primero. En el enlace “viajero” hacia errores de migración la propuesta es quitar el hipervínculo y conservar la palabra, no enviarlo a una guía de migración.
4. `href="blank"` en WP 3235 es un CTA de precios/itinerarios: SKY debe aportar una landing comercial vigente. No sustituirlo por el artículo Puerto Natales ni por una home inventada.
5. Para restaurar un 404, recupera backup/revisión y contrasta vigencia; conserva propósito y URL cuando proceda. Si se demuestra equivalencia suficiente con otro artículo, documenta comparación, owner y destino antes de plantear 301 estrecha. Prueba 200 final, contenido, canonical, query, cadena y ausencia de loop. Sin sustituto, considerar mantener 404 correcto o 410 sólo tras decisión de retiro documentada. Nunca redirigir indiscriminadamente a home.
6. Alias largo de cambios de vuelo: archivo no recuperado. La URL larga y `/cambiar-vuelo-sky/` coexistieron en GA4 en 2025. Esa coexistencia impide asumir un simple cambio de slug; solicitar versiones y decisión de consolidación. No fechar su 404 en septiembre 2025 a partir del estado actual.

### Controles editoriales de destinos

`/desierto-florido/` primero sitúa el fenómeno entre Vallenar/Copiapó y después propone San Pedro/Calama 98 km. Corregir la inconsistencia con fuente geográfica oficial antes de aumentar enlaces. `/donde-queda-florianopolis/` afirma vuelos SKY dentro de Brasil: owner de rutas debe verificar y corregir condiciones, mercados y fechas antes de promover la guía. No se certifica su falsedad externa desde esta auditoría, sí que requiere comprobación. Revalidar disponibilidad y condiciones de mascotas/gestión de reserva en los destinos sensibles. El 200 sólo certifica una respuesta HTTP, no calidad ni vigencia.

## Runbook de layouts y sitemap

Los 14 IDs son `cpt_layouts` y sirven al tema Tripster/TRX: no borrar, cambiar a draft/private ni quitar dependencias para ocultarlos a buscadores. En staging, SKY confirma dónde se invocan header/footer/menú/item. Configura exclusión del sitemap para ese tipo/IDs y noindex de sus páginas públicas mediante el escritor SEO o filtro controlado elegido por owner. Preserva el render de los componentes incluidos en páginas normales.

Antes/después verifica home, artículo, categoría, header, footer, menú y móvil/escritorio; las páginas editoriales deben conservar indexabilidad/canonical. El sitemap debe seguir incluyendo los 1697 posts 200 salvo retiros/consolidaciones aprobados aparte. Los 14 layouts deben desaparecer del XML; la ruta de cada layout debe emitir noindex sin contaminar artículos. No bloquear rastreo antes de que el buscador pueda observar la exclusión. Robots 404 actual puede reemplazarse por política mínima revisada por SKY y sitemap correcto; no bloquear `/wp-content/`/assets necesarios ni copiar disallow de staging. Enviar sitemap o solicitar indexación es una acción posterior, con acceso y ejecución registrada por el owner.

## Runbook de metadata y schema

Usar un único escritor de canonical/robots/meta/schema. El archivo anterior muestra dos plugins SEO; no es instrucción para reactivar ambos. Las nueve metas de las fichas editoriales se adoptan literalmente desde `recovery-plan/editorial-briefs.json` como propuesta única para esas páginas. Se conserva una propuesta técnica adicional para curso de tripulante de cabina, fuera de las nueve fichas de artículos existentes. Son diez propuestas en total; no están publicadas. Confirmar título, intención y condiciones con SKY antes de emitirlas.

Emitir `Article`/`BlogPosting` y `BreadcrumbList` que reflejen contenido visible, publisher, imagen y canonical aprobados. Autor sólo si existe identidad editorial real visible y permiso; no inventar Person. Usar fechas reales comprobadas: algunos registros tienen modified anterior a publicación programada, lo que requiere criterio del owner. No actualizar fecha sólo por añadir schema. No restaurar ratings, FAQ u ofertas antiguos por copia del archivo. Validar salida HTML y estructura sin duplicidad de escritores, con enlaces correctos. Los 1697 IDs son inventario de ausencia de meta/JSON-LD; no son 1.697 redacciones listas. Demo y 14 URLs de 7 pares de contenido idéntico quedan en gate editorial antes de enriquecimiento por lote.

## Runbook de CTA nativo

68 artículos contienen 70 tokens de 9 IDs de RockConvert. El manifiesto conserva token exacto, ID de post, posición contada y hash de contenido actual. Primero recuperar definición/activo/destino por ID desde backup o owner; no inferir correspondencia porque un artículo también enlace otro ebook.

La definición histórica 4955 se acredita en el archivo del curso de 23/06/2025: ebook Tripulante de Cabina, dos emplazamientos renderizados. La landing histórica `skyairline-21097480.hs-sites.com/tripulante-de-cabina` devuelve 404 al 15/10/2026. Ese hallazgo bloquea el piloto hasta que SKY recupere/apruebe activo y landing 200; la coincidencia del ID en otros posts no prueba que esa oferta siga siendo pertinente para todos.

Con destino aprobado, sustituir token por bloque nativo (grupo, título/intro y botón, con imagen si derechos/alt aprobados), conservando ubicación y jerarquía. No reactivar el plugin antiguo ni hacer un regex global en DB. Pilotear WP 5253, revisar escritorio/móvil y navegación sin submit, validar accesibilidad, destino, consentimiento y medición. Ampliar sólo a los IDs aprobados y con las definiciones faltantes recuperadas. Si un activo no se recupera, owner elige alternativa pertinente o retiro del CTA; no dejar literal ni botón muerto.

## Runbook de Azure por función del host

Evidencia pública: home y 2 artículos de `blog-sky-h0gfh8acecdrdtav.eastus2-01.azurewebsites.net` devuelven 200, canonical propio y sin noindex; dos artículos tienen ≈96% similitud textual con el host público. Es una muestra, no un censo de Azure. El GUID de WP no es por sí solo prueba de exposición; aquí sí hay GETs públicos. La función real del host sigue sin confirmar.

**Si es origen de producción detrás de Cloudflare:** owner infra documenta resolución, Host/SNI, bindings, gateway, cachés y healthchecks. No aplicar auth, redirect general o noindex global al origen sin staging y verificación de tráfico autorizado. Cualquier restricción de acceso directo debe conservar gateway/monitorización y contar con reversión. Una cabecera por host no debe filtrarse al host público por caché compartida; comprobar respuestas con Host/SNI y purga selectiva. Si no hay aislamiento demostrado, no ejecutar.

**Si es staging/demo independiente:** owner aprueba control de acceso/autenticación o red según dependencias, política de noindex y retiro de sitemaps públicos. Probar que se conserva la funcionalidad necesaria y que ninguna credencial aparece en repositorio o informe.

**Si es clon retirado:** confirmar backup, DNS y dependencias, luego definir cierre/retención. Redirecciones por path sólo para mapeos aprobados; rutas sin reemplazo pueden requerir 410 tras decisión. No blanket 301 a home. Canonical al host público es una señal adicional cuando corresponde, no reemplaza resolver exposición ni demuestra consolidación en Google.

## QA, aceptación y reversión

Antes de tocar producción, owner guarda revisión/config exacta y resultado base. Después registra fecha real, cambio, responsable, muestra pública y criterio por ítem. Comprueba 200 y canonical de destino, noindex de layouts, XML limpio, navegación desktop/móvil, CTA y políticas de consentimiento. Medición de resultados: congelar T−28..T−1 al implementar y comparar T+28/T+56, con países/dispositivos y estacionalidad; no usar este corte como fecha ficticia de implementación ni prometer recuperar tráfico.

Detener ante 403/5xx inesperado en host público, contenido vacío, loop, landing 404, pérdida de header/footer, noindex filtrado a posts o consentimiento roto. Revertir sólo la revisión/regla/config de este ítem; no restaurar toda DB sobre cambios ajenos. Purgar caché afectada y readback público del origen, destino y sitemap. Las acciones no verificadas quedan pendientes; deploy/config aceptada no sustituye evidencia pública.
