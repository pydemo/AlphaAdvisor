import React, { useEffect, useState } from "react";

type TreeNode = {
  name: string;
  path: string;
  type: "file" | "directory";
  children?: TreeNode[];
};

type TreeViewProps = {
  dataUrl: string;
};

const TreeView: React.FC<TreeViewProps> = ({ dataUrl }) => {
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

  const renderTree = (node: TreeNode) => {
    const isDir = node.type === "directory";
    const isOpen = expanded.has(node.path);

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

  return (
    <div>
      {renderTree(tree)}
    </div>
  );
};

export default TreeView;
