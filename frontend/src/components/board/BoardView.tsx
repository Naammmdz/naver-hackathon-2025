import { useEffect, useMemo, useState } from 'react'
import {
    DefaultSizeStyle,
    ErrorBoundary,
    TLComponents,
    Tldraw,
    TldrawUiToastsProvider,
    TLUiOverrides,
    useEditor,
} from 'tldraw'
import { TldrawAgent } from '../../agent/TldrawAgent'
import { useTldrawAgent } from '../../agent/useTldrawAgent'
import { enableLinedFillStyle } from '../../enableLinedFillStyle'
import { TargetAreaTool } from '../../tools/TargetAreaTool'
import { TargetShapeTool } from '../../tools/TargetShapeTool'
import { ChatPanel } from './ChatPanel'
import { ChatPanelFallback } from './ChatPanelFallback'
import { CustomHelperButtons } from './CustomHelperButtons'
import { AgentViewportBoundsHighlight } from './highlights/AgentViewportBoundsHighlights'
import { ContextHighlights } from './highlights/ContextHighlights'

/**
 * The ID used for this project's agent.
 * If you want to support multiple agents, you can use a different ID for each agent.
 */
export const AGENT_ID = 'agent-starter'

// Customize tldraw's styles to play to the agent's strengths
DefaultSizeStyle.setDefaultValue('s')
enableLinedFillStyle()

// Custom tools for picking context items
const tools = [TargetShapeTool, TargetAreaTool]
const overrides: TLUiOverrides = {
	tools: (editor, tools) => {
		return {
			...tools,
			'target-area': {
				id: 'target-area',
				label: 'Pick Area',
				kbd: 'c',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target-area')
				},
			},
			'target-shape': {
				id: 'target-shape',
				label: 'Pick Shape',
				kbd: 's',
				icon: 'tool-frame',
				onSelect() {
					editor.setCurrentTool('target-shape')
				},
			},
		}
	},
}

function BoardViewContent() {
	const [agent, setAgent] = useState<TldrawAgent | undefined>()
	const [sidebarHidden, setSidebarHidden] = useState(false)

	// Custom components to visualize what the agent is doing
	const components: TLComponents = useMemo(() => {
		return {
			HelperButtons: () => agent && <CustomHelperButtons agent={agent} />,
			InFrontOfTheCanvas: () => (
				<>
					{agent && <AgentViewportBoundsHighlight agent={agent} />}
					{agent && <ContextHighlights agent={agent} />}
				</>
			),
		}
	}, [agent])

	return (
		<TldrawUiToastsProvider>
			<div className={`tldraw-agent-container ${sidebarHidden ? 'sidebar-hidden' : ''}`}>
				{sidebarHidden && (
					<button
						onClick={() => setSidebarHidden(false)}
						className="absolute bottom-4 right-4 z-[1001] bg-blue-600 hover:bg-blue-700 text-white rounded-full w-12 h-12 flex items-center justify-center shadow-lg transition-colors"
						title="Open Chat"
					>
						💬
					</button>
				)}
				<div className="tldraw-canvas">
					<Tldraw
						persistenceKey="tldraw-agent-demo"
						tools={tools}
						overrides={overrides}
						components={components}
					>
						<AppInner setAgent={setAgent} />
					</Tldraw>
				</div>
				<ErrorBoundary fallback={ChatPanelFallback}>
					{agent && !sidebarHidden && <ChatPanel agent={agent} onClose={() => setSidebarHidden(true)} />}
				</ErrorBoundary>
			</div>
		</TldrawUiToastsProvider>
	)
}

function AppInner({ setAgent }: { setAgent: (agent: TldrawAgent) => void }) {
	const editor = useEditor()
	const agent = useTldrawAgent(editor, AGENT_ID)

	useEffect(() => {
		if (!editor || !agent) return
		setAgent(agent)
		;(window as any).editor = editor
		;(window as any).agent = agent
	}, [agent, editor, setAgent])

	return null
}

export function BoardView() {
	return <BoardViewContent />
}