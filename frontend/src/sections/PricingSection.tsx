export function PricingSection() {
  return (
  <section className="tw-mt-5 tw-flex tw-w-full tw-flex-col tw-gap-6 tw-place-items-center tw-p-[2%]" id="pricing">
    <h3 className="reveal-up tw-text-5xl tw-font-medium max-md:tw-text-2xl">
      Choose the right plan for you
    </h3>
    {/* pricing */}
    <div className="tw-mt-10 tw-flex tw-flex-wrap tw-place-content-center tw-gap-8 max-lg:tw-flex-col">
      <div className="reveal-up tw-flex tw-w-[350px] tw-flex-col tw-place-items-center tw-gap-2 tw-rounded-lg tw-border-[1px]
                      tw-border-outlineColor tw-bg-white dark:tw-bg-[#080808] dark:tw-border-[#1f2123] tw-p-8 tw-shadow-xl max-lg:tw-w-[320px]">
        <h3 >
          <span className="tw-text-5xl max-md:tw-text-3xl tw-font-semibold">$9</span>
          <span className="tw-text-2xl tw-text-gray-600 dark:tw-text-gray-300">/mo</span>
        </h3>
        <p className="tw-mt-3 tw-text-center tw-text-gray-800 dark:tw-text-gray-100">
          Perfect for individual developers
        </p>
        <hr />
        <ul className="tw-mt-4 tw-flex tw-flex-col tw-gap-4 tw-text-base tw-text-gray-800 dark:tw-text-gray-200">
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Unlimited tasks and projects</span>    
          </li>
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Inline Markdown editing</span>    
          </li>
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Git branch visualization</span>    
          </li>
          <li className="tw-flex tw-gap-2 ">
            <i className="bi bi-check-circle-fill tw-text-gray-400 dark:tw-text-gray-500" />
            <span>Team collaboration</span>    
          </li>
          <li className="tw-flex tw-gap-2 ">
            <i className="bi bi-check-circle-fill tw-text-gray-400 dark:tw-text-gray-500" />
            <span>Advanced integrations</span>    
          </li>
        </ul>
        <a href="#" className="btn tw-mt-auto !tw-w-full tw-transition-transform tw-duration-[0.3s] 
                          hover:tw-scale-x-[1.02] !tw-text-black dark:!tw-text-white !tw-bg-transparent !tw-border-[1px]
                           tw-border-black dark:tw-border-white">
          Choose plan
        </a>
      </div>
      <div className="reveal-up tw-flex tw-w-[350px] tw-flex-col tw-place-items-center tw-gap-2 tw-rounded-lg tw-border-2
                      tw-border-outlineColor tw-bg-white dark:tw-bg-[#080808] dark:tw-border-[#595858] tw-p-8 tw-shadow-xl max-lg:tw-w-[320px]">
        <h3 >
          <span className="tw-text-5xl max-md:tw-text-3xl  tw-font-semibold">$17</span>
          <span className="tw-text-2xl max-md:tw-text-xl  tw-text-gray-600 dark:tw-text-gray-300">/mo</span>
        </h3>
        <p className="tw-mt-3 tw-text-center tw-text-gray-800 dark:tw-text-gray-200">
          Advanced features for growing teams
        </p>
        <hr />
        <ul className="tw-mt-4 tw-flex tw-flex-col tw-gap-4  tw-text-base tw-text-gray-800 dark:tw-text-gray-100">
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Everything in Personal</span>    
          </li>
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Up to 10 team members</span>    
          </li>
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Real-time collaboration</span>    
          </li>
          <li className="tw-flex tw-gap-2 ">
            <i className="bi bi-check-circle-fill" />
            <span>Advanced integrations</span>    
          </li>
          <li className="tw-flex tw-gap-2 ">
            <i className="bi bi-check-circle-fill tw-text-gray-400 dark:tw-text-gray-500" />
            <span>Priority support</span>    
          </li>
        </ul>
        <a href="#" className="btn tw-mt-auto !tw-w-full tw-transition-transform tw-duration-[0.3s] hover:tw-scale-x-[1.02]">
          Choose plan
        </a>
      </div>
      <div className="reveal-up tw-flex tw-w-[350px] tw-flex-col tw-place-items-center tw-gap-2 tw-rounded-lg tw-border-[1px]
                      tw-border-outlineColor dark:tw-bg-[#080808] dark:tw-border-[#1f2123] tw-bg-white tw-p-8 tw-shadow-xl max-lg:tw-w-[320px]">
        <h3 >
          <span className="tw-text-5xl max-md:tw-text-3xl tw-font-semibold">$29</span>
          <span className="tw-text-2xl tw-text-gray-600 dark:tw-text-gray-300">/mo</span>
        </h3>
        <p className="tw-mt-3 tw-text-center tw-text-gray-800 dark:tw-text-gray-100">
          Unlimited power for large organizations
        </p>
        <hr />
        <ul className="tw-mt-4 tw-flex tw-flex-col tw-gap-4 tw-text-base 
                          tw-text-gray-800 dark:tw-text-gray-200">
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Everything in Pro</span>    
          </li>
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Unlimited team members</span>    
          </li>
          <li className="tw-flex tw-gap-2">
            <i className="bi bi-check-circle-fill" />
            <span>Custom integrations</span>    
          </li>
          <li className="tw-flex tw-gap-2 ">
            <i className="bi bi-check-circle-fill" />
            <span>Dedicated support</span>    
          </li>
          <li className="tw-flex tw-gap-2 ">
            <i className="bi bi-check-circle-fill " />
            <span>Advanced security features</span>    
          </li>
        </ul>
        <a href="#" className="btn tw-mt-8 !tw-w-full tw-transition-transform tw-duration-[0.3s] 
                          hover:tw-scale-x-[1.02] !tw-text-black dark:!tw-text-white !tw-bg-transparent 
                          !tw-border-[1px] tw-border-black dark:tw-border-white">
          Choose plan
        </a>
      </div>
    </div>
  </section>
  );
}
