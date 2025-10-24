import { BoardView } from '@/components/board/BoardView';
import { ClickupAppSidebar } from '@/components/layout/ClickupAppSidebar';
import { ClickupHeader } from '@/components/layout/ClickupHeader';
import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import Docs from './Docs';
import Index from './Index';

export default function AppWrapper() {
  const [currentView, setCurrentView] = useState<'tasks' | 'docs' | 'board'>('tasks');
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const { t } = useTranslation();

  return (
    <div className="h-screen bg-background flex flex-col overflow-hidden">
      {/* ClickUp Style Header */}
      <ClickupHeader
        currentView={currentView}
        onMenuClick={() => setSidebarOpen(!sidebarOpen)}
        onSmartCreate={() => {
          const event = new CustomEvent('openSmartParser');
          window.dispatchEvent(event);
        }}
      />

      {/* Main Layout - ClickUp 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden overflow-x-hidden pt-2 pl-2 pb-2">
        {/* ClickUp App Sidebar (Icon bar + Workspace sidebar) */}
        <ClickupAppSidebar
          isOpen={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
          currentView={currentView}
          onViewChange={setCurrentView}
        />

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          {currentView === 'tasks' ? <Index onViewChange={setCurrentView} /> :
           currentView === 'docs' ? <Docs /> :
           <BoardView />}
        </main>
      </div>
    </div>
  );
}
