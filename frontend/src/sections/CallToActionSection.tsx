export function CallToActionSection() {
  return (
  <section className="tw-relative tw-flex tw-p-2  tw-w-full tw-min-h-[60vh]  tw-flex-col tw-place-content-center tw-place-items-center tw-overflow-hidden">   
    <div className="reveal-up tw-w-full tw-h-full tw-min-h-[450px] max-lg:tw-max-w-full tw-rounded-md lg:tw-py-[5%] tw-bg-[#f6f7fb] dark:tw-bg-[#171717] tw-place-content-center tw-items-center 
                  tw-flex tw-flex-col tw-max-w-[80%] tw-gap-4 tw-p-4">
      <h3 className="reveal-up tw-text-5xl tw-font-medium max-md:tw-text-3xl tw-text-center tw-leading-tight">
        Start Your DevFlow Journey Today
      </h3>
      <div className="tw-mt-8 tw-relative tw-flex max-lg:tw-flex-col tw-gap-5">
        <a href="/app" className="btn reveal-up !tw-rounded-full !tw-p-4 tw-font-medium !tw-bg-black !tw-text-white hover:!tw-bg-neutral-900 dark:!tw-bg-white dark:!tw-text-black dark:hover:!tw-bg-neutral-200 tw-transition-colors tw-duration-300">
          Get Started Free
        </a>
      </div>
    </div>
  </section>
  );
}
