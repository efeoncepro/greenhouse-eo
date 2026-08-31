# Content Marketing: servicios conectados y preguntas frecuentes

Fecha: 2026-08-31. Página `242603`, [landing pública](https://efeoncepro.com/servicio-marketing-de-contenidos/).
Pedido del operador: revisar el copy completo de `#ecosistema` y `#faq`, enlazando las seis tarjetas
con las landings vigentes. Skills: copywriting, UX content, WordPress público, GVC público y QA.

## Cambios publicados

- 37 textos: 19 en ecosistema y 18 en FAQ, incluidas las ocho preguntas y respuestas.
- La sección conecta especialidades mediante su aporte; elimina el corte artificial «otro equipo»
  y los ejemplos arbitrarios de diez creadores/tres semanas. Los nombres de los seis servicios se conservan.
- El ciclo editorial deja de presentar cinco canales y seis meses como condiciones universales.
  Canales, responsabilidades y continuidad se definen según modalidad y alcance.
- Las FAQ aclaran colaboración, producción, límites con Redes Sociales, CMS, aprobación, medición,
  uso de IA e Inbound. Content Engine coincide con la modalidad publicada: contenido principal,
  adaptaciones y calendario; el cliente publica. No se atribuyen resultados garantizados a SEO/AEO.
- Seis URL nativas normalizadas a HTTPS absoluto. Ya existían anchors de tarjeta completa y las
  rutas relativas correctas; se conservan sus destinos. «Explorar servicio» hace explícita la acción.
- Sin modificaciones de layout, runtime, CSS, JS, iconos, defaults del export, header/footer, menú,
  formulario, SEO o los otros once módulos. No se añade FAQPage al grafo.

## Destinos verificados

Readback HTTP anónimo, título/H1 y navegación real desde cada tarjeta. Los seis responden 200 sin
redirección de ruta. Cinco tienen canonical igual a su URL; Redes Sociales no emite canonical y
conserva `noindex, follow`. Este hallazgo preexistente no se corrigió como efecto lateral.

| Servicio | Landing vigente |
| --- | --- |
| SEO | [Posicionamiento SEO](https://efeoncepro.com/servicios/posicionamiento-seo/) |
| AEO | [AEO](https://efeoncepro.com/aeo-2/) |
| Redes sociales | [Redes Sociales](https://efeoncepro.com/servicios/redes-sociales/) |
| Influencer marketing | [Agencia de influencers](https://efeoncepro.com/servicios/agencia-de-influencers/) |
| Inbound marketing | [Inbound Marketing](https://efeoncepro.com/agencia-inbound-marketing/) |
| Agencia creativa | [Agencia Creativa V2](https://efeoncepro.com/agencia-creativa-v2/) |

AEO no apunta al alias legado `/aeo`; Creativa conserva V2, sin redirigir ni editar la página anterior.

## Escritura y recuperación

Patch: `scripts/public-website/content-marketing-ecosystem-faq-copy.json`.
Writer: `update-content-marketing-copy.php`, extendido a los dos módulos y seis controles URL existentes.
Las URL sólo admiten la lista de destinos comprobados; preservan el resto del objeto nativo del enlace.
Dry-run: 43 controles válidos. Aplicación explícita por `Document::save()`, nunca `_elementor_data` directo.

- Hash anterior: `8c19d40b1d21c95a01f8568df86aaee5150d91adc8409a5df10592a9d7789e7d`.
- Snapshot: `_gh_content_marketing_copy_20260831_162332`.
- Hash posterior: `88df573273e33edb84cc67fffda3f86fd0f4168d1bbccea92be6726e8e7f5488`.
- Readback del árbol completo igual al esperado. Metas Yoast/thumbnail, shell, menú y cinco páginas
  protegidas sin cambios. Cachés Elementor/Kinsta purgadas.

El patch es histórico y su guarda impide repetirlo. Para revertir, leer estado actual, comparar deriva
y recuperar sólo los 43 campos anteriores desde patch/snapshot con `Document::save()`. Mantener
cualquier edición posterior y repetir purga/readback. No hay rollback automático ni despliegue de runtime.
Sin commit ni push en este pase; se conserva WIP ajeno.

## Verificación

`node scripts/public-website/verify-content-marketing-ecosystem-faq.cjs --preview` pasó antes de publicar:
43 valores en DOM renderizado, seis navegaciones reales alternando ratón/teclado, ocho FAQ abiertas y
cerradas con Enter/Space en cada ancho 1440/878/390 (24 ciclos), sin overflow de documento ni errores JS.
Fallback sin JS conserva textos, destinos y apertura nativa. Inspección visual de escritorio y móvil,
además de FAQ abierta en tablet. El modo preview sustituye controles sólo en la respuesta local.

La misma herramienta sin `--preview` verifica producción. Evidencia en
`.captures/content-marketing/ecosystem-faq/`; variante previa en `ecosystem-faq-preview/`.
Resultado público final PASS: 43 valores, seis navegaciones reales, 24 ciclos de apertura/cierre
con teclado en 1440/878/390, ocho FAQ y seis enlaces disponibles sin JS, cero errores JS y ancho
del documento igual al viewport. Capturas públicas inspeccionadas; diseño conservado.

Los verificadores generales `verify-content-marketing-{landing,seo}.cjs` pasan: 13 módulos,
header/footer, interacciones, prefill/retorno del formulario, metadatos y grafo único conservados.
El primer readback focal recibió HTML anterior desde caché; el posterior readback HTTP confirmó
el copy nuevo tanto en la URL normal (HIT) como evitando caché (BYPASS), sin repetir el guardado.
QA gate advisory revisado; sintaxis Node, diff y cierre documental verificados. Las recomendaciones
de migración/tipado por WIP ajeno no son gates de esta edición exclusiva de WordPress.
No se enviaron leads. No certifica indexación GSC, CWV, contraste global ni editor GUI completo.
El hallazgo anterior de pin tras resize sigue separado de esta edición de texto/enlaces.

[Contrato técnico](../../architecture/public-site/CONTENT_MARKETING_ELEMENTOR_MODULES_V1.md) ·
[Manual](../../manual-de-uso/public-site/content-marketing.md).
