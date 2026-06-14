import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

function todayKey() {
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const y = jst.getUTCFullYear();
  const m = String(jst.getUTCMonth() + 1).padStart(2, '0');
  const d = String(jst.getUTCDate()).padStart(2, '0');
  return `journal_${y}-${m}-${d}`;
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);

  if (searchParams.get('all') === '1') {
    const { data } = await supabase
      .from('lc_data')
      .select('key, value')
      .like('key', 'journal_%')
      .order('key', { ascending: false });
    return NextResponse.json({ entries: (data ?? []).map(r => r.value) });
  }

  const key = todayKey();
  const { data } = await supabase
    .from('lc_data').select('value').eq('key', key).maybeSingle();
  return NextResponse.json({ entry: data?.value ?? null });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const key   = todayKey();
  const entry = {
    date:         key.replace('journal_', ''),
    gratitude:    String(body.gratitude    ?? ''),
    insight:      String(body.insight      ?? ''),
    prayer:       String(body.prayer       ?? ''),
    meditationMin: Number(body.meditationMin ?? 0),
    savedAt:      new Date().toISOString(),
  };
  const { error } = await supabase
    .from('lc_data')
    .upsert({ key, value: entry }, { onConflict: 'key' });
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
