import React, { useState } from "react";
import "./App.css";
import TreeView from "./TreeView";
import Chat from "./Chat";

type ChatMessage = { text: string; from: "user" | "bot" | "log" };

function App() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedObjects, setSelectedObjects] = useState<{ name: string; path: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
  };

  const handleSearch = () => {
    setSearch(filter);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      handleSearch();
    }
  };

  // Called when a file is double-clicked in the tree
  const handleFileDoubleClick = (node: { name: string; path: string }) => {
    setSelectedObjects((prev) => {
      if (prev.some((obj) => obj.path === node.path)) {
        // Deselect: remove from selectedObjects
        return prev.filter((obj) => obj.path !== node.path);
      }
      // Select: add to selectedObjects
      return [...prev, { name: node.name, path: node.path }];
    });
    setChatMessages((prev) => {
      if (selectedObjects.some((obj) => obj.path === node.path)) {
        // Deselect message
        return [
          ...prev,
          { text: `Deselected file: ${node.path}`, from: "log" },
        ];
      }
      // Select message
      return [
        ...prev,
        { text: `Selected file: ${node.path}`, from: "log" },
      ];
    });
  };

  // Called when user sends a chat message
  const handleSendMessage = (text: string) => {
    setChatMessages((prev) => [...prev, { text, from: "user" }]);
    // Capture selected files/dirs at the time of sending
    const selectedList = selectedObjects.map(obj => obj.path).join("\n");
    setTimeout(() => {
      setChatMessages((prev) => [
        ...prev,
        {
          text:
            selectedList
              ? `Echo:\n${selectedList}\n${text}`
              : `Echo:\n${text}`,
          from: "bot"
        }
      ]);
    }, 500);
  };

  return (
    <div
      className="App"
      style={{
        display: "flex",
        flexDirection: "row",
        height: "100vh",
        minHeight: 0,
        minWidth: 0,
      }}
    >
      {/* Left: Tree panel */}
      <div
        style={{
          flex: "0 0 420px",
          minWidth: 320,
          maxWidth: 600,
          borderRight: "1px solid #ccc",
          display: "flex",
          flexDirection: "column",
          padding: 24,
          boxSizing: "border-box",
          background: "#fff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Directory Tree Viewer</h2>
        <div style={{ marginBottom: 12 }}>
          <input
            type="text"
            value={filter}
            onChange={handleInputChange}
            onKeyDown={handleKeyDown}
            placeholder="Filter..."
            style={{ fontSize: 16, padding: "4px 8px", marginRight: 8 }}
          />
          <button onClick={handleSearch} style={{ fontSize: 16, padding: "4px 12px" }}>
            Search
          </button>
        </div>
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <TreeView
            dataUrl="/tree-data.json"
            filter={search}
            onFileDoubleClick={handleFileDoubleClick}
            selectedPaths={selectedObjects.map((obj) => obj.path)}
          />
        </div>
        {/* Optionally, show selected objects */}
        {selectedObjects.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 14 }}>
            <b>Selected files:</b>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {selectedObjects.map((obj) => (
                <li key={obj.path} style={{ wordBreak: "break-all" }}>
                  {obj.name}
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {/* Right: Chat panel */}
      <div
        style={{
          flex: "1 1 0",
          minWidth: 0,
          height: "100vh",
          display: "flex",
          flexDirection: "column",
        }}
      >
        <Chat
          messages={chatMessages}
          onSendMessage={handleSendMessage}
        />
      </div>
    </div>
  );
}

export default App;
