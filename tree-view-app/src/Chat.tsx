import React, { useState, useRef, useEffect } from "react";

type ChatMessage = { text: string; from: "user" | "bot" | "log" };

type ChatProps = {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
};

type PreviewContent =
  | string
  | { type: "image"; src: string; alt: string }
  | null;

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage }) => {
  const [input, setInput] = useState("");

  const handleSend = () => {
    if (input.trim() === "") return;
    onSendMessage(input);
    // Do not clear input after sending
    // setInput("");
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

  // State to track which message was just copied
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // State for preview modal
  const [previewContent, setPreviewContent] = useState<PreviewContent>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");

  // Close preview on Esc key
  useEffect(() => {
    if (previewContent === null) return;
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === "Escape") setPreviewContent(null);
    };
    window.addEventListener("keydown", handleEsc);
    return () => window.removeEventListener("keydown", handleEsc);
  }, [previewContent]);

  // Copy handler
  const handleCopy = async (text: string, idx: number) => {
    // Remove "Echo:", "Selected file:", or "Deselected file:" prefix if present (case-insensitive, optional whitespace)
    let cleanText = text.replace(/^(Echo:|Selected file:|Deselected file:)\s*/i, "");
    try {
      await navigator.clipboard.writeText(cleanText);
      setCopiedIdx(idx);
      setTimeout(() => setCopiedIdx(null), 1200);
    } catch (e) {
      // fallback or error handling could go here
    }
  };

  // Preview handler for JSON files
  const handlePreview = async (msgText: string) => {
    // Extract file path from "Selected file: ..." message
    const match = msgText.match(/^Selected file:\s*(.+\.json)$/i);
    if (match) {
      let filePath = match[1].trim();
      // Always use /MENU/... as fetch path if present
      const menuIdx = filePath.indexOf("MENU/");
      if (menuIdx !== -1) {
        filePath = "/" + filePath.slice(menuIdx);
      } else if (!filePath.startsWith("/")) {
        filePath = "/" + filePath;
      }
      try {
        const res = await fetch(filePath, { headers: { Accept: "application/json" } });
        if (!res.ok) throw new Error("Failed to fetch file");
        const text = await res.text();
        // Try to pretty-print JSON, fallback to raw text if not valid JSON
        let displayText = text;
        try {
          displayText = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          // Not valid JSON, show as-is
        }
        setPreviewTitle(filePath.split("/").pop() || filePath);
        setPreviewContent(displayText);
      } catch (e) {
        setPreviewTitle("Error");
        setPreviewContent("Could not load file.");
      }
    }
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
          <div key={i} style={{ marginBottom: 0 }}>
            <div
              style={{
                margin: "8px 0",
                textAlign: msg.from === "user" ? "right" : "left",
                position: "relative",
                display: "flex",
                flexDirection: msg.from === "user" ? "row-reverse" : "row",
                alignItems: "center",
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
                  overflowX: "auto",
                  position: "relative",
                }}
              >
                {/* Extract image src and alt from the img tag in msg.text */}
                {(() => {
                  const imgMatch = msg.text.match(/<img[^>]*src=["']([^"']+)["'][^>]*alt=["']([^"']*)["'][^>]*>/i);
                  if (imgMatch) {
                    const imgSrc = imgMatch[1];
                    const imgAlt = imgMatch[2];
                    return (
                      <span style={{ display: "flex", alignItems: "center" }}>
                        <img
                          src={imgSrc}
                          alt={imgAlt}
                          style={{
                            display: "block",
                            width: 128,
                            maxWidth: "100%",
                            height: "auto",
                            margin: 0,
                            borderRadius: 4,
                            border: "1px solid #ccc",
                            cursor: "pointer"
                          }}
                          onClick={() => setPreviewContent({ type: "image", src: imgSrc, alt: imgAlt })}
                          title="Click to preview"
                        />
                        <button
                          onClick={() => setPreviewContent({ type: "image", src: imgSrc, alt: imgAlt })}
                          style={{
                            marginLeft: 8,
                            background: "none",
                            border: "none",
                            cursor: "pointer",
                            fontSize: 16,
                            color: "#28a745",
                            padding: 2,
                            position: "relative",
                          }}
                          title="Preview image"
                        >
                          Preview
                        </button>
                      </span>
                    );
                  }
                  // fallback: render as HTML if parsing fails
                  return (
                    <span
                      dangerouslySetInnerHTML={{
                        __html: msg.text.replace(
                          /<img\s/gi,
                          '<img style="display:block;width:384px;max-width:100%;height:auto;margin:0;" '
                        )
                      }}
                    />
                  );
                })()}
              </span>
            ) : (
              <>
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
                {(msg.from === "bot" || msg.from === "log") && (
                  <>
                    <button
                      onClick={() => handleCopy(msg.text, i)}
                      style={{
                        marginLeft: 8,
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        fontSize: 18,
                        color: "#007bff",
                        padding: 2,
                        position: "relative",
                      }}
                      title="Copy to clipboard"
                    >
                      {copiedIdx === i ? "✔️" : "📋"}
                    </button>
                    {/* Preview button for JSON file selection */}
                    {/^Selected file:\s*.+\.json$/i.test(msg.text) && (
                      <button
                        onClick={() => handlePreview(msg.text)}
                        style={{
                          marginLeft: 4,
                          background: "none",
                          border: "none",
                          cursor: "pointer",
                          fontSize: 16,
                          color: "#28a745",
                          padding: 2,
                          position: "relative",
                        }}
                        title="Preview JSON"
                      >
                        Preview
                      </button>
                    )}
                  </>
                )}
              </>
            )}
            </div>
            {/* Ask ChatGPT button under echo message */}
            {msg.from === "bot" && /^Echo:/i.test(msg.text) && (
              <div
                style={{
                  textAlign: "left",
                  margin: "0 0 8px 0",
                  paddingLeft: 24,
                  display: "flex",
                  alignItems: "center"
                }}
              >
                <button
                  onClick={async () => {
                    // Extract text and file paths from echo message
                    // Echo:\n[file paths]\n[user text]
                    const lines = msg.text.split("\n").map(l => l.trim()).filter(Boolean);
                    let files: string[] = [];
                    let userText = "";
                    if (lines.length > 1 && lines[0].toLowerCase().startsWith("echo:")) {
                      // If there are file paths, they are between Echo: and the last line
                      files = lines.slice(1, -1);
                      userText = lines[lines.length - 1];
                    } else if (lines.length === 2 && lines[0].toLowerCase().startsWith("echo:")) {
                      userText = lines[1];
                    } else {
                      userText = msg.text.replace(/^Echo:\s*/i, "");
                    }
                    // Placeholder: simulate API call and response
                    // TODO: Replace with real multimodal OpenAI API call
                    const reply = `ChatGPT multimodal (simulated):\nText: ${userText}\nFiles: ${files.join(", ") || "none"}`;
                    // Add response to chat
                    if (typeof onSendMessage === "function") {
                      onSendMessage(reply);
                    }
                  }}
                  style={{
                    fontSize: 15,
                    padding: "4px 14px",
                    borderRadius: 4,
                    background: "#10a37f",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    marginTop: 2,
                    marginBottom: 2,
                  }}
                >
                  Ask ChatGPT
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
      {/* Preview Modal */}
      {previewContent !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100vw",
            height: "100vh",
            background: "rgba(0,0,0,0.35)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
          onClick={() => setPreviewContent(null)}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 16px rgba(0,0,0,0.2)",
              padding: 24,
              minWidth: 320,
              maxWidth: "80vw",
              maxHeight: "80vh",
              overflow: "auto",
              position: "relative",
              display: "flex",
              flexDirection: "column",
              alignItems: "center"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%", marginBottom: 12 }}>
              <b>{previewTitle}</b>
              <button
                onClick={() => setPreviewContent(null)}
                style={{
                  background: "none",
                  border: "none",
                  color: "#c00",
                  fontWeight: "bold",
                  fontSize: 20,
                  cursor: "pointer",
                  marginLeft: 12,
                }}
                title="Close"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            {/* Show image or JSON/text based on previewContent type */}
            {previewContent && typeof previewContent === "object" && "type" in previewContent && previewContent.type === "image" ? (
              <img
                src={previewContent.src}
                alt={previewContent.alt}
                style={{
                  maxWidth: "70vw",
                  maxHeight: "65vh",
                  borderRadius: 8,
                  border: "1px solid #ccc",
                  background: "#f6f8fa",
                  margin: "0 auto",
                  display: "block"
                }}
              />
            ) : typeof previewContent === "string" ? (
              <pre
                style={{
                  background: "#f6f8fa",
                  borderRadius: 4,
                  padding: 12,
                  fontSize: 14,
                  maxHeight: "60vh",
                  overflow: "auto",
                  whiteSpace: "pre-wrap",
                  wordBreak: "break-all",
                  textAlign: "left",
                  fontFamily: "monospace",
                  margin: 0,
                }}
              >
                {previewContent}
              </pre>
            ) : null}
          </div>
        </div>
      )}
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
