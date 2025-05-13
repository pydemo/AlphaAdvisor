import React from "react";

type ConversionTabProps = {
  input: string;
  setInput: (input: string) => void;
  handleSend: () => void;
  handleTextareaKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
};

const ConversionTab: React.FC<ConversionTabProps> = ({
  input,
  setInput,
  handleSend,
  handleTextareaKeyDown,
}) => (
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
);

export default ConversionTab;
