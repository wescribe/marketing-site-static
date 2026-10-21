import { createHash } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

const origin = new URL('https://wescribe.com');
const pages = [
  '/',
  '/pricing/',
  '/sitemap/',
  '/cookie-policy/',
  '/privacy-policy/',
  '/terms-of-use/',
  '/demo/',
  '/about/',
  '/preview/',
];
const pageFiles = new Map(pages.map((route) => [route, route === '/' ? 'index.html' : `${route.slice(1)}index.html`]));
const assetExtensions = /\.(?:css|js|mjs|png|jpe?g|gif|webp|avif|svg|ico|woff2?|ttf|otf|eot|mp4|webm|mp3|pdf)(?:$|\?)/i;
const assetFiles = new Map();
const assetQueue = [];
const pageContents = new Map();

function cleanUrl(value, base) {
  const decoded = value
    .replaceAll('&amp;', '&')
    .replace(/&#0*38;/gi, '&')
    .replace(/&#x0*26;/gi, '&')
    .trim();
  try {
    const url = new URL(decoded, base);
    return url;
  } catch {
    return null;
  }
}

function urlKey(url) {
  return `${url.origin}${url.pathname}${url.search}`;
}

function isPageUrl(url) {
  if (url.hostname !== origin.hostname) return false;
  const route = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
  return pageFiles.has(route);
}

function assetPath(url) {
  let pathname = decodeURIComponent(url.pathname).replace(/^\/+/, '');
  if (url.hostname.endsWith('typekit.net') && /\/af\/[^/]+\/[^/]+\/\d+\/[lda]$/.test(url.pathname)) {
    const format = url.pathname.at(-1);
    pathname += format === 'l' ? '.woff2' : format === 'd' ? '.woff' : '.otf';
  }
  const localPath = url.hostname === origin.hostname
    ? pathname
    : path.posix.join('assets', 'external', url.hostname, pathname);
  if (!url.search) return localPath;
  const extension = path.posix.extname(localPath);
  const stem = extension ? localPath.slice(0, -extension.length) : localPath;
  const suffix = createHash('sha1').update(url.search).digest('hex').slice(0, 8);
  return `${stem}.${suffix}${extension}`;
}

function relativeUrl(fromFile, toFile) {
  let relative = path.posix.relative(path.posix.dirname(fromFile), toFile);
  if (!relative.startsWith('.')) relative = `./${relative}`;
  return relative;
}

function shouldFetchAttribute(tag, attribute, rawValue) {
  const value = rawValue.trim();
  if (!value || value.startsWith('#') || value.startsWith('data:') || value.startsWith('blob:')) return false;
  if (attribute === 'src' || attribute === 'poster' || attribute.startsWith('data-')) return true;
  if (assetExtensions.test(value)) return true;
  return tag.startsWith('<link') && /\b(?:stylesheet|icon|preload|manifest)\b/i.test(tag);
}

function enqueueAsset(value, base) {
  const url = cleanUrl(value, base);
  if (!url || !/^https?:$/.test(url.protocol) || isPageUrl(url)) return;
  const typekitFont = url.hostname.endsWith('typekit.net') && /\/af\/[^/]+\/[^/]+\/\d+\/[lda]$/.test(url.pathname);
  if (!typekitFont && !assetExtensions.test(`${url.pathname}${url.search}`)) return;
  const key = urlKey(url);
  if (assetFiles.has(key)) return;
  const localPath = assetPath(url);
  assetFiles.set(key, localPath);
  assetQueue.push({ url, localPath });
}

function collectCssAssets(css, base) {
  for (const match of css.matchAll(/url\(\s*["']?([^"')]+)["']?\s*\)|@import\s+["']([^"']+)["']/gi)) {
    enqueueAsset(match[1] ?? match[2], base);
  }
}

function collectHtmlAssets(html, base) {
  for (const match of html.matchAll(/<[^>]+>/g)) {
    const tag = match[0];
    for (const attribute of tag.matchAll(/\b(href|src|poster|data-[\w-]+|srcset)\s*=\s*(["'])(.*?)\2/gi)) {
      const name = attribute[1].toLowerCase();
      const value = attribute[3];
      if (name === 'srcset') {
        for (const source of value.split(',')) enqueueAsset(source.trim().split(/\s+/)[0], base);
      } else if (shouldFetchAttribute(tag, name, value)) {
        enqueueAsset(value, base);
      }
    }
    if (tag.startsWith('<meta') && /(?:og:image|twitter:image|^image$)/i.test(tag)) {
      const content = tag.match(/\bcontent\s*=\s*(["'])(.*?)\1/i);
      if (content) enqueueAsset(content[2], base);
    }
  }
  for (const match of html.matchAll(/<style\b[^>]*>([\s\S]*?)<\/style>/gi)) collectCssAssets(match[1], base);
}

function rewriteCss(css, base, fromFile) {
  return css.replace(/url\(\s*(["']?)([^"')]+)\1\s*\)|(@import\s+)(["'])([^"']+)\4/gi, (whole, quote, urlValue, importPrefix, importQuote, importValue) => {
    const value = urlValue ?? importValue;
    const url = cleanUrl(value, base);
    const localPath = url && assetFiles.get(urlKey(url));
    if (!localPath) return whole;
    const local = relativeUrl(fromFile, localPath);
    return urlValue !== undefined ? `url(${quote}${local}${quote})` : `${importPrefix}${importQuote}${local}${importQuote}`;
  });
}

function rewriteHtml(html, base, fromFile) {
  return html.replace(/<[^>]+>/g, (tag) => {
    let rewritten = tag.replace(/\b(href|src|poster|content|data-[\w-]+)\s*=\s*(["'])(.*?)\2/gi, (whole, name, quote, rawValue) => {
      const url = cleanUrl(rawValue, base);
      if (!url) return whole;
      const localAsset = assetFiles.get(urlKey(url));
      if (localAsset) return `${name}=${quote}${relativeUrl(fromFile, localAsset)}${quote}`;
      if (isPageUrl(url)) {
        const route = url.pathname.endsWith('/') ? url.pathname : `${url.pathname}/`;
        const localPage = relativeUrl(fromFile, pageFiles.get(route));
        return `${name}=${quote}${localPage}${url.hash}${quote}`;
      }
      return whole;
    });
    rewritten = rewritten.replace(/\bsrcset\s*=\s*(["'])(.*?)\1/gi, (whole, quote, value) => {
      const localSet = value.split(',').map((source) => {
        const [rawUrl, ...descriptor] = source.trim().split(/\s+/);
        const url = cleanUrl(rawUrl, base);
        const localAsset = url && assetFiles.get(urlKey(url));
        return `${localAsset ? relativeUrl(fromFile, localAsset) : rawUrl}${descriptor.length ? ` ${descriptor.join(' ')}` : ''}`;
      }).join(', ');
      return `srcset=${quote}${localSet}${quote}`;
    });
    return rewritten;
  }).replace(/<style\b[^>]*>([\s\S]*?)<\/style>/gi, (whole, css) => whole.replace(css, rewriteCss(css, base, fromFile)));
}

for (const route of pages) {
  const url = new URL(route, origin);
  const response = await fetch(url);
  if (!response.ok) throw new Error(`Could not fetch ${url}: ${response.status}`);
  const html = await response.text();
  const localPath = pageFiles.get(route);
  pageContents.set(route, { html, url, localPath });
  collectHtmlAssets(html, url);
}

while (assetQueue.length) {
  const batch = assetQueue.splice(0, 8);
  await Promise.all(batch.map(async ({ url, localPath }) => {
    const response = await fetch(url);
    if (!response.ok) {
      assetFiles.delete(urlKey(url));
      console.warn(`Skipped unavailable asset (${response.status}): ${url.href}`);
      return;
    }
    const bytes = Buffer.from(await response.arrayBuffer());
    const destination = path.resolve(localPath);
    await mkdir(path.dirname(destination), { recursive: true });
    const contentType = response.headers.get('content-type') ?? '';
    if (/text\/css/i.test(contentType) || url.pathname.endsWith('.css')) {
      const css = bytes.toString('utf8');
      collectCssAssets(css, url);
      await writeFile(destination, rewriteCss(css, url, localPath));
    } else {
      await writeFile(destination, bytes);
    }
    console.log(`${response.status} ${url.href} -> ${localPath}`);
  }));
}

for (const { html, url, localPath } of pageContents.values()) {
  await mkdir(path.dirname(path.resolve(localPath)), { recursive: true });
  await writeFile(localPath, rewriteHtml(html, url, localPath));
}

console.log(`Mirrored ${pageContents.size} pages and ${assetFiles.size} assets.`);