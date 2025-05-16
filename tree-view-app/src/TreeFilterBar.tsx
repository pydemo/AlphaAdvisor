import React from "react";

type TreeFilterBarProps = {
  filter: string;
  setFilter: (v: string) => void;
  setSearch: (v: string) => void;
  setExpandAllSignal: (fn: (n: number) => number) => void;
  setCollapseAllSignal: (fn: (n: number) => number) => void;
  onRefresh: () => void;
  elementSelectorMode?: boolean;
  onToggleSelectorMode?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
};

const TreeFilterBar: React.FC<TreeFilterBarProps> = ({
  filter,
  setFilter,
  setSearch,
  setExpandAllSignal,
  setCollapseAllSignal,
  onRefresh,
  elementSelectorMode = false,
  onToggleSelectorMode,
  onContextMenu,
}) => (
  <div
    data-element-name="TreeFilterBar"
    style={{
      marginBottom: 12,
      position: "relative",
      outline: elementSelectorMode ? "2.5px dashed #ffb700" : undefined,
      boxShadow: elementSelectorMode ? "0 0 0 3px #ffe066" : undefined,
      cursor: elementSelectorMode ? "copy" : undefined,
      transition: "box-shadow 0.15s, outline 0.15s"
    }}
    title={elementSelectorMode ? "Click to copy element name: TreeFilterBar" : undefined}
    onClick={e => {
      if (elementSelectorMode) {
        e.stopPropagation();
        const refName = "TreeFilterBar.tsx:TreeFilterBar";
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
    onContextMenu={onContextMenu}
  >
    {/* First row: filter, reset, refresh, selector toggle */}
    <div style={{ display: "flex", alignItems: "center", flexWrap: "nowrap" }}>
      <input
        type="text"
        value={filter}
        onChange={e => {
          setFilter(e.target.value);
          setSearch(e.target.value);
        }}
        placeholder="Filter..."
        style={{
          fontSize: 16,
          padding: "4px 8px",
          marginRight: 8,
          width: 120,
          maxWidth: 160,
          flex: "0 0 auto"
        }}
      />
      <button
        onClick={() => {
          setFilter("");
          setSearch("");
        }}
        style={{
          fontSize: 16,
          padding: "4px 12px",
          flex: "0 0 auto"
        }}
      >
        Reset
      </button>
      <button
        onClick={(e) => {
          // Prevent any default form submission behavior
          e.preventDefault();
          // Call the refresh handler
          onRefresh();
          // Save the current state to localStorage
          if (window.localStorage) {
            try {
              // Create a custom event to trigger state saving
              const saveEvent = new CustomEvent('saveAppState');
              window.dispatchEvent(saveEvent);
            } catch (err) {
              // Ignore errors
            }
          }
        }}
        style={{
          fontSize: 15,
          padding: "4px 10px",
          marginLeft: 8,
          background: "#e6f2fb",
          color: "#0074d9",
          border: "1px solid #0074d9",
          borderRadius: 4
        }}
        title="Refresh tree data"
      >
        Refresh
      </button>
      {/* Element Selector Mode Toggle (DEV ONLY) */}
      {onToggleSelectorMode && (
        <button
          onClick={onToggleSelectorMode}
          style={{
            fontSize: 15,
            padding: "4px 10px",
            marginLeft: 12,
            background: elementSelectorMode ? "#ffe066" : "#f5f5f5",
            color: "#333",
            border: "1px solid #ccc",
            borderRadius: 4,
            cursor: "pointer"
          }}
          title="Toggle element selector mode (DEV TOOL)"
        >
          {elementSelectorMode ? "Selector Mode: ON" : "Selector Mode: OFF"}
        </button>
      )}
    </div>
    {/* Second row: expand/collapse/png|jpg */}
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 6 }}>
      <button
        onClick={() => setExpandAllSignal(n => n + 1)}
        style={{ fontSize: 15, padding: "4px 10px" }}
      >
        Expand All
      </button>
      <button
        onClick={() => {
          setFilter("jpg|png");
          setSearch("jpg|png");
        }}
        style={{ fontSize: 15, padding: "4px 10px" }}
      >
        png|jpg
      </button>
      <button
        onClick={() => setCollapseAllSignal(n => n + 1)}
        style={{ fontSize: 15, padding: "4px 10px" }}
      >
        Collapse All
      </button>
    </div>
  </div>
);

export default TreeFilterBar;
