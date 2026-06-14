import { NextResponse } from 'next/server';

const FEEDS = [
  { key: 'nikkei',    url: 'https://www3.nhk.or.jp/rss/news/cat0.xml',                          ua: false },
  { key: 'guardian',  url: 'https://www.theguardian.com/world/rss',                               ua: false },
  { key: 'bbc',       url: 'https://feeds.bbci.co.uk/news/world/rss.xml',                         ua: false },
  { key: 'nyt',       url: 'https://rss.nytimes.com/services/xml/rss/nyt/World.xml',              ua: false },
  { key: 'wsj',       url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml',                         ua: false },
  { key: 'ft',        url: 'https://www.ft.com/rss/home',                                          ua: false },
  { key: 'economist', url: 'https://www.economist.com/finance-and-economics/rss.xml',             ua: false },
  { key: 'cnbc',      url: 'https://www.cnbc.com/id/100003114/device/rss/rss.html',               ua: true  },
] as const;

const LIMIT = 5;

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function stripCdata(s: string): string {
  return s.replace(/^<!\[CDATA\[([\s\S]*?)\]\]>$/, '$1').trim();
}

function extractTag(block: string, tag: string): string {
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const m = block.match(re);
  if (!m) return '';
  return decodeEntities(stripCdata(m[1].trim()));
}

function extractLink(block: string): string {
  const direct = extractTag(block, 'link');
  if (direct && direct.startsWith('http')) return direct;

  const atomHref = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i)
                ?? block.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/i);
  if (atomHref) return atomHref[1];

  return '';
}

function parseRSS(xml: string): Array<{ title: string; link: string; pubDate: string }> {
  const items: Array<{ title: string; link: string; pubDate: string }> = [];
  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null && items.length < LIMIT) {
    const block   = m[0];
    const title   = extractTag(block, 'title');
    const link    = extractLink(block);
    const pubDate = extractTag(block, 'pubDate');
    if (title && link) items.push({ title, link, pubDate });
  }

  return items;
}

export async function GET() {
  const results: Record<string, Array<{ title: string; link: string; pubDate: string }>> = {};
  const errors: string[] = [];

  const settled = await Promise.allSettled(
    FEEDS.map(({ key, url, ua }) =>
      fetch(url, {
        headers: {
          'User-Agent': ua
            ? 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36'
            : 'Mozilla/5.0 (compatible; LifeCompass/1.0; +https://github.com)',
          Accept: 'application/rss+xml, application/xml, text/xml, */*',
        },
        next: { revalidate: 1800 },
      }).then(async res => {
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        return { key, items: parseRSS(xml) };
      }),
    ),
  );

  for (const result of settled) {
    if (result.status === 'fulfilled') {
      results[result.value.key] = result.value.items;
    } else {
      const idx = settled.indexOf(result);
      const key = FEEDS[idx].key;
      errors.push(`${key}: ${result.reason instanceof Error ? result.reason.message : String(result.reason)}`);
      results[key] = [];
    }
  }

  return NextResponse.json({ results, errors: errors.length ? errors : undefined });
}
