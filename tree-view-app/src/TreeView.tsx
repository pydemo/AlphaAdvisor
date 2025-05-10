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
  onRequestFilter?: (filter: string) => void;
};

const TreeView: React.FC<TreeViewProps> = ({
  dataUrl,
  filter,
  onFileDoubleClick,
  selectedPaths = [],
  expandAllSignal,
  collapseAllSignal,
  onRequestFilter,
}) => {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  // Popup state for creating a new dir under MENU
  const [createMenuDir, setCreateMenuDir] = useState<{ parentPath: string; open: boolean }>({ parentPath: "", open: false });
  const [newDirName, setNewDirName] = useState("");
  // Removed internal selected state; selection is managed by parent
  // Info popup state for image paste
  const [infoPopup, setInfoPopup] = useState<{ open: boolean; node: TreeNode | null; image: string | null }>({ open: false, node: null, image: null });
  // File name for info popup
  const [infoFileName, setInfoFileName] = useState("");
  // JSON popup state
  const [jsonPopup, setJsonPopup] = useState<{ open: boolean; node: TreeNode | null; text: string; fileName: string }>({ open: false, node: null, text: "", fileName: "" });

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
            <>
              <span style={{ marginRight: 4 }}>
                {isOpen ? "▼" : "▶"}
              </span>
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
              {/* Info and JSON buttons for specific MENU leaf directories */}
              {/\/public\/MENU\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) && (
                <>
                  <button
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      padding: "0 6px",
                      borderRadius: "50%",
                      border: "1px solid #0074d9",
                      background: "#e6f2fb",
                      color: "#0074d9",
                      cursor: "pointer",
                      height: 22,
                      width: 22,
                      lineHeight: "18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Paste image from clipboard"
                    onClick={e => {
                      e.stopPropagation();
                      setInfoPopup({ open: true, node, image: null });
                      setInfoFileName(`${node.name}.png`);
                    }}
                  >
                    i
                  </button>
                  <button
                    style={{
                      marginLeft: 6,
                      fontSize: 13,
                      padding: "0 6px",
                      borderRadius: "50%",
                      border: "1px solid #6c9c6a",
                      background: "#f0f9f0",
                      color: "#388e3c",
                      cursor: "pointer",
                      height: 22,
                      width: 22,
                      lineHeight: "18px",
                      display: "inline-flex",
                      alignItems: "center",
                      justifyContent: "center"
                    }}
                    title="Edit JSON"
                    onClick={e => {
                      e.stopPropagation();
                      // Default fileName: [dir name].json
                      const dirName = node.name || "file";
                      setJsonPopup({ open: true, node, text: "", fileName: `${dirName}.json` });
                    }}
                  >
                    J
                  </button>
                </>
              )}
            </>
          ) : (
            <>
              <span style={{ width: 16, display: "inline-block" }} />
              <button
                style={{
                  marginLeft: 4,
                  fontSize: 13,
                  padding: "0 6px",
                  borderRadius: "50%",
                  border: "1px solid #e55",
                  background: "#fff5f5",
                  color: "#e55",
                  cursor: "pointer",
                  height: 22,
                  width: 22,
                  lineHeight: "18px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Delete file"
                onClick={e => {
                  e.stopPropagation();
                  if (window.confirm(`Delete file "${node.name}"?`)) {
                    fetch("/api/delete-file", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ target_path: node.path })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        fetch(dataUrl)
                          .then(res => res.json())
                          .then(setTree);
                      } else {
                        alert("Error: " + (data.error || "Failed to delete file"));
                      }
                    })
                    .catch(err => alert("Error: " + err));
                  }
                }}
              >-</button>
              <span style={{
                fontWeight:
                  selectedPaths.includes(node.path)
                    ? "bold"
                    : "normal",
                color: undefined
              }}>
                {node.name}
              </span>
            </>
          )}
          {/* "+" button for MENU section dirs */}
          {isDir && 
          (
    /\/public\/MENU\/[^/]+$/.test(node.path) || // e.g., /public/MENU/Shooting
    /\/public\/MENU\/?$/.test(node.path) ||     // e.g., /public/MENU
    /\/public\/MENU\/[^/]+\/[^/]+$/.test(node.path) || // e.g., /public/MENU/Shooting/PAGE_1
    /\/public\/MENU\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) ||// e.g., /public/MENU/Shooting/PAGE_1/1_image_quality_rec
    /\/public\/MENU\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) // e.g., /public/MENU/Shooting/PAGE_1/1_image_quality_rec/PAGE_1
    // /\/public\/MENU\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) // e.g., /public/MENU/Shooting/PAGE_1/1_image_quality_rec/PAGE_1/JPEG_HREF_Switch/
  )
          && (
            <>
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
              <button
                style={{
                  marginLeft: 4,
                  fontSize: 13,
                  padding: "0 6px",
                  borderRadius: "50%",
                  border: "1px solid #e55",
                  background: "#fff5f5",
                  color: "#e55",
                  cursor: "pointer",
                  height: 22,
                  width: 22,
                  lineHeight: "18px",
                  display: "inline-flex",
                  alignItems: "center",
                  justifyContent: "center"
                }}
                title="Delete directory"
                onClick={e => {
                  e.stopPropagation();
                  if (window.confirm(`Delete directory "${node.name}" and all its contents?`)) {
                    fetch("/api/delete-dir", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({ target_path: node.path })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        fetch(dataUrl)
                          .then(res => res.json())
                          .then(setTree);
                      } else {
                        alert("Error: " + (data.error || "Failed to delete directory"));
                      }
                    })
                    .catch(err => alert("Error: " + err));
                  }
                }}
              >-</button>
            </>
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
                      parent_path: createMenuDir.parentPath,
                      dir_name: newDirName.trim()
                    })
                  })
                  .then(res => res.json())
                  .then(data => {
                    if (data.success) {
                      // Expand parent and new dir, refetch tree
                      setExpanded(prev => {
                        const next = new Set(prev);
                        next.add(createMenuDir.parentPath);
                        let newDirPath = createMenuDir.parentPath.endsWith("/")
                          ? createMenuDir.parentPath + newDirName.trim()
                          : createMenuDir.parentPath + "/" + newDirName.trim();
                        next.add(newDirPath);
                        return next;
                      });
                      fetch(dataUrl)
                        .then(res => res.json())
                        .then(setTree);
                      if (onRequestFilter) {
                        onRequestFilter(newDirName.trim());
                      }
                      setCreateMenuDir({ parentPath: "", open: false });
                      setNewDirName("");
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
                        parent_path: createMenuDir.parentPath,
                        dir_name: newDirName.trim()
                      })
                    })
                    .then(res => res.json())
                    .then(data => {
                      if (data.success) {
                        // Expand parent and new dir, refetch tree
                        setExpanded(prev => {
                          const next = new Set(prev);
                          next.add(createMenuDir.parentPath);
                          let newDirPath = createMenuDir.parentPath.endsWith("/")
                            ? createMenuDir.parentPath + newDirName.trim()
                            : createMenuDir.parentPath + "/" + newDirName.trim();
                          next.add(newDirPath);
                          return next;
                        });
                        fetch(dataUrl)
                          .then(res => res.json())
                          .then(setTree);
                        if (onRequestFilter) {
                          onRequestFilter(newDirName.trim());
                        }
                        setCreateMenuDir({ parentPath: "", open: false });
                        setNewDirName("");
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
      {/* Info popup for image paste */}
      {infoPopup.open && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setInfoPopup({ open: false, node: null, image: null })}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
              padding: 24,
              minWidth: 340,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              Paste image for <span style={{ color: "#0074d9" }}>{infoPopup.node?.name}</span>
            </div>
            <input
              type="text"
              value={infoFileName}
              onChange={e => setInfoFileName(e.target.value)}
              placeholder="File name"
              style={{
                fontSize: 15,
                padding: "6px 10px",
                borderRadius: 4,
                border: "1.5px solid #0074d9",
                marginBottom: 6
              }}
            />
            <div
              tabIndex={0}
              style={{
                border: "2px dashed #0074d9",
                borderRadius: 6,
                minHeight: 120,
                minWidth: 220,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: "#f7fbff",
                cursor: "pointer",
                outline: "none"
              }}
              onPaste={e => {
                const items = e.clipboardData.items;
                for (let i = 0; i < items.length; i++) {
                  if (items[i].type.indexOf("image") !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                      const reader = new FileReader();
                      reader.onload = ev => {
                        setInfoPopup(prev => ({
                          ...prev,
                          image: ev.target?.result as string
                        }));
                      };
                      reader.readAsDataURL(file);
                    }
                  }
                }
                e.preventDefault();
              }}
            >
              {infoPopup.image ? (
                <img src={infoPopup.image} alt="Clipboard" style={{ maxWidth: 200, maxHeight: 120, borderRadius: 4 }} />
              ) : (
                <span style={{ color: "#888" }}>Paste image here (Ctrl+V)</span>
              )}
            </div>
            <button
              style={{
                marginTop: 18,
                fontSize: 16,
                padding: "6px 24px",
                borderRadius: 4,
                background: "#0074d9",
                color: "#fff",
                border: "none",
                alignSelf: "flex-end"
              }}
              disabled={!infoPopup.image}
              onClick={async () => {
                if (!infoPopup.image || !infoFileName.trim() || !infoPopup.node) return;
                try {
                  await fetch("/api/save-image-file", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      dir_path: infoPopup.node.path,
                      file_name: infoFileName.trim(),
                      image_data: infoPopup.image
                    })
                  });
                } catch (err) {
                  alert("Failed to save image: " + err);
                }
                setInfoPopup({ open: false, node: null, image: null });
              }}
            >
              Save
            </button>
            <button
              style={{
                marginTop: 8,
                fontSize: 15,
                padding: "4px 18px",
                borderRadius: 4,
                background: "#eee",
                color: "#333",
                border: "1px solid #bbb",
                alignSelf: "flex-end"
              }}
              onClick={() => setInfoPopup({ open: false, node: null, image: null })}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
      {/* JSON popup for editing JSON text */}
      {jsonPopup.open && (
        <div
          style={{
            position: "fixed",
            top: 0, left: 0, width: "100vw", height: "100vh",
            background: "rgba(0,0,0,0.18)",
            zIndex: 2000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center"
          }}
          onClick={() => setJsonPopup({ open: false, node: null, text: "", fileName: "" })}
        >
          <div
            style={{
              background: "#fff",
              borderRadius: 8,
              boxShadow: "0 2px 16px rgba(0,0,0,0.18)",
              padding: 24,
              minWidth: 380,
              display: "flex",
              flexDirection: "column",
              gap: 16,
              position: "relative"
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              Edit JSON for <span style={{ color: "#388e3c" }}>{jsonPopup.node?.name}</span>
            </div>
            <input
              type="text"
              value={jsonPopup.fileName}
              onChange={e => setJsonPopup(prev => ({ ...prev, fileName: e.target.value }))}
              placeholder="File name"
              style={{
                fontSize: 15,
                padding: "6px 10px",
                borderRadius: 4,
                border: "1.5px solid #6c9c6a",
                marginBottom: 6
              }}
            />
            <textarea
              value={jsonPopup.text}
              onChange={e => setJsonPopup(prev => ({ ...prev, text: e.target.value }))}
              placeholder="Paste or type JSON here"
              style={{
                fontFamily: "monospace",
                fontSize: 15,
                minHeight: 120,
                minWidth: 300,
                border: "1.5px solid #6c9c6a",
                borderRadius: 6,
                padding: 10,
                background: "#f8fff8",
                resize: "vertical"
              }}
              autoFocus
            />
            <div style={{ display: "flex", gap: 10, marginTop: 10, justifyContent: "flex-end" }}>
              <button
                style={{
                  fontSize: 15,
                  padding: "4px 18px",
                  borderRadius: 4,
                  background: "#eee",
                  color: "#333",
                  border: "1px solid #bbb"
                }}
                onClick={() => {
                  if (navigator.clipboard) {
                    navigator.clipboard.writeText(jsonPopup.text);
                  } else {
                    // fallback for older browsers
                    const textarea = document.createElement("textarea");
                    textarea.value = jsonPopup.text;
                    document.body.appendChild(textarea);
                    textarea.select();
                    document.execCommand("copy");
                    document.body.removeChild(textarea);
                  }
                }}
                disabled={!jsonPopup.text.trim()}
                title="Copy JSON to clipboard"
              >
                Copy
              </button>
              <button
                style={{
                  fontSize: 16,
                  padding: "6px 24px",
                  borderRadius: 4,
                  background: "#388e3c",
                  color: "#fff",
                  border: "none"
                }}
                disabled={!jsonPopup.text.trim()}
                onClick={async () => {
                  if (!jsonPopup.node || !jsonPopup.fileName.trim()) return;
                  try {
                    await fetch("/api/save-json-file", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        dir_path: jsonPopup.node.path,
                        file_name: jsonPopup.fileName.trim(),
                        json_text: jsonPopup.text
                      })
                    });
                  } catch (err) {
                    alert("Failed to save JSON file: " + err);
                  }
                  setJsonPopup({ open: false, node: null, text: "", fileName: "" });
                }}
              >
                Save
              </button>
              <button
                style={{
                  fontSize: 15,
                  padding: "4px 18px",
                  borderRadius: 4,
                  background: "#eee",
                  color: "#333",
                  border: "1px solid #bbb"
                }}
                onClick={() => setJsonPopup({ open: false, node: null, text: "", fileName: "" })}
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
