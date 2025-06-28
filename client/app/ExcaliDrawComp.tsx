"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
import { useRouter } from "next/navigation";
import { throttle, debounce } from "./utils";

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

type WSMessage = UserMessage | ContentMessage;

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

  const throttleRef = useRef(
    throttle((payload: ContentPayload) => {
      console.log("throttle", payload);
      ws.current?.send(
        JSON.stringify({
          type: "content",
          data: payload,
        })
      );
    }, 100)
  );

  const debounceRef = useRef(
    debounce((payload: ContentPayload) => {
      console.log("debounce", payload);
      ws.current?.send(
        JSON.stringify({
          type: "content",
          data: payload,
        })
      );
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

  const handleServerResponse = (event: MessageEvent) => {
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
  };

  useEffect(() => {
    //(Hydration error fix)
    setIsClient(true);
  }, []);

  useEffect(() => {
    const connectWebSocket = () => {
      if (!isClient) return;

      // Get JWT token from localStorage
      const token = localStorage.getItem("authToken");
      if (!token) {
        console.error("No auth token found");
        return;
      }

      // Include session ID and token in WebSocket connection
      ws.current = new WebSocket(
        `ws://localhost:8080/ws?session=${sessionId}&token=${token}`
      );

      ws.current.addEventListener("open", () => {
        console.log(
          `WebSocket connection established for session: ${sessionId}`
        );
        setIsConnected(true);
      });

      ws.current.addEventListener("close", () => {
        console.log("WebSocket connection closed");
        setIsConnected(false);
      });

      ws.current.addEventListener("error", (error) => {
        console.error("WebSocket error:", error);
        setIsConnected(false);
      });

      ws.current.addEventListener("message", handleServerResponse);

      return () => {
        if (ws.current) {
          ws.current.close();
        }
      };
    };

    connectWebSocket();
  }, [isClient, sessionId]);

  const handlePointerUpdate = (payload: any) => {
    if (
      payload.pointer &&
      payload.pointer.x !== undefined &&
      payload.pointer.y !== undefined
    ) {
      const position = {
        x: payload.pointer.x,
        y: payload.pointer.y,
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
          <Excalidraw onPointerUpdate={handlePointerUpdate} />

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
    </div>
  );
};

export default ExcalidrawWrapper;
