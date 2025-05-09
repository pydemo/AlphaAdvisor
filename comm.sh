#!/bin/bash
# Usage: ./comm.sh [commit message]
# If no commit message is provided, defaults to "new"

if [ -n "$1" ]; then
    python3 git_push.py "$1"
else
    python3 git_push.py
fi
