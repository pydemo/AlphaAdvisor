const ffi = require("ffi-napi");
const ref = require("ref-napi");
const Struct = require("ref-struct-napi");

// RECT structure
const Rect = Struct({
  left: "long",
  top: "long",
  right: "long",
  bottom: "long",
});

const rectPtr = ref.refType(Rect);
const HWND = ref.refType("void");

// Max title length
const MAX_TITLE_LENGTH = 255;

// Load user32.dll
const user32 = ffi.Library("user32", {
  EnumWindows: ["bool", ["pointer", "int32"]],
  GetWindowTextA: ["int", ["long", "char *", "int"]],
  IsWindowVisible: ["bool", ["long"]],
  GetWindowRect: ["bool", ["long", rectPtr]],
});

// Callback function for EnumWindows
const windowEnumProc = ffi.Callback("bool", ["long", "int32"], (hwnd, lParam) => {
  if (!user32.IsWindowVisible(hwnd)) return true;

  const buffer = Buffer.alloc(MAX_TITLE_LENGTH + 1);
  const length = user32.GetWindowTextA(hwnd, buffer, MAX_TITLE_LENGTH);

  if (length > 0) {
    const title = buffer.toString("utf8").replace(/\0/g, "");

    if (title.toLowerCase().includes("camera")) {
      const rect = new Rect();
      if (user32.GetWindowRect(hwnd, rect.ref())) {
        const width = rect.right - rect.left;
        const height = rect.bottom - rect.top;

        console.log("✅ Found Camera Window:");
        console.log("HWND:", hwnd);
        console.log("Title:", title);
        console.log(`Position: (${rect.left}, ${rect.top})`);
        console.log(`Size: ${width} x ${height}`);
      } else {
        console.log("Failed to get window rect.");
      }

      return false; // Stop enumerating
    }
  }

  return true; // Continue enumerating
});

// Run the enumeration
function findCameraWindow() {
  console.log("🔍 Searching for Camera window...");
  user32.EnumWindows(windowEnumProc, 0);
}

findCameraWindow();
