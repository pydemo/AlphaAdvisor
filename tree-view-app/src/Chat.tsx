import React, { useState, useRef, useEffect } from "react";
import MessageTabsAndSendButton from "./MessageTabsAndSendButton";

type ChatMessage = { text: string; from: "user" | "bot" | "log" };

type ChatProps = {
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  onReplaceLastBotMessage?: (text: string) => void;
};

type PreviewContent =
  | string
  | { type: "image"; src: string; alt: string }
  | { type: "json+image"; json: string; imageSrc: string; imageAlt: string }
  | null;

const Chat: React.FC<ChatProps> = ({ messages, onSendMessage, onReplaceLastBotMessage }) => {
  const [input, setInput] = useState("Convert this menu screenshot of Sony 'a7rV' to json including brief description of each menu option.");
  const [generalInput, setGeneralInput] = useState("");
  const [tab, setTab] = useState<"Conversion" | "General">("Conversion");

  const handleSend = () => {
    if (input.trim() === "") return;
    onSendMessage(input);
    // Do not clear input after sending
    // setInput("");
  };

  const handleGeneralSend = () => {
    if (generalInput.trim() === "") return;
    onSendMessage(generalInput);
    // Do not clear input after sending
    // setGeneralInput("");
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
  // State for copy feedback in preview modal
  const [previewCopied, setPreviewCopied] = useState(false);

  // State for Ask ChatGPT progress indicator
  const [askLoadingIdx, setAskLoadingIdx] = useState<number | null>(null);
  // State for Streamed button progress indicator
  const [streamedLoadingIdx, setStreamedLoadingIdx] = useState<number | null>(null);

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

  // Preview handler for image files (dual preview if sibling JSON exists)
  const handleImagePreview = async (imgSrc: string, imgAlt: string) => {
    // Try to find sibling JSON file
    try {
      // Remove query/hash if present
      const cleanImgSrc = imgSrc.split(/[?#]/)[0];
      const jsonPath = cleanImgSrc.replace(/\.png$/i, ".json");
      // For debugging: log the computed JSON path
      // eslint-disable-next-line no-console
      console.log("Checking for JSON sibling at:", jsonPath);
      const jsonRes = await fetch(jsonPath, { method: "GET", headers: { Accept: "application/json" } });
      if (jsonRes.ok) {
        const text = await jsonRes.text();
        let displayText = text;
        try {
          displayText = JSON.stringify(JSON.parse(text), null, 2);
        } catch {
          // Not valid JSON, show as-is
        }
        // Show dual preview
        setPreviewTitle(`Selected file: ${imgAlt}.png + ${imgAlt}.json`);
        setPreviewContent({
          type: "json+image",
          json: displayText,
          imageSrc: imgSrc,
          imageAlt: imgAlt
        });
        return;
      }
    } catch (err) {
      // eslint-disable-next-line no-console
      console.log("Error checking JSON sibling:", err);
    }
    // Fallback: show image only
    setPreviewTitle(`Selected file: ${imgAlt}.png`);
    setPreviewContent({ type: "image", src: imgSrc, alt: imgAlt });
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
        // Check for sibling PNG
        const jsonFileName = filePath.split("/").pop() || "";
        const dirPath = filePath.slice(0, filePath.lastIndexOf("/"));
        const baseName = jsonFileName.replace(/\.json$/i, "");
        const pngPath = `${dirPath}/${baseName}.png`;
        let pngExists = false;
        try {
          // For debugging: log the computed PNG path
          // eslint-disable-next-line no-console
          console.log("Checking for PNG sibling at:", pngPath);
          // Use GET instead of HEAD, as some static servers don't support HEAD
          const pngRes = await fetch(pngPath, { method: "GET" });
          pngExists = pngRes.ok;
        } catch (err) {
          // eslint-disable-next-line no-console
          console.log("Error checking PNG sibling:", err);
        }
        if (pngExists) {
          setPreviewTitle(`Selected file: ${jsonFileName} + ${baseName}.png`);
          setPreviewContent({
            type: "json+image",
            json: displayText,
            imageSrc: pngPath,
            imageAlt: baseName
          });
        } else {
          setPreviewTitle(`Selected file: ${jsonFileName}`);
          setPreviewContent(displayText);
        }
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
                          onClick={() => handleImagePreview(imgSrc, imgAlt)}
                          title="Click to preview"
                        />
                        <button
                          onClick={() => handleImagePreview(imgSrc, imgAlt)}
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
                {msg.from === "bot" && (() => {
                  // Try to pretty-print JSON if possible
                  let parsed: any = null;
                  try {
                    parsed = JSON.parse(msg.text);
                  } catch {}
                  if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) {
                    return (
                      <pre
                        style={{
                          background: "#f6f8fa",
                          borderRadius: 4,
                          padding: "12px 16px",
                          fontSize: 14,
                          maxWidth: "70%",
                          overflow: "auto",
                          whiteSpace: "pre-wrap",
                          wordBreak: "break-all",
                          textAlign: "left",
                          fontFamily: "monospace",
                          margin: "8px 0 8px 24px",
                          color: "#222",
                          border: "1px solid #e1e4e8",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                        }}
                      >
                        {JSON.stringify(parsed, null, 2)}
                      </pre>
                    );
                  }
                  // fallback to plain text
                  return (
                    <span
                      style={{
                        display: "inline-block",
                        background: "#e2e3e5",
                        color: "#222",
                        borderRadius: 8,
                        padding: "6px 12px",
                        maxWidth: "70%",
                        wordBreak: "break-word",
                        whiteSpace: "pre-line",
                      }}
                    >
                      {msg.text}
                    </span>
                  );
                })()}
                {msg.from !== "bot" && (
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
                    setAskLoadingIdx(i);
                    const start = Date.now();
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
                    // Find the first file path that looks like a PNG
                    const imagePath = files.find(f => /\.png$/i.test(f));
                    if (!imagePath) {
                      setAskLoadingIdx(null);
                      if (typeof onSendMessage === "function") {
                        onSendMessage("Error: No image file found to send to ChatGPT.");
                      }
                      return;
                    }
                    try {
                      const res = await fetch("/api/ask-chatgpt", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ target_path: imagePath })
                      });
                      if (!res.ok) {
                        setAskLoadingIdx(null);
                        const err = await res.json();
                        if (typeof onSendMessage === "function") {
                          onSendMessage("Error from ChatGPT API: " + (err.error || "Unknown error"));
                        }
                        return;
                      }
                      const data = await res.json();
                      setAskLoadingIdx(null);
                      // Ensure the user's question is preserved before replacing Echo
                      if (
                        onReplaceLastBotMessage &&
                        (!messages[i - 1] || messages[i - 1].from !== "user" || messages[i - 1].text !== userText)
                      ) {
                        if (typeof onSendMessage === "function") {
                          onSendMessage(userText);
                        }
                        setTimeout(() => {
                          onReplaceLastBotMessage!(data.content || "No response from ChatGPT.");
                        }, 0);
                      } else if (onReplaceLastBotMessage) {
                        onReplaceLastBotMessage(data.content || "No response from ChatGPT.");
                      } else if (typeof onSendMessage === "function") {
                        onSendMessage(data.content || "No response from ChatGPT.");
                      }
                      // No elapsed time message
                    } catch (err) {
                      setAskLoadingIdx(null);
                      // Ensure the user's question is preserved before replacing Echo
                      if (
                        onReplaceLastBotMessage &&
                        (!messages[i - 1] || messages[i - 1].from !== "user" || messages[i - 1].text !== userText)
                      ) {
                        if (typeof onSendMessage === "function") {
                          onSendMessage(userText);
                        }
                        setTimeout(() => {
                          onReplaceLastBotMessage!("Network error calling ChatGPT API: " + err);
                        }, 0);
                      } else if (onReplaceLastBotMessage) {
                        onReplaceLastBotMessage("Network error calling ChatGPT API: " + err);
                      } else if (typeof onSendMessage === "function") {
                        onSendMessage("Network error calling ChatGPT API: " + err);
                      }
                      // No elapsed time message
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
                    marginRight: 8
                  }}
                  disabled={askLoadingIdx === i}
                >
                  Ask ChatGPT
                  {askLoadingIdx === i && (
                    <span
                      style={{
                        marginLeft: 8,
                        display: "inline-block",
                        width: 18,
                        height: 18,
                        border: "2.5px solid #fff",
                        borderTop: "2.5px solid #10a37f",
                        borderRadius: "50%",
                        animation: "spin-ask-cgpt 0.7s linear infinite",
                        verticalAlign: "middle"
                      }}
                      title="Loading..."
                    />
                  )}
                </button>
                <button
                  onClick={async () => {
                    setStreamedLoadingIdx(i);
                    const start = Date.now();
                    // Extract text and file paths from echo message
                    const lines = msg.text.split("\n").map(l => l.trim()).filter(Boolean);
                    let files: string[] = [];
                    let userText = "";
                    if (lines.length > 1 && lines[0].toLowerCase().startsWith("echo:")) {
                      files = lines.slice(1, -1);
                      userText = lines[lines.length - 1];
                    } else if (lines.length === 2 && lines[0].toLowerCase().startsWith("echo:")) {
                      userText = lines[1];
                    } else {
                      userText = msg.text.replace(/^Echo:\s*/i, "");
                    }
                    const imagePath = files.find(f => /\.png$/i.test(f));
                    if (!imagePath) {
                      setStreamedLoadingIdx(null);
                      if (typeof onSendMessage === "function") {
                        onSendMessage("Error: No image file found to send to ChatGPT.");
                        const elapsed = ((Date.now() - start) / 1000).toFixed(2);
                        onSendMessage(`Elapsed: ${elapsed}s`);
                      }
                      return;
                    }
                    // Streaming fetch using ReadableStream
                    try {
                      const res = await fetch("/api/ask-chatgpt_streamed", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ target_path: imagePath })
                      });
                      if (!res.ok || !res.body) {
                        setStreamedLoadingIdx(null);
                        const err = await res.json();
                        if (typeof onSendMessage === "function") {
                          onSendMessage("Error from ChatGPT API (streamed): " + (err.error || "Unknown error"));
                          const elapsed = ((Date.now() - start) / 1000).toFixed(2);
                          onSendMessage(`Elapsed: ${elapsed}s`);
                        }
                        return;
                      }
                      // Add a new bot message and stream into it
                      let streamed = "";
                      // Do not add a user message, only show streamed content
                      const reader = res.body.getReader();
                      let done = false;
                      while (!done) {
                        const { value, done: doneReading } = await reader.read();
                        done = doneReading;
                        if (value) {
                          const chunk = new TextDecoder().decode(value);
                          streamed += chunk;
                      // Only show streamed content as bot message
                      // Ensure the user's question is preserved before replacing Echo
                      if (
                        onReplaceLastBotMessage &&
                        (!messages[i - 1] || messages[i - 1].from !== "user" || messages[i - 1].text !== userText)
                      ) {
                        if (typeof onSendMessage === "function") {
                          onSendMessage(userText);
                        }
                        setTimeout(() => {
                          onReplaceLastBotMessage!(streamed);
                        }, 0);
                      } else if (onReplaceLastBotMessage) {
                        onReplaceLastBotMessage(streamed);
                      } else if (typeof onSendMessage === "function") {
                        onSendMessage(streamed);
                      }
                        }
                      }
                      setStreamedLoadingIdx(null);
                      // No elapsed time message
                    } catch (err) {
                      setStreamedLoadingIdx(null);
                      // Ensure the user's question is preserved before replacing Echo
                      if (
                        onReplaceLastBotMessage &&
                        (!messages[i - 1] || messages[i - 1].from !== "user" || messages[i - 1].text !== userText)
                      ) {
                        if (typeof onSendMessage === "function") {
                          onSendMessage(userText);
                        }
                        setTimeout(() => {
                          onReplaceLastBotMessage!("Network error calling ChatGPT API (streamed): " + err);
                        }, 0);
                      } else if (onReplaceLastBotMessage) {
                        onReplaceLastBotMessage("Network error calling ChatGPT API (streamed): " + err);
                      } else if (typeof onSendMessage === "function") {
                        onSendMessage("Network error calling ChatGPT API (streamed): " + err);
                      }
                      // No elapsed time message
                    }
                  }}
                  style={{
                    fontSize: 15,
                    padding: "4px 14px",
                    borderRadius: 4,
                    background: "#007bff",
                    color: "#fff",
                    border: "none",
                    cursor: "pointer",
                    marginTop: 2,
                    marginBottom: 2
                  }}
                  disabled={streamedLoadingIdx === i}
                >
                  Streamed
                  {streamedLoadingIdx === i && (
                    <span
                      style={{
                        marginLeft: 8,
                        display: "inline-block",
                        width: 18,
                        height: 18,
                        border: "2.5px solid #fff",
                        borderTop: "2.5px solid #007bff",
                        borderRadius: "50%",
                        animation: "spin-ask-cgpt 0.7s linear infinite",
                        verticalAlign: "middle"
                      }}
                      title="Loading..."
                    />
                  )}
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
              <>
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
                <button
                  style={{
                    marginTop: 18,
                    fontSize: 15,
                    padding: "4px 18px",
                    borderRadius: 4,
                    background: previewCopied ? "#d4edda" : "#eee",
                    color: previewCopied ? "#388e3c" : "#333",
                    border: previewCopied ? "1.5px solid #388e3c" : "1px solid #bbb",
                    alignSelf: "center",
                    transition: "all 0.15s"
                  }}
                  onClick={async () => {
                    try {
                      const response = await fetch(previewContent.src, { mode: "cors" });
                      const blob = await response.blob();
                      // Try to use the original type, fallback to image/png
                      const type = blob.type || "image/png";
                      const clipboardItem = new window.ClipboardItem({ [type]: blob });
                      await navigator.clipboard.write([clipboardItem]);
                    } catch (e) {
                      // fallback: show error or do nothing
                    }
                    setPreviewContent(null);
                  }}
                  title="Copy image to clipboard"
                >
                  {previewCopied ? "✔ Copied" : "Copy"}
                </button>
              </>
            ) : previewContent && typeof previewContent === "object" && "type" in previewContent && previewContent.type === "json+image" ? (
              <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "flex-start", maxWidth: "75vw" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                  <img
                    src={previewContent.imageSrc}
                    alt={previewContent.imageAlt}
                    style={{
                      maxWidth: "32vw",
                      maxHeight: "60vh",
                      borderRadius: 8,
                      border: "1px solid #ccc",
                      background: "#f6f8fa",
                      display: "block"
                    }}
                  />
                  <button
                    style={{
                      marginTop: 12,
                      fontSize: 15,
                      padding: "4px 18px",
                      borderRadius: 4,
                      background: previewCopied ? "#d4edda" : "#eee",
                      color: previewCopied ? "#388e3c" : "#333",
                      border: previewCopied ? "1.5px solid #388e3c" : "1px solid #bbb",
                      alignSelf: "center",
                      transition: "all 0.15s"
                    }}
                    onClick={async () => {
                      try {
                        const response = await fetch(previewContent.imageSrc, { mode: "cors" });
                        const blob = await response.blob();
                        const type = blob.type || "image/png";
                        const clipboardItem = new window.ClipboardItem({ [type]: blob });
                        await navigator.clipboard.write([clipboardItem]);
                      } catch (e) {
                        // fallback: show error or do nothing
                      }
                      setPreviewContent(null);
                    }}
                    title="Copy image to clipboard"
                  >
                    {previewCopied ? "✔ Copied" : "Copy"}
                  </button>
                </div>
                <div style={{ display: "flex", flexDirection: "column", flex: 1 }}>
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
                    {previewContent.json}
                  </pre>
                  <button
                    style={{
                      marginTop: 12,
                      fontSize: 15,
                      padding: "4px 18px",
                      borderRadius: 4,
                      background: previewCopied ? "#d4edda" : "#eee",
                      color: previewCopied ? "#388e3c" : "#333",
                      border: previewCopied ? "1.5px solid #388e3c" : "1px solid #bbb",
                      alignSelf: "flex-end",
                      transition: "all 0.15s"
                    }}
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(previewContent.json);
                      } else {
                        // fallback for older browsers
                        const textarea = document.createElement("textarea");
                        textarea.value = previewContent.json;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textarea);
                      }
                      setPreviewContent(null);
                    }}
                    title="Copy JSON to clipboard"
                  >
                    {previewCopied ? "✔ Copied" : "Copy"}
                  </button>
                </div>
              </div>
            ) : typeof previewContent === "string" ? (
              <>
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
                {/* Copy button for JSON file preview */}
                {/^Selected file: .+\.json$/i.test(previewTitle) && (
                  <button
                    style={{
                      marginTop: 12,
                      fontSize: 15,
                      padding: "4px 18px",
                      borderRadius: 4,
                      background: previewCopied ? "#d4edda" : "#eee",
                      color: previewCopied ? "#388e3c" : "#333",
                      border: previewCopied ? "1.5px solid #388e3c" : "1px solid #bbb",
                      alignSelf: "flex-end",
                      transition: "all 0.15s"
                    }}
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(previewContent);
                      } else {
                        // fallback for older browsers
                        const textarea = document.createElement("textarea");
                        textarea.value = previewContent;
                        document.body.appendChild(textarea);
                        textarea.select();
                        document.execCommand("copy");
                        document.body.removeChild(textarea);
                      }
                      setPreviewContent(null);
                    }}
                    title="Copy JSON to clipboard"
                  >
                    {previewCopied ? "✔ Copied" : "Copy"}
                  </button>
                )}
              </>
            ) : null}
          </div>
        </div>
      )}
      {/* Tabbed input area */}
      <MessageTabsAndSendButton
        tab={tab}
        setTab={setTab}
        input={input}
        setInput={setInput}
        generalInput={generalInput}
        setGeneralInput={setGeneralInput}
        handleSend={handleSend}
        handleGeneralSend={handleGeneralSend}
        handleTextareaKeyDown={handleTextareaKeyDown}
      />
    </div>
  );
};

export default Chat;

// Spinner animation for Ask ChatGPT button
const style = document.createElement("style");
style.innerHTML = `
@keyframes spin-ask-cgpt {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
`;
if (typeof document !== "undefined" && !document.getElementById("ask-cgpt-spinner-style")) {
  style.id = "ask-cgpt-spinner-style";
  document.head.appendChild(style);
}
