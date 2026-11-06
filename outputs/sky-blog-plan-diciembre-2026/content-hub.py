"""Fichas del lote de diciembre 2026 para el Content Hub de SKY (Estado «Idea»).

    python3 outputs/sky-blog-plan-diciembre-2026/content-hub.py   # escribe content-hub-fichas.json

Fuente: docs/services/sky-blog-seo/LOTE_DICIEMBRE_2026_PLAN.md (06-11-2026).
"""
import json
import os

B = 'https://blog.skyairline.com'
VALENTINA = 'user://3c2d872b-594c-81f1-826c-0002c1814e08'
CAT = 'ruta Activa en «Precios y Rutas SKY» (revisado el 06-11-2026)'
SERV = ('confirmar con Natalia que esta guía de servicio cabe en el blog (en noviembre SKY rechazó cambio de '
        'vuelo, mascotas y bebé) y redactar sólo con el Centro de Ayuda vigente.')
SERP = 'validar el SERP (el plan sólo midió volumen) y confirmar traslados con fuentes oficiales.'

# id, icono, título, temática, formato, fecha, canónica, 301, lector, conexión, métrica, enfoque, enlaces, antes
R = [
    ('R1', '🪪', 'Documentos para viajar en avión: qué piden en vuelos nacionales e internacionales (también para menores)',
     'Planificación de viaje', 'Artículo', '2026-12-03', '/documentos-viaje/', [], 'Chile y Perú (49 % cada uno)',
     'vuelos nacionales e internacionales de Chile y Perú', '1.271 clics en nov–dic 2025 y 1.736 en ene–feb 2026; 14.745 impresiones en ago–sep 2026 (CTR 2,7 %)',
     'Qué documento pide cada tipo de vuelo, con un bloque para menores que viajan solos o con un solo padre.',
     'Documentos para viajar a Argentina desde Chile y Vacunas para Brasil (este lote).', SERV),
    ('R2', '✈️', 'Primer viaje en avión: las dudas más comunes resueltas paso a paso',
     'Planificación de viaje', 'Artículo', '2026-12-18', '/viajes-avion/', [], 'Chile (60 %) · Perú (32 %)',
     'servicio, sin ruta única', '781 / 1.094 clics (nov–dic 2025 / ene–feb 2026); 46.591 impresiones con CTR 0,9 %',
     'El recorrido de quien vuela por primera vez en verano, del check-in a la llegada.',
     'Check-in SKY y Líquidos en el avión (noviembre); Cómo elegir el mejor asiento (este lote).', SERV),
    ('R3', '💉', '¿Necesitas vacunas para viajar a Brasil? Requisitos vigentes',
     'Planificación de viaje', 'Artículo', '2026-12-02', '/vacunas-brasil/', [], 'Chile (55 %) · Perú (28 %)',
     f'Santiago/Lima–Río, São Paulo, Florianópolis y Salvador, {CAT}', '495 / 607 clics; 16.659 impresiones (CTR 1,5 %)',
     'Qué vacunas exige o recomienda Brasil hoy, según desde dónde viajes.',
     'Viajar a Brasil desde Chile (noviembre); Florianópolis, Ilha Grande y Praia do Forte (este lote).',
     'verificar los requisitos con la autoridad sanitaria vigente; no dar recomendaciones médicas.'),
    ('R4', '🌋', 'Cómo llegar a Pucón en avión: vuelo a Temuco y traslado',
     'Destinos', 'Artículo', '2026-12-07', '/se-puede-llegar-en-avion-a-pucon/', ['/como-ir-de-santiago-a-pucon-sin-preocupaciones/'],
     'Chile (89 %)', f'Santiago–Temuco, {CAT}', '483 / 841 clics; 17.094 impresiones (CTR 1,5 %); valor en Google Ads US$ 116',
     'Vuelo a Temuco y cómo seguir a Pucón en temporada de lagos.', 'Lugares turísticos de Chile (este lote).',
     'confirmar opciones y tiempos de traslado Temuco–Pucón con fuentes oficiales.'),
    ('R5', '🗺️', 'Los mejores lugares turísticos de Chile para este verano, de norte a sur',
     'Destinos', 'Artículo', '2026-12-14', '/lugares-turisticos-chile/', [], 'Chile (31 %) · Perú (17 %) · Argentina (8 %)',
     f'rutas domésticas de Chile, {CAT}', '139 / 149 clics; 2.467 impresiones (CTR 0,2 %); 1.365 sesiones antes de migrar',
     'Un recorrido por zonas con un destino de verano por región, todos con vuelo SKY.',
     'Pucón, Chiloé, Hornopirén, Torres del Paine, Tongoy, Dichato y Capillas de Mármol (este lote).',
     'incluir sólo destinos con ruta Activa.'),
    ('R6', '🛬', 'Aeroparque o Ezeiza: a cuál llegar en Buenos Aires y cómo ir al centro',
     'Planificación de viaje', 'Artículo', '2026-12-09', '/aeropuertos-en-buenos-aires/', [], 'Chile (34 %) · Perú (19 %)',
     f'Santiago/Lima–Buenos Aires (AEP/EZE), {CAT}', '467 / 544 clics; 35.187 impresiones (CTR 0,65 %)',
     'Diferencias entre los dos aeropuertos y cómo llegar al centro desde cada uno.',
     'Playas cerca de Buenos Aires (noviembre); Documentos para viajar a Argentina (este lote).',
     'confirmar en el catálogo a qué aeropuerto opera cada ruta.'),
    ('R7', '🎠', 'Panoramas con niños en Santiago para las vacaciones de verano',
     'Destinos', 'Artículo', '2026-12-14', '/panoramas-para-ninos-en-santiago/', [], 'Chile (97 %)',
     f'rutas a Santiago, {CAT}', '16 / 1.573 clics; 22.670 impresiones (CTR 1,5 %)',
     'Panoramas para niños en enero y febrero, con horarios y precios vigentes.', '—',
     'verificar horarios y precios de temporada 2027.'),
    ('R8', '🛶', 'Semana Valdiviana 2027: fechas, noche valdiviana y cómo organizar el viaje',
     'Cultura', 'Artículo', '2026-12-21', '/semana-valdiviana/', [], 'Chile',
     f'Santiago–Valdivia, {CAT}', '17 / 1.642 clics; 2.999 impresiones (base chica)',
     'La fiesta de febrero: programa, noche valdiviana y cómo llegar.', 'Fin de semana en Valdivia con amigos.',
     'fecha oficial 2027; si no está publicada al redactar, dejar [Pendiente antes de publicar].'),
    ('R9', '💸', 'Países baratos para viajar desde Chile con SKY',
     'Destinos', 'Artículo', '2026-12-01', '/paises-baratos-para-viajar-desde-chile-con-sky/', [], 'Chile (99 %)',
     f'rutas internacionales desde Santiago, {CAT}', '368 / 538 clics; 34.549 impresiones (CTR 0,6 %); valor US$ 81',
     'Destinos internacionales de SKY donde el viaje rinde más desde Chile.', 'Dónde viajar en verano (este lote).',
     'incluir sólo países con ruta Activa desde Santiago; sin precios que caduquen.'),
    ('R10', '🍲', 'Platos típicos de Lima: qué probar y dónde',
     'Cultura', 'Artículo', '2026-12-22', '/platos-tipicos-de-lima/', [], 'Perú (80 %)',
     f'rutas a Lima, {CAT}', '370 / 653 clics; 17.875 impresiones (CTR 1,9 %); ~850 sesiones perdidas',
     'Qué probar en Lima y en qué barrios encontrarlo.', 'Playas de la Costa Verde (este lote).', '—'),
    ('R11', '🏝️', 'Las mejores playas de Florianópolis según tu tipo de viaje',
     'Destinos', 'Artículo', '2026-12-09', '/mejores-playas-de-florianopolis/', ['/florianopolis-playas/', '/floripa/', '/florianopolis/'],
     'Argentina (44 %) · Chile (35 %)', f'Santiago–Florianópolis, {CAT}', '141 / 244 clics; 6.186 impresiones (CTR 0,3 %); de 34,5 a 0,4 sesiones por día',
     'Playas por tipo de viajero: familias, surf, vida nocturna y calma.', 'Vacunas para Brasil (este lote).',
     'revisar también /viaje-a-florianopolis/ (hoy 404) para el 301.'),
    ('R12', '📅', 'Cuándo comprar pasajes baratos: días, temporadas y alertas',
     'Planificación de viaje', 'Artículo', '2026-12-02', '/comprar-pasajes-baratos/',
     ['/pasajes-de-avion-baratos/', '/vuelos-baratos/', '/pasajes-al-mejor-precio/', '/encontrar-pasajes-al-mejor-precio/', '/pasajes-aereos-baratos/',
      '/tips-para-encontrar-vuelos-baratos/', '/claves-para-comprar-pasajes-4-tips-para-encontrar-precios-convenientes/',
      '/4-tips-para-comprar-boletos-a-precios-mas-convenientes/', '/donde-comprar-un-pasaje-de-avion/'],
     'Perú (39 %) · Chile (34 %)', 'servicio, sin ruta única', '220 / 310 clics; 31.388 impresiones (CTR 0,8 %); une 10 URL en una',
     'Cuándo conviene comprar, cómo usar alertas y qué mirar en la tarifa.', 'Cómo comprar tu pasaje en línea (este lote).', SERV),
    ('R13', '🌧️', 'Aeropuerto de Castro (Mocopulli): cómo llegar y qué hacer en Chiloé',
     'Destinos', 'Artículo', '2026-12-15', '/aeropuerto-chiloe/', [], 'Chile (91 %)',
     f'Santiago–Castro, {CAT}', '273 / 616 clics; 8.861 impresiones (CTR 2,0 %); valor en Google Ads US$ 181, el mayor del lote',
     'Del aeropuerto a Castro y lo que conviene ver en la isla.', 'Curanto tradicional en Chiloé; Muelle de las Almas y Cucao (este lote).', '—'),
    ('R14', '🇦🇷', 'Documentos para viajar a Argentina desde Chile',
     'Planificación de viaje', 'Artículo', '2026-12-04', '/documentos-que-necesitas-para-viajar-a-argentina-desde-chile/', [],
     'Chile (99 %)', f'Santiago–Buenos Aires, Mendoza y Bariloche, {CAT}', '317 / 654 clics; 15.138 impresiones (CTR 1,5 %)',
     'Qué documentos pide Argentina a chilenos y residentes, también para menores.',
     'Aeroparque o Ezeiza y Documentos para viajar en avión (este lote).', 'verificar requisitos con fuentes oficiales vigentes.'),
    ('R15', '💻', 'Cómo comprar tu pasaje en línea en SKY de forma segura',
     'Planificación de viaje', 'Tutorial', '2026-12-28', '/pasaje-en-linea/', ['/pasajes-aereos-en-linea/'], 'Perú (63 %) · Chile (22 %)',
     'servicio, sin ruta única', '353 / 316 clics; 27.867 impresiones (CTR 1,3 %)',
     'El paso a paso de la compra en skyairline.com y cómo reconocer un sitio falso.', 'Cuándo comprar pasajes baratos (este lote).', SERV),
    ('R16', '🏖️', 'Cómo ir de Montevideo a Punta del Este y qué playa elegir',
     'Destinos', 'Artículo', '2026-12-10', '/punta-del-este-montevideo/', ['/punta-del-este-playas/', '/punta-del-este-sky/'],
     'Chile (42 %) · Argentina (19 %) · Uruguay (10 %)', f'Santiago–Montevideo, {CAT}', '181 / 268 clics; 27.766 impresiones (CTR 0,5 %)',
     'Traslado desde Montevideo y una playa para cada tipo de viaje en temporada alta.', 'Dónde viajar en verano (este lote).',
     'confirmar opciones de traslado vigentes.'),
    ('R17', '🌲', 'Hornopirén: cómo llegar desde Puerto Montt y qué hacer',
     'Destinos', 'Artículo', '2026-12-16', '/como-llegar-ahornopiren/',
     ['/hornopiren/', '/hornopiren-2/', '/donde-queda-hornopiren/', '/hornopiren-que-hacer-en-este-destino-natural-de-chile/', '/parque-hornopiren-que-ver-y-como-llegar/'],
     'Chile (98 %)', f'Santiago–Puerto Montt, {CAT}', '154 / 471 clics; 9.900 impresiones (CTR 0,5 %)',
     'La puerta de la Carretera Austral: traslado, barcazas y qué hacer.', 'Lugares turísticos de Chile (este lote).',
     'confirmar horarios de barcaza de la temporada.'),
    ('R18', '💺', 'Cómo elegir el mejor asiento en el avión',
     'Planificación de viaje', 'Artículo', '2026-12-29', '/mejores-asientos-avion/', [], 'Chile (57 %) · Perú (31 %)',
     'servicio, sin ruta única', '187 / 196 clics; 8.784 impresiones (CTR 0,7 %); ~570 sesiones perdidas',
     'Qué asiento conviene según el viaje y cómo elegirlo en SKY.', 'Primer viaje en avión (este lote).', SERV),
    ('R19', '🌦️', 'Mejor época para viajar a Tarapoto: clima y lluvias mes a mes',
     'Planificación de viaje', 'Artículo', '2026-12-23', '/mejor-fecha-para-viajar-a-tarapoto/', [], 'Perú (97 %)',
     f'Lima–Tarapoto, {CAT}', '168 / 281 clics; 6.851 impresiones (CTR 0,8 %)',
     'Lluvias de diciembre a marzo y cómo planificar el viaje según el mes.', 'Tarapoto en 3 días, Lamas y Laguna Azul de Sauce (noviembre).', '—'),
    ('R20', '☀️', 'Dónde viajar en verano: destinos para enero y febrero',
     'Destinos', 'Artículo', '2026-12-01', '/destinos-de-verano/',
     ['/verano-en-chile/', '/verano-en-chile-2/', '/verano-en-chile-3/', '/mejores-destinos-en-verano/', '/vacaciones-de-verano/'],
     'Argentina (38 %) · Uruguay (29 %) · Chile (21 %)', f'varias rutas, {CAT}', '18 / 17 clics; 32.866 impresiones (CTR 0,09 %, el peor del blog)',
     'Destinos de verano en Sudamérica con vuelo SKY, agrupados por tipo de viaje.', 'Países baratos, Florianópolis y Punta del Este (este lote).',
     'incluir sólo destinos con ruta Activa.'),
    ('R21', '🐚', 'Las mejores playas de Piura: Colán, Máncora, Vichayito y más',
     'Destinos', 'Artículo', '2026-12-07', '/playas-de-piura/', [], 'Perú (81 %)',
     f'Lima–Piura, {CAT}', '80 / 134 clics; 5.321 impresiones (CTR 0,4 %)',
     'La página que reparte al lector entre las playas de Piura.', 'Playa Colán y Máncora, Vichayito, Punta Sal o Zorritos (noviembre).', '—'),
    ('R22', '🏔️', 'Cómo ir de Puerto Natales a Torres del Paine',
     'Destinos', 'Artículo', '2026-12-16', '/puerto-natales-a-torres-del-paine/',
     ['/parque-nacional-torres-del-paine/', '/parque-nacional-torres-del-paine-2/', '/parque-nacional-torres-del-paine-3/', '/trekking-en-torres-del-paine/'],
     'Chile (63 %, base chica)', f'Santiago–Puerto Natales, {CAT}', '89 / 140 clics; 4.406 impresiones (CTR 0,5 %); posición 25',
     'Traslado al parque, entradas y qué ver en el camino en temporada alta.', 'Isla Magdalena y Fuerte Bulnes (este lote).',
     'ruta de temporada: confirmar fechas de operación con Paid/Ad Ops.'),
    ('R23', '🦆', 'Laguna de Paca: dónde queda y cómo visitarla desde el aeropuerto de Jauja',
     'Destinos', 'Artículo', '2026-12-23', '/laguna-de-paca/', [], 'Perú (98 %)',
     f'Lima–Jauja, {CAT}', '13 / 30 clics; 7.981 impresiones (CTR 0,13 %)',
     'La laguna a minutos del aeropuerto de Jauja: cómo llegar y qué hacer.', 'Huaytapallana y el Valle del Mantaro (este lote).', '—'),
    ('R24', '🌊', 'Playas de la Costa Verde en Lima: cuál elegir y cómo llegar',
     'Destinos', 'Artículo', '2026-12-11', '/circuito-de-playas-de-la-costa-verde/', ['/costa-verde/', '/playas-de-lima/', '/playas-de-lima-2/'],
     'Perú (base chica)', f'rutas a Lima, {CAT}', '14 / 126 clics; 8.353 impresiones (CTR 0,3 %)',
     'Las playas de la Costa Verde para el verano limeño y cómo llegar.', 'Platos típicos de Lima (este lote).', '—'),
    ('R25', '🧶', 'Qué hacer en Juliaca antes de seguir a Puno',
     'Destinos', 'Artículo', '2026-12-17', '/viaje-a-juliaca/', [], 'Perú (90 %)',
     f'Lima–Juliaca, {CAT}', '51 / 101 clics; 3.546 impresiones (CTR 0,14 %)',
     'Juliaca como parada antes de Puno, en la previa de la Candelaria.', 'Lago Titicaca desde Juliaca y Candelaria (noviembre); Sillustani y Lampa (este lote).', '—'),
]

# id, icono, título, temática, fecha, keyword, secundarias, lector, conexión, enfoque, enlaces, antes extra
N = [
    ('N1', '🏖️', 'Mollendo y las playas de Arequipa: cómo llegar y qué playa elegir', 'Destinos', '2026-12-01',
     '«mollendo» 40.500 búsquedas al mes en Perú (pico ene–feb: 90.500)', 'playas de arequipa · playa mejía · playas de camaná', 'Perú',
     'Lima–Arequipa', 'Las playas de Arequipa desde el aeropuerto: Mollendo, Mejía y Camaná.', 'Lugares turísticos de Arequipa y Mirador de Yanahuara (noviembre).', ''),
    ('N2', '🐟', 'Tongoy y Guanaqueros: playas a una hora del aeropuerto de La Serena', 'Destinos', '2026-12-02',
     '«tongoy» 27.100 búsquedas al mes en Chile (pico ene–feb: 74.000)', 'guanaqueros 14.800 · playa totoralillo · la herradura', 'Chile',
     'Santiago–La Serena', 'Dos playas a una hora del aeropuerto: cómo llegar y cuál elegir.', 'Lugares turísticos de Chile (este lote).', ''),
    ('N3', '🌉', 'Muelle de las Almas y Cucao: cómo visitarlos desde Castro', 'Destinos', '2026-12-07',
     '«muelle de las almas» 9.900 búsquedas al mes en Chile (pico feb: 33.100)', 'cucao 5.400 · parque nacional chiloé', 'Chile',
     'Santiago–Castro', 'La excursión desde Castro al muelle y al Parque Nacional Chiloé.', 'Aeropuerto de Castro (este lote); Curanto en Chiloé.',
     'confirmar el acceso y las tarifas vigentes del muelle.'),
    ('N4', '🌅', 'Dichato, Coliumo y las playas cerca de Concepción', 'Destinos', '2026-12-11',
     '«dichato» 18.100 búsquedas al mes en Chile (pico ene–feb: 40.500)', 'coliumo · playa colcura · playa ramuntcho', 'Chile',
     'Santiago–Concepción', 'Las playas al alcance del aeropuerto de Concepción y cuál elegir.', 'Lugares turísticos de Chile (este lote).', ''),
    ('N5', '🛥️', 'Capillas de Mármol: cómo llegar a Puerto Río Tranquilo desde Balmaceda', 'Destinos', '2026-12-15',
     '«capillas de mármol» 2.900 búsquedas al mes en Chile (pico ene: 5.400)', 'puerto río tranquilo · cuevas de mármol', 'Chile (también Argentina)',
     'Santiago–Balmaceda', 'El camino desde Balmaceda y cómo es la navegación a las capillas.', 'Hornopirén (este lote).', ''),
    ('N6', '🐧', 'Isla Magdalena y Fuerte Bulnes: dos salidas de medio día desde Punta Arenas', 'Destinos', '2026-12-16',
     '«fuerte bulnes» 5.400 búsquedas al mes en Chile (pico ene–feb: 8.100)', 'isla magdalena 2.400 · pingüinera', 'Chile',
     'Santiago–Punta Arenas', 'Dos salidas de medio día: la pingüinera y el fuerte histórico.', 'Torres del Paine (este lote).',
     'ruta de temporada: confirmar fechas de operación con Paid/Ad Ops.'),
    ('N7', '🌴', 'Ilha Grande desde Río de Janeiro: cómo llegar, Lopes Mendes y cuántos días quedarse', 'Destinos', '2026-12-09',
     '«ilha grande» 3.600 búsquedas al mes en Chile (pico ene: 5.400); 12.100 en Argentina', 'isla grande brasil · lopes mendes', 'Chile y Perú',
     'Santiago/Lima–Río de Janeiro', 'Traslado desde Río, la playa Lopes Mendes y cuántos días quedarse.', 'Vacunas para Brasil (este lote); Paraty.', ''),
    ('N8', '🐢', 'Praia do Forte: escapada de un día desde Salvador de Bahía', 'Destinos', '2026-12-10',
     '«praia do forte» 2.900 búsquedas al mes en Chile (pico ene: 4.400); 14.800 en Argentina', 'proyecto Tamar', 'Chile',
     'Santiago–Salvador', 'Cómo llegar desde Salvador y qué hacer en un día.', 'Vacunas para Brasil (este lote).', ''),
    ('N9', '🏄', 'Playas de Trujillo: Huanchaco, Las Delicias y Salaverry según tu tipo de viaje', 'Destinos', '2026-12-03',
     '«playa salaverry» 4.400 búsquedas al mes en Perú (pico ene: 9.900)', 'playa las delicias · playas de trujillo', 'Perú',
     'Lima–Trujillo', 'Tres playas cerca de Trujillo y para quién conviene cada una.', '—', ''),
    ('N10', '🏜️', 'Playas de Tacna: Los Palos, Boca del Río y Arena Blanca', 'Destinos', '2026-12-04',
     '«playa los palos» 1.600 búsquedas al mes en Perú (pico ene–feb: 4.400)', 'playas de tacna · boca del río', 'Perú',
     'Lima–Tacna', 'Las playas de Tacna para el verano y cómo llegar desde la ciudad.', 'Lugares turísticos de Tacna (noviembre).', ''),
    ('N11', '🗿', 'Sillustani y Lampa: qué hacer cerca del aeropuerto de Juliaca', 'Destinos', '2026-12-17',
     '«sillustani» 6.600 búsquedas al mes en Perú (pico feb: 8.100)', 'chullpas de sillustani · lampa puno', 'Perú',
     'Lima–Juliaca', 'Dos visitas cerca del aeropuerto de Juliaca, antes o después de Puno.', 'Lago Titicaca y Candelaria (noviembre); Qué hacer en Juliaca (este lote).',
     'confirmar que el texto de Titicaca de noviembre no les dedica un bloque.'),
    ('N12', '🎭', 'Carnaval ayacuchano 2027: qué ver, cuándo es y cómo organizar el viaje', 'Cultura', '2026-12-22',
     '«carnaval ayacuchano» 5.400 búsquedas al mes en Perú (pico feb: 8.100)', 'carnaval de ayacucho 2.900', 'Perú',
     'Lima–Ayacucho', 'Comparsas, fechas de febrero y cómo reservar a tiempo.', 'Retablos ayacuchanos, Vilcashuamán y Cómo llegar a Ayacucho; Carnavales en Perú (este lote).',
     'fecha oficial 2027; si no está publicada al redactar, dejar [Pendiente antes de publicar].'),
    ('N13', '🕯️', 'Semana Santa en Ayacucho 2027: procesiones, fechas y cómo reservar a tiempo', 'Cultura', '2026-12-28',
     '«semana santa en ayacucho» 2.900 búsquedas al mes en Perú (pico mar: 9.900)', 'semana santa 2027 6.600', 'Perú',
     'Lima–Ayacucho', 'Las procesiones del 21 al 28 de marzo de 2027 y por qué reservar con anticipación.', 'Carnaval ayacuchano (este lote); Retablos ayacuchanos.',
     'programa oficial 2027; si no está publicado al redactar, dejar [Pendiente antes de publicar].'),
    ('N14', '🎉', 'Carnavales en Perú 2027: calendario y dónde vivirlos', 'Cultura', '2026-12-21',
     '«carnavales en peru» 1.000 búsquedas al mes en Perú (pico ene–feb: hasta 3.600)', 'cuándo es carnavales en perú · carnaval de arequipa 2.900', 'Perú',
     'varias rutas domésticas de Perú', 'El calendario de febrero de 2027 y una ciudad para cada carnaval.', 'Carnaval de Cajamarca y Candelaria (noviembre); Carnaval ayacuchano (este lote).',
     'fechas oficiales 2027; si no están publicadas al redactar, dejar [Pendiente antes de publicar].'),
    ('N15', '🏔️', 'Huaytapallana y el Valle del Mantaro: escapadas desde el aeropuerto de Jauja', 'Destinos', '2026-12-23',
     '«huaytapallana» 4.400 búsquedas al mes en Perú', 'valle del mantaro 3.600 · torre torre', 'Perú',
     'Lima–Jauja', 'El nevado y el valle como escapadas desde Jauja y Huancayo.', 'Laguna de Paca (este lote).',
     'incluir precauciones de altura con fuentes oficiales.'),
]

PLAN = 'diciembre de 2026; fecha tentativa, sujeta a aprobación editorial y de SKY.'
FOOT = 'Lote de diciembre 2026 del blog (plan del 06-11-2026). Idea de calendario; no constituye un artículo redactado.'


def rewrite(r):
    rid, icon, title, tema, fmt, date, url, merge, lector, con, metric, focus, links, antes = r
    full = B + url
    work = f'optimización de [{full[8:]}]({full})'
    if merge:
        work += ', uniendo con 301 ' + ', '.join(merge)
    lines = [
        '## Tema y enfoque', '', focus, '',
        f'- <b>Tipo de trabajo:</b> {work}.',
        f'- <b>Search Console del blog:</b> {metric}.',
        f'- <b>País del lector:</b> {lector}.',
        f'- <b>Conexión:</b> {con}.',
    ]
    if links != '—':
        lines.append(f'- <b>Enlaces internos:</b> {links}')
    lines.append(f'- <b>Planificación:</b> {PLAN}')
    if antes != '—':
        lines.append(f'- <b>Antes de redactar:</b> {antes[0].upper() + antes[1:]}')
    lines += ['', f'{FOOT} Pieza {rid}.']
    props = {
        'Artículo': title, 'Estado': 'Idea', 'Trabajo SEO': 'Optimizar URL existente', 'Temática': tema,
        'Tipo': '["Publicación de blog"]', 'Formato': fmt, 'Enlace': full, 'Responsable': f'["{VALENTINA}"]',
        'date:Fecha de publicación:start': date, 'date:Fecha de publicación:is_datetime': 0,
    }
    return {'icon': icon, 'properties': props, 'content': '\n'.join(lines)}


def new(n):
    nid, icon, title, tema, date, kw, sec, lector, route, focus, links, extra = n
    antes = SERP[0].upper() + SERP[1:]
    if extra:
        antes += ' ' + extra[0].upper() + extra[1:]
    lines = [
        '## Tema y enfoque', '', focus, '',
        '- <b>Tipo de trabajo:</b> artículo nuevo (el blog no tiene una guía de este tema).',
        f'- <b>Búsqueda principal:</b> {kw} (DataForSEO, 06-11-2026).',
        f'- <b>Secundarias:</b> {sec}.',
        f'- <b>País del lector:</b> {lector}.',
        f'- <b>Conexión:</b> {route}, {CAT}.',
    ]
    if links != '—':
        lines.append(f'- <b>Enlaces internos:</b> {links}')
    lines += [f'- <b>Planificación:</b> {PLAN}', f'- <b>Antes de redactar:</b> {antes}', '', f'{FOOT} Pieza {nid}.']
    props = {
        'Artículo': title, 'Estado': 'Idea', 'Trabajo SEO': 'Nuevo', 'Temática': tema,
        'Tipo': '["Publicación de blog"]', 'Formato': 'Artículo', 'Responsable': f'["{VALENTINA}"]',
        'date:Fecha de publicación:start': date, 'date:Fecha de publicación:is_datetime': 0,
    }
    return {'icon': icon, 'properties': props, 'content': '\n'.join(lines)}


pages = [rewrite(r) for r in R] + [new(n) for n in N]
assert len(pages) == 40 and all(p['properties']['date:Fecha de publicación:start'].startswith('2026-12') for p in pages)
out = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'content-hub-fichas.json')
json.dump(pages, open(out, 'w'), ensure_ascii=False, indent=1)
print(out, len(pages))
