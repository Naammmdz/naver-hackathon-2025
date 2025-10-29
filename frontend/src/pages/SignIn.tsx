import { SignIn } from "@clerk/clerk-react";

const SignInPage = (): JSX.Element => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignIn routing="path" path="/sign-in" signUpUrl="/sign-up" />
    </div>
  );
};

export default SignInPage;
