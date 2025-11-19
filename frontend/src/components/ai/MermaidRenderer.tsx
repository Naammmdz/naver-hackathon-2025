/**
 * MermaidRenderer Component
 * 
 * Renders Mermaid.js diagrams from Board Agent responses.
 * Supports Kanban boards, Gantt charts, flowcharts, sequence diagrams, etc.
 */

import { useEffect, useRef, useState } from "react"
import mermaid from "mermaid"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { AlertCircle, Download, Maximize2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface MermaidRendererProps {
  /** Mermaid diagram code */
  code: string
  /** Optional title for the diagram */
  title?: string
  /** Optional description */
  description?: string
  /** Chart type (for styling/context) */
  chartType?: string
  /** CSS class for container */
  className?: string
}

export function MermaidRenderer({
  code,
  title,
  description,
  chartType,
  className = "",
}: MermaidRendererProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)
  const [isRendering, setIsRendering] = useState(true)
  const [svgContent, setSvgContent] = useState<string>("")

  useEffect(() => {
    // Initialize Mermaid with configuration
    mermaid.initialize({
      startOnLoad: false,
      theme: "default",
      themeVariables: {
        primaryColor: "#465024", // oklch(0.4650 0.1470 24.9381) converted approx
        primaryTextColor: "#fff",
        primaryBorderColor: "#465024",
        lineColor: "#64748b",
        secondaryColor: "#555348", // oklch(0.5553 0.1455 48.9975) approx
        tertiaryColor: "#473246", // oklch(0.4732 0.1247 46.2007) approx
      },
      fontFamily: "Inter, system-ui, sans-serif",
      securityLevel: "loose",
    })
  }, [])

  useEffect(() => {
    const renderDiagram = async () => {
      if (!containerRef.current || !code) return

      setIsRendering(true)
      setError(null)

      try {
        // Generate unique ID for this diagram
        const id = `mermaid-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`
        
        // Render the diagram
        const { svg } = await mermaid.render(id, code)
        
        setSvgContent(svg)
        
        // Insert SVG into container
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      } catch (err) {
        console.error("Mermaid rendering error:", err)
        setError(
          err instanceof Error 
            ? err.message 
            : "Failed to render diagram. The Mermaid code may be invalid."
        )
      } finally {
        setIsRendering(false)
      }
    }

    renderDiagram()
  }, [code])

  const downloadSVG = () => {
    if (!svgContent) return

    const blob = new Blob([svgContent], { type: "image/svg+xml" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `diagram-${chartType || "mermaid"}-${Date.now()}.svg`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <Card className={className}>
      {(title || description) && (
        <CardHeader>
          {title && (
            <div className="flex items-center justify-between">
              <CardTitle className="text-lg">{title}</CardTitle>
              <div className="flex gap-2">
                {svgContent && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={downloadSVG}
                    title="Download SVG"
                  >
                    <Download className="h-4 w-4" />
                  </Button>
                )}
                <Dialog>
                  <DialogTrigger asChild>
                    <Button variant="ghost" size="sm" title="View fullscreen">
                      <Maximize2 className="h-4 w-4" />
                    </Button>
                  </DialogTrigger>
                  <DialogContent className="max-w-5xl max-h-[90vh] overflow-auto">
                    <DialogHeader>
                      <DialogTitle>{title || "Diagram"}</DialogTitle>
                    </DialogHeader>
                    <div 
                      className="mermaid-fullscreen"
                      dangerouslySetInnerHTML={{ __html: svgContent }}
                    />
                  </DialogContent>
                </Dialog>
              </div>
            </div>
          )}
          {description && <CardDescription>{description}</CardDescription>}
        </CardHeader>
      )}
      <CardContent>
        {error ? (
          <Alert variant="destructive">
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        ) : isRendering ? (
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">
              Rendering diagram...
            </div>
          </div>
        ) : (
          <div
            ref={containerRef}
            className="mermaid-container overflow-x-auto"
            style={{ minHeight: "200px" }}
          />
        )}
      </CardContent>
    </Card>
  )
}

/**
 * MermaidCodeBlock Component
 * 
 * Extracts and renders Mermaid code from markdown code blocks
 */
interface MermaidCodeBlockProps {
  /** Markdown content that may contain ```mermaid blocks */
  markdown: string
  /** Optional title */
  title?: string
  /** Chart type */
  chartType?: string
}

export function MermaidCodeBlock({ markdown, title, chartType }: MermaidCodeBlockProps) {
  // Extract mermaid code from markdown code blocks
  const mermaidCodeMatch = markdown.match(/```mermaid\n([\s\S]*?)```/)
  const mermaidCode = mermaidCodeMatch ? mermaidCodeMatch[1].trim() : null

  if (!mermaidCode) {
    return (
      <Alert>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>
          No Mermaid diagram found in the response.
        </AlertDescription>
      </Alert>
    )
  }

  return (
    <MermaidRenderer 
      code={mermaidCode} 
      title={title}
      chartType={chartType}
    />
  )
}
