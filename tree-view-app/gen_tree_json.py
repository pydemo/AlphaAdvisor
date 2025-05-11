import os
import json
import fnmatch

# List of file or directory names or glob patterns to include (case-sensitive)
# If INCLUDE is not empty, only files/dirs matching at least one pattern will be included.
# Supports wildcards, e.g. "*.py" to include only Python files.
INCLUDE = [
    # Example: "include", "tree-view-app", "*.py"
    "tree-view-app/public/*",
]

# List of file or directory names or glob patterns to exclude (case-sensitive)
# Supports wildcards, e.g. "*Zone.Identifier" to exclude files ending with Zone.Identifier
EXCLUDE = [
    ".git",           # Example: exclude .git directory
    "node_modules",   # Example: exclude node_modules
    # Add more names or patterns to exclude as needed
    "tree-view-app",
    ".claude",
    "include",
    "*Zone.Identifier"
]

def matches_any(entry, patterns):
    return any(fnmatch.fnmatch(entry, pattern) for pattern in patterns)

def should_include_path(rel_path):
    """Return True if rel_path matches any INCLUDE pattern (or INCLUDE is empty)."""
    if not INCLUDE:
        return True
    return any(fnmatch.fnmatch(rel_path, pattern) for pattern in INCLUDE)

def should_exclude_path(entry):
    """Return True if entry matches any EXCLUDE pattern."""
    return matches_any(entry, EXCLUDE)

def has_includable_descendant(full_path, entry_rel_path):
    """Return True if any descendant of full_path matches INCLUDE."""
    for root, dirs, files in os.walk(full_path):
        rel_root = os.path.join(entry_rel_path, os.path.relpath(root, full_path)) if root != full_path else entry_rel_path
        for name in dirs + files:
            rel = os.path.join(rel_root, name)
            if should_include_path(rel):
                return True
    return False

def build_tree(path, rel_path="", in_included_subtree=False):
    tree = {"name": os.path.basename(path) or path, "path": path, "type": "directory", "children": []}
    try:
        # Check if this is the top-level MENU directory
        is_top_menu_dir = path.endswith('/MENU')
        # Check if this is any MENU directory
        is_menu_dir = '/MENU/' in path
        
        entries = os.listdir(path)
        
        # Sort entries based on directory type
        if is_top_menu_dir:
            # For the top-level MENU directory, sort directories by creation time (newest first)
            dirs = [entry for entry in entries if os.path.isdir(os.path.join(path, entry))]
            files = [entry for entry in entries if not os.path.isdir(os.path.join(path, entry))]

            # Get creation time for each directory
            dirs_with_ctime = []
            for entry in dirs:
                full_path = os.path.join(path, entry)
                try:
                    ctime = os.path.getctime(full_path)
                except (FileNotFoundError, PermissionError):
                    ctime = 0
                dirs_with_ctime.append((entry, ctime))
            # Sort directories by creation time, oldest first
            sorted_dirs = [entry for entry, _ in sorted(dirs_with_ctime, key=lambda x: x[1])]

            # Combine sorted directories and alphabetically sorted files
            sorted_entries = sorted_dirs + sorted(files)
        elif is_menu_dir:
            # For other MENU subdirectories, sort by modification time (newest first)
            entries_with_time = []
            for entry in entries:
                full_path = os.path.join(path, entry)
                try:
                    # Get modification time (mtime) for sorting
                    mod_time = os.path.getmtime(full_path)
                    entries_with_time.append((entry, mod_time))
                except (FileNotFoundError, PermissionError):
                    entries_with_time.append((entry, 0))
            
            # Sort by modification time (newest first)
            sorted_entries = [entry for entry, _ in sorted(entries_with_time, key=lambda x: x[1], reverse=True)]
        else:
            # Regular alphabetical sort for non-MENU directories
            sorted_entries = sorted(entries)
        
        for entry in sorted_entries:
            full_path = os.path.join(path, entry)
            entry_rel_path = os.path.join(rel_path, entry) if rel_path else entry

            # If EXCLUDE matches this entry and no INCLUDE pattern matches a descendant, skip it
            if should_exclude_path(entry):
                if os.path.isdir(full_path) and INCLUDE and has_includable_descendant(full_path, entry_rel_path):
                    pass  # Traverse into it
                else:
                    continue

            # If we're in an included subtree, skip INCLUDE checks for descendants
            in_this_included_subtree = in_included_subtree or (INCLUDE and should_include_path(entry_rel_path))

            # If not in an included subtree, apply INCLUDE logic
            if not in_this_included_subtree and INCLUDE and not should_include_path(entry_rel_path):
                if os.path.isdir(full_path):
                    if not has_includable_descendant(full_path, entry_rel_path):
                        continue
                else:
                    continue

            if os.path.isdir(full_path):
                subtree = build_tree(full_path, entry_rel_path, in_this_included_subtree)
                if subtree is not None:
                    tree["children"].append(subtree)
            else:
                if not INCLUDE or in_this_included_subtree or should_include_path(entry_rel_path):
                    tree["children"].append({
                        "name": entry,
                        "path": full_path,
                        "type": "file"
                    })
    except PermissionError:
        pass
    # Always return the tree, even if it has no children (to show empty dirs)
    return tree

if __name__ == "__main__":
    root_path = os.path.abspath(os.path.dirname(__file__)).replace('/tree-view-app', '')
    tree = build_tree(root_path)
    with open(os.path.join(os.path.dirname(__file__), "public", "tree-data.json"), "w") as f:
        json.dump(tree, f, indent=2)
