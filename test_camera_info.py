# save this as get_window_position.py on your Windows file system
import pygetwindow as gw
import json

win = gw.getWindowsWithTitle('Notepad')[0]
info = {
    'left': win.left,
    'top': win.top,
    'width': win.width,
    'height': win.height
}
print(json.dumps(info))
