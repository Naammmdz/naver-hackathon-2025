import { useTranslation } from 'react-i18next'

export function ChatPanelFallback() {
	const { t } = useTranslation()
	return (
		<div className="chat-fallback">
			<p>{t('components.ChatPanelFallback.errorLoadingChatHistory')}</p>
			<button
				onClick={() => {
					localStorage.clear()
					window.location.reload()
				}}
			>
				{t('components.ChatPanelFallback.clearChatHistory')}
			</button>
		</div>
	)
}
