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
      </body>
    </html>
  );
}
