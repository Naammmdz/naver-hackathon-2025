export function FaqSection() {
  return (
  <section className="tw-relative tw-flex tw-w-full tw-flex-col tw-place-content-center tw-place-items-center tw-gap-[10%] tw-p-[5%] tw-px-[10%]">   
    <h3 className="tw-text-4xl tw-font-medium max-md:tw-text-2xl">
      Faq
    </h3>
    <div className="tw-mt-5 tw-flex tw-min-h-[300px] tw-w-full tw-max-w-[850px] tw-flex-col tw-gap-4">
      <div className="faq tw-w-full">
        <h4 className="faq-accordion tw-flex tw-w-full tw-select-none tw-text-xl max-md:tw-text-lg">
          <span>What is DevHolic?</span>
          <i className="bi bi-plus tw-text-xl tw-origin-center tw-duration-300 tw-transition-transform 
                              tw-ml-auto tw-font-semibold" />
        </h4>
        <div className="content max-lg:tw-text-sm">
          DevHolic is a unified workspace that merges tasks, documentation, and Git activity into a single platform. It helps developers stay in flow by providing inline Markdown editing, Kanban task tracking, and Git branch visualization.
        </div>
      </div>
      <hr />
      <div className="faq tw-w-full">
        <h4 className="faq-accordion tw-flex tw-w-full tw-select-none tw-text-xl max-md:tw-text-lg">
          <span>How does DevHolic help with task management?</span>
          <i className="bi bi-plus tw-text-xl tw-origin-center tw-duration-300 tw-transition-transform 
                              tw-ml-auto tw-font-semibold" />
        </h4>
        <div className="content max-lg:tw-text-sm">
          DevHolic provides intuitive Kanban boards for tracking progress. You can create tasks, set priorities, assign team members, and monitor project status with drag-and-drop simplicity. All tasks are integrated with your documentation and Git commits.
        </div>
      </div>
      <hr />
      <div className="faq tw-w-full">
        <h4 className="faq-accordion tw-flex tw-w-full tw-select-none tw-text-xl max-md:tw-text-lg">
          <span>Can I write documentation in DevHolic?</span>
          <i className="bi bi-plus tw-text-xl tw-origin-center tw-duration-300 tw-transition-transform 
                              tw-ml-auto tw-font-semibold" />
        </h4>
        <div className="content max-lg:tw-text-sm">
          Yes! DevHolic features inline Markdown editing, allowing you to write and edit documentation seamlessly within your workflow. Create READMEs, technical docs, and project notes with rich formatting without leaving the platform.
        </div>
      </div>
      <hr />
      <div className="faq tw-w-full">
        <h4 className="faq-accordion tw-flex tw-w-full tw-select-none tw-text-xl max-md:tw-text-lg">
          <span>Is DevHolic free to use?</span>
          <i className="bi bi-plus tw-text-xl tw-origin-center tw-duration-300 tw-transition-transform 
                              tw-ml-auto tw-font-semibold" />
        </h4>
        <div className="content max-lg:tw-text-sm">
          You can start using DevHolic for free with basic features. Upgrade to a premium plan to access advanced collaboration tools, unlimited projects, and priority support.
        </div>
      </div>
      <hr />
    </div>
    <div className="purple-bg-grad max-md:tw-hidden reveal-up tw-absolute tw-bottom-14 tw-right-[20%] 
                           tw-h-[150px] tw-w-[150px] tw-rounded-full" />
  </section>
  );
}
