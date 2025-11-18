# Card Gallery Feature - ClickUp Style

## Overview
The Card Gallery is a comprehensive card selection interface inspired by ClickUp's "Add Card" feature. Users can browse, search, and add various types of cards to their dashboard with preview images and detailed descriptions.

## Features

### 1. **Card Gallery Dialog**
- Full-screen modal with sidebar navigation
- Category-based filtering
- Search functionality
- Preview images for featured cards
- Badge indicators (Popular, New)

### 2. **Card Categories**

#### **Featured Cards** ⭐
Cards with high usage and preview images:
- **Tasks Overview**: Task statistics with status breakdown
- **Recent Documents**: Latest documents with thumbnails
- **Recent Boards**: Recent whiteboard previews

#### **Overview Cards** 📊
Simple stat cards:
- **Documents Count**: Total documents
- **Boards Count**: Total boards
- **Team Members**: Workspace members count

#### **AI & Smart Cards** 🤖
AI-powered features:
- **AI Chat**: Quick access to AI assistant
- **Smart Task Parser**: Natural language task creation
- **AI Suggestions**: AI-powered recommendations

#### **Analytics Cards** 📈
Data visualization cards:
- **Task Analytics**: Completion trends
- **Productivity Score**: Performance metrics
- **Time Tracking**: Time monitoring
- **Completion Rate**: Success percentage

#### **Custom Cards** ⚙️
Flexible widgets:
- **Calendar View**: Upcoming tasks calendar
- **Quick Actions**: Shortcut buttons
- **Embed Link**: External content embedding
- **Todo List**: Simple todo widget

### 3. **Card Templates**

Each template includes:
```typescript
interface CardTemplate {
  id: string;              // Unique identifier
  name: string;            // Display name
  description: string;     // Card description
  icon: ReactNode;         // Icon component
  category: string;        // Category for filtering
  preview: string;         // Preview image URL
  size: string;            // Default size
  color: string;           // Accent color
  badge?: string;          // Optional badge (Popular/New)
}
```

### 4. **Preview Images**

Preview images are stored in `/public/home-assets/`:
- `task-preview.jpg` - Tasks overview preview
- `doc-preview.jpg` - Documents preview
- `board-preview.jpg` - Boards preview

## User Experience

### Adding a Card

1. **Open Gallery**:
   - Click "Customize" → "Add Card"
   - Card Gallery dialog opens

2. **Browse Cards**:
   - View all cards or filter by category
   - See preview images for featured cards
   - Read descriptions and badges

3. **Search**:
   - Type in search box
   - Filter by name or description
   - Real-time results

4. **Select Card**:
   - Click on any card template
   - Card automatically added to dashboard
   - Dialog closes

### Gallery Layout

```
┌─────────────────────────────────────────────────────┐
│  Add Card                                      [X]  │
│  Choose a card type to add to your dashboard       │
├──────────┬──────────────────────────────────────────┤
│          │  [Search box]                            │
│ ⭐ All   │                                          │
│ ⭐ Featured│  ┌──────┐  ┌──────┐  ┌──────┐        │
│ 📊 Overview│  │Card 1│  │Card 2│  │Card 3│        │
│ 🤖 AI     │  │      │  │      │  │      │        │
│ 📈 Analytics│ └──────┘  └──────┘  └──────┘        │
│ ⚙️ Custom │                                          │
│          │  ┌──────┐  ┌──────┐  ┌──────┐        │
│          │  │Card 4│  │Card 5│  │Card 6│        │
│          │  └──────┘  └──────┘  └──────┘        │
└──────────┴──────────────────────────────────────────┘
```

## Implementation

### CardGallery Component

**Location**: `frontend/src/components/dashboard/CardGallery.tsx`

**Props**:
```typescript
interface CardGalleryProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelectCard: (template: CardTemplate) => void;
}
```

**Features**:
- Sidebar with category navigation
- Search bar with real-time filtering
- Responsive grid layout (1/2/3 columns)
- Hover effects and transitions
- Empty state for no results

### Integration with Home

**In Home.tsx**:
```typescript
// State
const [showCardGallery, setShowCardGallery] = useState(false);

// Handler
const handleSelectCardTemplate = (template: CardTemplate) => {
  const newCard: DashboardCardConfig = {
    id: template.id + '-' + Date.now(),
    type: template.category === 'ai' ? 'custom' : 'stat',
    title: template.name,
    description: template.description,
    size: template.size,
    visible: true,
    order: cards.length,
    color: template.color,
  };
  addCard(newCard);
};

// Usage
<CardGallery
  open={showCardGallery}
  onOpenChange={setShowCardGallery}
  onSelectCard={handleSelectCardTemplate}
/>
```

## Styling

### Card Template Card
```css
.card-template {
  border: 2px dashed;
  border-radius: 0.5rem;
  transition: all 200ms;
}

.card-template:hover {
  border-style: solid;
  border-color: hsl(var(--primary) / 0.5);
  background-color: hsl(var(--accent));
}

.card-template img {
  transition: transform 300ms;
}

.card-template:hover img {
  transform: scale(1.05);
}
```

### Category Sidebar
```css
.category-button {
  width: 100%;
  padding: 0.5rem 0.75rem;
  border-radius: 0.5rem;
  transition: colors 200ms;
}

.category-button.active {
  background-color: hsl(var(--primary));
  color: hsl(var(--primary-foreground));
}
```

## Card Types & Use Cases

### 1. **Tasks Overview** (Featured)
- **Use Case**: Dashboard homepage
- **Preview**: Shows task kanban board
- **Size**: Medium (2 columns)
- **Content**: Task counts by status

### 2. **Recent Documents** (Featured)
- **Use Case**: Quick document access
- **Preview**: Document list with icons
- **Size**: Medium (2 columns)
- **Content**: 5 latest documents

### 3. **AI Chat** (AI & Smart)
- **Use Case**: Quick AI assistance
- **Preview**: None (icon only)
- **Size**: Medium (2 columns)
- **Content**: Chat interface or quick prompts

### 4. **Task Analytics** (Analytics)
- **Use Case**: Performance tracking
- **Preview**: None (icon only)
- **Size**: Large (3 columns)
- **Content**: Charts and graphs

### 5. **Quick Actions** (Custom)
- **Use Case**: Workflow shortcuts
- **Preview**: None (icon only)
- **Size**: Full width
- **Content**: Action buttons

## Internationalization

### English
```json
{
  "dashboard": {
    "addCard": "Add Card",
    "selectCardType": "Choose a card type to add to your dashboard",
    "searchCards": "Search cards...",
    "allCards": "All Cards",
    "featured": "Featured",
    "overview": "Overview",
    "aiCards": "AI & Smart",
    "analytics": "Analytics",
    "custom": "Custom"
  }
}
```

### Vietnamese
```json
{
  "dashboard": {
    "addCard": "Thêm Thẻ",
    "selectCardType": "Chọn loại thẻ để thêm vào dashboard",
    "searchCards": "Tìm kiếm thẻ...",
    "allCards": "Tất Cả Thẻ",
    "featured": "Nổi Bật",
    "overview": "Tổng Quan",
    "aiCards": "AI & Thông Minh",
    "analytics": "Phân Tích",
    "custom": "Tùy Chỉnh"
  }
}
```

## Future Enhancements

### 1. **Card Marketplace**
- Community-created cards
- Import/export card templates
- Rating and reviews

### 2. **Advanced Previews**
- Live data previews
- Interactive previews
- Video demonstrations

### 3. **Smart Recommendations**
- AI-suggested cards based on usage
- Popular cards in your workspace
- Trending cards

### 4. **Card Bundles**
- Pre-configured card sets
- Industry-specific templates
- Role-based recommendations

### 5. **More Card Types**
- Weather widget
- News feed
- Calendar integration
- Third-party app embeds
- Custom iframe embeds
- RSS feed reader
- Social media feeds

## Technical Details

### Performance
- Lazy loading for preview images
- Virtualized list for large card libraries
- Debounced search
- Memoized filtering

### Accessibility
- Keyboard navigation
- Screen reader support
- Focus management
- ARIA labels

### Responsive Design
- Mobile: 1 column
- Tablet: 2 columns
- Desktop: 3 columns
- Touch-friendly interactions

## Testing Checklist

- [ ] Open card gallery
- [ ] Browse all categories
- [ ] Search for cards
- [ ] Select and add cards
- [ ] View preview images
- [ ] Test on mobile
- [ ] Test keyboard navigation
- [ ] Test with screen reader
- [ ] Test empty search results
- [ ] Test language switching

## Related Files

- `/frontend/src/components/dashboard/CardGallery.tsx` - Main component
- `/frontend/src/pages/Home.tsx` - Integration
- `/frontend/src/i18n/locales/en.json` - English translations
- `/frontend/src/i18n/locales/vi.json` - Vietnamese translations
- `/public/home-assets/` - Preview images

## Design Inspiration

Based on:
- ClickUp's Add Card feature
- Notion's template gallery
- Figma's plugin browser
- VS Code's extension marketplace

