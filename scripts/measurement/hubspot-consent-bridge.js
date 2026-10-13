/* Efeonce consent bridge v1. Canon: docs/reference/measurement-gtm-ga4/09-hubspot-consent.md. */
(function (w, d) {
  'use strict';
  if (w.efeonceConsentBridgeLoaded) return;
  if (!/^(efeoncepro\.com|think\.efeoncepro\.com)$/.test(w.location.hostname)) return;
  w.efeonceConsentBridgeLoaded = true;
  w.dataLayer = w.dataLayer || [];
  w.gtag = w.gtag || function () { w.dataLayer.push(arguments); };
  w._hsp = w._hsp || [];
  w.clarity = w.clarity || function () { (w.clarity.q = w.clarity.q || []).push(arguments); };
  var sent = { analytics: false, meta: false };
  var meetingIds = Object.create(null);
  // GTM uses its own event counter only as a local cache key; it never leaves the page.
  // The ID sent to CAPI is an independent UUID, not a receipt or business/provider ID.
  w.efeonceMeetingConversionId = function (key) {
    if (!/^\d+$/.test(String(key)) || !w.crypto) return '';
    if (meetingIds[key]) return meetingIds[key];
    try {
      var id;
      if (typeof w.crypto.randomUUID === 'function') {
        id = w.crypto.randomUUID();
      } else {
        var bytes = w.crypto.getRandomValues(new Uint8Array(16));
        bytes[6] = (bytes[6] & 15) | 64;
        bytes[8] = (bytes[8] & 63) | 128;
        var hex = Array.prototype.map.call(bytes, function (b) { return b.toString(16).padStart(2, '0'); }).join('');
        id = hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
      }
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) return '';
      meetingIds[key] = id;
      return id;
    } catch (_) { return ''; }
  };
  var denied = {
    ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied',
    analytics_storage: 'denied', functionality_storage: 'denied',
    personalization_storage: 'denied', security_storage: 'granted'
  };
  // The host emits this default synchronously before any tag, even if this asset fails.
  if (!w.efeonceConsentDefaultSet) {
    w.gtag('consent', 'default', denied);
    w.efeonceConsentDefaultSet = true;
  }
  function reflect(ads, analytics) {
    d.documentElement.setAttribute('data-efeonce-ads-consent', ads);
    d.documentElement.setAttribute('data-efeonce-analytics-consent', analytics);
  }
  reflect('denied', 'denied');
  w.dataLayer.push({ meta_ads_consent: 'denied', analytics_consent: 'denied' });
  w.clarity('consentv2', { ad_Storage: 'denied', analytics_Storage: 'denied' });
  w._hsp.push(['addPrivacyConsentListener', function (consent) {
    var categories = consent && consent.categories || {};
    // Legacy `allowed` also means true when no banner exists: never use it for Meta.
    var ads = categories.advertisement === true && w.navigator.globalPrivacyControl !== true;
    var analytics = categories.analytics === true;
    var functionality = categories.functionality === true;
    var adsState = ads ? 'granted' : 'denied';
    var analyticsState = analytics ? 'granted' : 'denied';
    var fields = { meta_ads_consent: adsState, analytics_consent: analyticsState };
    reflect(adsState, analyticsState);
    w.gtag('consent', 'update', {
      ad_storage: adsState, ad_user_data: adsState, ad_personalization: adsState,
      analytics_storage: analyticsState,
      functionality_storage: functionality ? 'granted' : 'denied',
      personalization_storage: functionality ? 'granted' : 'denied', security_storage: 'granted'
    });
    w.gtag('set', fields);
    w.clarity('consentv2', { ad_Storage: adsState, analytics_Storage: analyticsState });
    w.dataLayer.push({ event: 'gh_privacy_consent_updated', meta_ads_consent: adsState,
      analytics_consent: analyticsState, consent_source: 'hubspot_categories' });
    // This flag is enabled only with coordinated no-auto-PageView + server routing.
    // One PageView per permitted destination per navigation, including late acceptance.
    if (w.efeonceConsentMeasurementEnabled !== true) return;
    var analyticsView = analytics && !sent.analytics;
    var metaView = ads && !sent.meta;
    if (!analyticsView && !metaView) return;
    w.dataLayer.push({ event: 'gh_consent_page_view', meta_ads_consent: adsState,
      analytics_consent: analyticsState, meta_only: analyticsView ? '0' : '1',
      meta_capi_page_view: metaView ? '1' : '0' });
    if (analyticsView) sent.analytics = true;
    if (metaView) sent.meta = true;
  }]);
  d.addEventListener('click', function (event) {
    var target = event.target && event.target.closest && event.target.closest('[data-efeonce-cookie-settings]');
    if (!target) return;
    event.preventDefault();
    w._hsp.push(['showBanner']);
  });
})(window, document);
