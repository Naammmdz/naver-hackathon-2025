/**
 * OnlineUsers Component - Usage Examples
 * 
 * This file demonstrates different ways to use the OnlineUsers component
 * in various parts of your application.
 */

import { OnlineUsers } from './OnlineUsers';

// Example 1: Compact header usage (default)
export function CompactHeaderExample() {
  return (
    <div className="flex items-center justify-between p-4 border-b">
      <h1 className="text-xl font-bold">My Document</h1>
      <OnlineUsers maxVisible={3} size="sm" showLabel={true} />
    </div>
  );
}

// Example 2: Sidebar usage with larger avatars
export function SidebarExample() {
  return (
    <div className="w-64 border-r p-4">
      <h2 className="text-sm font-semibold mb-4">Collaborators</h2>
      <OnlineUsers 
        maxVisible={5} 
        size="md" 
        showLabel={false}
        className="flex-col items-start gap-4"
      />
    </div>
  );
}

// Example 3: Mobile-friendly minimal version
export function MobileMinimalExample() {
  return (
    <div className="flex items-center gap-2 p-2">
      {/* Only show avatars, no label */}
      <OnlineUsers 
        maxVisible={2} 
        size="sm" 
        showLabel={false}
      />
    </div>
  );
}

// Example 4: Dashboard card
export function DashboardCardExample() {
  return (
    <div className="p-6 border rounded-lg bg-card">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold">Active Now</h3>
        <OnlineUsers 
          maxVisible={4} 
          size="md" 
          showLabel={false}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        Team members currently working on this project
      </p>
    </div>
  );
}

// Example 5: Full-width header with search (like BoardHeader)
export function FullHeaderExample() {
  return (
    <header className="flex items-center justify-between px-6 py-4 border-b bg-card/50 backdrop-blur">
      <div className="flex items-center gap-4">
        <h1 className="text-xl font-bold">Project Board</h1>
      </div>
      
      <div className="flex items-center gap-4">
        <input 
          type="text" 
          placeholder="Search..."
          className="px-3 py-2 border rounded-md"
        />
        <OnlineUsers maxVisible={3} size="sm" showLabel={true} />
      </div>
    </header>
  );
}

// Example 6: Toolbar integration
export function ToolbarExample() {
  return (
    <div className="flex items-center gap-2 p-2 border-b">
      <button className="px-3 py-2 rounded hover:bg-muted">File</button>
      <button className="px-3 py-2 rounded hover:bg-muted">Edit</button>
      <button className="px-3 py-2 rounded hover:bg-muted">View</button>
      
      <div className="flex-1" />
      
      <OnlineUsers 
        maxVisible={3} 
        size="sm" 
        showLabel={false}
      />
      
      <button className="px-3 py-2 rounded hover:bg-muted">Share</button>
    </div>
  );
}

// Example 7: Responsive card with conditional rendering
export function ResponsiveCardExample() {
  return (
    <div className="p-4 border rounded-lg">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h3 className="font-semibold">Document Title</h3>
          <p className="text-sm text-muted-foreground">Last edited 2 hours ago</p>
        </div>
        
        {/* Show full version on desktop, compact on mobile */}
        <div className="sm:block hidden">
          <OnlineUsers maxVisible={3} size="sm" showLabel={true} />
        </div>
        <div className="sm:hidden block">
          <OnlineUsers maxVisible={2} size="sm" showLabel={false} />
        </div>
      </div>
    </div>
  );
}

// Example 8: Custom styling with className
export function CustomStyledExample() {
  return (
    <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-lg text-white">
      <div className="flex items-center justify-between">
        <h2 className="text-lg font-bold">Live Session</h2>
        <OnlineUsers 
          maxVisible={5} 
          size="md" 
          showLabel={true}
          className="text-white"
        />
      </div>
    </div>
  );
}

// Example 9: Integration with dropdown menu
export function DropdownMenuExample() {
  return (
    <div className="relative">
      <button className="flex items-center gap-2 px-4 py-2 border rounded-md hover:bg-muted">
        <span>Collaborators</span>
        <OnlineUsers 
          maxVisible={2} 
          size="sm" 
          showLabel={false}
        />
      </button>
    </div>
  );
}

// Example 10: Status bar at bottom
export function StatusBarExample() {
  return (
    <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-between px-6 py-2 border-t bg-card/95 backdrop-blur">
      <div className="flex items-center gap-4 text-sm text-muted-foreground">
        <span>Ready</span>
        <span>•</span>
        <span>Line 42, Column 8</span>
      </div>
      
      <OnlineUsers 
        maxVisible={4} 
        size="sm" 
        showLabel={true}
      />
    </footer>
  );
}
