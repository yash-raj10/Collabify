"use client";
import React, { use, useEffect, useRef, useState } from "react";
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

const DocPage: React.FC = () => {
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
    if (!contentArea.current) return;

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

  const handleInputTyping = (e: React.FormEvent<HTMLDivElement>) => {
    if (!e) {
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

  return (
    <div className="bg-gray-100 relative min-h-screen flex flex-col items-center">
      <div className="bg-white mb-4 p-4 flex justify-between shadow w-full">
        <span className="text-xl font-bold">Collabify</span>
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
      <div className="relative ">
        <div
          className="bg-white h-[1124px] w-[784px] p-8 shadow-md"
          contentEditable
          ref={contentArea}
          onInput={handleInputTyping}
        ></div>
        {userCursors.map((item: UserCursor, index: number) => {
          if (!contentArea.current) return null;

          const ContainerRect = contentArea.current.getBoundingClientRect();
          const relativeX = item.position.x - ContainerRect.left - 20;
          const relativeY = item.position.y - ContainerRect.top;

          return (
            <div
              key={index}
              className="absolute w-4 h-4 rounded-full"
              style={{
                position: "absolute",
                left: `${relativeX}px`,
                top: `${relativeY}px`,
                transform: "translate(-60%)",
                zIndex: 1000,
                pointerEvents: "none",
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  backgroundColor: item.userData.userColor ?? "",
                  color: "#fff",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "12px",
                  whiteSpace: "nowrap",
                }}
              >
                {item.userData.userName}
              </div>
              <div
                style={{
                  width: "2px",
                  height: "16px",
                  backgroundColor: item.userData.userColor ?? "",
                }}
              />
            </div>
          );
        })}
      </div>
    </div>

    // <div className="bg-gray-100 min-h-screen p-16 flex justify-center">
    //   <div
    //     className="bg-white h-[1124px] w-[784px] p-8 shadow-md relative"
    //     contentEditable
    //     ref={contentArea}
    //     onInput={handleInputTyping}
    //   ></div>
    // </div>
  );
};

export default DocPage;

//test
