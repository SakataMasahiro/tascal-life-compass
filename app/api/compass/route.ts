import { NextResponse } from 'next/server';
import { getTodayWisdom } from '@/lib/wisdom';

export async function GET() {
  const wisdom = getTodayWisdom();
  const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
  const dateStr = jst.toLocaleDateString('ja-JP', {
    year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
  });
  return NextResponse.json({
    tradition: wisdom.category,
    author:    wisdom.author,
    quote:     wisdom.text,
    source:    wisdom.source,
    dateStr,
  });
}
