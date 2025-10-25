import { MessageSquarePlus, X } from 'lucide-react'
import { FormEventHandler, useCallback, useRef } from 'react'
import { useValue } from 'tldraw'
import { convertTldrawShapeToSimpleShape } from '../../shared/format/convertTldrawShapeToSimpleShape'
import { TldrawAgent } from '../agent/TldrawAgent'
import { Button } from '../ui/button'
import { Card, CardContent, CardHeader } from '../ui/card'
import { ChatHistory } from './chat-history/ChatHistory'
import { ChatInput } from './ChatInput'
import { TodoList } from './TodoList'

export function ChatPanel({ agent, onClose }: { agent: TldrawAgent; onClose?: () => void }) {
	const { editor } = agent
	const inputRef = useRef<HTMLTextAreaElement>(null)
	const modelName = useValue(agent.$modelName)

	const handleSubmit = useCallback<FormEventHandler<HTMLFormElement>>(
		async (e) => {
			e.preventDefault()
			if (!inputRef.current) return
			const formData = new FormData(e.currentTarget)
			const value = formData.get('input') as string

			// If the user's message is empty, just cancel the current request (if there is one)
			if (value === '') {
				agent.cancel()
				return
			}

			// If every todo is done, clear the todo list
			const todosRemaining = agent.$todoList.get().filter((item) => item.status !== 'done')
			if (todosRemaining.length === 0) {
				agent.$todoList.set([])
			}

			// Grab the user query and clear the chat input
			const message = value
			const contextItems = agent.$contextItems.get()
			agent.$contextItems.set([])
			inputRef.current.value = ''

			// Prompt the agent
			const selectedShapes = editor
				.getSelectedShapes()
				.map((shape) => convertTldrawShapeToSimpleShape(editor, shape))

			await agent.prompt({
				message,
				contextItems,
				bounds: editor.getViewportPageBounds(),
				modelName,
				selectedShapes,
				type: 'user',
			})
		},
		[agent, modelName, editor]
	)

	function handleNewChat() {
		agent.reset()
	}

	function NewChatButton() {
		return (
			<Button
				variant="ghost"
				size="icon"
				onClick={handleNewChat}
				className="h-8 w-8"
				title="New Chat"
			>
				<MessageSquarePlus className="h-4 w-4" />
			</Button>
		)
	}

	function CloseButton() {
		return (
			<Button
				variant="ghost"
				size="icon"
				onClick={onClose}
				className="h-8 w-8"
				title="Close Chat"
			>
				<X className="h-4 w-4" />
			</Button>
		)
	}

	return (
		<Card className="chat-panel w-[400px] h-[600px] flex flex-col shadow-2xl border-2">
			<CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
				<div className="flex items-center gap-2">
					<div className="w-2 h-2 bg-primary rounded-full"></div>
					<h3 className="text-lg font-semibold text-foreground">AI Assistant</h3>
				</div>
				<div className="flex items-center gap-1">
					<NewChatButton />
					{onClose && <CloseButton />}
				</div>
			</CardHeader>
			<CardContent className="flex-1 flex flex-col p-0 overflow-hidden">
				<div className="flex-1 overflow-hidden">
					<ChatHistory agent={agent} />
				</div>
				<div className="border-t bg-muted/30 p-4">
					<TodoList agent={agent} />
					<ChatInput agent={agent} handleSubmit={handleSubmit} inputRef={inputRef} />
				</div>
			</CardContent>
		</Card>
	)
}
