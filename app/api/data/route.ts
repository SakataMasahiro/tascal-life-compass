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

export async function GET() {
  const [tasks, reminders] = await Promise.all([
    getRow('tasks'),
    getRow('reminders'),
  ]);
  return NextResponse.json({ tasks, reminders });
}

export async function POST(req: NextRequest) {
  const body = await req.json() as Record<string, unknown>;
  const updates: Promise<unknown>[] = [];

  if ('tasks' in body) {
    updates.push(
      supabase.from('lc_data').upsert(
        { key: 'tasks', value: body.tasks },
        { onConflict: 'key' }
      )
    );
  }
  if ('reminders' in body) {
    updates.push(
      supabase.from('lc_data').upsert(
        { key: 'reminders', value: body.reminders },
        { onConflict: 'key' }
      )
    );
  }

  const results = await Promise.all(updates);
  const errors = results.filter((r: unknown) => (r as { error: unknown }).error);
  if (errors.length > 0) {
    return NextResponse.json({ ok: false, errors }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}
