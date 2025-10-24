import { Footer } from '@/components/Footer';
import { Header } from '@/components/Header';
import { initLandingPage } from '@/lib/initLandingPage';
import { AdditionalFeaturesSection } from '@/sections/AdditionalFeaturesSection';
import { ArticlesSection } from '@/sections/ArticlesSection';
import { BenefitsSection } from '@/sections/BenefitsSection';
import { BrandsSection } from '@/sections/BrandsSection';
import { BuildAppsSection } from '@/sections/BuildAppsSection';
import { CallToActionSection } from '@/sections/CallToActionSection';
import { FaqSection } from '@/sections/FaqSection';
import { HeroSection } from '@/sections/HeroSection';
import { NewsletterSection } from '@/sections/NewsletterSection';
import { PrebuiltToolsSection } from '@/sections/PrebuiltToolsSection';
import { PricingSection } from '@/sections/PricingSection';
import { TestimonialsSection } from '@/sections/TestimonialsSection';
import { UnifiedSubscriptionSection } from '@/sections/UnifiedSubscriptionSection';
import 'bootstrap-icons/font/bootstrap-icons.css';
import { useEffect } from 'react';
import '../landing.css';

export default function Landing() {
  useEffect(() => {
    const cleanup = initLandingPage();
    return () => cleanup?.();
  }, []);

  return (
    <div id="landing-page" className="tw-flex tw-min-h-screen tw-flex-col tw-bg-[#fcfcfc] tw-text-black dark:tw-bg-black dark:tw-text-white">
      <Header />
      <main className="tw-flex tw-flex-col tw-items-center">
        <HeroSection />
        <BrandsSection />
        <BuildAppsSection />
        <BenefitsSection />
        <PrebuiltToolsSection />
        <AdditionalFeaturesSection />
        <UnifiedSubscriptionSection />
        <TestimonialsSection />
        <PricingSection />
        <ArticlesSection />
        <FaqSection />
        <CallToActionSection />
        <NewsletterSection />
      </main>
      <Footer />
    </div>
  );
}