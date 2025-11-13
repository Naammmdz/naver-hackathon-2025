export function PrebuiltToolsSection() {
  return (
  <section id="prebuilt" className="tw-relative tw-mt-10 tw-flex tw-min-h-[100vh] tw-w-full tw-max-w-[100vw] tw-flex-col tw-place-items-center lg:tw-p-6">
    <div className="reveal-up tw-mt-[5%] tw-flex tw-h-full tw-w-full tw-place-content-center 
                  tw-gap-2 tw-p-4 max-lg:tw-max-w-full max-lg:tw-flex-col">
      <div className="tw-relative tw-flex tw-max-w-[30%] max-lg:tw-max-w-full tw-flex-col 
                      tw-place-items-start tw-gap-4  tw-p-2 max-lg:tw-place-items-center 
                      max-lg:tw-place-content-center max-lg:tw-w-full">
        <div className="tw-top-40 tw-flex tw-flex-col lg:tw-sticky tw-place-items-center tw-max-h-fit tw-max-w-[850px] max-lg:tw-max-h-fit max-lg:tw-max-w-[320px] tw-overflow-hidden">
          <h2 className="tw-text-5xl tw-font-serif tw-text-center tw-font-medium tw-leading-tight max-md:tw-text-3xl">
            Built-in Workspace Tools
          </h2>
          <a href="/app" className="btn !tw-mt-8 !tw-bg-transparent !tw-text-black dark:!tw-text-white 
                                          !tw-border-[1px] !tw-border-black 
                                          dark:!tw-border-white">
            Open App
          </a>
        </div>
      </div>
      <div className="tw-flex tw-flex-col tw-gap-10 tw-h-full tw-max-w-1/2 max-lg:tw-max-w-full tw-px-[10%]
                       max-lg:tw-px-4 max-lg:tw-gap-3 max-lg:tw-w-full lg:tw-top-[20%]
                       tw-place-items-center
                       ">   
        <div className="reveal-up tw-h-[240px] tw-w-[450px] max-md:tw-w-full">
          <a href="#" className="tw-flex tw-w-full tw-h-full tw-gap-8 tw-rounded-xl 
                              hover:tw-shadow-lg dark:tw-shadow-[#171717] tw-duration-300 tw-transition-all
                            tw-p-8 tw-group/card">
            <div className="tw-text-4xl max-md:tw-text-2xl tw-text-black dark:tw-text-white">
              <i className="bi bi-kanban-fill" />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h3 className="tw-text-2xl max-md:tw-text-xl">
                Kanban Task Boards
              </h3>
              <p className="tw-text-gray-800 dark:tw-text-gray-100 max-md:tw-text-sm">
                Organize and track your development tasks with intuitive Kanban boards. Drag and drop tasks between columns to manage your workflow efficiently.
              </p>
              <div className="tw-mt-auto tw-flex tw-gap-2 tw-underline tw-underline-offset-4 tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-up-right group-hover/card:tw--translate-y-1
                                          group-hover/card:tw-translate-x-1 tw-duration-300 tw-transition-transform" />
              </div>
            </div>
          </a>
        </div>
        <div className="reveal-up tw-h-[240px] tw-w-[450px] max-md:tw-w-full">
          <a href="#" className="tw-flex tw-w-full tw-h-full tw-gap-8 tw-rounded-xl
                           hover:tw-shadow-lg dark:tw-shadow-[#171717] tw-duration-300 tw-transition-all tw-p-8 tw-group/card">
            <div className="tw-text-4xl max-md:tw-text-2xl tw-text-black dark:tw-text-white">
              <i className="bi bi-file-earmark-text" />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h3 className="tw-text-2xl max-md:tw-text-xl">
                Collaborative Docs (BlockNote)
              </h3>
              <p className="tw-text-gray-800 dark:tw-text-gray-100 max-md:tw-text-sm">
                Rich text documentation with headings, lists, code blocks and more — all collaborative and synced in realtime (Yjs + Hocuspocus).
              </p>
              <div className="tw-mt-auto tw-flex tw-gap-2 tw-underline tw-underline-offset-4 tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-up-right group-hover/card:tw--translate-y-1
                                          group-hover/card:tw-translate-x-1 tw-duration-300 tw-transition-transform" />
              </div>
            </div>
          </a>
        </div>
        <div className="reveal-up tw-h-[240px] tw-w-[450px] max-md:tw-w-full">
          <a href="#" className="tw-flex tw-w-full tw-h-full tw-gap-8 tw-rounded-xl hover:tw-shadow-lg tw-duration-300 
                          tw-transition-all dark:tw-shadow-[#171717] tw-p-8 tw-group/card">
            <div className="tw-text-4xl max-md:tw-text-2xl tw-text-black dark:tw-text-white">
              <i className="bi bi-brush" />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h3 className="tw-text-2xl max-md:tw-text-xl">
                Collaborative Whiteboard (Excalidraw)
              </h3>
              <p className="tw-text-gray-800 dark:tw-text-gray-100 max-md:tw-text-sm">
                Sketch ideas together with live cursors. Preserve per-user toolbar/selection state for a smooth multi-user experience.
              </p>
              <div className="tw-mt-auto tw-flex tw-gap-2 tw-underline tw-underline-offset-4 tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-up-right group-hover/card:tw--translate-y-1
                                          group-hover/card:tw-translate-x-1 tw-duration-300 tw-transition-transform" />
              </div>
            </div>
          </a>
        </div>
        <div className="reveal-up tw-h-[240px] tw-w-[450px] max-md:tw-w-full">
          <a href="#" className="tw-flex tw-w-full dark:tw-shadow-[#171717] tw-h-full tw-gap-8 tw-rounded-xl  hover:tw-shadow-lg tw-duration-300 
                      tw-transition-all tw-p-8 tw-group/card">
            <div className="tw-text-4xl max-md:tw-text-2xl tw-text-black dark:tw-text-white">
              <i className="bi bi-collection-fill" />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h3 className="tw-text-2xl max-md:tw-text-xl">
                Unified Workspace
              </h3>
              <p className="tw-text-gray-800 dark:tw-text-gray-100 max-md:tw-text-sm">
                Bring together Tasks, Docs, and Boards in one place with realtime sync. No more context switching between tools.
              </p>
              <div className="tw-mt-auto tw-flex tw-gap-2 tw-underline tw-underline-offset-4 tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-up-right group-hover/card:tw--translate-y-1
                                          group-hover/card:tw-translate-x-1 tw-duration-300 tw-transition-transform" />
              </div>
            </div>
          </a>
        </div>
        <div className="reveal-up tw-h-[240px] tw-w-[450px] max-md:tw-w-full">
          <a href="#" className="tw-flex tw-w-full tw-h-full tw-gap-8 tw-rounded-xl dark:tw-shadow-[#171717] hover:tw-shadow-lg tw-duration-300 
                          tw-transition-all tw-p-8 tw-group/card">
            <div className="tw-text-4xl max-md:tw-text-2xl tw-text-black dark:tw-text-white">
              <i className="bi bi-graph-up" />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h3 className="tw-text-2xl max-md:tw-text-xl">
                Productivity Analytics
              </h3>
              <p className="tw-text-gray-800 dark:tw-text-gray-100 max-md:tw-text-sm">
                Track productivity across tasks and documents. Monitor completion trends and keep teams aligned.
              </p>
              <div className="tw-mt-auto tw-flex tw-gap-2 tw-underline tw-underline-offset-4 tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-up-right group-hover/card:tw--translate-y-1
                                          group-hover/card:tw-translate-x-1 tw-duration-300 tw-transition-transform" />
              </div>
            </div>
          </a>
        </div>
        <div className="reveal-up tw-h-[240px] tw-w-[450px] max-md:tw-w-full">
          <a href="#" className="tw-flex tw-w-full tw-h-full tw-gap-8 tw-rounded-xl 
                              hover:tw-shadow-lg dark:tw-shadow-[#171717] tw-duration-300 tw-transition-all tw-p-8 tw-group/card">
            <div className="tw-text-4xl max-md:tw-text-2xl tw-text-black dark:tw-text-white">
              <i className="bi bi-shield-lock-fill" />
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h3 className="tw-text-2xl max-md:tw-text-xl">
                Authentication & Workspaces (Clerk)
              </h3>
              <p className="tw-text-gray-800 dark:tw-text-gray-100 max-md:tw-text-sm">
                Secure sign-in and organization workspaces powered by Clerk. Invite teammates and collaborate instantly.
              </p>
              <div className="tw-mt-auto tw-flex tw-gap-2 tw-underline tw-underline-offset-4 tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-up-right group-hover/card:tw--translate-y-1
                                          group-hover/card:tw-translate-x-1 tw-duration-300 tw-transition-transform" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
  );
}
