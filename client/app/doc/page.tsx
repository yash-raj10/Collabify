"use client";
import { useEffect } from "react";
import { useRouter } from "next/navigation";

// Redirect to a new session when accessing the old route
export default function DocRedirect() {
  const router = useRouter();

  useEffect(() => {
    // Generate a new session ID and redirect
    const sessionId =
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15);
    router.replace(`/doc/${sessionId}`);
  }, [router]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-gray-600">Creating new Doc Online session...</p>
      </div>
    </div>
  );
}
