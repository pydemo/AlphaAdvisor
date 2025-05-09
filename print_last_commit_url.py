#!/usr/bin/env python3
import subprocess

def get_remote_url():
    result = subprocess.run(["git", "remote", "-v"], 
                           capture_output=True, text=True, check=True)
    for line in result.stdout.splitlines():
        if "(push)" in line:
            parts = line.split()
            url = parts[1]
            if url.endswith(".git"):
                url = url[:-4]
            if url.startswith("git@"):
                # Convert SSH URL to HTTPS
                url = url.replace(":", "/").replace("git@", "https://")
            return url
    return None

def get_last_commit_hash():
    result = subprocess.run(["git", "rev-parse", "HEAD"], 
                           capture_output=True, text=True, check=True)
    return result.stdout.strip()

def main():
    try:
        remote_url = get_remote_url()
        if not remote_url:
            print("Error: Could not find remote URL")
            return
        
        commit_hash = get_last_commit_hash()
        
        # Format GitHub URL
        if "github.com" in remote_url:
            commit_url = f"{remote_url}/commit/{commit_hash}"
        # Format GitLab URL
        elif "gitlab.com" in remote_url:
            commit_url = f"{remote_url}/-/commit/{commit_hash}"
        # Generic fallback format
        else:
            commit_url = f"{remote_url}/commit/{commit_hash}"
        
        print(commit_url)
    except subprocess.CalledProcessError as e:
        print(f"Error: {e}")

if __name__ == "__main__":
    main()