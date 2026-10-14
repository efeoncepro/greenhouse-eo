/* Efeonce La órbita presentation adapter v1. HubSpot owns consent and persistence. */
(function (w, d) {
  'use strict';
  if (!/^(efeoncepro\.com|think\.efeoncepro\.com)$/.test(w.location.hostname) || w.efeonceConsentUiMounted) return;
  w.efeonceConsentUiMounted = true;
  var summaries = {
    necessary: ['Esenciales', 'Seguridad y funciones básicas del sitio. Siempre activas.'],
    analytics: ['Analítica', 'Nos ayudan a entender qué contenido funciona y cómo mejorar tu experiencia.'],
    advertisement: ['Publicidad', 'Permiten medir campañas y mostrarte publicidad relevante. Sólo si lo autorizas.'],
    functionality: ['Funcionalidad', 'Recuerdan tus preferencias para que no tengas que elegirlas de nuevo.']
  };
  var modalWasOpen = false;
  var observedRoot=null, providerObserver=new MutationObserver(enhance);

  function attribute(node, key, value) { if (node && node.getAttribute(key) !== value) node.setAttribute(key, value); }

  function label(id, value) { var node=d.getElementById(id);

 attribute(node,'data-eo-label',value); attribute(node,'aria-label',value); }

  function element(tag,id,content) { var node=d.createElement(tag);

 node.id=id; if(content) node.innerHTML=content; 

return node; }

  function enhance() {
    var providerRoot=d.getElementById('hs-banner-parent');

    if(providerRoot&&providerRoot!==observedRoot){providerObserver.disconnect();providerObserver.observe(providerRoot,{attributes:true,subtree:true,attributeFilter:['style','class']});observedRoot=providerRoot;}
    var banner=d.getElementById('hs-eu-cookie-confirmation'),wording=d.getElementById('hs-eu-policy-wording');

    if(banner&&wording&&d.getElementById('hs-eu-confirmation-button')&&d.getElementById('hs-eu-decline-button')) {
      // Presentation siblings only: never replace children managed by HubSpot's renderer.
      if(!d.getElementById('eo-consent-banner-copy')) {
        var copy=element('section','eo-consent-banner-copy','<p class="eo-consent-eyebrow">PRIVACIDAD, A TU MEDIDA</p><h2 id="eo-consent-banner-title">Tu visita.<br>Tus reglas.</h2><p id="eo-consent-banner-description">Usamos cookies para que el sitio funcione. Con tu permiso, también para mejorarlo y mostrarte publicidad relevante. Tú eliges. </p>');
        var privacy=wording.querySelector('a');

if(privacy)copy.querySelector('#eo-consent-banner-description').append(privacy.cloneNode(true));
        wording.append(copy);
      }

      attribute(banner,'aria-label','Preferencias de cookies');attribute(banner,'aria-labelledby','eo-consent-banner-title');attribute(banner,'aria-describedby','eo-consent-banner-description');
      label('hs-eu-confirmation-button','Aceptar todas');label('hs-eu-decline-button','Solo esenciales');label('hs-eu-cookie-settings-button','Personalizar preferencias');
      var group=d.getElementById('hs-eu-confirmation-button-group');

if(group&&!d.getElementById('eo-consent-reminder'))group.append(element('p','eo-consent-reminder','Puedes cambiarlo después.'));
      attribute(banner,'data-eo-consent-ui','1');
    }

    var modal=d.getElementById('hs-modal-content'),body=d.getElementById('hs-modal-body-container');

    if(modal&&body&&d.getElementById('hs-modal-save-settings')) {
      if(!d.getElementById('eo-consent-preferences-title')) {
        var title=element('h2','eo-consent-preferences-title','Elige qué<br>compartes<span class="eo-consent-point">.</span>');
        var intro=element('p','eo-consent-preferences-description','Lo esencial funciona siempre. Todo lo demás lo decides tú.');

body.prepend(title,intro);
      }

      var header=d.getElementById('hs-modal-header-container');

      if(header&&!d.getElementById('eo-consent-modal-eyebrow')){var eyebrow=element('span','eo-consent-modal-eyebrow','TU PRIVACIDAD');

eyebrow.className='eo-consent-eyebrow';header.prepend(eyebrow);}

      attribute(modal,'aria-labelledby','eo-consent-preferences-title');attribute(modal,'aria-describedby','eo-consent-preferences-description');
      Object.keys(summaries).forEach(function(key){
        var button=d.getElementById('hs-category-'+key);

if(!button)return;label(button.id,summaries[key][0]);
        var row=button.closest('.hs-category-row-header'),id='eo-consent-summary-'+key;

        if(row&&!d.getElementById(id)){var summary=element('p',id,summaries[key][1]);

summary.className='eo-consent-category-summary';row.append(summary);}

        var input=d.getElementById('hs-category-toggle-'+key);

        attribute(input,'aria-label',summaries[key][0]);
        // Native checkbox.checked already exposes state; aria-pressed is invalid on a checkbox.
        if(input&&input.hasAttribute('aria-pressed'))input.removeAttribute('aria-pressed');
      });
      attribute(d.getElementById('hs-modal-close-button'),'aria-label','Cerrar preferencias');
      label('hs-modal-save-settings','Guardar mi elección');label('hs-modal-decline-all','Solo esenciales');label('hs-modal-accept-all','Aceptar todas');attribute(modal,'data-eo-consent-ui','1');
      var open=w.getComputedStyle(d.getElementById('hs-modal')).display!=='none';

      if(open&&!modalWasOpen)w.requestAnimationFrame(function(){modal.scrollTop=0;var close=d.getElementById('hs-modal-close-button');

if(close)close.focus({preventScroll:true});});
      modalWasOpen=open;
    }else modalWasOpen=false;
  }

  enhance();
  new MutationObserver(enhance).observe(d.documentElement,{childList:true,subtree:true});
})(window,document);
