"use client";
import React, { use, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { throttle, debounce } from "./utils";

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

interface DocPageProps {
  sessionId?: string;
}

const DocPage: React.FC<DocPageProps> = ({ sessionId = "default" }) => {
  const router = useRouter();
  const ws = useRef<WebSocket | null>(null);
  const [isClient, setIsClient] = useState(false);
  const contentArea = useRef<HTMLDivElement | null>(null);
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
    }, 200)
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
    }, 400)
  );

  const applyRemoteUpdate = (remoteContent: string): void => {
    if (!contentArea.current || !isClient) return;

    try {
      const selection = window.getSelection();
      let savedRange: Range | null = null;

      if (selection && selection.rangeCount > 0) {
        savedRange = selection.getRangeAt(0).cloneRange();
      }

      const scrollTop = contentArea.current.scrollTop;
      const scrollLeft = contentArea.current.scrollLeft;

      contentArea.current.innerHTML = remoteContent;

      contentArea.current.scrollTop = scrollTop;
      contentArea.current.scrollLeft = scrollLeft;

      if (savedRange && selection) {
        try {
          selection.addRange(savedRange);
          contentArea.current.focus();
        } catch (error) {
          console.error("Error restoring selection range:", error);
        }
      }
    } catch (error) {
      console.error("Error applying remote update:", error);
    }
  };

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
          console.log("Applying remote content update");
          applyRemoteUpdate(contentMsg.data.content);
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
    if (!isClient) return;

    // Get JWT token from localStorage
    const token = localStorage.getItem("authToken");
    if (!token) {
      console.error("No auth token found");
      return;
    }

    ws.current = new WebSocket(
      `ws://localhost:8080/ws?session=${sessionId}&token=${token}`
    );

    ws.current.addEventListener("open", () => {
      console.log("WebSocket connection established");
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
  }, [isClient, sessionId]);

  const handleInputTyping = (e: React.FormEvent<HTMLDivElement>) => {
    if (!e || !isClient) {
      return;
    }

    const sel = window.getSelection();
    const range = sel?.getRangeAt(0);
    const rect = range?.getBoundingClientRect();
    if (!rect || rect.top <= 0) {
      return;
    }

    // console.log({
    //   x: rect?.left,
    //   y: rect?.top,
    // });

    // console.log(e.currentTarget.innerHTML);
    const payload: ContentPayload = {
      content: e.currentTarget.innerHTML,
      position: { x: rect.left, y: rect.top },
      userData: userDataRef.current,
    };

    throttleRef.current(payload);
    debounceRef.current(payload);
  };

  // Prevent hydration mismatch by not rendering until client-side
  if (!isClient) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-900 via-teal-900 to-emerald-800 flex items-center justify-center">
        <div className="bg-white/10 backdrop-blur-lg rounded-3xl p-8 border border-white/20">
          <div className="flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-white/30 border-t-white rounded-full animate-spin mr-3"></div>
            <span className="text-white text-lg">
              Loading Document Editor...
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-900 via-teal-900 to-emerald-800 relative min-h-screen flex flex-col text-black overflow-hidden">
      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-teal-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div
          className="absolute top-32 -left-40 w-96 h-96 bg-gradient-to-br from-emerald-400/15 to-green-400/15 rounded-full blur-3xl animate-bounce"
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
              <div className="w-10 h-10 bg-gradient-to-br from-blue-400 to-teal-400 rounded-xl flex items-center justify-center shadow-lg">
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
                    d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"
                  />
                </svg>
              </div>
              <div>
                <h1 className="text-xl font-bold text-white">
                  Collabify - Doc Online
                </h1>
                <p className="text-white/70 text-sm">
                  Collaborative Document Editor
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
                      `${window.location.origin}/doc/${sessionId}`
                    );
                  }
                }}
                className="ml-3 text-blue-300 hover:text-white transition-colors"
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

      <main className="relative z-10 flex-1 flex items-center justify-center p-6">
        <div className="relative bg-white rounded-2xl shadow-2xl border border-white/20 overflow-hidden text-2xl">
          <div
            className="bg-white h-[1124px] w-[784px] p-8 "
            contentEditable
            ref={contentArea}
            onInput={handleInputTyping}
          ></div>

          {/* User Cursors */}
          {userCursors.map((item: UserCursor, index: number) => {
            if (!contentArea.current) return null;

            const ContainerRect = contentArea.current.getBoundingClientRect();
            const relativeX = item.position.x - ContainerRect.left - 20;
            const relativeY = item.position.y - ContainerRect.top;

            return (
              <div
                key={index}
                className="absolute pointer-events-none"
                style={{
                  left: `${relativeX}px`,
                  top: `${relativeY}px`,
                  zIndex: 1000,
                }}
              >
                <div
                  className="text-white px-2 py-1 rounded-lg text-xs font-medium whitespace-nowrap shadow-lg backdrop-blur-sm border border-white/20"
                  style={{
                    backgroundColor: item.userData.userColor ?? "#666",
                  }}
                >
                  {item.userData.userName}
                </div>
                <div
                  className="w-0.5 h-4 mt-1"
                  style={{
                    backgroundColor: item.userData.userColor ?? "#666",
                  }}
                />
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
};

export default DocPage;

//test
