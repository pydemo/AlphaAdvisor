import os
import streamlit as st

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

def render_tree(tree, level=0, key_prefix=""):
    for idx, node in enumerate(tree):
        node_key = f"{key_prefix}-{node['name']}-{idx}"
        indent_px = 16 * level  # 16px per level
        spacer = max(0.01, indent_px / 200.0)
        if node["type"] == "dir":
            exp_key = f"exp-{node_key}"
            if exp_key not in st.session_state:
                st.session_state[exp_key] = False
            cols = st.columns([spacer, 0.93 - spacer])
            with cols[1]:
                inner_cols = st.columns([0.025, 0.975])
                with inner_cols[0]:
                    toggle = st.checkbox(
                        "",
                        value=st.session_state[exp_key],
                        key=f"chk-{exp_key}",
                        label_visibility="collapsed"
                    )
                with inner_cols[1]:
                    label = f"{'➖' if toggle else '➕'} 📁 {node['name']}"
                    if st.button(
                        label,
                        key=f"select-dir-{node_key}",
                        help=node['path']
                    ):
                        if st.session_state.get('selected') == node['path']:
                            st.session_state['selected'] = None
                        else:
                            st.session_state['selected'] = node['path']
                    if st.session_state.get('selected') == node['path']:
                        st.markdown(
                            f"<span class='tree-highlight-dir'>[DIR] {node['name']} (selected)</span>",
                            unsafe_allow_html=True
                        )
            if toggle:
                render_tree(node["children"], level=level+1, key_prefix=node_key)
        else:
            cols = st.columns([spacer, 0.99 - spacer])
            with cols[1]:
                label = f"📄 {node['name']}"
                if st.button(
                    label,
                    key=f"select-file-{node_key}",
                    help=node['path']
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
