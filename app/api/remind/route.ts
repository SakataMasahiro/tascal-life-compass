import { NextRequest, NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/google';

function buildRawEmail(to: string, subject: string, body: string): string {
  const message = [
    `To: ${to}`,
    'Content-Type: text/plain; charset=utf-8',
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    body,
  ].join('\n');
  return Buffer.from(message).toString('base64url');
}

export async function POST(req: NextRequest) {
  try {
    const { events } = await req.json() as { events: Array<{ summary: string; start: string; end: string }> };
    const to = process.env.REMINDER_TO_EMAIL ?? '';

    if (!to) {
      return NextResponse.json({ error: 'REMINDER_TO_EMAIL not set' }, { status: 500 });
    }

    const today = new Date().toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    const lines = events.map((e) => {
      const start = e.start.includes('T')
        ? new Date(e.start).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '終日';
      const end = e.end.includes('T')
        ? new Date(e.end).toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
        : '';
      const time = end ? `${start}〜${end}` : start;
      return `・${time}　${e.summary}`;
    });

    const body = events.length > 0
      ? `${today} の予定\n\n${lines.join('\n')}`
      : `${today} の予定はありません。`;

    const gmail = getGmailClient();
    const raw = buildRawEmail(to, `【リマインダー】${today} の予定`, body);

    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });

    return NextResponse.json({ ok: true, to });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
