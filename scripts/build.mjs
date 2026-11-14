import { cp, mkdir, readFile, rm, writeFile } from 'node:fs/promises';

const source = new URL('../public/', import.meta.url);
const output = new URL('../dist/', import.meta.url);
const configuredOrigin = process.env.SITE_URL?.trim() ||
  (process.env.VERCEL_PROJECT_PRODUCTION_URL && 'https://' + process.env.VERCEL_PROJECT_PRODUCTION_URL);
let origin;
if (configuredOrigin) {
  const url = new URL(configuredOrigin);
  if (url.protocol !== 'https:' || url.href !== url.origin + '/') {
    throw new Error('SITE_URL deve conter apenas a origem HTTPS do site.');
  }
  origin = url.origin;
}

const measurement = process.env.GA4_MEASUREMENT_ID?.trim();
if (measurement && !/^G-[A-Z0-9]+$/.test(measurement)) throw new Error('GA4_MEASUREMENT_ID inválido.');
const verification = [
  ['google-site-verification', process.env.GOOGLE_SITE_VERIFICATION],
  ['msvalidate.01', process.env.BING_SITE_VERIFICATION]
];
const escape = value => value.replace(/[&<>"']/g, char => ({'&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;'}[char]));
const pages = [
  ['/', 'Automatizador PRO', 'SoftwareApplication'],
  ['/en/', 'Workflow automation for Windows', 'SoftwareApplication'],
  ['/guia/', 'Guia rápido', 'WebPage'],
  ['/documentacao/', 'Documentação', 'TechArticle'],
  ['/privacidade/', 'Privacidade', 'WebPage'],
  ['/lgpd/', 'LGPD', 'WebPage'],
  ['/termos/', 'Termos de uso', 'WebPage'],
  ['/stream-deck/', 'Stream Deck', 'WebPage'],
  ['/en/guide/', 'Quick start', 'WebPage'],
  ['/en/docs/', 'Documentation', 'TechArticle'],
  ['/en/privacy/', 'Privacy', 'WebPage'],
  ['/en/data-rights/', 'Data rights', 'WebPage'],
  ['/en/terms/', 'Terms of use', 'WebPage'],
  ['/en/stream-deck/', 'Stream Deck', 'WebPage']
];
const errorRoutes = ['404.html', '500.html'];
const translations = {
  "/": "/en/",
  "/guia/": "/en/guide/",
  "/documentacao/": "/en/docs/",
  "/privacidade/": "/en/privacy/",
  "/lgpd/": "/en/data-rights/",
  "/termos/": "/en/terms/",
  "/stream-deck/": "/en/stream-deck/"
};
const publicPages = pages.filter(([route]) => !route.endsWith('/stream-deck/'));
const jsonLd = data => '<script type="application/ld+json">' + JSON.stringify(data).replace(/</g, '\\u003c') + '</script>';
const absolute = path => origin + path;
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });

for (const [route, label, type] of pages) {
  const file = new URL('.' + route + 'index.html', output);
  let html = await readFile(file, 'utf8');
  const title = html.match(/<title>([^<]+)<\/title>/)?.[1] || label;
  const description = html.match(/<meta name="description" content="([^"]+)"/)?.[1] || label;
  const english = route.startsWith('/en/');
  const language = english ? 'en-US' : 'pt-BR';
  const image = (origin || '') + '/assets/social.png';
  const metadata = [
    '<link rel="manifest" href="/manifest.json">',
    '<meta name="twitter:card" content="summary_large_image">',
    '<meta name="twitter:title" content="' + escape(title) + '">',
    '<meta name="twitter:description" content="' + escape(description) + '">',
    '<meta name="twitter:image" content="' + image + '">',
    '<meta name="twitter:image:alt" content="Automatizador PRO">'
  ];
  if (!html.includes('href="/favicon.ico"')) metadata.push('<link rel="icon" sizes="any" href="/favicon.ico">');
  if (!html.includes('property="og:title"')) metadata.push(
    '<meta property="og:type" content="website">',
    '<meta property="og:locale" content="' + (english ? 'en_US' : 'pt_BR') + '">',
    '<meta property="og:title" content="' + escape(title) + '">',
    '<meta property="og:description" content="' + escape(description) + '">',
    '<meta property="og:image" content="' + image + '">'
  );
  if (origin) {
    metadata.push('<link rel="alternate" type="application/rss+xml" title="Automatizador PRO" href="/feed.xml">');
    html = html.replace('content="/assets/social.png"', 'content="' + image + '"');
    if (!route.endsWith('/stream-deck/')) {
      metadata.push('<link rel="canonical" href="' + absolute(route) + '">', '<meta property="og:url" content="' + absolute(route) + '">');
    }
    const portuguese = english ? Object.keys(translations).find(key => translations[key] === route) : route;
    const counterpart = translations[portuguese];
    if (counterpart) {
      for (const [lang, path] of [['pt-BR', portuguese], ['en-US', counterpart], ['x-default', portuguese]]) {
        metadata.push('<link rel="alternate" hreflang="' + lang + '" href="' + absolute(path) + '">');
      }
    }
  }
  if (route !== '/' && route !== '/en/') {
    const home = english ? '/en/' : '/';
    const homeLabel = english ? 'Home' : 'Início';
    const crumbs = '<nav class="shell breadcrumb" aria-label="' + (english ? 'Location' : 'Localização') + '"><ol><li><a href="' + home + '">' + homeLabel + '</a></li><li aria-current="page">' + label + '</li></ol></nav>';
    html = html.replace(/<main\b/, crumbs + '\n<main');
    if (origin) metadata.push(jsonLd({'@context':'https://schema.org','@type':'BreadcrumbList',
      itemListElement:[{ '@type':'ListItem', position:1, name:homeLabel, item:absolute(home) },
                       { '@type':'ListItem', position:2, name:label, item:absolute(route) }]}));
  }
  const entity = { '@context':'https://schema.org', '@type':type, name:label, description, inLanguage:language };
  if (origin) entity.url = absolute(route);
  if (type === 'SoftwareApplication') Object.assign(entity,{operatingSystem:'Windows',applicationCategory:'BusinessApplication'});
  metadata.push(jsonLd(entity));
  if (route === '/') {
    for (const [name, token] of verification) {
      if (token?.trim()) metadata.push('<meta name="' + name + '" content="' + escape(token.trim()) + '">');
    }
    if (measurement) {
      metadata.push('<meta name="ga4-id" content="' + measurement + '">', '<script type="module" src="/assets/analytics.js"></script>');
      html = html.replace('</footer>', '<button hidden type="button" id="analytics-options" class="button secondary">Preferências de privacidade</button></footer>');
      html = html.replace('</body>', '<section hidden id="analytics-consent" class="panel consent-panel" aria-labelledby="analytics-title"><strong id="analytics-title">Métricas do site</strong><p>Você permite medir visitas e cliques desta página com o Google Analytics? <a href="/privacidade/">Política de privacidade</a></p><div class="actions"><button type="button" class="button primary" data-consent="yes">Permitir</button><button type="button" class="button secondary" data-consent="no">Recusar</button></div></section></body>');
    }
  }
  html = html.replace('</head>', metadata.join('\n') + '\n</head>');
  await writeFile(file, html);
}

for (const route of errorRoutes) {
  const file = new URL(route, output);
  const html = await readFile(file, 'utf8');
  await writeFile(file, html.replace('</head>', jsonLd({'@context':'https://schema.org','@type':'WebPage', name:'Erro ' + route.slice(0,3), inLanguage:'pt-BR'}) + '</head>'));
}

if (origin) {
  const urls = publicPages.map(([route]) => '  <url><loc>' + escape(absolute(route)) + '</loc></url>').join('\n');
  await writeFile(new URL('sitemap.xml', output), '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' + urls + '\n</urlset>\n');
  await writeFile(new URL('robots.txt', output), 'User-agent: *\nAllow: /\nSitemap: ' + absolute('/sitemap.xml') + '\n');
  const entries = publicPages.filter(([route]) => ['/guia/','/documentacao/'].includes(route));
  const items = entries.map(([route,label]) => '<item><title>' + escape(label) + '</title><link>' + escape(absolute(route)) + '</link><guid>' + escape(absolute(route)) + '</guid></item>');
  await writeFile(new URL('feed.xml', output), '<?xml version="1.0" encoding="UTF-8"?>\n<rss version="2.0"><channel><title>Automatizador PRO</title><link>' + escape(origin) + '</link><description>Guias e documentação do Automatizador PRO</description><language>pt-BR</language>' + items.join('') + '</channel></rss>\n');
} else {
  for (const file of ['sitemap.xml','feed.xml']) await rm(new URL(file, output), { force:true });
}
const manual = await readFile(new URL('documentacao/automatizador-pro.txt', source),'utf8');
const index = await readFile(new URL('llms.txt', source),'utf8');
await writeFile(new URL('llms-full.txt', output), index + '\n\n' + manual);

const { headers, trailingSlash } = JSON.parse(await readFile(new URL('../vercel.json', import.meta.url), 'utf8'));
await writeFile(new URL('vercel.json', output), JSON.stringify({ trailingSlash, headers }, null, 2) + '\n');
console.log('Site pronto em dist/.');
