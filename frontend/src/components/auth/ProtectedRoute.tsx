import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import type { PropsWithChildren } from "react";
import { useTranslation } from "react-i18next";

export const ProtectedRoute = ({ children }: PropsWithChildren): JSX.Element => {
  const { t } = useTranslation();
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        {t('components.ProtectedRoute.loadingUserInfo')}
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
};
