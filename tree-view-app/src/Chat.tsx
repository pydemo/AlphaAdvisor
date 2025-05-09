import React, { useState } from "react";

type ChatMessage = { text: string; from: "user" | "bot" | "log" };

type ChatProps = {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
};

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;
    onSendMessage(input);
    setInput("");
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") handleSend();
  };

  // Handler for textarea keydown
  const handleTextareaKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (
      e.key === "Enter" &&
      !e.shiftKey &&
      !e.ctrlKey &&
      !e.altKey &&
      !e.metaKey
    ) {
      e.preventDefault();
      handleSend();
    }
    // If any modifier is pressed, allow default (insert newline)
  };

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid #ccc",
        padding: 16,
        boxSizing: "border-box",
        background: "#fafbfc",
      }}
    >
      <div style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}>
        {messages.length === 0 && (
          <div style={{ color: "#888", textAlign: "center", marginTop: 32 }}>
            Start the conversation...
          </div>
        )}
        {messages.map((msg, i) => (
          <div
            key={i}
            style={{
              margin: "8px 0",
              textAlign: msg.from === "user" ? "right" : "left",
            }}
          >
            <span
              style={{
                display: "inline-block",
                background:
                  msg.from === "user"
                    ? "#cce5ff"
                    : msg.from === "log"
                    ? "#ffeeba"
                    : "#e2e3e5",
                color: "#222",
                borderRadius: 8,
                padding: "6px 12px",
                maxWidth: "70%",
                wordBreak: "break-word",
                fontStyle: msg.from === "log" ? "italic" : undefined,
                whiteSpace: "pre-line",
              }}
            >
              {msg.text}
            </span>
          </div>
        ))}
      </div>
      <div style={{ display: "flex" }}>
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleTextareaKeyDown}
          placeholder="Type a message..."
          style={{
            flex: 1,
            fontSize: 16,
            padding: "6px 10px",
            borderRadius: 4,
            border: "1px solid #bbb",
            marginRight: 8,
            resize: "vertical",
            minHeight: 64,
            maxHeight: 200,
            lineHeight: 1.4,
          }}
        />
        <button
          onClick={handleSend}
          style={{
            fontSize: 16,
            padding: "6px 16px",
            borderRadius: 4,
            background: "#007bff",
            color: "#fff",
            border: "none",
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
};

export default Chat;
