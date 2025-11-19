import { useTranslation } from 'react-i18next';

export function Footer() {
  const { t } = useTranslation();

  return (
  <footer className="tw-mt-auto tw-flex tw-flex-col tw-w-full tw-gap-4 tw-text-sm tw-pt-[5%] tw-pb-10 tw-px-[10%]
              tw-text-foreground max-md:tw-flex-col">
    <div className="tw-flex max-md:tw-flex-col max-md:tw-gap-6 tw-gap-3 tw-w-full tw-place-content-around">
      <div className="tw-flex tw-h-full tw-w-[250px] tw-flex-col tw-place-items-center tw-gap-6 max-md:tw-w-full">
        <a href="#" className="tw-w-full tw-place-items-center tw-flex tw-flex-col tw-gap-6">
          <img src="/devflow-demo.png" alt={t('components.Footer.logoAlt')} className="tw-max-w-[120px]" />
          <div className="tw-max-w-[120px] tw-text-center tw-text-3xl tw-h-fit">
            DevFlow
          </div>
        </a>
        {/* <div class="tw-mt-3 tw-text-lg tw-font-semibold">Follow us</div> */}
        <div className="tw-flex tw-gap-4 tw-text-lg">
          <a href="https://github.com/PaulleDemon/" aria-label={t('components.Footer.github')}>
            <i className="bi bi-github" />
          </a>
          <a href="https://twitter.com/pauls_freeman" aria-label={t('components.Footer.twitter')}>
            <i className="bi bi-twitter" />
          </a>
          <a href="https://www.linkedin.com/" aria-label={t('components.Footer.linkedin')}>
            <i className="bi bi-linkedin" />
          </a>
        </div>
      </div>
      <div className="tw-flex max-md:tw-flex-col tw-flex-wrap tw-gap-6 tw-h-full tw-w-full tw-justify-around">
        <div className="tw-flex tw-h-full tw-w-[200px] tw-flex-col tw-gap-4">
          <h2 className="tw-text-xl">{t('components.Footer.resources')}</h2>
          <div className="tw-flex tw-flex-col tw-gap-3">
            <a href="#" className="footer-link">{t('components.Footer.gettingStarted')}</a>
            <a href="#" className="footer-link">{t('components.Footer.apiDocs')}</a>
            <a href="#" className="footer-link">{t('components.Footer.apiEndpoints')}</a>
            <a href="#" className="footer-link">{t('components.Footer.healthStatus')}</a>
            <a href="#" className="footer-link">{t('components.Footer.pricing')}</a>
          </div>
        </div>
        <div className="tw-flex tw-h-full tw-w-[200px] tw-flex-col tw-gap-4">
          <h2 className="tw-text-xl">{t('components.Footer.company')}</h2>
          <div className="tw-flex tw-flex-col tw-gap-3">
            <a href="#" className="footer-link">{t('components.Footer.supportChannels')}</a>
            <a href="#" className="footer-link">{t('components.Footer.systems')}</a>
            <a href="#" className="footer-link">{t('components.Footer.blog')}</a>
            <a href="https://twitter.com/pauls_freeman" className="footer-link">{t('components.Footer.twitter')}</a>
            <a href="https://github.com/PaulleDemon" className="footer-link">{t('components.Footer.github')}</a>
          </div>
        </div>
        <div className="tw-flex tw-h-full tw-w-[200px] tw-flex-col tw-gap-4">
          <h2 className="tw-text-xl">{t('components.Footer.legal')}</h2>
          <div className="tw-flex tw-flex-col tw-gap-3">
            <a href="#" className="footer-link">{t('components.Footer.termsOfService')}</a>
            <a href="#" className="footer-link">{t('components.Footer.privacyPolicy')}</a>
            <a href="#" className="footer-link">{t('components.Footer.dcmaContentTakedown')}</a>
          </div>
        </div>
      </div>
    </div>
    <hr className="tw-mt-8" />
    <div className="tw-mt-2 tw-flex tw-gap-2 tw-flex-col tw-text-muted-foreground tw-place-items-center
              tw-text-[12px] tw-w-full tw-text-center tw-place-content-around">
      <span>{t('components.Footer.copyright')}</span>
      <span>{t('components.Footer.allTrademarksCopyrights')}</span>
    </div>
  </footer>
  );
}