import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { AuthProvider } from '@/lib/auth-context';
import { ReactQueryProvider } from '@/lib/query-client';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Kutumb — Family Health',
  description: 'Voice-first family health tracking for Indian families',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="h-full">
      <body className={`${inter.className} h-full bg-slate-50 text-slate-900 antialiased`}>
        <ReactQueryProvider>
          <AuthProvider>
            {children}
          </AuthProvider>
        </ReactQueryProvider>
      </body>
    </html>
  );
}
