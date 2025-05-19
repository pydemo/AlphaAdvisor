import wx
import wx.lib.wxcairo as wxcairo
import cairo
import os
import platform
from datetime import datetime
from PIL import ImageGrab

class SnippingTool(wx.Frame):
    def __init__(self, parent=None):
        # Get the screen dimensions
        display = wx.Display()
        screen_rect = display.GetGeometry()
        
        # Create a fullscreen frame
        wx.Frame.__init__(
            self, parent,
            title="Screen Snipping Tool",
            pos=screen_rect.GetTopLeft(),
            size=screen_rect.GetSize(),
            style=wx.FRAME_NO_TASKBAR | wx.STAY_ON_TOP
        )
        
        # Set transparency (semi-transparent overlay)
        self.SetTransparent(150)
        
        # Initialize variables for selection rectangle
        self.start_pos = None
        self.current_pos = None
        self.is_selecting = False
        self.selection_made = False
        self.selection_rect = wx.Rect(0, 0, 0, 0)
        
        # Create a panel to draw on
        self.panel = wx.Panel(self)
        self.panel.SetBackgroundColour(wx.Colour(0, 0, 0, 128))
        
        # Bind mouse events
        self.panel.Bind(wx.EVT_LEFT_DOWN, self.on_left_down)
        self.panel.Bind(wx.EVT_LEFT_UP, self.on_left_up)
        self.panel.Bind(wx.EVT_MOTION, self.on_motion)
        self.panel.Bind(wx.EVT_PAINT, self.on_paint)
        self.panel.Bind(wx.EVT_KEY_DOWN, self.on_key_down)
        
        # Make the panel focusable to capture key events
        self.panel.SetFocus()
        
        # Create a directory for saving screenshots if it doesn't exist
        self.save_dir = os.path.join(os.path.expanduser("~"), "Screenshots")
        if not os.path.exists(self.save_dir):
            os.makedirs(self.save_dir)
        
        # Show fullscreen
        self.ShowFullScreen(True)
    
    def on_left_down(self, event):
        # Start selection
        self.start_pos = event.GetPosition()
        self.current_pos = event.GetPosition()
        self.is_selecting = True
        self.selection_made = False
    
    def on_motion(self, event):
        # Update selection if dragging
        if self.is_selecting:
            self.current_pos = event.GetPosition()
            self.update_selection_rect()
            self.panel.Refresh()
    
    def on_left_up(self, event):
        # End selection and capture screenshot
        if self.is_selecting:
            self.current_pos = event.GetPosition()
            self.is_selecting = False
            self.selection_made = True
            self.update_selection_rect()
            
            # Only capture if we have a valid selection (width and height > 0)
            if self.selection_rect.width > 0 and self.selection_rect.height > 0:
                self.capture_screenshot()
            
            self.panel.Refresh()
    
    def update_selection_rect(self):
        # Calculate the selection rectangle from start and current positions
        x = min(self.start_pos.x, self.current_pos.x)
        y = min(self.start_pos.y, self.current_pos.y)
        width = abs(self.current_pos.x - self.start_pos.x)
        height = abs(self.current_pos.y - self.start_pos.y)
        self.selection_rect = wx.Rect(x, y, width, height)
    
    def on_paint(self, event):
        # Draw the selection overlay
        dc = wx.PaintDC(self.panel)
        gc = wx.GraphicsContext.Create(dc)
        
        # Clear the background
        gc.SetBrush(wx.Brush(wx.Colour(0, 0, 0, 100)))
        gc.DrawRectangle(0, 0, self.GetSize().width, self.GetSize().height)
        
        # Draw the selection rectangle if we're selecting or have a selection
        if (self.is_selecting or self.selection_made) and self.selection_rect.width > 0:
            # Draw a semi-transparent white rectangle
            gc.SetBrush(wx.Brush(wx.Colour(255, 255, 255, 50)))
            gc.SetPen(wx.Pen(wx.Colour(0, 162, 232), 2))
            gc.DrawRectangle(
                self.selection_rect.x,
                self.selection_rect.y,
                self.selection_rect.width,
                self.selection_rect.height
            )
            
            # Show selection dimensions
            if self.selection_rect.width > 0 and self.selection_rect.height > 0:
                dimensions_text = f"{self.selection_rect.width} × {self.selection_rect.height}"
                gc.SetFont(wx.Font(10, wx.FONTFAMILY_DEFAULT, wx.FONTSTYLE_NORMAL, wx.FONTWEIGHT_BOLD), wx.WHITE)
                text_width, text_height = gc.GetTextExtent(dimensions_text)
                
                # Position the text near the selection rectangle
                text_x = self.selection_rect.x
                text_y = self.selection_rect.y - text_height - 5
                
                # Ensure text is visible
                if text_y < 0:
                    text_y = self.selection_rect.y + self.selection_rect.height + 5
                
                # Draw background for text
                gc.SetBrush(wx.Brush(wx.Colour(0, 0, 0, 180)))
                gc.SetPen(wx.Pen(wx.Colour(0, 0, 0, 0)))
                gc.DrawRectangle(text_x - 2, text_y - 2, text_width + 4, text_height + 4)
                
                # Draw text
                gc.DrawText(dimensions_text, text_x, text_y)
    
    def on_key_down(self, event):
        # Handle key presses
        key_code = event.GetKeyCode()
        
        # ESC key to cancel/exit
        if key_code == wx.WXK_ESCAPE:
            self.Close()
        
        # Enter key to confirm selection and capture screenshot
        elif key_code == wx.WXK_RETURN:
            if self.selection_made and self.selection_rect.width > 0 and self.selection_rect.height > 0:
                self.capture_screenshot()
                self.Close()
    
    def capture_screenshot(self):
        # Capture the selected area of the screen
        try:
            # Hide this window so it doesn't appear in the screenshot
            self.Hide()
            
            # Give the window time to hide
            wx.MilliSleep(100)
            wx.GetApp().Yield()
            
            # Adjust for high DPI displays if needed
            scale_factor = 1.0
            if hasattr(wx, 'GetDisplayPPI'):
                scale_factor = wx.GetDisplayPPI().x / 96.0
            
            # Take the screenshot using PIL
            x, y, width, height = (
                int(self.selection_rect.x * scale_factor),
                int(self.selection_rect.y * scale_factor),
                int(self.selection_rect.width * scale_factor),
                int(self.selection_rect.height * scale_factor)
            )
            
            screenshot = ImageGrab.grab(bbox=(x, y, x + width, y + height))
            
            # Generate a filename with timestamp
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            filename = os.path.join(self.save_dir, f"screenshot_{timestamp}.png")
            
            # Save the screenshot
            screenshot.save(filename)
            
            # Show a notification that the screenshot was saved
            self.show_notification(f"Screenshot saved to:\n{filename}")
            
            # Close the application
            self.Close()
            
        except Exception as e:
            wx.MessageBox(f"Error capturing screenshot: {str(e)}", "Error", wx.OK | wx.ICON_ERROR)
            self.Show()
    
    def show_notification(self, message):
        notification = wx.adv.NotificationMessage(
            title="Screenshot Captured",
            message=message,
            parent=None
        )
        notification.SetFlags(wx.ICON_INFORMATION)
        notification.Show(timeout=3)  # Show for 3 seconds

class SnippingToolApp(wx.App):
    def OnInit(self):
        self.frame = SnippingTool()
        self.frame.Show()
        return True

if __name__ == "__main__":
    app = SnippingToolApp(False)
    app.MainLoop()