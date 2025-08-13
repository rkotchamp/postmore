"use client";

import { useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";

export function TikTokCallbackHandler() {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  useEffect(() => {
    const handleTikTokCallback = async () => {
      const code = searchParams.get("code");
      const state = searchParams.get("state");
      const error = searchParams.get("error");
      
      // Only handle TikTok callbacks
      if (!code && !error) return;
      
      // Check if we have a code_verifier in localStorage
      const codeVerifier = localStorage.getItem("tiktok_code_verifier");
      const storedState = localStorage.getItem("tiktok_auth_state");
      
      if (error) {
        console.error("TikTok OAuth error:", error);
        router.replace(`/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(error)}`);
        return;
      }
      
      if (!code) {
        console.error("No authorization code received from TikTok");
        router.replace("/authenticate?platform=tiktok&error=true&message=No authorization code received");
        return;
      }
      
      if (!codeVerifier) {
        console.error("No code verifier found in localStorage");
        router.replace("/authenticate?platform=tiktok&error=true&message=PKCE code verifier missing");
        return;
      }
      
      // Validate state for CSRF protection
      if (state !== storedState) {
        console.error("State mismatch - possible CSRF attack");
        router.replace("/authenticate?platform=tiktok&error=true&message=Invalid state parameter");
        return;
      }
      
      try {
        // Call our server-side callback with the code_verifier
        const callbackUrl = `/api/auth/callback/tiktok?code=${encodeURIComponent(code)}&state=${encodeURIComponent(state)}&code_verifier=${encodeURIComponent(codeVerifier)}`;
        
        // Clean up localStorage
        localStorage.removeItem("tiktok_code_verifier");
        localStorage.removeItem("tiktok_auth_state");
        
        // Redirect to the server callback
        window.location.href = callbackUrl;
      } catch (error) {
        console.error("Error processing TikTok callback:", error);
        router.replace(`/authenticate?platform=tiktok&error=true&message=${encodeURIComponent(error.message)}`);
      }
    };
    
    handleTikTokCallback();
  }, [searchParams, router]);
  
  return (
    <div className="flex items-center justify-center min-h-screen">
      <div className="text-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
        <p className="mt-4 text-gray-600">Processing TikTok authentication...</p>
      </div>
    </div>
  );
}