"use client";
import ExcaliDrawComp from "../../ExcaliDrawComp";
import { useAuth } from "../../contexts/AuthContext";

interface ExcaliDrawPageProps {
  params: {
    id: string;
  };
}

export default function ExcaliDrawPage({ params }: ExcaliDrawPageProps) {
  const { user, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100">
        <div className="text-center p-8 bg-white rounded-lg shadow-lg">
          <h1 className="text-2xl font-bold text-gray-800 mb-4">
            Please Log In!
          </h1>
          <p className="text-gray-600 mb-6">
            You need to be logged in to access collaborative sessions.
          </p>
          <a
            href="/"
            className="px-6 py-3 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
          >
            Go to Home
          </a>
        </div>
      </div>
    );
  }

  return <ExcaliDrawComp sessionId={params.id} />;
}
