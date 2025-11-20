export function BenefitsSection() {
  return (
  <section id="benefits" className="tw-relative tw-flex tw-max-w-[100vw] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden">   
    <div className="tw-mt-8 tw-flex tw-flex-col tw-w-full tw-h-full tw-place-items-center tw-gap-5">
      <div className="reveal-up tw-mt-5 tw-flex tw-flex-col tw-gap-3 tw-text-center">
        <h2 className="tw-text-6xl tw-font-medium max-md:tw-text-3xl tw-leading-tight">
          Experience the <span className="tw-text-black dark:tw-text-white">benefits</span> of realtime collaboration
        </h2>
      </div>
      <div className="tw-mt-6 tw-flex tw-flex-col tw-max-w-[1150px] max-lg:tw-max-w-full tw-h-full 
                      tw-p-4 max-lg:tw-place-content-center tw-gap-8 ">   
        <div className="max-xl:tw-flex max-xl:tw-flex-col tw-place-items-center tw-grid tw-grid-cols-3 tw-gap-8 
                          tw-place-content-center tw-auto-rows-auto">
          <div className="reveal-up tw-w-[350px] tw-h-[540px] tw-flex max-md:tw-w-full">
            <a href="#" className=" tw-relative tw-p-10 tw-transition-all tw-duration-300 tw-group/card  tw-gap-5 tw-flex 
                          tw-flex-col tw-w-full tw-h-full  tw-bg-[#f6f7fb] dark:tw-bg-[#171717] tw-rounded-3xl 
                          hover:tw-scale-[1.02]">
              <div className="tw-overflow-hidden tw-w-full tw-min-h-[180px] tw-h-[180px]">
                <img src="/assets/images/home/api.png" className="tw-w-full tw-object-contain tw-h-auto" alt="unified interface" />
                {/* <i class="bi bi-grid-1x2-fill"></i> */}
              </div>
              <h2 className="tw-text-3xl max-md:tw-text-2xl tw-font-medium">Unified Workspace</h2>
              <p className="tw-text-base tw-leading-normal tw-text-gray-800 dark:tw-text-gray-200">
                DevHolic brings Tasks, Documents, and Boards together with realtime sync (Yjs). No more switching tools — stay focused in one place.
              </p>
              <div className="tw-flex tw-items-center tw-gap-2 tw-mt-auto tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-right tw-transform tw-transition-transform tw-duration-300 group-hover/card:tw-translate-x-2" />
              </div>
            </a>
          </div>
          <div className="reveal-up tw-w-[350px] tw-h-[540px] tw-flex max-md:tw-w-full">
            <a href="#" className=" tw-relative tw-p-10 tw-transition-all tw-duration-300 tw-group/card  tw-gap-5 tw-flex 
                          tw-flex-col tw-w-full tw-h-full  tw-bg-[#f6f7fb] dark:tw-bg-[#171717] tw-rounded-3xl 
                          hover:tw-scale-[1.02]">
              <div className="tw-w-full tw-min-h-[180px] tw-h-[180px] tw-overflow-hidden">
                <img src="/assets/images/home/api.png" alt="API" className="tw-w-full tw-h-auto tw-object-contain" />
                {/* <i class="bi bi-grid-1x2-fill"></i> */}
              </div>
              <h2 className="tw-text-3xl max-md:tw-text-2xl tw-font-medium">Collaborative Docs</h2>
              <p className="tw-leading-normal tw-text-gray-800 dark:tw-text-gray-200">
                BlockNote-based rich text editor with live collaboration. Write docs together with headings, checklists, code blocks and more.
              </p>
              <div className="tw-flex tw-items-center tw-gap-2 tw-mt-auto tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-right tw-transform tw-transition-transform tw-duration-300 group-hover/card:tw-translate-x-2" />
              </div>
            </a>
          </div>
          <div className="reveal-up tw-w-[350px] tw-h-[540px] tw-flex max-md:tw-w-full">
            <a href="#" className=" tw-relative tw-p-10 tw-transition-all tw-duration-300 tw-group/card  tw-gap-5 tw-flex 
                          tw-flex-col tw-w-full tw-h-full  tw-bg-[#f6f7fb] dark:tw-bg-[#171717] tw-rounded-3xl 
                          hover:tw-scale-[1.02]">
              <div className="tw-w-full tw-flex tw-place-contet-center tw-min-h-[180px] tw-h-[180px] tw-rounded-xl tw-overflow-hidden">
                <img src="/assets/images/home/integrations1.png" className="tw-w-full tw-h-auto tw-object-contain" alt="Prebuilt integrations" />
              </div>
              <h2 className="tw-text-3xl max-md:tw-text-2xl tw-font-medium">Kanban Task Tracking</h2>
              <p className="tw-leading-normal tw-text-gray-800 dark:tw-text-gray-200">
                Track progress with Kanban, list, and calendar views. Organize tasks, set priorities, and monitor status with ease.
              </p>
              <div className="tw-flex tw-items-center tw-gap-2 tw-mt-auto tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-right tw-transform tw-transition-transform tw-duration-300 group-hover/card:tw-translate-x-2" />
              </div>
            </a>
          </div>
        </div>
        <div className="reveal-up tw-w-full md:tw-h-[350px] max-md:tw-min-h-[350px] tw-flex">
          <a href="#" className=" tw-relative tw-p-10 tw-transition-all tw-duration-300 tw-group/card  tw-gap-5 tw-flex 
                      max-md:tw-flex-col tw-w-full tw-h-full  tw-bg-[#f6f7fb] dark:tw-bg-[#171717] tw-rounded-3xl 
                      hover:tw-scale-[1.02]">
            <div className="tw-text-6xl tw-overflow-hidden tw-rounded-xl tw-w-full tw-h-full max-md:tw-h-[180px]">
              <img src="/assets/images/home/ai-models.png" className="tw-w-full tw-object-contain tw-h-full" alt="AI models" />
              {/* <i class="bi bi-grid-1x2-fill"></i> */}
            </div>
            <div className="tw-flex tw-flex-col tw-gap-4">
              <h2 className="tw-text-3xl max-md:tw-text-2xl tw-font-medium">Realtime Whiteboard</h2>
              <p className="tw-leading-normal tw-text-gray-800 dark:tw-text-gray-200">
                Excalidraw-based boards with live cursors. Sketch ideas collaboratively while each user keeps their own toolbar state.
              </p>
              <div className="tw-flex tw-items-center tw-gap-2 tw-mt-auto tw-text-black dark:tw-text-white tw-font-medium">
                <span>Learn more</span>
                <i className="bi bi-arrow-right tw-transform tw-transition-transform tw-duration-300 group-hover/card:tw-translate-x-2" />
              </div>
            </div>
          </a>
        </div>
      </div>
    </div>
  </section>
  );
}
