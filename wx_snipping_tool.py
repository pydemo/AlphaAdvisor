import wx

class SnippingToolFrame(wx.Frame):
    def __init__(self):
        wx.Frame.__init__(
            self, None, title="Snipping Tool", style=wx.DEFAULT_FRAME_STYLE | wx.STAY_ON_TOP
        )
        wx.MessageBox("Snipping Tool started. If you see this, the app is running.", "Debug", wx.OK | wx.ICON_INFORMATION)
        self.SetCursor(wx.Cursor(wx.CURSOR_CROSS))
        self.SetBackgroundColour(wx.Colour(200, 200, 200))  # Light gray for visibility
        self.ShowFullScreen(True)

        self.start_pos = None
        self.end_pos = None
        self.rect = None
        self.is_selecting = False

        self.Bind(wx.EVT_LEFT_DOWN, self.on_left_down)
        self.Bind(wx.EVT_LEFT_UP, self.on_left_up)
        self.Bind(wx.EVT_MOTION, self.on_mouse_move)
        self.Bind(wx.EVT_PAINT, self.on_paint)
        self.Bind(wx.EVT_KEY_DOWN, self.on_key_down)

        self.CaptureMouse()
        self.SetFocus()

    def on_left_down(self, event):
        self.start_pos = event.GetPosition()
        self.end_pos = self.start_pos
        self.is_selecting = True
        self.Refresh()

    def on_mouse_move(self, event):
        if self.is_selecting and event.Dragging() and event.LeftIsDown():
            self.end_pos = event.GetPosition()
            self.Refresh()

    def on_left_up(self, event):
        if self.is_selecting:
            self.end_pos = event.GetPosition()
            self.is_selecting = False
            self.ReleaseMouse()
            self.CaptureScreen()
            self.Close()

    def on_key_down(self, event):
        key = event.GetKeyCode()
        if key == wx.WXK_ESCAPE:
            self.Close()

    def on_paint(self, event):
        dc = wx.PaintDC(self)
        if self.start_pos and self.end_pos:
            x1, y1 = self.start_pos
            x2, y2 = self.end_pos
            left = min(x1, x2)
            top = min(y1, y2)
            width = abs(x2 - x1)
            height = abs(y2 - y1)
            pen = wx.Pen(wx.Colour(0, 120, 215), 2)
            brush = wx.Brush(wx.Colour(0, 120, 215, 64))
            dc.SetPen(pen)
            dc.SetBrush(brush)
            dc.DrawRectangle(left, top, width, height)

    def CaptureScreen(self):
        if not (self.start_pos and self.end_pos):
            wx.MessageBox("No region selected.", "Snipping Tool", wx.OK | wx.ICON_ERROR)
            return
        x1, y1 = self.ClientToScreen(self.start_pos)
        x2, y2 = self.ClientToScreen(self.end_pos)
        left = min(x1, x2)
        top = min(y1, y2)
        width = abs(x2 - x1)
        height = abs(y2 - y1)
        if width == 0 or height == 0:
            wx.MessageBox("Invalid region selected.", "Snipping Tool", wx.OK | wx.ICON_ERROR)
            return

        self.Hide()
        wx.Yield()  # Let the window hide before capture

        try:
            from PIL import ImageGrab
        except ImportError:
            wx.MessageBox(
                "Pillow (PIL) is required for snipping. Install with: pip install pillow",
                "Snipping Tool",
                wx.OK | wx.ICON_ERROR,
            )
            return

        # PIL expects (left, top, right, bottom)
        bbox = (left, top, left + width, top + height)
        try:
            img = ImageGrab.grab(bbox)
            img.save("snip.png")
            wx.MessageBox("Snip saved as snip.png", "Snipping Tool", wx.OK | wx.ICON_INFORMATION)
        except Exception as e:
            wx.MessageBox(f"Failed to save snip: {e}", "Snipping Tool", wx.OK | wx.ICON_ERROR)

class SnippingToolApp(wx.App):
    def OnInit(self):
        self.frame = SnippingToolFrame()
        self.frame.Show()
        return True

if __name__ == "__main__":
    app = SnippingToolApp(False)
    app.MainLoop()
