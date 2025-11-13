import { SignUp } from "@clerk/clerk-react";

const SignUpPage = (): JSX.Element => {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <SignUp routing="path" path="/sign-up" signInUrl="/sign-in" />
    </div>
  );
};

export default SignUpPage;
