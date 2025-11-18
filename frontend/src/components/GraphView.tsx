import React, { useEffect, useRef, useState } from "react";
import { initGraph } from "@/lib/graph/initGraph";
import { fetchGraphData, fetchDemoGraphData, type GraphData } from "@/lib/api/graphApi";
import { Button } from "@/components/ui/button";
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
}

export function GraphView({ workspaceId, onNodeClick }: GraphViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const graphApiRef = useRef<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [vennMode, setVennMode] = useState(true);
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
        console.log("[GraphView] Starting to load data...");
        setLoading(true);
        setError(null);

        // Wait for container to be ready
        if (!containerRef.current) {
          console.log("[GraphView] Waiting for container to mount...");
          await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (!containerRef.current) {
          console.error("[GraphView] Container still not available after wait");
          setError("Container not available");
          setLoading(false);
          return;
        }

        let graphData: GraphData;

        // Try to fetch real data if workspaceId is provided
        if (workspaceId) {
          console.log("[GraphView] Fetching workspace data for:", workspaceId);
          try {
            graphData = await fetchGraphData(workspaceId);
            console.log("[GraphView] Workspace data loaded:", graphData);
          } catch (apiError) {
            console.warn("Failed to fetch workspace graph data, falling back to demo:", apiError);
            // Fallback to demo data if API fails
            graphData = await fetchDemoGraphData();
            console.log("[GraphView] Demo data loaded:", graphData);
          }
        } else {
          // Use demo data if no workspace selected
          console.log("[GraphView] No workspace ID, using demo data");
          graphData = await fetchDemoGraphData();
          console.log("[GraphView] Demo data loaded:", graphData);
        }

        console.log("[GraphView] Container ref:", containerRef.current);
        console.log("[GraphView] Graph data nodes:", graphData.nodes.length);
        console.log("[GraphView] Graph data links:", graphData.links.length);

        if (!cancelled && containerRef.current) {
          console.log("[GraphView] Initializing D3 graph...");
          const isDarkMode = document.documentElement.classList.contains('dark');
          graphApiRef.current = initGraph(containerRef.current, graphData, {
            onNodeClick,
            vennMode: true,
            theme: isDarkMode ? 'dark' : 'light'
          });
          console.log("[GraphView] Graph initialized successfully!");
          setLoading(false);
        } else {
          console.warn("[GraphView] Cannot initialize: cancelled=", cancelled, "container=", containerRef.current);
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
  }, [workspaceId, onNodeClick, isDark]);

  const handleToggleVenn = () => {
    if (graphApiRef.current?.toggleVennMode) {
      const newMode = graphApiRef.current.toggleVennMode();
      setVennMode(newMode);
    }
  };

  return (
    <div className="relative w-full h-full">
      {/* Loading overlay */}
      {loading && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${
          isDark 
            ? "bg-gradient-to-b from-slate-950 via-slate-900 to-black" 
            : "bg-gradient-to-b from-white via-slate-50 to-slate-100"
        }`}>
          <div className="flex flex-col items-center gap-3">
            <Loader2 className={`h-8 w-8 animate-spin ${isDark ? "text-blue-400" : "text-blue-600"}`} />
            <p className={`text-sm ${isDark ? "text-slate-300" : "text-slate-600"}`}>Loading graph view...</p>
          </div>
        </div>
      )}

      {/* Error overlay */}
      {error && (
        <div className={`absolute inset-0 z-50 flex items-center justify-center ${
          isDark 
            ? "bg-gradient-to-b from-slate-950 via-slate-900 to-black" 
            : "bg-gradient-to-b from-white via-slate-50 to-slate-100"
        }`}>
          <Card className={`p-6 ${isDark ? "bg-slate-900/50 border-slate-700" : "bg-white/90 border-slate-200"}`}>
            <p className={`text-sm ${isDark ? "text-red-400" : "text-red-600"}`}>{error}</p>
          </Card>
        </div>
      )}

      {/* Controls overlay */}
      {!loading && !error && (
        <>
          <div className="absolute left-4 top-3 z-10 flex items-center gap-2">
            <div className={`px-3 py-1.5 rounded-full text-xs uppercase tracking-wider ${
              isDark
                ? "bg-slate-900/90 border border-slate-700/50 text-slate-300"
                : "bg-white/90 border border-slate-200/50 text-slate-600 shadow-sm"
            }`}>
              Drag · Scroll · Hover · Click
            </div>
          </div>

          <div className="absolute right-4 top-3 z-10">
            <Button
              variant="outline"
              size="sm"
              onClick={handleToggleVenn}
              className={`rounded-full text-xs uppercase tracking-wider ${
                vennMode 
                  ? isDark
                    ? "bg-slate-900/95 border-teal-400/70 text-cyan-300 hover:bg-slate-800"
                    : "bg-white/95 border-teal-500/70 text-teal-700 hover:bg-slate-50"
                  : isDark
                    ? "bg-slate-900/80 border-slate-600 text-slate-300 hover:bg-slate-800"
                    : "bg-white/80 border-slate-300 text-slate-600 hover:bg-slate-50"
              }`}
            >
              Venn mode: {vennMode ? "ON" : "OFF"}
            </Button>
          </div>
        </>
      )}

      {/* Graph container - always rendered */}
      <div
        ref={containerRef}
        className="w-full h-full relative overflow-hidden"
      />
    </div>
  );
}

