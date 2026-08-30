# Editar la Home con Elementor

## Antes de empezar

Inicia sesión en WordPress con permiso para editar páginas. La Home vigente es `251731`, **Home**;
`2791` es el respaldo anterior en `/home-2/`, noindex. Editar `251731` afecta la portada pública.
Conserva `index, follow`, canonical `https://efeoncepro.com/`, plantilla `default` y header/footer Ohio.
La ruta de este manual conserva `preview` por historia; no indica una página de pruebas aislada.

La operación completa desde la interfaz aún necesita su prueba final de guardado/recarga. No confundas
las pruebas del renderer y del frontend con certificación del editor autenticado.

## Edición habitual

1. Abre `wp-admin/post.php?post=251731&action=elementor`.
2. En el navegador de estructura selecciona el contenedor de la sección y su widget Agencia.
3. Usa Textos, Enlaces, Imágenes e iconos y Datos y señales. En listas repetibles, edita cada fila o
   agrega, elimina y reordena elementos. Mantén los presets de composición salvo cambio visual aprobado.
4. Ajusta padding responsive y colores desde Estilo sólo cuando la revisión lo requiera.
5. No dupliques Experiencia: modal, progreso y CTA móvil deben existir una sola vez. Para otros módulos,
   evita anclas duplicadas y actualiza los enlaces internos si cambias un identificador.
6. Guarda y recarga el editor. Revisa el público en desktop, tablet de 890 px y móvil de 390 px,
   con teclado y movimiento reducido. Comprueba overflow y estados hover, no sólo el reposo.

## Cambiar medios, marcas y trabajos

| Sección | Control / tarea | Precaución |
| --- | --- | --- |
| Hero | Logos de clientes: Media, orden, altas/bajas, densidad y variante | Preservar círculo, halo y elevación; marcas no son botones ficticios. |
| Trust | Logos, velocidad y densidad del componente compartido | Reutiliza Logo Marquee de Redes Sociales; no reconstruirlo con texto. |
| Trabajos | Imagen, etiqueta y ALT en cada una de las dos filas | Diez originales, sin duplicar filas para cerrar el bucle; inspeccionar marca visible, no inferirla del nombre del archivo. |
| Integraciones y Respaldo oficial | Imágenes e iconos → Isotipo HubSpot | Usar sprocket oficial, no icono genérico de conexiones. |
| Servicios → CRM y automation | Logo | Usar SVG transparente: hereda teal/white hover mediante máscara. |
| Ecosistema | Isotipo · Greenhouse / Globe / Kortex / Wave | Mantener variantes oficiales aptas para fondo oscuro. |

Verk ya no está en los controles de Ecosistema. Para recuperar el aviso de lanzamiento usa
`Mostrar aviso de lanzamiento`; actualmente está oculto. Sus textos y enlace siguen editables.
No regeneres la importación inicial del export para recuperar una sola sección: sobrescribiría revisiones.

## Enlaces de servicios, casos y agenda

En **Servicios → cada fila → Landing del servicio · vacío para no enlazar**, selecciona la landing
publicada correspondiente. Vacía deja la tarjeta sin enlace; el control permite externo/nofollow.
No inventes destinos ni enlaces de contacto para servicios sin landing. El
[mapa vigente](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md#contenido-y-destinos-vigentes)
identifica las cuatro tarjetas enlazadas; comprueba el destino antes de cambiarlo.

**Casos** es una banda CTA. Textos controla etiqueta, título, descripción y botón; Enlaces →
Destino · Casos de éxito controla `/portafolio/`. Estilo controla título y colores normal/hover.
Las antiguas tarjetas/cifras ya no pertenecen al schema activo; su recuperación requiere snapshot y código
compatibles, no reactivar un repeater inexistente.

**Agenda** usa Enlaces → Agenda de reuniones hacia `https://efeoncepro.com/agenda/`, sin formulario.
Estilo controla el fondo, tinta y hover del botón teal. FAQ mantiene el CTA dentro de su tarjeta sin mail;
Agenda conserva el correo. Comprueba que el destino abra el calendario, sin crear reservas reales como prueba.

## Reemplazar el video

1. Selecciona **Experiencia → Enlaces → Video · URL de YouTube**.
2. Usa una URL HTTPS YouTube `watch?v=…`, `youtu.be/…`, `/embed/…` o `/shorts/…` con ID válido.
   No pegues iframe, JavaScript ni URL de otro proveedor. Vacía/inválida no carga reproductor.
3. En Textos, revisa título, etiqueta, nombre accesible, cierre y enlace alternativo. No describas un
   showreel como demo funcional ni agregues duración sin verificar el video real.
4. Guarda y prueba en público: el editor no carga YouTube. Antes de pulsar «Mira cómo operamos» no
   debe existir iframe; después debe verse la reproducción, no sólo un contenedor HTTP exitoso.
5. Cierra con X o clic exterior: el iframe se elimina, el audio se detiene, scroll y foco vuelven.
   Escape funciona con foco en la ventana; dentro de YouTube puede pertenecer al reproductor. Prueba
   teclado real: su recorrido completo y Escape dentro del iframe no están certificados todavía.

El enlace alternativo abre YouTube en otra pestaña. `youtube-nocookie` no significa que YouTube deje
de procesar datos al reproducir; no presentarlo como garantía general de privacidad.

## Diagnóstico y recuperación técnica

- Widget ausente: verifica plugin `eo-elementor-widgets`, clases registradas y manifest desplegado.
  No sustituyas la sección por HTML editable.
- Estilos viejos: compara versión del asset y DOM público tras navegación nueva; una pestaña anterior
  puede conservar JS. Limpiar Elementor/purgar Kinsta requiere autorización y carril gobernado.
- Hover tapado: inspecciona reglas Ohio y `-undash`, color/flecha después de terminar la transición.
- Bandas con huecos: prueba fases completas, resize e imágenes pintadas. No corregir agregando duplicados
  de contenido manuales; el runtime calcula período y cobertura.
- Mutación programática: ejecutar primero `pnpm public-website:ssh-check`; luego wrapper WP-CLI y
  `Document::save()`, con guard de identidad/hash y snapshot previo. No escribir `_elementor_data` directamente.

Para rollback, el [contrato técnico](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md)
y el [audit](../../audits/public-site/2026-08-30-home-visual-review.md) identifican las parejas de snapshot/
manifest por revisión. Releer drift antes de restaurar; no ejecutar un writer histórico contra otro hash.
Conservar metas Ohio/Yoast/thumbnail, otras páginas y política de portada/indexación. Los tar en `/tmp`
son temporales: confirmar que el archivo exacto exista antes de prometer recuperación.

[Descripción funcional](../../documentation/public-site/agency-elementor-preview.md).
