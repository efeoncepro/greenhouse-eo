# Integridad — qué puede afirmar un deck, y cómo se entrega sin romperse

> **Un deck es un documento que alguien va a creer.** Si es client-facing, alguien va a **decidir**
> con él; si es contractual, alguien lo va a **puntuar** y después **exigir**.
>
> Esta es la parte de la skill que **no admite criterio estético**.

---

## Anti-fabricación — las 4 formas de mentir sin darse cuenta

### 1. La cifra sin procedencia

**Toda cifra client-facing lleva su `evidenceRef`.** De dónde salió, cuándo se midió, con qué método.
**Sin `evidenceRef`, la cifra no entra en la lámina.**

Y hay que decir **cuál es medida y cuál es ilustrativa**. Un rango ilustrativo **se rotula como
ilustrativo** — no se disfraza de medición.

> **El evaluador te va a googlear. La agencia que exagera una cifra y la agencia que miente son la
> misma agencia a los ojos de un comité.**

### 2. La geometría dibujada a mano

**Una barra cuyo ancho no sale de su dato es una barra que miente.** Si el gráfico de la plantilla
tiene anchos hardcodeados del prototipo y el composer solo cambia los NÚMEROS, la barra **sigue
midiendo lo del ejemplo** — exagerando o escondiendo la magnitud real.

> **En una oferta eso no es un bug de layout: es FABRICACIÓN GRÁFICA.**

**La geometría se deriva del dato. Siempre.** Ver [`composition.md`](composition.md).

### 3. La etiqueta que afirma algo que el eje no pinta

Un hito de timeline rotulado *"Semana 1"* que en realidad **cae en el cierre del Mes 1**. La lámina
**afirma una fecha falsa** en un documento contractual.

> **Un rótulo que no coincide con lo que el eje dibuja es fabricación**, aunque el layout esté
> perfecto. **Verifica los rótulos contra la geometría real, no contra tu intención.**

### 4. La cara que no existe

**El equipo va con FOTOS REALES. NUNCA caras generadas por IA.**

El evaluador **cruza el CV contra la persona**. Presentar una cara fabricada como parte del squad es
**tergiversación** — y en un proceso de licitación **no es un problema estético: es de integridad**.

Una persona **decorativa** puede ser IA. **Jamás presentada como "su equipo".**
**Si falta la foto de alguien, se pide la foto. No se fabrica.**

---

## El caso que fija la barra: Columbia

No es opinión de un crítico de diseño. Es el **Columbia Accident Investigation Board**, en su informe
oficial (Vol. 1, p. 191), sobre la lámina de PowerPoint que describía el daño al transbordador:

> *"Es fácil entender cómo un gerente sénior podría leer esta lámina de PowerPoint y **no darse cuenta
> de que trata una situación de riesgo vital**."*

Título tranquilizador. Seis niveles de jerarquía. Unidades cambiantes. **El dato crítico —que el
proyectil era ~640 veces más grande que lo probado— sepultado abajo.**

**Siete muertos.**

> **La lección permanente: una lámina puede ser técnicamente cierta y aun así ESCONDER lo que importa.
> El dato que decide va arriba, en el titular, con su magnitud. No sepultado en el nivel 6.**

---

## `internal` vs `client_facing` — la regla del audience

**Todo artefacto de una propuesta es `internal` o `client_facing`. Solo lo `client_facing` se
empaqueta.**

**NUNCA** promuevas un artefacto interno "porque parece útil". El diagnóstico interno y el blueprint
del squad llevan **loaded cost y piso de negociación** — entregarlos es **darle a la contraparte tu
estructura de costos**.

**Ante la duda, es `internal`.**

---

## Accesibilidad — puede ser ADMISIBILIDAD, no cortesía

**Esto es un hallazgo de 2026 que no estábamos mirando.**

| Jurisdicción | Qué exige |
|---|---|
| **EE.UU. — Section 508** | Los entregables de un contratista —y **nombra explícitamente las presentaciones**— deben conformar. **Un entregable no conforme puede ser RECHAZADO o remediado a costa del contratista.** Se exige VPAT antes de la aceptación |
| **UE — European Accessibility Act** | **Exigible desde el 28-jun-2025.** Se apoya en EN 301 549 → **WCAG 2.1 AA** para contenido digital y documentos |
| **PDF** | **PDF/UA-2 = ISO 14289-2:2024.** Árbol de **tags semántico**, **alt text**, **orden de lectura**, estructura navegable |

**Un PDF accesible necesita:** tags (headings, listas, tablas) · alt text · orden de lectura correcto
· compatibilidad con lector de pantalla.

> ⚠️ **Nuestro gap conocido:** el composer emite el PDF con **print-to-PDF de Chromium**. Casi con
> certeza sale **sin taguear**. Hoy, en Chile, probablemente no pasa nada. Pero es **una puerta
> cerrada** a cualquier licitación con exigencia de accesibilidad. **Declararlo, no esconderlo.**

> 🔴 **Y el argumento definitivo contra "que la IA haga el deck":** las herramientas que **rasterizan
> cada lámina como imagen** (NotebookLM/Gemini con Nano Banana Pro) producen un archivo **sin texto
> seleccionable, sin tags, sin alt, sin orden de lectura**. Para un organismo público sujeto a
> EAA/508, ese deck es **literalmente INADMISIBLE**. No es un argumento estético.

**Contraste:** WCAG 2.2 AA → **4,5:1** normal, **3:1** grande.
🚫 **Mito: "WCAG exige 24pt".** **No fija tamaño mínimo de fuente.** Los 24pt son buena práctica de
proyección, no norma.

---

## Entrega — el archivo que se rompe en el equipo del receptor

### El peso: **el límite lo fijan LAS BASES, no el portal**

> 🚫 **Mito: "Mercado Público tiene un límite de 20 MB".** **No existe límite universal publicado.**
> ChileCompra dice literalmente que revises *"los requisitos señalados en **las bases de licitación**
> (peso, tipo y formato)"*.
>
> **Leer las bases y diseñar contra ESE número es un paso del checklist, no una nota al pie.**

**Por email**, el techo real es **~15 MB de archivo**, no 20:

- Gmail: **25 MB** · Outlook.com: **~20 MB** · Exchange corporativo: configurable, **casi siempre
  capado muy por debajo**.
- **El límite que manda es el DEL RECEPTOR, no el tuyo.**
- **Base64 infla el adjunto ~33-40% en tránsito**: un PDF de 20 MB **viaja como ~27 MB**.

### Las fuentes: la causa #1 de que el PDF se vea distinto en la otra punta

**Fuente no embebida** → el lector sustituye por otra → **cambian los anchos de glifo y las
métricas** → **el layout se desplaza**. Texto fuera de su caja, títulos que saltan de línea, tablas
descuadradas. **Y tú nunca lo ves, porque en tu equipo la fuente sí está.**

⚠️ **Gap conocido del composer:** hoy Chromium **pide las fuentes por red** a Google Fonts. El render
**no es hermético**: **sin red, el deck sale con la tipografía de fallback.** Embeberlas cierra el
determinismo.

**En PPTX:** si el receptor no tiene tu tipografía, ve otra cosa. Si vas a mandar PPTX, **embeber
"todos los caracteres"**, no solo los usados (el subsetting rompe si alguien edita y agrega una tilde
o una ñ que no está en el subset).

### La matriz de entrega

| Canal | Formato | Por qué |
|---|---|---|
| **Licitación / organismo público** | **PDF, fuentes embebidas completas, tagueado, bajo el límite de LAS BASES** | Único formato que no depende del equipo del receptor y el único auditable por accesibilidad |
| **Enterprise B2B, el decisor lee solo** | **PDF ≤ 15 MB** | Techo efectivo del receptor + Base64 |
| **Cliente que va a editar/reusar** | **PPTX con fuentes embebidas (todos los caracteres)** | Si no, se rompe |
| **Deck vivo / con tracking** | link | ⚠️ **siempre acompañar de PDF**: muchos compliance corporativos **bloquean links externos** |

---

## Hard rules

- **NUNCA** una cifra client-facing sin `evidenceRef`. **Sin procedencia, no entra.**
- **NUNCA** geometría dibujada a mano. **Una barra sin dato es una barra que miente.**
- **NUNCA** un rótulo que afirme algo que el eje no pinta. **Verifica contra la geometría real.**
- **NUNCA** una cara de IA presentada como una persona real del equipo. **Se pide la foto.**
- **NUNCA** promuevas un artefacto `internal` a la entrega. **Ante la duda, es interno.**
- **NUNCA** inventes el límite de peso. **Sale de LAS BASES.**
- **NUNCA** entregues un PDF con fuentes no embebidas. **Lo que tú ves no es lo que él ve.**
- **NUNCA** entregues como único formato un deck rasterizado a imagen. **Es inadmisible bajo EAA/508**
  y no se puede remediar.
- **SIEMPRE** el dato que decide va **arriba, en el titular, con su magnitud**. **Columbia.**
