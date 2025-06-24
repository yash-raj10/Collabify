"use client";
import React, { use, useEffect, useRef, useState } from "react";
import { throttle, debounce } from "./utils";

const DocPage: React.FC = () => {
  const ws = useRef<WebSocket | null>(null);
  const [isClient, setIsClient] = useState(false);

  const throttleRef = useRef(
    throttle((payload) => {
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
    debounce((payload) => {
      console.log("debounce", payload);
      ws.current?.send(
        JSON.stringify({
          type: "content",
          data: payload,
        })
      );
    }, 400)
  );

  useEffect(() => {
    //(Hydration error fix)
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!isClient) return;

    ws.current = new WebSocket("ws://localhost:8080/ws");

    ws.current.addEventListener("open", () => {
      console.log("WebSocket connection established");
    });

    ws.current.addEventListener("message", (event) => {
      console.log("Received message:", event);
    });

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
    // console.log(e.currentTarget.innerHTML);
    throttleRef.current(e.currentTarget.innerHTML);
    debounceRef.current(e.currentTarget.innerHTML);
  };

  return (
    <div className="bg-gray-100 min-h-screen p-16 flex justify-center">
      <div
        className="bg-white h-[1124px] w-[784px] p-8 shadow-md relative"
        contentEditable
        onInput={handleInputTyping}
      ></div>
    </div>
  );
};

export default DocPage;
