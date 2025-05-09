import os
import json

# List of file or directory names to exclude (case-sensitive, match by name only)
EXCLUDE = [
    ".git",           # Example: exclude .git directory
    "node_modules",   # Example: exclude node_modules
    # Add more names to exclude as needed
    "tree-view-app"
]

def build_tree(path):
    tree = {"name": os.path.basename(path) or path, "path": path, "type": "directory", "children": []}
    try:
        for entry in sorted(os.listdir(path)):
            if entry in EXCLUDE:
                continue
            full_path = os.path.join(path, entry)
            if os.path.isdir(full_path):
                subtree = build_tree(full_path)
                if subtree is not None:
                    tree["children"].append(subtree)
            else:
                tree["children"].append({
                    "name": entry,
                    "path": full_path,
                    "type": "file"
                })
    except PermissionError:
        pass
    # If a directory is empty after exclusions, still include it (can change if needed)
    return tree

if __name__ == "__main__":
    root_path = os.path.abspath(os.path.dirname(__file__)).replace('/tree-view-app', '')
    tree = build_tree(root_path)
    with open(os.path.join(os.path.dirname(__file__), "public", "tree-data.json"), "w") as f:
        json.dump(tree, f, indent=2)
