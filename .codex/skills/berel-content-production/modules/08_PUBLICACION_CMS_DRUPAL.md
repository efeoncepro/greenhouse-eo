# 08 · Publicación en el CMS (Drupal)

> **Fuente de verdad:** **📤 Cómo subir un artículo (CMS Drupal)** (`4ed619156c0e4f6a89fb83b78ea6c0ad`),
> extraída de la capacitación del 21 de agosto de 2026.
> **El CMS de Berel es Drupal**: menos visual que WordPress, pero funciona con la misma lógica de
> bloques.

## El flujo, y su orden no negociable

**Redacción en Notion → revisión y aprobación del cliente en el Content Hub → carga al CMS.**
Un artículo no se sube si no está **aprobado por el cliente** en el Content Hub.

### Antes de empezar

- [ ] Artículo **aprobado por el cliente** en el Content Hub
- [ ] **Acceso al CMS** — URL, usuario y contraseña viven en la sección `Acceso CMS` de la wiki de
      Berel. 🔴 **Nunca copiar esas credenciales fuera de Notion, y jamás a este repo, a un log, a un
      commit ni a un prompt.**
- [ ] **Imágenes cargadas** en la carpeta de OneDrive del mes (p. ej. "Artículos de agosto"). La
      imagen de portada es la que **dice "portada" en el nombre del archivo**.

## A · Subir un artículo NUEVO

1. Menú superior → **Contenido → Añadir contenido → Artículo**.
2. Completar **Título** (**sin "Berel"**) y **Subtítulo** (el H1 que aparece en el documento de
   Notion).
3. Contenido por bloques:
   - El bloque más usado es **"Texto libre centrado"**.
   - **Copiar el texto directamente desde Notion y pegarlo:** conserva negritas, estructura de
     headings (H2, H3), viñetas y enlaces. **No hay que reformatear nada.**
   - Copiar **por tramos**: pegar texto hasta donde venga una imagen, y ahí frenar.
4. **Imágenes** — bloque **"Imagen full"**: seleccionar desde la carpeta de OneDrive y escribir un
   **texto alternativo** que describa la imagen **e incluya la keyword** (principal o semántica,
   según lo que tenga sentido para esa imagen — **es criterio, no automático**).
5. **Tablas:** seleccionarlas en Notion arrastrando con el puntero, copiarlas y pegarlas dentro de un
   bloque de texto libre centrado. Se arman correctamente y **conservan los enlaces a productos**.
6. 🔴 **Callouts de Notion: no se pegan bien en Drupal.** Reemplazarlos por el **emoji + el texto
   "Berel tip"** junto a él, y **eliminar cualquier etiqueta HTML residual** (p. ej. `aside`).
7. **Metatags** (panel derecho):
   - **Título:** **invertir el formato predeterminado** para que quede `Node:Title | Pinturas Berel`
     — el título del artículo **antes** de "Pinturas Berel".
   - **Meta descripción:** copiarla del documento de Notion (ya cumple las estadísticas necesarias).
     **Pegarla también en el campo `Resumen`.**
8. **Alias de URL:** **desmarcar siempre** "Generar alias de URL automático" y escribir el alias a
   mano.
9. **Portada:** agregar la imagen de portada con su texto alternativo (keyword incluida).
10. **Guardar con frecuencia.** El CMS saca de la edición al guardar y a veces falla; **es normal**.
11. Verificar el artículo publicado en la sección **Inspiración** de berel.com. Puede tardar unos
    minutos en aparecer por el servidor del cliente — **no es un error**.

## B · REESCRIBIR un artículo existente

1. **Contenido** → buscar el artículo por su nombre → **Editar**.
2. Mismo proceso que uno nuevo, pero **reemplazando** en vez de creando:
   - Reemplazar el **título** (el nuevo, sin "Berel") y el **subtítulo** (H1 de Notion). **Si un
     campo no está claro, mantener el original.**
   - Borrar los textos antiguos y pegar la reescritura desde Notion, por tramos.
   - **Borrar las imágenes antiguas una a una** y reemplazarlas por las nuevas de OneDrive.
3. 🔴 **Conservar siempre** el texto final **"Pinta con confianza, pinta con Berel"**.
4. **La imagen de portada va justo después del título** — por eso en Notion la imagen aparece en ese
   orden.
5. **No agregar:** el bloque de TikTok de Berel · ningún contenido marcado como **"no se publica"**
   en el documento de Notion (p. ej. banners extra).
6. Actualizar **metatags**: meta descripción nueva (también en `Resumen`) y título en formato
   `NoTitle | Pinturas Berel`.
7. 🔴 **Desmarcar "Generar alias de URL automático" también en reescrituras**, para que el CMS **no
   cambie la URL existente**. Cambiarla rompe los enlaces entrantes y el histórico de la URL.
8. Guardar / publicar y verificar en **Inspiración**.

## Reglas SEO transversales del CMS

- La **keyword principal** define el enfoque; las secundarias deben ser **keywords semánticas** que
  acompañen y hagan sentido con la principal.
- Los textos alternativos deben **describir la imagen + incluir una keyword** que tenga sentido en
  ese contexto. Criterio, no automatismo.
- 🔴 **Vocabulario de los buscadores mexicanos.** Berel **solo opera en México** y algunas palabras
  difieren de las nuestras → [`04_VOZ_Y_TONO_BEREL.md`](04_VOZ_Y_TONO_BEREL.md).
- Los **productos sugeridos** del artículo se agregan **solo cuando el cliente lo pide** (por ahora
  no aplica).

## Checklist rápido antes de publicar

- [ ] Contenido pegado completo, con headings y enlaces intactos
- [ ] Imágenes con texto alternativo + keyword
- [ ] Callouts convertidos a emoji + "Berel tip" (sin etiquetas HTML residuales)
- [ ] Tablas pegadas y con enlaces a productos funcionando
- [ ] Metatag de título en formato `NoTitle | Pinturas Berel`
- [ ] Meta descripción copiada de Notion (y en `Resumen`)
- [ ] Alias de URL manual (checkbox automático desmarcado)

## Por qué el `title` se audita después

El comportamiento por defecto del CMS **antepone la marca al title**, y eso consume los primeros
caracteres —los de mayor peso— y trunca pasando los 60. El paso 7 de arriba es **la corrección**;
la Fase 3 del ciclo es **la auditoría** de los artículos donde esa corrección no se aplicó
→ [`02_ANALISIS_AUDITORIA.md`](02_ANALISIS_AUDITORIA.md).

## Cross-links

- Manual completo del CMS (roles, tipos `R Artículo`/`R Tutorial`/`R Video`, webforms, taxonomías,
  alias, redirecciones 301) → `📘 Manual de Usuario · Berel Web CMS` (`37339c2fefe7800e91b2e65ae96e93e2`)
- Runbook de desindexación del subdominio backend de Drupal que canibaliza tráfico →
  `⭐ Cómo desindexar el subdominio backend` (`39139c2fefe780128300eafae5323d7c`)
- Estado del artículo al publicar → [`01_CICLO_MENSUAL.md`](01_CICLO_MENSUAL.md) (Fase 10)
