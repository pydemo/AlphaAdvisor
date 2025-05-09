import React, { useState, useRef, useEffect } from "react";

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

  // Ref for chat feed container
  const chatFeedRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when messages change, including after images load
  useEffect(() => {
    const feed = chatFeedRef.current;
    if (!feed) return;

    // Helper to scroll to bottom
    const scrollToBottom = () => {
      feed.scrollTop = feed.scrollHeight;
    };

    // Scroll immediately (for text or already loaded images)
    scrollToBottom();

    // For images that may not be loaded yet, scroll after they load
    const imgs = feed.querySelectorAll("img");
    let loadedCount = 0;
    imgs.forEach((img) => {
      if (img.complete) {
        loadedCount++;
      } else {
        img.addEventListener("load", scrollToBottom);
        img.addEventListener("error", scrollToBottom);
      }
    });

    // If all images are already loaded, no need to do anything else
    if (imgs.length === loadedCount) return;

    // Cleanup listeners on unmount or messages change
    return () => {
      imgs.forEach((img) => {
        img.removeEventListener("load", scrollToBottom);
        img.removeEventListener("error", scrollToBottom);
      });
    };
  }, [messages]);

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
      <div
        ref={chatFeedRef}
        style={{ flex: 1, overflowY: "auto", marginBottom: 12 }}
      >
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
            {(msg.from === "log" || msg.from === "bot") && /<img\s/i.test(msg.text) ? (
              <span
                style={{
                  display: "block",
                  background:
                    msg.from === "log"
                      ? "#ffeeba"
                      : "#e2e3e5",
                  color: "#222",
                  borderRadius: 8,
                  padding: "6px 12px",
                  maxWidth: "100%",
                  wordBreak: "break-word",
                  fontStyle: msg.from === "log" ? "italic" : undefined,
                  whiteSpace: "pre-line",
                  overflowX: "auto"
                }}
                dangerouslySetInnerHTML={{
                  __html: msg.text.replace(
                    /<img\s/gi,
                    '<img style="display:block;width:384px;max-width:100%;height:auto;margin:0;" '
                  )
                }}
              />
            ) : (
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
            )}
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
            minHeight: 164,
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
