import { NextResponse } from 'next/server';
import Anthropic from '@anthropic-ai/sdk';
import { getCalendarClient, getGmailClient } from '@/lib/google';

export const maxDuration = 60;

export async function GET() {
  try {
    // JST で「今日」の範囲を UTC で算出
    const jstMs   = Date.now() + 9 * 60 * 60 * 1000;
    const jstDate = new Date(jstMs);
    const [yr, mo, dy] = [jstDate.getUTCFullYear(), jstDate.getUTCMonth(), jstDate.getUTCDate()];
    const todayStart = new Date(Date.UTC(yr, mo, dy) - 9 * 60 * 60 * 1000);
    const todayEnd   = new Date(todayStart.getTime() + 24 * 60 * 60 * 1000);
    const dateStr = new Intl.DateTimeFormat('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long', timeZone: 'Asia/Tokyo',
    }).format(new Date());

    // 今日のカレンダーイベント
    const calendar = getCalendarClient();
    const calRes = await calendar.events.list({
      calendarId: 'primary',
      timeMin: todayStart.toISOString(),
      timeMax: todayEnd.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });
    const events = (calRes.data.items ?? []).map(e => ({
      summary:  e.summary ?? '(タイトルなし)',
      start:    e.start?.dateTime ?? e.start?.date ?? '',
      location: e.location ?? null,
    }));

    // 過去24時間のGmail inbox（最大5件）
    const gmail = getGmailClient();
    const msgList = await gmail.users.messages.list({
      userId: 'me', maxResults: 5, q: 'is:inbox newer_than:1d',
    });
    const msgIds = (msgList.data.messages ?? []).map(m => m.id!);
    const emails = await Promise.all(
      msgIds.slice(0, 5).map(async id => {
        const msg = await gmail.users.messages.get({
          userId: 'me', id, format: 'metadata',
          metadataHeaders: ['Subject', 'From'],
        });
        const h = msg.data.payload?.headers ?? [];
        return {
          from:    h.find(x => x.name === 'From')?.value ?? '',
          subject: h.find(x => x.name === 'Subject')?.value ?? '(件名なし)',
          snippet: msg.data.snippet ?? '',
        };
      })
    );

    // Claude Haiku でブリーフィング生成
    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const eventsText = events.length > 0
      ? events.map(e => `- ${e.start}: ${e.summary}${e.location ? ` @ ${e.location}` : ''}`).join('\n')
      : '予定なし';
    const emailsText = emails.length > 0
      ? emails.map(e => `- From: ${e.from}\n  件名: ${e.subject}\n  概要: ${e.snippet}`).join('\n')
      : 'なし';

    const resp = await anthropic.messages.create({
      model: 'claude-haiku-4-5-20251001',
      max_tokens: 1024,
      messages: [{
        role: 'user',
        content: `今日（${dateStr}）の状況を分析して、以下のJSONフォーマットのみで返答してください（マークダウン不可、JSONのみ）。

【今日のカレンダー】
${eventsText}

【最新メール】
${emailsText}

JSONフォーマット:
{"summary":"今日の概要を2〜3文","priorities":["優先事項1","優先事項2","優先事項3"],"alerts":["注意事項（なければ空配列）"]}`,
      }],
    });

    const raw  = (resp.content[0] as { type: string; text: string }).text.trim();
    const json = JSON.parse(raw.replace(/^```(?:json)?\s*/m, '').replace(/\s*```$/m, '').trim());
    return NextResponse.json({ ...json, dateStr });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
