"use client";
import React, { use, useEffect, useRef, useState } from "react";
import { throttle, debounce } from "./utils";

const DocPage: React.FC = () => {
  const ws = useRef<WebSocket | null>(null);
  const [isClient, setIsClient] = useState(false);
  const contentArea = useRef<HTMLDivElement | null>(null);

  const throttleRef = useRef(
    throttle(
      (payload: { content: string; position: { x: number; y: number } }) => {
        console.log("throttle", payload);
        ws.current?.send(
          JSON.stringify({
            type: "content",
            data: payload,
          })
        );
      },
      200
    )
  );

  const debounceRef = useRef(
    debounce(
      (payload: { content: string; position: { x: number; y: number } }) => {
        console.log("debounce", payload);
        ws.current?.send(
          JSON.stringify({
            type: "content",
            data: payload,
          })
        );
      },
      400
    )
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

    ws.current.addEventListener("message", handleServerResponse);

    return () => {
      if (ws.current) {
        ws.current.close();
      }
    };
  }, [isClient]);

  const handleServerResponse = (event: MessageEvent) => {
    const ParsedData = JSON.parse(event.data);
    if (ParsedData.type === "content") {
      console.log("Received content:", ParsedData.data.content);
      console.log("Cursor position:", ParsedData.data.position);
      contentArea.current!.innerHTML = ParsedData.data.content;
    }
  };

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
    throttleRef.current({
      content: e.currentTarget.innerHTML,
      position: { x: rect.left, y: rect.top },
    });
    debounceRef.current({
      content: e.currentTarget.innerHTML,
      position: { x: rect.left, y: rect.top },
    });
  };

  return (
    <div className="bg-gray-100 min-h-screen p-16 flex justify-center">
      <div
        className="bg-white h-[1124px] w-[784px] p-8 shadow-md relative"
        contentEditable
        ref={contentArea}
        onInput={handleInputTyping}
      ></div>
    </div>
  );
};

export default DocPage;
