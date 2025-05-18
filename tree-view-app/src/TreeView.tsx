import React, { useEffect, useState, useRef } from "react";

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
  initialExpandedPaths?: string[];
  onExpandedChange?: (expandedPaths: string[]) => void;
  elementSelectorMode?: boolean; // DEV: highlight/copy element name
  onContextMenu?: (e: React.MouseEvent) => void;
};

// Helper function to format directory names for display
const formatDirNameForDisplay = (name: string): string => {
  // First, remove leading numbers and spaces
  let formatted = name.replace(/^\d+ /, '');
  
  // Replace underscores with forward slashes
  formatted = formatted.replace(/_/g, '/');
  if (false) {
    // Special case: preserve dash in "APS-C"
    if (formatted.includes('APS-C')) {
      // Temporarily replace "APS-C" with a placeholder
      formatted = formatted.replace(/APS-C/g, 'APS_TEMP_C');
      // Replace all other dashes with spaces
      formatted = formatted.replace(/-/g, ' ');
      // Restore "APS-C" from the placeholder
      formatted = formatted.replace(/APS_TEMP_C/g, 'APS-C');
    } else {
      // No special case, replace all dashes with spaces
      formatted = formatted.replace(/-/g, ' ');
    }
  }
  
  return formatted;
};

const TreeView: React.FC<TreeViewProps> = ({
  dataUrl,
  filter,
  onFileDoubleClick,
  selectedPaths = [],
  expandAllSignal,
  collapseAllSignal,
  onRequestFilter,
  initialExpandedPaths,
  onExpandedChange,
  elementSelectorMode = false,
  onContextMenu,
}) => {
  // Popover state for selector mode
  const [selectorPopover, setSelectorPopover] = useState<{
    open: boolean;
    x: number;
    y: number;
  } | null>(null);

  // Example objects for TreeView region
  const selectorObjects = [
    "TreeView: Directory Tree",
    "TreeNode: File/Folder Node",
    "ExpandCollapseButton",
    "InfoButton",
    "JsonButton"
  ];
  const [tree, setTree] = useState<TreeNode | null>(null);
  // Initialize expanded state from localStorage or initialExpandedPaths
  const [expanded, setExpanded] = useState<Set<string>>(() => {
    try {
      // Try to get expanded paths from localStorage first
      const savedExpandedPaths = localStorage.getItem('treeViewExpandedPaths');
      if (savedExpandedPaths) {
        return new Set(JSON.parse(savedExpandedPaths));
      }
    } catch (error) {
      console.error('Error loading expanded paths from localStorage:', error);
    }
    // Fall back to initialExpandedPaths or empty set
    return new Set(initialExpandedPaths || []);
  });
  
  // Ref to always have latest expanded state
  const expandedRef = useRef(expanded);
  useEffect(() => {
    expandedRef.current = expanded;
    
    // Save expanded paths to localStorage whenever they change
    try {
      localStorage.setItem('treeViewExpandedPaths', JSON.stringify(Array.from(expanded)));
    } catch (error) {
      console.error('Error saving expanded paths to localStorage:', error);
    }
  }, [expanded]);
  // Popup state for creating a new dir under α7RV
  const [createMenuDir, setCreateMenuDir] = useState<{ parentPath: string; open: boolean }>({ parentPath: "", open: false });
  const [newDirName, setNewDirName] = useState("");
  // Store expanded state before creating a new directory
  const [expandedBeforeCreate, setExpandedBeforeCreate] = useState<Set<string> | null>(null);
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
      .then((data) => {
        setTree(data);
        
        // After tree is loaded, check if we need to restore a saved filter
        try {
          const savedFilter = localStorage.getItem('treeViewCurrentFilter');
          if (savedFilter && onRequestFilter) {
            // Restore the filter
            onRequestFilter(savedFilter);
            // Clear the saved filter so it doesn't persist across page refreshes
            localStorage.removeItem('treeViewCurrentFilter');
          }
        } catch (error) {
          console.error('Error restoring filter from localStorage:', error);
        }
      });
  }, [dataUrl, onRequestFilter]);

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
  }, [expandAllSignal, tree]);

  // Collapse all directories
  useEffect(() => {
    if (collapseAllSignal) {
      setExpanded(new Set());
    }
  }, [collapseAllSignal]);

  // Notify parent when expanded changes
  useEffect(() => {
    if (onExpandedChange) {
      onExpandedChange(Array.from(expanded));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [expanded]);

  // Keep track of whether we're in the process of opening the create directory dialog
  const [isOpeningCreateDialog, setIsOpeningCreateDialog] = useState(false);

  const toggleExpand = (path: string) => {
    // Don't toggle if we're in the process of opening the create directory dialog
    if (isOpeningCreateDialog) return;
    
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
    const isRootNode = node.name === "public"; // Check if this is the root node (Camera)

    return (
      <div key={node.path} style={{ marginLeft: isRootNode ? 0 : 16 }}>
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
              <span 
                style={{
                  fontWeight:
                    selectedPaths.includes(node.path)
                      ? "bold"
                      : (isDir && /\/public\/α7RV\//.test(node.path))
                        ? "bold"
                        : "normal",
                  color:
                    isDir     && /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\//.test(node.path)
                      ? "orange"
                      : isDir && /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\//.test(node.path)
                      ? "#4a6996"
                      : isDir && /\/public\/α7RV\/[^/]+\/[^/]+\//.test(node.path)
                      ? "#6c9c6a"
                      : isDir && /\/public\/α7RV\/[^/]+\//.test(node.path)
                      ? "orange"
                      : undefined
                }}
                title={isDir && /\/public\/α7RV\//.test(node.path) && node.name !== "public" ? node.name : undefined}
              >
                {/* Format directory names for display */}
                {node.name === "public" 
                  ? "Camera" 
                  : isDir && /\/public\/α7RV\//.test(node.path)
                    ? formatDirNameForDisplay(node.name) 
                    : node.name}
              </span>
              
              {/* Camera button for all directories */}
              {isDir && (
                <button
                  style={{
                    marginLeft: 6,
                    fontSize: 13,
                    padding: "0 6px",
                    borderRadius: "50%",
                    border: "1px solid #9c6a9c",
                    background: "#f9f0f9",
                    color: "#8e388e",
                    cursor: "pointer",
                    height: 22,
                    width: 22,
                    lineHeight: "18px",
                    display: "inline-flex",
                    alignItems: "center",
                    justifyContent: "center"
                  }}
                  title="Snap photo"
                  onClick={e => {
                    e.stopPropagation();
                    // Open a popup similar to the 'i' button
                    setInfoPopup({ open: true, node, image: null });
                    setInfoFileName(`${node.name}_snap.png`);
                  }}
                >
                  📷
                </button>
              )}
              
              {/* Info and JSON buttons for specific α7RV leaf directories */}
              { (/\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/(?!PAGE_\d+$)[^/]+$/.test(node.path) ||
                /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) ||
                /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path)) && (
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
                        // Preserve expanded state after refresh
                        const prevExpanded = new Set(expanded);
                        fetch(dataUrl)
                          .then(res => res.json())
                          .then(treeData => {
                            setTree(treeData);
                            setExpanded(prevExpanded);
                          });
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
          {/* "+" button for α7RV section dirs */}
          {isDir && 
          (
    /\/public\/α7RV\/[^/]+$/.test(node.path) || // e.g., /public/α7RV/Shooting
    /\/public\/α7RV\/?$/.test(node.path) ||     // e.g., /public/α7RV
    /\/public\/α7RV\/[^/]+\/[^/]+$/.test(node.path) || // e.g., /public/α7RV/Stills/Shooting
    /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) ||// e.g., /public/α7RV/Stills/Shooting/PAGE_1
    /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) ||// e.g., /public/α7RV/Stills/Shooting/PAGE_1/1_image_quality_rec
    /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) ||// e.g., /public/α7RV/Stills/Shooting/PAGE_1/1_image_quality_rec/PAGE_1/
    /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) // e.g., /public/α7RV/Stills/Shooting/PAGE_1/1_image_quality_rec/PAGE_1/Lens-Compensation
  )
          && (
            <>
              {/* E/C toggle button for /public/α7RV or /public/α7RV/xxx */}
              {(
                /\/public\/α7RV\/?$/.test(node.path) ||
                /\/public\/α7RV\/[^/]+\/[^/]+$/.test(node.path) ||
                /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path) ||
                /\/public\/α7RV\/[^/]+\/[^/]+\/[^/]+\/[^/]+\/[^/]+$/.test(node.path)
              ) && (
                (() => {
                  // Helper to collect all descendant dir paths
                  function collectAllDirPaths(n: TreeNode): string[] {
                    let paths: string[] = [];
                    if (n.type === "directory") {
                      paths.push(n.path);
                      if (n.children) {
                        n.children.forEach((child: TreeNode) => {
                          paths = paths.concat(collectAllDirPaths(child));
                        });
                      }
                    }
                    return paths;
                  }
                  // All descendant dirs except the current node itself
                  const allDescendantDirs = node.children
                    ? node.children.flatMap(collectAllDirPaths)
                    : [];
                  // Are all descendant dirs expanded?
                  const allExpanded = allDescendantDirs.every(p => expanded.has(p));
                  return (
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
                      title={allExpanded ? "Collapse all subdirectories" : "Expand all subdirectories"}
                      onClick={e => {
                        e.stopPropagation();
                        if (allExpanded) {
                          // Collapse all descendant dirs (but keep current dir expanded)
                          setExpanded(prev => {
                            const next = new Set(prev);
                            allDescendantDirs.forEach(p => next.delete(p));
                            next.add(node.path);
                            return next;
                          });
                        } else {
                          // Expand all descendant dirs
                          setExpanded(prev => {
                            const next = new Set(prev);
                            allDescendantDirs.forEach(p => next.add(p));
                            next.add(node.path);
                            return next;
                          });
                        }
                      }}
                    >
                      {allExpanded ? "C" : "E"}
                    </button>
                  );
                })()
              )}
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
                  
                  // Set flag to prevent toggleExpand from running
                  setIsOpeningCreateDialog(true);
                  
                  // Store current expanded state before opening the create directory dialog
                  const currentExpanded = new Set(expanded);
                  setExpandedBeforeCreate(currentExpanded);
                  
                  // Use React.startTransition if available to batch these updates
                  if (typeof window !== "undefined" && "startTransition" in React) {
                    React.startTransition(() => {
                      setCreateMenuDir({ parentPath: node.path, open: true });
                      setNewDirName("");
                      // Reset the flag after a short delay to allow state updates to complete
                      setTimeout(() => setIsOpeningCreateDialog(false), 100);
                    });
                  } else {
                    setCreateMenuDir({ parentPath: node.path, open: true });
                    setNewDirName("");
                    // Reset the flag after a short delay to allow state updates to complete
                    setTimeout(() => setIsOpeningCreateDialog(false), 100);
                  }
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
                    .then(async res => {
                      if (!res.ok) {
                        const errorText = await res.text();
                        console.error("Server error response (delete-dir):", errorText);
                        throw new Error(`Server responded with ${res.status}: ${errorText}`);
                      }
                      const contentType = res.headers.get("content-type");
                      if (contentType && contentType.indexOf("application/json") !== -1) {
                        return res.json();
                      } else {
                        const responseText = await res.text();
                        console.error("Received non-JSON response (delete-dir):", responseText);
                        throw new Error(`Expected JSON, but received ${contentType}: ${responseText}`);
                      }
                    })
                    .then(data => {
                      if (data.success) {
                        // Preserve expanded state after refresh
                        const prevExpanded = new Set(expanded);
                        fetch(dataUrl)
                          .then(res => res.json())
                          .then(treeData => {
                            setTree(treeData);
                            setExpanded(prevExpanded);
                          });
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
            {/* Sort children by leading number if they have one, otherwise alphabetically */}
            {[...node.children]
              .sort((a, b) => {
                // Extract leading numbers if present (either followed by underscore or space)
                const aMatch = a.name.match(/^(\d+)[ _]/);
                const bMatch = b.name.match(/^(\d+)[ _]/);
                
                // If both have leading numbers, sort numerically
                if (aMatch && bMatch) {
                  return parseInt(aMatch[1], 10) - parseInt(bMatch[1], 10);
                }
                
                // If only one has a leading number, prioritize it
                if (aMatch) return -1;
                if (bMatch) return 1;
                
                // Otherwise sort alphabetically
                return a.name.localeCompare(b.name);
              })
              .map((child) => renderTree(child))}
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
    <div
      data-element-name="TreeView"
      style={{
        position: "relative",
        outline: elementSelectorMode ? "2.5px dashed #ffb700" : undefined,
        boxShadow: elementSelectorMode ? "0 0 0 3px #ffe066" : undefined,
        cursor: elementSelectorMode ? "copy" : undefined,
        transition: "box-shadow 0.15s, outline 0.15s"
      }}
      title={elementSelectorMode ? "Click to copy element name: TreeView" : undefined}
      onClick={e => {
        if (elementSelectorMode) {
          e.stopPropagation();
          const refName = "TreeView.tsx:TreeView";
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
      {renderTree(filteredTree)}
      {/* Selector mode popover */}
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
          {selectorObjects.map(obj => (
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
                if (navigator.clipboard) {
                  navigator.clipboard.writeText(obj);
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
      {/* Popup for creating new dir under α7RV section */}
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
          onClick={() => {
            setCreateMenuDir({ parentPath: "", open: false });
            setExpandedBeforeCreate(null); // Clear the saved expanded state
          }}
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
            <div style={{ fontWeight: "bold", marginBottom: 8 }}>
              Create new directory under 
              <span style={{ color: "#0074d9" }}>
                {createMenuDir.parentPath
                  .replace(/^.*\/public\/α7RV\//, "α7RV/")
                  .split('/')
                  .map(segment => segment.match(/^\d+_/) ? formatDirNameForDisplay(segment) : segment)
                  .join('/')}
              </span>
            </div>
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
                  // Use the saved expanded state from when the dialog was opened
                  const prevExpanded = expandedBeforeCreate ? new Set(expandedBeforeCreate) : new Set(expandedRef.current);
                  fetch("/api/create-dir", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      parent_path: createMenuDir.parentPath,
                      dir_name: newDirName.trim()
                    })
                  })
                  .then(async res => {
                    if (!res.ok) {
                      const errorText = await res.text();
                      console.error("Server error response (create-dir, onKeyDown):", errorText);
                      throw new Error(`Server responded with ${res.status}: ${errorText}`);
                    }
                    const contentType = res.headers.get("content-type");
                    if (contentType && contentType.indexOf("application/json") !== -1) {
                      return res.json();
                    } else {
                      const responseText = await res.text();
                      console.error("Received non-JSON response (create-dir, onKeyDown):", responseText);
                      throw new Error(`Expected JSON, but received ${contentType}: ${responseText}`);
                    }
                  })
                  .then(data => {
                    if (data.success) {
                      // Expand parent and new dir, refetch tree, restore previous expansion
                      let newDirPath = createMenuDir.parentPath.endsWith("/")
                        ? createMenuDir.parentPath + newDirName.trim()
                        : createMenuDir.parentPath + "/" + newDirName.trim();
                      prevExpanded.add(createMenuDir.parentPath);
                      prevExpanded.add(newDirPath);
                  fetch(dataUrl)
                    .then(res => res.json())
                    .then(treeData => {
                      // Batch tree and expanded state updates together
                      if (typeof window !== "undefined" && "startTransition" in React) {
                        React.startTransition(() => {
                          setTree(treeData);
                          setExpanded(new Set(prevExpanded));
                        });
                      } else {
                        setTree(treeData);
                        setExpanded(new Set(prevExpanded));
                      }
                    });
                  
                  // Save current filter to localStorage before applying new filter
                  try {
                    if (filter) {
                      localStorage.setItem('treeViewCurrentFilter', filter);
                    }
                  } catch (error) {
                    console.error('Error saving filter to localStorage:', error);
                  }
                  
                  // Apply filter to show the newly created directory
                  if (onRequestFilter) {
                    onRequestFilter(newDirName.trim());
                  }
                      setCreateMenuDir({ parentPath: "", open: false });
                      setNewDirName("");
                      setExpandedBeforeCreate(null); // Clear the saved expanded state
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
                    // Use the saved expanded state from when the dialog was opened
                    const prevExpanded = expandedBeforeCreate ? new Set(expandedBeforeCreate) : new Set(expandedRef.current);
                    fetch("/api/create-dir", {
                      method: "POST",
                      headers: { "Content-Type": "application/json" },
                      body: JSON.stringify({
                        parent_path: createMenuDir.parentPath,
                        dir_name: newDirName.trim()
                      })
                    })
                    .then(async res => {
                      if (!res.ok) {
                        const errorText = await res.text();
                        console.error("Server error response (create-dir, onClick):", errorText);
                        throw new Error(`Server responded with ${res.status}: ${errorText}`);
                      }
                      const contentType = res.headers.get("content-type");
                      if (contentType && contentType.indexOf("application/json") !== -1) {
                        return res.json();
                      } else {
                        const responseText = await res.text();
                        console.error("Received non-JSON response (create-dir, onClick):", responseText);
                        throw new Error(`Expected JSON, but received ${contentType}: ${responseText}`);
                      }
                    })
                    .then(data => {
                      if (data.success) {
                        // Expand parent and new dir, refetch tree, restore previous expansion
                        let newDirPath = createMenuDir.parentPath.endsWith("/")
                          ? createMenuDir.parentPath + newDirName.trim()
                          : createMenuDir.parentPath + "/" + newDirName.trim();
                        prevExpanded.add(createMenuDir.parentPath);
                        prevExpanded.add(newDirPath);
                        fetch(dataUrl)
                          .then(res => res.json())
                          .then(treeData => {
                            setTree(treeData);
                            setExpanded(new Set(prevExpanded));
                          });
                        
                        // Save current filter to localStorage before applying new filter
                        try {
                          if (filter) {
                            localStorage.setItem('treeViewCurrentFilter', filter);
                          }
                        } catch (error) {
                          console.error('Error saving filter to localStorage:', error);
                        }
                        
                        if (onRequestFilter) {
                          onRequestFilter(newDirName.trim());
                        }
                        setCreateMenuDir({ parentPath: "", open: false });
                        setNewDirName("");
                        setExpandedBeforeCreate(null); // Clear the saved expanded state
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
                onClick={() => {
                  setCreateMenuDir({ parentPath: "", open: false });
                  setExpandedBeforeCreate(null); // Clear the saved expanded state
                }}
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
              Paste image for <span style={{ color: "#0074d9" }}>
                {infoPopup.node ? formatDirNameForDisplay(infoPopup.node.name) : ''}
              </span>
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
              Edit JSON for <span style={{ color: "#388e3c" }}>
                {jsonPopup.node ? formatDirNameForDisplay(jsonPopup.node.name) : ''}
              </span>
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
                        file_name: (() => {
                          // Only send the filename, not the full path
                          return jsonPopup.fileName.trim();
                        })(),
                        json_text: jsonPopup.text
                      })
                    });
                    // Refetch tree data after saving JSON
                    fetch(dataUrl)
                      .then(res => res.json())
                      .then(treeData => setTree(treeData));
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
