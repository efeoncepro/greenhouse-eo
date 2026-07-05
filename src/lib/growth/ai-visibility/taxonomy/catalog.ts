import {
  CATEGORY_TAXONOMY_LEVELS,
  CATEGORY_TAXONOMY_NODE_STATUSES,
  CATEGORY_TAXONOMY_VERSION,
  type CategoryTaxonomy,
  type CategoryTaxonomyNode,
  type CategoryTaxonomyValidationResult
} from './contracts'

export const CATEGORY_TAXONOMY: CategoryTaxonomy = {
  version: CATEGORY_TAXONOMY_VERSION,
  nodes: [
    {
      id: 'industry:technology',
      level: 'industry',
      label: { es: 'Tecnologia', en: 'Technology' },
      aliases: ['technology', 'tecnologia', 'tech'],
      parentIds: [],
      examples: ['software', 'platforms', 'AI tools'],
      status: 'active'
    },
    {
      id: 'industry:professional_services',
      level: 'industry',
      label: { es: 'Servicios profesionales', en: 'Professional services' },
      aliases: ['professional services', 'servicios profesionales', 'consultoria', 'consulting'],
      parentIds: [],
      examples: ['consulting firms', 'agencies', 'advisory services'],
      status: 'active'
    },
    {
      id: 'industry:marketing_communications',
      level: 'industry',
      label: { es: 'Marketing y comunicaciones', en: 'Marketing and communications' },
      aliases: ['marketing communications', 'marketing y comunicaciones', 'advertising', 'publicidad'],
      parentIds: ['industry:professional_services'],
      examples: ['advertising', 'communications', 'brand services'],
      status: 'active'
    },
    {
      id: 'industry:healthcare',
      level: 'industry',
      label: { es: 'Salud', en: 'Healthcare' },
      aliases: ['healthcare', 'salud', 'health'],
      parentIds: [],
      examples: ['clinics', 'health systems', 'health products'],
      status: 'active'
    },
    {
      id: 'industry:finance',
      level: 'industry',
      label: { es: 'Finanzas', en: 'Finance' },
      aliases: ['finance', 'finanzas', 'financial services'],
      parentIds: [],
      examples: ['banks', 'insurance', 'financial products'],
      status: 'active'
    },
    {
      id: 'industry:education',
      level: 'industry',
      label: { es: 'Educacion', en: 'Education' },
      aliases: ['education', 'educacion', 'edtech'],
      parentIds: [],
      examples: ['schools', 'training', 'learning platforms'],
      status: 'active'
    },
    {
      id: 'industry:retail',
      level: 'industry',
      label: { es: 'Retail', en: 'Retail' },
      aliases: ['retail', 'comercio'],
      parentIds: [],
      examples: ['commerce', 'marketplaces', 'stores'],
      status: 'active'
    },
    {
      id: 'industry:manufacturing',
      level: 'industry',
      label: { es: 'Manufactura', en: 'Manufacturing' },
      aliases: ['manufacturing', 'manufactura', 'industrial'],
      parentIds: [],
      examples: ['factories', 'industrial operations'],
      status: 'active'
    },
    {
      id: 'industry:energy',
      level: 'industry',
      label: { es: 'Energia', en: 'Energy' },
      aliases: ['energy', 'energia', 'utilities'],
      parentIds: [],
      examples: ['utilities', 'renewables', 'energy services'],
      status: 'active'
    },
    {
      id: 'industry:government',
      level: 'industry',
      label: { es: 'Gobierno', en: 'Government' },
      aliases: ['government', 'gobierno', 'public sector', 'sector publico'],
      parentIds: [],
      examples: ['public agencies', 'municipalities'],
      status: 'active'
    },
    {
      id: 'industry:real_estate',
      level: 'industry',
      label: { es: 'Inmobiliaria', en: 'Real estate' },
      aliases: ['real estate', 'inmobiliaria', 'propiedades', 'bienes raices'],
      parentIds: [],
      examples: ['property developers', 'brokerages', 'property management'],
      status: 'active'
    },
    {
      id: 'industry:construction',
      level: 'industry',
      label: { es: 'Construccion', en: 'Construction' },
      aliases: ['construction', 'construccion', 'engineering and construction'],
      parentIds: [],
      examples: ['construction firms', 'contractors', 'infrastructure projects'],
      status: 'active'
    },
    {
      id: 'industry:logistics',
      level: 'industry',
      label: { es: 'Logistica y transporte', en: 'Logistics and transportation' },
      aliases: ['logistics', 'logistica', 'transportation', 'transporte'],
      parentIds: [],
      examples: ['3PL', 'freight', 'last-mile delivery'],
      status: 'active'
    },
    {
      id: 'industry:hospitality_travel',
      level: 'industry',
      label: { es: 'Hospitalidad y turismo', en: 'Hospitality and travel' },
      aliases: ['hospitality', 'travel', 'turismo', 'hoteleria', 'hotels'],
      parentIds: [],
      examples: ['hotels', 'tour operators', 'travel platforms'],
      status: 'active'
    },
    {
      id: 'industry:media_entertainment',
      level: 'industry',
      label: { es: 'Medios y entretenimiento', en: 'Media and entertainment' },
      aliases: ['media', 'entertainment', 'medios', 'entretenimiento', 'creator economy'],
      parentIds: [],
      examples: ['publishers', 'streaming', 'creator platforms'],
      status: 'active'
    },
    {
      id: 'industry:legal',
      level: 'industry',
      label: { es: 'Legal', en: 'Legal' },
      aliases: ['legal', 'law', 'abogados', 'servicios legales'],
      parentIds: ['industry:professional_services'],
      examples: ['law firms', 'legal services', 'legal operations'],
      status: 'active'
    },
    {
      id: 'industry:agriculture_food',
      level: 'industry',
      label: { es: 'Agricultura y alimentos', en: 'Agriculture and food' },
      aliases: ['agriculture', 'agricultura', 'food', 'alimentos', 'agro'],
      parentIds: [],
      examples: ['agribusiness', 'food production', 'food distribution'],
      status: 'active'
    },
    {
      id: 'industry:nonprofit_impact',
      level: 'industry',
      label: { es: 'Impacto y organizaciones sin fines de lucro', en: 'Nonprofit and impact' },
      aliases: ['nonprofit', 'ngo', 'fundacion', 'ong', 'impacto social'],
      parentIds: [],
      examples: ['NGOs', 'foundations', 'social impact programs'],
      status: 'active'
    },
    {
      id: 'industry:aviation',
      level: 'industry',
      label: { es: 'Aerolineas y aviacion', en: 'Airlines and aviation' },
      aliases: ['aviation', 'aviacion', 'airline', 'airlines', 'aerolinea', 'aerolineas', 'aerospace', 'aeroespacial'],
      parentIds: [],
      examples: ['passenger airlines', 'low-cost carriers', 'aviation services'],
      status: 'active'
    },
    {
      id: 'industry:automotive',
      level: 'industry',
      label: { es: 'Automotriz', en: 'Automotive' },
      aliases: ['automotive', 'automotriz', 'automotor', 'vehiculos', 'cars', 'autos'],
      parentIds: [],
      examples: ['car manufacturers', 'dealerships', 'mobility brands'],
      status: 'active'
    },
    {
      id: 'industry:telecommunications',
      level: 'industry',
      label: { es: 'Telecomunicaciones', en: 'Telecommunications' },
      aliases: ['telecommunications', 'telecomunicaciones', 'telecom', 'telco', 'wireless', 'operador movil'],
      parentIds: [],
      examples: ['mobile carriers', 'broadband providers', 'telecom operators'],
      status: 'active'
    },
    {
      id: 'industry:consumer_goods',
      level: 'industry',
      // Macro bucket. Los sub-verticales finos (moda, belleza, electrónica) viven como sector
      // (plano mid) o como `fine_category` del snapshot grounded — NO se enumeran como industrias.
      label: { es: 'Bienes de consumo', en: 'Consumer goods' },
      aliases: [
        'consumer goods',
        'bienes de consumo',
        'cpg',
        'consumer packaged goods',
        'luxury',
        'lujo',
        'sporting goods',
        'consumer electronics',
        'electronica de consumo'
      ],
      parentIds: [],
      examples: ['apparel and fashion', 'cosmetics and personal care', 'household and electronics brands'],
      status: 'active'
    },
    {
      id: 'industry:food_beverage',
      level: 'industry',
      label: { es: 'Alimentos y bebidas', en: 'Food and beverage' },
      aliases: [
        'food and beverage',
        'food beverages',
        'alimentos y bebidas',
        'alimentos',
        'food production',
        'dairy'
      ],
      parentIds: [],
      examples: ['food and beverage brands', 'restaurant chains', 'packaged food producers'],
      status: 'active'
    },
    {
      // Plano MID — sectores de consumo curados (sólo donde el buyer journey difiere del macro).
      // Lo más fino que esto vive como `fine_category` del snapshot grounded, NUNCA como nodo.
      id: 'sector:passenger_airlines',
      level: 'sector',
      label: { es: 'Aerolineas de pasajeros', en: 'Passenger airlines' },
      aliases: ['passenger airline', 'passenger airlines', 'aerolinea de pasajeros', 'low cost carrier', 'vuelos'],
      parentIds: ['industry:aviation'],
      examples: ['low-cost carriers', 'full-service airlines'],
      status: 'active'
    },
    {
      id: 'sector:supermarkets_grocery',
      level: 'sector',
      label: { es: 'Supermercados y abarrotes', en: 'Supermarkets and grocery' },
      aliases: ['supermarket', 'supermarkets', 'supermercado', 'supermercados', 'grocery', 'abarrotes'],
      parentIds: ['industry:retail'],
      examples: ['supermarket chains', 'grocery retailers'],
      status: 'active'
    },
    {
      id: 'sector:apparel_fashion',
      level: 'sector',
      label: { es: 'Moda y vestuario', en: 'Apparel and fashion' },
      aliases: ['apparel', 'fashion', 'moda', 'ropa', 'vestuario', 'indumentaria'],
      parentIds: ['industry:consumer_goods'],
      examples: ['fashion brands', 'apparel retailers'],
      status: 'active'
    },
    {
      id: 'sector:beauty_personal_care',
      level: 'sector',
      label: { es: 'Belleza y cuidado personal', en: 'Beauty and personal care' },
      aliases: ['beauty', 'cosmetics', 'cosmetica', 'belleza', 'cuidado personal', 'skincare', 'maquillaje'],
      parentIds: ['industry:consumer_goods'],
      examples: ['cosmetics brands', 'skincare brands', 'personal care'],
      status: 'active'
    },
    {
      id: 'sector:restaurants_foodservice',
      level: 'sector',
      label: { es: 'Restaurantes y foodservice', en: 'Restaurants and foodservice' },
      aliases: ['restaurant', 'restaurants', 'restaurante', 'restaurantes', 'foodservice', 'gastronomia'],
      parentIds: ['industry:food_beverage'],
      examples: ['restaurant chains', 'quick-service restaurants', 'food service'],
      status: 'active'
    },
    {
      id: 'sector:beverages',
      level: 'sector',
      label: { es: 'Bebidas', en: 'Beverages' },
      aliases: ['beverage', 'beverages', 'bebidas', 'bebestibles', 'drinks', 'wine and spirits', 'vinos y licores'],
      parentIds: ['industry:food_beverage'],
      examples: ['soft drinks', 'wine and spirits', 'beverage brands'],
      status: 'active'
    },
    {
      id: 'sector:retail_consumer_banking',
      level: 'sector',
      label: { es: 'Banca de personas', en: 'Retail and consumer banking' },
      aliases: ['retail banking', 'banca retail', 'banca de personas', 'banca personas', 'consumer banking'],
      parentIds: ['industry:finance'],
      examples: ['consumer banks', 'retail banking divisions'],
      status: 'active'
    },
    {
      id: 'sector:b2b_saas',
      level: 'sector',
      label: { es: 'B2B SaaS', en: 'B2B SaaS' },
      aliases: ['b2b saas', 'saas b2b', 'software as a service'],
      parentIds: ['industry:technology'],
      examples: ['subscription software', 'cloud platforms'],
      status: 'active'
    },
    {
      id: 'sector:martech',
      level: 'sector',
      label: { es: 'Martech', en: 'Martech' },
      aliases: ['martech', 'marketing technology', 'tecnologia de marketing'],
      parentIds: ['industry:technology', 'industry:marketing_communications'],
      examples: ['marketing automation', 'CRM ecosystems'],
      status: 'active'
    },
    {
      id: 'sector:marketing_services',
      level: 'sector',
      label: { es: 'Servicios de marketing', en: 'Marketing services' },
      aliases: ['marketing', 'marketing services', 'servicios de marketing', 'agencia marketing'],
      parentIds: ['industry:marketing_communications'],
      examples: ['campaign strategy', 'content operations'],
      status: 'active'
    },
    {
      id: 'sector:creative_agency',
      level: 'sector',
      label: { es: 'Agencia creativa', en: 'Creative agency' },
      aliases: ['creative agency', 'agencia creativa', 'agencia integral', 'red global'],
      parentIds: ['industry:marketing_communications'],
      examples: ['brand campaigns', 'creative production'],
      status: 'active'
    },
    {
      id: 'sector:revenue_operations',
      level: 'sector',
      label: { es: 'Revenue operations', en: 'Revenue operations' },
      aliases: ['revops', 'revenue operations', 'revenue ops', 'operaciones de revenue'],
      parentIds: ['sector:b2b_saas', 'sector:martech'],
      examples: ['pipeline operations', 'sales-marketing alignment'],
      status: 'active'
    },
    {
      id: 'sector:fintech',
      level: 'sector',
      label: { es: 'Fintech', en: 'Fintech' },
      aliases: ['fintech', 'financial technology', 'tecnologia financiera'],
      parentIds: ['industry:finance', 'industry:technology'],
      examples: ['payments', 'financial platforms'],
      status: 'active'
    },
    {
      id: 'sector:healthtech',
      level: 'sector',
      label: { es: 'Healthtech', en: 'Healthtech' },
      aliases: ['healthtech', 'health tech', 'tecnologia salud'],
      parentIds: ['industry:healthcare', 'industry:technology'],
      examples: ['health platforms', 'patient experience tools'],
      status: 'active'
    },
    {
      id: 'sector:ai_automation',
      level: 'sector',
      label: { es: 'IA y automatizacion', en: 'AI and automation' },
      aliases: ['ai automation', 'ia y automatizacion', 'artificial intelligence', 'inteligencia artificial'],
      parentIds: ['industry:technology'],
      examples: ['AI agents', 'workflow automation', 'copilots'],
      status: 'active'
    },
    {
      id: 'sector:data_analytics',
      level: 'sector',
      label: { es: 'Datos y analitica', en: 'Data and analytics' },
      aliases: ['data analytics', 'analytics', 'analitica de datos'],
      parentIds: ['industry:technology'],
      examples: ['BI platforms', 'data warehouses', 'dashboards'],
      status: 'active'
    },
    {
      id: 'sector:cybersecurity',
      level: 'sector',
      label: { es: 'Ciberseguridad', en: 'Cybersecurity' },
      aliases: ['cybersecurity', 'ciberseguridad', 'information security', 'seguridad informatica'],
      parentIds: ['industry:technology', 'industry:professional_services'],
      examples: ['MSSP', 'security platforms', 'risk monitoring'],
      status: 'active'
    },
    {
      id: 'sector:cloud_it_services',
      level: 'sector',
      label: { es: 'Cloud e IT services', en: 'Cloud and IT services' },
      aliases: ['cloud services', 'it services', 'servicios ti', 'managed it services'],
      parentIds: ['industry:technology', 'industry:professional_services'],
      examples: ['cloud migration', 'managed services', 'infrastructure operations'],
      status: 'active'
    },
    {
      id: 'sector:devtools',
      level: 'sector',
      label: { es: 'Herramientas para desarrolladores', en: 'Developer tools' },
      aliases: ['developer tools', 'devtools', 'herramientas para desarrolladores'],
      parentIds: ['industry:technology', 'sector:b2b_saas'],
      examples: ['APIs', 'CI/CD', 'developer platforms'],
      status: 'active'
    },
    {
      id: 'sector:ecommerce_marketplaces',
      level: 'sector',
      label: { es: 'Ecommerce y marketplaces', en: 'Ecommerce and marketplaces' },
      aliases: ['ecommerce', 'e-commerce', 'comercio electronico'],
      parentIds: ['industry:retail', 'industry:technology'],
      examples: ['online stores', 'marketplaces', 'DTC commerce'],
      status: 'active'
    },
    {
      id: 'sector:edtech',
      level: 'sector',
      label: { es: 'Edtech', en: 'Edtech' },
      aliases: ['edtech', 'education technology', 'tecnologia educativa'],
      parentIds: ['industry:education', 'industry:technology'],
      examples: ['learning platforms', 'LMS', 'online training'],
      status: 'active'
    },
    {
      id: 'sector:hrtech',
      level: 'sector',
      label: { es: 'HR tech', en: 'HR tech' },
      aliases: ['hrtech', 'hr tech', 'human resources technology', 'tecnologia rrhh'],
      parentIds: ['industry:technology', 'industry:professional_services'],
      examples: ['HRIS', 'recruiting platforms', 'people analytics'],
      status: 'active'
    },
    {
      id: 'sector:proptech',
      level: 'sector',
      label: { es: 'Proptech', en: 'Proptech' },
      aliases: ['proptech', 'property technology', 'tecnologia inmobiliaria'],
      parentIds: ['industry:real_estate', 'industry:technology'],
      examples: ['property platforms', 'leasing tools', 'real estate CRM'],
      status: 'active'
    },
    {
      id: 'sector:legaltech',
      level: 'sector',
      label: { es: 'Legaltech', en: 'Legaltech' },
      aliases: ['legaltech', 'legal tech', 'tecnologia legal'],
      parentIds: ['industry:legal', 'industry:technology'],
      examples: ['contract automation', 'legal operations platforms'],
      status: 'active'
    },
    {
      id: 'sector:cleantech',
      level: 'sector',
      label: { es: 'Cleantech', en: 'Cleantech' },
      aliases: ['cleantech', 'clean tech', 'climate tech', 'sustainability technology'],
      parentIds: ['industry:energy', 'industry:technology'],
      examples: ['renewables software', 'carbon accounting', 'energy efficiency'],
      status: 'active'
    },
    {
      id: 'sector:banking_insurance',
      level: 'sector',
      label: { es: 'Banca y seguros', en: 'Banking and insurance' },
      aliases: ['banking', 'banca', 'insurance', 'seguros', 'insurtech'],
      parentIds: ['industry:finance'],
      examples: ['banks', 'insurance carriers', 'brokerages'],
      status: 'active'
    },
    {
      id: 'sector:payments',
      level: 'sector',
      label: { es: 'Pagos', en: 'Payments' },
      aliases: ['payments', 'pagos', 'payment processing', 'procesamiento de pagos'],
      parentIds: ['industry:finance', 'sector:fintech'],
      examples: ['payment gateways', 'payment orchestration'],
      status: 'active'
    },
    {
      id: 'sector:supply_chain',
      level: 'sector',
      label: { es: 'Supply chain', en: 'Supply chain' },
      aliases: ['supply chain', 'cadena de suministro', 'logistics software'],
      parentIds: ['industry:logistics', 'industry:manufacturing'],
      examples: ['inventory planning', 'transport management'],
      status: 'active'
    },
    {
      id: 'category:crm',
      level: 'product_service_category',
      label: { es: 'CRM', en: 'CRM' },
      aliases: ['crm', 'customer relationship management'],
      parentIds: ['sector:martech', 'sector:revenue_operations'],
      examples: ['HubSpot CRM', 'CRM implementation'],
      status: 'active'
    },
    {
      id: 'category:digital_agency',
      level: 'product_service_category',
      label: { es: 'Agencia digital', en: 'Digital agency' },
      aliases: ['digital agency', 'agencia digital', 'agencia de marketing digital'],
      parentIds: ['sector:marketing_services'],
      examples: ['digital strategy', 'campaign operations'],
      status: 'active'
    },
    {
      id: 'category:growth_operating_system',
      level: 'product_service_category',
      label: { es: 'Growth Operating System', en: 'Growth Operating System' },
      aliases: [
        'growth operating system',
        'growth os',
        'asaas',
        'agency as a service',
        'ecosistema/socio estrategico',
        'agencia o consultoria de crecimiento',
        'agencia consultoria crecimiento',
        'consultoria de crecimiento'
      ],
      parentIds: ['sector:martech', 'sector:revenue_operations'],
      examples: ['ASaaS operating model', 'growth control plane'],
      status: 'active'
    },
    {
      id: 'category:hubspot_consulting',
      level: 'product_service_category',
      label: { es: 'Consultoria HubSpot', en: 'HubSpot consulting' },
      aliases: ['hubspot consulting', 'consultoria hubspot', 'implementacion hubspot', 'hubspot partner'],
      parentIds: ['category:crm', 'sector:martech'],
      examples: ['HubSpot onboarding', 'HubSpot operations'],
      status: 'active'
    },
    {
      id: 'category:web_development',
      level: 'product_service_category',
      label: { es: 'Desarrollo web', en: 'Web development' },
      aliases: ['web development', 'desarrollo web', 'sitios web', 'website development'],
      parentIds: ['sector:marketing_services'],
      examples: ['corporate sites', 'landing pages'],
      status: 'active'
    },
    {
      id: 'category:inbound_marketing',
      level: 'product_service_category',
      label: { es: 'Inbound Marketing', en: 'Inbound Marketing' },
      aliases: ['inbound marketing', 'agencia inbound', 'inbound'],
      parentIds: ['sector:marketing_services', 'sector:martech'],
      examples: ['inbound campaigns', 'lead nurturing'],
      status: 'active'
    },
    {
      id: 'category:marketing_automation',
      level: 'product_service_category',
      label: { es: 'Automatizacion de marketing', en: 'Marketing automation' },
      aliases: ['marketing automation', 'automatizacion de marketing', 'automation'],
      parentIds: ['sector:martech'],
      examples: ['nurture workflows', 'lead scoring'],
      status: 'active'
    },
    {
      id: 'category:customer_service_automation',
      level: 'product_service_category',
      label: { es: 'Automatizacion de servicio al cliente', en: 'Customer service automation' },
      aliases: ['customer service automation', 'automatizacion de servicio al cliente', 'automation'],
      parentIds: ['sector:martech'],
      examples: ['support workflows', 'service chatbots'],
      status: 'active'
    },
    {
      id: 'category:aeo_ai_visibility',
      level: 'product_service_category',
      label: { es: 'AEO / AI Visibility', en: 'AEO / AI Visibility' },
      aliases: ['aeo', 'ai visibility', 'visibilidad ia', 'answer engine optimization', 'ai engine optimization'],
      parentIds: ['sector:martech', 'sector:marketing_services'],
      examples: ['AI visibility grader', 'answer-engine optimization'],
      status: 'active'
    },
    {
      id: 'category:ai_agents',
      level: 'product_service_category',
      label: { es: 'Agentes de IA', en: 'AI agents' },
      aliases: ['ai agents', 'agentes de ia', 'agentic workflows', 'workflows agenticos'],
      parentIds: ['sector:ai_automation', 'sector:b2b_saas'],
      examples: ['business copilots', 'autonomous workflow agents'],
      status: 'active'
    },
    {
      id: 'category:chatbots_virtual_assistants',
      level: 'product_service_category',
      label: { es: 'Chatbots y asistentes virtuales', en: 'Chatbots and virtual assistants' },
      aliases: ['chatbots', 'virtual assistants', 'asistentes virtuales', 'chatbot ia'],
      parentIds: ['sector:ai_automation', 'category:customer_service_automation'],
      examples: ['support bots', 'sales assistants'],
      status: 'active'
    },
    {
      id: 'category:business_intelligence',
      level: 'product_service_category',
      label: { es: 'Business intelligence', en: 'Business intelligence' },
      aliases: ['bi platform', 'plataforma bi', 'dashboards ejecutivos'],
      parentIds: ['sector:data_analytics'],
      examples: ['dashboards', 'metrics reporting', 'executive analytics'],
      status: 'active'
    },
    {
      id: 'category:data_platform',
      level: 'product_service_category',
      label: { es: 'Plataforma de datos', en: 'Data platform' },
      aliases: ['data platform', 'plataforma de datos', 'data warehouse', 'lakehouse'],
      parentIds: ['sector:data_analytics'],
      examples: ['data warehouse', 'ELT', 'data modeling'],
      status: 'active'
    },
    {
      id: 'category:erp',
      level: 'product_service_category',
      label: { es: 'ERP', en: 'ERP' },
      aliases: ['erp', 'enterprise resource planning', 'gestion empresarial'],
      parentIds: ['industry:technology', 'industry:manufacturing', 'industry:retail'],
      examples: ['ERP implementation', 'business operations suite'],
      status: 'active'
    },
    {
      id: 'category:cybersecurity_services',
      level: 'product_service_category',
      label: { es: 'Servicios de ciberseguridad', en: 'Cybersecurity services' },
      aliases: ['cybersecurity services', 'servicios de ciberseguridad', 'mssp', 'managed security'],
      parentIds: ['sector:cybersecurity'],
      examples: ['security monitoring', 'incident response', 'compliance hardening'],
      status: 'active'
    },
    {
      id: 'category:cloud_migration',
      level: 'product_service_category',
      label: { es: 'Migracion cloud', en: 'Cloud migration' },
      aliases: ['cloud migration', 'migracion cloud', 'cloud modernization', 'modernizacion cloud'],
      parentIds: ['sector:cloud_it_services'],
      examples: ['AWS migration', 'Azure migration', 'GCP modernization'],
      status: 'active'
    },
    {
      id: 'category:devops_platform',
      level: 'product_service_category',
      label: { es: 'DevOps platform', en: 'DevOps platform' },
      aliases: ['devops platform', 'devops', 'ci cd platform', 'developer platform'],
      parentIds: ['sector:devtools', 'sector:cloud_it_services'],
      examples: ['CI/CD', 'deployment automation', 'platform engineering'],
      status: 'active'
    },
    {
      id: 'category:ecommerce_platform',
      level: 'product_service_category',
      label: { es: 'Plataforma ecommerce', en: 'Ecommerce platform' },
      aliases: ['ecommerce platform', 'plataforma ecommerce', 'tienda online', 'online store platform'],
      parentIds: ['sector:ecommerce_marketplaces'],
      examples: ['online store', 'checkout', 'catalog operations'],
      status: 'active'
    },
    {
      id: 'category:marketplace_platform',
      level: 'product_service_category',
      label: { es: 'Marketplace', en: 'Marketplace' },
      aliases: ['marketplace platform', 'marketplace digital'],
      parentIds: ['sector:ecommerce_marketplaces'],
      examples: ['multi-vendor marketplace', 'services marketplace'],
      status: 'active'
    },
    {
      id: 'category:payment_gateway',
      level: 'product_service_category',
      label: { es: 'Pasarela de pagos', en: 'Payment gateway' },
      aliases: ['payment gateway', 'pasarela de pagos', 'payment processor', 'procesador de pagos'],
      parentIds: ['sector:payments'],
      examples: ['checkout payments', 'card processing', 'payment links'],
      status: 'active'
    },
    {
      id: 'category:accounting_software',
      level: 'product_service_category',
      label: { es: 'Software contable', en: 'Accounting software' },
      aliases: ['accounting software', 'software contable', 'contabilidad online', 'bookkeeping software'],
      parentIds: ['industry:finance', 'sector:b2b_saas'],
      examples: ['accounting platforms', 'tax reporting', 'invoicing'],
      status: 'active'
    },
    {
      id: 'category:insurance_brokerage',
      level: 'product_service_category',
      label: { es: 'Corretaje de seguros', en: 'Insurance brokerage' },
      aliases: ['insurance brokerage', 'corretaje de seguros', 'broker de seguros'],
      parentIds: ['sector:banking_insurance'],
      examples: ['insurance advisory', 'policy comparison'],
      status: 'active'
    },
    {
      id: 'category:telemedicine',
      level: 'product_service_category',
      label: { es: 'Telemedicina', en: 'Telemedicine' },
      aliases: ['telemedicine', 'telemedicina', 'telehealth', 'telesalud'],
      parentIds: ['sector:healthtech', 'industry:healthcare'],
      examples: ['virtual care', 'remote consultations'],
      status: 'active'
    },
    {
      id: 'category:patient_experience',
      level: 'product_service_category',
      label: { es: 'Experiencia de paciente', en: 'Patient experience' },
      aliases: ['patient experience', 'experiencia de paciente', 'patient engagement'],
      parentIds: ['sector:healthtech', 'industry:healthcare'],
      examples: ['appointment reminders', 'patient portals'],
      status: 'active'
    },
    {
      id: 'category:lms',
      level: 'product_service_category',
      label: { es: 'LMS / plataforma de aprendizaje', en: 'LMS / learning platform' },
      aliases: ['lms', 'learning management system', 'plataforma de aprendizaje', 'aula virtual'],
      parentIds: ['sector:edtech'],
      examples: ['online courses', 'corporate training', 'student portal'],
      status: 'active'
    },
    {
      id: 'category:hris',
      level: 'product_service_category',
      label: { es: 'HRIS / gestion de personas', en: 'HRIS / people management' },
      aliases: ['hris', 'people management platform', 'software rrhh', 'gestion de personas'],
      parentIds: ['sector:hrtech'],
      examples: ['employee records', 'time off', 'performance management'],
      status: 'active'
    },
    {
      id: 'category:recruiting_platform',
      level: 'product_service_category',
      label: { es: 'Plataforma de reclutamiento', en: 'Recruiting platform' },
      aliases: ['recruiting platform', 'ats', 'applicant tracking system', 'plataforma de reclutamiento'],
      parentIds: ['sector:hrtech'],
      examples: ['candidate pipeline', 'job postings', 'screening'],
      status: 'active'
    },
    {
      id: 'category:contract_management',
      level: 'product_service_category',
      label: { es: 'Gestion de contratos', en: 'Contract management' },
      aliases: ['contract management', 'gestion de contratos', 'clm', 'contract lifecycle management'],
      parentIds: ['sector:legaltech', 'industry:legal'],
      examples: ['contract review', 'signature workflows', 'legal repository'],
      status: 'active'
    },
    {
      id: 'category:property_management',
      level: 'product_service_category',
      label: { es: 'Gestion inmobiliaria', en: 'Property management' },
      aliases: ['property management', 'gestion inmobiliaria', 'administracion de propiedades'],
      parentIds: ['sector:proptech', 'industry:real_estate'],
      examples: ['leasing', 'tenant operations', 'building management'],
      status: 'active'
    },
    {
      id: 'category:construction_management',
      level: 'product_service_category',
      label: { es: 'Gestion de construccion', en: 'Construction management' },
      aliases: ['construction management', 'gestion de construccion', 'project construction software'],
      parentIds: ['industry:construction'],
      examples: ['project tracking', 'site operations', 'contractor coordination'],
      status: 'active'
    },
    {
      id: 'category:supply_chain_software',
      level: 'product_service_category',
      label: { es: 'Software de supply chain', en: 'Supply chain software' },
      aliases: ['supply chain software', 'software supply chain', 'inventory planning', 'gestion de inventario'],
      parentIds: ['sector:supply_chain'],
      examples: ['inventory planning', 'warehouse management', 'TMS'],
      status: 'active'
    },
    {
      id: 'category:booking_reservations',
      level: 'product_service_category',
      label: { es: 'Reservas y booking', en: 'Booking and reservations' },
      aliases: ['booking platform', 'reservation system', 'sistema de reservas', 'reservas online'],
      parentIds: ['industry:hospitality_travel'],
      examples: ['hotel booking', 'appointment booking', 'travel reservations'],
      status: 'active'
    },
    {
      id: 'category:content_management',
      level: 'product_service_category',
      label: { es: 'Gestion de contenidos', en: 'Content management' },
      aliases: ['content management', 'cms', 'gestion de contenidos', 'content platform'],
      parentIds: ['industry:media_entertainment', 'sector:marketing_services'],
      examples: ['CMS', 'editorial workflows', 'content publishing'],
      status: 'active'
    },
    {
      id: 'category:public_relations',
      level: 'product_service_category',
      label: { es: 'Relaciones publicas', en: 'Public relations' },
      aliases: ['public relations', 'relaciones publicas', 'pr agency', 'agencia pr'],
      parentIds: ['industry:marketing_communications'],
      examples: ['media relations', 'thought leadership', 'press strategy'],
      status: 'active'
    },
    {
      id: 'category:sustainability_reporting',
      level: 'product_service_category',
      label: { es: 'Reporte de sostenibilidad', en: 'Sustainability reporting' },
      aliases: ['sustainability reporting', 'reporte sostenibilidad', 'carbon accounting', 'contabilidad de carbono'],
      parentIds: ['sector:cleantech', 'industry:energy'],
      examples: ['carbon reports', 'ESG metrics', 'energy reporting'],
      status: 'active'
    },
    {
      id: 'use_case:lead_generation',
      level: 'use_case',
      label: { es: 'Generacion de leads', en: 'Lead generation' },
      aliases: ['lead generation', 'generacion de leads', 'captacion de leads'],
      parentIds: ['sector:marketing_services', 'sector:revenue_operations'],
      examples: ['demand capture', 'lead magnets'],
      status: 'active'
    },
    {
      id: 'use_case:revenue_operations',
      level: 'use_case',
      label: { es: 'Revenue operations', en: 'Revenue operations' },
      aliases: ['revops', 'revenue operations', 'operacion comercial'],
      parentIds: ['sector:revenue_operations'],
      examples: ['pipeline hygiene', 'handoff governance'],
      status: 'active'
    },
    {
      id: 'use_case:aeo_readiness',
      level: 'use_case',
      label: { es: 'Preparacion AEO', en: 'AEO readiness' },
      aliases: ['aeo readiness', 'preparacion aeo', 'ai visibility readiness', 'visibilidad en ia'],
      parentIds: ['category:aeo_ai_visibility'],
      examples: ['entity readiness', 'citation readiness'],
      status: 'active'
    },
    {
      id: 'use_case:crm_implementation',
      level: 'use_case',
      label: { es: 'Implementacion CRM', en: 'CRM implementation' },
      aliases: ['crm implementation', 'implementacion crm', 'hubspot onboarding'],
      parentIds: ['category:crm', 'category:hubspot_consulting'],
      examples: ['CRM setup', 'sales pipeline setup'],
      status: 'active'
    },
    {
      id: 'use_case:demand_generation',
      level: 'use_case',
      label: { es: 'Generacion de demanda', en: 'Demand generation' },
      aliases: ['demand generation', 'generacion de demanda', 'demand gen'],
      parentIds: ['sector:marketing_services', 'sector:revenue_operations'],
      examples: ['campaign programs', 'pipeline creation'],
      status: 'active'
    },
    {
      id: 'use_case:customer_acquisition',
      level: 'use_case',
      label: { es: 'Adquisicion de clientes', en: 'Customer acquisition' },
      aliases: ['customer acquisition', 'adquisicion de clientes', 'user acquisition'],
      parentIds: ['sector:marketing_services', 'sector:ecommerce_marketplaces'],
      examples: ['paid acquisition', 'conversion funnels'],
      status: 'active'
    },
    {
      id: 'use_case:customer_retention',
      level: 'use_case',
      label: { es: 'Retencion de clientes', en: 'Customer retention' },
      aliases: ['customer retention', 'retencion de clientes', 'churn reduction'],
      parentIds: ['sector:martech', 'sector:revenue_operations'],
      examples: ['lifecycle marketing', 'renewal programs'],
      status: 'active'
    },
    {
      id: 'use_case:customer_support',
      level: 'use_case',
      label: { es: 'Atencion y soporte al cliente', en: 'Customer support' },
      aliases: ['customer support', 'soporte al cliente', 'customer service'],
      parentIds: ['category:customer_service_automation', 'category:chatbots_virtual_assistants'],
      examples: ['ticket triage', 'self-service support'],
      status: 'active'
    },
    {
      id: 'use_case:sales_enablement',
      level: 'use_case',
      label: { es: 'Sales enablement', en: 'Sales enablement' },
      aliases: ['sales enablement', 'habilitacion comercial', 'sales productivity'],
      parentIds: ['sector:revenue_operations', 'category:crm'],
      examples: ['playbooks', 'sales content', 'pipeline coaching'],
      status: 'active'
    },
    {
      id: 'use_case:onboarding_activation',
      level: 'use_case',
      label: { es: 'Onboarding y activacion', en: 'Onboarding and activation' },
      aliases: ['onboarding', 'customer onboarding', 'activacion de usuarios', 'user activation'],
      parentIds: ['sector:b2b_saas', 'sector:martech'],
      examples: ['new user setup', 'activation journeys'],
      status: 'active'
    },
    {
      id: 'use_case:analytics_reporting',
      level: 'use_case',
      label: { es: 'Analitica y reporting', en: 'Analytics and reporting' },
      aliases: ['analytics reporting', 'analitica y reporting', 'reporting ejecutivo', 'metric reporting'],
      parentIds: ['sector:data_analytics', 'category:business_intelligence'],
      examples: ['KPI dashboards', 'business reviews'],
      status: 'active'
    },
    {
      id: 'use_case:compliance_risk',
      level: 'use_case',
      label: { es: 'Compliance y gestion de riesgo', en: 'Compliance and risk management' },
      aliases: ['compliance', 'risk management', 'gestion de riesgo', 'cumplimiento normativo'],
      parentIds: ['sector:cybersecurity', 'sector:banking_insurance', 'industry:legal'],
      examples: ['policy controls', 'audit readiness', 'risk reviews'],
      status: 'active'
    },
    {
      id: 'use_case:talent_acquisition',
      level: 'use_case',
      label: { es: 'Atraccion de talento', en: 'Talent acquisition' },
      aliases: ['talent acquisition', 'atraccion de talento', 'recruiting'],
      parentIds: ['sector:hrtech', 'category:recruiting_platform'],
      examples: ['candidate sourcing', 'hiring funnels'],
      status: 'active'
    },
    {
      id: 'use_case:procurement_sourcing',
      level: 'use_case',
      label: { es: 'Compras y abastecimiento', en: 'Procurement and sourcing' },
      aliases: ['procurement', 'sourcing', 'compras', 'abastecimiento'],
      parentIds: ['industry:manufacturing', 'sector:supply_chain'],
      examples: ['supplier management', 'purchase workflows'],
      status: 'active'
    },
    {
      id: 'use_case:field_operations',
      level: 'use_case',
      label: { es: 'Operaciones en terreno', en: 'Field operations' },
      aliases: ['field operations', 'operaciones en terreno', 'field service'],
      parentIds: ['industry:construction', 'industry:logistics'],
      examples: ['site visits', 'crew dispatch', 'mobile checklists'],
      status: 'active'
    },
    {
      id: 'use_case:appointment_scheduling',
      level: 'use_case',
      label: { es: 'Agendamiento de citas', en: 'Appointment scheduling' },
      aliases: ['appointment scheduling', 'agendamiento de citas', 'booking appointments'],
      parentIds: ['industry:healthcare', 'category:booking_reservations'],
      examples: ['clinic appointments', 'sales meetings', 'service bookings'],
      status: 'active'
    },
    {
      id: 'use_case:content_operations',
      level: 'use_case',
      label: { es: 'Operaciones de contenido', en: 'Content operations' },
      aliases: ['content operations', 'operaciones de contenido', 'editorial operations'],
      parentIds: ['category:content_management', 'sector:marketing_services'],
      examples: ['content calendar', 'publishing workflow', 'asset governance'],
      status: 'active'
    },
    {
      id: 'use_case:brand_awareness',
      level: 'use_case',
      label: { es: 'Reconocimiento de marca', en: 'Brand awareness' },
      aliases: ['brand awareness', 'reconocimiento de marca', 'brand visibility'],
      parentIds: ['industry:marketing_communications', 'category:public_relations'],
      examples: ['share of voice', 'media presence', 'brand campaigns'],
      status: 'active'
    },
    {
      id: 'use_case:ecommerce_conversion',
      level: 'use_case',
      label: { es: 'Conversion ecommerce', en: 'Ecommerce conversion' },
      aliases: ['ecommerce conversion', 'conversion ecommerce', 'checkout conversion'],
      parentIds: ['sector:ecommerce_marketplaces', 'category:ecommerce_platform'],
      examples: ['checkout optimization', 'cart recovery', 'conversion rate optimization'],
      status: 'active'
    },
    {
      id: 'buyer:cmo',
      level: 'buyer_persona',
      label: { es: 'CMO / marketing leader', en: 'CMO / marketing leader' },
      aliases: ['cmo', 'marketing leader', 'director de marketing', 'gerente de marketing'],
      parentIds: [],
      examples: ['brand and demand leader'],
      status: 'active'
    },
    {
      id: 'buyer:revops_leader',
      level: 'buyer_persona',
      label: { es: 'RevOps leader', en: 'RevOps leader' },
      aliases: ['revops leader', 'revenue operations leader', 'lider revops'],
      parentIds: [],
      examples: ['revenue operations owner'],
      status: 'active'
    },
    {
      id: 'buyer:founder',
      level: 'buyer_persona',
      label: { es: 'Founder', en: 'Founder' },
      aliases: ['founder', 'fundador', 'ceo founder'],
      parentIds: [],
      examples: ['startup founder', 'owner operator'],
      status: 'active'
    },
    {
      id: 'buyer:operations_leader',
      level: 'buyer_persona',
      label: { es: 'Operations leader', en: 'Operations leader' },
      aliases: ['operations leader', 'lider operaciones', 'coo'],
      parentIds: [],
      examples: ['operations lead', 'COO'],
      status: 'active'
    },
    {
      id: 'buyer:cio',
      level: 'buyer_persona',
      label: { es: 'CIO / IT leader', en: 'CIO / IT leader' },
      aliases: ['cio', 'it leader', 'director ti', 'gerente ti'],
      parentIds: [],
      examples: ['technology operations owner'],
      status: 'active'
    },
    {
      id: 'buyer:cto',
      level: 'buyer_persona',
      label: { es: 'CTO / engineering leader', en: 'CTO / engineering leader' },
      aliases: ['cto', 'engineering leader', 'vp engineering', 'lider tecnologia'],
      parentIds: [],
      examples: ['product and engineering owner'],
      status: 'active'
    },
    {
      id: 'buyer:cfo',
      level: 'buyer_persona',
      label: { es: 'CFO / finance leader', en: 'CFO / finance leader' },
      aliases: ['cfo', 'finance leader', 'director financiero', 'gerente finanzas'],
      parentIds: [],
      examples: ['finance and accounting owner'],
      status: 'active'
    },
    {
      id: 'buyer:chro',
      level: 'buyer_persona',
      label: { es: 'CHRO / people leader', en: 'CHRO / people leader' },
      aliases: ['chro', 'people leader', 'hr leader', 'gerente rrhh'],
      parentIds: [],
      examples: ['people operations owner'],
      status: 'active'
    },
    {
      id: 'buyer:sales_leader',
      level: 'buyer_persona',
      label: { es: 'Sales leader', en: 'Sales leader' },
      aliases: ['sales leader', 'director comercial', 'gerente comercial', 'vp sales'],
      parentIds: [],
      examples: ['sales team owner'],
      status: 'active'
    },
    {
      id: 'buyer:customer_success_leader',
      level: 'buyer_persona',
      label: { es: 'Customer Success leader', en: 'Customer Success leader' },
      aliases: ['customer success leader', 'cs leader', 'gerente customer success'],
      parentIds: [],
      examples: ['retention and expansion owner'],
      status: 'active'
    },
    {
      id: 'buyer:security_leader',
      level: 'buyer_persona',
      label: { es: 'Security leader', en: 'Security leader' },
      aliases: ['ciso', 'security leader', 'lider seguridad', 'gerente seguridad informatica'],
      parentIds: [],
      examples: ['information security owner'],
      status: 'active'
    },
    {
      id: 'buyer:legal_counsel',
      level: 'buyer_persona',
      label: { es: 'Legal counsel', en: 'Legal counsel' },
      aliases: ['legal counsel', 'abogado corporativo', 'general counsel', 'fiscalia'],
      parentIds: [],
      examples: ['legal operations owner'],
      status: 'active'
    },
    {
      id: 'buyer:clinic_manager',
      level: 'buyer_persona',
      label: { es: 'Clinic manager', en: 'Clinic manager' },
      aliases: ['clinic manager', 'administrador de clinica', 'healthcare administrator'],
      parentIds: [],
      examples: ['clinic operations owner'],
      status: 'active'
    },
    {
      id: 'buyer:ecommerce_manager',
      level: 'buyer_persona',
      label: { es: 'Ecommerce manager', en: 'Ecommerce manager' },
      aliases: ['ecommerce manager', 'gerente ecommerce', 'ecommerce lead'],
      parentIds: [],
      examples: ['online commerce owner'],
      status: 'active'
    },
    {
      id: 'buyer:property_manager',
      level: 'buyer_persona',
      label: { es: 'Property manager', en: 'Property manager' },
      aliases: ['property manager', 'administrador de propiedades', 'real estate manager'],
      parentIds: [],
      examples: ['property operations owner'],
      status: 'active'
    },
    {
      id: 'market:chile',
      level: 'market',
      label: { es: 'Chile', en: 'Chile' },
      aliases: ['chile', 'cl'],
      parentIds: [],
      examples: ['Chile market'],
      status: 'active'
    },
    {
      id: 'market:latam',
      level: 'market',
      label: { es: 'LatAm', en: 'LatAm' },
      aliases: ['latam', 'latin america', 'latinoamerica', 'america latina'],
      parentIds: [],
      examples: ['regional Spanish-speaking market'],
      status: 'active'
    },
    {
      id: 'market:global',
      level: 'market',
      label: { es: 'Global', en: 'Global' },
      aliases: ['global', 'worldwide', 'internacional'],
      parentIds: [],
      examples: ['global market'],
      status: 'active'
    },
    {
      id: 'market:enterprise',
      level: 'market',
      label: { es: 'Enterprise', en: 'Enterprise' },
      aliases: ['enterprise', 'corporativo', 'gran empresa'],
      parentIds: [],
      examples: ['large companies', 'enterprise accounts'],
      status: 'active'
    },
    {
      id: 'market:mid_market',
      level: 'market',
      label: { es: 'Mid-market', en: 'Mid-market' },
      aliases: ['mid-market', 'mid market', 'mediana empresa'],
      parentIds: [],
      examples: ['mid-sized companies'],
      status: 'active'
    },
    {
      id: 'market:small_business',
      level: 'market',
      label: { es: 'Pequena empresa', en: 'Small business' },
      aliases: ['small business', 'pequena empresa', 'pyme', 'smb'],
      parentIds: [],
      examples: ['small business segment'],
      status: 'active'
    },
    {
      id: 'market:startup',
      level: 'market',
      label: { es: 'Startup', en: 'Startup' },
      aliases: ['startup', 'startups', 'early stage', 'scaleup'],
      parentIds: [],
      examples: ['early-stage companies', 'scaleups'],
      status: 'active'
    },
    {
      id: 'market:public_sector',
      level: 'market',
      label: { es: 'Sector publico', en: 'Public sector' },
      aliases: ['public sector buyers', 'compradores sector publico', 'government buyers'],
      parentIds: ['industry:government'],
      examples: ['public agencies', 'municipal procurement'],
      status: 'active'
    },
    {
      id: 'market:united_states',
      level: 'market',
      label: { es: 'Estados Unidos', en: 'United States' },
      aliases: ['united states', 'usa', 'us market', 'estados unidos'],
      parentIds: [],
      examples: ['US market'],
      status: 'active'
    },
    {
      id: 'market:mexico',
      level: 'market',
      label: { es: 'Mexico', en: 'Mexico' },
      aliases: ['mexico', 'mx'],
      parentIds: ['market:latam'],
      examples: ['Mexico market'],
      status: 'active'
    },
    {
      id: 'market:colombia',
      level: 'market',
      label: { es: 'Colombia', en: 'Colombia' },
      aliases: ['colombia', 'co'],
      parentIds: ['market:latam'],
      examples: ['Colombia market'],
      status: 'active'
    },
    {
      id: 'market:peru',
      level: 'market',
      label: { es: 'Peru', en: 'Peru' },
      aliases: ['peru', 'pe'],
      parentIds: ['market:latam'],
      examples: ['Peru market'],
      status: 'active'
    },
    {
      id: 'market:brazil',
      level: 'market',
      label: { es: 'Brasil', en: 'Brazil' },
      aliases: ['brazil', 'brasil', 'br'],
      parentIds: ['market:latam'],
      examples: ['Brazil market'],
      status: 'active'
    },
    {
      id: 'market:spain',
      level: 'market',
      label: { es: 'Espana', en: 'Spain' },
      aliases: ['spain', 'espana', 'es'],
      parentIds: [],
      examples: ['Spain market'],
      status: 'active'
    }
  ]
}

export const CATEGORY_TAXONOMY_NODES_BY_ID = new Map(
  CATEGORY_TAXONOMY.nodes.map(node => [node.id, node])
)

export const getCategoryTaxonomyNode = (nodeId: string): CategoryTaxonomyNode | null =>
  CATEGORY_TAXONOMY_NODES_BY_ID.get(nodeId) ?? null

export const validateCategoryTaxonomy = (
  taxonomy: CategoryTaxonomy = CATEGORY_TAXONOMY
): CategoryTaxonomyValidationResult => {
  const errors: string[] = []
  const ids = new Set<string>()

  for (const node of taxonomy.nodes) {
    if (ids.has(node.id)) errors.push(`Duplicate taxonomy id: ${node.id}`)
    ids.add(node.id)

    if (!(CATEGORY_TAXONOMY_LEVELS as readonly string[]).includes(node.level)) {
      errors.push(`Invalid level for ${node.id}`)
    }

    if (!(CATEGORY_TAXONOMY_NODE_STATUSES as readonly string[]).includes(node.status)) {
      errors.push(`Invalid status for ${node.id}`)
    }

    if (node.label.es.trim().length === 0 || node.label.en.trim().length === 0) {
      errors.push(`Missing label for ${node.id}`)
    }
  }

  for (const node of taxonomy.nodes) {
    for (const parentId of node.parentIds) {
      if (!ids.has(parentId)) errors.push(`Missing parent ${parentId} for ${node.id}`)
    }
  }

  return { ok: errors.length === 0, errors }
}
