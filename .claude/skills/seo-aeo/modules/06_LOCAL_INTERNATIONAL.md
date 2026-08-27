# 06 · Local + Internacional / Multilingüe

> Carga para: Google Business Profile / local pack, NAP, reseñas, y estrategia
> multirregión/multilingüe (hreflang, ccTLD vs subdirectorio, localización).
> Relevante para Efeonce (Chile) y clientes Globe (Américas + mundo).
> Sello: as-of 2026-06.

## PARTE A — Local SEO

Aplica cuando el negocio tiene presencia física o sirve áreas geográficas
("agencia en Santiago", "servicio en {ciudad}").

### Google Business Profile (GBP) — el activo local central
- **Reclama y verifica** el perfil. Es el principal driver del "local pack" (mapa
  + 3 resultados) y de aparición en Maps.
- **Completitud:** categoría primaria correcta + secundarias, descripción,
  horarios, fotos, atributos, productos/servicios. Perfiles completos rinden más.
- **Reseñas:** volumen, frescura, rating y *respuestas del dueño* son señales
  fuertes. Pide reseñas sistemáticamente (sin incentivar falsas → contra
  políticas). Responde todas, también las negativas.
- **Posts y Q&A** del GBP mantienen el perfil activo.

### NAP y consistencia de citas
- **NAP** = Name, Address, Phone idénticos en todas partes (web, GBP,
  directorios, redes). La inconsistencia confunde a Google sobre la entidad
  local. Esto **también alimenta la entidad** (`03_EEAT_ENTITY.md`).
- **Citations** = menciones del NAP en directorios relevantes (locales y de
  industria). Calidad y consistencia > cantidad.

### On-page local
- Páginas por ubicación/servicio con contenido único (no plantilla vacía →
  riesgo de doorway pages, `ANTIPATTERNS.md`).
- Schema `LocalBusiness` con dirección, geo, horarios, `sameAs`.
- Señales de localidad en contenido (referencias reales a la zona, no token swap).

### Local + AEO
- Las consultas locales también pasan por IA ("mejor agencia de marketing en
  Santiago"). GBP completo + reseñas + NAP consistente + schema = recuperable
  también para respuestas IA locales.

## PARTE B — SEO Internacional / Multilingüe

Aplica cuando el sitio sirve múltiples países y/o idiomas. **Caso Globe:**
aerolíneas/bancos/manufactura en las Américas → multirregión + es/en/pt real.

### Decisión de estructura (la primera y más cara)

| Estructura | Ejemplo | Pros | Contras |
|---|---|---|---|
| **ccTLD** | `marca.cl`, `marca.com.br` | señal geo fortísima, confianza local | caro, autoridad fragmentada por dominio |
| **Subdirectorio** | `marca.com/cl/`, `/br/` | autoridad consolidada en un dominio, barato | señal geo más débil |
| **Subdominio** | `cl.marca.com` | separación clara | autoridad fragmentada (como ccTLD pero sin la señal geo fuerte) |

**Recomendación general 2026:** **subdirectorios** para la mayoría (consolidan
autoridad, más fáciles de gestionar), salvo que la marca local/legal exija ccTLD
(banca regulada a veces lo requiere). Decisión irreversible-cara → analizar bien.

### hreflang (lo que más se rompe)
- `hreflang` le dice a Google qué versión servir por idioma/región. Sintaxis:
  `<link rel="alternate" hreflang="es-CL" href="..."/>`.
- **Reglas duras:** (1) **bidireccional** — si A apunta a B, B debe apuntar a A;
  (2) **autorreferente** — cada página se incluye a sí misma; (3) códigos
  válidos ISO (idioma `es`, opcional región `es-CL`); (4) `x-default` para la
  versión fallback.
- Implementar en `<head>`, sitemap XML, o HTTP headers — uno solo, consistente.
- Errores típicos: hreflang a URLs `noindex`/redirigidas, no-retorno, códigos
  inventados (`es-LATAM` no existe). Audita con Semrush site audit o
  herramientas hreflang.

### Localización ≠ traducción
- **Traducción** = mismo texto en otro idioma. **Localización** = adaptar a la
  cultura, modismos, moneda, ejemplos, intención de búsqueda local. Google y los
  usuarios premian localización real.
- **Keyword research por mercado** — la gente busca distinto en cada país (es-CL
  ≠ es-MX ≠ es-ES). No asumas que el keyword chileno aplica en México.
- ⚠️ **Traducción automática sin revisión** = riesgo de baja calidad y posible
  spam. Revisión humana nativa en mercados que importan.

### Internacional + AEO
- Los motores IA responden en el idioma del usuario citando fuentes en ese
  idioma. Tener contenido localizado real (no traducido a máquina) te hace
  citable en cada mercado.
- La entidad de marca debe ser consistente cross-idioma (`sameAs`, descripción).

## Cómo priorizar
- **Local:** GBP completo + reseñas + NAP consistente es alto ROI y rápido.
- **Internacional:** la decisión de estructura primero (no se cambia barato);
  luego hreflang correcto; luego localización del contenido que más tráfico/
  negocio mueve por mercado.

> **Cross-refs:** entidad/NAP → `03_EEAT_ENTITY.md`. hreflang técnico →
> `01_SEO_TECHNICAL.md`. Doorway pages/traducción-spam → `ANTIPATTERNS.md`.
> Medir por mercado en GSC → `07_MEASUREMENT.md`.
