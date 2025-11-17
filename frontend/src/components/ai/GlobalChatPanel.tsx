import { Send, Sparkles, X } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useTranslation } from "react-i18next";

import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

const panelWidthClass = "w-full sm:w-[24rem] lg:w-[26rem]";

export const GlobalChatPanel = () => {
  const { t } = useTranslation();

  const defaultMessages: ChatMessage[] = [
    {
      id: "assistant-welcome",
      role: "assistant",
      content: t('components.GlobalChatPanel.welcomeMessage'),
    },
  ];

  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState(defaultMessages);
  const [headerOffset, setHeaderOffset] = useState(0);

  const closePanel = useCallback(() => setOpen(false), []);

  const measureHeaderOffset = useCallback(() => {
    if (typeof document === "undefined") {
      return 0;
    }

    const header = document.querySelector<HTMLElement>("[data-app-header]");
    if (!header) {
      return 0;
    }

    const { bottom } = header.getBoundingClientRect();
    return Math.max(0, Math.round(bottom));
  }, []);

  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        closePanel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [open, closePanel]);

  const updateOffsets = useCallback(() => {
    const offset = measureHeaderOffset();
    setHeaderOffset(offset);
  }, [measureHeaderOffset]);

  const openPanel = useCallback(() => {
    setHeaderOffset(measureHeaderOffset());
    setOpen(true);
  }, [measureHeaderOffset]);

  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    updateOffsets();

    window.addEventListener("resize", updateOffsets);
    window.addEventListener("orientationchange", updateOffsets);

    return () => {
      window.removeEventListener("resize", updateOffsets);
      window.removeEventListener("orientationchange", updateOffsets);
    };
  }, [updateOffsets]);

  useEffect(() => {
    if (open) {
      updateOffsets();
    }
  }, [open, updateOffsets]);

  const canSend = useMemo(() => input.trim().length > 0, [input]);

  const handleSend = useCallback(
    (event: React.FormEvent<HTMLFormElement>) => {
      event.preventDefault();
      if (!canSend) {
        return;
      }

      const trimmed = input.trim();
      const timestamp = Date.now().toString();
      setMessages((prev) => [
        ...prev,
        { id: `user-${timestamp}`, role: "user", content: trimmed },
        {
          id: `assistant-${timestamp}`,
          role: "assistant",
          content: t('components.GlobalChatPanel.defaultResponse'),
        },
      ]);
      setInput("");
    },
    [canSend, input],
  );

  const overlayStyle = useMemo(() => {
    if (headerOffset === 0) {
      return undefined;
    }

    return {
      top: headerOffset,
      height: `calc(100% - ${headerOffset}px)`,
    };
  }, [headerOffset]);

  const panelStyle = useMemo(() => {
    if (headerOffset === 0) {
      return undefined;
    }

    return {
      top: headerOffset,
      height: `calc(100% - ${headerOffset}px)`,
      maxHeight: `calc(100% - ${headerOffset}px)`,
    } as const;
  }, [headerOffset]);

  return (
    <>
      {open ? (
        <div
          aria-hidden="true"
          className="fixed inset-0 z-[70] bg-black/30 backdrop-blur-[1px]"
          style={overlayStyle}
          onClick={closePanel}
        />
      ) : (
        <button
          aria-controls="global-ai-chat-panel"
          aria-expanded={open}
          onClick={openPanel}
          className={cn(
            "fixed right-0 top-1/2 z-[80] flex -translate-y-1/2 translate-x-[calc(100%-1.5rem)] items-center justify-center rounded-l-lg border border-r-0 border-primary bg-primary px-2 py-3 text-xs font-semibold uppercase tracking-wide text-primary-foreground shadow-lg transition hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-primary",
            "sm:translate-x-[calc(100%-2rem)]",
          )}
          style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}
        >
          {t('components.GlobalChatPanel.buttonText')}
        </button>
      )}

      <aside
        aria-label={t('components.GlobalChatPanel.panelAriaLabel')}
        id="global-ai-chat-panel"
        className={cn(
          "fixed right-0 top-0 z-[90] flex h-full max-h-screen flex-col border-l bg-background text-foreground shadow-2xl transition-transform duration-300 ease-in-out",
          panelWidthClass,
          open ? "translate-x-0" : "translate-x-full",
        )}
        style={panelStyle}
      >
        <header className="flex items-center justify-between border-b px-5 py-4">
          <div className="flex items-center gap-2">
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-primary/10 text-primary">
              <Sparkles className="h-5 w-5" />
            </span>
            <div>
              <p className="font-semibold leading-tight">{t('components.GlobalChatPanel.headerTitle')}</p>
              <p className="text-sm text-muted-foreground">{t('components.GlobalChatPanel.headerSubtitle')}</p>
            </div>
          </div>
          <Button
            aria-label={t('components.GlobalChatPanel.closeButtonAria')}
            onClick={closePanel}
            size="icon"
            variant="ghost"
          >
            <X className="h-4 w-4" />
          </Button>
        </header>

        <ScrollArea className="flex-1 px-5 py-4">
          <div className="space-y-4">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "flex gap-3 text-sm",
                  message.role === "assistant" ? "justify-start" : "justify-end",
                )}
              >
                {message.role === "assistant" && (
                  <img 
                    src="/assets/images/ai-avatar.png" 
                    alt={t('components.GlobalChatPanel.aiAvatarAlt')} 
                    className="mt-1 h-10 w-10 flex-shrink-0 rounded-full object-cover"
                  />
                )}
                <p
                  className={cn(
                    "max-w-[80%] rounded-xl px-4 py-2",
                    message.role === "assistant"
                      ? "bg-muted text-foreground"
                      : "bg-primary text-primary-foreground",
                  )}
                >
                  {message.content}
                </p>
              </div>
            ))}
          </div>
        </ScrollArea>

        <form className="border-t px-5 py-4" onSubmit={handleSend}>
          <label className="sr-only" htmlFor="global-ai-chat-input">
            {t('components.GlobalChatPanel.inputLabel')}
          </label>
          <div className="flex items-center gap-2 rounded-full border border-muted bg-muted/40 px-2.5 py-1.5 shadow-inner">
            <Button
              type="button"
              size="icon"
              variant="ghost"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full border border-dashed border-muted-foreground/40 bg-background/70 text-muted-foreground transition hover:border-primary hover:bg-primary/10 hover:text-primary"
            >
              <span className="text-lg font-semibold leading-none">+</span>
              <span className="sr-only">{t('components.GlobalChatPanel.attachButtonSr')}</span>
            </Button>
            <Textarea
              id="global-ai-chat-input"
              placeholder={t('components.GlobalChatPanel.placeholder')}
              value={input}
              onChange={(event) => setInput(event.target.value)}
              className="flex-1 h-10 min-h-0 resize-none rounded-full border-0 bg-transparent px-3 py-2 text-sm leading-[1.4] shadow-none focus-visible:ring-0 focus-visible:ring-offset-0"
            />
            <Button
              disabled={!canSend}
              type="submit"
              size="icon"
              className="h-10 w-10 flex-shrink-0 rounded-full shadow-md transition hover:shadow-lg"
            >
              <Send className="h-4 w-4" />
              <span className="sr-only">{t('components.GlobalChatPanel.sendButtonSr')}</span>
            </Button>
          </div>
        </form>
      </aside>
    </>
  );
};

export default GlobalChatPanel;
