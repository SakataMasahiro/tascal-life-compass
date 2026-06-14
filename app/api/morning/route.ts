import { NextRequest, NextResponse } from 'next/server';
import { getGmailClient } from '@/lib/google';
import { getTodayWisdom, WisdomEntry } from '@/lib/wisdom';

// ── HTML email builder ────────────────────────────────────────────────────────
function buildMorningHtml(wisdom: WisdomEntry, dateStr: string): string {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Morning Compass</title>
</head>
<body style="margin:0;padding:0;background:#0d0d0d;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI','Hiragino Sans',sans-serif;color:#e0e0e0;">

  <!-- Header -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%);">
    <tr>
      <td style="padding:48px 52px 40px;">
        <div style="font-size:11px;color:#c9993a;letter-spacing:0.2em;text-transform:uppercase;margin-bottom:10px;">
          🧭 &nbsp; M O R N I N G &nbsp; C O M P A S S
        </div>
        <div style="font-size:34px;font-weight:200;color:#f0f0f0;line-height:1.2;letter-spacing:-0.02em;">
          ${dateStr}
        </div>
        <div style="margin-top:12px;display:inline-block;background:rgba(201,153,58,0.15);border:1px solid rgba(201,153,58,0.35);border-radius:100px;padding:5px 16px;">
          <span style="font-size:12px;color:#c9993a;">${wisdom.category}</span>
          <span style="color:#4b5563;margin:0 8px;">·</span>
          <span style="font-size:12px;color:#9ca3af;">${wisdom.author}</span>
        </div>
      </td>
    </tr>
  </table>

  <!-- Quote -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111111;">
    <tr>
      <td style="padding:44px 52px;">
        <div style="border-left:3px solid #c9993a;padding-left:28px;">
          <div style="font-size:11px;color:#c9993a;letter-spacing:0.15em;text-transform:uppercase;margin-bottom:16px;">
            ✦ &nbsp; Today's Wisdom
          </div>
          <p style="font-size:21px;font-weight:300;color:#e8e8e8;line-height:1.9;margin:0;letter-spacing:0.01em;font-family:Georgia,'Times New Roman',serif;">
            「${wisdom.text}」
          </p>
          <p style="font-size:13px;color:#c9993a;margin:20px 0 0;">
            — ${wisdom.author}
          </p>
          <p style="font-size:12px;color:#6b7280;margin:6px 0 0;font-style:italic;">
            ${wisdom.source}
          </p>
        </div>
      </td>
    </tr>
  </table>

  <!-- Footer -->
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#0a0a0a;border-top:1px solid #1a1a1a;">
    <tr>
      <td style="padding:28px 52px;text-align:center;">
        <p style="font-size:12px;color:#374151;margin:0;letter-spacing:0.05em;">
          🧭 &nbsp; Life Compass &nbsp;·&nbsp; 自分の内なる羅針盤を信じて
        </p>
      </td>
    </tr>
  </table>

</body>
</html>`;
}

// ── Gmail send helper ────────────────────────────────────────────────────────
function buildRawHtmlEmail(to: string, subject: string, html: string): string {
  const boundary = `----=_Part_${Date.now()}`;
  const message = [
    `To: ${to}`,
    'MIME-Version: 1.0',
    `Content-Type: multipart/alternative; boundary="${boundary}"`,
    `Subject: =?UTF-8?B?${Buffer.from(subject).toString('base64')}?=`,
    '',
    `--${boundary}`,
    'Content-Type: text/html; charset=UTF-8',
    'Content-Transfer-Encoding: quoted-printable',
    '',
    html,
    '',
    `--${boundary}--`,
  ].join('\r\n');
  return Buffer.from(message).toString('base64url');
}

// ── Route handler ────────────────────────────────────────────────────────────
export async function GET(req: NextRequest) {
  const mode = new URL(req.url).searchParams.get('mode');

  // Public read-only mode — no auth, no email
  if (mode === 'today') {
    const wisdom = getTodayWisdom();
    return NextResponse.json({ wisdom });
  }

  // Cron email mode — requires Bearer auth
  const cronSecret = process.env.CRON_SECRET;
  const authHeader = req.headers.get('authorization');
  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const to = process.env.REMINDER_TO_EMAIL ?? '';
  if (!to) {
    return NextResponse.json({ error: 'REMINDER_TO_EMAIL not set' }, { status: 500 });
  }

  try {
    const wisdom = getTodayWisdom();
    const jst = new Date(Date.now() + 9 * 60 * 60 * 1000);
    const dateStr = jst.toLocaleDateString('ja-JP', {
      year: 'numeric', month: 'long', day: 'numeric', weekday: 'long',
    });

    const subject = `🧭 Morning Compass — ${dateStr}`;
    const html = buildMorningHtml(wisdom, dateStr);

    const gmail = getGmailClient();
    const raw = buildRawHtmlEmail(to, subject, html);
    await gmail.users.messages.send({ userId: 'me', requestBody: { raw } });

    return NextResponse.json({ ok: true, to, category: wisdom.category, author: wisdom.author });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
