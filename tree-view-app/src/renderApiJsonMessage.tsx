import React from "react";

/**
 * Renders a chat message that starts with `/api:` and contains JSON,
 * with green pretty-printing and left alignment.
 * @param msgText The message text, expected to start with `/api:` and a newline, then JSON.
 * @returns JSX.Element
 */
export function renderApiJsonMessage(msgText: string): React.ReactElement {
  if (msgText.startsWith("/api:")) {
    const firstNewline = msgText.indexOf("\n");
    const apiLine = msgText.slice(0, firstNewline);
    const jsonPart = msgText.slice(firstNewline + 1);
    try {
      const parsed = JSON.parse(jsonPart);
      return (
        <div style={{ textAlign: "left", margin: "8px 0 8px 24px" }}>
          <div
            style={{
              fontFamily: "monospace",
              fontSize: 13,
              color: "#888",
              marginBottom: 2,
              userSelect: "text",
            }}
          >
            {apiLine}
          </div>
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
            {JSON.stringify(parsed, null, 2)}
          </pre>
        </div>
      );
    } catch {
      // If parsing fails, show as plain text
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
          {msgText}
        </span>
      );
    }
  }
  // fallback: not an /api: message
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
      {msgText}
    </span>
  );
}
