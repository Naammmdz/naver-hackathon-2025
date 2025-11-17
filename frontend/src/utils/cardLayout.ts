import { DashboardCardConfig } from '@/components/dashboard/DashboardCard';

const GRID_COLUMN_WIDTH = 300; // Base column width
const GRID_ROW_HEIGHT = 280; // Base row height
const GAP = 12; // Gap between cards

interface CardBounds {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
}

/**
 * Convert pixel dimensions to grid units
 */
export function pixelsToGridUnits(size: number, isWidth: boolean = true): number {
  const baseSize = isWidth ? GRID_COLUMN_WIDTH : GRID_ROW_HEIGHT;
  return Math.ceil((size + GAP) / (baseSize + GAP));
}

/**
 * Convert grid units to pixels
 */
export function gridUnitsToPixels(units: number, isWidth: boolean = true): number {
  const baseSize = isWidth ? GRID_COLUMN_WIDTH : GRID_ROW_HEIGHT;
  return units * (baseSize + GAP) - GAP;
}

/**
 * Get card bounds in grid units
 */
export function getCardBounds(card: DashboardCardConfig): CardBounds {
  const x = card.x ?? (card.order % 4);
  const y = card.y ?? Math.floor(card.order / 4);
  const width = card.width 
    ? pixelsToGridUnits(card.width, true) 
    : (card.size === 'large' ? 2 : 1);
  const height = card.height 
    ? pixelsToGridUnits(card.height, false) 
    : 1;

  return { id: card.id, x, y, width, height };
}

/**
 * Check if two rectangles overlap
 */
function doRectsOverlap(a: CardBounds, b: CardBounds): boolean {
  return !(
    a.x + a.width <= b.x ||
    b.x + b.width <= a.x ||
    a.y + a.height <= b.y ||
    b.y + b.height <= a.y
  );
}

/**
 * Find all cards that overlap with the given card
 */
export function findOverlappingCards(
  card: DashboardCardConfig,
  allCards: DashboardCardConfig[]
): DashboardCardConfig[] {
  const cardBounds = getCardBounds(card);
  return allCards.filter(otherCard => {
    if (otherCard.id === card.id) return false;
    const otherBounds = getCardBounds(otherCard);
    return doRectsOverlap(cardBounds, otherBounds);
  });
}

/**
 * Try to resize overlapping cards to make room
 */
export function adjustOverlappingCards(
  resizingCard: DashboardCardConfig,
  allCards: DashboardCardConfig[]
): Partial<DashboardCardConfig>[] {
  const updates: Partial<DashboardCardConfig>[] = [];
  const resizingBounds = getCardBounds(resizingCard);
  const overlapping = findOverlappingCards(resizingCard, allCards);

  const MIN_CARD_WIDTH = 200;
  const MIN_CARD_HEIGHT = 150;

  for (const card of overlapping) {
    const bounds = getCardBounds(card);
    const update: Partial<DashboardCardConfig> = { id: card.id };
    let needsMove = false;

    // Check if card overlaps horizontally
    const horizontalOverlap = !(
      bounds.x >= resizingBounds.x + resizingBounds.width ||
      bounds.x + bounds.width <= resizingBounds.x
    );

    // Check if card overlaps vertically
    const verticalOverlap = !(
      bounds.y >= resizingBounds.y + resizingBounds.height ||
      bounds.y + bounds.height <= resizingBounds.y
    );

    if (horizontalOverlap) {
      // Card overlaps horizontally - try to shrink or move
      if (bounds.x < resizingBounds.x + resizingBounds.width && 
          bounds.x + bounds.width > resizingBounds.x) {
        // Card is to the right of resizing card
        if (bounds.x >= resizingBounds.x + resizingBounds.width) {
          const overlap = bounds.x - (resizingBounds.x + resizingBounds.width);
          const currentWidthPx = card.width || gridUnitsToPixels(bounds.width, true);
          const newWidthPx = Math.max(MIN_CARD_WIDTH, currentWidthPx - gridUnitsToPixels(overlap, true));
          
          if (newWidthPx < currentWidthPx) {
            update.width = newWidthPx;
          } else {
            needsMove = true;
          }
        }
        // Card is to the left - can't shrink left, need to move right
        else if (bounds.x + bounds.width <= resizingBounds.x) {
          needsMove = true;
        }
        // Card is directly overlapping - move it
        else {
          needsMove = true;
        }
      }
    }

    if (verticalOverlap) {
      // Card overlaps vertically - try to shrink or move
      if (bounds.y < resizingBounds.y + resizingBounds.height && 
          bounds.y + bounds.height > resizingBounds.y) {
        // Card is below resizing card
        if (bounds.y >= resizingBounds.y + resizingBounds.height) {
          const overlap = bounds.y - (resizingBounds.y + resizingBounds.height);
          const currentHeightPx = card.height || gridUnitsToPixels(bounds.height, false);
          const newHeightPx = Math.max(MIN_CARD_HEIGHT, currentHeightPx - gridUnitsToPixels(overlap, false));
          
          if (newHeightPx < currentHeightPx) {
            update.height = newHeightPx;
          } else {
            needsMove = true;
          }
        }
        // Card is above - can't shrink up, need to move down
        else if (bounds.y + bounds.height <= resizingBounds.y) {
          needsMove = true;
        }
        // Card is directly overlapping - move it
        else {
          needsMove = true;
        }
      }
    }

    // If we need to move, place card to the right or below
    if (needsMove && !update.width && !update.height) {
      // Try to place to the right first
      const rightX = resizingBounds.x + resizingBounds.width;
      const canPlaceRight = !allCards.some(otherCard => {
        if (otherCard.id === card.id || otherCard.id === resizingCard.id) return false;
        const otherBounds = getCardBounds(otherCard);
        return doRectsOverlap(
          { ...bounds, x: rightX },
          otherBounds
        );
      });

      if (canPlaceRight) {
        update.x = rightX;
        update.y = bounds.y;
      } else {
        // Place below
        update.x = bounds.x;
        update.y = resizingBounds.y + resizingBounds.height;
      }
    }

    if (Object.keys(update).length > 1) {
      updates.push(update);
    }
  }

  return updates;
}

/**
 * Calculate optimal layout for all cards
 */
export function calculateLayout(
  cards: DashboardCardConfig[],
  containerWidth: number
): Map<string, { x: number; y: number; width: number; height: number }> {
  const layout = new Map();
  const gridColumns = Math.floor(containerWidth / (GRID_COLUMN_WIDTH + GAP));
  
  let currentY = 0;
  const rowHeights: number[] = [];

  for (const card of cards) {
    const bounds = getCardBounds(card);
    
    // Find the first row where this card fits
    let placed = false;
    for (let row = 0; row < rowHeights.length; row++) {
      let canPlace = true;
      let x = 0;
      
      // Check if card fits at this row
      while (x + bounds.width <= gridColumns) {
        // Check for collisions
        const testBounds = { ...bounds, x, y: row };
        const hasCollision = cards.some(otherCard => {
          if (otherCard.id === card.id) return false;
          const otherBounds = getCardBounds(otherCard);
          if (otherBounds.y !== row) return false;
          return doRectsOverlap(testBounds, otherBounds);
        });

        if (!hasCollision) {
          layout.set(card.id, { x, y: row, width: bounds.width, height: bounds.height });
          rowHeights[row] = Math.max(rowHeights[row] || 0, bounds.height);
          placed = true;
          break;
        }
        x++;
      }

      if (placed) break;
    }

    // If couldn't place, add to new row
    if (!placed) {
      layout.set(card.id, { 
        x: 0, 
        y: rowHeights.length, 
        width: bounds.width, 
        height: bounds.height 
      });
      rowHeights.push(bounds.height);
    }
  }

  return layout;
}

