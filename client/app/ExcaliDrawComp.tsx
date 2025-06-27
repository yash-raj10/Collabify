"use client";
import React, { useEffect, useRef, useState } from "react";
import {
  Excalidraw,
  convertToExcalidrawElements,
} from "@excalidraw/excalidraw";
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

const ExcalidrawWrapper: React.FC = () => {
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
    if (!isClient) return;

    ws.current = new WebSocket("ws://localhost:8080/ws");

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
  }, [isClient]);

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

  return (
    <div className="bg-gray-100 relative min-h-screen flex flex-col items-center">
      <div className="bg-white mb-4 p-4 flex justify-between shadow w-full">
        <span className="text-xl font-bold">Collabify - ExcaliDraw</span>
        <div>
          <span className="mr-4 font-bold">
            {userDataRef.current.userName || "Guest"}
          </span>
          <span
            className={`inline-block w-3 h-3 rounded-full mr-2 ${
              isConnected ? "bg-green-500" : "bg-red-500"
            }`}
          ></span>
          <span>{isConnected ? "Connected" : "Disconnected"}</span>
        </div>
        <div className="flex gap-2 truncate max-w-48">
          {users.map((user: UserDataType, index: number) => (
            <div
              key={user.userId}
              className={`text-white px-2 py-1 rounded-full ${
                index > 0 && "-ml-4"
              }`}
              style={{ background: `${user.userColor}` }}
              title={user.userName ?? ""}
            >
              {user.userName || "Guest"}
            </div>
          ))}
        </div>
      </div>
      <div className="relative w-full h-full">
        <div style={{ height: "calc(100vh - 80px)", width: "100vw" }}>
          <Excalidraw onPointerUpdate={handlePointerUpdate} />
        </div>
        {userCursors.map((item: UserCursor, index: number) => {
          return (
            <div
              key={index}
              className="absolute"
              style={{
                position: "absolute",
                left: `${item.position.x}px`,
                top: `${item.position.y + 80}px`, // Offset for header
                zIndex: 1000,
                pointerEvents: "none",
              }}
            >
              {/* Arrow Cursor */}
              <svg
                width="24"
                height="24"
                viewBox="0 0 24 24"
                style={{
                  position: "absolute",
                  transform: "translate(-2px, -2px)",
                }}
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
                style={{
                  position: "absolute",
                  left: "20px",
                  top: "0px",
                  backgroundColor: item.userData.userColor || "#666",
                  color: "#fff",
                  padding: "4px 8px",
                  borderRadius: "6px",
                  fontSize: "12px",
                  fontWeight: "500",
                  whiteSpace: "nowrap",
                  boxShadow: "0 2px 8px rgba(0,0,0,0.15)",
                  border: "1px solid rgba(255,255,255,0.2)",
                  fontFamily: "system-ui, -apple-system, sans-serif",
                }}
              >
                {item.userData.userName}
                {/* Small triangle pointing to cursor */}
                <div
                  style={{
                    position: "absolute",
                    left: "-4px",
                    top: "50%",
                    transform: "translateY(-50%)",
                    width: "0",
                    height: "0",
                    borderTop: "4px solid transparent",
                    borderBottom: "4px solid transparent",
                    borderRight: `4px solid ${
                      item.userData.userColor || "#666"
                    }`,
                  }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
export default ExcalidrawWrapper;
