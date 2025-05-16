import React, { useState, useEffect } from "react";
import "./App.css";
import TreeView from "./TreeView";
import Chat from "./Chat";
import TreeFilterBar from "./TreeFilterBar";

type ChatMessage = { text: string; from: "user" | "bot" | "log" };

function App() {
  // Popover state for selector mode (shared across regions)
  const [selectorPopover, setSelectorPopover] = useState<{
    open: boolean;
    x: number;
    y: number;
    region: string;
  } | null>(null);

  // Example objects for each region
  const selectorObjectsMap: Record<string, string[]> = {
    TreeView: [
      "TreeView: Directory Tree",
      "TreeNode: File/Folder Node",
      "ExpandCollapseButton",
      "InfoButton",
      "JsonButton"
    ],
    Chat: [
      "Chat: Message Feed",
      "MessageInput",
      "SendButton",
      "MessageBubble"
    ],
    TreeFilterBar: [
      "TreeFilterBar: Filter Controls",
      "FilterInput",
      "ResetButton",
      "ExpandAllButton",
      "CollapseAllButton",
      "RefreshButton"
    ],
    DirectoryTreeViewerTitle: [
      "DirectoryTreeViewerTitle: Title"
    ],
    MessageTabsAndSendButton: [
      "MessageTabsAndSendButton: Tab Bar",
      "ConversionTab",
      "NoImageTab",
      "GeneralTab"
    ]
  };
  const [filter, setFilter] = useState("");
  const [search, setSearch] = useState("");
  const [selectedObjects, setSelectedObjects] = useState<{ name: string; path: string }[]>([]);
  const [chatMessages, setChatMessages] = useState<{
    Conversion: ChatMessage[];
    "No Image": ChatMessage[];
    General: ChatMessage[];
  }>({
    Conversion: [],
    "No Image": [],
    General: [],
  });
  const [expandAllSignal, setExpandAllSignal] = useState(0);
  const [collapseAllSignal, setCollapseAllSignal] = useState(0);
  type TabType = "Conversion" | "No Image" | "General";
  const [tab, setTab] = useState<TabType>("Conversion");
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
      conversionInput,
      noImageInput,
      generalInput,
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
        if (typeof state.chatMessages === "object" && state.chatMessages !== null) setChatMessages(state.chatMessages);
        if (typeof state.expandAllSignal === "number") setExpandAllSignal(state.expandAllSignal);
        if (typeof state.collapseAllSignal === "number") setCollapseAllSignal(state.collapseAllSignal);
        if (state.tab === "Conversion" || state.tab === "No Image" || state.tab === "General") setTab(state.tab);
        if (Array.isArray(state.expandedPaths)) setExpandedPaths(state.expandedPaths);
        if (typeof state.conversionInput === "string") setConversionInput(state.conversionInput);
        if (typeof state.noImageInput === "string") setNoImageInput(state.noImageInput);
        if (typeof state.generalInput === "string") setGeneralInput(state.generalInput);
        // Keep the state in localStorage for refresh operations
      }
    } catch (e) {
      // ignore
    }
    
    // Add event listener for saveAppState custom event
    const handleSaveAppState = () => {
      saveAppState();
    };
    window.addEventListener('saveAppState', handleSaveAppState);
    
    // Clean up event listener on unmount
    return () => {
      window.removeEventListener('saveAppState', handleSaveAppState);
    };
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
      const currentTab = tab;
      const prevTabMessages = prev[currentTab];
      let newTabMessages: ChatMessage[];
      if (selectedObjects.some((obj) => obj.path === node.path)) {
        // Deselect message
        newTabMessages = [
          ...prevTabMessages,
          { text: `Deselected file: ${node.path}`, from: "log" },
        ];
      } else {
        // Select message
        newTabMessages = [
          ...prevTabMessages,
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
          newTabMessages.push({
            text: `<img src="${imgSrc}" alt="${node.name}" style="width:256px;max-width:100%;border-radius:4px;border:1px solid #ccc;margin-top:4px;" />`,
            from: "bot" as const
          });
        }
      }
      return {
        ...prev,
        [currentTab]: newTabMessages,
      };
    });
  };

  // Per-tab input state
  const [conversionInput, setConversionInput] = useState(
    `Convert this menu screenshot of Sony 'a7rV' to json including brief 
    description of each menu option.`
  );
  const [noImageInput, setNoImageInput] = useState("");
  const [generalInput, setGeneralInput] = useState("");

  // Called when user sends a chat message for the current tab
  const handleSendMessage = (text: string) => {
    setChatMessages((prev) => ({
      ...prev,
      [tab]: [
        ...prev[tab],
        { text, from: "user" }
      ]
    }));
    // Capture selected files/dirs at the time of sending
    const selectedList = selectedObjects.map(obj => obj.path).join("\n");
    setTimeout(() => {
      setChatMessages((prev) => ({
        ...prev,
        [tab]: [
          ...prev[tab],
          {
            text:
              selectedList
                ? `Echo:\n${selectedList}\n${text}`
                : `Echo:\n${text}`,
            from: "bot"
          }
        ]
      }));
    }, 500);
  };

  // Per-tab send handlers for MessageTabsAndSendButton
  const handleSend = () => {
    if (conversionInput.trim() === "") return;
    handleSendMessage(conversionInput);
  };
  const handleNoImageSend = () => {
    if (noImageInput.trim() === "") return;
    handleSendMessage(noImageInput);
  };
  const handleGeneralSend = () => {
    if (generalInput.trim() === "") return;
    handleSendMessage(generalInput);
  };

  // Handler for textarea keydown
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
    // If any modifier is pressed, allow default (insert newline)
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
        <h2
          data-element-name="DirectoryTreeViewerTitle"
          style={{
            marginTop: 0,
            outline: elementSelectorMode ? "2.5px dashed #ffb700" : undefined,
            boxShadow: elementSelectorMode ? "0 0 0 3px #ffe066" : undefined,
            cursor: elementSelectorMode ? "copy" : undefined,
            transition: "box-shadow 0.15s, outline 0.15s"
          }}
          title={elementSelectorMode ? "Click to copy element name: DirectoryTreeViewerTitle" : undefined}
          onClick={e => {
            if (elementSelectorMode) {
              e.stopPropagation();
              const refName = "App.tsx:DirectoryTreeViewerTitle";
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
          onContextMenu={e => {
            if (elementSelectorMode) {
              e.preventDefault();
              setSelectorPopover({
                open: true,
                x: e.clientX,
                y: e.clientY,
                region: "DirectoryTreeViewerTitle"
              });
            }
          }}
        >
          Sony Menu Viewer
        </h2>
        <TreeFilterBar
          filter={filter}
          setFilter={setFilter}
          setSearch={setSearch}
          setExpandAllSignal={setExpandAllSignal}
          setCollapseAllSignal={setCollapseAllSignal}
          onRefresh={async () => {
            // Save current state
            saveAppState();
            // Refresh API
            await fetch("/api/refresh-tree", { method: "POST" });
            // Restore state from localStorage
            try {
              const stateStr = localStorage.getItem("treeChatAppState");
              if (stateStr) {
                const state = JSON.parse(stateStr);
                if (typeof state.filter === "string") setFilter(state.filter);
                if (typeof state.search === "string") setSearch(state.search);
                if (Array.isArray(state.selectedObjects)) setSelectedObjects(state.selectedObjects);
                if (typeof state.chatMessages === "object" && state.chatMessages !== null) setChatMessages(state.chatMessages);
                if (typeof state.expandAllSignal === "number") setExpandAllSignal(state.expandAllSignal);
                if (typeof state.collapseAllSignal === "number") setCollapseAllSignal(state.collapseAllSignal);
                if (state.tab === "Conversion" || state.tab === "No Image" || state.tab === "General") setTab(state.tab);
                if (Array.isArray(state.expandedPaths)) setExpandedPaths(state.expandedPaths);
                if (typeof state.conversionInput === "string") setConversionInput(state.conversionInput);
                if (typeof state.noImageInput === "string") setNoImageInput(state.noImageInput);
                if (typeof state.generalInput === "string") setGeneralInput(state.generalInput);
                // Keep the state in localStorage in case of page reload
              }
            } catch (e) {
              // ignore
            }
            setSearch(s => s); // force update
          }}
          elementSelectorMode={elementSelectorMode}
          onToggleSelectorMode={() => setElementSelectorMode(v => !v)}
          onContextMenu={e => {
            if (elementSelectorMode) {
              e.preventDefault();
              setSelectorPopover({
                open: true,
                x: e.clientX,
                y: e.clientY,
                region: "TreeFilterBar"
              });
            }
          }}
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
            onContextMenu={e => {
              if (elementSelectorMode) {
                e.preventDefault();
                setSelectorPopover({
                  open: true,
                  x: e.clientX,
                  y: e.clientY,
                  region: "TreeView"
                });
              }
            }}
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
          messages={chatMessages[tab]}
          onSendMessage={handleSendMessage}
          onReplaceLastBotMessage={(text: string) => {
            setChatMessages((prev) => {
              const tabMessages = prev[tab];
              // Find last bot message in this tab
              const idx = [...tabMessages].reverse().findIndex(m => m.from === "bot");
              if (idx === -1) return prev;
              const realIdx = tabMessages.length - 1 - idx;
              const newTabMessages = [...tabMessages];
              newTabMessages[realIdx] = { text, from: "bot" };
              return {
                ...prev,
                [tab]: newTabMessages
              };
            });
          }}
          tab={tab}
          setTab={setTab}
          setTabExternal={setTab}
          saveAppState={saveAppState}
          elementSelectorMode={elementSelectorMode}
          onContextMenu={e => {
            if (elementSelectorMode) {
              e.preventDefault();
              setSelectorPopover({
                open: true,
                x: e.clientX,
                y: e.clientY,
                region: "Chat"
              });
            }
          }}
          // Pass per-tab input state and handlers
          conversionInput={conversionInput}
          setConversionInput={setConversionInput}
          noImageInput={noImageInput}
          setNoImageInput={setNoImageInput}
          generalInput={generalInput}
          setGeneralInput={setGeneralInput}
          handleSend={handleSend}
          handleNoImageSend={handleNoImageSend}
          handleGeneralSend={handleGeneralSend}
          handleTextareaKeyDown={handleTextareaKeyDown}
        />
      </div>
    {/* Selector mode popover (shared) */}
    {elementSelectorMode && selectorPopover?.open && (
      <div
        style={{
          position: "fixed",
          top: selectorPopover.y,
          left: selectorPopover.x,
          zIndex: 9999,
          background: "#fff",
          border: "1.5px solid #007bff",
          borderRadius: 6,
          boxShadow: "0 2px 12px rgba(0,0,0,0.18)",
          padding: "8px 0",
          minWidth: 180
        }}
        onClick={e => e.stopPropagation()}
      >
        {(selectorObjectsMap[selectorPopover.region] || []).map(obj => (
          <div
            key={obj}
            style={{
              padding: "6px 18px",
              cursor: "pointer",
              fontSize: 15,
              color: "#0074d9",
              whiteSpace: "nowrap"
            }}
            onClick={() => {
              // Map object to true code location
              const objectToRegion: Record<string, string> = {
                // MessageTabsAndSendButton
                "SendButton": "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton",
                "ConversionTab": "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton",
                "NoImageTab": "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton",
                "GeneralTab": "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton",
                "MessageTabsAndSendButton: Tab Bar": "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton",
                // TreeView
                "TreeView: Directory Tree": "TreeView.tsx:TreeView",
                "TreeNode: File/Folder Node": "TreeView.tsx:TreeView",
                "ExpandCollapseButton": "TreeView.tsx:TreeView",
                "InfoButton": "TreeView.tsx:TreeView",
                "JsonButton": "TreeView.tsx:TreeView",
                // TreeFilterBar
                "TreeFilterBar: Filter Controls": "TreeFilterBar.tsx:TreeFilterBar",
                "FilterInput": "TreeFilterBar.tsx:TreeFilterBar",
                "ResetButton": "TreeFilterBar.tsx:TreeFilterBar",
                "ExpandAllButton": "TreeFilterBar.tsx:TreeFilterBar",
                "CollapseAllButton": "TreeFilterBar.tsx:TreeFilterBar",
                "RefreshButton": "TreeFilterBar.tsx:TreeFilterBar",
                // Chat
                "Chat: Message Feed": "Chat.tsx:Chat",
                "MessageInput": "Chat.tsx:Chat",
                "MessageBubble": "Chat.tsx:Chat",
                // Title
                "DirectoryTreeViewerTitle: Title": "App.tsx:DirectoryTreeViewerTitle"
              };
              let regionId = objectToRegion[obj];
              if (!regionId) {
                // fallback to region
                switch (selectorPopover.region) {
                  case "TreeView":
                    regionId = "TreeView.tsx:TreeView";
                    break;
                  case "Chat":
                    regionId = "Chat.tsx:Chat";
                    break;
                  case "TreeFilterBar":
                    regionId = "TreeFilterBar.tsx:TreeFilterBar";
                    break;
                  case "DirectoryTreeViewerTitle":
                    regionId = "App.tsx:DirectoryTreeViewerTitle";
                    break;
                  case "MessageTabsAndSendButton":
                    regionId = "MessageTabsAndSendButton.tsx:MessageTabsAndSendButton";
                    break;
                  default:
                    regionId = selectorPopover.region;
                }
              }
              const fullId = `${regionId}:${obj}`;
              if (navigator.clipboard) {
                navigator.clipboard.writeText(fullId);
              }
              setSelectorPopover(null);
            }}
            onMouseDown={e => e.stopPropagation()}
            onContextMenu={e => e.preventDefault()}
          >
            {obj}
          </div>
        ))}
        <div
          style={{
            padding: "6px 18px",
            color: "#888",
            fontSize: 13,
            cursor: "pointer"
          }}
          onClick={() => setSelectorPopover(null)}
        >
          Cancel
        </div>
      </div>
    )}
    </div>
  );
}

export default App;
