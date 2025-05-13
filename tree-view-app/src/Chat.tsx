import React, { useState, useRef, useEffect } from "react";
import MessageTabsAndSendButton from "./MessageTabsAndSendButton";
import { apiConfig } from "./apiConfig";

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

type TabType = "Conversion" | "No Image" | "General";
type SetTab = (tab: TabType) => void;

interface ChatPropsWithSetTab extends ChatProps {
  tab: TabType;
  setTab: SetTab;
  setTabExternal?: SetTab;
  saveAppState?: () => void;
  elementSelectorMode?: boolean; // DEV: highlight/copy element name
  onContextMenu?: (e: React.MouseEvent) => void;

  // Per-tab input state and handlers
  conversionInput: string;
  setConversionInput: React.Dispatch<React.SetStateAction<string>>;
  noImageInput: string;
  setNoImageInput: React.Dispatch<React.SetStateAction<string>>;
  generalInput: string;
  setGeneralInput: React.Dispatch<React.SetStateAction<string>>;
  handleSend: () => void;
  handleNoImageSend: () => void;
  handleGeneralSend: () => void;
  handleTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

const Chat: React.FC<ChatPropsWithSetTab> = ({
  messages,
  onSendMessage: _onSendMessage,
  onReplaceLastBotMessage,
  tab,
  setTab,
  setTabExternal,
  saveAppState,
  elementSelectorMode = false,
  onContextMenu,
  conversionInput,
  setConversionInput,
  noImageInput,
  setNoImageInput,
  generalInput,
  setGeneralInput,
  handleSend,
  handleNoImageSend,
  handleGeneralSend,
  handleTextareaKeyDown,
}) => {
  // No internal per-tab chat histories; use props.messages and props.onSendMessage

  // Listen for NoImageChat send event to add echo message to No Image tab only
  React.useEffect(() => {
    function handleNoImageChatSend(e: any) {
      const text = e.detail?.text || "";
      if (!text) return;
      if (tab === "No Image") {
        _onSendMessage(text);
      }
    }
    window.addEventListener("noImageChatSend", handleNoImageChatSend as EventListener);
    return () => {
      window.removeEventListener("noImageChatSend", handleNoImageChatSend as EventListener);
    };
  }, [tab, _onSendMessage]);
  // Map of message index to { json: string, show: boolean }
  const [jsonResults, setJsonResults] = useState<{ [idx: number]: { json: string; show: boolean } }>({});
  // Per-tab input state and send handlers should be managed at a higher level or passed as props

  // No local handleTextareaKeyDown; use the prop version everywhere

  // Ref for chat feed container
  const chatFeedRef = useRef<HTMLDivElement>(null);

  // State to track which message was just copied
  const [copiedIdx, setCopiedIdx] = useState<number | null>(null);

  // State for preview modal
  const [previewContent, setPreviewContent] = useState<PreviewContent>(null);
  const [previewTitle, setPreviewTitle] = useState<string>("");
  const [previewFullPath, setPreviewFullPath] = useState<string>("");
  // State for copy feedback in preview modal
  const [previewCopied, setPreviewCopied] = useState(false);

  // State for Ask ChatGPT progress indicator and loading state
  const [askLoadingIdx, setAskLoadingIdx] = useState<number | null>(null);
  const [askLoading, setAskLoading] = useState(false);
  // State for Streamed button progress indicator and content
  const [streamedLoadingIdx, setStreamedLoadingIdx] = useState<number | null>(null);
  const [streamedContent, setStreamedContent] = useState<string>("");

  // Helper function to scroll to bottom
  const scrollToBottom = () => {
    const feed = chatFeedRef.current;
    if (feed) {
      feed.scrollTop = feed.scrollHeight;
    }
  };

  // Auto-scroll to bottom when messages change, including after images load
  useEffect(() => {
    const feed = chatFeedRef.current;
    if (!feed) return;

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

  // Auto-scroll when streaming content updates
  useEffect(() => {
    if (streamedContent) {
      scrollToBottom();
    }
  }, [streamedContent]);

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
    // Remove __JSON_FROM_STREAM__ prefix if present
    if (cleanText.startsWith("__JSON_FROM_STREAM__")) {
      cleanText = cleanText.replace("__JSON_FROM_STREAM__", "");
    }
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
        setPreviewFullPath(jsonPath.startsWith("/") ? jsonPath : "/" + jsonPath);
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
      const originalFullPath = match[1].trim();
      setPreviewFullPath(originalFullPath);
      let filePath = originalFullPath;
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
          // Show full absolute path as title
          setPreviewTitle(originalFullPath);
          setPreviewContent(displayText);
        }
      } catch (e) {
        setPreviewTitle("Error");
        setPreviewContent("Could not load file.");
      }
    }
  };

  // Use props.messages and props.onSendMessage directly

  return (
    <div
      data-element-name="Chat"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100%",
        borderLeft: "1px solid #ccc",
        padding: 16,
        boxSizing: "border-box",
        background: "#fafbfc",
        position: "relative",
        outline: elementSelectorMode ? "2.5px dashed #ffb700" : undefined,
        boxShadow: elementSelectorMode ? "0 0 0 3px #ffe066" : undefined,
        cursor: elementSelectorMode ? "copy" : undefined,
        transition: "box-shadow 0.15s, outline 0.15s"
      }}
      title={elementSelectorMode ? "Click to copy element name: Chat" : undefined}
      onClick={e => {
        if (elementSelectorMode) {
          e.stopPropagation();
          const refName = "Chat.tsx:Chat";
          if (navigator.clipboard) {
            navigator.clipboard.writeText(refName);
          }
          // Optionally show a quick feedback
          const el = e.currentTarget as HTMLElement;
          el.style.background = "#fffbe6";
          setTimeout(() => {
            el.style.background = "";
          }, 350);
        }
      }}
      onContextMenu={onContextMenu}
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
        {messages
          .filter((msg) => {
            if (tab === "General") {
              // Only show Echo messages and their associated user messages in the General tab
              if (msg.from === "bot" && /^Echo:/i.test(msg.text)) return true;
              // Show the user message immediately preceding an Echo message
              const idx = messages.indexOf(msg);
              if (
                msg.from === "user" &&
                messages[idx + 1] &&
                messages[idx + 1].from === "bot" &&
                /^Echo:/i.test(messages[idx + 1].text)
              ) {
                return true;
              }
              return false;
            } else {
              // In Conversion tab, show all messages (including Echo)
              return true;
            }
          })
          .map((msg, i) => (
            <div key={i} style={{ marginBottom: 0 }}>
              {/* Echo tab simulation button above Echo message */}
              {msg.from === "bot" && /^Echo:/i.test(msg.text) && (
                <div
                  style={{
                    textAlign: "left",
                    margin: "0 0 2px 0",
                    paddingLeft: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <button
                    style={{
                      background: "#e6f0ff",
                      color: "#003366",
                      border: "1.5px solid #007bff",
                      borderRadius: 4,
                      padding: "4px 18px",
                      fontSize: 15,
                      fontWeight: 600,
                      cursor: "default",
                      marginRight: 8
                    }}
                    disabled
                    title="Echo context"
                  >
                    Echo
                  </button>
                </div>
              )}
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
                      // Check if this is JSON from the streamed endpoint (marked with __JSON_FROM_STREAM__)
                      if (msg.text.startsWith("__JSON_FROM_STREAM__")) {
                        const jsonContent = msg.text.replace("__JSON_FROM_STREAM__", "");
                        try {
                          const parsed = JSON.parse(jsonContent);
                          return (
                            <pre
                              style={{
                                background: "#f0fff4",
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
                                color: "#1e7e34",
                                border: "1px solid #c3e6cb",
                                boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                              }}
                            >
                              {JSON.stringify(parsed, null, 2)}
                            </pre>
                          );
                        } catch {
                          // If parsing fails, remove the marker and display as normal text
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
                              {msg.text.replace("__JSON_FROM_STREAM__", "")}
                            </span>
                          );
                        }
                      }
                      
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
                      
                      // Check if the message contains JSON data from the backend
                      // This handles the case where the backend returns JSON inside a content field
                      if (msg.text.includes('"success":true') && msg.text.includes('"content":')) {
                        try {
                          const responseObj = JSON.parse(msg.text);
                          if (responseObj.success && responseObj.content) {
                            try {
                              // Try to parse the content field as JSON
                              const contentObj = JSON.parse(responseObj.content);
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
                                  {JSON.stringify(contentObj, null, 2)}
                                </pre>
                              );
                            } catch {
                              // If content is not valid JSON, display it as is
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
                                  {responseObj.content}
                                </pre>
                              );
                            }
                          }
                        } catch {}
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
                    {/* Show JSON result under Echo message if toggled on */}
                    {msg.from === "bot" && /^Echo:/i.test(msg.text) && jsonResults && jsonResults[i] && jsonResults[i].show && (
                      <pre
                        style={{
                          background: "#e6f0ff",
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
                          color: "#003366",
                          border: "1.5px solid #007bff",
                          boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                          fontWeight: 500
                        }}
                      >
                        {jsonResults[i].json}
                      </pre>
                    )}
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
              {/* Streaming content display */}
              {streamedLoadingIdx === i && streamedContent && (
                <div style={{ marginLeft: 24, marginTop: 8, marginBottom: 8 }}>
                  <pre
                    style={{
                      background: "#f0fff4",
                      borderRadius: 4,
                      padding: "12px 16px",
                      fontSize: 14,
                      maxWidth: "70%",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      textAlign: "left",
                      fontFamily: "monospace",
                      margin: 0,
                      color: "#1e7e34",
                      border: "1px solid #c3e6cb",
                      boxShadow: "0 1px 2px rgba(0,0,0,0.03)",
                    }}
                  >
                    {(() => {
                      // Try to pretty-print JSON if possible
                      try {
                        const parsed = JSON.parse(streamedContent);
                        if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) {
                          return JSON.stringify(parsed, null, 2);
                        }
                      } catch {}
                      // If not valid JSON or parsing fails, return as is
                      return streamedContent;
                    })()}
                  </pre>
                </div>
              )}
              {/* Ask ChatGPT button under echo message */}
              {msg.from === "bot" && /^Echo:/i.test(msg.text) && (
                <div
                  style={{
                    textAlign: "left",
                    margin: "0 0 8px 0",
                    paddingLeft: 24,
                    display: "flex",
                    alignItems: "center",
                    gap: 12
                  }}
                >
                  <button
                    style={{
                      background: askLoadingIdx === i ? "#0056b3" : "#007bff",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 16px",
                      fontSize: 15,
                      cursor: askLoadingIdx === i ? "wait" : "pointer",
                      marginRight: 8,
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    disabled={askLoadingIdx !== null}
                    onClick={async () => {
                      // Extract image path from Echo message
                      const match = msg.text.match(/(?:^Echo:\s*)?((?:.*\.(?:png|jpg|jpeg))(?:\n|$))/im);
                      const imagePath = match ? match[1].trim() : null;
                      if (!imagePath) {
                        alert("No image path found in Echo message.");
                        return;
                      }
                      
                      // Set loading state
                      setAskLoadingIdx(i);
                      setAskLoading(true);
                      
                      // POST to /api/ask-chatgpt
                      try {
                        // Use global config for endpoint
                        const endpoint = apiConfig[tab]?.["Ask ChatGPT"] || "/api/ask-chatgpt";
                        const res = await fetch(endpoint, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({ target_path: imagePath })
                        });
                        const data = await res.json();
                        if (data && data.success && data.content) {
                          // Add response as a new bot message
                          if (typeof onReplaceLastBotMessage === "function") {
                            // Try to parse and format the content as JSON before replacing
                            try {
                              // Check if the content is wrapped in code block
                              let contentToFormat = data.content;
                              const codeBlockMatch = contentToFormat.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                              if (codeBlockMatch) {
                                contentToFormat = codeBlockMatch[1];
                              }
                              
                              // Try to parse as JSON
                              const parsed = JSON.parse(contentToFormat);
                              if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) {
                                // If it's valid JSON, replace with the pretty-printed version and add a special marker
                                // to identify it as JSON from the streamed endpoint
                                onReplaceLastBotMessage("__JSON_FROM_STREAM__" + JSON.stringify(parsed, null, 2));
                              } else {
                                // If it's not an object or array, just use the original content
                                onReplaceLastBotMessage(data.content);
                              }
                            } catch (err) {
                              // If parsing fails, use the original content
                              onReplaceLastBotMessage(data.content);
                            }
                          }
                        } else {
                          alert("API error: " + (data.error || "Unknown error"));
                        }
                      } catch (err) {
                        alert("Request failed: " + err);
                      } finally {
                        // Clear loading state
                        setAskLoadingIdx(null);
                        setAskLoading(false);
                      }
                    }}
                  >
                    {askLoadingIdx === i ? (
                      <>
                        <span 
                          style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderRadius: "50%",
                            borderTopColor: "#fff",
                            animation: "spin-ask-cgpt 1s linear infinite",
                            marginRight: "8px"
                          }}
                        />
                        Loading...
                      </>
                    ) : "Ask ChatGPT"}
                  </button>
                  <button
                    style={{
                      background: streamedLoadingIdx === i ? "#1e7e34" : "#28a745",
                      color: "#fff",
                      border: "none",
                      borderRadius: 4,
                      padding: "6px 16px",
                      fontSize: 15,
                      cursor: streamedLoadingIdx === i ? "wait" : "pointer",
                      position: "relative",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    disabled={streamedLoadingIdx !== null}
                    onClick={async () => {
                      // Extract image path from Echo message
                      const match = msg.text.match(/(?:^Echo:\s*)?((?:.*\.(?:png|jpg|jpeg))(?:\n|$))/im);
                      const imagePath = match ? match[1].trim() : null;
                      if (!imagePath) {
                        alert("No image path found in Echo message.");
                        return;
                      }
                      
                      // Set loading state
                      setStreamedLoadingIdx(i);
                      setStreamedContent("");
                      
                      try {
                        // Create a new AbortController to allow cancelling the fetch
                        const controller = new AbortController();
                        const signal = controller.signal;
                        
                        // Start the fetch with streaming
                        // Use global config for endpoint
                        const endpoint = apiConfig[tab]?.["Streamed"] || "/api/ask-chatgpt_streamed";
                        const response = await fetch(endpoint, {
                          method: "POST",
                          headers: { "Content-Type": "application/json" },
                          body: JSON.stringify({
                            target_path: imagePath,
                            user_message: tab === "General" ? generalInput : conversionInput
                          }),
                          signal
                        });
                        
                        if (!response.ok) {
                          const errorData = await response.json();
                          throw new Error(errorData.error || "Unknown error");
                        }
                        
                        // Process the stream
                        const reader = response.body?.getReader();
                        if (!reader) {
                          throw new Error("Failed to get stream reader");
                        }
                        
                        // Read the stream
                        let accumulatedContent = "";
                        while (true) {
                          const { done, value } = await reader.read();
                          if (done) break;
                          
                          // Convert the chunk to text
                          const chunk = new TextDecoder().decode(value);
                          accumulatedContent += chunk;
                          
                          // Update the UI with the accumulated content
                          setStreamedContent(accumulatedContent);
                        }
                        
                        // When stream is complete, replace the last bot message
                        if (typeof onReplaceLastBotMessage === "function") {
                          // Try to parse and format the content as JSON before replacing
                          try {
                            // Check if the content is wrapped in code block
                            let contentToFormat = accumulatedContent;
                            const codeBlockMatch = contentToFormat.match(/```(?:json)?\s*([\s\S]*?)\s*```/);
                            if (codeBlockMatch) {
                              contentToFormat = codeBlockMatch[1];
                            }
                            
                            // Try to parse as JSON
                            const parsed = JSON.parse(contentToFormat);
                            if (parsed && (typeof parsed === "object" || Array.isArray(parsed))) {
                              // If it's valid JSON, replace with the pretty-printed version and add the special marker
                              onReplaceLastBotMessage("__JSON_FROM_STREAM__" + JSON.stringify(parsed, null, 2));
                            } else {
                              // If it's not an object or array, just use the original content
                              onReplaceLastBotMessage(accumulatedContent);
                            }
                          } catch (err) {
                            // If parsing fails, use the original content
                            onReplaceLastBotMessage(accumulatedContent);
                          }
                        }
                      } catch (err) {
                        console.error("Streaming error:", err);
                        alert("Streaming failed: " + err);
                      } finally {
                        // Clear loading state
                        setStreamedLoadingIdx(null);
                        setStreamedContent("");
                      }
                    }}
                  >
                    {streamedLoadingIdx === i ? (
                      <>
                        <span 
                          style={{
                            display: "inline-block",
                            width: "16px",
                            height: "16px",
                            border: "2px solid rgba(255,255,255,0.3)",
                            borderRadius: "50%",
                            borderTopColor: "#fff",
                            animation: "spin-streamed 1s linear infinite",
                            marginRight: "8px"
                          }}
                        />
                        Streaming...
                      </>
                    ) : "Streamed"}
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
              <div style={{ display: "flex", flexDirection: "row", gap: 24, alignItems: "stretch", maxWidth: "90vw", height: "75vh" }}>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "space-between", flex: 1 }}>
                  <div style={{ display: "flex", justifyContent: "center", alignItems: "center", flex: 1, overflow: "hidden" }}>
                    <img
                      src={previewContent.imageSrc}
                      alt={previewContent.imageAlt}
                      style={{
                        maxWidth: "20vw",
                        maxHeight: "65vh",
                        borderRadius: 8,
                        border: "1px solid #ccc",
                        background: "#f6f8fa",
                        display: "block"
                      }}
                    />
                  </div>
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
                <div style={{ display: "flex", flexDirection: "column", flex: 3, height: "100%" }}>
                  <textarea
                    value={typeof previewContent.json === "string" ? previewContent.json : ""}
                    onChange={e => {
                      if (typeof previewContent.json === "string") {
                        setPreviewContent({
                          ...previewContent,
                          json: e.target.value
                        });
                      }
                    }}
                    style={{
                      background: "#f6f8fa",
                      borderRadius: 4,
                      padding: 18,
                      fontSize: 16,
                      flex: 1,
                      width: "100%",
                      minWidth: "600px",
                      maxWidth: "100%",
                      overflow: "auto",
                      whiteSpace: "pre-wrap",
                      wordBreak: "break-all",
                      textAlign: "left",
                      fontFamily: "monospace",
                      margin: 0,
                      border: "1px solid #bbb",
                      resize: "none"
                    }}
                  />
                  <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "flex-end" }}>
                    <button
                      style={{
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
                          navigator.clipboard.writeText(
                            typeof previewContent.json === "string" ? previewContent.json : ""
                          );
                        } else {
                          // fallback for older browsers
                          const textarea = document.createElement("textarea");
                          textarea.value = typeof previewContent.json === "string" ? previewContent.json : "";
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
                    <button
                      style={{
                        fontSize: 15,
                        padding: "4px 18px",
                        borderRadius: 4,
                        background: "#007bff",
                        color: "#fff",
                        border: "1.5px solid #007bff",
                        alignSelf: "flex-end",
                        transition: "all 0.15s"
                      }}
                      disabled={!previewContent.json || (typeof previewContent.json === "string" && !previewContent.json.trim())}
                      onClick={async (e) => {
                        e.preventDefault();
                        e.stopPropagation();

                        if (typeof saveAppState === "function") {
                          saveAppState();
                        }

                        // Use previewFullPath for full path to file
                        const filePath = previewFullPath;

                        // Map web path to full filesystem path
                        const PUBLIC_ROOT = "/home/alexb/myg/cla_2/tree-view-app/public";
                        
                        // Check if the path already contains the PUBLIC_ROOT to avoid duplication
                        let fullPath;
                        if (filePath.startsWith(PUBLIC_ROOT)) {
                          // Path already has the PUBLIC_ROOT, use it directly
                          fullPath = filePath;
                        } else {
                          // Path doesn't have PUBLIC_ROOT, need to add it
                          let relPath = filePath;
                          if (relPath.startsWith("/MENU/")) {
                            relPath = "/MENU/" + relPath.split("/MENU/")[1];
                          } else if (relPath.startsWith("/public/")) {
                            relPath = relPath.replace(/^\/public/, "");
                          }
                          fullPath = PUBLIC_ROOT + relPath;
                        }
                        
                        const lastSlash = fullPath.lastIndexOf("/");
                        const file_name = lastSlash !== -1 ? fullPath.slice(lastSlash + 1) : fullPath;
                        const dir_path = lastSlash !== -1 ? fullPath.slice(0, lastSlash) : PUBLIC_ROOT;

                        try {
                          const res = await fetch("http://localhost:3002/api/save-json-file", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              dir_path,
                              file_name,
                              full_path: fullPath,
                              json_text: typeof previewContent.json === "string" ? previewContent.json : ""
                            })
                          });
                          const data = await res.json();
                          if (data && data.success) {
                            setPreviewContent(null);
                          } else {
                            alert("Save failed: " + (data.error || "Unknown error"));
                          }
                        } catch (err) {
                          alert("Save request failed: " + err);
                        }
                        return false;
                      }}
                      title="Save JSON"
                    >
                      Save
                    </button>
                  </div>
                </div>
              </div>
            ) : typeof previewContent === "string" ? (
              <>
                <textarea
                  value={previewContent}
                  onChange={e => setPreviewContent(e.target.value)}
                  style={{
                    background: "#f6f8fa",
                    borderRadius: 4,
                    padding: 16,
                    fontSize: 15,
                    height: "60vh",
                    minHeight: "350px",
                    maxHeight: "80vh",
                    width: "100%",
                    minWidth: "340px",
                    maxWidth: "100%",
                    overflow: "auto",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-all",
                    textAlign: "left",
                    fontFamily: "monospace",
                    margin: 0,
                    border: "1px solid #bbb",
                    resize: "vertical"
                  }}
                />
                {/* Copy and Save buttons for JSON file preview */}
                {previewTitle.endsWith('.json') && (
                  <div style={{ display: "flex", gap: 12, marginTop: 12, justifyContent: "flex-end" }}>
                    <button
                      style={{
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
                    <button
                      style={{
                        fontSize: 15,
                        padding: "4px 18px",
                        borderRadius: 4,
                        background: "#007bff",
                        color: "#fff",
                        border: "1.5px solid #007bff",
                        alignSelf: "flex-end",
                        transition: "all 0.15s"
                      }}
                      onClick={async (e) => {
                        // Prevent any default behavior that might cause page refresh
                        e.preventDefault();
                        e.stopPropagation();

                        // Call saveAppState before saving, if provided
                        if (typeof saveAppState === "function") {
                          saveAppState();
                        }

                        // Parse file path from previewTitle
                        // Use previewFullPath for full path to file
                        const filePath = previewFullPath;
                        const lastSlash = filePath.lastIndexOf("/");
                        const dir_path = lastSlash !== -1 ? filePath.slice(0, lastSlash) : "";
                        const file_name = lastSlash !== -1 ? filePath.slice(lastSlash + 1) : filePath;
                        try {
                          const res = await fetch("http://localhost:3002/api/save-json-file", {
                            method: "POST",
                            headers: { "Content-Type": "application/json" },
                            body: JSON.stringify({
                              dir_path,
                              file_name,
                              full_path: filePath,
                              json_text: typeof previewContent === "string" ? previewContent : ""
                            })
                          });
                          const data = await res.json();
                          if (data && data.success) {
                            // Only close the modal, do not reload or reset app state
                            setPreviewContent(null);
                          } else {
                            alert("Save failed: " + (data.error || "Unknown error"));
                          }
                        } catch (err) {
                          alert("Save request failed: " + err);
                        }

                        // Return false to prevent any form submission
                        return false;
                      }}
                      title="Save JSON"
                    >
                      Save
                    </button>
                  </div>
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
        input={conversionInput}
        setInput={setConversionInput}
        generalInput={generalInput}
        setGeneralInput={setGeneralInput}
        handleSend={handleSend}
        handleGeneralSend={handleGeneralSend}
        handleTextareaKeyDown={handleTextareaKeyDown}
        elementSelectorMode={elementSelectorMode}
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

@keyframes spin-streamed {
  0% { transform: rotate(0deg);}
  100% { transform: rotate(360deg);}
}
`;
if (typeof document !== "undefined" && !document.getElementById("ask-cgpt-spinner-style")) {
  style.id = "ask-cgpt-spinner-style";
  document.head.appendChild(style);
}
