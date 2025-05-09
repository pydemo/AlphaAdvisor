import os
import json

def build_tree(path):
    tree = {"name": os.path.basename(path) or path, "path": path, "type": "directory", "children": []}
    try:
        for entry in sorted(os.listdir(path)):
            full_path = os.path.join(path, entry)
            if os.path.isdir(full_path):
                tree["children"].append(build_tree(full_path))
            else:
                tree["children"].append({
                    "name": entry,
                    "path": full_path,
                    "type": "file"
                })
    except PermissionError:
        pass
    return tree

if __name__ == "__main__":
    root_path = os.path.abspath(os.path.dirname(__file__)).replace('/tree-view-app', '')
    tree = build_tree(root_path)
    with open(os.path.join(os.path.dirname(__file__), "public", "tree-data.json"), "w") as f:
        json.dump(tree, f, indent=2)
