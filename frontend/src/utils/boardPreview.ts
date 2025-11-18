import type { BoardSnapshot } from '@/types/board';
import { exportToSvg } from '@excalidraw/excalidraw';

/**
 * Convert Yjs store format to standard Excalidraw format
 */
function convertYjsSnapshotToStandard(snapshot: any): BoardSnapshot | null {
  if (!snapshot?.store) {
    return snapshot as BoardSnapshot;
  }

  try {
    const store = snapshot.store;
    const shapes = Object.values(store).filter((item: any) => 
      item?.typeName === 'shape'
    ) as any[];

    // Convert Yjs shapes to Excalidraw elements
    const elements = shapes.map((shape: any) => {
      // Basic conversion - adjust based on actual Yjs shape structure
      return {
        id: shape.id || shape._id,
        type: shape.type,
        x: shape.x || 0,
        y: shape.y || 0,
        width: shape.width || 100,
        height: shape.height || 100,
        ...shape,
      };
    });

    return {
      elements,
      appState: snapshot.appState || {},
      files: snapshot.files || {},
    };
  } catch (error) {
    console.error('Error converting Yjs snapshot:', error);
    return null;
  }
}

/**
 * Generate a preview image from an Excalidraw board snapshot
 * @param snapshot - The board snapshot containing elements, appState, and files
 * @returns A data URL string of the preview image, or null if generation fails
 */
export async function generateBoardPreview(snapshot: BoardSnapshot | null | any): Promise<string | null> {
  if (!snapshot) {
    console.log('[BoardPreview] No snapshot provided');
    return null;
  }

  // Handle Yjs format
  let standardSnapshot: BoardSnapshot | null = null;
  if (snapshot.store) {
    standardSnapshot = convertYjsSnapshotToStandard(snapshot);
  } else {
    standardSnapshot = snapshot as BoardSnapshot;
  }

  if (!standardSnapshot || !standardSnapshot.elements || standardSnapshot.elements.length === 0) {
    console.log('[BoardPreview] No elements in snapshot', { 
      hasSnapshot: !!standardSnapshot, 
      elementsCount: standardSnapshot?.elements?.length || 0 
    });
    return null;
  }

  console.log('[BoardPreview] Generating preview', { elementsCount: standardSnapshot.elements.length });

  try {
    // Prepare elements and appState for export
    const elements = standardSnapshot.elements || [];
    const appState = standardSnapshot.appState || {};
    const files = standardSnapshot.files || {};

    if (elements.length === 0) {
      return null;
    }

    // Calculate bounds to determine viewBox
    let minX = Infinity, minY = Infinity, maxX = -Infinity, maxY = -Infinity;
    elements.forEach((el: any) => {
      if (el.x !== undefined && el.y !== undefined) {
        const width = el.width || 0;
        const height = el.height || 0;
        minX = Math.min(minX, el.x);
        minY = Math.min(minY, el.y);
        maxX = Math.max(maxX, el.x + width);
        maxY = Math.max(maxY, el.y + height);
      }
    });

    // If no valid bounds, use default
    if (!isFinite(minX) || !isFinite(minY)) {
      minX = 0;
      minY = 0;
      maxX = 800;
      maxY = 600;
    }

    // Add padding
    const padding = 50;
    const width = maxX - minX + padding * 2;
    const height = maxY - minY + padding * 2;

    // Export to SVG - using correct signature
    if (!exportToSvg) {
      console.error('[BoardPreview] exportToSvg is not available');
      return null;
    }

    console.log('[BoardPreview] Calling exportToSvg', { elementsCount: elements.length });
    const svg = await exportToSvg({
      elements: elements as any,
      appState: {
        ...appState,
        exportBackground: true,
        exportWithDarkMode: false,
        viewBackgroundColor: (appState.viewBackgroundColor as string) || '#ffffff',
        exportPadding: padding,
      } as any,
      files: files as any,
    });
    
    if (!svg) {
      console.error('[BoardPreview] exportToSvg returned null');
      return null;
    }
    
    console.log('[BoardPreview] SVG generated', { tagName: svg.tagName });

    // Calculate preview dimensions
    const previewWidth = 400;
    const previewHeight = 300;
    const aspectRatio = width / height;
    let finalWidth = previewWidth;
    let finalHeight = previewHeight;
    
    if (aspectRatio > previewWidth / previewHeight) {
      finalHeight = previewWidth / aspectRatio;
    } else {
      finalWidth = previewHeight * aspectRatio;
    }

    // Get existing viewBox from SVG or set new one
    const existingViewBox = svg.getAttribute('viewBox');
    if (!existingViewBox) {
      svg.setAttribute('viewBox', `${minX - padding} ${minY - padding} ${width} ${height}`);
    }
    
    svg.setAttribute('width', finalWidth.toString());
    svg.setAttribute('height', finalHeight.toString());

    // Convert SVG to data URL
    const svgString = new XMLSerializer().serializeToString(svg);
    const svgBlob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(svgBlob);

    // Convert to image via canvas for better compatibility
    return new Promise((resolve) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = finalWidth;
        canvas.height = finalHeight;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.fillStyle = (appState.viewBackgroundColor as string) || '#ffffff';
          ctx.fillRect(0, 0, finalWidth, finalHeight);
          ctx.drawImage(img, 0, 0, finalWidth, finalHeight);
          const dataUrl = canvas.toDataURL('image/png');
          URL.revokeObjectURL(url);
          console.log('[BoardPreview] Preview generated successfully', { width: finalWidth, height: finalHeight });
          resolve(dataUrl);
        } else {
          console.error('[BoardPreview] Failed to get canvas context');
          URL.revokeObjectURL(url);
          resolve(null);
        }
      };
      img.onerror = (err) => {
        console.error('[BoardPreview] Error loading SVG image:', err);
        URL.revokeObjectURL(url);
        resolve(null);
      };
      img.src = url;
    });
  } catch (error) {
    console.error('[BoardPreview] Error generating board preview:', error);
    return null;
  }
}

/**
 * Generate preview with caching
 */
const previewCache = new Map<string, string>();

export async function getCachedBoardPreview(
  boardId: string,
  snapshot: BoardSnapshot | null
): Promise<string | null> {
  // Create a simple hash from snapshot for caching
  const snapshotHash = snapshot
    ? JSON.stringify(snapshot).slice(0, 100) + (snapshot.elements?.length || 0)
    : 'empty';

  const cacheKey = `${boardId}-${snapshotHash}`;

  if (previewCache.has(cacheKey)) {
    return previewCache.get(cacheKey) || null;
  }

  const preview = await generateBoardPreview(snapshot);
  if (preview) {
    previewCache.set(cacheKey, preview);
    // Limit cache size to prevent memory issues
    if (previewCache.size > 50) {
      const firstKey = previewCache.keys().next().value;
      previewCache.delete(firstKey);
    }
  }

  return preview;
}

