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

if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5001, debug=True)
