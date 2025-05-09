import streamlit as st
import os
import pathlib
from typing import List, Dict, Any, Optional, Tuple
import json

def get_file_icon(filename):
    """Return an appropriate icon based on file extension"""
    ext = os.path.splitext(filename)[1].lower()
    if ext in ['.jpg', '.jpeg', '.png', '.gif']:
        return "🖼️"
    elif ext in ['.json']:
        return "📊"
    elif ext in ['.txt', '.md']:
        return "📝"
    elif ext in ['.py', '.js', '.html', '.css']:
        return "💻"
    else:
        return "📄"

def render_file_content(file_path: str) -> None:
    """Render the content of a file based on its extension"""
    try:
        ext = os.path.splitext(file_path)[1].lower()
        
        if ext in ['.jpg', '.jpeg', '.png', '.gif']:
            st.image(file_path, caption=os.path.basename(file_path))
        elif ext in ['.json']:
            with open(file_path, 'r') as f:
                content = json.load(f)
            st.json(content)
        elif ext in ['.txt', '.md', '.py', '.js', '.html', '.css']:
            with open(file_path, 'r') as f:
                content = f.read()
            st.code(content, language=ext[1:] if ext != '.md' else 'markdown')
        else:
            st.write(f"File preview not available for {os.path.basename(file_path)}")
    except Exception as e:
        st.error(f"Error displaying file: {str(e)}")

def build_tree(path, level=0, expanded_key_prefix="", is_root=False, prefix_lines=""):
    """Build a nested tree structure for the sidebar"""
    path_obj = pathlib.Path(path)
    
    try:
        # Get directories and files in the current path
        dirs = []
        files = []
        
        for item in path_obj.iterdir():
            if item.is_dir():
                dirs.append(item)
            else:
                files.append(item)
        
        # Sort directories and files by name
        dirs.sort(key=lambda x: x.name.lower())
        files.sort(key=lambda x: x.name.lower())
        
        # Process directories
        for i, dir_path in enumerate(dirs):
            dir_name = dir_path.name
            is_last_dir = i == len(dirs) - 1 and len(files) == 0
            
            # Choose the appropriate tree connector
            if level == 0:
                branch = ""
            elif is_last_dir:
                branch = prefix_lines + "└── "
                new_prefix = prefix_lines + "    "
            else:
                branch = prefix_lines + "├── "
                new_prefix = prefix_lines + "│   "
            
            folder_icon = "📂" if is_root else "📁"
            display_name = f"{branch}{folder_icon} {dir_name}"
            
            # Create a unique key for this directory's expanded state
            expanded_key = f"{expanded_key_prefix}_{dir_name}"
            if expanded_key not in st.session_state:
                st.session_state[expanded_key] = False
            
            # Display the directory with expandable option
            is_expanded = st.checkbox(
                display_name,
                value=st.session_state[expanded_key],
                key=f"dir_{expanded_key}"
            )
            
            # Update session state if expanded state changed
            if is_expanded != st.session_state[expanded_key]:
                st.session_state[expanded_key] = is_expanded
                st.rerun()
            
            # If expanded, show the contents recursively
            if is_expanded:
                # Add "Open" button for the directory
                col1, col2, col3 = st.columns([4, 2, 1])
                with col2:
                    if st.button("Open", key=f"open_{expanded_key}"):
                        st.session_state.current_dir = str(dir_path)
                        # Update history
                        st.session_state.history = st.session_state.history[:st.session_state.history_index + 1]
                        st.session_state.history.append(str(dir_path))
                        st.session_state.history_index = len(st.session_state.history) - 1
                        st.rerun()
                with col3:
                    # Add checkbox for selection
                    is_selected = str(dir_path) in st.session_state.selected_items
                    if st.checkbox("", key=f"select_dir_{expanded_key}", value=is_selected):
                        if str(dir_path) not in st.session_state.selected_items:
                            st.session_state.selected_items.append(str(dir_path))
                    else:
                        if str(dir_path) in st.session_state.selected_items:
                            st.session_state.selected_items.remove(str(dir_path))
                
                # Recursively build tree for subdirectories
                build_tree(dir_path, level + 1, expanded_key, False, new_prefix)
        
        # Process files
        for i, file_path in enumerate(files):
            file_name = file_path.name
            is_last_file = i == len(files) - 1
            
            # Choose the appropriate tree connector
            if level == 0:
                branch = ""
            elif is_last_file:
                branch = prefix_lines + "└── "
            else:
                branch = prefix_lines + "├── "
            
            icon = get_file_icon(file_name)
            display_name = f"{branch}{icon} {file_name}"
            
            col1, col2, col3 = st.columns([4, 2, 1])
            with col1:
                st.text(display_name)
            with col2:
                if st.button("View", key=f"view_{expanded_key_prefix}_{file_name}"):
                    st.session_state.viewing_file = str(file_path)
            with col3:
                # Add checkbox for selection
                is_selected = str(file_path) in st.session_state.selected_items
                if st.checkbox("", key=f"select_file_{expanded_key_prefix}_{file_name}", value=is_selected):
                    if str(file_path) not in st.session_state.selected_items:
                        st.session_state.selected_items.append(str(file_path))
                else:
                    if str(file_path) in st.session_state.selected_items:
                        st.session_state.selected_items.remove(str(file_path))
    
    except (PermissionError, FileNotFoundError) as e:
        st.error(f"Error accessing {path}: {str(e)}")

def main():
    st.set_page_config(layout="wide", page_title="Directory Explorer")
    st.title("Directory Explorer")
    
    # Initialize session state
    if 'current_dir' not in st.session_state:
        st.session_state.current_dir = os.getcwd()
    if 'history' not in st.session_state:
        st.session_state.history = [os.getcwd()]
    if 'history_index' not in st.session_state:
        st.session_state.history_index = 0
    if 'selected_items' not in st.session_state:
        st.session_state.selected_items = []
    if 'instructions' not in st.session_state:
        st.session_state.instructions = ""
    if 'viewing_file' not in st.session_state:
        st.session_state.viewing_file = None
    
    # Navigation controls
    col_nav1, col_nav2, col_nav3, col_nav4 = st.columns([1, 1, 2, 1])
    
    with col_nav1:
        if st.button("⬅️ Back"):
            if st.session_state.history_index > 0:
                st.session_state.history_index -= 1
                st.session_state.current_dir = st.session_state.history[st.session_state.history_index]
                st.rerun()
    
    with col_nav2:
        if st.button("➡️ Forward"):
            if st.session_state.history_index < len(st.session_state.history) - 1:
                st.session_state.history_index += 1
                st.session_state.current_dir = st.session_state.history[st.session_state.history_index]
                st.rerun()
    
    with col_nav3:
        new_path = st.text_input("Path:", value=st.session_state.current_dir)
        if new_path != st.session_state.current_dir:
            try:
                if os.path.isdir(new_path):
                    st.session_state.current_dir = new_path
                    # Update history
                    st.session_state.history = st.session_state.history[:st.session_state.history_index + 1]
                    st.session_state.history.append(new_path)
                    st.session_state.history_index = len(st.session_state.history) - 1
                    st.rerun()
                else:
                    st.error(f"Not a valid directory: {new_path}")
            except Exception as e:
                st.error(f"Error navigating to {new_path}: {str(e)}")
    
    with col_nav4:
        if st.button("🏠 Home"):
            home_dir = os.path.expanduser("~")
            if home_dir != st.session_state.current_dir:
                st.session_state.current_dir = home_dir
                # Update history
                st.session_state.history = st.session_state.history[:st.session_state.history_index + 1]
                st.session_state.history.append(home_dir)
                st.session_state.history_index = len(st.session_state.history) - 1
                st.rerun()
    
    # Split the page into columns
    col1, col2 = st.columns([1, 2])
    
    with col1:
        st.header("Directory Structure")
        
        # Add parent directory option
        parent_dir = os.path.dirname(st.session_state.current_dir)
        if parent_dir != st.session_state.current_dir:
            if st.button("📁 .. (Parent Directory)"):
                st.session_state.current_dir = parent_dir
                # Update history
                st.session_state.history = st.session_state.history[:st.session_state.history_index + 1]
                st.session_state.history.append(parent_dir)
                st.session_state.history_index = len(st.session_state.history) - 1
                st.rerun()
        
        # Show current path content in a tree-like structure
        st.subheader(f"Current Directory: {os.path.basename(st.session_state.current_dir)}")
        
        # Build the directory tree for the current directory
        build_tree(st.session_state.current_dir, level=0, expanded_key_prefix="root", is_root=True, prefix_lines="")
    
    with col2:
        st.header("Selected Items")
        
        # Show selected items with option to view/remove
        if st.session_state.selected_items:
            for i, item_path in enumerate(st.session_state.selected_items):
                col_sel_item, col_view, col_remove = st.columns([3, 1, 1])
                
                item_name = os.path.basename(item_path)
                is_dir = os.path.isdir(item_path)
                prefix = "📁 " if is_dir else get_file_icon(item_name) + " "
                
                with col_sel_item:
                    st.write(f"{prefix} {item_name}")
                
                with col_view:
                    if not is_dir and st.button("View", key=f"view_{i}"):
                        st.session_state.viewing_file = item_path
                
                with col_remove:
                    if st.button("Remove", key=f"remove_{i}"):
                        st.session_state.selected_items.remove(item_path)
                        st.rerun()
        else:
            st.info("No items selected. Use the checkboxes in the directory structure to select files or folders.")
        
        # File preview section
        if st.session_state.viewing_file:
            st.subheader(f"Preview: {os.path.basename(st.session_state.viewing_file)}")
            render_file_content(st.session_state.viewing_file)
        
        # Instructions section
        st.header("Instructions")
        instructions = st.text_area("Enter your instructions here:", 
                                   height=200, 
                                   value=st.session_state.instructions)
        
        if instructions != st.session_state.instructions:
            st.session_state.instructions = instructions
        
        if st.button("Process Instructions"):
            if st.session_state.instructions:
                st.success("Processing instructions...")
                st.write("Selected items:")
                for item_path in st.session_state.selected_items:
                    st.write(f"- {item_path}")
                st.write("Instructions:")
                st.write(st.session_state.instructions)
            else:
                st.warning("Please enter instructions first.")

if __name__ == "__main__":
    main()
    
"""
To run this app:
1. Install streamlit if not already installed:
   pip install streamlit    # In a virtual environment
   
2. Run the app:
   streamlit run dev_app.py
"""