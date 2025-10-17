export function UnifiedSubscriptionSection() {
  return (
  <section className="tw-relative tw-flex  tw-w-full tw-min-h-[100vh] max-md:tw-min-h-[80vh] tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden">   
    <div className="tw-w-full max-lg:tw-max-w-full tw-place-content-center tw-place-items-center 
                  tw-flex tw-flex-col tw-max-w-[80%] tw-gap-4 tw-p-4">
      <h3 className="reveal-up tw-text-5xl tw-font-medium max-md:tw-text-3xl tw-text-center tw-leading-normal">
        One Workspace for Everything
      </h3>
      <p className="reveal-up tw-mt-3 tw-max-w-[600px] tw-text-center ">
        Why juggle multiple tools when one unified workspace can handle tasks, documentation, and Git?
        Streamline your development process and stay in the flow.
      </p>
      <div className="tw-mt-8 tw-relative tw-flex max-lg:tw-flex-col tw-gap-5">
        <div className="reveal-up tw-flex tw-w-full tw-max-w-[650px] max-md:tw-max-w-full tw-flex-col tw-place-items-center tw-gap-2 tw-rounded-lg tw-border-[1px]
                      tw-border-outlineColor tw-bg-white dark:tw-bg-[#080808] dark:tw-border-[#1f2123] tw-p-2 tw-shadow-xl max-lg:tw-w-[320px]">
          <img src="/assets/images/home/multi-sub.png" alt="Multi sub" />
        </div>
        <div className="reveal-up tw-flex tw-w-full tw-max-w-[650px] tw-flex-col tw-place-items-center tw-gap-2 tw-rounded-lg tw-border-[1px]
                      tw-border-outlineColor tw-bg-white dark:tw-bg-[#080808] dark:tw-border-[#1f2123] tw-p-2 tw-shadow-xl max-lg:tw-w-[320px]">
          <img src="/assets/images/home/single-sub.jpg" alt="Single sub" />
        </div>
      </div>
      <a href="#" className="reveal-up tw-group tw-shadow-xl btn tw-flex tw-gap-2 tw-mt-10">
        <span>Get Started</span>
        <i className="bi bi-arrow-right tw-duration-300 group-hover:tw-translate-x-1" />
      </a>
    </div>
  </section>
  );
}
