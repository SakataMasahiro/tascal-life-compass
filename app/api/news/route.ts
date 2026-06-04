import { NextResponse } from 'next/server';

const FEEDS = [
  { source: 'nikkei',    url: 'https://www.nikkei.com/rss/index.rss' },
  { source: 'wsj',       url: 'https://feeds.a.dj.com/rss/RSSWorldNews.xml' },
  { source: 'economist', url: 'https://www.economist.com/finance-and-economics/rss.xml' },
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

function extractTag(block: string, tag: string): string {
  // CDATA variant
  const cdataRe = new RegExp(
    `<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, 'i',
  );
  const cdata = block.match(cdataRe);
  if (cdata) return decodeEntities(cdata[1].trim());

  // Plain variant
  const re = new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, 'i');
  const plain = block.match(re);
  if (plain) return decodeEntities(plain[1].trim());

  return '';
}

function extractLink(block: string): string {
  // <link>URL</link>
  const direct = extractTag(block, 'link');
  if (direct && direct.startsWith('http')) return direct;

  // <link href="URL" rel="alternate"/>  (Atom style)
  const atomHref = block.match(/<link[^>]+rel=["']alternate["'][^>]+href=["']([^"']+)["']/i)
                ?? block.match(/<link[^>]+href=["']([^"']+)["'][^>]+rel=["']alternate["']/i);
  if (atomHref) return atomHref[1];

  return '';
}

function parseRSS(xml: string): Array<{ title: string; link: string }> {
  const items: Array<{ title: string; link: string }> = [];
  const itemRe = /<item[\s>][\s\S]*?<\/item>/gi;
  let m: RegExpExecArray | null;

  while ((m = itemRe.exec(xml)) !== null && items.length < LIMIT) {
    const block = m[0];
    const title = extractTag(block, 'title');
    const link  = extractLink(block);
    if (title && link) items.push({ title, link });
  }

  return items;
}

export async function GET() {
  const results: Record<string, Array<{ title: string; link: string }>> = {};
  const errors: string[] = [];

  await Promise.all(
    FEEDS.map(async ({ source, url }) => {
      try {
        const res = await fetch(url, {
          headers: {
            'User-Agent':
              'Mozilla/5.0 (compatible; LifeCompass/1.0; +https://github.com)',
            Accept: 'application/rss+xml, application/xml, text/xml, */*',
          },
          next: { revalidate: 1800 },
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const xml = await res.text();
        results[source] = parseRSS(xml);
      } catch (err: unknown) {
        errors.push(
          `${source}: ${err instanceof Error ? err.message : String(err)}`,
        );
        results[source] = [];
      }
    }),
  );

  return NextResponse.json({ results, errors: errors.length ? errors : undefined });
}
