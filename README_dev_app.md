# Directory Explorer Streamlit App

This Streamlit application provides a user-friendly interface to explore your file system, select files/directories, and process them with custom instructions.

## Features

- **Tree-like Directory Structure**: Browse files and directories in a hierarchical tree view with expand/collapse functionality
- **Directory Navigation**: Browse through your file system with back/forward navigation, path input, and home button
- **File/Directory Selection**: Select multiple files and directories for processing
- **File Preview**: View the contents of various file types (images, JSON, text files, code)
- **Instructions**: Enter custom instructions to process the selected items

## Installation

1. Create a virtual environment (recommended):
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

2. Install required packages:
   ```bash
   pip install streamlit
   ```

## Usage

1. Run the application:
   ```bash
   streamlit run dev_app.py
   ```

2. The application will open in your default web browser, typically at http://localhost:8501

3. Use the interface to:
   - Navigate through directories
   - Select files and folders using checkboxes
   - Preview file contents by clicking "View" button
   - Enter instructions in the text area
   - Click "Process Instructions" to execute your instructions on the selected items

## Requirements

- Python 3.6+
- Streamlit

## Tips

- The app maintains navigation history, allowing you to use the back and forward buttons
- Use the path input field to quickly navigate to a specific directory
- Home button takes you to your user home directory
- File preview supports common formats like images, JSON, text files, and code