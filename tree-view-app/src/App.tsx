import React from "react";
import "./App.css";
import TreeView from "./TreeView";

function App() {
  return (
    <div className="App">
      <h2>Directory Tree Viewer</h2>
      <TreeView dataUrl="/tree-data.json" />
    </div>
  );
}

export default App;
