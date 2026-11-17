import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'Life Compass',
  description: 'Your personal life compass — calendar, tasks, and reminders.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja">
      <body style={{ margin: 0, fontFamily: 'system-ui, sans-serif', background: '#f5f5f5' }}>
        {children}
        <footer style={{ padding: '24px 16px', color: '#666', background: '#f5f5f5' }}>
          {/* 運営会社表記(2026-11): 決済・コンプライアンス上、全Tascalサイトで共通 */}
          <div style={{ marginTop: '24px', fontSize: '12px', lineHeight: 1.7, opacity: 0.75, textAlign: 'center' }}>
            <p style={{ margin: 0 }}>Operating Company: Globish International Co., Ltd. (Company Reg. No: LL16320)</p>
            <p style={{ margin: 0 }}>Registered Address: Unit B, Lot 49, 1st Floor, Block F, Lazenda Warehouse 3, Jalan Ranca-Ranca, 87000 F.T. Labuan, Malaysia</p>
          </div>
        </footer>
      </body>
    </html>
  );
}
