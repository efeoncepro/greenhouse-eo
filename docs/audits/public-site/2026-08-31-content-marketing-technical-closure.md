# Content Marketing — cierre técnico de pin, contraste y smoke seguro

Fecha: 2026-08-31. Producción: <https://efeoncepro.com/servicio-marketing-de-contenidos/>,
página `242603`. Pedido: corregir pin a 1440×650 y contrastes pendientes, preservar el diseño aprobado
y probar formulario/ledger/GA4 sin enviar un lead real.

**Estado: correcciones publicadas y verificadas; aceptación E2E bloqueada por Turnstile.**
El smoke negativo y el transporte GA4 sintético están verificados por separado. No hubo lead,
submission aceptada, contacto CRM, correo ni cambio de formulario, destinos, captcha o GTM.
No se cierra toda TASK-1799 ni se afirma certificación WCAG, Realtime o entrega comercial.

## Corrección publicada

- Causa del pin: el compilador aplicaba el criterio de altura sólo a la primera coincidencia.
  Mount exigía ancho ≥940 y alto ≥740; resize exigía sólo ancho. `replaceAll` conserva el mismo
  criterio en ambos caminos. A 1440×650 quedan los siete capítulos en flujo, incluso después de
  pasar por un viewport alto. Duración del pin y bloqueo de scroll-sync al seleccionar no cambian.
- CSS limitado a los módulos Content Marketing: variantes tonales de magenta/índigo/azul para
  fondos claros/oscuros; tinta semántica en badges rojos/verdes; tinta oscura sobre cian; metadatos
  legibles y eliminación de opacidad sobre texto de etapas futuras. Las miniaturas inactivas
  mantienen un velo propio y sus captions quedan legibles. No se cambia layout, tamaño de letra,
  copy, assets, header/footer, menú ni el diseño de los controles.
- Se extendieron los patrones existentes. No hay nuevo primitive, dependencia, schema, endpoint,
  permiso, flag o ADR: permanecen los contratos de módulos públicos y del motor Growth Forms.

Paquete de **dos archivos**, mediante `deploy-content-marketing-package.php`, con hash previo por
archivo, backup y purga Kinsta/Elementor. No se desplegó el repo completo: el informe global tiene
WIP ajeno y `fullRepoDeploySafe=false`; el paquete excluye loader, Home y demás plugins.
Backups remotos: `/tmp/eo-content-marketing-before-20260831-211317.tar` (JS/CSS) y
`/tmp/eo-content-marketing-before-20260831-211754.tar` (dos captions hallados al ampliar la matriz).

| Archivo | SHA256 previo | SHA256 publicado y leído de Kinsta |
|---|---|---|
| `assets/js/content-marketing.js` | `95e9b0076368dbb0ea5729a67c9390c6aa38f34a9e9eef0bca20a8fe968ceed6` | `8d89cd4708de7892c8e2963ec055904fa11c644d9a256a3437b696a4c463503b` |
| `assets/css/content-marketing-host.css` | `377ff04a501d60599e811d3380fd1104c4098339dd3a19d66408c4c9b2c3a3be` | `ce9eeaa3cb62472dcf581981f9897e042952b937194388f57294cd44267d5ebe` |

El JS regenerado incluye además whitespace del helper CMS ya existente, sin cambio semántico.
Documento Elementor antes/después: `b8d379697673969a8add5ece01e0b41c12563907470555768febe8c79b14f753`.
Settings: `c99030e62a3f595cf26add3628507b3789ed5c16d4164b09071fce70529d21b7`.
Thumbnail `251825`, Home `251731`, estado `publish`: sin cambios. Source CSS también sin cambios,
SHA256 `f09baf234c506e648b0e6dea75c03363ab9b6e6978ce65c1235434806dae6656`.

## Verificación visual y de regresión

Evidencia: `.captures/content-marketing/technical-closure/`.

- `production/report.json`: resize 1000→650→1000→739→740→650 y recarga nueva a 650; cada módulo permanece dentro del viewport; fallback
  en flujo, retorno del pin, siete capítulos, teclado, reduced motion y sin JavaScript.
- Auditoría focal de contraste: secciones visibles, cinco formatos, tres vistas del hub, tres cortes
  y siete capítulos. Cero violaciones detectadas en el pase publicado ampliado de 38 estados. El pase inicial
  de 36 estados encontró cero; la ampliación al fallback completo halló dos captions, corregidos
  y reprobados antes del cierre.
  No equivale a auditoría total AA: axe conserva `incomplete` sobre gradientes, imágenes y texto
  corto; los frames se revisaron visualmente, sin convertir esos casos en un PASS automático.
- Capturas revisadas: `production/1440x650-system.png`, `production/review.png`,
  `production/390-system.png`; comparación antes/preview/live y bloque de business.
- Se usa Playwright focal porque se necesita resize dentro de la misma sesión, intercepción local
  de los dos assets para preview y evidencia de red. Sigue el patrón mantenido de verificadores
  públicos; no se usa una ruta autenticada del portal como sustituto del sitio público.
- Test canónico `src/growth-forms-renderer/__tests__/content-marketing.test.ts`: 1 passed.
- SEO público: `verify-content-marketing-seo.cjs` pasó; source HTML y sitemap presentes.
- Copy/clipboard/prefill/back del formulario: pase diagnóstico completo 1440/878/390, cero POST y
  errores JS. Una primera corrida simultánea falló la igualdad de ancho; la repetición con captura
  de geometría dio 1440/1440, 878/878 y 390/390. No se ocultó overflow con CSS ni se cambió el diseño
  por ese fallo no reproducido. Tablas/miniaturas tienen su propio recorte/scroll interno.

## Formulario, ledger y GA4: tres pruebas distintas

1. **Contrato/ledger reales, read-only:** formulario v3
   `fver-e96ca2e9-d2b2-4f72-ad50-33d2b2be9245`, activo,
   `fhsf-efeonce-content-marketing` activa, cero destinos. Ledger vacío antes y después.
   `ledger-before.json` y `ledger-after.json` contienen sólo conteos y metadatos, nunca PII.
2. **Intento sintético por UI:** datos de prueba con dominio reservado `example.com`, sin persona
   real ni destino comercial. Turnstile devolvió `captcha_failed` antes del POST; hubo preflight
   204, cero POST, cero submission y ningún `generate_lead`. Evidencia `synthetic-submit.json`.
   No se sustituyó Turnstile, no se inyectó token y no se forzó el command interno.
3. **Rechazos reales del API:** honeypot → 422 `spam_rejected`; token ausente → 403
   `captcha_failed/missing_token`. Sin `submissionId` ni evento accepted. `safe-smoke.json`.
4. **Tag GA4, separado de aceptación:** el smoke explícitamente sintético usa
   `form_slug=smoke-test`, `form_kind=smoke`, `surface_id=measurement-smoke-content-marketing`.
   El pipeline genérico produjo `generate_lead`, colector `/g/collect` HTTP 204,
   `tid=G-KYPPY57M14`. Admin API confirmó que ese stream pertenece a property `486264460`.
   No se creó ni publicó tag. Consentimiento analytics granted sólo en la sesión de prueba;
   publicidad denied. Este único evento es telemetría de prueba, **no conversión comercial**;
   excluir `form_slug=smoke-test` de análisis de negocio.
5. **Realtime:** al último readback registrado todavía no había filas `generate_lead`. El 204
   acredita transporte al colector, no inclusión en informes ni atribución final. No se repitió
   el evento para forzar un conteo. `ga4-readback.json` conserva hora y resultado.

No hay evidencia de accepted→ledger→GA4 del formulario real. Para cerrarla se necesita un envío
sintético controlado que complete Turnstile por el camino normal; comprobar antes cero destinos,
después `submissionId`/consent/outbox y evento de esa misma submission. No usar un fake verifier,
inserción directa, respuesta 202 simulada o token de prueba como prueba de aceptación productiva.
La restricción del operador de no enviar un lead real permanece vigente.

## Repetición segura y recuperación

```sh
node scripts/public-website/verify-content-marketing-technical.cjs
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/verify-content-marketing-ledger.ts before
node scripts/public-website/smoke-content-marketing-safe.cjs
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/verify-content-marketing-ledger.ts after
```

El smoke mantenido sólo envía payloads rechazables y un evento GA4 marcado como prueba; cada
repetición añade un evento sintético. No automatizarlo periódicamente como conversión comercial.
No cambiar una versión publicada, la surface o las protecciones para obtener verde.

Rollback: verificar disponibilidad del TAR y hashes actuales; extraer sólo esos dos archivos,
crear un paquete inverso con `previousSha256` del runtime leído y desplegar por el mismo writer.
Purgar y volver a verificar. Copia local previa: `tmp/cm-closure-backup/`. No restaurar todo el repo,
loader ni documento Elementor; el documento no se mutó. La retención de `/tmp` no está garantizada.

Validación/cierre: syntax checks, `git diff --check`, QA router, documentación y contexto. Sin commit,
push, merge ni release de Greenhouse; únicamente publicación focal de los dos assets WordPress.
