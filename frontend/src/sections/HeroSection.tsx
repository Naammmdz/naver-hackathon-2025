export function HeroSection() {
  return (
  <section className="hero-section tw-relative tw-mt-20 tw-flex tw-min-h-[100vh] tw-w-full tw-max-w-[100vw] tw-flex-col tw-overflow-hidden max-lg:tw-mt-[100px]" id="hero-section">
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
        <h2 className="reveal-up tw-text-center tw-text-7xl tw-font-semibold tw-uppercase tw-leading-[90px] max-lg:tw-text-4xl max-md:tw-leading-snug">
          <span> Stay in flow </span>
          <br />
          <span className="tw-font-thin tw-font-serif"> with DevFlow </span>
        </h2>
        <div className="reveal-up tw-mt-8 tw-max-w-[450px] tw-text-lg max-lg:tw-text-base tw-p-2 tw-text-center
                   tw-text-gray-800 dark:tw-text-white max-lg:tw-max-w-full">
          DevFlow helps developers stay in flow — it merges tasks, documentation, and Git activity into a single workspace. Write Markdown inline, track progress with Kanban tasks, and visualize Git branches.
        </div>
        <div className="reveal-up tw-mt-10 max-md:tw-flex-col tw-flex tw-place-items-center tw-gap-4">
          <button onClick={() => window.openVideo?.()} className="btn !tw-w-[170px] max-lg:!tw-w-[160px] !tw-rounded-xl !tw-py-4 max-lg:!tw-py-2 tw-flex tw-gap-2 tw-group !tw-bg-transparent !tw-text-black dark:!tw-text-white tw-transition-colors 
                                  tw-duration-[0.3s] tw-border-[1px] tw-border-black dark:tw-border-white">
            <div className="tw-relative tw-flex tw-place-items-center tw-place-content-center tw-w-6 tw-h-6">
              <div className="tw-absolute tw-inset-0 tw-top-0 tw-left-0 tw-scale-0 tw-duration-300 group-hover:tw-scale-100 tw-border-2
                                       tw-border-gray-600 dark:tw-border-gray-200 tw-rounded-full tw-w-full tw-h-full" />
              <span className="bi bi-play-circle-fill" />
            </div>
            <span>Watch video</span>
          </button>
          <a className="btn tw-group max-lg:!tw-w-[160px] tw-flex tw-gap-2 tw-shadow-lg !tw-w-[170px] !tw-rounded-xl !tw-py-4 max-lg:!tw-py-2 tw-transition-transform tw-duration-[0.3s] hover:tw-scale-x-[1.03]" href="#">
            <span>Get started</span>
            <i className="bi bi-arrow-right group-hover:tw-translate-x-1 tw-duration-300" />
          </a>
        </div>
      </div>
      {/* prompt container */}
      <div className="reveal-up  tw-relative tw-mt-8 tw-flex tw-w-full tw-place-content-center tw-place-items-center" id="dashboard-container">
        <div className="purple-bg-grad  reveal-up tw-absolute tw-left-1/2 tw--translate-x-1/2 tw-top-[5%] tw-h-[200px] tw-w-[200px]" />    
        <div className="tw-relative tw-max-w-[80%] tw-bg-white dark:tw-bg-black tw-border-[1px] dark:tw-border-[#36393c] lg:tw-w-[1024px]
                          lg:tw-h-[650px]  tw-flex tw-shadow-xl max-lg:tw-h-[450px] max-lg:tw-w-full
                          tw-overflow-hidden
                          tw-min-w-[320px] md:tw-w-full tw-min-h-[450px] tw-rounded-xl tw-bg-transparent max-md:tw-max-w-full" id="dashboard">  
          <div className="purple-bg-grad tw-max-w-[80%] reveal-up tw-absolute tw-left-1/2 tw--translate-x-1/2 tw-top-[0%] lg:tw-max-w-[1000px] tw-h-full tw-w-full" /> 
          <div className="animated-border tw-w-full tw-h-full tw-p-[2px]">
            <div className="tw-w-full tw-h-full tw-rounded-xl tw-overflow-hidden tw-flex">
              {/* sign-up pop-up */}
              <div className="tw-absolute tw-rounded-xl tw-text-center tw-transition-transform tw-duration-300 tw-scale-0 tw-backdrop-blur-lg tw-flex tw-flex-col tw-p-10 tw-place-items-center 
                                  tw-gap-4 tw-w-full tw-h-full dark:tw-bg-[#000000b4] tw-bg-[#ffffff6a] firefox:tw-bg-white tw-top-0 tw-left-0 tw-z-20" id="signup-prompt">
                <h4 className="tw-mt-6 tw-text-3xl max-md:tw-text-xl">
                  Signup to continue your conversation
                </h4>
                <div className="tw-flex tw-gap-1 tw-place-items-center">
                  <div className="tw-flex tw--space-x-4">
                    <img className="tw-z-10 tw-w-10 tw-h-10 tw-object-cover tw-rounded-full tw-border-2 tw-border-white" src="assets/images/people/man.jpg" alt="Avatar 1" />
                    <img className="tw-z-[4] tw-w-10 tw-h-10 tw-object-cover tw-rounded-full tw-border-2 tw-border-white" src="assets/images/people/women.jpg" alt="Avatar 2" />
                    <img className="tw-z-[3] tw-w-10 tw-h-10 tw-object-cover tw-rounded-full tw-border-2 tw-border-white" src="assets/images/people/man2.jpg" alt="Avatar 3" />
                    <img className="tw-z-[2] tw-w-10 tw-h-10 tw-object-cover tw-rounded-full tw-border-2 tw-border-white" src="assets/images/people/man.jpg" alt="Avatar 4" />
                    <img className="tw-z-[1] tw-w-10 tw-h-10 tw-object-cover tw-rounded-full tw-border-2 tw-border-white" src="assets/images/people/women.jpg" alt="Avatar 5" />
                  </div>
                  <p>+20,000</p>
                </div>
                <div className="tw-mt-3 tw-text-lg">
                  Join Ben and 20,000+ users using Pixa
                </div>
                <a href="#" className="btn">
                  Sign up
                </a>
              </div>
              <div className="tw-min-w-[250px] max-lg:tw-hidden tw-p-2 tw-gap-2 tw-flex tw-flex-col tw-bg-gray-100 
                                      dark:tw-bg-[#171717] tw-h-full">
                {/* <h3 class="tw-text-xl tw-uppercase">
                                  Pixa
                              </h3> */}
                <div className="tw-h-[30px] tw-w-fit tw-max-w-[100px]">
                  <img src="/assets/logo/logo.png" alt="logo" className="tw-object-contain tw-opacity-80 tw-h-full tw-w-full dark:tw-invert" />
                </div>
                <div className="tw-flex tw-mt-2 tw-gap-2 tw-flex-col">
                  <a href="#link-to-img-gen" className="tw-flex tw-rounded-sm tw-gap-2 tw-p-2 dark:hover:tw-bg-[#2d2d2ddb] hover:tw-bg-gray-200">
                    <i className="bi bi-image" />
                    <span>Image generator</span>
                  </a>
                  <a href="#link-to-pdf-gen" className="tw-flex tw-rounded-sm tw-gap-2 tw-p-2 dark:hover:tw-bg-[#2d2d2ddb] hover:tw-bg-gray-200">
                    <i className="bi bi-file-pdf" />
                    <span>Pdf generator</span>
                  </a>
                  <a href="#link-to-code-gen" className="tw-flex tw-rounded-sm tw-gap-2 tw-p-2 dark:hover:tw-bg-[#2d2d2ddb] hover:tw-bg-gray-200">
                    <i className="bi bi-code-square" />
                    <span>Code generator</span>
                  </a>
                  <a href="#" className="tw-flex tw-rounded-sm tw-group tw-gap-2 tw-p-2 dark:hover:tw-bg-[#2d2d2ddb] hover:tw-bg-gray-200">
                    <span>Show all</span>
                    <i className="bi bi-arrow-right tw-transform tw-transition-transform tw-duration-300 group-hover:tw-translate-x-1" />
                  </a>
                </div>
                <div className="tw-mt-auto tw-w-full tw-flex tw-px-6 tw-place-content-center">
                  <a href="#sign-up" className="btn !tw-w-full !tw-bg-transparent tw-duration-[0.3s] 
                                                          hover:!tw-bg-black hover:!tw-text-white
                                                          dark:hover:!tw-bg-white dark:hover:!tw-text-black
                                                          !tw-border-[1px] !tw-border-black !tw-text-black
                                                          dark:!tw-border-white dark:!tw-text-white
                                                          ">
                    Signup
                  </a>
                </div>
              </div>
              <div className="tw-flex tw-w-full tw-p-4 tw-bg-white dark:tw-bg-black tw-h-full tw-flex-col" id="pixa-playground">
                <div className="tw-relative tw-w-full tw-flex tw-place-content-center tw-h-full">
                  <div className="tw-absolute tw-top-[20%] max-lg:tw-top-[30%] tw-left-1/2 tw--translate-x-1/2  tw-w-[150px] tw-h-[150px]">
                    <img src="/assets/logo/logo.png" className="tw-w-full tw-h-full dark:tw-invert tw-object-contain tw-opacity-20" alt="Pixa logo" />
                  </div>
                  <div className="prompt-container tw-overflow-y-auto tw-px-[5%] max-lg:tw-px-2 scrollbar max-lg:tw-max-h-[80%] tw-max-h-[550px] 
                                              max-lg:tw-mt-12 tw-w-full tw-h-full tw-z-10 tw-flex tw-flex-col" id="prompt-container">
                    <div className="tw-w-full tw-flex tw-text-center tw-flex-col tw-place-content-center">
                      <h2 className="tw-text-4xl max-md:tw-text-2xl max-md:tw-mt-3 tw-opacity-80">
                        Try Prompts
                      </h2>
                      <div className="tw-inline tw-mt-6 max-md:tw-mt-3">
                        <span id="prompts-sample" />
                      </div>
                    </div>
                  </div>
                </div>
                <form action="" id="prompt-form" onSubmit={(event) => event.preventDefault()} className="tw-place-content-center tw-mt-auto tw-h-[50px] tw-p-1 tw-place-items-center 
                                          tw-justify-around tw-flex tw-gap-1 tw-bottom-2 tw-w-full tw-rounded-md tw-bg-[#f3f4f6] dark:tw-bg-[#171717]">
                  <div className="tw-min-w-[140px] tw-min-h-[80px] max-lg:tw-absolute tw-z-10 tw-top-1 tw-left-1/2 max-lg:tw--translate-x-1/2 
                                              tw-flex tw-flex-col tw-text-sm tw-gap-1 tw-place-content-center">
                    <div className="dropdown tw-p-2 tw-rounded-md  tw-bg-[#f3f4f6] dark:tw-bg-[#171717]" id="dropdown1">
                      {/* store the value of the dropdown*/}
                      <input type="hidden" className="dropdown-input" />
                      <button type="button" className="dropdown-toggle tw-flex tw-gap-5">
                        <span className="tw-flex tw-w-fit tw-gap-2 tw-place-items-center">
                          <div className="tw-w-[20px] tw-h-[20px]">
                            <img src="/assets/images/brand-logos/openai.svg" alt="Gpt3.5" className="dropdown-select-icon dark:tw-invert" />
                          </div>
                          <span className="dropdown-select-text">GPT 4o</span>
                        </span>
                        <i className="bi bi-chevron-down tw-ml-auto lg:tw-hidden" />
                        <i className="bi bi-chevron-up tw-ml-auto lg:tw-block tw-hidden" />
                      </button>
                      <ul className="dropdown-menu tw-shadow-md tw-bottom-[50px] max-lg:tw-top-[105%] max-lg:tw-bottom-[unset]">
                        <li className="tw-flex tw-gap-2 tw-place-items-center">
                          <div className="tw-w-[20px] tw-h-[20px]">
                            <img src="/assets/images/brand-logos/openai.svg" alt="Gpt-4o" className="dropdown-menu-icon dark:tw-invert" />
                          </div>
                          <span className="dropdown-text">GPT 4o</span>
                        </li>
                        <li className="tw-flex tw-gap-2 tw-place-items-center">
                          <div className="tw-w-[20px] tw-h-[20px]">
                            <img src="/assets/images/brand-logos/googlegemini.svg" alt="Gemini" className="dropdown-menu-icon dark:tw-invert" />
                          </div>
                          <span className="dropdown-text">Gemini</span>
                        </li>
                        <li className="tw-flex tw-gap-2 tw-place-items-center">
                          <div className="tw-w-[20px] tw-h-[20px]">
                            <img src="/assets/images/brand-logos/meta.svg" alt="Llama" className="dropdown-menu-icon dark:tw-invert" />
                          </div>
                          <span className="dropdown-text">Llama 3</span>
                        </li>
                        <li className="tw-flex tw-gap-2 tw-place-items-center">
                          <div className="tw-w-[20px] tw-h-[20px]">
                            <img src="/assets/images/brand-logos/claude.svg" alt="Perplexity" className="dropdown-menu-icon dark:tw-invert" />
                          </div>
                          <span className="dropdown-text">Claude</span>
                        </li>
                      </ul>
                    </div>
                  </div>
                  <input placeholder="How to develop a saas app?" type="text" className="tw-p-2 !tw-outline-none tw-bg-transparent tw-border-none tw-w-full tw-placehoder-gray-500
                                                              dark:tw-placeholder-opacity-60 dark:tw-placeholder-gray-300 tw-max-w-[80%] tw-h-full" name="prompt" />
                  <button type="submit" className="btn !tw-bg-[#6366f1] !tw-p-2 !tw-px-3 !tw-text-white" title="submit">
                    <i className="bi bi-arrow-up" />
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  </section>
  );
}
