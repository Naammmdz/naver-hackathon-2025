import { RedirectToSignIn, useAuth } from "@clerk/clerk-react";
import type { PropsWithChildren } from "react";

export const ProtectedRoute = ({ children }: PropsWithChildren): JSX.Element => {
  const { isLoaded, isSignedIn } = useAuth();

  if (!isLoaded) {
    return (
      <div className="flex h-screen items-center justify-center bg-background text-sm text-muted-foreground">
        Đang tải thông tin người dùng...
      </div>
    );
  }

  if (!isSignedIn) {
    return <RedirectToSignIn />;
  }

  return <>{children}</>;
};
