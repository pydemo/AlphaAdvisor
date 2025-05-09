import React, { useEffect, useState } from "react";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
};

type TreeViewProps = {
  dataUrl: string;
  filter?: string;
  onFileDoubleClick?: (node: TreeNode) => void;
  selectedPaths?: string[];
  expandAllSignal?: number;
  collapseAllSignal?: number;
};

const TreeView: React.FC<TreeViewProps> = ({
  dataUrl,
  filter,
  onFileDoubleClick,
  selectedPaths = [],
  expandAllSignal,
  collapseAllSignal,
}) => {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Popup state for creating a new dir under MENU
  const [createMenuDir, setCreateMenuDir] = useState<{ parentPath: string; open: boolean }>({ parentPath: "", open: false });
  const [newDirName, setNewDirName] = useState("");
  // Removed internal selected state; selection is managed by parent

  useEffect(() => {
    fetch(dataUrl)
      .then((res) => res.json())
      .then(setTree);
  }, [dataUrl]);

  // Expand all directories
  useEffect(() => {
    if (expandAllSignal && tree) {
      const allDirs = new Set<string>();
      const collectDirs = (node: TreeNode) => {
        if (node.type === "directory") {
          allDirs.add(node.path);
          (node.children || []).forEach(collectDirs);
        }
      };
      collectDirs(tree);
      setExpanded(allDirs);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expandAllSignal]);

  // Collapse all directories
  useEffect(() => {
    if (collapseAllSignal) {
      setExpanded(new Set());
    }
  }, [collapseAllSignal]);

  const toggleExpand = (path: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(path)) {
        next.delete(path);
      } else {
        next.add(path);
      }
      return next;
    });
  };


  // Recursively filter the tree to only include nodes matching the filter or with matching descendants
  function filterTree(node: TreeNode, filterStr: string): TreeNode | null {
    if (!filterStr) return node;
    // Support "OR" filtering: e.g., "jpg|png" matches if any term matches
    const terms = filterStr
      .split("|")
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    const match = terms.some((term) => node.name.toLowerCase().includes(term));
    if (node.type === "file") {
      return match ? node : null;
    }
    // Directory: filter children
    const filteredChildren = (node.children || [])
      .map((child) => filterTree(child, filterStr))
      .filter(Boolean) as TreeNode[];
    if (match || filteredChildren.length > 0) {
      return { ...node, children: filteredChildren };
    }
    return null;
  }

  const renderTree = (node: TreeNode) => {
    const isDir = node.type === "directory";
    const isOpen = expanded.has(node.path) || (filter && filter.length > 0); // auto-expand on filter

    return (
      <div key={node.path} style={{ marginLeft: 16 }}>
        <div
          style={{
            cursor: "pointer",
            background: selectedPaths.includes(node.path) ? "#cce5ff" : undefined,
            borderRadius: 4,
            padding: "2px 4px",
            display: "flex",
            alignItems: "center",
            userSelect: "none",
          }}
          onClick={() => {
            if (isDir) toggleExpand(node.path);
          }}
          onDoubleClick={() => {
            if (!isDir && onFileDoubleClick) {
              onFileDoubleClick(node);
            }
          }}
        >
          {isDir ? (
            <span style={{ marginRight: 4 }}>
              {isOpen ? "▼" : "▶"}
            </span>
          ) : (
            <span style={{ width: 16, display: "inline-block" }} />
          )}
          <span style={{
            fontWeight:
              selectedPaths.includes(node.path)
                ? "bold"
                : (isDir && /\/public\/MENU\//.test(node.path))
                  ? "bold"
                  : "normal",
            color:
              isDir && /\/public\/MENU\/[^/]+\/PAGE_\d+\/[^/]+\//.test(node.path)
                ? "#5b88c4"
                : isDir && /\/public\/MENU\/[^/]+\/PAGE_\d+\//.test(node.path)
                ? "#6c9c6a"
                : isDir && /\/MENU\/.*\/PAGE_\d+\//.test(node.path)
                ? "blue"
                : isDir && /\/MENU\/.*\//.test(node.path)
                ? "orange"
                : undefined
          }}>
            {node.name}
          </span>
          {/* "+" button for MENU section dirs */}
          {isDir && /\/public\/MENU\/[^/]+$/.test(node.path) && (
            <button
              style={{
                marginLeft: 6,
                fontSize: 13,
                padding: "0 6px",
                borderRadius: "50%",
                border: "1px solid #aaa",
                background: "#f5f5f5",
                color: "#333",
                cursor: "pointer",
                height: 22,
                width: 22,
                lineHeight: "18px",
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center"
              }}
              title="Add subdirectory"
              onClick={e => {
                e.stopPropagation();
                setCreateMenuDir({ parentPath: node.path, open: true });
                setNewDirName("");
              }}
            >+</button>
          )}
        </div>
        {isDir && isOpen && node.children && (
          <div>
            {node.children.map((child) => renderTree(child))}
          </div>
        )}
      </div>
    );
  };

  if (!tree) return <div>Loading...</div>;

  // Apply filter if present
  const filteredTree = filter && filter.length > 0 ? filterTree(tree, filter) : tree;
  if (!filteredTree) return <div>No results found.</div>;

  return (
    <div>
      {renderTree(filteredTree)}
      {/* Popup for creating new dir under MENU section */}
      {createMenuDir.open && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.15)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setCreateMenuDir({ parentPath: "", open: false })}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
              padding: 24,
              minWidth: 320,
              display: "flex",
              flexDirection: "column",
              gap: 12,
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>Create new directory under <span style={{ color: "#0074d9" }}>{createMenuDir.parentPath.replace(/^.*\/public\/MENU\//, "MENU/")}</span></div>
            <input
              type="text"
              value={newDirName}
              onChange={e => setNewDirName(e.target.value)}
              placeholder="Directory name"
              style={{ fontSize: 16, padding: "6px 10px", borderRadius: 4, border: "1px solid #bbb" }}
              autoFocus
              onKeyDown={e => {
                if (e.key === "Enter" && newDirName.trim()) {
                  // Call backend to create dir
                  fetch("/api/create-dir", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      parentPath: createMenuDir.parentPath,
                      newDirName: newDirName.trim()
                    })
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      setCreateMenuDir({ parentPath: "", open: false });
                      setNewDirName("");
                      // Optionally, refresh tree
                      window.location.reload();
                    } else {
                      alert("Error: " + (data.error || "Failed to create directory"));
                    }
                  })
                  .catch(err => alert("Error: " + err));
                }
              }}
            />
            <div style={{ display: "flex", gap: 10, marginTop: 8 }}>
              <button
                onClick={() => {
                  if (newDirName.trim()) {
                    fetch("/api/create-dir", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        parentPath: createMenuDir.parentPath,
                        newDirName: newDirName.trim()
                      })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        setCreateMenuDir({ parentPath: "", open: false });
                        setNewDirName("");
                        // Optionally, refresh tree
                        window.location.reload();
                      } else {
                        alert("Error: " + (data.error || "Failed to create directory"));
                      }
                    })
                    .catch(err => alert("Error: " + err));
                  }
                }}
                style={{ fontSize: 15, padding: "4px 18px", borderRadius: 4, background: "#0074d9", color: "#fff", border: "none" }}
                disabled={!newDirName.trim()}
              >
                Create
              </button>
              <button
                onClick={() => setCreateMenuDir({ parentPath: "", open: false })}
                style={{ fontSize: 15, padding: "4px 18px", borderRadius: 4, background: "#eee", color: "#333", border: "1px solid #bbb" }}
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TreeView;
