# Home: Greenhouse, productos y método — 2026-08-31

Revisión publicada por solicitud del operador mediante tres anotaciones del navegador. Alcance:
`proof-engine`, `ecosystem`, `method`, incluido el bloque de equipo dentro de Método.
Craft: copywriting + voz institucional Efeonce, continuidad con los titulares aprobados y beneficios
concretos para empresas medianas/grandes. Sin cambios de diseño, runtime ni schema.

## Decisiones editoriales

- **Greenhouse:** «Tu marketing, a la vista.» Describe consulta de avances y métricas. Se elimina
  la comparación genérica con otras agencias y el login como beneficio. El panel se identifica
  desde su barra superior y nombre de cuenta como ejemplo; se eliminan el estado «En vivo» y
  la actualización ficticia de dos minutos. Las cifras y geometría del gráfico permanecen intactas.
  «Evolución de ingresos» y periodos de comparación sustituyen atribución causal a Efeonce.
  `+7 pts` deja de compararse con una meta incompatible con el valor mostrado y se presenta como
  variación ilustrativa frente al periodo anterior. Nota visible: cifras/proyectos no corresponden
  a una cuenta real ni garantizan resultados; disponibilidad de métricas depende del servicio/fuentes.
- **Productos Efeonce:** «Tecnología para crear, conectar y decidir.» Se explica la utilidad de
  cada producto y se reemplazan «niveles» por agrupaciones de trabajo. Kortex se describe como CRM
  sobre HubSpot, conforme al portfolio canónico, no como repositorio genérico de conocimiento.
  Globe se describe como producción de imagen/video/audio con IA, dirección y revisión humana;
  se elimina «pronto será producto» y la afirmación no probada de uso diario en todas las cuentas.
  Se retira el argumento de pérdida de visibilidad al cambiar de proveedor. Su nuevo cierre es:
  «La tecnología tiene sentido cuando te ayuda a entender el trabajo y decidir qué sigue.»
- **Método:** «Cada paso tiene un propósito.» Cuatro pasos concretos: entender punto de partida,
  definir plan, ejecutar/dar seguimiento, medir/ajustar. Se elimina la garantía de que cada ciclo
  eleve resultados. Equipo: «Especialistas que conocen tu cuenta», con responsables, agenda y
  seguimiento; sin promesa de cero rotación, mismos miembros para siempre ni 24/7. El diagrama
  indica roles de ejemplo y aclara que las especialidades dependen del proyecto.

Se preservan las etiquetas públicas previas «En uso»/«En desarrollo», los nombres/marcas,
los logos y `show_launch_notice=no`. Esta revisión no verifica ni modifica disponibilidad comercial
o acceso de producto. El aviso oculto también pierde el claim de que ninguno está a la venta;
su texto remite a conversar sobre solución y disponibilidad, conservando su destino existente.
El resto de la Home, incluyendo hero y las cuatro secciones recién revisadas, queda intacto.

## Guardado y recuperación

Página `251731`, portada publicada, ownership `task-1358-home-claude-preview-v1`.
Widgets `70f00f7`, `861a6e9`, `655d8eb`; cuatro filas `steps` preservan identidad, orden y layouts.
77 asignaciones de texto. Inputs/evidencia local: `tmp/home-copy-second-20260831/`.
Snapshot durable WordPress: `_gh_home_second_three_copy_20260831_203207` (árbol, post,
settings, metas protegidas, plan y valores antes/después).
Hash previo: `2e7d1fd5b144c2183806c19cd38b456589a55fed17060395377dae63dd54c02e`.
Hash posterior: `784aa73f40513012bbfd935b1f1985d61e7b4edea9d5d9fd15ae7f8cc3cbe0b0`.

Preflight SSH y guard de permisos/identidad/hash. Controles registrados en Elementor validados
como texto/textarea antes de `Document::save()`. Árbol completo esperado y readback coinciden;
metas Ohio/Yoast/thumbnail/settings, opciones de portada y páginas de referencia sin cambios.
Purga Elementor/Kinsta aplicada. Segunda lectura de los tres widgets coincide exactamente con el patch.
El primer HTML público aún estaba en caché: recarga posterior de URL normal confirmó los textos
guardados; no se repitió el guardado para resolver caché.

Rollback: autorización y nuevo guard de drift; recuperar únicamente los campos afectados desde
`edits`/`elements` del snapshot y guardar por `Document::save()`. No restaurar otros cambios
posteriores ni escribir `_elementor_data` directamente. No hay archivos runtime que revertir.

## Verificación

- Contrato live Elementor PASS, sin fallos: 17 widgets, cero HTML, 416 controles raíz, seis repeaters.
- Browser real: las tres secciones completas inspeccionadas en escritorio 1280 y móvil 390;
  Ecosistema también a 878 px. Capturas `.captures/home-copy-second-20260831/`.
- Overflow horizontal de documento cero y ningún texto fuera de viewport móvil. El contenedor
  Proof registra 31 px internos por su halo decorativo preexistente `aria-hidden=true`, recortado
  deliberadamente; no es texto truncado. Rótulos de métricas, proyectos y roles se revisaron pintados.
- Sin envíos de formularios, cambios de enlaces ni alteración de valores numéricos/medios/diagramas.
  No se certifica guardado desde el editor autenticado ni se afirma impacto medido en conversión.
- Revisión de claims limitada a las secciones solicitadas; no cierra toda la Home ni TASK-1358.
