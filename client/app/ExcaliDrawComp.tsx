"use client";
import React, { useEffect, useRef, useState, useCallback } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { useRouter } from "next/navigation";
import { throttle, debounce } from "./utils";
import Toast from "./components/Toast";
import { buildWebSocketUrl, buildDrawingUrl } from "./config/api";

import "@excalidraw/excalidraw/index.css";

type UserDataType = {
  userId: string | null;
  userName: string | null;
  userColor: string | null;
};

interface UserCursor {
  userData: UserDataType;
  position: { x: number; y: number };
}

interface ContentPayload {
  content: string;
  position: { x: number; y: number };
  userData: UserDataType;
}

interface UserMessage {
  type: string;
  data: {
    userData: UserDataType;
  };
}

interface ContentMessage {
  type: string;
  data: ContentPayload;
}

interface ExcalidrawWrapperProps {
  sessionId?: string;
}

const ExcalidrawWrapper: React.FC<ExcalidrawWrapperProps> = ({
  sessionId = "default",
}) => {
  const router = useRouter();
  const ws = useRef<WebSocket | null>(null);
  const [isClient, setIsClient] = useState(false);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const userDataRef = useRef<UserDataType>({
    userId: null,
    userName: "",
    userColor: "",
  });
  const [userCursors, setUserCursors] = useState<Array<UserCursor>>([]);
  const [users, setUsers] = useState<Array<UserDataType>>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [showSidebar, setShowSidebar] = useState(false);
  const [userDrawings, setUserDrawings] = useState<
    Array<{
      id: string;
      drawingId: string;
      updatedAt: string;
      content: string;
    }>
  >([]);
  const [currentElements, setCurrentElements] = useState<unknown[]>([]);
  const [currentAppState, setCurrentAppState] = useState<{
    collaborators: Map<string, unknown>;
    [key: string]: unknown;
  }>({
    collaborators: new Map(),
  });
  const [initialData, setInitialData] = useState<unknown>(null);
  const [toast, setToast] = useState<{
    message: string;
    type: "success" | "error" | "info";
    isVisible: boolean;
  }>({
    message: "",
    type: "info",
    isVisible: false,
  });

  const throttleRef = useRef(
    throttle((payload: ContentPayload) => {
      console.log("throttle", payload);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: "content",
            data: payload,
          })
        );
      }
    }, 100)
  );

  const debounceRef = useRef(
    debounce((payload: ContentPayload) => {
      console.log("debounce", payload);
      if (ws.current && ws.current.readyState === WebSocket.OPEN) {
        ws.current.send(
          JSON.stringify({
            type: "content",
            data: payload,
          })
        );
      }
    }, 300)
  );

  const handleUserCursors = (data: ContentPayload) => {
    const userId = data.userData.userId;

    setUserCursors((prevCursors) => {
      // Remove previous cursor for this user
      const filterCursorPositions = prevCursors.filter(
        (items: UserCursor) => items.userData.userId !== userId
      );

      // Don't show your own cursor
      if (userDataRef.current.userId === userId) {
        return filterCursorPositions;
      }

      // Add new cursor position for this user
      const newCursor: UserCursor = {
        userData: data.userData,
        position: { ...data.position },
      };

      return [...filterCursorPositions, newCursor];
    });

    // Auto-remove cursor after 3 seconds of inactivity
    setTimeout(() => {
      setUserCursors((prevCursors) =>
        prevCursors.filter((cursor) => cursor.userData.userId !== userId)
      );
    }, 3000);
  };

  const addNewUser = (userData: UserDataType) => {
    // Don't add yourself to the users list
    if (userData.userId === userDataRef.current.userId) {
      return;
    }

    setUsers((prevUsers) => {
      // Check if user already exists to avoid duplicates
      const userExists = prevUsers.some(
        (user) => user.userId === userData.userId
      );
      if (userExists) {
        return prevUsers;
      }
      return [...prevUsers, userData];
    });
  };

  const removeUser = (userData: UserDataType) => {
    setUsers((prevUsers) =>
      prevUsers.filter((user) => user.userId !== userData.userId)
    );
  };

  const handleServerResponse = useCallback((event: MessageEvent) => {
    try {
      const ParsedData = JSON.parse(event.data);
      const eventType = ParsedData.type;

      console.log("Received message:", eventType, ParsedData);

      if (eventType === "content") {
        const contentMsg = ParsedData as ContentMessage;
        console.log(
          "Content message from:",
          contentMsg.data.userData.userId,
          "My ID:",
          userDataRef.current?.userId
        );

        if (contentMsg.data.userData.userId !== userDataRef.current?.userId) {
          console.log("Applying remote cursor update");
          handleUserCursors(contentMsg.data);
        } else {
          console.log("Ignoring my own content message");
        }
      }

      if (eventType === "user-data") {
        const userMsg = ParsedData as UserMessage;
        userDataRef.current = userMsg.data.userData;
        console.log("My user data:", userDataRef.current);
      }

      if (eventType === "user-added") {
        const userMsg = ParsedData as UserMessage;
        addNewUser(userMsg.data.userData);
        console.log("User added:", userMsg.data.userData);
      }

      if (eventType === "user-removed") {
        const userMsg = ParsedData as UserMessage;
        removeUser(userMsg.data.userData);
        console.log("User removed:", userMsg.data.userData);
      }
    } catch (error) {
      console.error("Error parsing JSON message:", error);
      console.error("Raw message data:", event.data);
      console.error("Message length:", event.data.length);

      // Try to handle concatenated JSON messages
      try {
        const rawData = event.data;
        const messages = rawData
          .split("}{")
          .map((msg: string, index: number, array: string[]) => {
            if (index === 0 && array.length > 1) {
              return msg + "}";
            } else if (index === array.length - 1 && array.length > 1) {
              return "{" + msg;
            } else if (array.length > 1) {
              return "{" + msg + "}";
            }
            return msg;
          });

        console.log(
          "Attempting to parse",
          messages.length,
          "separate messages"
        );

        messages.forEach((messageStr: string, index: number) => {
          try {
            const ParsedData = JSON.parse(messageStr);
            console.log(`Message ${index + 1}:`, ParsedData);
            // Process the message (you can add the same logic here as above)
          } catch (parseError) {
            console.error(`Error parsing message ${index + 1}:`, parseError);
          }
        });
      } catch (splitError) {
        console.error("Error splitting concatenated messages:", splitError);
      }
    }
  }, []);

  useEffect(() => {
    //(Hydration error fix)
    setIsClient(true);
  }, []);

  // Toast helper functions
  const showToast = (message: string, type: "success" | "error" | "info") => {
    setToast({
      message,
      type,
      isVisible: true,
    });
  };

  const hideToast = () => {
    setToast((prev) => ({ ...prev, isVisible: false }));
  };

  // Save drawing function
  const saveDrawing = async () => {
    if (!isClient || currentElements.length === 0) {
      showToast("Please draw something before saving", "error");
      return;
    }

    setIsSaving(true);
    showToast("Saving drawing...", "info");

    try {
      const token = localStorage.getItem("authToken");
      if (!token) {
        showToast("Not authenticated", "error");
        setIsSaving(false);
        return;
      }

      // For saving, we need to serialize the appState properly
      // Remove or convert non-serializable data like Maps
      const serializableAppState = {
        ...currentAppState,
        collaborators: undefined, // Don't save collaborators as they're runtime data
      };

      const drawingData = {
        elements: currentElements,
        appState: serializableAppState,
        timestamp: new Date().toISOString(),
        sessionId: sessionId,
        userId: userDataRef.current.userId,
      };

      const response = await fetch(buildDrawingUrl(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          drawingId: sessionId,
          content: JSON.stringify(drawingData),
        }),
      });

      if (response.ok) {
        showToast("Drawing saved successfully!", "success");
      } else {
        const errorData = await response.json();
        showToast(errorData.error || "Failed to save drawing", "error");
      }
    } catch (error) {
      console.error("Save error:", error);
      showToast("Failed to save drawing", "error");
    } finally {
      setIsSaving(false);
    }
  };

  // Load drawing function
  const loadDrawing = useCallback(async () => {
    if (!isClient) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildDrawingUrl(sessionId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const drawingData = await response.json();
        if (drawingData.content) {
          const parsedContent = JSON.parse(drawingData.content);
          if (parsedContent.elements) {
            setCurrentElements(parsedContent.elements);

            // Ensure appState has the correct structure for Excalidraw
            const appState = {
              ...parsedContent.appState,
              collaborators: new Map(), // Excalidraw expects a Map for collaborators
            };
            setCurrentAppState(appState);

            // Set initial data for Excalidraw to render
            setInitialData({
              elements: parsedContent.elements,
              appState: appState,
            });
          }
        }
      }
      // If drawing doesn't exist (404), that's fine - start with empty drawing
    } catch (error) {
      console.error("Load error:", error);
    }
  }, [isClient, sessionId]);

  // Get user drawings function
  const getUserDrawings = async () => {
    if (!isClient) return [];

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return [];

      const response = await fetch(buildDrawingUrl(), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const data = await response.json();
        return data.drawings || [];
      }
    } catch (error) {
      console.error("Error fetching drawings:", error);
    }
    return [];
  };

  // Load user drawings for sidebar
  const loadUserDrawings = async () => {
    const drawings = await getUserDrawings();
    setUserDrawings(drawings);
  };

  // Load a specific drawing
  const loadSpecificDrawing = async (drawingId: string) => {
    if (!isClient) return;

    try {
      const token = localStorage.getItem("authToken");
      if (!token) return;

      const response = await fetch(buildDrawingUrl(drawingId), {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      });

      if (response.ok) {
        const drawingData = await response.json();
        if (drawingData.content) {
          const parsedContent = JSON.parse(drawingData.content);
          if (parsedContent.elements) {
            setCurrentElements(parsedContent.elements);

            // Ensure appState has the correct structure for Excalidraw
            const appState = {
              ...parsedContent.appState,
              collaborators: new Map(), // Excalidraw expects a Map for collaborators
            };
            setCurrentAppState(appState);

            // Set initial data for Excalidraw to render
            setInitialData({
              elements: parsedContent.elements,
              appState: appState,
            });
          }
        }
        // Update the URL to reflect the new drawing
        window.history.pushState({}, "", `/excalidraw/${drawingId}`);
        setShowSidebar(false);
      }
    } catch (error) {
      console.error("Load error:", error);
    }
  };

  useEffect(() => {
    if (initialData) {
      console.log("Initial data updated:", initialData);
    }
  }, [initialData]);

  useEffect(() => {
    const connectWebSocket = () => {
      if (!isClient) return;

      // Load saved drawing when component mounts
      loadDrawing();

      // Get JWT token from localStorage
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      // Include session ID and token in WebSocket connection
      ws.current = new WebSocket(buildWebSocketUrl(sessionId, token));

      ws.current.addEventListener("open", () => {
        console.log(
          `WebSocket connection established for session: ${sessionId}`
        );
        setIsConnected(true);
      });

      ws.current.addEventListener("close", (event) => {
        console.log("WebSocket connection closed", event.code, event.reason);
        setIsConnected(false);
      });

      ws.current.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      });

      ws.current.addEventListener("message", handleServerResponse);

      return () => {
        if (ws.current) {
          console.log("Cleaning up WebSocket connection");
          ws.current.close();
          setIsConnected(false);
        }
      };
    };

    connectWebSocket();
  }, [isClient, sessionId, handleServerResponse, loadDrawing]);

  const handlePointerUpdate = (payload: unknown) => {
    const typedPayload = payload as { pointer?: { x?: number; y?: number } };
    if (
      typedPayload.pointer &&
      typedPayload.pointer.x !== undefined &&
      typedPayload.pointer.y !== undefined &&
      isConnected && // Only send if WebSocket is connected
      ws.current &&
      ws.current.readyState === WebSocket.OPEN
    ) {
      const position = {
        x: typedPayload.pointer.x,
        y: typedPayload.pointer.y,
      };

      const contentPayload: ContentPayload = {
        content: "", // Empty content string as requested
        position: position,
        userData: userDataRef.current,
      };

      throttleRef.current(contentPayload);
      debounceRef.current(contentPayload);
    }
  };

  // Handle Excalidraw changes and log as JSON
  const handleExcalidrawChange = (elements: unknown, appState: unknown) => {
    // Update current state for saving
    setCurrentElements(elements as unknown[]);
    setCurrentAppState(
      appState as {
        collaborators: Map<string, unknown>;
        [key: string]: unknown;
      }
    );

    // For saving, we need to serialize the appState properly
    // Remove or convert non-serializable data like Maps
    const typedAppState = appState as { [key: string]: unknown };
    const serializableAppState = {
      ...typedAppState,
      collaborators: undefined, // Don't save collaborators as they're runtime data
    };

    const excalidrawData = {
      elements: elements,
      appState: serializableAppState,
      timestamp: new Date().toISOString(),
      sessionId: sessionId,
      userId: userDataRef.current.userId,
    };

    console.log(
      "Excalidraw Data (JSON):",
      JSON.stringify(excalidrawData, null, 2)
    );
  };

  console.info(
    convertToExcalidrawElements([
      {
        type: "rectangle",
        id: "rect-1",
        width: 186.47265625,
        height: 141.9765625,
        x: 0,
        y: 0,
      },
    ])
  );

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
            <span className="text-white text-lg">Loading ExcaliDraw...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-indigo-900 via-purple-900 to-pink-800 relative min-h-screen flex flex-col text-white overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-32 -left-40 w-96 h-96 bg-gradient-to-br from-blue-400/15 to-indigo-400/15 rounded-full blur-3xl animate-bounce"
          style={{ animationDuration: "6s" }}
        ></div>
      </div>

      {/* Sidebar */}
      {showSidebar && (
        <div className="fixed inset-0 z-50 flex">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSidebar(false)}
          ></div>

          {/* Sidebar Content */}
          <div className="relative z-10 w-80 bg-white/10 backdrop-blur-md border-r border-white/20 shadow-2xl overflow-y-auto">
            <div className="p-6">
              <div className="flex items-center justify-between mb-6">
                <h2 className="text-xl font-bold text-white">My Drawings</h2>
                <button
                  onClick={() => setShowSidebar(false)}
                  className="p-2 text-white/70 hover:text-white transition-colors"
                >
                  <svg
                    className="w-5 h-5"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>

              <div className="space-y-3">
                {userDrawings.length === 0 ? (
                  <div className="text-white/60 text-center py-8">
                    No saved drawings yet
                  </div>
                ) : (
                  userDrawings.map(
                    (drawing: {
                      id: string;
                      drawingId: string;
                      updatedAt: string;
                    }) => (
                      <div
                        key={drawing.id}
                        className="bg-white/10 backdrop-blur-sm rounded-xl p-4 border border-white/20 hover:bg-white/20 transition-all duration-200 cursor-pointer"
                        onClick={() => loadSpecificDrawing(drawing.drawingId)}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h3 className="text-white font-medium">
                              Drawing: {drawing.drawingId}
                            </h3>
                            <p className="text-white/60 text-sm">
                              {new Date(drawing.updatedAt).toLocaleDateString()}
                            </p>
                          </div>
                          <svg
                            className="w-4 h-4 text-white/60"
                            fill="none"
                            stroke="currentColor"
                            viewBox="0 0 24 24"
                          >
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M9 5l7 7-7 7"
                            />
                          </svg>
                        </div>
                      </div>
                    )
                  )
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Glassmorphism Header */}
      <header className="relative z-10 backdrop-blur-md bg-white/10 border-b border-white/20 shadow-lg">
        <div className="px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.push("/")}
              className="px-4 py-2 bg-white/20 hover:bg-white/30 backdrop-blur-sm text-white rounded-xl transition-all duration-200 font-medium border border-white/30 hover:border-white/50"
              title="Go back to home"
            >
              ← Back
            </button>

            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-br from-purple-400 to-pink-400 rounded-xl flex items-center justify-center shadow-lg">
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
                    d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Collabify - ExcaliDraw
                </h1>
                <p className="text-white/70 text-sm">
                  Collaborative Whiteboard
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-6">
            {/* Save Button and My Drawings */}
            <div className="flex items-center gap-3">
              {/* My Drawings Button */}
              <button
                onClick={() => {
                  setShowSidebar(!showSidebar);
                  if (!showSidebar) {
                    loadUserDrawings();
                  }
                }}
                className="px-4 py-2 bg-purple-500/20 hover:bg-purple-500/30 backdrop-blur-sm text-purple-100 rounded-xl transition-all duration-200 font-medium border border-purple-400/30 hover:border-purple-400/50 shadow-lg"
                title="My saved drawings"
              >
                <div className="flex items-center gap-2">
                  <svg
                    className="w-4 h-4"
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
                  My Drawings
                </div>
              </button>

              {/* Save Button */}
              <button
                onClick={saveDrawing}
                disabled={isSaving}
                className={`px-4 py-2 rounded-xl font-medium transition-all duration-200 border ${
                  isSaving
                    ? "bg-gray-400/20 text-gray-300 cursor-not-allowed border-gray-400/30"
                    : "bg-green-500/20 hover:bg-green-500/30 text-green-100 border-green-400/30 hover:border-green-400/50 shadow-lg hover:shadow-xl"
                }`}
                title="Save drawing"
              >
                {isSaving ? (
                  <div className="flex items-center gap-2">
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                    Saving...
                  </div>
                ) : (
                  <div className="flex items-center gap-2">
                    <svg
                      className="w-4 h-4"
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
                    Save
                  </div>
                )}
              </button>
            </div>

            <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20">
              <span className="text-sm text-white/80">Session ID:</span>
              <span className="font-mono text-white font-medium ml-2">
                {sessionId}
              </span>
              <button
                onClick={() => {
                  if (typeof window !== "undefined") {
                    navigator.clipboard.writeText(
                      `${window.location.origin}/excalidraw/${sessionId}`
                    );
                  }
                }}
                className="ml-3 text-purple-300 hover:text-white transition-colors"
                title="Copy session link"
              >
                📋
              </button>
            </div>

            <div className="flex items-center gap-4">
              <div className="bg-white/10 backdrop-blur-sm rounded-2xl px-4 py-2 border border-white/20 flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <span
                    className={`w-3 h-3 rounded-full ${
                      isConnected ? "bg-green-400" : "bg-red-400"
                    } shadow-lg`}
                  ></span>
                  <span className="text-white font-medium">
                    {userDataRef.current.userName || "Guest"}
                  </span>
                </div>
                <span className="text-white/70 text-sm">
                  {isConnected ? "Online" : "Offline"}
                </span>
              </div>

              <div className="flex gap-1">
                {users.map((user: UserDataType, index: number) => (
                  <div
                    key={user.userId}
                    className={`text-white px-3 py-2 rounded-xl backdrop-blur-sm border border-white/20 text-sm font-medium ${
                      index > 0 && "-ml-2"
                    } hover:scale-105 transition-transform`}
                    style={{
                      background: `${user.userColor || "#666"}40`,
                      borderColor: user.userColor || "#666",
                    }}
                    title={user.userName ?? ""}
                  >
                    {user.userName || "Guest"}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 flex-1">
        <div
          className="relative bg-white/95 backdrop-blur-sm rounded-2xl m-4 shadow-2xl border border-white/20"
          style={{ height: "calc(100vh - 120px)" }}
        >
          <Excalidraw
            key={sessionId + (initialData ? "loaded" : "empty")}
            onPointerUpdate={handlePointerUpdate}
            onChange={handleExcalidrawChange}
            initialData={initialData as never}
          />

          {/* User Cursors */}
          {userCursors.map((item: UserCursor, index: number) => {
            return (
              <div
                key={index}
                className="absolute pointer-events-none"
                style={{
                  left: `${item.position.x}px`,
                  top: `${item.position.y}px`,
                  zIndex: 1000,
                }}
              >
                {/* Arrow Cursor */}
                <svg
                  width="24"
                  height="24"
                  viewBox="0 0 24 24"
                  className="absolute -translate-x-0.5 -translate-y-0.5"
                >
                  {/* Arrow shadow for better visibility */}
                  <path
                    d="M5.5 4.5L5.5 17.5L9.5 13.5L13.5 17.5L15.5 15.5L11.5 11.5L15.5 7.5L5.5 4.5Z"
                    fill="rgba(0,0,0,0.2)"
                    transform="translate(1,1)"
                  />
                  {/* Main arrow */}
                  <path
                    d="M5 4L5 17L9 13L13 17L15 15L11 11L15 7L5 4Z"
                    fill={item.userData.userColor || "#666"}
                    stroke="white"
                    strokeWidth="1"
                  />
                </svg>

                {/* Name Label */}
                <div
                  className="absolute left-5 top-0 text-white px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg backdrop-blur-sm border border-white/20"
                  style={{
                    backgroundColor: item.userData.userColor || "#666",
                  }}
                >
                  {item.userData.userName}
                  {/* Small triangle pointing to cursor */}
                  <div
                    className="absolute -left-1 top-1/2 -translate-y-1/2 w-0 h-0 border-t-2 border-b-2 border-r-2 border-transparent"
                    style={{
                      borderRightColor: item.userData.userColor || "#666",
                    }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      </main>

      {/* Toast Notification */}
      <Toast
        message={toast.message}
        type={toast.type}
        isVisible={toast.isVisible}
        onClose={hideToast}
      />
    </div>
  );
};

export default ExcalidrawWrapper;
