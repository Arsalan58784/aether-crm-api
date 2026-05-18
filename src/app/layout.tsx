import type { Metadata } from 'next';
import './globals.css';
import { CRMProvider } from '@/context/CRMContext';

export const metadata: Metadata = {
  title: 'Aether CRM | Premium Customer Relationship Suite',
  description: 'Next-generation Customer Relationship Management (CRM) dashboard powered by Next.js and MySQL.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;850&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col bg-[#0b0f19] text-[#f8fafc]">
        <CRMProvider>
          {children}
        </CRMProvider>
      </body>
    </html>
  );
}
