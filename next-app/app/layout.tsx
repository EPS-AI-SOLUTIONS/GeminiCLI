import type { Metadata, Viewport } from 'next';
import '@/styles/globals.css';
import { Providers } from './providers';

export const metadata: Metadata = {
  title: 'ClaudeHydra — Multi-Agent AI System',
  description:
    'ClaudeHydra: Wieloagentowy system AI oparty na architekturze Swarm. ' +
    'Inteligentna orkiestracja agentów, streaming SSE, Tissaia Design System.',
  keywords: ['AI', 'multi-agent', 'swarm', 'Claude', 'LLM', 'chat'],
  authors: [{ name: 'ClaudeHydra Team' }],
  icons: {
    icon: '/favicon.ico',
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: '(prefers-color-scheme: dark)', color: '#0a0f0d' },
    { media: '(prefers-color-scheme: light)', color: '#ffffff' },
  ],
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pl" suppressHydrationWarning>
      <head>
        <meta name="theme-color" content="#0a0f0d" />
      </head>
      <body className="antialiased font-mono">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
