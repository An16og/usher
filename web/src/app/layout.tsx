import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlixGuard | Movie Accessibility & Compliance Gatekeeper',
  description:
    'High-stakes compliance agent evaluating film accessibility and triggers via Sanity Context MCP and Gemini.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark">
      <body className="bg-slate-950 text-slate-100 antialiased min-h-screen">
        {children}
      </body>
    </html>
  );
}
