import React from "react";

type NoImageChatProps = {
  input: string;
  setInput: (input: string) => void;
  onSendMessage: (text: string) => void;
};

const NoImageChat: React.FC<NoImageChatProps> = ({
  input,
  setInput,
  onSendMessage,
}) => {
  const handleSend = () => {
    if (input.trim() === "") return;
    onSendMessage(input);
    // Do not clear input after sending
    // setInput("");
  };

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
  };

  return (
    <div style={{ display: "flex" }}>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={handleTextareaKeyDown}
        placeholder="Type a message (No Image)..."
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
};

export default NoImageChat;
