"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import { AuthModal } from "./components/AuthModal";

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [joinSessionId, setJoinSessionId] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [joinType, setJoinType] = useState<"excalidraw" | "doc">("excalidraw");

  const generateId = () => {
    return (
      Math.random().toString(36).substring(2, 15) +
      Math.random().toString(36).substring(2, 15)
    );
  };

  const createNewSession = (type: "excalidraw" | "doc") => {
    const sessionId = generateId();
    router.push(`/${type}/${sessionId}`);
  };

  const joinSession = () => {
    if (joinSessionId.trim()) {
      router.push(`/${joinType}/${joinSessionId.trim()}`);
      setShowJoinModal(false);
      setJoinSessionId("");
    }
  };

  const openJoinModal = (type: "excalidraw" | "doc") => {
    setJoinType(type);
    setShowJoinModal(true);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Auth Header */}
      <div className="w-full bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="text-2xl font-bold text-gray-800">Collabify</div>
          <div className="flex items-center gap-4">
            {user ? (
              <>
                <span className="text-gray-600">Welcome, {user.name}!</span>
                <button
                  onClick={logout}
                  className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors font-medium"
                >
                  Sign Out
                </button>
              </>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-6 py-2 bg-blue-500 hover:bg-blue-600 text-white rounded-lg transition-colors"
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center justify-center p-6 min-h-[calc(100vh-80px)]">
        <div className="max-w-4xl w-full">
          {/* Header */}
          <div className="text-center mb-12">
            <h1 className="text-5xl font-bold text-gray-800 mb-4">
              Welcome to Collabify
            </h1>
            <p className="text-xl text-gray-600 max-w-2xl mx-auto">
              Choose your collaborative experience. Work together in real-time
              with powerful tools designed for seamless collaboration.
            </p>
          </div>

          {/* Options Cards */}
          <div className="grid md:grid-cols-2 gap-8 max-w-4xl mx-auto">
            {/* ExcaliDraw Option */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-purple-500 to-pink-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  ExcaliDraw
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Collaborative whiteboard for sketching, diagramming, and
                  visual brainstorming. Draw together in real-time with infinite
                  canvas and powerful drawing tools.
                </p>
                <div className="flex justify-center space-x-4 text-sm text-gray-500 mb-6">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Real-time sync
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-blue-500 rounded-full mr-2"></div>
                    Multi-user cursors
                  </span>
                </div>
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => createNewSession("excalidraw")}
                    className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Create New Session
                  </button>
                  <button
                    onClick={() => openJoinModal("excalidraw")}
                    className="w-full border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Join Existing Session
                  </button>
                </div>
              </div>
            </div>

            {/* Doc Online Option */}
            <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100">
              <div className="text-center">
                <div className="w-20 h-20 bg-gradient-to-br from-blue-500 to-green-500 rounded-2xl mx-auto mb-6 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  </svg>
                </div>
                <h2 className="text-2xl font-bold text-gray-800 mb-4">
                  Doc Online
                </h2>
                <p className="text-gray-600 mb-6 leading-relaxed">
                  Collaborative document editor for writing, note-taking, and
                  content creation. Edit documents together with live cursor
                  tracking and instant updates.
                </p>
                <div className="flex justify-center space-x-4 text-sm text-gray-500 mb-6">
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2"></div>
                    Live editing
                  </span>
                  <span className="flex items-center">
                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                    Live cursors
                  </span>
                </div>
                {/* Action Buttons */}
                <div className="space-y-3">
                  <button
                    onClick={() => createNewSession("doc")}
                    className="w-full bg-gradient-to-r from-blue-500 to-green-500 hover:from-blue-600 hover:to-green-600 text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200 transform hover:scale-105"
                  >
                    Create New Session
                  </button>
                  <button
                    onClick={() => openJoinModal("doc")}
                    className="w-full border-2 border-blue-500 text-blue-500 hover:bg-blue-500 hover:text-white font-semibold py-3 px-6 rounded-lg transition-all duration-200"
                  >
                    Join Existing Session
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="text-center mt-12">
            <p className="text-gray-500">
              Create a new session to start collaborating, or join an existing
              session using its ID
            </p>
          </div>
        </div>

        {/* Join Session Modal */}
        {showJoinModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-2xl p-8 max-w-md w-full">
              <h3 className="text-2xl font-bold text-gray-800 mb-4">
                Join {joinType === "excalidraw" ? "ExcaliDraw" : "Doc Online"}{" "}
                Session
              </h3>
              <p className="text-gray-600 mb-6">
                Enter the session ID to join an existing collaborative session.
              </p>
              <input
                type="text"
                value={joinSessionId}
                onChange={(e) => setJoinSessionId(e.target.value)}
                placeholder="Enter session ID..."
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none mb-6 text-black"
                onKeyPress={(e) => e.key === "Enter" && joinSession()}
              />
              <div className="flex gap-3">
                <button
                  onClick={() => setShowJoinModal(false)}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={joinSession}
                  disabled={!joinSessionId.trim()}
                  className={`flex-1 px-6 py-3 rounded-lg font-semibold transition-colors ${
                    joinSessionId.trim()
                      ? joinType === "excalidraw"
                        ? "bg-purple-500 hover:bg-purple-600 text-white"
                        : "bg-blue-500 hover:bg-blue-600 text-white"
                      : "bg-gray-300 text-gray-500 cursor-not-allowed"
                  }`}
                >
                  Join Session
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Auth Modal */}
        <AuthModal
          isOpen={showAuthModal}
          onClose={() => setShowAuthModal(false)}
        />
      </div>
    </div>
  );
}
