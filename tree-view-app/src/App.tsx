import React, { useState, useEffect } from "react";
import "./App.css";
import TreeView from "./TreeView";
import Chat from "./Chat";
import TreeFilterBar from "./TreeFilterBar";

type ChatMessage = { text: string; from: "user" | "bot" | "log" };

function App() {
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedObjects, setSelectedObjects] = useState<{ name: string; path: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<ChatMessage[]>([]);
  const [expandAllSignal, setExpandAllSignal] = useState(0);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  const [tab, setTab] = useState<"Conversion" | "General">("Conversion");
  const [expandedPaths, setExpandedPaths] = useState<string[]>([]);
  // Element selector mode for development
  const [elementSelectorMode, setElementSelectorMode] = useState(false);

  // Save state to localStorage
  const saveAppState = () => {
    const state = {
      filter,
      search,
      selectedObjects,
      chatMessages,
      expandAllSignal,
      collapseAllSignal,
      tab,
      expandedPaths,
    };
    try {
      localStorage.setItem("treeChatAppState", JSON.stringify(state));
    } catch (e) {
      // ignore
    }
  };

  // Restore state from localStorage on mount
  useEffect(() => {
    try {
      const stateStr = localStorage.getItem("treeChatAppState");
      if (stateStr) {
        const state = JSON.parse(stateStr);
        if (typeof state.filter === "string") setFilter(state.filter);
        if (typeof state.search === "string") setSearch(state.search);
        if (Array.isArray(state.selectedObjects)) setSelectedObjects(state.selectedObjects);
        if (Array.isArray(state.chatMessages)) setChatMessages(state.chatMessages);
        if (typeof state.expandAllSignal === "number") setExpandAllSignal(state.expandAllSignal);
        if (typeof state.collapseAllSignal === "number") setCollapseAllSignal(state.collapseAllSignal);
        if (state.tab === "Conversion" || state.tab === "General") setTab(state.tab);
        if (Array.isArray(state.expandedPaths)) setExpandedPaths(state.expandedPaths);
        // Optionally clear after restoring
        localStorage.removeItem("treeChatAppState");
      }
    } catch (e) {
      // ignore
    }
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFilter(e.target.value);
    setSearch(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    // No-op: live filter, no need to handle Enter
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
      const newMessages: ChatMessage[] = [
        ...prev,
        { text: `Selected file: ${node.path}`, from: "log" as const },
      ];
      if (/\.(png|jpe?g)$/i.test(node.path)) {
        // Use the actual file path for the image source
        let imgSrc;
        if (node.path.includes('/MENU')) {
          imgSrc = `/MENU${node.path.split('/MENU')[1]}`;
        } else {
          imgSrc = `/${node.path.replace(/^(\.\/|\/)/, '')}`;
        }
        newMessages.push({
          text: `<img src="${imgSrc}" alt="${node.name}" style="width:256px;max-width:100%;border-radius:4px;border:1px solid #ccc;margin-top:4px;" />`,
          from: "bot" as const
        });
      }
      return newMessages;
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
          flex: "0 0 600px",
          minWidth: 400,
          maxWidth: 900,
          borderRight: "1px solid #ccc",
          display: "flex",
          flexDirection: "column",
          padding: 24,
          boxSizing: "border-box",
          background: "#fff",
        }}
      >
        <h2 style={{ marginTop: 0 }}>Directory Tree Viewer</h2>
        <TreeFilterBar
          filter={filter}
          setFilter={setFilter}
          setSearch={setSearch}
          setExpandAllSignal={setExpandAllSignal}
          setCollapseAllSignal={setCollapseAllSignal}
          onRefresh={async () => {
            await fetch("/api/refresh-tree", { method: "POST" });
            setSearch(s => s); // force update
          }}
          elementSelectorMode={elementSelectorMode}
          onToggleSelectorMode={() => setElementSelectorMode(v => !v)}
        />
        <div style={{ flex: 1, minHeight: 0, overflowY: "auto" }}>
          <TreeView
            dataUrl="/tree-data.json"
            filter={search}
            onFileDoubleClick={handleFileDoubleClick}
            selectedPaths={selectedObjects.map((obj) => obj.path)}
            expandAllSignal={expandAllSignal}
            collapseAllSignal={collapseAllSignal}
            onRequestFilter={setSearch}
            initialExpandedPaths={expandedPaths}
            onExpandedChange={setExpandedPaths}
            elementSelectorMode={elementSelectorMode}
          />
        </div>
        {/* Optionally, show selected objects */}
        {selectedObjects.length > 0 && (
          <div style={{ marginTop: 16, fontSize: 14 }}>
            <span style={{ display: "flex", alignItems: "center" }}>
              <b>Selected files:</b>
              <button
                onClick={() => setSelectedObjects([])}
                style={{
                  marginLeft: 10,
                  fontSize: 13,
                  padding: "2px 10px",
                  background: "#f5f5f5",
                  border: "1px solid #ccc",
                  borderRadius: 4,
                  cursor: "pointer",
                  color: "#333"
                }}
                title="Clear all selected files"
                aria-label="Clear all selected files"
              >
                Clear All
              </button>
            </span>
            <ul style={{ paddingLeft: 18, margin: 0 }}>
              {selectedObjects.map((obj) => (
                <li key={obj.path} style={{ wordBreak: "break-all", display: "flex", alignItems: "center" }}>
                  {obj.name}
                  <button
                    onClick={() =>
                      setSelectedObjects((prev) =>
                        prev.filter((o) => o.path !== obj.path)
                      )
                    }
                    style={{
                      marginLeft: 8,
                      background: "none",
                      border: "none",
                      color: "#c00",
                      fontWeight: "bold",
                      cursor: "pointer",
                      fontSize: 15,
                      lineHeight: 1,
                      padding: "0 4px",
                    }}
                    title="Remove from selected"
                    aria-label={`Remove ${obj.name}`}
                  >
                    ×
                  </button>
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
          onReplaceLastBotMessage={(text: string) => {
            setChatMessages((prev) => {
              // Find last bot message
              const idx = [...prev].reverse().findIndex(m => m.from === "bot");
              if (idx === -1) return prev;
              const realIdx = prev.length - 1 - idx;
              const newMessages = [...prev];
              newMessages[realIdx] = { text, from: "bot" };
              return newMessages;
            });
          }}
          tab={tab}
          setTab={setTab}
          setTabExternal={setTab}
          saveAppState={saveAppState}
          elementSelectorMode={elementSelectorMode}
        />
      </div>
    </div>
  );
}

export default App;
