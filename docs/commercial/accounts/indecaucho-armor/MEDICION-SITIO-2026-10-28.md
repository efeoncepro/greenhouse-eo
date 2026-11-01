# ARMOR EPPS — medición del sitio y su conexión con Kommo (auditoría 28/10/2026)

> **Tipo:** evidencia interna del expediente · **Fuente:** inspección de armorepps.com (HTML, `gtag.js` y solicitudes
> reales en navegador) el 28/10/2026 · **Alcance:** portada, contacto, una categoría y una ficha de producto.
> Sin acceso a GA4, Kommo ni cuentas publicitarias: lo que pasa dentro de ellas es inferencia.

## Qué hay

| Pieza | Hallazgo | Estado |
| --- | --- | --- |
| Plataforma | WordPress 7.1.3, Elementor Pro, tema `ruizarch`, All in One SEO 4.9.2 | Verificado |
| Etiqueta de Google | `GT-NGP9FL6D` instalada por **Site Kit by Google 1.160.1**; su único destino es la propiedad GA4 **`G-JQEMTBJ442`** | Verificado |
| Eventos GA4 | `page_view` y `scroll` (medición mejorada). El clic en el botón de WhatsApp genera un `click` de enlace saliente con `link_url = https://wa.me/593985540672` y `outbound = true` | Verificado en navegador |
| Conversiones | Ningún destino `AW-` (Google Ads), ni GTM, ni Insight Tag de LinkedIn, ni píxel de Meta. No sabemos si el `click` está marcado como evento clave en GA4 | Verificado (etiquetas) · desconocido (configuración de GA4) |
| Consentimiento | Sin banner ni modo de consentimiento (`gcd=13l3l3l3l1l1`: señales sin definir); cookies `_ga` y `_ga_JQEMTBJ442` desde la primera carga | Verificado |
| Formularios | Ninguno | Verificado |
| WhatsApp | Dos enlaces al mismo número de Ecuador: `wa.link/99s51i` (redirige a `api.whatsapp.com/send?phone=593985540672`) y `wa.me/593985540672`. Sin texto precargado ni referencia de origen | Verificado |
| Kommo | No hay script, widget, chat ni formulario de Kommo en las páginas revisadas | Verificado |

## Dónde se corta la cadena

1. La visita llega con sus UTM y GA4 la registra (página, sesión y fuente).
2. El clic en WhatsApp queda en GA4 como clic saliente, **sin identificar a la persona**.
3. La conversación entra a Kommo por WhatsApp **sin campaña, sin UTM, sin `gclid` ni `li_fat_id`**: Kommo sólo
   rellena UTM solo con anuncios Click-to-WhatsApp de Meta (ver `research-2026-10-27/04-medios-medicion-kommo.md` §4).
4. Por eso hoy no se puede unir «este anuncio» con «este lead» ni con «esta venta», ni devolver conversiones
   calificadas a Google Ads o LinkedIn.

## Qué hace falta (ya previsto en la preparación del piloto, días 1–14)

- GTM en el sitio con consentimiento (Consent Mode v2) y banner.
- Conversión de Google Ads e Insight Tag de LinkedIn.
- Landings por país y oferta con un microformulario o el Website Chat Button de Kommo, que guarde `utm_*`, `gclid` y
  `li_fat_id` en el lead (`crm_plugin.setMeta`), o un `wa.me` con código de referencia que una automatización de
  Kommo lea.
- Etapas de Kommo con «Calificado» definido por escrito, y retorno de conversiones offline a Google Ads y LinkedIn
  (por Zapier/Make o API: Kommo no lo trae nativo).
- Accesos: administrador de WordPress (o Site Kit), GA4 `G-JQEMTBJ442`, Kommo y las cuentas publicitarias.

## Pendiente de confirmar con ARMOR

- Quién administra GA4 `G-JQEMTBJ442` y si el clic de WhatsApp está marcado como evento clave.
- Plan de Kommo (campos personalizados, Salesbot, webhooks) y cuántos usuarios lo usan.
