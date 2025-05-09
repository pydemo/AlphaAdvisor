import React, { useState } from "react";
import "./App.css";
import TreeView from "./TreeView";

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
    <div className="App">
      <h2>Directory Tree Viewer</h2>
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
      <TreeView dataUrl="/tree-data.json" filter={search} />
    </div>
  );
}

export default App;
