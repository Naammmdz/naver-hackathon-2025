export function AdditionalFeaturesSection() {
  return (
  <section className="tw-relative tw-flex  tw-w-full tw-min-h-[110vh] max-md:tw-min-h-[80vh] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden">   
    <div className="tw-w-full max-lg:tw-max-w-full tw-place-content-center tw-items-center 
                  tw-flex tw-flex-col tw-max-w-[80%] tw-gap-4 tw-p-4">
      <h3 className="reveal-up tw-text-5xl tw-font-medium max-md:tw-text-3xl tw-text-center tw-leading-normal">
        Additional Features
      </h3>
      {/* <p class="reveal-up tw-mt-3 tw-max-w-[600px] tw-text-center ">
          </p> */}
      <div className="tw-mt-8 tw-relative tw-gap-10 tw-p-4 tw-grid tw-place-items-center tw-grid-cols-3 max-lg:tw-flex max-lg:tw-flex-col">
        <div className="reveal-up  tw-w-[350px] tw-border-[1px] tw-h-[400px] tw-rounded-md tw-place-items-center tw-p-4
                           tw-bg-[#f2f3f4] max-md:tw-w-[320px] dark:tw-bg-[#141414] dark:tw-border-[#1f2123] tw-flex tw-flex-col tw-gap-3">
          <div className="tw-w-full tw-h-[250px]
                              tw-p-4
                              tw-rounded-xl 
                               tw-backdrop-blur-2xl
                               tw-overflow-hidden tw-flex tw-place-content-center">
            <img src="/assets/images/home/prompts2.png" alt="Prompt library" className="tw-w-auto tw-h-full tw-object-contain" />
          </div>
          <h3 className="tw-text-2xl">
            Custom Templates
          </h3>
          <p className="tw-text-gray-700 dark:tw-text-gray-300 tw-px-4 tw-text-center tw-text-sm">
            Use pre-built templates for common development workflows. Create project structures, documentation templates, and task boards instantly.
          </p>
        </div>
        <div className="reveal-up tw-w-[350px] max-md:tw-w-[320px] tw-border-[1px] tw-h-[400px] tw-rounded-md tw-place-items-center tw-p-4
                           tw-bg-[#f2f3f4] dark:tw-bg-[#141414] dark:tw-border-[#1f2123] tw-flex tw-flex-col tw-gap-3">
          <div className="tw-w-full tw-h-[250px]
                              tw-p-4
                              tw-rounded-xl 
                               tw-backdrop-blur-2xl
                               tw-overflow-hidden tw-flex tw-place-content-center">
            <img src="/assets/images/home/search.png" alt="Web search" className="tw-w-auto tw-h-full tw-object-contain" />
          </div>
          <h3 className="tw-text-2xl">
            Real-time Collaboration
          </h3>
          <p className="tw-text-gray-700 dark:tw-text-gray-300 tw-px-4 tw-text-center tw-text-sm">
            Collaborate with your team in real-time. Share tasks, documents, and Git branches with live updates and instant notifications.
          </p>
        </div>
        <div className="reveal-up tw-w-[350px] max-md:tw-w-[320px] tw-border-[1px] tw-h-[400px] tw-rounded-lg tw-place-items-center tw-p-4
                           tw-bg-[#f2f3f4] dark:tw-bg-[#141414] dark:tw-border-[#1f2123] tw-flex tw-flex-col tw-gap-3">
          <div className="tw-w-full tw-h-[250px]
                              tw-p-4
                              tw-rounded-xl 
                               tw-backdrop-blur-2xl
                               tw-overflow-hidden tw-flex tw-place-content-center">
            <img src="/assets/images/home/image.png" alt="Image generation" className="tw-w-auto tw-h-full tw-object-contain" />
          </div>
          <h3 className="tw-text-2xl">
            Code Snippets
          </h3>
          <p className="tw-text-gray-700 dark:tw-text-gray-300 tw-px-4 tw-text-center tw-text-sm">
            Store and organize reusable code snippets. Access your personal code library with syntax highlighting and easy insertion.
          </p>
        </div>
        <div className="reveal-up tw-w-[350px] max-md:tw-w-[320px] tw-border-[1px] tw-h-[400px] tw-rounded-lg tw-place-items-center tw-p-4
                           tw-bg-[#f2f3f4] dark:tw-bg-[#141414] dark:tw-border-[#1f2123] tw-flex tw-flex-col tw-gap-3">
          <div className="tw-w-full tw-h-[250px]
                              tw-p-4
                               tw-rounded-xl 
                               tw-backdrop-blur-2xl
                               tw-overflow-hidden tw-flex tw-place-content-center">
            <img src="/assets/images/home/history.png" alt="History" className="tw-w-auto tw-h-full tw-object-contain" />
          </div>
          <h3 className="tw-text-2xl">
            Version History
          </h3>
          <p className="tw-text-gray-700 dark:tw-text-gray-300 tw-px-4 tw-text-center tw-text-sm">
            Track all changes to your tasks and documents. Restore previous versions and maintain a complete audit trail of your work.
          </p>
        </div>
        <div className="reveal-up tw-w-[350px] max-md:tw-w-[320px] tw-border-[1px] tw-h-[400px] tw-rounded-lg tw-place-items-center tw-p-4
                           tw-bg-[#f2f3f4] dark:tw-bg-[#141414] dark:tw-border-[#1f2123] tw-flex tw-flex-col tw-gap-3">
          <div className="tw-w-full tw-h-[250px]
                              tw-p-4
                              tw-rounded-xl 
                               tw-backdrop-blur-2xl
                               tw-overflow-hidden tw-flex tw-place-content-center">
            <img src="/assets/images/home/import.png" alt="Import content" className="tw-w-auto tw-h-full tw-object-contain" />
          </div>
          <h3 className="tw-text-2xl">
            API Integration
          </h3>
          <p className="tw-text-gray-700 dark:tw-text-gray-300 tw-px-4 tw-text-center tw-text-sm">
            Connect DevFlow with your favorite tools and services. Integrate with GitHub, Jira, Slack, and more through our comprehensive API.
          </p>
        </div>
        <div className="reveal-up tw-w-[350px] max-md:tw-w-[320px] tw-border-[1px] tw-h-[400px] tw-rounded-lg tw-place-items-center tw-p-4
                           tw-bg-[#f2f3f4] dark:tw-bg-[#141414] dark:tw-border-[#1f2123] tw-flex tw-flex-col tw-gap-3">
          <div className="tw-w-full tw-h-[250px]
                              tw-p-4
                              tw-rounded-xl 
                               tw-backdrop-blur-2xl
                               tw-overflow-hidden tw-flex tw-place-content-center">
            <img src="/assets/images/home/multilingual.png" alt="Multilingual" className="tw-w-auto tw-h-full tw-object-contain" />
          </div>
          <h3 className="tw-text-2xl">
            Multi-platform Support
          </h3>
          <p className="tw-text-gray-700 dark:tw-text-gray-300 tw-px-4 tw-text-center tw-text-sm">
            Access DevFlow from any device. Web, desktop, and mobile apps keep your workflow consistent across all platforms.
          </p>
        </div>
      </div>
    </div>
  </section>
  );
}
