import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

const poppins = Poppins({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700', '800'],
  style: ['normal', 'italic'],
  variable: '--font-poppins',
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
    <html lang="en" className={poppins.variable} suppressHydrationWarning>
      <body className="font-sans antialiased">{children}</body>
    </html>
  );
}
