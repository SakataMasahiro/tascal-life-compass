import { NextRequest, NextResponse } from 'next/server';
import { getCalendarClient } from '@/lib/google';

export async function GET(req: NextRequest) {
  try {
    const calendar = getCalendarClient();
    const { searchParams } = new URL(req.url);
    const fromParam = searchParams.get('from');
    const toParam = searchParams.get('to');

    const now = new Date();
    const timeMin = fromParam
      ? new Date(fromParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const timeMax = toParam
      ? new Date(toParam)
      : new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1);

    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: timeMin.toISOString(),
      timeMax: timeMax.toISOString(),
      singleEvents: true,
      orderBy: 'startTime',
    });

    const events = (res.data.items ?? []).map((e) => ({
      id: e.id,
      summary: e.summary ?? '(タイトルなし)',
      start: e.start?.dateTime ?? e.start?.date ?? '',
      end: e.end?.dateTime ?? e.end?.date ?? '',
      location: e.location ?? null,
      description: e.description ?? null,
    }));

    return NextResponse.json({ events });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
