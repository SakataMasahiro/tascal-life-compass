import { NextResponse } from 'next/server';

interface NotionRichText {
  plain_text: string;
}

interface NotionTitleProperty {
  type: 'title';
  title: NotionRichText[];
}

interface NotionOtherProperty {
  type: string;
}

type NotionProperty = NotionTitleProperty | NotionOtherProperty;

interface NotionPage {
  id: string;
  url: string;
  properties: Record<string, NotionProperty>;
}

interface NotionSearchResponse {
  results: NotionPage[];
}

function extractTitle(page: NotionPage): string {
  for (const prop of Object.values(page.properties)) {
    if (prop.type === 'title') {
      const p = prop as NotionTitleProperty;
      if (p.title && p.title.length > 0) {
        return p.title.map(t => t.plain_text).join('').trim();
      }
    }
  }
  return '(タイトルなし)';
}

export async function GET() {
  const token = process.env.NOTION_TOKEN;
  if (!token) {
    return NextResponse.json({ error: 'NOTION_TOKEN が設定されていません' }, { status: 500 });
  }

  try {
    const res = await fetch('https://api.notion.com/v1/search', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        filter: { value: 'page', property: 'object' },
        sort: { direction: 'descending', timestamp: 'last_edited_time' },
        page_size: 30,
      }),
      next: { revalidate: 300 },
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json(
        { error: `Notion API エラー: ${errText}` },
        { status: res.status },
      );
    }

    const data: NotionSearchResponse = await res.json();
    const pages = data.results.map(page => ({
      id: page.id,
      title: extractTitle(page),
      url: page.url,
    }));

    return NextResponse.json({ pages });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
