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
};

const TreeView: React.FC<TreeViewProps> = ({ dataUrl, filter }) => {
  const [tree, setTree] = useState<TreeNode | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [selected, setSelected] = useState<string | null>(null);

  useEffect(() => {
    fetch(dataUrl)
      .then((res) => res.json())
      .then(setTree);
  }, [dataUrl]);

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

  const handleSelect = (path: string) => {
    setSelected(path);
  };

  // Recursively filter the tree to only include nodes matching the filter or with matching descendants
  function filterTree(node: TreeNode, filterStr: string): TreeNode | null {
    if (!filterStr) return node;
    const match = node.name.toLowerCase().includes(filterStr.toLowerCase());
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
            background: selected === node.path ? "#cce5ff" : undefined,
            borderRadius: 4,
            padding: "2px 4px",
            display: "flex",
            alignItems: "center",
            userSelect: "none",
          }}
          onClick={() => {
            handleSelect(node.path);
            if (isDir) toggleExpand(node.path);
          }}
        >
          {isDir ? (
            <span style={{ marginRight: 4 }}>
              {isOpen ? "▼" : "▶"}
            </span>
          ) : (
            <span style={{ width: 16, display: "inline-block" }} />
          )}
          <span>{node.name}</span>
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
    </div>
  );
};

export default TreeView;
