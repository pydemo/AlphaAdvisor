import React, { useState } from "react";
import "./App.css";
import TreeView from "./TreeView";
import Chat from "./Chat";

function App() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");

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
          <TreeView dataUrl="/tree-data.json" filter={search} />
        </div>
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
        <Chat />
      </div>
    </div>
  );
}

export default App;
