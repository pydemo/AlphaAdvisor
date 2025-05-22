import os
import json
import fnmatch

# List of file or directory names or glob patterns to include (case-sensitive)
# If INCLUDE is not empty, only files/dirs matching at least one pattern will be included.
# Supports wildcards, e.g. "*.py" to include only Python files.
INCLUDE = [
    # Only include α7RV directory and its contents
    "α7RV",
    "α7RV/**",
]

# List of file or directory names or glob patterns to exclude (case-sensitive)
# Supports wildcards, e.g. "*Zone.Identifier" to exclude files ending with Zone.Identifier
EXCLUDE = [
    ".git",           # Exclude .git directory
    "node_modules",   # Exclude node_modules
    ".claude",        # Exclude .claude
    "*Zone.Identifier", # Exclude Zone.Identifier files
    # Exclude everything else in public except α7RV
    "docs",
    "favicon.ico",
    "index.html",
    "logo192.png",
    "logo512.png",
    "manifest.json",
    "robots.txt",
    "tree-data.json"
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
            # For other MENU subdirectories, sort by directory name (alphabetically)
            sorted_entries = sorted(entries)
        else:
            # Sort all other directories and files by modification time (oldest first)
            # This matches the behavior of 'ls -ltr'
            entries_with_mtime = []
            for entry in entries:
                full_entry_path = os.path.join(path, entry)
                try:
                    mtime = os.path.getmtime(full_entry_path)
                except (FileNotFoundError, PermissionError):
                    mtime = 0
                entries_with_mtime.append((entry, mtime))
            
            # Sort by modification time (oldest first)
            sorted_entries = [entry for entry, _ in sorted(entries_with_mtime, key=lambda x: x[1])]
        
        # --- NEW LOGIC: Always order dirs first, then files, both sorted by name ---
        dir_entries = []
        file_entries = []
        for entry in sorted_entries:
            full_path = os.path.join(path, entry)
            if os.path.isdir(full_path):
                dir_entries.append(entry)
            else:
                file_entries.append(entry)

        # Sort both lists alphabetically (unless special case for top-level MENU)
        if is_top_menu_dir:
            # Keep sorted_dirs order for dirs, files sorted alphabetically
            sorted_dirs = [entry for entry in dir_entries]  # already sorted above
            sorted_files = sorted(file_entries)
        else:
            sorted_dirs = sorted(dir_entries)
            sorted_files = sorted(file_entries)

        # Process directories first
        for entry in sorted_dirs:
            full_path = os.path.join(path, entry)
            entry_rel_path = os.path.join(rel_path, entry) if rel_path else entry

            if should_exclude_path(entry):
                if os.path.isdir(full_path) and INCLUDE and has_includable_descendant(full_path, entry_rel_path):
                    pass
                else:
                    continue

            in_this_included_subtree = in_included_subtree or (INCLUDE and should_include_path(entry_rel_path))

            if not in_this_included_subtree and INCLUDE and not should_include_path(entry_rel_path):
                if os.path.isdir(full_path):
                    if not has_includable_descendant(full_path, entry_rel_path):
                        continue
                else:
                    continue

            subtree = build_tree(full_path, entry_rel_path, in_this_included_subtree)
            if subtree is not None:
                tree["children"].append(subtree)

        # Then process files
        for entry in sorted_files:
            full_path = os.path.join(path, entry)
            entry_rel_path = os.path.join(rel_path, entry) if rel_path else entry

            if should_exclude_path(entry):
                continue

            in_this_included_subtree = in_included_subtree or (INCLUDE and should_include_path(entry_rel_path))

            if not in_this_included_subtree and INCLUDE and not should_include_path(entry_rel_path):
                continue

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
    # Start from the public directory instead of the root
    root_path = os.path.join(os.path.dirname(__file__), "public")
    tree = build_tree(root_path)
    with open(os.path.join(root_path, "tree-data.json"), "w") as f:
        json.dump(tree, f, indent=2)
