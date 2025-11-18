# Graph View Implementation

## Overview

Graph View là một tính năng visualization kiểu Obsidian cho phép người dùng xem cấu trúc workspace, folders, documents và tags dưới dạng biểu đồ tương tác.

## Tech Stack

- **Frontend**: React + TypeScript + D3.js v7
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL (via existing models)

## Features

### 1. Interactive Graph Visualization
- **Node Types**:
  - `project`: Workspace root (màu xanh dương)
  - `folder`: Thư mục chứa documents (màu tím)
  - `note`: Document/note (màu trắng)
  - `tag`: Hashtags extracted từ content (màu xanh lá)

- **Interactions**:
  - Drag & drop nodes
  - Zoom/Pan với mouse wheel
  - Hover để highlight neighbors
  - Click node để navigate

### 2. Venn Mode (Folder Bubble)
- Toggle ON/OFF để xem folders như "bubbles" bao quanh notes
- Tags được đẩy ra vòng ngoài
- Force-directed layout tự động sắp xếp

### 3. Real-time Data
- Fetch từ database qua API
- Fallback to demo data nếu API fails
- Auto-refresh khi switch workspace

## File Structure

```
frontend/
├── src/
│   ├── lib/
│   │   ├── graph/
│   │   │   └── initGraph.js          # D3.js graph logic
│   │   └── api/
│   │       └── graphApi.ts           # API calls
│   ├── components/
│   │   └── GraphView.tsx             # React component wrapper
│   ├── pages/
│   │   └── GraphViewPage.tsx         # Full page view
│   └── components/layout/
│       └── ClickupAppSidebar.tsx     # Navigation (added Graph icon)

backend-ai-service/
├── api/
│   ├── routes/
│   │   └── graph.py                  # Graph API endpoints
│   └── main.py                       # Register routes
```

## API Endpoints

### GET `/api/v1/graph`
Fetch graph data for a workspace.

**Query Parameters**:
- `workspace_id` (required): Workspace UUID

**Response**:
```json
{
  "nodes": [
    {
      "id": "workspace_xxx",
      "label": "My Workspace",
      "type": "project"
    },
    {
      "id": "doc_xxx",
      "label": "My Document",
      "type": "folder",
      "folder": "workspace_xxx"
    }
  ],
  "links": [
    {
      "source": "workspace_xxx",
      "target": "doc_xxx"
    }
  ]
}
```

### GET `/api/v1/graph/demo`
Get demo graph data (no authentication required).

## How It Works

### 1. Data Flow

```
Database (PostgreSQL)
    ↓
Backend API (FastAPI)
    ↓
Frontend API Client (graphApi.ts)
    ↓
React Component (GraphView.tsx)
    ↓
D3.js Visualization (initGraph.js)
```

### 2. Node & Link Generation

Backend logic (`graph.py`):
1. Query workspace from database
2. Get all documents (excluding trashed)
3. Build hierarchy:
   - Documents with children → `folder` type
   - Documents without children → `note` type
4. Extract hashtags from content → `tag` type
5. Create links:
   - Workspace → top-level documents
   - Parent → child documents
   - Documents → tags

### 3. Force-Directed Layout

D3.js forces:
- `forceLink`: Keep connected nodes at specific distance
- `forceManyBody`: Repel nodes from each other
- `forceCenter`: Pull graph to center
- `forceX/Y`: Deterministic positioning based on node label hash
- **Venn Mode**:
  - `clusterNotes`: Pull notes toward their folder
  - `radialTags`: Push tags outward

## Usage

### For Users

1. Click **Graph** icon in sidebar (Network icon)
2. View your workspace structure
3. Interact:
   - Drag nodes to rearrange
   - Scroll to zoom
   - Hover to see connections
   - Click to open documents
4. Toggle **Venn Mode** button (top-right)

### For Developers

#### Add Graph View to a New Page

```tsx
import { GraphView } from "@/components/GraphView";

function MyPage() {
  const handleNodeClick = (node) => {
    console.log("Clicked:", node);
    // Handle navigation
  };

  return (
    <div className="h-screen w-screen">
      <GraphView 
        workspaceId="your-workspace-id"
        onNodeClick={handleNodeClick}
      />
    </div>
  );
}
```

#### Customize Graph Appearance

Edit `frontend/src/lib/graph/initGraph.js`:

```js
// Node colors
function nodeColor(d) {
  if (d.type === "project") return "#60a5fa";  // Change colors here
  if (d.type === "folder")  return "#818cf8";
  if (d.type === "tag")     return "#22c55e";
  return "#e5e7eb";
}

// Node sizes
function nodeRadius(d) {
  if (d.type === "project") return 14;  // Change sizes here
  if (d.type === "folder")  return 10;
  if (d.type === "tag")     return 7;
  return 5.5;
}

// Force strengths
simulation
  .force("charge", d3.forceManyBody().strength(-250))  // Repulsion
  .force("clusterNotes", makeClusterNotesForce(0.12)) // Folder clustering
  .force("radialTags", makeRadialTagsForce(0.05));    // Tag positioning
```

## Future Enhancements

### Short-term
- [ ] Add filter by tag/folder
- [ ] Search nodes
- [ ] Save layout positions to database
- [ ] Export graph as image

### Long-term
- [ ] Use Pixi.js for better performance (like Obsidian)
- [ ] Minimap for navigation
- [ ] Document preview on hover
- [ ] Custom node colors/icons
- [ ] Graph analytics (centrality, clusters)

## Troubleshooting

### Graph doesn't load
1. Check backend is running: `http://localhost:8000/docs`
2. Check API endpoint: `http://localhost:8000/api/v1/graph/demo`
3. Check browser console for errors
4. Verify `VITE_AI_SERVICE_URL` in `.env`

### Nodes overlap too much
Adjust force strengths in `initGraph.js`:
```js
.force("charge", d3.forceManyBody().strength(-500))  // Increase repulsion
```

### Tags inside folders
Increase radial force:
```js
.force("radialTags", makeRadialTagsForce(0.1))  // Increase from 0.05
```

### Performance issues with large graphs
- Consider using Pixi.js for rendering
- Implement node limit/pagination
- Add level-of-detail (hide labels when zoomed out)

## References

- [D3.js Force Layout](https://d3js.org/d3-force)
- [Obsidian Graph View](https://help.obsidian.md/Plugins/Graph+view)
- Original implementation: `graph-view.md`

