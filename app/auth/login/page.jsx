import { Suspense } from "react";
import { LoginForm } from "./components/LoginForm";
import { LoginLayout } from "./components/LoginLayout";

export default function Login() {
  return (
    <LoginLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <LoginForm />
      </Suspense>
    </LoginLayout>
  );
}
