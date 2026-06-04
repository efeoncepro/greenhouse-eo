// TASK-992 — HubSpot Industry enum (SSOT). The canonical company `industry`
// property options, fetched verbatim from the Greenhouse HubSpot portal
// (companies.industry, ~147 options). Single source of truth so the onboarding
// wizard dropdown + any downstream consumer use the EXACT same values as HubSpot —
// killing the free-text drift ("Minoristas" vs "Retail" vs "Comercio"). Store the
// stable `value` (e.g. 'RETAIL'); display the `label` (e.g. 'Retail').
//
// These options "cannot be deleted" in HubSpot but custom ones can be added — if a
// portal adds a custom industry, append it here (keep value === HubSpot internal name).

export interface HubSpotIndustryOption {
  value: string
  label: string
}

export const HUBSPOT_INDUSTRIES: HubSpotIndustryOption[] = [
  { value: 'ACCOUNTING', label: 'Accounting' },
  { value: 'AIRLINES_AVIATION', label: 'Airlines/Aviation' },
  { value: 'ALTERNATIVE_DISPUTE_RESOLUTION', label: 'Alternative Dispute Resolution' },
  { value: 'ALTERNATIVE_MEDICINE', label: 'Alternative Medicine' },
  { value: 'ANIMATION', label: 'Animation' },
  { value: 'APPAREL_FASHION', label: 'Apparel & Fashion' },
  { value: 'ARCHITECTURE_PLANNING', label: 'Architecture & Planning' },
  { value: 'ARTS_AND_CRAFTS', label: 'Arts and Crafts' },
  { value: 'AUTOMOTIVE', label: 'Automotive' },
  { value: 'AVIATION_AEROSPACE', label: 'Aviation & Aerospace' },
  { value: 'BANKING', label: 'Banking' },
  { value: 'BIOTECHNOLOGY', label: 'Biotechnology' },
  { value: 'BROADCAST_MEDIA', label: 'Broadcast Media' },
  { value: 'BUILDING_MATERIALS', label: 'Building Materials' },
  { value: 'BUSINESS_SUPPLIES_AND_EQUIPMENT', label: 'Business Supplies and Equipment' },
  { value: 'CAPITAL_MARKETS', label: 'Capital Markets' },
  { value: 'CHEMICALS', label: 'Chemicals' },
  { value: 'CIVIC_SOCIAL_ORGANIZATION', label: 'Civic & Social Organization' },
  { value: 'CIVIL_ENGINEERING', label: 'Civil Engineering' },
  { value: 'COMMERCIAL_REAL_ESTATE', label: 'Commercial Real Estate' },
  { value: 'COMPUTER_NETWORK_SECURITY', label: 'Computer & Network Security' },
  { value: 'COMPUTER_GAMES', label: 'Computer Games' },
  { value: 'COMPUTER_HARDWARE', label: 'Computer Hardware' },
  { value: 'COMPUTER_NETWORKING', label: 'Computer Networking' },
  { value: 'COMPUTER_SOFTWARE', label: 'Computer Software' },
  { value: 'INTERNET', label: 'Internet' },
  { value: 'CONSTRUCTION', label: 'Construction' },
  { value: 'CONSUMER_ELECTRONICS', label: 'Consumer Electronics' },
  { value: 'CONSUMER_GOODS', label: 'Consumer Goods' },
  { value: 'CONSUMER_SERVICES', label: 'Consumer Services' },
  { value: 'COSMETICS', label: 'Cosmetics' },
  { value: 'DAIRY', label: 'Dairy' },
  { value: 'DEFENSE_SPACE', label: 'Defense & Space' },
  { value: 'DESIGN', label: 'Design' },
  { value: 'EDUCATION_MANAGEMENT', label: 'Education Management' },
  { value: 'E_LEARNING', label: 'E-Learning' },
  { value: 'ELECTRICAL_ELECTRONIC_MANUFACTURING', label: 'Electrical/Electronic Manufacturing' },
  { value: 'ENTERTAINMENT', label: 'Entertainment' },
  { value: 'ENVIRONMENTAL_SERVICES', label: 'Environmental Services' },
  { value: 'EVENTS_SERVICES', label: 'Events Services' },
  { value: 'EXECUTIVE_OFFICE', label: 'Executive Office' },
  { value: 'FACILITIES_SERVICES', label: 'Facilities Services' },
  { value: 'FARMING', label: 'Farming' },
  { value: 'FINANCIAL_SERVICES', label: 'Financial Services' },
  { value: 'FINE_ART', label: 'Fine Art' },
  { value: 'FISHERY', label: 'Fishery' },
  { value: 'FOOD_BEVERAGES', label: 'Food & Beverages' },
  { value: 'FOOD_PRODUCTION', label: 'Food Production' },
  { value: 'FUND_RAISING', label: 'Fund-Raising' },
  { value: 'FURNITURE', label: 'Furniture' },
  { value: 'GAMBLING_CASINOS', label: 'Gambling & Casinos' },
  { value: 'GLASS_CERAMICS_CONCRETE', label: 'Glass, Ceramics & Concrete' },
  { value: 'GOVERNMENT_ADMINISTRATION', label: 'Government Administration' },
  { value: 'GOVERNMENT_RELATIONS', label: 'Government Relations' },
  { value: 'GRAPHIC_DESIGN', label: 'Graphic Design' },
  { value: 'HEALTH_WELLNESS_AND_FITNESS', label: 'Health, Wellness and Fitness' },
  { value: 'HIGHER_EDUCATION', label: 'Higher Education' },
  { value: 'HOSPITAL_HEALTH_CARE', label: 'Hospital & Health Care' },
  { value: 'HOSPITALITY', label: 'Hospitality' },
  { value: 'HUMAN_RESOURCES', label: 'Human Resources' },
  { value: 'IMPORT_AND_EXPORT', label: 'Import and Export' },
  { value: 'INDIVIDUAL_FAMILY_SERVICES', label: 'Individual & Family Services' },
  { value: 'INDUSTRIAL_AUTOMATION', label: 'Industrial Automation' },
  { value: 'INFORMATION_SERVICES', label: 'Information Services' },
  { value: 'INFORMATION_TECHNOLOGY_AND_SERVICES', label: 'Information Technology and Services' },
  { value: 'INSURANCE', label: 'Insurance' },
  { value: 'INTERNATIONAL_AFFAIRS', label: 'International Affairs' },
  { value: 'INTERNATIONAL_TRADE_AND_DEVELOPMENT', label: 'International Trade and Development' },
  { value: 'INVESTMENT_BANKING', label: 'Investment Banking' },
  { value: 'INVESTMENT_MANAGEMENT', label: 'Investment Management' },
  { value: 'JUDICIARY', label: 'Judiciary' },
  { value: 'LAW_ENFORCEMENT', label: 'Law Enforcement' },
  { value: 'LAW_PRACTICE', label: 'Law Practice' },
  { value: 'LEGAL_SERVICES', label: 'Legal Services' },
  { value: 'LEGISLATIVE_OFFICE', label: 'Legislative Office' },
  { value: 'LEISURE_TRAVEL_TOURISM', label: 'Leisure, Travel & Tourism' },
  { value: 'LIBRARIES', label: 'Libraries' },
  { value: 'LOGISTICS_AND_SUPPLY_CHAIN', label: 'Logistics and Supply Chain' },
  { value: 'LUXURY_GOODS_JEWELRY', label: 'Luxury Goods & Jewelry' },
  { value: 'MACHINERY', label: 'Machinery' },
  { value: 'MANAGEMENT_CONSULTING', label: 'Management Consulting' },
  { value: 'MARITIME', label: 'Maritime' },
  { value: 'MARKET_RESEARCH', label: 'Market Research' },
  { value: 'MARKETING_AND_ADVERTISING', label: 'Marketing and Advertising' },
  { value: 'MECHANICAL_OR_INDUSTRIAL_ENGINEERING', label: 'Mechanical or Industrial Engineering' },
  { value: 'MEDIA_PRODUCTION', label: 'Media Production' },
  { value: 'MEDICAL_DEVICES', label: 'Medical Devices' },
  { value: 'MEDICAL_PRACTICE', label: 'Medical Practice' },
  { value: 'MENTAL_HEALTH_CARE', label: 'Mental Health Care' },
  { value: 'MILITARY', label: 'Military' },
  { value: 'MINING_METALS', label: 'Mining & Metals' },
  { value: 'MOTION_PICTURES_AND_FILM', label: 'Motion Pictures and Film' },
  { value: 'MUSEUMS_AND_INSTITUTIONS', label: 'Museums and Institutions' },
  { value: 'MUSIC', label: 'Music' },
  { value: 'NANOTECHNOLOGY', label: 'Nanotechnology' },
  { value: 'NEWSPAPERS', label: 'Newspapers' },
  { value: 'NON_PROFIT_ORGANIZATION_MANAGEMENT', label: 'Non-Profit Organization Management' },
  { value: 'OIL_ENERGY', label: 'Oil & Energy' },
  { value: 'ONLINE_MEDIA', label: 'Online Media' },
  { value: 'OUTSOURCING_OFFSHORING', label: 'Outsourcing/Offshoring' },
  { value: 'PACKAGE_FREIGHT_DELIVERY', label: 'Package/Freight Delivery' },
  { value: 'PACKAGING_AND_CONTAINERS', label: 'Packaging and Containers' },
  { value: 'PAPER_FOREST_PRODUCTS', label: 'Paper & Forest Products' },
  { value: 'PERFORMING_ARTS', label: 'Performing Arts' },
  { value: 'PHARMACEUTICALS', label: 'Pharmaceuticals' },
  { value: 'PHILANTHROPY', label: 'Philanthropy' },
  { value: 'PHOTOGRAPHY', label: 'Photography' },
  { value: 'PLASTICS', label: 'Plastics' },
  { value: 'POLITICAL_ORGANIZATION', label: 'Political Organization' },
  { value: 'PRIMARY_SECONDARY_EDUCATION', label: 'Primary/Secondary Education' },
  { value: 'PRINTING', label: 'Printing' },
  { value: 'PROFESSIONAL_TRAINING_COACHING', label: 'Professional Training & Coaching' },
  { value: 'PROGRAM_DEVELOPMENT', label: 'Program Development' },
  { value: 'PUBLIC_POLICY', label: 'Public Policy' },
  { value: 'PUBLIC_RELATIONS_AND_COMMUNICATIONS', label: 'Public Relations and Communications' },
  { value: 'PUBLIC_SAFETY', label: 'Public Safety' },
  { value: 'PUBLISHING', label: 'Publishing' },
  { value: 'RAILROAD_MANUFACTURE', label: 'Railroad Manufacture' },
  { value: 'RANCHING', label: 'Ranching' },
  { value: 'REAL_ESTATE', label: 'Real Estate' },
  { value: 'RECREATIONAL_FACILITIES_AND_SERVICES', label: 'Recreational Facilities and Services' },
  { value: 'RELIGIOUS_INSTITUTIONS', label: 'Religious Institutions' },
  { value: 'RENEWABLES_ENVIRONMENT', label: 'Renewables & Environment' },
  { value: 'RESEARCH', label: 'Research' },
  { value: 'RESTAURANTS', label: 'Restaurants' },
  { value: 'RETAIL', label: 'Retail' },
  { value: 'SECURITY_AND_INVESTIGATIONS', label: 'Security and Investigations' },
  { value: 'SEMICONDUCTORS', label: 'Semiconductors' },
  { value: 'SHIPBUILDING', label: 'Shipbuilding' },
  { value: 'SPORTING_GOODS', label: 'Sporting Goods' },
  { value: 'SPORTS', label: 'Sports' },
  { value: 'STAFFING_AND_RECRUITING', label: 'Staffing and Recruiting' },
  { value: 'SUPERMARKETS', label: 'Supermarkets' },
  { value: 'TELECOMMUNICATIONS', label: 'Telecommunications' },
  { value: 'TEXTILES', label: 'Textiles' },
  { value: 'THINK_TANKS', label: 'Think Tanks' },
  { value: 'TOBACCO', label: 'Tobacco' },
  { value: 'TRANSLATION_AND_LOCALIZATION', label: 'Translation and Localization' },
  { value: 'TRANSPORTATION_TRUCKING_RAILROAD', label: 'Transportation/Trucking/Railroad' },
  { value: 'UTILITIES', label: 'Utilities' },
  { value: 'VENTURE_CAPITAL_PRIVATE_EQUITY', label: 'Venture Capital & Private Equity' },
  { value: 'VETERINARY', label: 'Veterinary' },
  { value: 'WAREHOUSING', label: 'Warehousing' },
  { value: 'WHOLESALE', label: 'Wholesale' },
  { value: 'WINE_AND_SPIRITS', label: 'Wine and Spirits' },
  { value: 'WIRELESS', label: 'Wireless' },
  { value: 'WRITING_AND_EDITING', label: 'Writing and Editing' },
  { value: 'MOBILE_GAMES', label: 'Mobile Games' }
]

const LABEL_BY_VALUE = new Map(HUBSPOT_INDUSTRIES.map(o => [o.value, o.label]))
const VALUE_BY_LABEL = new Map(HUBSPOT_INDUSTRIES.map(o => [o.label.toLowerCase(), o.value]))

/** Resolve the display label for a stored HubSpot industry value. */
export const hubspotIndustryLabel = (value: string | null | undefined): string | null =>
  value ? LABEL_BY_VALUE.get(value) ?? value : null

/** Find the option for a stored value (Autocomplete value object). */
export const hubspotIndustryOption = (value: string | null | undefined): HubSpotIndustryOption | null =>
  value ? HUBSPOT_INDUSTRIES.find(o => o.value === value) ?? null : null

/**
 * Best-effort coercion of an arbitrary inbound industry (legacy free text or a
 * HubSpot value) to a canonical option value. Matches by value first, then by
 * case-insensitive label. Returns null when it can't be mapped (operator picks).
 */
export const coerceHubspotIndustryValue = (raw: string | null | undefined): string | null => {
  if (!raw) return null
  const trimmed = raw.trim()

  if (LABEL_BY_VALUE.has(trimmed)) return trimmed
  
return VALUE_BY_LABEL.get(trimmed.toLowerCase()) ?? null
}
