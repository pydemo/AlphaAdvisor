import React from "react";
import ConversionTab from "./ConversionTab";

type MessageTabsAndSendButtonProps = {
  tab: "Conversion" | "General";
  setTab: (tab: "Conversion" | "General") => void;
  input: string;
  setInput: (input: string) => void;
  generalInput: string;
  setGeneralInput: (input: string) => void;
  handleSend: () => void;
  handleGeneralSend: () => void;
  handleTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
  elementSelectorMode?: boolean; // DEV: highlight/copy element name
};

const MessageTabsAndSendButton: React.FC<MessageTabsAndSendButtonProps> = ({
  tab,
  setTab,
  input,
  setInput,
  generalInput,
  setGeneralInput,
  handleSend,
  handleGeneralSend,
  handleTextareaKeyDown,
  elementSelectorMode = false,
}) => (
  <div
    data-element-name="MessageTabsAndSendButton"
    style={{
      marginTop: 8,
      position: "relative",
      outline: elementSelectorMode ? "2.5px dashed #ffb700" : undefined,
      boxShadow: elementSelectorMode ? "0 0 0 3px #ffe066" : undefined,
      cursor: elementSelectorMode ? "copy" : undefined,
      transition: "box-shadow 0.15s, outline 0.15s"
    }}
    title={elementSelectorMode ? "Click to copy element name: MessageTabsAndSendButton" : undefined}
    onClick={e => {
      if (elementSelectorMode) {
        e.stopPropagation();
        const refName = "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton";
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
  >
    {/* Tab bar */}
    <div
      style={{
        display: "flex",
        borderBottom: "1px solid #ccc",
        marginBottom: 0,
      }}
    >
      <div
        style={{
          padding: "8px 24px",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: tab === "Conversion" ? "#fff" : "#f3f3f3",
          border: "1px solid #ccc",
          borderBottom: tab === "Conversion" ? "none" : "1px solid #ccc",
          fontWeight: 600,
          color: tab === "Conversion" ? "#007bff" : "#555",
          cursor: tab === "Conversion" ? "default" : "pointer",
          marginRight: 4,
        }}
        onClick={() => setTab("Conversion")}
      >
        Conversion
      </div>
      <div
        style={{
          padding: "8px 24px",
          borderTopLeftRadius: 8,
          borderTopRightRadius: 8,
          background: tab === "General" ? "#fff" : "#f3f3f3",
          border: "1px solid #ccc",
          borderBottom: tab === "General" ? "none" : "1px solid #ccc",
          fontWeight: 600,
          color: tab === "General" ? "#007bff" : "#555",
          cursor: tab === "General" ? "default" : "pointer",
        }}
        onClick={() => setTab("General")}
      >
        General
      </div>
    </div>
    {/* Tab content */}
    <div
      style={{
        border: "1px solid #ccc",
        borderTop: "none",
        borderBottomLeftRadius: 8,
        borderBottomRightRadius: 8,
        padding: 12,
        background: "#fff",
      }}
    >
      {tab === "Conversion" ? (
        <ConversionTab
          input={input}
          setInput={setInput}
          handleSend={handleSend}
          handleTextareaKeyDown={handleTextareaKeyDown}
        />
      ) : (
        <div style={{ display: "flex" }}>
          <textarea
            value={generalInput}
            onChange={(e) => setGeneralInput(e.target.value)}
            onKeyDown={e => {
              if (
                e.key === "Enter" &&
                !e.shiftKey &&
                !e.ctrlKey &&
                !e.altKey &&
                !e.metaKey
              ) {
                e.preventDefault();
                handleGeneralSend();
              }
            }}
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
            onClick={handleGeneralSend}
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
      )}
    </div>
  </div>
);

export default MessageTabsAndSendButton;
