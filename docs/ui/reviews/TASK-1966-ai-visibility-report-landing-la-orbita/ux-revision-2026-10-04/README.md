# Refinamiento UI/UX del AI Visibility Report · 2026-10-04

Estado: implementado y validado localmente. Pedido del operador: «Hazlos todos», referido a las seis mejoras propuestas para el resto de la landing. Commit + push autorizados el 04/10: Think `09e1976c6ec4ceb0319f829b80656dab99ee57f7` confirmado en `origin/main`. El despliegue automático y su readback aún no se verificaron. La nueva versión del formulario no se activó; el script y su evidencia se entregan en Greenhouse.

## Cambios

1. Vista real del PDF: portada/puntaje, motor por motor y plan prioritario. Selector de páginas, ampliación en diálogo nativo, zoom, Escape y retorno de foco. Ejemplo etiquetado con datos sintéticos; tres WebP derivados del PDF final (241 078 bytes en total), carga diferida y dimensiones reservadas. Sin JavaScript, las tres páginas siguen disponibles y cada enlace abre la imagen.
2. Intake: contrato candidato Marca → Mercado → Contexto → Entrega → Confirmar. La landing mantiene `<greenhouse-form>`. Sólo cambia el orden de los objetos completos de `ui_policy.steps`; campos, validación, CAPTCHA, consentimientos, políticas y entrega se preservan. Tema Engine aplicado por variables admitidas en `.ghf-root[data-ghf-style-variant]`; no reordenamiento por DOM. En escritorio marca y web comparten fila.
3. Método: cinco preguntas principales en español, nombre del nivel en segundo plano y detalles nativos desplegables. No se elimina ningún nivel.
4. Ritmo: método compacto con filetes, muestra amplia sobre blanco y cierre editorial sobre papel. Se eliminó el conjunto repetido de tarjetas; pesos secundarios reducidos y sombra del formulario más suave.
5. Cerca del formulario: entrega/PDF y finalidad del correo. Al cierre: preguntas sobre contenido, descarga, correo y acceso. Se aclara que quien tiene el enlace puede consultar el resultado; no se equipara noindex con autenticación.
6. CTA principal final y en la muestra, con ancla y foco al encabezado del formulario. AEO conserva el papel secundario en el footer.

La revisión de movimiento continuo de esta misma fecha se conserva; evidencia separada en `../motion-revision-2026-10-04/`.

[Auditoría de cierre](QA.md): código validado localmente, publicación pendiente.

## Verificación

- Think `pnpm type-check`: 0 errores, 0 warnings; 17 hints preexistentes.
- Think `pnpm build`: PASS.
- Greenhouse: 84 pruebas PASS (transformación brand-first, renderer, paridad de validación y policy compiler).
- ESLint sobre los archivos nuevos del contrato y harness: PASS.
- Mirrors de skills y task lint TASK-1966: PASS.
- Fallback sin JS conservado por HTML server-rendered; el intento de readback con JS deshabilitado agotó el tiempo de la herramienta. Se recuperó una pestaña limpia con JS activo. No se acredita un smoke no-JS nuevo de esta iteración.
- Dry-run contra la versión vigente `fver-ea1c2e5f-38e0-4ef6-b9eb-9b5fe1b9d6f3`: compiler de publicación PASS; 0 destinos en esa versión, preservados; no escritura. Sólo exportó el contrato browser-safe para QA.
- CUA: recorrido de los cinco pasos con datos ficticios, validación de marca obligatoria, consentimiento presente al final. No se aceptó consentimiento ni se envió el formulario. Volver/cargar conserva los datos de prueba según el comportamiento existente del renderer.
- CUA: selección de las tres páginas, ampliación, zoom, Escape con retorno de foco, CTA final devuelve foco a `brand-visibility-form-title`. Responsive 1280, 390 y 360 sin overflow horizontal; el zoom desplaza sólo el contenedor del diálogo.
- El error de carga del embed en localhost:4331 es preexistente. Para QA integral se sirvió el contrato candidato con el renderer real en localhost:4332, con rótulo visible, telemetría deshabilitada y TODOS los POST rechazados. No demuestra entrega real ni funcionamiento remoto.

## Reproducir / activar

Desde Greenhouse:

```sh
pnpm exec tsx --require ./scripts/lib/server-only-shim.cjs scripts/growth/activate-grader-brand-first-intake.ts --render-preview=/tmp/ai-visibility-brand-first-contract.json
node scripts/growth/preview-ai-visibility-landing.cjs /tmp/ai-visibility-brand-first-contract.json
```

El harness necesita Think dev en localhost:4331 y expone localhost:4332/brand-visibility sólo en loopback. No forma parte de un build ni de la landing desplegada.

Activación pendiente de publicación autorizada: repetir dry-run, revisar versión actual y ejecutar el mismo script con `--apply --expect-version=<version-verificada>`. Clona por commands existentes, conserva destinos y su estado enabled, compila/publica, verifica las políticas y campos por readback y depreca la anterior. Un cambio concurrente de versión aborta dejando el draft sin publicar. Conservar la versión anterior para rollback por el command canónico. Después verificar contrato público y landing live; no acreditar conversión, correo ni PDF real sin ese smoke separado.

## Procedencia de la muestra

Fuente: `docs/ui/reviews/TASK-1938-ai-visibility-report-pdf-la-orbita/proofs/es-prospect.pdf`.
SHA256: `d64730fa60cf0de7c39017d99d2094014935f1c5d7c372b74488e4e3cd22b9e2`.
Se rasterizó el PDF vigente con `pdftoppm -f 1 -l 4 -scale-to 1684 -png` y se convirtieron las páginas 1, 2 y 4 con Sharp WebP quality 86. No se usaron los PNG previos del dossier, que tenían versiones anteriores de algunos detalles. No hay datos de un cliente real: es la fixture sintética de Globe. El documento completo no se publica como asset, sólo las tres imágenes rotuladas en la UI.

## Evidencia visual

- `desktop-preview.jpg`: muestra principal.
- `desktop-form.jpg`: primera pantalla con tema Engine.
- `mobile-form.jpg`: primer paso en 390 px.
- `mobile-method.jpg`: método compacto.
- `mobile-preview.jpg`: selección y muestra.

Pendiente: confirmar despliegue de Think, activar el contrato y realizar readback de producción. El cierre original de TASK-1966 no implica que este delta esté desplegado.
