import type { Metadata } from 'next';
import '@/styles/globals.css';
import { Navbar } from '@/components/Navbar';
import { ThemeProvider } from '@/components/ThemeProvider';

export const metadata: Metadata = {
  title: 'Coding Club — Learn. Compete. Grow.',
  description:
    'A competitive coding platform for students. Daily challenges, IDE, leaderboard, and learning resources — all in one place.',
  keywords: ['coding club', 'competitive programming', 'DSA', 'leaderboard', 'coding IDE'],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link rel="icon" href="/favicon.ico" />
      </head>
      <body suppressHydrationWarning>
        <ThemeProvider>
          <Navbar />
          <main>{children}</main>
        </ThemeProvider>
      </body>
    </html>
  );
}

