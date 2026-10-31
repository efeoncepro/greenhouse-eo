const fs = require('node:fs');
const path = require('node:path');

const P = text => ({kind:'paragraph',text});
const S = (heading,blocks,level=2) => ({heading,level,blocks});
const link = (before,text,href,after='') => [{text:before},{text,href},{text:after}];
const root=__dirname;
const mediaFile=path.join(root,'media-readback.json');
const media=fs.existsSync(mediaFile)?JSON.parse(fs.readFileSync(mediaFile,'utf8')):null;
const opening=media?.assets?.find(x=>x.role==='opening');

const spec={
 title:'Efeonce es partner de Google Cloud: más posibilidades para conectar tu negocio con la nube y la inteligencia artificial',
 slug:'efeonce-partner-google-cloud',
 excerpt:'Efeonce es partner de Google Cloud. Conoce qué abre esta nueva etapa para tu empresa y cómo podemos acompañarte en proyectos de nube, colaboración e inteligencia artificial con Gemini.',
 seo:{title:'Efeonce es partner de Google Cloud | Nube e IA',description:'Efeonce es partner de Google Cloud. Conoce cómo podemos acompañar a tu empresa en proyectos de nube, colaboración e inteligencia artificial con Gemini.',canonicalUrl:'https://efeoncepro.com/novedades/efeonce-partner-google-cloud/',inLanguage:'es',indexPolicy:'noindex'},
 tableOfContents:true,
 intro:[
  [{text:'Ampliamos nuestra oferta de soluciones empresariales de Google para acompañar a las organizaciones desde la elección de tecnología hasta su implementación y adopción.',strong:true}],
  'En Efeonce iniciamos una nueva etapa: somos partner de Google Cloud. Esta relación amplía nuestra capacidad para comercializar soluciones de Google para empresas y acompañar proyectos que conectan infraestructura, datos, colaboración e inteligencia artificial.',
  'Es una noticia que nos entusiasma por las posibilidades que abre para nuestros clientes. Cada proyecto plantea una pregunta distinta: ¿cómo hacemos que esta tecnología sea útil en la operación cotidiana? Ahí queremos aportar, con criterio para elegir, capacidad para implementar y acompañamiento para que las personas puedan aprovechar lo que construimos juntas.'
 ],
 sections:[
  S('Qué abre esta nueva etapa para tu empresa',[
   ...(opening?[{kind:'image',mediaId:opening.id,url:opening.url,width:1600,height:900,sizeSlug:'full',alt:opening.alt,align:'center',linkDestination:'none',caption:'Una nueva etapa para conectar soluciones de Google con los proyectos de nuestros clientes. Ilustración del anuncio de Efeonce, producida con apoyo de IA.'}]:[]),
   {kind:'list',style:'box',items:[
    'Evaluar soluciones de Google Cloud y Google Workspace para tu organización.',
    'Explorar proyectos que conectan nube, datos, colaboración e inteligencia artificial con Gemini.',
    'Definir el alcance de contratación, implementación y adopción según las necesidades de tu equipo.'
   ]},
   P('Las decisiones tecnológicas atraviesan cada vez más áreas de una empresa. Marketing necesita información confiable; ventas busca reducir tareas repetitivas; operaciones necesita conectar sistemas; y los equipos requieren herramientas que les permitan colaborar con claridad.'),
   P('Estas necesidades suelen estar relacionadas. Un proyecto de inteligencia artificial puede depender de cómo está organizada la información. Una nueva aplicación necesita infraestructura y permisos adecuados. Una herramienta de colaboración requiere acuerdos sobre cómo se va a utilizar.'),
   P('Nuestra incorporación al ecosistema de partners de Google Cloud fortalece la posibilidad de abordar estas decisiones con una mirada conectada: entender el problema del negocio, definir una solución y acompañar su puesta en marcha.')
  ]),
  S('Nube, colaboración e inteligencia artificial',[
   P('La elección comienza por el trabajo que necesita hacer la organización. Estas son tres áreas en las que podemos evaluar juntos un proyecto, precisando las soluciones y condiciones que correspondan a cada caso.')
  ]),
  S('Google Cloud: una base para aplicaciones y datos',[
   P(link('Con ','Google Cloud','https://cloud.google.com/',' podemos evaluar la infraestructura y los servicios para desarrollar aplicaciones, integrar sistemas y trabajar con datos. El punto de partida puede ser una aplicación que necesita crecer o información que hoy se encuentra dispersa.')),
   P('Por ejemplo, una empresa puede querer reunir información comercial para facilitar su consulta. Otra puede necesitar una aplicación interna que conecte tareas que hoy se resuelven en varias herramientas. El alcance, los costos de operación, la seguridad y el mantenimiento forman parte de la conversación desde el comienzo.')
  ],3),
  S('Google Workspace: colaboración en el trabajo cotidiano',[
   P(link('La tecnología también tiene un papel cotidiano: cómo compartimos documentos, organizamos reuniones y damos continuidad al trabajo. ','Google Workspace','https://workspace.google.com/',' reúne herramientas de comunicación y colaboración que pueden formar parte de esa operación.')),
   P('Su incorporación merece considerar tanto la configuración como los hábitos del equipo: cómo se organizan los archivos, quién administra los accesos y qué acuerdos permiten trabajar con mayor claridad. El acompañamiento puede abarcar la evaluación de necesidades, la implementación y la formación de las personas, de acuerdo con el alcance contratado.')
  ],3),
  S('Gemini: inteligencia artificial para tareas concretas',[
   P(link('Muchas empresas ya están explorando la inteligencia artificial. Con ','Gemini','https://cloud.google.com/ai/gemini',' podemos evaluar aplicaciones como trabajar con documentos, preparar borradores, sintetizar información o desarrollar experiencias de asistencia conectadas con procesos del negocio, según el producto y la configuración elegidos.')),
   P('Para comenzar, necesitamos identificar qué tarea queremos mejorar, qué información utilizará la solución y quién revisará sus respuestas. También definimos cómo comprobar su utilidad. Así, una intención amplia —«queremos usar IA»— se convierte en un proyecto que se pueda implementar y evaluar.'),
   P('Una primera aplicación puede tener un alcance acotado, permitir que el equipo aprenda y aportar evidencia para decidir los siguientes pasos. La elección de licencias y servicios se revisa para cada organización.')
  ],3),
  S('Cómo trabajamos contigo',[
   {kind:'pullquote',text:'La tecnología empieza a aportar cuando encuentra un lugar claro en la forma de trabajar de tu equipo.'},
   P('En Efeonce conectamos estrategia, creatividad, datos y tecnología para construir sistemas de crecimiento. Esta relación amplía las herramientas con las que podemos llevar ese trabajo a la práctica. El recorrido de cada proyecto se define contigo:'),
   {kind:'list',ordered:true,style:'steps',items:[
    [{text:'Entender el contexto. ',strong:true},{text:'Revisamos qué necesitas resolver, cómo trabaja hoy el equipo y qué sistemas utiliza.'}],
    [{text:'Definir la solución. ',strong:true},{text:'Precisamos alcance, disponibilidad comercial, costos, accesos y responsabilidades.'}],
    [{text:'Implementar y probar. ',strong:true},{text:'Construimos el flujo acordado y verificamos su funcionamiento con quienes lo usarán.'}],
    [{text:'Acompañar la adopción. ',strong:true},{text:'Transferimos conocimiento y revisamos la utilidad de la solución con tu equipo.'}]
   ]},
   P('Nuestra responsabilidad es explicar las decisiones y dejar a la organización con mayor capacidad para operar lo implementado. Por eso, la documentación, la transferencia de conocimiento y la adopción tienen un lugar dentro del trabajo.')
  ]),
  S('Preguntas sobre esta nueva etapa',[
   {kind:'faq',schema:{source:'plugin'},items:[
    {question:'¿Qué significa que Efeonce sea partner de Google Cloud?',answer:[P('Efeonce forma parte del ecosistema de partners de Google Cloud y amplía su oferta de soluciones empresariales. Podemos acompañar la evaluación de tecnología, su contratación dentro del alcance disponible y proyectos de implementación y adopción.')]},
    {question:'¿Puedo evaluar Google Cloud y Google Workspace con Efeonce?',answer:[P('Sí. Partimos por tu requerimiento y revisamos las soluciones, la disponibilidad comercial y las condiciones aplicables a tu organización. En esa conversación definimos también el alcance del acompañamiento que necesitas.')]},
    {question:'¿Qué proyectos con Gemini podemos explorar?',answer:[P('Podemos evaluar tareas con documentos e información, preparación de borradores o experiencias de asistencia. La solución depende del caso de uso, los datos, los permisos y el producto de Gemini que resulte adecuado. La revisión humana y los criterios de evaluación se definen desde el comienzo.')]},
    {question:'¿Cómo empezamos?',answer:[P(link('Cuéntanos qué necesita resolver tu equipo en nuestra ','página de contacto','https://efeoncepro.com/contacto/','. A partir de ese contexto podremos definir el siguiente paso y el alcance del proyecto.'))]}
   ]}
  ]),
  S('Conversemos sobre tu proyecto',[
   P(link('Si quieres seguir las novedades de IA, marketing y negocios, puedes conocer ','Glitch','https://efeoncepro.com/category/glitch/',' y suscribirte desde el blog.')),
   P('Si estás evaluando Google Cloud, Google Workspace o una aplicación de Gemini para tu organización, podemos comenzar por tu contexto: qué necesitas mejorar, con qué sistemas trabajas y qué espera conseguir tu equipo.'),
   {kind:'buttons',items:[{text:'Conversemos sobre tu proyecto',href:'https://efeoncepro.com/contacto/',variant:'fill'}]}
  ])
 ]
};

fs.writeFileSync(path.join(root,'articulo-spec.json'),JSON.stringify(spec,null,2)+'\n');
const contract={manifestId:'efeonce-google-cloud-partner-announcement',authorId:1,categoryId:116,formatId:219,tagIds:[191,117],primaryCategoryId:116,slug:spec.slug,canonical:spec.seo.canonicalUrl,ogTitle:'Efeonce es partner de Google Cloud',ogDescription:'Una nueva etapa para conectar Google Cloud, Google Workspace y la inteligencia artificial con los proyectos de tu empresa.',schemaArticleType:'NewsArticle',focusPhrase:'Efeonce partner de Google Cloud',bannerActivation:false,targetStatus:'private'};

fs.writeFileSync(path.join(root,'contrato-publicacion.json'),JSON.stringify(contract,null,2)+'\n');
console.log(JSON.stringify({spec:'articulo-spec.json',mediaIncluded:!!opening,sections:spec.sections.length},null,2));
