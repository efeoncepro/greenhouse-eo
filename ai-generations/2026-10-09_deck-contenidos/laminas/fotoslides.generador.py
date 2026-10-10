import sys,os,json
sys.path.insert(0,os.path.dirname(os.path.abspath(__file__)))
from lib import *
P=sys.argv[1]; B=json.load(open(sys.argv[2])); only=sys.argv[3:] 
def col(inner,w=640): return f'<div style="position: absolute; left: 140px; top: 120px; width: {w}px; display: flex; flex-direction: column">{inner}</div>'
def rows2(items,mt=34,mw=600):
    o=f'<div style="margin-top: {mt}px; display: flex; flex-direction: column; max-width: {mw}px">'
    for i,(ic,t,d) in enumerate(items):
        last='; border-bottom: 1px solid rgba(114, 222, 216, 0.16)' if i==len(items)-1 else ''
        o+=f'<div style="padding: 13px 0; border-top: 1px solid rgba(114, 222, 216, 0.16){last}; display: flex; align-items: center; gap: 18px"><img src="/_blob/{IC[ic]}" alt="" style="width: 46px; height: 46px; flex-shrink: 0"><div><div style="{BRI}; font-size: 27px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 4px; {POP}; font-size: 16px; font-weight: 300; line-height: 1.38; color: #cfe4fa">{d}</div></div></div>'
    return o+'</div>'
def write(name,title,blob,alt,inner):
    if only and name not in only: return
    if not B.get(blob): print('skip (sin foto)',name); return
    open(os.path.join(P,name+'.dc.html'),'w').write(page(title,photo(B[blob],alt)+inner+BUB)); print('ok',name)

# 02 Tesis
write('02-tesis','Lo que cambió · Tu marca ya no habla sola','CT13','Una creadora de Efeonce con hoodie mira a cámara y le ofrece el micrófono a una multitud que se ve como miles de puntos de luz.',
 col(voice('Lo que cambió','¿Qué cambió en redes?','Tu marca ya<br>no habla sola',size=100)
 +body('Hoy se habla de tu marca en tus canales, en la voz de creadores y en lo que publica tu propia comunidad. El contenido que funciona coordina las tres.',mt=32,mw=600,size=21)
 +rows2([('telefono','Tus canales','Lo que tu marca publica: estrategia, sistema editorial y comunidad.'),('aro','Los creadores','Las personas que tu audiencia ya sigue y en las que confía.'),('corazon','Tu comunidad','Contenido hecho por personas reales, con derechos claros para usarlo.')],mt=30)))

# 04 Social media
G=[('escuadra','Estrategia y canales','Diagnóstico, arquitectura de canales, voz y flujo de aprobaciones.'),('lapiz','Sistema editorial','Pilares y series, calendario, copy y hooks.'),('claqueta','Producción nativa','Adaptación por plataforma, reutilización y testing creativo.'),('telefono','Operación de canales','Publicación, perfiles al día, lanzamientos y varios mercados.'),('corazon','Comunidad','Community management, atención, crisis y embajadores.'),('audifonos','Listening y tendencias','Escucha social, contenido reactivo y social search.')]
g='<div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; column-gap: 28px; width: 640px">'
for ic,t,d in G:
    g+=f'<div style="padding: 12px 0; border-top: 1px solid rgba(114, 222, 216, 0.16); display: flex; align-items: flex-start; gap: 12px"><img src="/_blob/{IC[ic]}" alt="" style="width: 34px; height: 34px; flex-shrink: 0; margin-top: 2px"><div><div style="{BRI}; font-size: 23px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 4px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.38; color: #cfe4fa">{d}</div></div></div>'
g+='</div>'
write('04-social-media','Social media · Un sistema, no un calendario','CT10','Nexa, con hoodie de Efeonce, encaja la última de siete piezas de luz en una fila conectada: la semana de contenido como un sistema.',
 col(voice('01 · Social media','¿Qué publico cada semana?','Un sistema,<br>no un<br>calendario',size=92)
 +body('Cada pieza sale de una estrategia, se adapta a su plataforma y deja un <b style="font-weight: 600">aprendizaje</b> para la siguiente.',mt=28,mw=600,size=21)+g))

# 08 Derechos
chips=['Entregables','Formatos y fechas','Rondas de cambios','Bruto y editado','Canales','Uso orgánico','Uso pagado','Whitelisting','Territorio y duración','Exclusividad','Disclosure','Aprobaciones y pago']
c=f'<div style="margin-top: 30px; {POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Cada contrato define</div><div style="margin-top: 14px; display: flex; flex-wrap: wrap; gap: 10px; width: 640px; {POP}; font-size: 17px; font-weight: 500; color: #ffffff">'
for x in chips: c+=f'<span style="border: 1.5px solid rgba(114, 222, 216, 0.45); border-radius: 999px; padding: 7px 16px; background: rgba(0, 26, 51, 0.45)">{x}</span>'
c+='</div>'
write('08-derechos','Derechos claros desde el contrato','CT11','Una estratega de Efeonce con hoodie sostiene una hoja de luz mientras un creador la firma en el aire: el acuerdo va antes del contenido.',
 col(voice('Lo que nos diferencia','¿Y los derechos del contenido?','Derechos<br>claros desde<br>el contrato',size=92,qsize=34)
 +body('Todo lo que hace un creador queda escrito antes de producir. Tu marca puede usarlo, pautarlo o renovarlo sin sorpresas.',mt=28,mw=600,size=21)+c))

# 10f Empezar
st='<div style="margin-top: 28px; display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 22px; width: 640px">'
for n,t,d in [('01','Diagnóstico','Tus canales, tu comunidad y los creadores posibles.'),('02','Sprint de prueba','Un frente acotado y pagado, con objetivos acordados.'),('03','Servicio continuo','Tu squad On-Going, con métricas en vivo.')]:
    st+=f'<div style="border-top: 1px solid rgba(114, 222, 216, 0.3); padding-top: 12px"><div style="{BRI}; font-size: 34px; font-weight: 300; line-height: 1; color: #ff6500">{n}</div><div style="margin-top: 6px; {BRI}; font-size: 23px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 5px; {POP}; font-size: 14px; font-weight: 300; line-height: 1.38; color: #cfe4fa">{d}</div></div>'
st+='</div>'
pr=f'<div style="margin-top: 26px; width: 640px; box-sizing: border-box; border-radius: 22px; padding: 18px 24px 16px; background: rgba(2, 60, 112, 0.5); border: 1px solid rgba(114, 222, 216, 0.3)"><div style="display: flex; align-items: baseline; gap: 16px"><div style="{POP}; font-size: 12px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">Cómo se compra</div><div style="{BRI}; font-size: 24px; font-weight: 740; letter-spacing: -0.02em; color: #ffffff">Cada costo, a la vista</div></div><div style="margin-top: 8px; {POP}; font-size: 15px; color: #ffffff">'
for a,b in [('Fee Efeonce','Fijo, por capacidad'),('Fees de creadores','A costo, aparte'),('Derechos y uso pagado','Línea propia'),('Whitelisting y medios','Línea propia'),('Comisión por resultado','Sólo si se acuerda')]:
    pr+=f'<div style="display: flex; justify-content: space-between; padding: 6px 0; border-top: 1px solid rgba(114, 222, 216, 0.18)"><span style="font-weight: 500">{a}</span><span style="font-weight: 300; color: #cfe4fa">{b}</span></div>'
pr+=f'</div><div style="margin-top: 6px; {POP}; font-size: 12px; font-weight: 400; color: #cfe4fa">Los montos se definen en cada propuesta.</div></div>'
write('10f-empezar','Cómo empezar · Empiezas chico','CT12','Un especialista de Efeonce con hoodie muestra una pequeña cuenta de luz sobre la palma; detrás, un anillo enorme de luz azul.',
 col(voice('Cómo empezar','¿Y si no me convence?','Empiezas chico',size=88)
 +body('Un sprint acotado prueba el encaje con tu marca antes de sumar frentes.',mt=26,mw=560,size=21)+st+pr))

# 07g Programa de ejecutivos
write('07g-ejecutivos-programa','LinkedIn · Programa de ejecutivos','CT15','Una ejecutiva habla y sus palabras viajan como chispas de luz hasta la mano de una estratega de Efeonce, donde se vuelven una página escrita.',
 col(voice('Programas · Ejecutivos en LinkedIn','¿Qué hacemos con cada uno?','Su voz,<br>nuestro<br>oficio',size=100)
 +body('Cada ejecutivo tiene su propio plan: lo entrevistamos, escribimos con <b style="font-weight: 600">su</b> voz y nada se publica sin su aprobación.',mt=28,mw=580,size=21)
 +rows([(IC['escuadra'],'Posicionamiento: temas y perfil optimizado'),(IC['postit'],'Plan editorial mensual por ejecutivo'),(IC['lapiz'],'Entrevista y ghostwriting con su voz'),(IC['comentar'],'Publicación y respuesta a comentarios'),(IC['trofeo'],'Medición de alcance y conversaciones')],mt=30,mw=560,size=19,pad=8)))

# 07h Embajadores de marca
write('07h-embajadores','LinkedIn · Embajadores de marca','CT14','Una creadora de Efeonce con hoodie señala el punto donde los hilos de luz que salen de los teléfonos de dos colaboradores se trenzan en un solo haz.',
 col(voice('Programas · Embajadores de marca','¿Y el resto de mi equipo?','Tu equipo,<br>tu mejor<br>canal',size=104)
 +body('Un programa para que las personas de tu empresa compartan la marca con su <b style="font-weight: 600">propia</b> voz, con formación y contenido listo cada mes.',mt=28,mw=580,size=21)
 +rows([(IC['estrella'],'Selección y onboarding de embajadores'),(IC['bombillo'],'Formación en LinkedIn y marca personal'),(IC['galeria'],'Kit mensual de contenidos para adaptar'),(IC['corazon'],'Comunidad interna, retos y reconocimiento'),(IC['trofeo'],'Medición de alcance y participación')],mt=30,mw=560,size=19,pad=8)))

# ── Tanda 2: láminas nuevas ─────────────────────────────────────────────────
def note(t,mt=14): return f'<div style="margin-top: {mt}px; {POP}; font-size: 14px; font-weight: 400; line-height: 1.4; color: #cfe4fa; max-width: 560px">{t}</div>'
def chips(label,items,mt=22):
    o=f'<div style="margin-top: {mt}px; {POP}; font-size: 13px; font-weight: 500; letter-spacing: 0.14em; text-transform: uppercase; color: #cfe4fa">{label}</div><div style="margin-top: 10px; display: flex; gap: 7px; width: 640px; white-space: nowrap; {POP}; font-size: 14px; color: #ffffff">'
    for a,b in items: o+=f'<span style="border: 1.5px solid rgba(114, 222, 216, 0.45); border-radius: 999px; padding: 6px 12px; background: rgba(0, 26, 51, 0.45)"><b style="font-weight: 600">{a}</b> · <span style="font-weight: 300">{b}</span></span>'
    return o+'</div>'
R=lambda items,mt=26: rows([(IC[i],t) for i,t in items],mt=mt,mw=560,size=19,pad=8)

write('06b-seleccion-creadores','Influencer marketing · Cómo elegimos a un creador','CT16','Una estratega de Efeonce con hoodie levanta de una fila de tarjetas oscuras la única que se enciende: el creador que encaja con la marca.',
 col(voice('02 · Influencer marketing · Selección','¿Cómo eligen a un creador?','El correcto,<br>no el más<br>grande',size=96)
 +body('Antes de proponer un nombre revisamos a quién le habla de verdad, cómo responde su audiencia y si encaja con tu marca.',mt=26,mw=580,size=21)
 +R([('busqueda','Audiencia real, no inflada'),('corazon','Afinidad con tu marca y tu categoría'),('biblioteca','Historial y riesgo reputacional'),('estrella','Shortlist con benchmark y recomendación')],mt=24)
 +chips('Según el objetivo',[('Nano','cercanía'),('Micro','nicho'),('Macro','alcance'),('Celebridad','notoriedad')],mt=20)))

step=f'<div style="margin-top: 20px; display: flex; align-items: center; gap: 10px; {POP}; font-size: 15px; font-weight: 500; color: #ffffff; white-space: nowrap">'
for i,x in enumerate(['Intelligence','Activation','Partnership','Amplification']):
    if i: step+='<svg aria-hidden="true" width="18" height="12" viewBox="0 0 18 12"><path d="M1 6 H15 M11 2 L15 6 L11 10" fill="none" stroke="#72ded8" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"></path></svg>'
    step+=f'<span style="border: 1.5px solid rgba(114, 222, 216, {0.9 if x=="Partnership" else 0.4}); border-radius: 999px; padding: 6px 13px; background: rgba({"3, 117, 219, 0.5" if x=="Partnership" else "0, 26, 51, 0.45"})">{x}</span>'
step+='</div>'
write('06c-programa-creadores','Influencer marketing · Programa de creadores','CT17','Una creadora de Efeonce con hoodie y una creadora de contenido se dan la mano; alrededor de sus manos gira un anillo de luz con cuatro cuentas.',
 col(voice('Programas · Creadores','¿Campaña suelta o relación?','Creadores<br>que se<br>quedan',size=100,qsize=36)
 +body('Un roster que ya conoce tu marca arranca más rápido y produce contenido que suena <b style="font-weight: 600">propio</b>.',mt=26,mw=560,size=21)
 +R([('galeria','Roster de creadores por mercado y audiencia'),('postit','Calendario de activaciones recurrentes'),('trofeo','Revisión trimestral por creador'),('like','Renovación con evidencia, no por volumen')],mt=24)+step))

st3=lambda items: '<div style="margin-top: 26px; display: grid; grid-template-columns: repeat(3, 1fr); column-gap: 22px; width: 620px">'+''.join(f'<div style="border-top: 1px solid rgba(114, 222, 216, 0.3); padding-top: 12px"><div style="{BRI}; font-size: 34px; font-weight: 300; line-height: 1; color: #ff6500">{n}</div><div style="margin-top: 6px; {BRI}; font-size: 25px; font-weight: 740; letter-spacing: -0.02em; line-height: 1.05; color: #ffffff">{t}</div><div style="margin-top: 6px; {POP}; font-size: 15px; font-weight: 300; line-height: 1.38; color: #cfe4fa">{d}</div></div>' for n,t,d in items)+'</div>'
write('07d3-lanzamientos','Lanzamientos · Un lanzamiento, tres tiempos','CT18','Un especialista de Efeonce con hoodie retira un paño negro y revela un cubo de luz sobre un pedestal.',
 col(voice('Momentos · Lanzamientos','¿Cómo lanzo un producto?','Un lanzamiento,<br>tres tiempos',size=80,qsize=34)
 +body('Un sprint acotado que coordina canales, creadores, pauta y comunidad alrededor de <b style="font-weight: 600">una</b> fecha.',mt=26,mw=560,size=21)
 +st3([('01','Expectativa','Teasers, lista de espera y creadores en reserva.'),('02','Revelación','El día del lanzamiento, en todos los canales a la vez.'),('03','Sostenimiento','Reseñas, UGC, pauta y respuesta a la comunidad.')])
 +R([('megafono','Plan de canales y calendario del lanzamiento'),('aro','Creadores y contenido listos antes de la fecha')],mt=26)
 +note('También para rebranding, eventos y campañas.')))

write('07d2-social-commerce','Social commerce · Del scroll al carrito','CT19','Una estratega de Efeonce con hoodie muestra una taza a un teléfono en trípode; sobre la taza suben pequeñas etiquetas de luz.',
 col(voice('Todos los frentes · Social commerce','¿Y mis productos en redes?','Del scroll<br>al carrito',size=104)
 +body('Contenido para que tu producto se descubra, se entienda y se recomiende en la misma red donde se compra.',mt=26,mw=560,size=21)
 +R([('busqueda','Descubrimiento y recomendación'),('reproducir','Demostraciones y reseñas'),('camara','Unboxing y contenido con creadores'),('cursor','Formatos comprables'),('telefono','Live shopping')],mt=24)
 +note('La operación de tienda, catálogo y checkout se cotiza aparte.')))

write('07b2-social-search','Social search · Hoy también se busca en redes','CT20','Una creadora de Efeonce con hoodie mira una barra de búsqueda de luz con tres resultados; el primero está encendido.',
 col(voice('04 · Listening · Social search','¿Aparezco cuando me buscan?','Hoy también<br>se busca<br>en redes',size=96)
 +body('TikTok, Instagram y YouTube ya se usan como buscadores. Trabajamos temas, títulos y formatos para que tu marca sea la <b style="font-weight: 600">respuesta</b>.',mt=26,mw=580,size=21)
 +R([('busqueda','Mapa de búsquedas por red'),('bombillo','Temas y series que responden preguntas'),('lapiz','Títulos, descripciones y subtítulos buscables'),('rayo','Conexión con tu SEO y tu visibilidad en IA')],mt=24)))

write('07a2-produccion','Producción de contenido · Pensado en vertical','CT21','Nexa, con hoodie de Efeonce, sostiene una claqueta abierta frente a un teléfono vertical en trípode, lista para la toma.',
 col(voice('01 · Social media · Producción','¿Quién graba todo esto?','Pensado<br>en vertical<br>desde el guion',size=92)
 +body('Sprints de producción social: del concepto a las piezas listas para cada red, con rondas pactadas.',mt=26,mw=560,size=21)
 +R([('lapiz','Concepto, guion y hooks'),('claqueta','Shot list y día de rodaje'),('tijeras','Edición, subtítulos y formatos por red'),('encuadre','Rondas de revisión y control de calidad')],mt=24)
 +note('Se cotiza como producción especial, con alcance propio.')))

write('07d4-evento-en-vivo','Cobertura en vivo · Tu evento, en vivo en redes','CT22','Un especialista de Efeonce con hoodie transmite desde bambalinas con un teléfono en estabilizador; un marco de luz con un punto naranja encuadra el escenario.',
 col(voice('Momentos · Cobertura en vivo','¿Y cuando hay un evento?','Tu evento,<br>en vivo<br>en redes',size=100)
 +body('Publicamos, respondemos y editamos mientras el evento ocurre, con un plan de contingencia acordado antes.',mt=26,mw=560,size=21)
 +R([('rayo','Publicación en tiempo real'),('comentar','Comunidad y respuesta durante el evento'),('tijeras','Contenido editado en el momento'),('megafono','Escalamiento y plan de contingencia')],mt=24)
 +note('Requiere horarios, accesos y equipo definidos en la propuesta.')))

# ── Tanda 3: reputación ────────────────────────────────────────────────────
write('07c3-reputacion','Reputación de marca · Contener antes de que crezca','CT23','Nexa, con hoodie de Efeonce, mira a cámara con calma mientras apoya una campana de vidrio sobre un anillo de luz; dentro queda un pequeño punto naranja.',
 col(voice('Momentos · Crisis y reputación','¿Y si algo sale mal?','Contener<br>antes de<br>que crezca',size=96)
 +body('La reputación se cuida todos los días. Vigilamos señales, acordamos protocolos y, si hay una crisis, respondemos con un <b style="font-weight: 600">plan</b>.',mt=26,mw=560,size=21)
 +st3([('01','Antes','Mapa de riesgos, protocolos y voceros definidos.'),('02','Durante','Sala de crisis, respuestas aprobadas y escalamiento.'),('03','Después','Informe, aprendizajes y ajuste del protocolo.')])
 +R([('audifonos','Alertas tempranas desde el listening'),('rayo','Niveles de riesgo con respuesta definida')],mt=24)))

# ── Tanda 4: producción con IA ─────────────────────────────────────────────
write('07a3-ia','Producción con IA · Sí, pero lo hacemos bien','CT24','Una creadora de Efeonce con hoodie dirige con la mano una espiral inmensa de miles de piezas de contenido que gira detrás de ella como una galaxia.',
 col(voice('Producción con IA','¿Producen con IA?','Sí, pero lo<br>hacemos<br>bien',size=104)
 +body('La IA nos da velocidad y escala. El criterio, la marca y la última palabra los pone una <b style="font-weight: 600">persona</b>.',mt=26,mw=540,size=21)
 +R([('paleta','Dirección creativa de una persona en cada pieza'),('corazon','Tu marca y tu producto reales, nunca inventados'),('biblioteca','Derechos y uso comercial revisados'),('encuadre','Revisión humana antes de publicar')],mt=24)))
