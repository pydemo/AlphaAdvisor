import streamlit as st
import os
import pathlib
import glob

def list_directory(directory, pattern="*", show_hidden=False):
    """List all files and directories in a directory."""
    files = []
    dirs = []
    
    try:
        # Get all items in directory
        path = pathlib.Path(directory)
        for item in path.glob(pattern):
            # Skip hidden files unless show_hidden is True
            if not show_hidden and item.name.startswith('.'):
                continue
            # Skip Zone.Identifier files
            if item.name.endswith('.Zone.Identifier'):
                continue
                
            if item.is_dir():
                dirs.append(item)
            else:
                files.append(item)
    except Exception as e:
        st.error(f"Error accessing {directory}: {e}")
        
    # Sort directories and files
    return sorted(dirs, key=lambda x: x.name.lower()), sorted(files, key=lambda x: x.name.lower())

def main():
    st.set_page_config(page_title="Directory Tree Explorer", layout="wide")
    st.title("Directory Tree Explorer")
    
    # Get the starting directory - default to current directory
    start_dir = st.text_input("Directory Path", os.getcwd())
    
    # Input for file pattern
    pattern = st.text_input("Filter Pattern (e.g., *.py, *.json)", "*")
    
    # Option to show hidden files
    show_hidden = st.checkbox("Show Hidden Files", False)
    
    if not os.path.exists(start_dir):
        st.error(f"Directory {start_dir} not found.")
        return
    
    # Initialize session state for navigation and selection
    if 'current_dir' not in st.session_state:
        st.session_state.current_dir = start_dir
    elif st.session_state.current_dir != start_dir:
        st.session_state.current_dir = start_dir
    
    if 'selected_paths' not in st.session_state:
        st.session_state.selected_paths = []
    
    # Navigation buttons
    col1, col2, col3 = st.columns([0.3, 0.3, 0.4])
    
    with col1:
        if st.button("⬆️ Parent Directory"):
            parent = os.path.dirname(st.session_state.current_dir)
            if os.path.exists(parent):
                st.session_state.current_dir = parent
                st.experimental_rerun()
    
    with col2:
        if st.button("🔄 Refresh"):
            st.experimental_rerun()
    
    # Display current path
    st.write(f"**Current path:** {st.session_state.current_dir}")
    
    # List directories and files
    dirs, files = list_directory(st.session_state.current_dir, pattern, show_hidden)
    
    # Create two columns for display
    browser_col, selected_col = st.columns([0.7, 0.3])
    
    with browser_col:
        st.subheader("Directory Contents")
        st.write("Click on folders to navigate, use checkboxes to select items:")
        
        # Display directories first with navigation
        if dirs:
            st.write("**Directories:**")
            for d in dirs:
                col1, col2 = st.columns([0.05, 0.95])
                with col1:
                    # Checkbox for selection
                    is_selected = str(d) in st.session_state.selected_paths
                    if st.checkbox("", key=f"sel_{d}", value=is_selected):
                        if str(d) not in st.session_state.selected_paths:
                            st.session_state.selected_paths.append(str(d))
                    else:
                        if str(d) in st.session_state.selected_paths:
                            st.session_state.selected_paths.remove(str(d))
                
                with col2:
                    # Button for navigation
                    if st.button(f"📁 {d.name}", key=f"nav_{d}"):
                        st.session_state.current_dir = str(d)
                        st.experimental_rerun()
        
        # Display files
        if files:
            st.write("**Files:**")
            for f in files:
                col1, col2 = st.columns([0.05, 0.95])
                with col1:
                    # Checkbox for selection
                    is_selected = str(f) in st.session_state.selected_paths
                    if st.checkbox("", key=f"sel_{f}", value=is_selected):
                        if str(f) not in st.session_state.selected_paths:
                            st.session_state.selected_paths.append(str(f))
                    else:
                        if str(f) in st.session_state.selected_paths:
                            st.session_state.selected_paths.remove(str(f))
                
                with col2:
                    st.write(f"📄 {f.name}")
        
        if not dirs and not files:
            st.write("No files or directories match the filter pattern.")
    
    with selected_col:
        st.subheader("Selected Items")
        
        # Display selected paths
        if st.session_state.selected_paths:
            for path in st.session_state.selected_paths:
                # Try to make path relative to the start directory
                try:
                    rel_path = os.path.relpath(path, start_dir)
                    display_path = rel_path if rel_path != '.' else os.path.basename(path)
                except ValueError:
                    # If paths are on different drives
                    display_path = path
                
                st.write(f"- {display_path}")
            
            # Add buttons to copy selected paths or clear selection
            col1, col2 = st.columns(2)
            
            with col1:
                if st.button("Copy Paths"):
                    paths_text = "\n".join(st.session_state.selected_paths)
                    st.code(paths_text)
                    st.success("Copied! Select the code block above.")
            
            with col2:
                if st.button("Clear Selection"):
                    st.session_state.selected_paths = []
                    st.experimental_rerun()
        else:
            st.write("No items selected")

if __name__ == "__main__":
    main()