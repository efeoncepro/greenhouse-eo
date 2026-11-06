# Spec de imágenes por artículo — specs/<id>.json (fuente para la sesión de producción)

Copia LITERAL de los callouts insertados en Notion (si difieren, manda Notion y se corrige el JSON). Un archivo por artículo.

{
  "id": "zorritos",
  "notion_url": "https://app.notion.com/...",
  "titulo": "H1 del artículo",
  "slug": "/zorritos/",
  "mercado": "PE",
  "version": "v1 · 05/11/2026",
  "imagenes": [
    {
      "pieza": "N?_IMG-1",
      "rol": "portada",                       // portada | escena
      "posicion": "arriba del gancho, antes del TL;DR",
      "pregunta": "¿Dónde estoy?",
      "tipo": "A — Destino contextual",
      "modificadores": "POV del viajero · persona sola · escala amplia · luz · orienta",
      "registro": "D",                        // D | E
      "archivo": "zorritos-playa-....webp",
      "formato": "1408 × 768 px (11:6) · menos de 200 KB",
      "lazy": false,
      "alt": "…",
      "que_muestra": "…",
      "hora_clima": "…",
      "personas": "…",                        // si registro E: quién fotografía y hacia dónde mira cada persona
      "primer_plano": "…",                    // elemento real + borde, o «sin primer plano: razón»
      "ancla_pov": "frase literal del texto",
      "no": ["…"],
      "fidelidad": "lugar identificable → REF-01 real requerida: qué foto",
      "reutilizacion": "1200 × 630 y 1080 × 1080 del mismo maestro; qué debe sobrevivir"   // solo portada
    }
  ],
  "banner": {
    "pieza": "N?_BAN-1",
    "estado": "listo",                      // listo | bloqueado
    "motivo_bloqueo": null,
    "receta": "ruta.color",                 // ruta.color | ruta.foto
    "origen": {"iata": "LIM", "ciudad": "Lima"},
    "destino": {"iata": "TBP", "ciudad": "Tumbes"},
    "home_market": "PER",
    "url": "https://skyairline.com/flights/es/vuelos-desde-lima-a-tumbes",
    "ruta_verificada_el": "2026-11-05",
    "fuente": "Notion · Precios y Rutas SKY (🟢 Activa)",
    "titular": "…",
    "cta": "Ver vuelos a Tumbes",
    "archivo": "banner-ruta-lima-tumbes.webp",
    "alt": "…",
    "posicion": "después de «Lo que tienes que saber», antes de las preguntas frecuentes"
  },
  "descartes": ["escena descartada — motivo, en orden de prioridad"]
}
