export function BuildAppsSection() {
  return (
  <section className="tw-relative tw-flex  tw-w-full tw-min-h-[100vh] max-lg:tw-min-h-[80vh] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden" id="solutions">   
    <div className="tw-w-full  tw-place-content-center tw-items-center 
                  tw-flex tw-flex-col tw-max-w-[900px] tw-gap-4 tw-p-4">
      <div className="purple-bg-grad  reveal-up tw-absolute tw-right-[20%] tw-top-[20%] tw-h-[200px] tw-w-[200px]" />
      <h2 className="reveal-up tw-text-6xl max-lg:tw-text-4xl tw-text-center tw-leading-tight tw-uppercase">
        <span className="tw-font-semibold">Streamline Your Development</span>
        <br />
        <span className="tw-font-serif">Workflow</span>
      </h2>
      <p className="reveal-up tw-mt-8 tw-max-w-[650px] tw-text-gray-900 dark:tw-text-gray-200 tw-text-center max-md:tw-text-sm">   
        DevFlow brings together everything you need to stay productive: task management, documentation, and version control. 
        Experience seamless integration that keeps you focused and in the flow.
      </p>
      <div className="reveal-up tw-flex tw-mt-8">
        <a href="#" target="_blank" rel="noopener" className="tw-shadow-md hover:tw-shadow-xl dark:tw-shadow-gray-800 tw-transition-all tw-duration-300 
                                  tw-border-[1px] tw-p-3 tw-px-4 tw-border-black dark:tw-border-white tw-rounded-md tw-text-black dark:tw-text-white hover:tw-bg-neutral-100 dark:hover:tw-bg-neutral-900">
          Get Started
        </a>
      </div>
    </div>
  </section>
  );
}
