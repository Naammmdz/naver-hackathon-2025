import React, { useEffect, useRef, useState } from "react";
import { initGraph } from "@/lib/graph/initGraph";
import { fetchGraphData, fetchDemoGraphData, type GraphData } from "@/lib/api/graphApi";
import { Card } from "@/components/ui/card";
import { Loader2 } from "lucide-react";

interface GraphNode {
  id: string;
  label: string;
  type: "project" | "folder" | "note" | "tag";
  folder?: string;
}

interface GraphViewProps {
  workspaceId?: string;
  onNodeClick?: (node: GraphNode) => void;
  data?: GraphData | null;
}

export function GraphView({ workspaceId, onNodeClick, data }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);

  // Detect theme and update graph
  useEffect(() => {
    const checkTheme = () => {
      const isDarkMode = document.documentElement.classList.contains('dark');
      setIsDark(isDarkMode);
      
      // Update graph theme if already initialized
      if (graphApiRef.current?.updateTheme) {
        graphApiRef.current.updateTheme(isDarkMode ? 'dark' : 'light');
      }
    };

    checkTheme();

    const observer = new MutationObserver(checkTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });

    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      try {
        setLoading(true);
        setError(null);

        // Wait for container to be ready
        if (!containerRef.current) {
          await new Promise((resolve) => setTimeout(resolve, 100));
        }

        if (!containerRef.current) {
          setError("Container not available");
          setLoading(false);
          return;
        }

        let graphData: GraphData | null = null;

        if (data) {
          graphData = data;
        } else {
        if (workspaceId) {
          try {
            graphData = await fetchGraphData(workspaceId);
          } catch (apiError) {
            console.warn("Failed to fetch workspace graph data, falling back to demo:", apiError);
              graphData = await fetchDemoGraphData();
            }
          } else {
            graphData = await fetchDemoGraphData();
          }
        }

        if (!graphData) {
          setError("No graph data available");
          setLoading(false);
          return;
        }

        if (!cancelled && containerRef.current) {
          if (graphApiRef.current?.destroy) {
            graphApiRef.current.destroy();
          }
          const isDarkMode = document.documentElement.classList.contains('dark');
          graphApiRef.current = initGraph(containerRef.current, graphData, {
            onNodeClick,
            vennMode: true,
            theme: isDarkMode ? 'dark' : 'light',
          });
          setLoading(false);
        }
      } catch (e) {
        console.error("Failed to load graph:", e);
        if (!cancelled) {
          setError("Failed to load graph data");
          setLoading(false);
        }
      }
    }

    loadData();

    return () => {
      cancelled = true;
      if (graphApiRef.current?.destroy) {
        graphApiRef.current.destroy();
      }
    };
  }, [workspaceId, onNodeClick, data, isDark]);

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {loading && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${
          isDark 
            ? "bg-background/95 backdrop-blur-sm" 
            : "bg-background/95 backdrop-blur-sm"
        }`}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className={`h-8 w-8 animate-spin text-primary`} />
            <p className={`text-sm text-muted-foreground`}>Loading graph view...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${
          isDark 
            ? "bg-background/95 backdrop-blur-sm" 
            : "bg-background/95 backdrop-blur-sm"
        }`}>
          <Card className={`p-6 bg-card border-border shadow-elegant`}>
            <p className={`text-sm text-destructive`}>{error}</p>
          </Card>
        </div>
      )}

      {/* Controls overlay */}
      {!loading && !error && (
        <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
          <div className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider ${
            isDark
              ? "bg-card/90 border border-border text-muted-foreground shadow-sm"
              : "bg-card/90 border border-border text-muted-foreground shadow-sm"
          }`}>
            Drag · Scroll · Hover · Click
          </div>
        </div>
      )}

      {/* Graph container - always rendered */}
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
      />
    </div>
  );
}

