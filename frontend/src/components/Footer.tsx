export function Footer() {
  return (
  <footer className="tw-mt-auto tw-flex tw-flex-col tw-w-full tw-gap-4 tw-text-sm tw-pt-[5%] tw-pb-10 tw-px-[10%]
              tw-text-black dark:tw-text-white max-md:tw-flex-col">
    <div className="tw-flex max-md:tw-flex-col max-md:tw-gap-6 tw-gap-3 tw-w-full tw-place-content-around">
      <div className="tw-flex tw-h-full tw-w-[250px] tw-flex-col tw-place-items-center tw-gap-6 max-md:tw-w-full">
        <a href="#" className="tw-w-full tw-place-items-center tw-flex tw-flex-col tw-gap-6">
          <img src="/devflow-demo.png" alt="logo" className="tw-max-w-[120px]" />
          <div className="tw-max-w-[120px] tw-text-center tw-text-3xl tw-h-fit">
            DevFlow
          </div>
        </a>
        {/* <div class="tw-mt-3 tw-text-lg tw-font-semibold">Follow us</div> */}
        <div className="tw-flex tw-gap-4 tw-text-lg">
          <a href="https://github.com/PaulleDemon/" aria-label="Github">
            <i className="bi bi-github" />
          </a>
          <a href="https://twitter.com/pauls_freeman" aria-label="Twitter">
            <i className="bi bi-twitter" />
          </a>
          <a href="https://www.linkedin.com/" aria-label="Linkedin">
            <i className="bi bi-linkedin" />
          </a>
        </div>
      </div>
      <div className="tw-flex max-md:tw-flex-col tw-flex-wrap tw-gap-6 tw-h-full tw-w-full tw-justify-around">
        <div className="tw-flex tw-h-full tw-w-[200px] tw-flex-col tw-gap-4">
          <h2 className="tw-text-xl">Resources</h2>
          <div className="tw-flex tw-flex-col tw-gap-3">
            <a href="#" className="footer-link">Getting started</a>
            <a href="#" className="footer-link">API Docs</a>
            <a href="#" className="footer-link">API Endpoints</a>
            <a href="#" className="footer-link">Health status</a>
            <a href="#" className="footer-link">Pricing</a>
          </div>
        </div>
        <div className="tw-flex tw-h-full tw-w-[200px] tw-flex-col tw-gap-4">
          <h2 className="tw-text-xl">Company</h2>
          <div className="tw-flex tw-flex-col tw-gap-3">
            <a href="#" className="footer-link">Support channels</a>
            <a href="#" className="footer-link">Systems</a>
            <a href="#" className="footer-link">Blog</a>
            <a href="https://twitter.com/pauls_freeman" className="footer-link">Twitter</a>
            <a href="https://github.com/PaulleDemon" className="footer-link">Github</a>
          </div>
        </div>
        <div className="tw-flex tw-h-full tw-w-[200px] tw-flex-col tw-gap-4">
          <h2 className="tw-text-xl">Legal</h2>
          <div className="tw-flex tw-flex-col tw-gap-3">
            <a href="#" className="footer-link">Terms of service</a>
            <a href="#" className="footer-link">Privacy Policy</a>
            <a href="#" className="footer-link">DCMA - Content Takedown</a>
          </div>
        </div>
      </div>
    </div>
    <hr className="tw-mt-8" />
    <div className="tw-mt-2 tw-flex tw-gap-2 tw-flex-col tw-text-gray-700 dark:tw-text-gray-300 tw-place-items-center
              tw-text-[12px] tw-w-full tw-text-center tw-place-content-around">
      <span>Copyright ┬⌐ 2023-2025</span>
      <span>All trademarks and copyrights belong to their respective owners.</span>
    </div>
  </footer>
  );
}