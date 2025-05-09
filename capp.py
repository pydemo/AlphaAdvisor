import os
import streamlit as st

# --- Utility to build the directory tree as a nested dict ---
def build_tree(path):
    tree = []
    try:
        entries = sorted(os.listdir(path), key=lambda x: (not os.path.isdir(os.path.join(path, x)), x.lower()))
    except PermissionError:
        return tree
    for entry in entries:
        full_path = os.path.join(path, entry)
        if os.path.isdir(full_path):
            tree.append({
                "type": "dir",
                "name": entry,
                "path": full_path,
                "children": build_tree(full_path)
            })
        else:
            tree.append({
                "type": "file",
                "name": entry,
                "path": full_path
            })
    return tree

# --- Recursive rendering of the tree using toggles and indentation ---
def render_tree(tree, level=0, key_prefix=""):
    for idx, node in enumerate(tree):
        node_key = f"{key_prefix}-{node['name']}-{idx}"
        indent = "&nbsp;" * 3 * level  # slightly less indent for compactness
        # Indentation: use a left spacer column proportional to level
        spacer = 0.04 + 0.04 * level  # 0.04 for root, +0.04 per level
        label_col = 0.89 - 0.04 * level  # keep total ~0.97, rest for toggle
        if node["type"] == "dir":
            exp_key = f"exp-{node_key}"
            if exp_key not in st.session_state:
                st.session_state[exp_key] = False
            cols = st.columns([spacer, 0.07, label_col, 0.1])
            with cols[1]:
                # Use checkbox for expand/collapse, label is empty for compactness
                st.checkbox(
                    "",
                    value=st.session_state[exp_key],
                    key=f"chk-{exp_key}",
                    label_visibility="collapsed"
                )
            with cols[2]:
                # Directory selectable
                exp_state = st.session_state.get(f"chk-{exp_key}", False)
                label = f"{'➖' if exp_state else '➕'} 📁 {node['name']}"
                if st.button(
                    label,
                    key=f"select-dir-{node_key}",
                    help=node['path'],
                ):
                    if st.session_state.get('selected') == node['path']:
                        st.session_state['selected'] = None
                    else:
                        st.session_state['selected'] = node['path']
                # Highlight if selected
                if st.session_state.get('selected') == node['path']:
                    st.markdown(
                        f"<span class='tree-highlight-dir'>[DIR] {node['name']} (selected)</span>",
                        unsafe_allow_html=True
                    )
            if st.session_state.get(f"chk-{exp_key}", False):
                render_tree(node["children"], level=level+1, key_prefix=node_key)
        else:
            # File selectable
            cols = st.columns([spacer, 0.93 - spacer])
            with cols[1]:
                if st.button(
                    f"📄 {node['name']}",
                    key=f"select-file-{node_key}",
                    help=node['path'],
                ):
                    if st.session_state.get('selected') == node['path']:
                        st.session_state['selected'] = None
                    else:
                        st.session_state['selected'] = node['path']
                if st.session_state.get('selected') == node['path']:
                    st.markdown(
                        f"<span class='tree-highlight-file'>[FILE] {node['name']} (selected)</span>",
                        unsafe_allow_html=True
                    )

# --- Main App ---
st.set_page_config(page_title="Directory Tree (wxTree style)", layout="wide")
st.title("📂 Directory Tree (wxTree style)")

if "selected" not in st.session_state:
    st.session_state["selected"] = None

root_path = os.getcwd()
tree = build_tree(root_path)

st.markdown(
    """
    <style>
    .stButton>button {
        text-align: left;
        width: 100%;
        border-radius: 2px;
        margin-bottom: 1px;
        font-size: 0.85rem !important;
        padding: 2px 6px !important;
        min-height: 22px !important;
        height: 22px !important;
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
