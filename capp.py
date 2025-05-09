import os
import streamlit as st
from include.tree import build_tree, render_tree
from include.search_bar import render_search_bar

# --- Main App ---
st.set_page_config(page_title="Directory Tree (wxTree style)", layout="wide")
st.title("📂 Directory Tree (wxTree style)")

if "selected" not in st.session_state:
    st.session_state["selected"] = None

root_path = os.getcwd()

# --- Persistent search mode using session state ---
if "search_active" not in st.session_state:
    st.session_state["search_active"] = False
if "search_filter" not in st.session_state:
    st.session_state["search_filter"] = ""
if "filter" not in st.session_state:
    st.session_state["filter"] = "comm"

# --- Render search bar ---
filter_value, search_clicked, reset_clicked = render_search_bar()

# Handle reset button click
if reset_clicked:
    st.session_state["search_active"] = False
    st.session_state["search_filter"] = ""
def build_filtered_tree(path, filter_text):
    filter_text = filter_text.lower()
    tree = []
    try:
        entries = sorted(os.listdir(path), key=lambda x: (not os.path.isdir(os.path.join(path, x)), x.lower()))
    except PermissionError:
        return tree
    for entry in entries:
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            children = build_filtered_tree(full_path, filter_text)
            if children:
                tree.append({
                    "type": "dir",
                    "name": entry,
                    "path": full_path,
                    "children": children
                })
        else:
            if filter_text in entry.lower():
                tree.append({
                    "type": "file",
                    "name": entry,
                    "path": full_path
                })
    return tree

# Persistent search mode using session state
if "search_active" not in st.session_state:
    st.session_state["search_active"] = False
if "search_filter" not in st.session_state:
    st.session_state["search_filter"] = ""

elif search_clicked and filter_value.strip():
    st.session_state["search_active"] = True
    st.session_state["search_filter"] = filter_value.strip()

if st.session_state["search_active"] and st.session_state["search_filter"]:
    tree = build_filtered_tree(root_path, st.session_state["search_filter"])
else:
    tree = build_tree(root_path)

st.markdown(
    """
    <style>
    .stButton>button {
        text-align: left;
        width: 100%;
        border-radius: 2px;
        margin-bottom: 1px;
        font-size: 0.95rem !important;
        padding: 2px 6px !important;
        min-height: 36px !important;
        height: 36px !important;
        width: 136px !important;
    }
    .stButton>button:hover {
        background: #e3f2fd;
    }
    .stCheckbox {
        padding-top: 0 !important;
        padding-bottom: 0 !important;
        margin-top: 0 !important;
        margin-bottom: 0 !important;
        min-height: 18px !important;
        height: 18px !important;
    }
    .tree-highlight-dir, .tree-highlight-file {
        font-size: 0.82rem !important;
        padding: 1px 6px !important;
        border-radius: 2px !important;
        display: inline-block;
        margin-bottom: 1px !important;
    }
    .tree-highlight-dir {
        color: #fff !important;
        background: #1976d2 !important;
    }
    .tree-highlight-file {
        color: #fff !important;
        background: #388e3c !important;
    }
    .stMarkdown, .stMarkdown p {
        font-size: 0.85rem !important;
        margin-bottom: 1px !important;
    }
    .stColumns {
        margin-bottom: 0 !important;
    }
    </style>
    """,
    unsafe_allow_html=True
)

# --- Unselect button ---
if st.session_state.get("selected"):
    if st.button("Unselect", key="unselect-btn"):
        st.session_state["selected"] = None

render_tree(tree)

if st.session_state.get("selected"):
    st.success(f"Selected: {st.session_state['selected']}")
else:
    st.info("Select a file or directory from the tree.")

st.markdown(
    """
    <hr>
    <small>
    <b>Note:</b> This tree emulates wxPython's wxTree look and feel using Streamlit toggles and buttons.<br>
    Directories are expandable/collapsible. Click on a file or directory to select it.<br>
    Selected items are highlighted.
    </small>
    """,
    unsafe_allow_html=True
)
