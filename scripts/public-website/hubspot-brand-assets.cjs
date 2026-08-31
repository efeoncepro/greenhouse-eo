/** Additive operator-approved brand controls. Do not renumber existing Elementor keys. */
const cheerio=require('cheerio');
const products=['smart-crm','marketing','sales','service','content','data','revenue','agent-hub'];
const fieldFor=name=>'brand_'+name.replaceAll('-','_')+'_icon';
const assetFor=name=>['smart-crm','agent-hub'].includes(name)?name:name+'-hub';
const semanticIcons={"8":{"key":"aeo","name":"AEO","icon":"world-search"},"9":{"key":"sales_workspace","name":"Sales Workspace","icon":"briefcase"},"10":{"key":"customer_success","name":"Customer Success Workspace","icon":"heart-handshake"},"11":{"key":"marketing_studio","name":"Marketing Studio","icon":"palette"},"13":{"key":"enablement","name":"Enablement conversacional","icon":"messages"}};
const semanticImage=(index,panel=false)=>'<img class="'+(panel?'hsx-panel-semantic-icon':'hsx-semantic-icon')+'" src="%%brand_'+semanticIcons[index].key+'_semantic_icon%%" alt="" aria-hidden="true" width="'+(panel?48:26)+'" height="'+(panel?48:26)+'" loading="lazy" decoding="async">';
const engines=[{key:'chatgpt',name:'ChatGPT',asset:'gpt'},{key:'claude',name:'Claude',asset:'claude'},{key:'gemini',name:'Gemini',asset:'gemini'}];
const engineGroup=()=>'<div class="hsx-mcp-brands">'+engines.map(e=>'<span class="hsx-mcp-brand-disc"><img src="%%brand_'+e.key+'_logo%%" alt="'+e.name+'" width="20" height="20" loading="lazy" decoding="async"></span>').join('')+'</div>';
module.exports=function applyBrandAssets(key,c){
 if(key==='hubs'){
  const q=cheerio.load(c.template,{},false);
  products.forEach((name,i)=>{
   const field=fieldFor(name);
   if(!c.fields.some(f=>f.key===field))c.fields.push({key:field,type:'media',label:`Icono oficial · ${name==='smart-crm'?'Smart CRM':name==='agent-hub'?'Agent Hub (agentes)':name[0].toUpperCase()+name.slice(1)+' Hub'}`});
   c.defaults[field]={url:`@hubspot/${assetFor(name)}.svg`};
   const b=q(`[data-hsx-select="${i}"]`);b.find('.hsx-hub-brand-icon').remove();
   b.children().first().after(`<img class="hsx-hub-brand-icon" src="%%${field}%%" alt="" aria-hidden="true" width="26" height="26" loading="lazy" decoding="async">`);
  });
  engines.forEach(e=>{const key='brand_'+e.key+'_logo';if(!c.fields.some(f=>f.key===key))c.fields.push({key,type:'media',label:'Logo MCP · '+e.name});c.defaults[key]={url:'https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets/assets/img/engines/engine-'+e.asset+'.png'};});
  for(const [index,icon] of Object.entries(semanticIcons)){const key='brand_'+icon.key+'_semantic_icon';if(!c.fields.some(f=>f.key===key))c.fields.push({key,type:'media',label:'Icono semántico · '+icon.name});c.defaults[key]={url:'@hubspot/semantic-'+icon.icon+'.svg'};const b=q('[data-hsx-select="'+index+'"]');b.find('.hsx-semantic-icon').remove();b.children().first().after(semanticImage(index));}
  const mcp=q('[data-hsx-select="12"]');mcp.find('.hsx-mcp-brands').remove();mcp.children().first().after(engineGroup());
  c.template=q.html();
 }
 if(key==='proof-ledger'){
  const q=cheerio.load(c.template,{},false),band=q('.hsx-band');
  if(!q('.hsx-case-heading').length){const intro=band.children().slice(0,3);intro.wrapAll('<div class="hsx-case-heading"><div class="hsx-case-intro"></div></div>');q('.hsx-case-intro > p').last().css('margin','0');q('.hsx-case-heading').append('<img class="hsx-case-logo" src="%%f033_imagen_anam%%" alt="%%f034_alt_anam%%" width="280" height="76" loading="lazy" decoding="async">');}
  for(const f of [{key:'f033_imagen_anam',type:'media',label:'Logo · ANAM'},{key:'f034_alt_anam',type:'text',label:'Texto alternativo · ANAM'}])if(!c.fields.some(x=>x.key===f.key))c.fields.push(f);
  c.defaults.f033_imagen_anam={url:'https://efeoncepro.com/wp-content/plugins/eo-elementor-widgets/assets/img/brand-logos/anam.svg'};
  c.defaults.f034_alt_anam='ANAM';c.defaults.f023_descripcion='Caso ANAM · Customer Agent de HubSpot en producción.';
  c.template=q.html();
 }
 if(key==='licensing'){
  for(const f of [{key:'brand_hubspot_logo',type:'media',label:'Logo completo · HubSpot'},{key:'brand_hubspot_alt',type:'text',label:'Texto alternativo · HubSpot'}])if(!c.fields.some(x=>x.key===f.key))c.fields.push(f);
  c.defaults.brand_hubspot_logo={url:'@hubspot/hubspot-wordmark-light.svg'};c.defaults.brand_hubspot_alt='HubSpot';
  const q=cheerio.load(c.template,{},false);if(!q('.hsx-licensing-logo').length)q('.hsx-band > .hsx-split > div').first().prepend('<img class="hsx-licensing-logo" src="%%brand_hubspot_logo%%" alt="%%brand_hubspot_alt%%" width="180" height="51" loading="lazy" decoding="async">');c.template=q.html();
 }
 return c;
};

// Shared root Media keys keep each tile and its detail panel in sync, including after repeater reorder.
module.exports.panel=function(module,index,c){
 if(module!=='hubs'||(index>=products.length&&index!==12&&!semanticIcons[index]))return c;
 const q=cheerio.load(c.template,{},false),panel=q('.hsx-panel');
 if(!panel.find('.hsx-panel-identity').length){
  const label=panel.find('.hsx-split > div').first().children('p').first().remove();label.css('margin','0');
  const identity=q('<div class="hsx-panel-identity"></div>');identity.append(label);
  if(index===12)identity.append(engineGroup());else if(semanticIcons[index])identity.append(semanticImage(index,true));else identity.append('<img class="hsx-panel-brand-icon" src="%%'+fieldFor(products[index])+'%%" alt="" aria-hidden="true" width="48" height="48" loading="lazy" decoding="async">');panel.prepend(identity);
 }c.template=q.html();return c;
};
