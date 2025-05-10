from flask import Flask, request, jsonify
import os
from pathlib import Path
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

@app.route("/api/create_dir", methods=["POST"])
def create_dir():
    data = request.get_json()
    parent_path = data.get("parent_path")
    dir_name = data.get("dir_name")
    if not parent_path or not dir_name:
        return jsonify({"success": False, "error": "Missing parent_path or dir_name"}), 400

    # Sanitize dir_name to prevent path traversal
    if "/" in dir_name or "\\" in dir_name or dir_name.strip() == "":
        return jsonify({"success": False, "error": "Invalid directory name"}), 400

    new_dir_path = Path(parent_path) / dir_name
    try:
        new_dir_path.mkdir(parents=False, exist_ok=False)
        return jsonify({"success": True, "path": str(new_dir_path)})
    except FileExistsError:
        return jsonify({"success": False, "error": "Directory already exists"}), 409
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

@app.route("/api/save-image-file", methods=["POST"])
def save_image_file():
    data = request.get_json()
    dir_path = data.get("dir_path")
    file_name = data.get("file_name")
    image_data = data.get("image_data")
    if not dir_path or not file_name or not image_data:
        return jsonify({"success": False, "error": "Missing dir_path, file_name, or image_data"}), 400

    # Sanitize file_name to prevent path traversal
    if "/" in file_name or "\\" in file_name or file_name.strip() == "":
        return jsonify({"success": False, "error": "Invalid file name"}), 400

    # Only allow .png extension for safety
    if not file_name.lower().endswith(".png"):
        return jsonify({"success": False, "error": "Only .png files allowed"}), 400

    # Ensure dir_path exists and is a directory
    dir_path_obj = Path(dir_path)
    if not dir_path_obj.exists() or not dir_path_obj.is_dir():
        return jsonify({"success": False, "error": "Target directory does not exist"}), 400

    # Decode base64 image data from data URL
    try:
        if image_data.startswith("data:image"):
            header, b64data = image_data.split(",", 1)
        else:
            return jsonify({"success": False, "error": "Invalid image data"}), 400
        import base64
        img_bytes = base64.b64decode(b64data)
        out_path = dir_path_obj / file_name
        with open(out_path, "wb") as f:
            f.write(img_bytes)
        return jsonify({"success": True, "path": str(out_path)})
    except Exception as e:
        return jsonify({"success": False, "error": str(e)}), 500

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
