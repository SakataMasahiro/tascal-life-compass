import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

async function getRow(key: string): Promise<unknown[]> {
  const { data } = await supabase
    .from('lc_data')
    .select('value')
    .eq('key', key)
    .maybeSingle();
  return (data?.value as unknown[]) ?? [];
}

async function setRow(key: string, value: unknown): Promise<{ error: string | null }> {
  const { error } = await supabase
    .from('lc_data')
    .upsert({ key, value }, { onConflict: 'key' });
  return { error: error?.message ?? null };
}

export async function GET() {
  const [tasks, reminders] = await Promise.all([
    getRow('tasks'),
    getRow('reminders'),
  ]);
  return NextResponse.json({ tasks, reminders });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;

  if ('tasks' in body) {
    const { error } = await setRow('tasks', body.tasks);
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  }
  if ('reminders' in body) {
    const { error } = await setRow('reminders', body.reminders);
    if (error) return NextResponse.json({ ok: false, error }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
