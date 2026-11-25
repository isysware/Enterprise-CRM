import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-inter',
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Enterprise Lead CRM',
  description:
    'Multi-portal Enterprise Lead Management CRM with Role-Based Access Control (RBAC), Follow-Up Tracker, Monthly Calendar, Converted Clients, Performance Analytics in PKR, and System Administration.',
  openGraph: {
    title: 'Enterprise Lead CRM',
    description:
      'Multi-portal Enterprise Lead Management CRM with Role-Based Access Control (RBAC), Follow-Up Tracker, Monthly Calendar, Converted Clients, Performance Analytics in PKR, and System Administration.',
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={inter.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
