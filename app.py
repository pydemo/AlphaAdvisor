#!/usr/bin/env python3
"""
Interactive Streamlit app displaying the current directory as a collapsible tree with selection.
"""
from pathlib import Path
import streamlit as st

def display_tree(path: Path, level: int = 0):
    """
    Recursively render a directory tree with collapse/expand and selection functionality.
    """
    try:
        entries = sorted(path.iterdir(), key=lambda x: (x.is_file(), x.name.lower()))
    except PermissionError:
        indent = "│   " * level
        st.write(f"{indent}🚫 [Permission denied]")
        return

    for entry in entries:
        # Relative path and sanitized key
        rel_path = entry.as_posix()
        key_safe = rel_path.replace('/', '_').replace('.', '_')
        indent = "│   " * level
        is_selected = st.session_state.get("selected_node") == rel_path

        if entry.is_dir():
            exp_key = f"exp_{key_safe}"
            expanded = st.session_state.get(exp_key, False)
            # Toggle button for expand/collapse
            toggle_label = f"{indent}{'▼' if expanded else '▶'} 📁 {entry.name}/"
            cols = st.columns((0.8, 0.2))
            with cols[0]:
                if st.button(toggle_label, key=f"toggle_{key_safe}"):
                    st.session_state[exp_key] = not expanded
                    expanded = not expanded
            with cols[1]:
                if st.button("Select", key=f"sel_{key_safe}"):
                    st.session_state["selected_node"] = rel_path
            if expanded:
                display_tree(entry, level + 1)
        else:
            cols = st.columns((0.8, 0.2))
            with cols[0]:
                file_icon = "🔹📄" if is_selected else "📄"
                st.write(f"{indent}{file_icon} {entry.name}")
            with cols[1]:
                if st.button("Select", key=f"sel_{key_safe}"):
                    st.session_state["selected_node"] = rel_path

def main():
    st.title("Interactive Directory Tree View")
    st.write("Click folders to expand/collapse and use 'Select' buttons to choose files or folders.")

    if "selected_node" not in st.session_state:
        st.session_state["selected_node"] = None

    st.subheader("Selected Node")
    selected = st.session_state.get("selected_node")
    st.write(selected if selected else "None")

    st.subheader("Directory Tree")
    display_tree(Path("."))

if __name__ == "__main__":
    main()