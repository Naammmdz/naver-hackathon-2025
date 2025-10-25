import { Loader2, Send, Square } from 'lucide-react'
import { FormEventHandler, useState } from 'react'
import { Editor, useValue } from 'tldraw'
import { AGENT_MODEL_DEFINITIONS, AgentModelName } from '../../worker/models'
import { TldrawAgent } from '../agent/TldrawAgent'
import { Button } from '../ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select'
import { Textarea } from '../ui/textarea'
import { ContextItemTag } from './ContextItemTag'
import { AtIcon } from './icons/AtIcon'
import { BrainIcon } from './icons/BrainIcon'
import { SelectionTag } from './SelectionTag'

export function ChatInput({
	agent,
	handleSubmit,
	inputRef,
}: {
	agent: TldrawAgent
	handleSubmit: FormEventHandler<HTMLFormElement>
	inputRef: React.RefObject<HTMLTextAreaElement>
}) {
	const { editor } = agent
	const [inputValue, setInputValue] = useState('')
	const isGenerating = useValue('isGenerating', () => agent.isGenerating(), [agent])

	const isContextToolActive = useValue(
		'isContextToolActive',
		() => {
			const tool = editor.getCurrentTool()
			return tool.id === 'target-shape' || tool.id === 'target-area'
		},
		[editor]
	)

	const selectedShapes = useValue('selectedShapes', () => editor.getSelectedShapes(), [editor])
	const contextItems = useValue(agent.$contextItems)
	const modelName = useValue(agent.$modelName)

	return (
		<div className="space-y-3">
			{/* Context Tags */}
			<div className="flex flex-wrap gap-2">
				<div className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm border transition-colors ${
					isContextToolActive 
						? 'bg-primary/10 border-primary text-primary' 
						: 'bg-muted border-border text-muted-foreground hover:bg-muted/80'
				}`}>
					<AtIcon />
					<span>Add Context</span>
					<Select onValueChange={(value) => {
						const action = ADD_CONTEXT_ACTIONS.find((action) => action.name === value)
						if (action) action.onSelect(editor)
					}}>
						<SelectTrigger className="w-auto border-0 bg-transparent p-0 h-auto">
							<SelectValue placeholder=" " />
						</SelectTrigger>
						<SelectContent>
							{ADD_CONTEXT_ACTIONS.filter(action => action.name !== ' ').map((action) => (
								<SelectItem key={action.name} value={action.name}>
									{action.name}
								</SelectItem>
							))}
						</SelectContent>
					</Select>
				</div>
				{selectedShapes.length > 0 && <SelectionTag onClick={() => editor.selectNone()} />}
				{contextItems.map((item, i) => (
					<ContextItemTag
						editor={editor}
						onClick={() => agent.removeFromContext(item)}
						key={'context-item-' + i}
						item={item}
					/>
				))}
			</div>

			{/* Input Form */}
			<form
				onSubmit={(e) => {
					e.preventDefault()
					setInputValue('')
					handleSubmit(e)
				}}
				className="flex gap-2"
			>
				<div className="flex-1 space-y-2">
					<Textarea
						ref={inputRef}
						name="input"
						autoComplete="off"
						placeholder="Ask, learn, brainstorm, draw..."
						value={inputValue}
						onChange={(e) => setInputValue(e.currentTarget.value)}
						onKeyDown={(e) => {
							if (e.key === 'Enter' && !e.shiftKey) {
								e.preventDefault()
								const form = e.currentTarget.closest('form')
								if (form) {
									const submitEvent = new Event('submit', { bubbles: true, cancelable: true })
									form.dispatchEvent(submitEvent)
								}
							}
						}}
						className="min-h-[60px] max-h-[120px] resize-none"
					/>

					{/* Model Selector */}
					<div className="flex items-center justify-between">
						<Select value={modelName} onValueChange={(value) => agent.$modelName.set(value as AgentModelName)}>
							<SelectTrigger className="w-auto gap-2">
								<BrainIcon />
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{Object.values(AGENT_MODEL_DEFINITIONS).map((model) => (
									<SelectItem key={model.name} value={model.name}>
										{model.name}
									</SelectItem>
								))}
							</SelectContent>
						</Select>

						<Button 
							type="submit" 
							size="sm"
							disabled={inputValue === '' && !isGenerating}
							className="gap-2"
						>
							{isGenerating && inputValue === '' ? (
								<>
									<Square className="h-4 w-4" />
									Stop
								</>
							) : isGenerating ? (
								<>
									<Loader2 className="h-4 w-4 animate-spin" />
									Sending...
								</>
							) : (
								<>
									<Send className="h-4 w-4" />
									Send
								</>
							)}
						</Button>
					</div>
				</div>
			</form>
		</div>
	)
}

const ADD_CONTEXT_ACTIONS = [
	{
		name: 'Pick Shapes',
		onSelect: (editor: Editor) => {
			editor.setCurrentTool('target-shape')
			editor.focus()
		},
	},
	{
		name: 'Pick Area',
		onSelect: (editor: Editor) => {
			editor.setCurrentTool('target-area')
			editor.focus()
		},
	},
	{
		name: ' ',
		onSelect: (editor: Editor) => {
			const currentTool = editor.getCurrentTool()
			if (currentTool.id === 'target-area' || currentTool.id === 'target-shape') {
				editor.setCurrentTool('select')
			}
		},
	},
]
