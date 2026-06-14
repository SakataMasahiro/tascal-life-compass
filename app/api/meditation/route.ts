import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const KEY = 'meditation_sessions';

type Session = { id: string; date: string; minutes: number; completedAt: string };

async function getSessions(): Promise<Session[]> {
  const { data } = await supabase
    .from('lc_data').select('value').eq('key', KEY).maybeSingle();
  return (data?.value as Session[]) ?? [];
}

export async function GET(req: NextRequest) {
  const days = Number(new URL(req.url).searchParams.get('days') ?? 30);
  const sessions = await getSessions();

  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().slice(0, 10);
  const recent = sessions.filter(s => s.date >= cutoffStr);

  // 連続日数を計算（JST基準）
  const datesSet = new Set(recent.map(s => s.date));
  let streak = 0;
  for (let i = 0; i < 365; i++) {
    const d = new Date(Date.now() + 9 * 60 * 60 * 1000 - i * 86_400_000);
    const ds = d.toISOString().slice(0, 10);
    if (datesSet.has(ds)) { streak++; } else if (i > 0) { break; }
  }

  const totalMin = recent.reduce((s, r) => s + r.minutes, 0);
  return NextResponse.json({ sessions: recent, streak, totalMin });
}

export async function POST(req: NextRequest) {
  const body    = await req.json() as Record<string, unknown>;
  const minutes = Number(body.minutes ?? 0);
  if (minutes <= 0) return NextResponse.json({ ok: false, error: 'minutes must be > 0' }, { status: 400 });

  const sessions = await getSessions();
  const jst      = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const session: Session = {
    id:          Math.random().toString(36).slice(2) + Date.now().toString(36),
    date:        jst.toISOString().slice(0, 10),
    minutes,
    completedAt: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('lc_data')
    .upsert({ key: KEY, value: [...sessions, session] }, { onConflict: 'key' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, session });
}
