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
  // Persist attribution only after the authoritative advertising grant, before navigation loses fbclid.
  // Same first-party cookie domain covers the public site and Think; no identifiers enter dataLayer.
  var attributionKey = 'efeonce.meta-attribution.v1';
  var attributionMemory = {};
  var landingClick = '';
  var landingClickAt = Date.now();
  try { landingClick = new w.URL(w.location.href).searchParams.get('fbclid') || ''; } catch (_) {}
  function readCookie(name) {
    try {
      var part = (d.cookie || '').split(';').map(function (s) { return s.trim(); }).find(function (s) { return s.indexOf(name + '=') === 0; });
      return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
    } catch (_) { return ''; }
  }
  function writeAttributionCookie(name, value, maxAge) {
    try { d.cookie = name + '=' + encodeURIComponent(value) + '; Path=/; Domain=efeoncepro.com; Max-Age=' + maxAge + '; SameSite=Lax; Secure'; } catch (_) {}
  }
  function validAttribution(value, click) {
    return typeof value === 'string' && (click ? /^fb\.\d+\.\d{13}\.[A-Za-z0-9._~-]{1,512}$/ : /^fb\.\d+\.\d{13}\.\d{1,20}$/).test(value) &&
      Date.now() - Number(value.split('.')[2]) < 7776000000 && Number(value.split('.')[2]) <= Date.now() + 300000;
  }
  function clearAttribution() {
    attributionMemory = {};
    try { w.sessionStorage.removeItem(attributionKey); } catch (_) {}
    ['_fbp', '_fbc'].forEach(function (name) {
      writeAttributionCookie(name, '', 0);
      try { d.cookie = name + '=; Path=/; Max-Age=0; SameSite=Lax; Secure'; } catch (_) {}
    });
  }
  w.efeonceReadMetaAttribution = function () {
    if (d.documentElement.getAttribute('data-efeonce-ads-consent') !== 'granted' || w.navigator.globalPrivacyControl === true) return {};
    var stored = {};
    try { stored = JSON.parse(w.sessionStorage.getItem(attributionKey) || '{}') || {}; } catch (_) {}
    var fbp = readCookie('_fbp') || stored.fbp || attributionMemory.fbp;
    var fbc = readCookie('_fbc') || stored.fbc || attributionMemory.fbc;
    if (!validAttribution(fbp, false)) {
      fbp = '';
      try {
        var random = w.crypto.getRandomValues(new Uint32Array(2));
        fbp = 'fb.1.' + Date.now() + '.' + String(random[0]) + String(random[1]);
      } catch (_) {}
    }
    if (!validAttribution(fbc, true)) fbc = '';
    var click = landingClick;
    var clickAt = landingClickAt;
    try {
      var currentClick = new w.URL(w.location.href).searchParams.get('fbclid') || '';
      if (currentClick && currentClick !== click) { click = currentClick; clickAt = Date.now(); }
    } catch (_) {}
    if (/^[A-Za-z0-9._~-]{1,512}$/.test(click) && (!fbc || fbc.split('.').slice(3).join('.') !== click)) {
      fbc = 'fb.1.' + clickAt + '.' + click;
    }
    attributionMemory = {};
    if (fbp) { attributionMemory.fbp = fbp; writeAttributionCookie('_fbp', fbp, 7776000); }
    if (fbc) { attributionMemory.fbc = fbc; writeAttributionCookie('_fbc', fbc, 7776000); }
    try { w.sessionStorage.setItem(attributionKey, JSON.stringify(attributionMemory)); } catch (_) {}
    return attributionMemory;
  };
  // Private first-party Ads context, separate from Google-owned _gcl cookies.
  // Landing observation is memory-only until advertising consent; never put IDs in dataLayer.
  var googleAttributionKey = 'efeonce.gads-attribution.v1';
  var googleCookie = 'efeonce_gads';
  var googleTtl = 2592000000; // 30 days, bounded and checked on every read.
  var googleMemory = {};
  var googleLanding = {};
  function readLandingGoogleClick() {
    var result = {};
    try {
      var params = new w.URL(w.location.href).searchParams;
      ['gclid', 'gbraid', 'wbraid'].forEach(function (key) {
        var value = params.get(key);
        if (value && /^[A-Za-z0-9._~-]{1,512}$/.test(value)) result[key] = value;
      });
    } catch (_) {}
    if (Object.keys(result).length) { result.source = 'landing_query'; result.capturedAt = new Date().toISOString(); }
    return result;
  }
  googleLanding = readLandingGoogleClick();
  function validGoogleClick(value) {
    if (!value || typeof value !== 'object' || value.source !== 'landing_query') return false;
    var observed = Date.parse(value.capturedAt);
    if (!isFinite(observed) || observed > Date.now() || Date.now() - observed > googleTtl) return false;
    var found = false;
    var valid = true;
    Object.keys(value).forEach(function (key) {
      if (['source', 'capturedAt', 'gclid', 'gbraid', 'wbraid'].indexOf(key) < 0) valid = false;
    });
    ['gclid', 'gbraid', 'wbraid'].forEach(function (key) {
      if (value[key] !== undefined) {
        if (typeof value[key] !== 'string' || !/^[A-Za-z0-9._~-]{1,512}$/.test(value[key])) valid = false;
        else found = true;
      }
    });
    return valid && found;
  }
  function clearGoogleAttribution() {
    googleMemory = {}; googleLanding = {};
    try { w.sessionStorage.removeItem(googleAttributionKey); } catch (_) {}
    writeAttributionCookie(googleCookie, '', 0);
    try { d.cookie = googleCookie + '=; Path=/; Max-Age=0; SameSite=Lax; Secure'; } catch (_) {}
  }
  w.efeonceReadGoogleAdsAttribution = function () {
    if (d.documentElement.getAttribute('data-efeonce-google-ad-storage') !== 'granted' ||
        d.documentElement.getAttribute('data-efeonce-google-ad-user-data') !== 'granted' ||
        d.documentElement.getAttribute('data-efeonce-google-ad-personalization') !== 'granted' || w.navigator.globalPrivacyControl === true) {
      clearGoogleAttribution(); return {};
    }
    var stored = {};
    try { stored = JSON.parse(readCookie(googleCookie) || '{}'); } catch (_) {}
    if (!validGoogleClick(stored)) {
      try { stored = JSON.parse(w.sessionStorage.getItem(googleAttributionKey) || '{}'); } catch (_) { stored = {}; }
    }
    var chosen = validGoogleClick(googleLanding) ? googleLanding : validGoogleClick(stored) ? stored : googleMemory;
    if (!validGoogleClick(chosen)) { clearGoogleAttribution(); return {}; }
    googleMemory = { source: 'landing_query', capturedAt: chosen.capturedAt };
    ['gclid', 'gbraid', 'wbraid'].forEach(function (key) { if (chosen[key]) googleMemory[key] = chosen[key]; });
    var remaining = Math.max(0, Math.floor((Date.parse(chosen.capturedAt) + googleTtl - Date.now()) / 1000));
    writeAttributionCookie(googleCookie, JSON.stringify(googleMemory), remaining);
    try { w.sessionStorage.setItem(googleAttributionKey, JSON.stringify(googleMemory)); } catch (_) {}
    return Object.assign({}, googleMemory);
  };
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
    ['ad-storage', 'ad-user-data', 'ad-personalization'].forEach(function (key) {
      d.documentElement.setAttribute('data-efeonce-google-' + key, ads);
    });
    d.documentElement.setAttribute('data-efeonce-google-analytics-storage', analytics);
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
    if (ads) w.efeonceReadMetaAttribution();
    else if (categories.advertisement === false || w.navigator.globalPrivacyControl === true) clearAttribution();
    if (ads) w.efeonceReadGoogleAdsAttribution();
    else if (categories.advertisement === false || w.navigator.globalPrivacyControl === true) clearGoogleAttribution();
    w.gtag('consent', 'update', {
      ad_storage: adsState, ad_user_data: adsState, ad_personalization: adsState,
      analytics_storage: analyticsState,
      functionality_storage: functionality ? 'granted' : 'denied',
      personalization_storage: functionality ? 'granted' : 'denied', security_storage: 'granted'
    });
    w.gtag('set', fields);
    try { w.dispatchEvent(new w.Event('efeonce:privacy-consent')); } catch (_) {}
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
