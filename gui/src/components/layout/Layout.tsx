/**
 * Main Layout Component
 */

import { type ReactNode, useState } from 'react';
import { Header } from './Header';
import { Sidebar } from './Sidebar';

type ViewType = 'chat' | 'agents' | 'history' | 'settings';

const viewTitles: Record<ViewType, { title: string; subtitle?: string }> = {
  chat: { title: 'Chat', subtitle: 'Komunikacja z agentami' },
  agents: { title: 'Agenci', subtitle: 'Zarządzanie agentami Hydry' },
  history: { title: 'Historia', subtitle: 'Poprzednie konwersacje' },
  settings: { title: 'Ustawienia', subtitle: 'Konfiguracja aplikacji' },
};

interface LayoutProps {
  children: (view: ViewType) => ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const [currentView, setCurrentView] = useState<ViewType>('chat');

  const { title, subtitle } = viewTitles[currentView];

  return (
    <div className="flex h-screen bg-[var(--matrix-bg-primary)] bg-grid-pattern">
      {/* Sidebar */}
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />

      {/* Main Content */}
      <div className="flex-1 flex flex-col overflow-hidden">
        <Header title={title} subtitle={subtitle} />

        <main className="flex-1 overflow-auto p-6">{children(currentView)}</main>
      </div>
    </div>
  );
}
