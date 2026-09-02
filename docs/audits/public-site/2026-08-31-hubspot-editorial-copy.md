# HubSpot: revisión editorial de licencias, ANAM, partner y reunión

Pedido del operador: aplicar `copywriting` a las cuatro áreas señaladas y revisar «práctica» en el resto
**de la landing**, no en otras páginas (aclaración expresa). URL `/servicios-contratar-hubspot/`, página 244079.

## Criterio editorial

Voz institucional Efeonce; lector que evalúa implementar/operar HubSpot. Framework FAB para licencias y
BAB para ANAM; CTA con pasos concretos para la reunión. Skills `copywriting` (overlay Efeonce, narrativa
de casos) y `greenhouse-ux-content-accessibility`. Se utilizó el contenido aprobado y la oferta canónica;
no se inventaron entrevistas, testimonios ni resultados. No se necesitó nuevo wireframe: no cambió el layout.

- Licencias: «Las licencias que necesitas. Un equipo para hacerlas funcionar.» Plan, usuarios, consumo
  estimado de IA, acompañamiento de compra y operación posterior. Se retiraron afirmaciones absolutas de
  paridad de precios, ahorro y consumo futuro exacto.
- ANAM: protagonista explícito, trabajo realizado y derivación humana explicados sin jerga de gobierno/handoff.
  Conserva 56% promedio, 76% mejor mes y barras 100%/44%; aclara que el desempeño depende de cada operación.
  **La edición no constituye nueva validación de esas métricas:** sigue pendiente localizar el respaldo
  detallado identificado en la [auditoría SEO](2026-08-31-hubspot-seo-aeo.md).
- Partner: nivel Gold descrito como pertenencia al programa, no como habilitación exclusiva para implementar.
  Enlace al directorio con etiqueta descriptiva; destino original intacto.
- Conversión: «Conversemos sobre tu proyecto HubSpot.» Una hora sin costo con un especialista, prioridades y
  próximos pasos para preparar propuesta. No promete una cotización final en la primera hora.
- Continuidad: se ajustaron Primer paso y FAQ para que describan el mismo alcance. Cuatro apariciones de
  «práctica» como jerga interna eliminadas; revisión limitada a los once módulos de esta landing.
- Aviso breve de datos alineado con el copy del formulario canónico: «Usamos tus datos para revisar y
  responder esta solicitud.» No se modificaron consentimiento, política vinculada, campos ni procesamiento.

## Implementación y límites

51 valores de texto: 49 campos raíz y 2 respuestas FAQ. Guardado nativo `Elementor Document::save`.
Solo cinco schemas de widgets desplegados: licensing, proof-ledger, conversion, assessment, faq.
Ninguna edición de templates, CSS, JS, logos, Media, anchors, formulario, header/footer o metadata SEO.
Los saltos de línea y la altura natural del contenido pueden variar con la nueva redacción.
Home, Creative y AEO conservaron hashes. Sin commit/push ni release de Greenhouse.

El copy se mantiene en `scripts/public-website/hubspot-editorial-copy.json`; su adapter CJS se aplica
**después** del adaptador de marcas durante la compilación. Así el export original queda intacto y una
regeneración no recupera el texto anterior. Los campos siguen editables en Elementor; un nuevo despliegue
de defaults no reemplaza ediciones guardadas por el editor.

## Publicación y verificación

- Snapshot: `_gh_hubspot_copy_20260831_111837`.
- Backup de archivos: `/tmp/eo-hubspot-before-20260831-112012.tar`.
- Hash Elementor antes: `0bd64d3e7a9026f099ce0114c9a5bae1cec0e8d95a3082b6f4b4d49d5f401e09`.
- Hash después: `be2dad7df7a986d037ce809c2150b05ffa33d92f4c3936f92c8b3ce5711bd1db`.
- Manifest: [cinco schemas](2026-08-31-hubspot-editorial-copy-manifest.json).
- PHP: PASS 190 campos editables/escaped, controles nativos y orden de repetidores.
- Playwright enfocado: preview sobre el shell público y readback anónimo normal; se necesita inspección de
  DOM exacto, errores JS y preservación del Web Component, fuera del escenario GVC Greenhouse autenticado.
  Evidencia visual en `.captures/hubspot-copy-20260831/`; desktop 1414, tablet 878 y móvil 390 px.
- La primera lectura tras purga aún devolvió HTML anterior de caché. No se reejecutó la mutación.

Rollback: restaurar **por guardado nativo** los valores anteriores desde el snapshot (manteniendo imagen
principal/settings) y los cinco archivos del backup, después de comprobar que no haya ediciones posteriores.
Purgar caché y verificar el URL anónimo. No escribir `_elementor_data` directamente.

Resultado final: **PASS público** a las 11:22:45 UTC. Doce capturas/estados (cuatro áreas × tres anchos),
texto completo presente, cero «práctica», FAQ y navegación por teclado operativas, cero errores JS.
Readback nativo: árbol exactamente igual al anterior salvo los 51 campos definidos; cinco hashes de schemas
verificados. SEO: grafo, sitemap y redirecciones PASS. [Evidencia](2026-08-31-hubspot-editorial-copy-evidence.json).

El control del shell normaliza únicamente sufijos aleatorios de IDs del menú Ohio y el valor dinámico del
campo antispam Akismet; después header/footer coinciden, y el formulario de la landing coincide sin normalización.
Durante scroll/cambio de viewport se observó un ancho transitorio en el shell global que desaparece al terminar
la transición; las capturas y pruebas de overflow se hacen al estabilizarse (máximo 8 s), sin ocultar elementos
ni cambiar CSS. No se certifica aquí la ausencia de ese efecto durante cada frame de la animación global.

Gates locales: PHP y sintaxis JS PASS; `qa:gates --changed --agent codex` ejecutado. `docs:closure-check`
conserva dos avisos del WIP previo (project context y registro de skills), sin contrato global nuevo en este cambio.
`docs:context-check:strict`: 0 errores/advertencias. No se envió ningún formulario ni se creó un lead.
