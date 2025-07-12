import { Suspense } from "react";
import { RegisterForm } from "./components/RegisterForm";
import { RegisterLayout } from "./components/RegisterLayout";

export default function Register() {
  return (
    <RegisterLayout>
      <Suspense fallback={<div>Loading...</div>}>
        <RegisterForm />
      </Suspense>
    </RegisterLayout>
  );
}
