const express = require('express');
const fs = require('fs');
const path = require('path');
const sharp = require('sharp');
const app = express();
app.use(express.json({ limit: '20mb' }));
app.use(require('cors')());

// Catch-all logging middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`);
  // Add more detailed logging for paths with Unicode characters
  if (req.url.includes('%CE%B1')) {
    console.log(`[DEBUG] Handling URL with encoded Unicode: ${req.url}`);
    console.log(`[DEBUG] Decoded URL: ${decodeURIComponent(req.url)}`);
  }
  next();
});

// Serve static files from the tree-view-app/public directory
app.use(express.static(path.join(__dirname, 'tree-view-app', 'public')));

app.post('/api/create-dir', (req, res) => {
  console.log(req.body); 
  console.log(`[${req.method}] ${req.url}`);
  const { parent_path, dir_name } = req.body;
  
  // Allow creation under both tree-view-app/public/MENU and tree-view-app/public/α7RV
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  
  if (!parent_path || !dir_name) {
    return res.status(400).json({ error: "Missing parent_path or dir_name" });
  }
  
  // Determine which root to use based on the parent_path
  let rootPath = menuRoot;
  let relParent = "";
  
  if (parent_path.includes('α7RV')) {
    rootPath = a7rvRoot;
    // Extract the relative path from α7RV
    const a7rvIndex = parent_path.indexOf('α7RV');
    const pathAfterA7RV = parent_path.substring(a7rvIndex + 'α7RV'.length);
    relParent = pathAfterA7RV.startsWith('/') ? pathAfterA7RV.substring(1) : pathAfterA7RV;
    
    // Create the safe path
    const safePath = path.join(a7rvRoot, relParent, dir_name);
    
    // Prevent path traversal
    if (!safePath.startsWith(a7rvRoot)) {
      return res.status(400).json({ error: "Invalid path" });
    }
    
    try {
      fs.mkdirSync(safePath, { recursive: true });
      // Refresh tree-data.json
      const { exec } = require('child_process');
      exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
        if (error) {
          console.error('Error regenerating tree-data.json:', error);
        }
        if (stderr) {
          console.error('stderr:', stderr);
        }
        if (stdout) {
          console.log('stdout:', stdout);
        }
      });
      res.status(200).json({ success: true, path: safePath });
    } catch (err) {
      console.error("DIR CREATE ERROR", err);
      res.status(500).json({ error: err.message });
    }
    return;
  }
  
  // Original MENU path handling
  if (path.resolve(parent_path) !== path.resolve(menuRoot)) {
    relParent = path.relative(menuRoot, parent_path);
  }
  const safePath = path.join(menuRoot, relParent, dir_name);

  // Prevent path traversal
  if (!safePath.startsWith(menuRoot)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    fs.mkdirSync(safePath, { recursive: true });
    // Refresh tree-data.json
    const { exec } = require('child_process');
    exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
      if (error) {
        console.error('Error regenerating tree-data.json:', error);
      }
      if (stderr) {
        console.error('stderr:', stderr);
      }
      if (stdout) {
        console.log('stdout:', stdout);
      }
    });
    res.status(200).json({ success: true, path: safePath });
  } catch (err) {
    console.error("DIR CREATE ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delete-dir', (req, res) => {
  const { target_path } = req.body;
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  
  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }
  
  // Ensure target_path is under one of the allowed roots and not the root itself
  const resolvedTarget = path.resolve(target_path);
  
  // Check if path is under α7RV
  if (resolvedTarget.includes('α7RV')) {
    if (!resolvedTarget.startsWith(a7rvRoot) || resolvedTarget === a7rvRoot) {
      return res.status(400).json({ error: "Invalid or protected path" });
    }
  } 
  // Check if path is under MENU
  else if (!resolvedTarget.startsWith(menuRoot) || resolvedTarget === menuRoot) {
    return res.status(400).json({ error: "Invalid or protected path" });
  }
  try {
    fs.rmSync(resolvedTarget, { recursive: true, force: true });
    // Refresh tree-data.json
    const { exec } = require('child_process');
    exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
      if (error) {
        console.error('Error regenerating tree-data.json:', error);
      }
      if (stderr) {
        console.error('stderr:', stderr);
      }
      if (stdout) {
        console.log('stdout:', stdout);
      }
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("DIR DELETE ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/delete-file', (req, res) => {
  const { target_path } = req.body;
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  
  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }
  
  const resolvedTarget = path.resolve(target_path);
  
  // Check if path is under α7RV
  if (resolvedTarget.includes('α7RV')) {
    if (!resolvedTarget.startsWith(a7rvRoot)) {
      return res.status(400).json({ error: "Invalid path" });
    }
  } 
  // Check if path is under MENU
  else if (!resolvedTarget.startsWith(menuRoot)) {
    return res.status(400).json({ error: "Invalid path" });
  }
  try {
    if (!fs.existsSync(resolvedTarget)) {
      return res.status(404).json({ error: "File does not exist" });
    }
    if (fs.lstatSync(resolvedTarget).isDirectory()) {
      return res.status(400).json({ error: "Target is a directory, not a file" });
    }
    fs.unlinkSync(resolvedTarget);
    // Refresh tree-data.json
    const { exec } = require('child_process');
    exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
      if (error) {
        console.error('Error regenerating tree-data.json:', error);
      }
      if (stderr) {
        console.error('stderr:', stderr);
      }
      if (stdout) {
        console.log('stdout:', stdout);
      }
    });
    res.status(200).json({ success: true });
  } catch (err) {
    console.error("FILE DELETE ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

const OpenAI = require('openai');
let openai = null;
try {
  if (process.env.OPENAI_API_KEY) {
    openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
  } else {
    console.log("Warning: OPENAI_API_KEY not set. ChatGPT features will be disabled.");
  }
} catch (error) {
  console.error("Error initializing OpenAI:", error);
}

app.post('/api/refresh-tree', (req, res) => {
  const { exec } = require('child_process');
  exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
    if (error) {
      console.error('Error regenerating tree-data.json:', error);
      return res.status(500).json({ success: false, error: error.message });
    }
    if (stderr) {
      console.error('stderr:', stderr);
    }
    if (stdout) {
      console.log('stdout:', stdout);
    }
    res.status(200).json({ success: true });
  });
});

app.post('/api/save-image-file', (req, res) => {
  const { dir_path, file_name, image_data } = req.body;
  console.log(req.body); 
  console.log(`[${dir_path}] ${file_name} `);
  if (!dir_path || !file_name || !image_data) {
    return res.status(400).json({ success: false, error: "Missing dir_path, file_name, or image_data" });
  }
  
  // Allow saving under both MENU and α7RV
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  const resolvedDir = path.resolve(dir_path);
  
  // Check if path is under α7RV
  if (resolvedDir.includes('α7RV')) {
    if (!resolvedDir.startsWith(a7rvRoot)) {
      return res.status(400).json({ success: false, error: "Invalid directory path" });
    }
  } 
  // Check if path is under MENU
  else if (!resolvedDir.startsWith(menuRoot)) {
    return res.status(400).json({ success: false, error: "Invalid directory path" });
  }
  // Prevent path traversal in file_name
  if (file_name.includes("..") || file_name.includes("/") || file_name.includes("\\") || !file_name.toLowerCase().endsWith(".png")) {
    return res.status(400).json({ success: false, error: "Invalid file name" });
  }
  // Decode base64 image data from data URL
  try {
    if (!image_data.startsWith("data:image")) {
      return res.status(400).json({ success: false, error: "Invalid image data" });
    }
    const b64data = image_data.split(",", 2)[1];
    const imgBuffer = Buffer.from(b64data, "base64");
    const targetFile = path.join(resolvedDir, file_name);
    console.log(`[SAVE IMAGE] targetFile: ${targetFile}`);

    // Log original image to log/original/
    const logOriginalDir = path.join(__dirname, 'log', 'original');
    fs.mkdirSync(logOriginalDir, { recursive: true });
    const logOriginalFile = path.join(
      logOriginalDir,
      `${path.basename(file_name, path.extname(file_name))}_${Date.now()}${path.extname(file_name)}`
    );
    fs.writeFileSync(logOriginalFile, imgBuffer);
    console.log(`[LOG ORIGINAL] ${logOriginalFile}`);

    // Optimize image using sharp (strip metadata, compress, keep PNG)
    fs.mkdirSync(resolvedDir, { recursive: true });
    sharp(imgBuffer)
      .png({ quality: 80, compressionLevel: 9, adaptiveFiltering: true })
      .withMetadata(false)
      .toBuffer()
      .then(optimizedBuffer => {
        fs.writeFileSync(targetFile, optimizedBuffer);
        // Refresh tree-data.json
        const { exec } = require('child_process');
        exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
          if (error) {
            console.error('Error regenerating tree-data.json:', error);
          }
          if (stderr) {
            console.error('stderr:', stderr);
          }
          if (stdout) {
            console.log('stdout:', stdout);
          }
        });
        res.status(200).json({ success: true, file: targetFile });
      })
      .catch(err => {
        console.error("SHARP OPTIMIZE ERROR", err);
        res.status(500).json({ success: false, error: "Image optimization failed: " + err.message });
      });
    return;
    exec('python3 tree-view-app/gen_tree_json.py', (error, stdout, stderr) => {
      if (error) {
        console.error('Error regenerating tree-data.json:', error);
      }
      if (stderr) {
        console.error('stderr:', stderr);
      }
      if (stdout) {
        console.log('stdout:', stdout);
      }
    });
    res.status(200).json({ success: true, file: targetFile });
  } catch (err) {
    console.error("SAVE IMAGE FILE ERROR", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/save-json-file', (req, res) => {
  const { dir_path, file_name, json_text } = req.body;
  console.log(req.body); 
  console.log(`[SAVE JSON ${dir_path}] ${file_name} `);

  if (!dir_path || !file_name || typeof json_text !== "string") {
    return res.status(400).json({ error: "Missing dir_path, file_name, or json_text" });
  }
  
  // Allow saving under both MENU and α7RV
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  const resolvedDir = path.resolve(dir_path);
  
  // Check if path is under α7RV
  if (resolvedDir.includes('α7RV')) {
    if (!resolvedDir.startsWith(a7rvRoot)) {
      return res.status(400).json({ error: "Invalid directory path" });
    }
  } 
  // Check if path is under MENU
  else if (!resolvedDir.startsWith(menuRoot)) {
    return res.status(400).json({ error: "Invalid directory path" });
  }
  // Prevent path traversal in file_name
  if (file_name.includes("..") || file_name.includes("/") || file_name.includes("\\")) {
    return res.status(400).json({ error: "Invalid file name" });
  }
  const targetFile = path.join(resolvedDir, file_name);
  try {
    fs.writeFileSync(targetFile, json_text, "utf8");
    // Do not regenerate tree-data.json here
    res.status(200).json({ success: true, file: targetFile });
  } catch (err) {
    console.error("SAVE JSON FILE ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ask-chatgpt', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API is not configured. Set OPENAI_API_KEY environment variable." });
  }

  const { target_path } = req.body;
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  
  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }
  
  const resolvedTarget = path.resolve(target_path);
  
  // Check if path is under α7RV
  if (resolvedTarget.includes('α7RV')) {
    if (!resolvedTarget.startsWith(a7rvRoot)) {
      return res.status(400).json({ error: "Invalid path" });
    }
  } 
  // Check if path is under MENU
  else if (!resolvedTarget.startsWith(menuRoot)) {
    return res.status(400).json({ error: "Invalid path" });
  }
  try {
    const requestStartTime = Date.now();
    // Optimize image: auto-crop, remove metadata, convert to JPEG
    const imageBuffer = await sharp(resolvedTarget)
      .trim() // auto-crop
      .removeAlpha()
      .flatten({ background: '#fff' })
      .withMetadata({}) // strip metadata
      .jpeg({ quality: 75 })
      .toBuffer();

    // Log optimized image to log/sharpened/
    const logDir = path.join(__dirname, 'log', 'sharpened');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const baseName = path.basename(resolvedTarget, path.extname(resolvedTarget));
    const logFile = path.join(
      logDir,
      `${baseName}_${Date.now()}.jpg`
    );
    fs.writeFileSync(logFile, imageBuffer);

    const imageBase64 = imageBuffer.toString('base64');
    const gptRes = await openai.chat.completions.create({
      model: "gpt-4o",
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Extract structured JSON from this Sony camera menu screenshot. Format:
{
  "menu": "<menu name>",
  "items": [
    { "label": "<item label>", "value": "<selected value>", "description": "brief item decription" },
    ...
  ]
}
Respond with only valid JSON, no extra text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });
    const content = gptRes.choices[0].message.content;
    
    console.log(`${content} `);
    res.status(200).json({ success: true, content });
    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[Total elapsed] (+${totalElapsed} ms) (+${totalElapsed/1000} sec)`);
  } catch (err) {
    console.error("ASK CHATGPT ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ask-chatgpt_streamed', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API is not configured. Set OPENAI_API_KEY environment variable." });
  }

  const { target_path, user_message } = req.body;
  console.log(`[USER MESSAGE] ${user_message} `);
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');

  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }

  const resolvedTarget = path.resolve(target_path);
  
  // Check if path is under α7RV
  if (resolvedTarget.includes('α7RV')) {
    if (!resolvedTarget.startsWith(a7rvRoot)) {
      return res.status(400).json({ error: "Invalid path" });
    }
  } 
  // Check if path is under MENU
  else if (!resolvedTarget.startsWith(menuRoot)) {
    return res.status(400).json({ error: "Invalid path" });
  }

  try {
    // Optimize image: auto-crop, remove metadata, convert to JPEG
    const imageBuffer = await sharp(resolvedTarget)
      .trim() // auto-crop
      .removeAlpha()
      .flatten({ background: '#fff' })
      .withMetadata({}) // strip metadata
      .jpeg({ quality: 75 })
      .toBuffer();
    // Log optimized image to log/sharpened/
    const logDir = path.join(__dirname, 'log', 'sharpened');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }
    const baseName = path.basename(resolvedTarget, path.extname(resolvedTarget));
    const logFile = path.join(
      logDir,
      `${baseName}_${Date.now()}.jpg`
    );
    fs.writeFileSync(logFile, imageBuffer);

    const imageBase64 = imageBuffer.toString('base64');

    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();
    const requestStartTime = Date.now();
    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `
            [user_message]:
            ${user_message}
            [task]: Extract structured JSON from this Sony camera menu screenshot. 
            Set fields like 'navigation', 'condition', 'modes', 'hint', 'note', 'description' to values set in user messsage.
            If 'condition' enabling this menu item is not set - leave it empty.
            'navigation' will have structure like this: 'MENU → (Shooting) → [File] → [Create New Folder]'
  shooting modes: can be any combo of following: ['photo', 'movie','s&q']
              JSON Format:
{
  "menu": "<menu name>",
  "navigation": "<menu navigation>",
  "description": <menu item description>,
  "modes": [<list of shooting modes>],
  "condition": {<json for condition>}
  "items": [
    { "label": "<item label>", "value": "<selected value>", "description": "<item decription>"},
    ...
  ],
  "hint": "<hint related to this menu item>"
  "note": "<note related to this menu item>"
}
Respond with only valid JSON, no extra text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/jpeg;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000,
    });
    let chunkId = 0;
    const elapsedStart = Date.now() - requestStartTime;
    console.log(`[Start delta] (+${elapsedStart} ms)`);
    const startTime = Date.now();
    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        const elapsedMs = Date.now() - startTime;
        console.log(`[chunk ${chunkId}] (+${elapsedMs} ms): ${content}`);
        res.write(content);
        chunkId++;
      }
    }

    res.end();
    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[Total elapsed] (+${totalElapsed} ms) (+${totalElapsed/1000} sec)`);
  } catch (err) {
    console.error("ASK CHATGPT ERROR", err);
    res.status(500).json({ error: err.message });
  }
});



app.post('/api/ask-chatgpt_streamed_noimage', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API is not configured. Set OPENAI_API_KEY environment variable." });
  }

  const { user_message } = req.body;
  if (!user_message) {
    return res.status(400).json({ error: "Missing user_message" });
  }

  console.log(`[USER MESSAGE NOIMAGE] ${user_message}`);

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const requestStartTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        {
          role: "user",
          content: `Create structured JSON for this Sony camera menu description.

[user_message]:
${user_message}

[task]:
Set fields like 'menu', 'condition', 'modes', 'hint', 'note', 'description' based on user_message.
If 'condition' is not explicitly mentioned, leave it as an empty object.

Shooting modes can be any combo of: ['photo', 'movie', 's&q']

JSON Format:
{
  "menu": "<menu name>",
  "description": <menu item description>,
  "modes": [<list of shooting modes>],
  "condition": {<json for condition>},
  "items": [
    { "label": "<item label>", "value": "<selected value>", "description": "item description" }
  ],
  "hint": "<hint related to this menu item>",
  "note": "<note related to this menu item>"
}

Respond with only valid JSON, no extra text.`
        }
      ],
      max_tokens: 1000,
    });

    let chunkId = 0;
    const elapsedStart = Date.now() - requestStartTime;
    console.log(`[Start delta] (+${elapsedStart} ms)`);
    const startTime = Date.now();

    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        const elapsedMs = Date.now() - startTime;
        console.log(`[chunk ${chunkId}] (+${elapsedMs} ms): ${content}`);
        res.write(content);
        chunkId++;
      }
    }

    res.end();
    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[Total elapsed] (+${totalElapsed} ms) (+${totalElapsed / 1000} sec)`);
  } catch (err) {
    console.error("ASK CHATGPT ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ask-chatgpt_streamed_general', async (req, res) => {
  if (!openai) {
    return res.status(503).json({ error: "OpenAI API is not configured. Set OPENAI_API_KEY environment variable." });
  }

  const { user_message } = req.body;
  if (!user_message) {
    return res.status(400).json({ error: "Missing user_message" });
  }

  console.log(`[USER MESSAGE GENERAL] ${user_message}`);

  try {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    const requestStartTime = Date.now();

    const completion = await openai.chat.completions.create({
      model: "gpt-4o",
      stream: true,
      messages: [
        {
          role: "user",
          content: `
[user_message]:
${user_message}
[assistant output]:
`
        }
      ],
      max_tokens: 1000,
    });

    let chunkId = 0;
    const elapsedStart = Date.now() - requestStartTime;
    console.log(`[Start delta] (+${elapsedStart} ms)`);
    const startTime = Date.now();

    for await (const chunk of completion) {
      const content = chunk.choices?.[0]?.delta?.content;
      if (content) {
        const elapsedMs = Date.now() - startTime;
        console.log(`[chunk ${chunkId}] (+${elapsedMs} ms): ${content}`);
        res.write(content);
        chunkId++;
      }
    }

    res.end();
    const totalElapsed = Date.now() - requestStartTime;
    console.log(`[Total elapsed] (+${totalElapsed} ms) (+${totalElapsed / 1000} sec)`);
  } catch (err) {
    console.error("ASK CHATGPT ERROR", err);
    res.status(500).json({ error: err.message });
  }
});
// Import the camera position module
const cameraPosition = require('./camera-position');

// Camera window detection endpoint
app.get('/api/get_camera_info', async (req, res) => {
  try {
    console.log("🔍 Searching for Camera window...");
    
    // Use the camera-position.js module to get camera window position
    const position = await cameraPosition.getCameraWindowPosition({ verbose: true });
    
    // Return the position information directly, similar to test_cam_pos.js
    res.status(200).json(position);
  } catch (err) {
    console.error("CAMERA DETECTION ERROR", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.listen(3002, () => console.log('Server running on http://localhost:3002'));
