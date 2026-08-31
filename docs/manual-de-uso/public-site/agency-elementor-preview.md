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

## Titular y badge del hero

En Hero, **Badge · Sobre el titular** controla la etiqueta superior; vacío la oculta.
**Título principal · Fragmento subrayado** permite seleccionar el segundo o tercer fragmento.
La Home usa el segundo: «mover tu negocio.», entre «Tu marketing debería» y
«No solo tu calendario.». El badge es «Agencia de marketing digital y tecnología».
Revisa que el fragmento destacado conserve una línea en móvil antes de ampliar su texto.
[Evidencia y recuperación de esta revisión](../../audits/public-site/2026-08-31-home-hero-copy.md).

## Cambiar medios, marcas y trabajos

| Sección | Control / tarea | Precaución |
| --- | --- | --- |
| Hero | Logos de clientes: Media, orden, altas/bajas, densidad y variante | Preservar círculo, halo y elevación; marcas no son botones ficticios. |
| Trust | Logos, velocidad y densidad del componente compartido | Reutiliza Logo Marquee de Redes Sociales; no reconstruirlo con texto. |
| Trabajos | Imagen, etiqueta y ALT en cada una de las dos filas | Diez originales, sin duplicar filas para cerrar el bucle; inspeccionar marca visible, no inferirla del nombre del archivo. |
| Integraciones y Respaldo oficial | Imágenes e iconos → Isotipo HubSpot | Usar sprocket oficial, no icono genérico de conexiones. |
| Servicios → CRM y automatización | Logo | Usar SVG transparente: hereda teal/white hover mediante máscara. |
| Ecosistema | Isotipo · Greenhouse / Globe / Kortex / Wave | Mantener variantes oficiales aptas para fondo oscuro. |

Verk ya no está en los controles de Ecosistema. Para recuperar el aviso de lanzamiento usa
`Mostrar aviso de lanzamiento`; actualmente está oculto. Sus textos y enlace siguen editables.
No regeneres la importación inicial del export para recuperar una sola sección: sobrescribiría revisiones.

## Problema y reencuadre

En **Problema**, edita los tres fragmentos del titular manteniendo la lectura completa:
«Cuando todo va por separado, tu equipo paga el costo.» El énfasis rojo corresponde a «tu equipo».
La bajada explica el costo de cruzar reportes, repetir contexto y perseguir aprobaciones; no afirma
que todas las empresas o proveedores trabajan así. El diagrama es un **ejemplo**, no telemetría:
conserva esa etiqueta y las coletillas vacías; no restaures el contador histórico `0 / 4`.
[Revisión y recuperación](../../audits/public-site/2026-08-31-home-problem-copy.md).

En **Reencuadre**, el titular aprobado es «Tu equipo necesita un aliado. No otro proveedor que
coordinar.», con énfasis en la segunda frase. La bajada distingue la participación del cliente en
las decisiones de la coordinación de la ejecución por Efeonce. Sustituye la versión intermedia
«Que cada campaña deje algo más que entregables.»; no la recuperes desde el primer snapshot de copy.
[Revisión vigente y snapshot](../../audits/public-site/2026-08-31-home-reframe-comparison-copy.md).

## Enlaces de servicios, casos y agenda

Motor, Servicios e Integraciones se editan desde Textos y las doce filas de Servicios. En Motor,
los controles de estado sincronizado y coletillas quedan vacíos deliberadamente; no representan
telemetría real. No repoblarlos desde defaults históricos.
[Revisión de esas secciones y snapshot](../../audits/public-site/2026-08-31-home-four-sections-copy.md).

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

En el panel ilustrativo de Greenhouse, conserva la identificación de ejemplo tanto arriba como
en la nota inferior. Las cifras actuales no son resultados de una cuenta ni un feed vivo. En
Método, roles y especialidades dependen del proyecto; no restaurar la promesa histórica de cero
rotación. [Revisión de copy y recuperación](../../audits/public-site/2026-08-31-home-proof-products-method-copy.md).

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
[Índice de revisiones editoriales y límites de verificación](../../audits/public-site/2026-08-31-home-editorial-closure.md).
Los hashes y conteos de cada audit son checkpoints de esa revisión, no parámetros para ejecutar un
writer hoy: primero consulta el estado actual y genera un plan con guardas nuevas.

### Comparación cualitativa

La comparación permite editar cada una de las 24 celdas desde controles de texto nativos,
además de titulares, rótulos y nota de alcance. No reintroducir porcentajes de capacidad ni cruces
genéricas sobre competidores sin evidencia. Los antiguos controles de puntuación están retirados;
sus valores históricos se conservan en el documento para recuperación, pero no se renderizan.
El encabezado de la última columna combina el texto nativo «Con» con el logo y su alt «Efeonce»;
no repitas el nombre en ambos elementos ni elimines el alt para evitar la repetición visual.
[Encabezado y recuperación](../../audits/public-site/2026-08-31-home-comparison-label.md).
La tabla cabe en la ventana de 878 px y se desplaza horizontalmente en móvil; tiene región
enfocable, etiqueta accesible y encabezados de fila/columna. Verifica que se alcance la columna
Efeonce por gesto y por teclado. El foco y el gesto se comprobaron en esta revisión; el desplazamiento
por flechas no quedó certificado.
[Revisión y recuperación](../../audits/public-site/2026-08-31-home-reframe-comparison-copy.md).

### Preguntas y primera reunión

Mantener seis FAQ que resuelvan dudas de contratación, sin repetir claims del Home. Editar pregunta
y respuesta en la colección nativa conservando el orden intencional. La aclaración de métricas
ilustrativas vive también en la respuesta de seguimiento. La invitación a una reunión de 30 minutos
explica objetivos, necesidades y próximos pasos; no ofrece diagnóstico completo o plan a medida
en ese plazo. No se añadió FAQPage.
[Revisión y snapshot](../../audits/public-site/2026-08-31-home-faq-agenda-copy.md).

### Jerarquía dentro de cada respuesta FAQ

En cada fila, editar «Idea principal en negrita», «Párrafo de apoyo» y, sólo cuando sea necesario,
«Aclaración destacada». Son campos nativos de texto: no insertar etiquetas HTML. El template
aplica strong y párrafos; los campos opcionales vacíos no generan espacio visible. Reservar
la negrita para la respuesta directa, no para todo el texto. Cuerpo Geist/body-lg, 16 px y
leading 1.6; sin alturas fijas.
[Evidencia y recuperación](../../audits/public-site/2026-08-31-home-faq-typography.md).
