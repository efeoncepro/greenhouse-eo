# Home — Cierre documental editorial · 2026-08-31

## Alcance

Consolidación solicitada por el operador después de ocho revisiones de la Home `251731` en
`https://efeoncepro.com/`. Este índice ordena decisiones y evidencia; no reemplaza los registros
de publicación ni afirma una nueva auditoría integral. Las revisiones fueron aplicadas mediante
controles nativos y el guardado canónico de Elementor; los cambios de schema/template/CSS viven
en el plugin `eo-elementor-widgets` del runtime público, no en el renderer Next.js de Greenhouse.

## Secuencia y decisiones que se conservan

| Revisión | Resultado | Evidencia y recuperación |
| --- | --- | --- |
| Hero | «Tu marketing debería mover tu negocio. No solo tu calendario.»; badge de agencia y tecnología; subrayado en fragmento central | [Hero y corrección SVG](2026-08-31-home-hero-copy.md) |
| Motor, Servicios e Integraciones | Capacidades y tareas concretas, sin sincronización ficticia ni promesa de una única base para todas las herramientas | [Cuatro secciones](2026-08-31-home-four-sections-copy.md) |
| Greenhouse, Productos y Método | Métricas ilustrativas identificadas; software explicado por su utilidad; pasos y responsabilidades concretos | [Tres secciones](2026-08-31-home-proof-products-method-copy.md) |
| Reencuadre y Comparación | «Tu equipo necesita un aliado. No otro proveedor que coordinar.»; tabla cualitativa con 24 celdas editables y nota de alcance | [Reencuadre y comparación](2026-08-31-home-reframe-comparison-copy.md) |
| FAQ y Agenda | Seis dudas de contratación; «¿Qué necesita lograr tu marketing?»; reunión sin prometer diagnóstico completo | [FAQ y Agenda](2026-08-31-home-faq-agenda-copy.md) |
| Tipografía FAQ | Idea principal, apoyo y aclaración opcional en campos separados; negritas selectivas y cuerpo de 16 px | [Jerarquía FAQ](2026-08-31-home-faq-typography.md) |
| Encabezado de comparación | «Con» + logo con alt «Efeonce», sin duplicación visual del nombre | [Encabezado](2026-08-31-home-comparison-label.md) |
| Problema | «Cuando todo va por separado, tu equipo paga el costo.»; tareas concretas de coordinación y diagrama identificado como ejemplo | [Problema](2026-08-31-home-problem-copy.md) |

El reencuadre «Que cada campaña deje algo más que entregables.» del primer pase fue sustituido
por solicitud del operador; se conserva en su audit como historia, no como copy aprobado vigente.
Los conteos 416 → 408 → 407 son checkpoints de cambios de controles: no deben homogeneizarse en
los registros anteriores. El último readback guardado contiene 17 widgets, cero widgets HTML,
407 controles raíz y seis repeaters. Los dos campos FAQ nuevos pertenecen a cada fila del repeater.

## Verificación de cierre y separación del commit

Lectura remota nueva, sin mutaciones: `verify-agency-elementor-contract.php` devuelve `failures=[]`,
17 widgets, 407 controles raíz y hash
`9aa8c770c0907edc5ad70f4489cccedb56cc03d0a7802e01eef0e2beee832562`.
Log local: `tmp/home-docs-closure-contract-20260831.txt`.

Los SHA256 remotos de los doce archivos finales de esta secuencia coinciden con el runtime local:
schema/template de Hero y Comparación, schema FAQ, seis templates de respuesta y CSS del módulo.
Evidencia: `tmp/home-docs-closure-20260831/live-hashes.txt`. Esta lectura confirma contenido y archivos;
no sustituye los límites de prueba visual y de editor indicados abajo.

El cierre solicitado versiona documentación y skills en `greenhouse-eo`, sin push. La base del plugin
público en el repositorio hermano contiene archivos previos sin seguimiento y trabajo ajeno: no se
incluye en este commit ni se afirma que los archivos publicados hayan quedado versionados allí.
La revisión SEO anterior queda fuera de este cierre editorial.

## Conciliación de evidencia local

Los siete `changes.json` posteriores al hero se cotejaron con su `after.txt` correspondiente:
72 + 77 + 48 + 33 + 18 + 1 + 23 = **272 asignaciones** coincidentes, incluidas filas por `_id`.
Esto verifica que los registros locales de las publicaciones corresponden a los planes guardados;
no sustituye una consulta nueva al CMS ni significa 272 valores únicos o todos diferentes.

Los hashes registrados forman esta secuencia sin saltos:

```text
Hero                  ce0dfc757a42043141e722c8fa3c100c00ec70e82556aa70c0d19888ce02c988
Cuatro secciones      2e7d1fd5b144c2183806c19cd38b456589a55fed17060395377dae63dd54c02e
Tres secciones        784aa73f40513012bbfd935b1f1985d61e7b4edea9d5d9fd15ae7f8cc3cbe0b0
Reencuadre/comparación df8b731b81c0495dfddac27e2b02c68faac3c47ff238fbb53b8be34bceeddb4f
FAQ/Agenda            7f709e28d551a737b6510e1929a3d45ee6bfccb4a6b5d01ffba6cf774b1210d6
Tipografía FAQ        98d7306b40f444023da5760cb700e0edd9c0b715635023c446658b6b7d77dec8
Con + logo            c2a63ede9e0a49cb5ebde3340200a0c16f6062f4845396e62863dbd97c2d12c8
Problema              9aa8c770c0907edc5ad70f4489cccedb56cc03d0a7802e01eef0e2beee832562
```

Los ocho directorios `.captures/home-*-20260831/` referidos en los audits existen localmente.
Capturas, planes y logs bajo `.captures/` y `tmp/` son evidencia local, no un paquete versionado ni
una garantía de retención. Cada audit conserva nombre de snapshot CMS y, cuando cambió runtime,
backup remoto temporal. Para recuperar, revalidar existencia, permisos y drift; nunca ejecutar un
writer histórico ni restaurar toda la Home para revertir una sola revisión.

## Límites que permanecen abiertos

- Guardado/reapertura manual en Elementor autenticado: no certificado por estas revisiones.
- Comparación móvil: gesto y foco verificados; desplazamiento por flechas no certificado.
- Servicios: la atenuación de tarjetas puede quedar dominada por opacidad inline de reveal;
  registrado en el primer pase, no corregido ni certificado aquí.
- No se enviaron formularios, correos ni reservas reales. No se afirma mejora medida en conversión,
  una nueva auditoría completa WCAG/CWV ni cierre de TASK-1358.
- No se verificó disponibilidad comercial de productos ni se convirtieron métricas ilustrativas
  en resultados de clientes. Las etiquetas de disponibilidad existentes quedaron preservadas.
- El hero y otras superficies pueden requerir una revisión adicional de claims; la limpieza de las
  secciones anotadas no certifica todas las afirmaciones del sitio ni del header/footer compartido.

Contrato vigente: [arquitectura](../../architecture/public-site/AGENCY_ELEMENTOR_MODULES_V1.md).
Operación: [manual](../../manual-de-uso/public-site/agency-elementor-preview.md).
Lectura funcional: [Home Elementor](../../documentation/public-site/agency-elementor-preview.md).

## Validación documental

Las seis parejas de skills/referencias modificadas son idénticas entre Codex y Claude, tanto en
working files como en el índice seleccionado. `git diff --cached --check` sin errores; QA gates
reconoce únicamente docs/task/skills. `ops:lint --changed`: task sin errores ni warnings; catorce
avisos de paridad epic-child preexistentes, fuera de esta revisión. Closure señala revisar lifecycle:
se comprobó que TASK-1358 conserva ubicación `to-do`, estado y `UI ready: no`; no se cambia su registro.
El contrato global de tipografía, AGENTS/CLAUDE y ADRs no necesitan cambios: se reutiliza el carril
público existente y los detalles específicos viven en la referencia editorial, no en reglas globales.
