"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/app/components/ui/button";
import { Input } from "@/app/components/ui/input";
import { toast } from "sonner";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/app/components/ui/form";
import { Loader2, User, Mail, Lock, Eye, EyeOff, Crown } from "lucide-react";
import { registerSchema } from "@/app/models/ZodFormSchemas";
import { signIn } from "next-auth/react";
import { useCheckoutStore } from "@/app/lib/store/checkoutStore";
import { Card, CardContent } from "@/app/components/ui/card";

export function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoading, setIsGoogleLoading] = useState(false);
  const [isGithubLoading, setIsGithubLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [registerError, setRegisterError] = useState("");
  const [isActivatingSubscription, setIsActivatingSubscription] = useState(false);

  const { 
    checkoutSession, 
    hasValidSession, 
    clearCheckoutSession, 
    markSessionCompleted 
  } = useCheckoutStore();

  // Check if this is a post-checkout signup
  const isCheckoutFlow = searchParams.get("checkout") === "pending" && hasValidSession();

  // Get the return URL from search params
  const callbackUrl = searchParams.get("callbackUrl") || "/dashboard";

  const form = useForm({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      fullName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },
  });

  const handleRegisterSubmit = async (values) => {
    setIsLoading(true);
    setRegisterError("");

    try {
      // Prepare registration data
      const registrationData = { ...values };
      
      // Include checkout session data if available
      if (isCheckoutFlow && checkoutSession) {
        registrationData.checkoutSession = checkoutSession;
      }

      // Make API call to the registration endpoint
      const response = await fetch("/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(registrationData),
      });

      const data = await response.json();

      if (!response.ok) {
        // Handle server-side validation errors
        if (data.errors) {
          setRegisterError(data.errors[0]?.message || "Validation failed");
        } else if (data.message === "Email already registered") {
          setRegisterError("This email is already registered. Please use a different email or try signing in.");
        } else {
          setRegisterError(data.message || "Registration failed");
        }
        setIsLoading(false);
        return;
      }

      // Successfully registered
      toast.success("Registration successful!", {
        description: "Your account has been created.",
      });

      // Store the token in localStorage for future use
      if (data.token) {
        localStorage.setItem("access_token", data.token);
      }

      // If this is a checkout flow, activate subscription after registration
      if (isCheckoutFlow && checkoutSession) {
        try {
          setIsActivatingSubscription(true);
          
          // First, sign in to get authenticated session
          const signInResult = await signIn("credentials", {
            email: values.email,
            password: values.password,
            redirect: false,
          });

          if (signInResult?.ok) {
            // Now activate the subscription
            const subscriptionResponse = await fetch("/api/checkout/activate-subscription", {
              method: "POST",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({ sessionId: checkoutSession.sessionId }),
            });

            if (subscriptionResponse.ok) {
              const subscriptionData = await subscriptionResponse.json();
              
              toast.success("Subscription activated!", {
                description: `Welcome to your ${checkoutSession.planName} plan!`,
                duration: 5000,
              });

              // Mark checkout as completed and clear session
              markSessionCompleted();
              clearCheckoutSession();

              // Redirect to dashboard
              router.push("/dashboard?welcome=true");
            } else {
              toast.error("Subscription activation failed", {
                description: "Please contact support to activate your subscription.",
                duration: 5000,
              });
              router.push("/dashboard");
            }
          } else {
            toast.error("Auto-login failed", {
              description: "Please sign in to activate your subscription.",
              duration: 5000,
            });
            router.push("/auth/login");
          }
        } catch (error) {
          console.error("Error activating subscription:", error);
          toast.error("Subscription activation failed", {
            description: "Please contact support to activate your subscription.",
            duration: 5000,
          });
          router.push("/dashboard");
        } finally {
          setIsActivatingSubscription(false);
        }
      } else {
        // Normal registration flow
        router.push("/auth/login");
      }
    } catch (error) {
      console.error("Registration error:", error);
      setRegisterError("Something went wrong. Please try again.");
      setIsLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    try {
      setIsGoogleLoading(true);
      console.log("Initiating Google sign-in from Register page");

      // If checkout flow, store checkout session in URL params for OAuth callback
      let signInCallbackUrl = `${window.location.origin}${callbackUrl}`;
      
      if (isCheckoutFlow && checkoutSession) {
        const params = new URLSearchParams({
          checkout: "pending",
          sessionId: checkoutSession.sessionId,
          planId: checkoutSession.planId,
          planName: checkoutSession.planName,
          planPrice: checkoutSession.planPrice.toString(),
        });
        signInCallbackUrl += `?${params.toString()}`;
      }

      await signIn("google", {
        callbackUrl: signInCallbackUrl,
        prompt: "select_account",
      });
    } catch (error) {
      console.error("Google sign-in error:", error);
      toast.error("Authentication error", {
        description:
          "There was a problem signing in with Google. Please try again.",
      });
      setIsGoogleLoading(false);
    }
  };

  const handleGithubSignIn = async () => {
    try {
      setIsGithubLoading(true);
      console.log("Initiating GitHub sign-in from Register page");

      // If checkout flow, store checkout session in URL params for OAuth callback
      let signInCallbackUrl = callbackUrl;
      
      if (isCheckoutFlow && checkoutSession) {
        const params = new URLSearchParams({
          checkout: "pending",
          sessionId: checkoutSession.sessionId,
          planId: checkoutSession.planId,
          planName: checkoutSession.planName,
          planPrice: checkoutSession.planPrice.toString(),
        });
        signInCallbackUrl += `?${params.toString()}`;
      }

      const result = await signIn("github", {
        callbackUrl: signInCallbackUrl,
        redirect: true,
      });

      console.log("GitHub sign-in result:", result);
    } catch (error) {
      console.error("GitHub sign-in error:", error);
      toast.error("Authentication error", {
        description:
          "There was a problem signing in with GitHub. Please try again.",
      });
      setIsGithubLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  const toggleConfirmPasswordVisibility = () => {
    setShowConfirmPassword(!showConfirmPassword);
  };

  return (
    <div className="grid gap-6">
      {/* Show checkout session info if available */}
      {isCheckoutFlow && checkoutSession && (
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="rounded-full bg-primary/10 p-2">
                <Crown className="h-4 w-4 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold text-sm">Payment Complete!</h3>
                <p className="text-xs text-muted-foreground">
                  Create your account to activate your {checkoutSession.planName} plan (${checkoutSession.planPrice}/month)
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Form {...form}>
        <form
          onSubmit={form.handleSubmit(handleRegisterSubmit)}
          className="space-y-4"
        >
          <FormField
            control={form.control}
            name="fullName"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Full Name</FormLabel>
                <FormControl>
                  <div className="relative">
                    <User className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="Full Name"
                      className={`pl-9 ${
                        registerError ? 'border-red-500 animate-shake' : ''
                      }`}
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Mail className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="email@example.com"
                      type="email"
                      className={`pl-9 ${
                        registerError ? 'border-red-500 animate-shake' : ''
                      }`}
                      {...field}
                      disabled={isLoading}
                    />
                  </div>
                </FormControl>
                <FormMessage />
                {registerError && (
                  <p className="text-sm text-red-500 mt-1">{registerError}</p>
                )}
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="••••••••"
                      type={showPassword ? "text" : "password"}
                      className={`pl-9 pr-9 ${
                        registerError ? 'border-red-500 animate-shake' : ''
                      }`}
                      {...field}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
                      onClick={togglePasswordVisibility}
                      tabIndex="-1"
                      aria-label={
                        showPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage className="text-xs" />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="confirmPassword"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Confirm Password</FormLabel>
                <FormControl>
                  <div className="relative">
                    <Lock className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                    <Input
                      placeholder="••••••••"
                      type={showConfirmPassword ? "text" : "password"}
                      className={`pl-9 pr-9 ${
                        registerError ? 'border-red-500 animate-shake' : ''
                      }`}
                      {...field}
                      disabled={isLoading}
                    />
                    <button
                      type="button"
                      className="absolute right-3 top-3 h-4 w-4 text-muted-foreground hover:text-primary transition-colors"
                      onClick={toggleConfirmPasswordVisibility}
                      tabIndex="-1"
                      aria-label={
                        showConfirmPassword ? "Hide password" : "Show password"
                      }
                    >
                      {showConfirmPassword ? (
                        <EyeOff className="h-4 w-4" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full" disabled={isLoading || isActivatingSubscription}>
            {isActivatingSubscription ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Activating subscription...
              </>
            ) : isLoading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Creating account...
              </>
            ) : isCheckoutFlow ? (
              <>
                <Crown className="mr-2 h-4 w-4" />
                Complete account & activate plan
              </>
            ) : (
              "Create account"
            )}
          </Button>
        </form>
      </Form>

      <div className="relative">
        <div className="absolute inset-0 flex items-center">
          <span className="w-full border-t" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-background px-2 text-muted-foreground">
            Or continue with
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <Button
          variant="outline"
          onClick={handleGoogleSignIn}
          disabled={isLoading || isGoogleLoading || isGithubLoading}
          className="flex items-center justify-center"
        >
          {isGoogleLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                fill="#4285F4"
              />
              <path
                d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                fill="#34A853"
              />
              <path
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                fill="#FBBC05"
              />
              <path
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                fill="#EA4335"
              />
            </svg>
          )}
          Google
        </Button>
        <Button
          variant="outline"
          onClick={handleGithubSignIn}
          disabled={isLoading || isGoogleLoading || isGithubLoading}
          className="flex items-center justify-center"
        >
          {isGithubLoading ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <svg
              className="mr-2 h-4 w-4"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0 0 24 12c0-6.63-5.37-12-12-12z"
                fill="currentColor"
              />
            </svg>
          )}
          GitHub
        </Button>
      </div>

      <div className="text-center text-sm">
        Already have an account?{" "}
        <Link
          href="/auth/login"
          className="font-medium text-primary hover:underline"
        >
          Sign in
        </Link>
      </div>
    </div>
  );
}
