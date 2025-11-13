import "@blocknote/mantine/style.css";
import { useCreateBlockNote } from "@blocknote/react";
import { useEffect, useState } from "react";

export function HeroSection() {
  const [theme, setTheme] = useState<"light" | "dark">("light");

  useEffect(() => {
    const updateTheme = () => {
      const isDark = document.documentElement.classList.contains('dark');
      setTheme(isDark ? 'dark' : 'light');
    };

    // Initial check
    updateTheme();

    // Listen for theme changes
    const observer = new MutationObserver(updateTheme);
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class']
    });

    return () => observer.disconnect();
  }, []);

  const editor = useCreateBlockNote({
    initialContent: [
      {
        type: "heading",
        props: { level: 1 },
        content: "Welcome to DevFlow",
      },
      {
        type: "paragraph",
        content: "DevFlow is a collaborative workspace for Tasks, Documents, and Boards with realtime sync powered by Yjs.",
      },
      {
        type: "heading",
        props: { level: 2 },
        content: "Key Features",
      },
      {
        type: "bulletListItem",
        content: "📝 Documents: BlockNote editor with realtime collaboration (Yjs + Hocuspocus)",
      },
      {
        type: "bulletListItem",
        content: "✅ Tasks: Plan and track work across list/board/calendar views",
      },
      {
        type: "bulletListItem",
        content: "🧩 Boards: Excalidraw whiteboard with live cursors (Yjs Awareness)",
      },
      {
        type: "bulletListItem",
        content: "🔐 Auth: Clerk-based authentication and org workspaces",
      },
      {
        type: "heading",
        props: { level: 2 },
        content: "Quick Start",
      },
      {
        type: "paragraph",
        content: "Create your first task or document. Use the toolbar to format text, add code blocks, or sketch on the board.",
      },
      {
        type: "codeBlock",
        content: `// Example: First steps
- [ ] Create a task in Tasks
- [ ] Draft a document in Docs
- [ ] Sketch ideas on Boards
- [ ] Invite your team (Teams coming soon)`,
      },
    ],
  });

  return (
  <section className="hero-section tw-relative tw-flex tw-min-h-[100vh] tw-w-full tw-max-w-[100vw] tw-flex-col tw-overflow-hidden" id="hero-section">
    {/* video container */}
    <div className="tw-fixed tw-bg-[#000000af] dark:tw-bg-[#80808085] tw-top-0 tw-left-1/2 tw--translate-x-1/2 tw-z-20 tw-transition-opacity
          tw-duration-300 tw-scale-0 tw-opacity-0 tw-p-2
          tw-w-full tw-h-full tw-flex tw-place-content-center tw-place-items-center" id="video-container-bg">
      <div className="tw-max-w-[80vw] max-lg:tw-max-w-full max-lg:tw-w-full tw-scale-0 tw-transition-transform tw-duration-500 tw-p-6 tw-rounded-xl  max-lg:tw-px-2 tw-w-full tw-gap-2 tw-shadow-md 
                      tw-h-[90vh] max-lg:tw-h-auto max-lg:tw-min-h-[400px] tw-bg-white dark:tw-bg-[#16171A] tw-max-h-full
                      " id="video-container">
        <div className="tw-w-full tw-flex">
          <button type="button" onClick={() => window.closeVideo?.()} className="tw-ml-auto tw-text-xl" title="close">
            <i className="bi bi-x-circle-fill" />
          </button>
        </div>
        <div className="tw-flex tw-w-full  tw-rounded-xl tw-px-[5%] max-md:tw-px-2 tw-min-h-[300px] tw-max-h-[90%] tw-h-full">
          <div className="tw-relative tw-bg-black tw-min-w-full tw-min-h-full tw-overflow-clip tw-rounded-md">
            {/* add your youtube video link here */}
            <iframe className="tw-absolute tw-top-[50%] tw--translate-y-[50%] tw-left-[50%] tw--translate-x-[50%] tw-w-full tw-h-full" src="https://www.youtube.com/embed/6j4fPVkA3EA?si=llcTrXPRM-MRXDZB&controls=0&rel=0&showinfo=0&autoplay=1&loop=1&mute=1" title="YouTube video player" frameBorder={0} allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" referrerPolicy="strict-origin-when-cross-origin" allowFullScreen />
          </div>
        </div>
      </div>  
    </div>
    <div className="hero-bg-gradient tw-relative tw-flex tw-h-full tw-min-h-[100vh] tw-w-full tw-flex-col tw-place-content-center tw-gap-6 tw-p-[5%] max-xl:tw-place-items-center max-lg:tw-p-4">
      <div className="purple-bg-grad  reveal-up tw-absolute tw-left-1/2 tw--translate-1/2 tw-top-[10%] tw-h-[120px] tw-w-[120px]" /> 
      <div className="tw-flex tw-flex-col tw-min-h-[60vh] tw-place-content-center tw-items-center">
        <h2 className="reveal-up tw-text-center tw-text-7xl tw-font-semibold tw-uppercase tw-leading-tight max-lg:tw-text-4xl max-md:tw-leading-snug">
          <span> Stay in flow </span>
          <br />
          <span className="tw-font-thin tw-font-serif tw-text-black dark:tw-text-white"> with DevFlow </span>
        </h2>
        <div className="reveal-up tw-mt-8 tw-max-w-[450px] tw-text-lg max-lg:tw-text-base tw-p-2 tw-text-center
                   tw-text-gray-800 dark:tw-text-white max-lg:tw-max-w-full">
          Plan tasks, write documents, and sketch boards — all in one place with realtime collaboration.
        </div>
        <div className="reveal-up tw-mt-10 max-md:tw-flex-col tw-flex tw-place-items-center tw-gap-4">
          <button onClick={() => window.openVideo?.()} className="btn !tw-w-[170px] max-lg:!tw-w-[160px] !tw-rounded-xl !tw-py-4 max-lg:!tw-py-2 tw-flex tw-gap-2 tw-group !tw-bg-transparent !tw-text-black dark:!tw-text-white tw-transition-colors 
                                  tw-duration-[0.3s] tw-border-[1px] tw-border-black dark:tw-border-white hover:!tw-bg-neutral-200 dark:hover:!tw-bg-neutral-900">
            <div className="tw-relative tw-flex tw-place-items-center tw-place-content-center tw-w-6 tw-h-6">
              <div className="tw-absolute tw-inset-0 tw-top-0 tw-left-0 tw-scale-0 tw-duration-300 group-hover:tw-scale-100 tw-border-2
                                       tw-border-black dark:tw-border-white tw-rounded-full tw-w-full tw-h-full" />
              <span className="bi bi-play-circle-fill" />
            </div>
            <span>Watch video</span>
          </button>
          <a className="btn tw-group max-lg:!tw-w-[160px] tw-flex tw-gap-2 tw-shadow-lg !tw-w-[170px] !tw-rounded-xl !tw-py-4 max-lg:!tw-py-2 tw-transition-transform tw-duration-[0.3s] hover:tw-scale-x-[1.03]" href="/app">
            <span>Get started</span>
            <i className="bi bi-arrow-right group-hover:tw-translate-x-1 tw-duration-300" />
          </a>
        </div>
      </div>
      {/* BlockNote Editor Demo - Temporarily commented */}
      {/*
      <div className="reveal-up tw-relative tw-mt-8 tw-flex tw-w-full tw-place-content-center tw-place-items-center" id="editor-container">
        <div className="rainbow-border tw-max-w-[90%] lg:tw-w-[1000px] tw-shadow-2xl tw-overflow-hidden" id="editor-demo">
          <div className="tw-p-6 tw-h-[500px] tw-overflow-auto">
            <BlockNoteView editor={editor} theme={theme} />
          </div>
        </div>
      </div>
      */}

      {/* Video Demo */}
      <div className="reveal-up tw-relative tw-mt-8 tw-flex tw-w-full tw-place-content-center tw-place-items-center" id="video-demo-container">
        <div className="rainbow-border tw-max-w-[90%] lg:tw-w-[1000px] tw-shadow-2xl tw-overflow-hidden">
          <video
            className="tw-w-full tw-aspect-video tw-object-cover tw-rounded-[10px]"
            controls
            autoPlay
            muted
            loop
            src="/devflow-intro.mp4"
          >
            Your browser does not support the video tag.
          </video>
        </div>
      </div>
    </div>
  </section>
);
}
