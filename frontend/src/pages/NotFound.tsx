import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import { useTranslation } from "react-i18next";

const NotFound = () => {
  const { t } = useTranslation();
  const location = useLocation();

  useEffect(() => {
    console.error(t('components.NotFound.notFoundError', '404 Error: User attempted to access non-existent route:'), location.pathname);
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <div className="text-center">
        <h1 className="mb-4 text-4xl font-bold text-foreground">404</h1>
        <p className="mb-4 text-xl text-muted-foreground">{t('components.NotFound.pageNotFound', 'Oops! Page not found')}</p>
        <a href="/" className="text-primary underline hover:text-primary/80">
          {t('components.NotFound.returnToHome', 'Return to Home')}
        </a>
      </div>
    </div>
  );
};

export default NotFound;
