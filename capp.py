import os
import streamlit as st
from include.tree import build_tree, render_tree

# --- Main App ---
st.set_page_config(page_title="Directory Tree (wxTree style)", layout="wide")
st.title("📂 Directory Tree (wxTree style)")

if "selected" not in st.session_state:
    st.session_state["selected"] = None

root_path = os.getcwd()

# --- Filter input and search button (label left of input) ---
label_col, input_col, btn_col, _ = st.columns([0.03, 0.22, 0.11, 0.58])
with label_col:
    st.markdown(
        "<div style='display:flex;align-items:center;height:32px;text-align:left;font-size:1rem;'>Filter:</div>",
        unsafe_allow_html=True
    )
with input_col:
    filter_value = st.text_input("", key="filter", label_visibility="collapsed")
with btn_col:
    search_clicked = st.button("Search", key="search-btn")

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
