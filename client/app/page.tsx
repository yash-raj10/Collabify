"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./contexts/AuthContext";
import { AuthModal } from "./components/AuthModal";
import Image from "next/image";

export default function Home() {
  const router = useRouter();
  const { user, logout } = useAuth();
  const [joinSessionId, setJoinSessionId] = useState("");
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [joinType, setJoinType] = useState<"excalidraw" | "doc">("excalidraw");
  const [particles, setParticles] = useState<
    Array<{
      id: number;
      left: string;
      top: string;
      animationDelay: string;
      animationDuration: string;
    }>
  >([]);

  useEffect(() => {
    // Generate particles on client-side only to avoid hydration mismatch
    const generatedParticles = Array.from({ length: 20 }).map((_, i) => ({
      id: i,
      left: `${Math.random() * 100}%`,
      top: `${Math.random() * 100}%`,
      animationDelay: `${Math.random() * 3}s`,
      animationDuration: `${2 + Math.random() * 2}s`,
    }));
    setParticles(generatedParticles);
  }, []);

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
    <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/30 to-pink-400/30 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-32 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/20 to-indigo-400/20 rounded-full blur-3xl animate-bounce"
          style={{ animationDuration: "6s" }}
        ></div>
        <div
          className="absolute bottom-20 right-20 w-64 h-64 bg-gradient-to-br from-emerald-400/25 to-teal-400/25 rounded-full blur-3xl animate-pulse"
          style={{ animationDelay: "2s" }}
        ></div>
      </div>

      {/* Glassmorphism particles */}
      <div className="absolute inset-0">
        {particles.map((particle) => (
          <div
            key={particle.id}
            className="absolute w-2 h-2 bg-white/10 rounded-full animate-pulse"
            style={{
              left: particle.left,
              top: particle.top,
              animationDelay: particle.animationDelay,
              animationDuration: particle.animationDuration,
            }}
          />
        ))}
      </div>
      {/* Glassmorphism Header */}
      <header className="relative z-10 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center shadow-lg">
                <svg
                  className="w-7 h-7 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M13 10V3L4 14h7v7l9-11h-7z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-to-r from-white to-purple-200 bg-clip-text text-transparent">
                  Collabify
                </h1>
                <p className="text-white/70 text-sm">
                  Real-time collaboration platform
                </p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              {user ? (
                <div className="flex items-center gap-4">
                  <div className="bg-white/10 backdrop-blur-sm rounded-full px-4 py-2 border border-white/20">
                    <span className="text-white font-medium">
                      Welcome, {user.name}!
                    </span>
                  </div>
                  <button
                    onClick={logout}
                    className="px-6 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-200 font-medium border border-white/30 hover:border-white/50"
                  >
                    Sign Out
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => setShowAuthModal(true)}
                  className="px-6 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl transition-all duration-200 font-medium shadow-lg hover:shadow-xl transform hover:scale-105"
                >
                  Sign In
                </button>
              )}
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        {/* Hero Section */}
        <section className="px-6 py-20">
          <div className="max-w-7xl mx-auto text-center">
            <div className="mb-8">
              <span className="inline-block px-4 py-2 bg-gradient-to-r from-purple-500/20 to-pink-500/20 backdrop-blur-sm rounded-full text-purple-200 text-sm font-medium border border-purple-300/30 mb-6">
                🚀 Real-time collaboration made simple
              </span>
              <h1 className="text-6xl md:text-7xl font-bold mb-6 bg-gradient-to-r from-white via-purple-200 to-pink-200 bg-clip-text text-transparent leading-tight">
                Collaborate
                <br />
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  Without Limits
                </span>
              </h1>
              <p className="text-xl md:text-2xl text-white/80 max-w-3xl mx-auto leading-relaxed">
                Experience seamless real-time collaboration with powerful tools
                designed for creative minds. Create, save, and access your
                documents and drawings from anywhere. Work together in real-time
                from any device.
              </p>
            </div>

            {/* Quick Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-4 justify-center mb-16">
              <button
                onClick={() => createNewSession("doc")}
                className="px-8 py-4 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm"
              >
                📝 Start Writing
              </button>

              <button
                onClick={() => createNewSession("excalidraw")}
                className="px-8 py-4 bg-gradient-to-r from-purple-500 to-purple-600 hover:from-purple-600 hover:to-purple-700 text-white rounded-2xl font-semibold text-lg transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm flex items-center justify-center gap-2"
              >
                🎨 Start Drawing
                <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-1.5 py-0.5 rounded-full uppercase tracking-wide">
                  Beta
                </span>
              </button>
            </div>

            {/* Floating Scroll Indicator */}
            <div className="flex justify-center">
              <div
                className="animate-bounce cursor-pointer group flex flex-col items-center"
                onClick={() =>
                  document
                    .getElementById("features")
                    ?.scrollIntoView({ behavior: "smooth" })
                }
              >
                <div className="bg-white/10 backdrop-blur-md border border-white/20 rounded-full p-3 hover:bg-white/20 transition-all duration-300 group-hover:scale-110 shadow-lg w-12 h-12 flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white group-hover:text-purple-200 transition-colors duration-300"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 14l-7 7m0 0l-7-7m7 7V3"
                    />
                  </svg>
                </div>
                <span className="text-white/60 text-sm font-medium group-hover:text-white/80 transition-colors duration-300 mt-2">
                  Explore Features
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Features Section */}
        <section id="features" className="px-6 py-20">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Powerful Features
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Everything you need for seamless collaboration in one platform
              </p>
            </div>

            <div className="grid md:grid-cols-3 gap-8 mb-16">
              {/* Feature Cards */}
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-br from-purple-400 to-pink-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Real-time Collaboration
                </h3>
                <p className="text-white/80 leading-relaxed">
                  See changes instantly as you and your team collaborate. Live
                  cursor tracking, instant updates, and seamless multi-user
                  editing.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-br from-emerald-400 to-green-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 0V4a1 1 0 00-1-1H9a1 1 0 00-1 1v3m1 0h4m-4 0V4h4v3"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Save & Sync Anywhere
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Save your documents and drawings to the cloud. Access your
                  work from any device, anywhere in the world.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-br from-blue-400 to-teal-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Secure & Private
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Your data is protected with secure authentication. Only you
                  and your collaborators can access your documents and drawings.
                </p>
              </div>
            </div>

            {/* Additional Features Row */}
            <div className="grid md:grid-cols-2 gap-8 mb-16 max-w-4xl mx-auto">
              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-br from-orange-400 to-red-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 011-1h1a2 2 0 011 1v2M7 7h10"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Personal Workspace
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Manage all your saved documents and drawings in one place.
                  Browse, organize, and quickly access your personal library.
                </p>
              </div>

              <div className="bg-white/10 backdrop-blur-md rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-300 transform hover:scale-105">
                <div className="w-16 h-16 bg-gradient-to-br from-indigo-400 to-purple-400 rounded-2xl flex items-center justify-center mb-6 shadow-lg">
                  <svg
                    className="w-8 h-8 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white mb-4">
                  Multi-user Support
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Work with unlimited team members. Share session links and see
                  everyone&apos;s contributions in real-time with live cursors.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Main Collaboration Tools */}
        <section className="px-6 py-20">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <h2 className="text-4xl md:text-5xl font-bold text-white mb-6">
                Choose Your Tool
              </h2>
              <p className="text-xl text-white/80 max-w-2xl mx-auto">
                Pick the perfect tool for your collaboration needs
              </p>
            </div>

            {/* Enhanced Options Cards */}
            <div className="grid lg:grid-cols-2 gap-8 max-w-5xl mx-auto">
              {/* Doc Online Option */}
              <div className="group bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-teal-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl group-hover:shadow-blue-500/25 transition-all duration-500">
                    <svg
                      className="w-12 h-12 text-white"
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
                  <h2 className="text-3xl font-bold text-white mb-4">
                    Doc Online
                  </h2>
                  <p className="text-white/80 mb-8 leading-relaxed text-lg">
                    Collaborative document editor with cloud saving. Write,
                    edit, and save documents online. Access your saved documents
                    from any device and collaborate in real-time with live
                    cursor tracking.
                  </p>
                  <div className="flex justify-center space-x-6 text-sm text-white/70 mb-8">
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-green-400 rounded-full mr-2"></div>
                      Live editing
                    </span>
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                      Live cursors
                    </span>
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                      Cloud save
                    </span>
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                      My Docs
                    </span>
                  </div>
                  {/* Action Buttons */}
                  <div className="space-y-4">
                    <button
                      onClick={() => createNewSession("doc")}
                      className="w-full bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                    >
                      📝 Create New Session
                    </button>
                    <button
                      onClick={() => openJoinModal("doc")}
                      className="w-full border-2 border-blue-400/50 text-blue-300 hover:bg-blue-500/20 hover:text-white hover:border-blue-300 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm text-lg"
                    >
                      📎 Join Existing Session
                    </button>
                  </div>

                  {/* Doc Online Demo GIF */}
                  <div className="mt-8 rounded-2xl overflow-hidden border border-white/20 shadow-2xl group-hover:shadow-blue-500/20 transition-all duration-500">
                    <Image
                      src="/doc.gif"
                      alt="Doc Online Demo - Collaborative document editing in action"
                      width={400}
                      height={250}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: "250px" }}
                      unoptimized
                    />
                  </div>
                </div>
              </div>

              {/* ExcaliDraw Option */}
              <div className="group bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20 hover:bg-white/15 transition-all duration-500 transform hover:scale-105 hover:shadow-2xl">
                <div className="text-center">
                  <div className="w-24 h-24 bg-gradient-to-br from-purple-500 to-pink-500 rounded-3xl mx-auto mb-8 flex items-center justify-center shadow-2xl group-hover:shadow-purple-500/25 transition-all duration-500">
                    <svg
                      className="w-12 h-12 text-white"
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
                  <h2 className="text-3xl font-bold text-white mb-4 flex items-center justify-center gap-3">
                    ExcaliDraw
                    <span className="bg-gradient-to-r from-orange-500 to-red-500 text-white text-xs font-bold px-2 py-1 rounded-full uppercase tracking-wide">
                      Beta
                    </span>
                  </h2>
                  <p className="text-white/80 mb-8 leading-relaxed text-lg">
                    Collaborative whiteboard with cloud storage. Create
                    diagrams, sketches, and visual brainstorms. Save your
                    drawings online and access them from anywhere.{" "}
                    <span className="text-orange-300 font-medium">
                      Real-time collaboration features are in beta.
                    </span>
                  </p>
                  <div className="flex justify-center space-x-6 text-sm text-white/70 mb-8">
                    <span className="flex items-center bg-orange-500/20 px-3 py-1 rounded-full border border-orange-500/30">
                      <div className="w-2 h-2 bg-orange-400 rounded-full mr-2"></div>
                      Realtime sync(Beta)
                    </span>
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                      Multiuser cursors
                    </span>
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-purple-400 rounded-full mr-2"></div>
                      Cloud save
                    </span>
                    <span className="flex items-center bg-white/10 px-3 py-1 rounded-full">
                      <div className="w-2 h-2 bg-pink-400 rounded-full mr-2"></div>
                      My Drawings
                    </span>
                  </div>
                  {/* Action Buttons */}
                  <div className="space-y-4">
                    <button
                      onClick={() => createNewSession("excalidraw")}
                      className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold py-4 px-6 rounded-2xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl text-lg"
                    >
                      🎨 Create New Session
                    </button>
                    <button
                      onClick={() => openJoinModal("excalidraw")}
                      className="w-full border-2 border-purple-400/50 text-purple-300 hover:bg-purple-500/20 hover:text-white hover:border-purple-300 font-semibold py-4 px-6 rounded-2xl transition-all duration-300 backdrop-blur-sm text-lg"
                    >
                      📎 Join Existing Session
                    </button>
                  </div>

                  {/* ExcaliDraw Demo GIF */}
                  <div className="mt-8 rounded-2xl overflow-hidden border border-white/20 shadow-2xl group-hover:shadow-purple-500/20 transition-all duration-500">
                    <Image
                      src="/excali.gif"
                      alt="ExcaliDraw Demo - Collaborative whiteboard in action"
                      width={400}
                      height={250}
                      className="w-full h-auto object-cover"
                      style={{ maxHeight: "250px" }}
                      unoptimized
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Additional Info */}
            <div className="text-center mt-16">
              <div className="bg-white/10 backdrop-blur-lg rounded-2xl p-8 border border-white/20 max-w-2xl mx-auto">
                <h3 className="text-2xl font-bold text-white mb-4">
                  Create, Save & Collaborate
                </h3>
                <p className="text-white/80 leading-relaxed">
                  Start creating immediately with no setup required. Your work
                  is automatically saved to the cloud. Share session links for
                  instant collaboration or access your personal library from any
                  device.
                </p>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* Enhanced Footer */}
      <footer className="relative z-10 bg-white/5 backdrop-blur-md border-t border-white/20">
        <div className="max-w-7xl mx-auto px-6 py-12">
          <div className="grid md:grid-cols-2 gap-8 mb-8">
            <div>
              <div className="flex items-center space-x-3 mb-4">
                <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center">
                  <svg
                    className="w-6 h-6 text-white"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M13 10V3L4 14h7v7l9-11h-7z"
                    />
                  </svg>
                </div>
                <h3 className="text-2xl font-bold text-white">Collabify</h3>
              </div>
              <p className="text-white/70 mb-6">
                Real-Time Collaboration Made Simple. Create documents and
                drawings together, instantly.
              </p>
            </div>

            <div>
              <h4 className="text-lg font-semibold text-white mb-4">
                Connect with the Creator
              </h4>
              <div className="flex space-x-4">
                <a
                  href="https://www.linkedin.com/in/yash-raj-in/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  title="LinkedIn"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z" />
                  </svg>
                </a>
                <a
                  href="https://x.com/ya_shtwt"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  title="X (Twitter)"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
                  </svg>
                </a>
                <a
                  href="https://www.youtube.com/@yashraj.10"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center hover:bg-white/20 transition-colors"
                  title="YouTube"
                >
                  <svg
                    className="w-5 h-5 text-white"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
                  </svg>
                </a>
              </div>
            </div>
          </div>

          <div className="border-t border-white/20 pt-8 text-center">
            <p className="text-white/60 text-sm">
              © 2025 Collabify. Built with ❤️ by Ya.sh
            </p>
          </div>
        </div>
      </footer>

      {/* Enhanced Join Session Modal */}
      {showJoinModal && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 max-w-md w-full border border-white/20 shadow-2xl">
            <div className="text-center mb-6">
              <div
                className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center shadow-lg ${
                  joinType === "excalidraw"
                    ? "bg-gradient-to-br from-purple-500 to-pink-500"
                    : "bg-gradient-to-br from-blue-500 to-teal-500"
                }`}
              >
                <svg
                  className="w-8 h-8 text-white"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  {joinType === "excalidraw" ? (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                    />
                  ) : (
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                    />
                  )}
                </svg>
              </div>
              <h3 className="text-2xl font-bold text-white mb-2">
                Join {joinType === "excalidraw" ? "ExcaliDraw" : "Doc Online"}{" "}
                Session
              </h3>
              <p className="text-white/80">
                Enter the session ID to join an existing collaborative session.
              </p>
            </div>
            <input
              type="text"
              value={joinSessionId}
              onChange={(e) => setJoinSessionId(e.target.value)}
              placeholder="Enter session ID..."
              className="w-full px-4 py-4 bg-white/10 backdrop-blur-sm border border-white/30 rounded-2xl focus:ring-2 focus:ring-purple-400 focus:border-transparent outline-none mb-6 text-white placeholder-white/60 text-center font-mono"
              onKeyPress={(e) => e.key === "Enter" && joinSession()}
            />
            <div className="flex gap-3">
              <button
                onClick={() => setShowJoinModal(false)}
                className="flex-1 px-6 py-3 bg-white/10 border border-white/30 text-white rounded-2xl hover:bg-white/20 transition-all duration-200 font-medium backdrop-blur-sm"
              >
                Cancel
              </button>
              <button
                onClick={joinSession}
                disabled={!joinSessionId.trim()}
                className={`flex-1 px-6 py-3 rounded-2xl font-semibold transition-all duration-200 ${
                  joinSessionId.trim()
                    ? joinType === "excalidraw"
                      ? "bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white shadow-lg"
                      : "bg-gradient-to-r from-blue-500 to-teal-500 hover:from-blue-600 hover:to-teal-600 text-white shadow-lg"
                    : "bg-white/10 text-white/50 cursor-not-allowed"
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
  );
}
