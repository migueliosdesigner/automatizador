const measurementId = document.querySelector('meta[name="ga4-id"]').content;
const preferenceKey = 'automatizador-analytics-consent';
const disabledKey = 'ga-disable-' + measurementId;
const denied = { analytics_storage: 'denied', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' };
let enabled = false;
let loaded = false;

const banner = document.querySelector('#analytics-consent');
const trigger = document.querySelector('#analytics-options');
let preference;
try { preference = localStorage.getItem(preferenceKey); } catch {}
banner.hidden = preference != null;
trigger.hidden = false;

function enableAnalytics() {
  if (enabled) return;
  enabled = true;
  window[disabledKey] = false;
  window.dataLayer = window.dataLayer || [];
  function gtag() { window.dataLayer.push(arguments); }

  if (!loaded) gtag('consent', 'default', denied);
  gtag('consent', 'update', { ...denied, analytics_storage: 'granted' });
  if (loaded) return;
  loaded = true;
  gtag('js', new Date());
  gtag('config', measurementId, {
    allow_google_signals: false, allow_ad_personalization_signals: false,
    page_location: location.origin + location.pathname, page_referrer: ''
  });
  for (const link of document.querySelectorAll('[data-event]')) {
    link.addEventListener('click', () => {
      if (enabled) gtag('event', link.dataset.event);
    });
  }
  window.addEventListener('error', event => {
    if (enabled && event instanceof ErrorEvent) gtag('event', 'erro_javascript', { tipo: 'erro_de_execucao' });
  });
  window.addEventListener('unhandledrejection', () => {
    if (enabled) gtag('event', 'erro_javascript', { tipo: 'promessa_rejeitada' });
  });
  const script = document.createElement('script');
  script.async = true;
  script.src = 'https://www.googletagmanager.com/gtag/js?id=' + measurementId;
  document.head.append(script);
}

trigger.addEventListener('click', () => {
  banner.hidden = false;
  banner.querySelector('button').focus();
});
banner.addEventListener('click', event => {
  const choice = event.target.closest('button[data-consent]')?.dataset.consent;
  if (!choice) return;
  try { localStorage.setItem(preferenceKey, choice); } catch {}
  banner.hidden = true;
  trigger.focus({ preventScroll: true });
  if (choice === 'yes') enableAnalytics();
  if (choice === 'no' && enabled) {
    enabled = false;
    window[disabledKey] = true;
    (function () { window.dataLayer.push(arguments); })('consent', 'update', denied);
  }
});
if (preference === 'yes') enableAnalytics();
