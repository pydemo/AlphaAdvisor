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
    
    // Check if any directory in the path ends with a dot
    const pathParts = parent_path.split('/');
    let hasDotEnding = false;
    let problemPath = '';
    
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i].endsWith('.')) {
        hasDotEnding = true;
        problemPath = pathParts[i];
        break;
      }
    }
    
    // Handle directory paths that contain components ending with a dot
    let safePath;
    if (hasDotEnding || parent_path.endsWith('.')) {
      console.log(`[CREATE DIR α7RV] Parent path contains component ending with a dot: ${problemPath || parent_path}`);
      // Construct the path manually to avoid issues with trailing dots
      safePath = `${parent_path}/${dir_name}`;
      console.log(`[CREATE DIR α7RV] Using manual path construction: ${safePath}`);
    } else {
      safePath = path.join(a7rvRoot, relParent, dir_name);
    }
    
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
  
  // Check if any directory in the path ends with a dot
  const pathParts = parent_path.split('/');
  let hasDotEnding = false;
  let problemPath = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i].endsWith('.')) {
      hasDotEnding = true;
      problemPath = pathParts[i];
      break;
    }
  }
  
  // Handle directory paths that contain components ending with a dot
  let safePath;
  if (hasDotEnding || parent_path.endsWith('.')) {
    console.log(`[CREATE DIR] Parent path contains component ending with a dot: ${problemPath || parent_path}`);
    // Construct the path manually to avoid issues with trailing dots
    safePath = `${parent_path}/${dir_name}`;
    console.log(`[CREATE DIR] Using manual path construction: ${safePath}`);
  } else {
    safePath = path.join(menuRoot, relParent, dir_name);
  }

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
    console.debug("[DEBUG] Validation failed: missing dir_path, file_name, or image_data");
    return res.status(400).json({ success: false, error: "Missing dir_path, file_name, or image_data" });
  } else {
    console.debug("[DEBUG] Validation passed: dir_path, file_name, and image_data are present");
  }

  // Allow saving under both MENU and α7RV
  console.debug("[DEBUG] Resolving menuRoot and a7rvRoot");
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const a7rvRoot = path.join(__dirname, 'tree-view-app', 'public', 'α7RV');
  const resolvedDir = path.resolve(dir_path);
  console.debug(`[DEBUG] resolvedDir: ${resolvedDir}`);

  // Check if path is under α7RV
  if (resolvedDir.includes('α7RV')) {
    if (!resolvedDir.startsWith(a7rvRoot)) {
      console.debug("[DEBUG] Directory path is not under a7rvRoot");
      return res.status(400).json({ success: false, error: "Invalid directory path" });
    } else {
      console.debug("[DEBUG] Directory path is under a7rvRoot");
    }
  } 
  // Check if path is under MENU
  else if (!resolvedDir.startsWith(menuRoot)) {
    console.debug("[DEBUG] Directory path is not under menuRoot");
    return res.status(400).json({ success: false, error: "Invalid directory path" });
  } else {
    console.debug("[DEBUG] Directory path is under menuRoot");
  }

  // Prevent path traversal in file_name
  if (file_name.includes("/") || file_name.includes("\\") || !file_name.toLowerCase().endsWith(".png")) {
    console.debug("[DEBUG] File name failed validation");
    return res.status(400).json({ success: false, error: "Invalid file name" });
  } else {
    console.debug("[DEBUG] File name passed validation");
  }

  // Decode base64 image data from data URL
  try {
    if (!image_data.startsWith("data:image")) {
      console.debug("[DEBUG] image_data does not start with data:image");
      return res.status(400).json({ success: false, error: "Invalid image data" });
    }
    console.debug("[DEBUG] Decoding base64 image data");
    const b64data = image_data.split(",", 2)[1];
    const imgBuffer = Buffer.from(b64data, "base64");
    console.debug("[DEBUG] Image buffer created");

    // Check if any directory in the path ends with a dot (trailing dot is special on Windows, but dots elsewhere are valid)
    const pathParts = dir_path.split('/');
    let hasDotEnding = false;
    let problemPath = '';
    let hasDotAnywhere = false;
    let dotPath = '';
    for (let i = 0; i < pathParts.length; i++) {
      if (pathParts[i].endsWith('.')) {
        hasDotEnding = true;
        problemPath = pathParts[i];
        break;
      }
      if (pathParts[i].includes('.') && !pathParts[i].endsWith('.')) {
        hasDotAnywhere = true;
        dotPath = pathParts[i];
      }
    }
    if (hasDotAnywhere) {
      console.log(`[INFO] Directory component contains a dot (not at end): ${dotPath}`);
    } else {
      console.debug("[DEBUG] No directory component contains a dot (not at end)");
    }
    // Only handle directory paths that contain components ending with a dot specially
    let targetFile;
    if (hasDotEnding || resolvedDir.endsWith('.')) {
      console.log(`[SAVE IMAGE] Directory path contains component ending with a dot: ${problemPath || resolvedDir}`);
      // Make sure the directory exists
      console.debug("[DEBUG] Creating directory (recursive) for resolvedDir (dot-ending case)");
      fs.mkdirSync(resolvedDir, { recursive: true });
      // Construct the path manually to avoid issues with trailing dots
      targetFile = `${resolvedDir}/${file_name}`;
      console.log(`[SAVE IMAGE] Using manual path construction: ${targetFile}`);
    } else {
      console.debug("[DEBUG] Directory path does not contain component ending with a dot");
      console.debug("[DEBUG] Creating directory (recursive) for resolvedDir (normal case)");
      fs.mkdirSync(resolvedDir, { recursive: true });
      targetFile = path.join(resolvedDir, file_name);
    }
    console.log(`[SAVE IMAGE] targetFile: ${targetFile}`);

    // Log original image to log/original/
    const logOriginalDir = path.join(__dirname, 'log', 'original');
    console.debug("[DEBUG] Creating log/original directory if needed");
    fs.mkdirSync(logOriginalDir, { recursive: true });
    const logOriginalFile = path.join(
      logOriginalDir,
      `${path.basename(file_name, path.extname(file_name))}_${Date.now()}${path.extname(file_name)}`
    );
    console.debug(`[DEBUG] Writing original image to: ${logOriginalFile}`);
    fs.writeFileSync(logOriginalFile, imgBuffer);
    console.log(`[LOG ORIGINAL] ${logOriginalFile}`);

    // Optimize image using sharp (strip metadata, compress, keep PNG)
    console.debug("[DEBUG] About to call sharp(imgBuffer) for image optimization");
    sharp(imgBuffer)
      .png({ quality: 80, compressionLevel: 9, adaptiveFiltering: true })
      .withMetadata(false)
      .toBuffer()
      .then(optimizedBuffer => {
        // Write the file using the targetFile path we constructed
        console.debug(`[DEBUG] Writing optimized image to: ${targetFile}`);
        fs.writeFileSync(targetFile, optimizedBuffer);

        // Validate that the file was created
        if (!fs.existsSync(targetFile)) {
          console.error(`[SAVE IMAGE] File was not created: ${targetFile}`);
          return res.status(500).json({ success: false, error: "Failed to create image file" });
        } else {
          console.error(`[SAVE IMAGE] File exists after write: ${targetFile}`);
        }

        // Refresh tree-data.json
        console.debug("[DEBUG] Refreshing tree-data.json");
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
        console.debug("[DEBUG] Sending success response for save-image-file");
        res.status(200).json({ success: true, file: targetFile });
      })
      .catch(err => {
        console.error("[SAVE IMAGE] sharp() .catch triggered");
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
  
  // Check if any directory in the path ends with a dot
  const pathParts = dir_path.split('/');
  let hasDotEnding = false;
  let problemPath = '';
  
  for (let i = 0; i < pathParts.length; i++) {
    if (pathParts[i].endsWith('.')) {
      hasDotEnding = true;
      problemPath = pathParts[i];
      break;
    }
  }
  
  // Handle directory paths that contain components ending with a dot
  let targetFile;
  if (hasDotEnding || resolvedDir.endsWith('.')) {
    console.log(`[SAVE JSON] Directory path contains component ending with a dot: ${problemPath || resolvedDir}`);
    // Make sure the directory exists
    fs.mkdirSync(resolvedDir, { recursive: true });
    // Construct the path manually to avoid issues with trailing dots
    targetFile = `${resolvedDir}/${file_name}`;
    console.log(`[SAVE JSON] Using manual path construction: ${targetFile}`);
  } else {
    targetFile = path.join(resolvedDir, file_name);
  }
  
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
            Set fields for menu like 'navigation', 'condition', 'modes', 'hint', 'note', 'description' to values set in user messsage.
            If 'condition' enabling this menu item is not set - leave it empty.
            'short_description' is just short reiteration of 'description (20 words)
            'navigation' will have structure like this: 'MENU → (Shooting) → [Submenu] → [Menu Item]'
  shooting modes: can be any combo of following: ['photo', 'movie','s&q']
              JSON Format:
{
  "menu": "<menu name>",
  "navigation": "<menu navigation>",
  "menu_description": <menu  description>,
  "short_description": "<menu  short decription>"
  "modes": [<list of shooting modes>],
  "condition": {<json for condition>}
  "items": [
    { "label": "<item label>", "value": "<selected value>", "item_description": "<item decription>"},
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
// Import the camera position module, screen capture module, and window manager
const cameraPosition = require('./camera-position');
const screenCapture = require('./screen-capture');
const windowManager = require('./window-manager');

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

// Camera screen capture endpoint
app.get('/api/get_camera_snap', async (req, res) => {
  try {
    console.log("📸 Taking camera snapshot...");
    
    // Get coordinates and size from query parameters
    const left = parseInt(req.query.left) || 0;
    const top = parseInt(req.query.top) || 0;
    const width = parseInt(req.query.width) || 1024;
    const height = parseInt(req.query.height) || 768;
    
    // Get directory and filename parameters (optional)
    const directory = req.query.directory || '';
    const filename = req.query.filename || `camera_snap_${Date.now()}.png`;
    
    // Validate filename
    if (!filename.toLowerCase().endsWith('.png')) {
      return res.status(400).json({ 
        success: false, 
        error: "Filename must end with .png extension" 
      });
    }
    
    // Create directory if it doesn't exist
    let outputDir = __dirname;
    if (directory) {
      // Prevent directory traversal
      if (directory.includes('..') || directory.startsWith('/')) {
        return res.status(400).json({ 
          success: false, 
          error: "Invalid directory path" 
        });
      }
      
      outputDir = path.join(__dirname, directory);
      if (!fs.existsSync(outputDir)) {
        fs.mkdirSync(outputDir, { recursive: true });
        console.log(`[DEBUG] Created directory: ${outputDir}`);
      }
    }
    
    // Generate the full output path
    const outputPath = path.join(outputDir, filename);
    
    console.log(`[DEBUG] Capture request - Coordinates: left=${left}, top=${top}, width=${width}, height=${height}`);
    console.log(`[DEBUG] Output file: ${outputPath}`);
    if (false) {
      // Use the screen-capture.js module to take a screenshot
      // First, try to get the camera window position to ensure it exists
      console.log('[DEBUG] Getting camera window position...');
      const cameraWindows = await cameraPosition.getCameraWindowPosition({ verbose: true });
      
      if (cameraWindows && cameraWindows.length > 0) {
        console.log('[DEBUG] Found camera window:', cameraWindows[0].window_title);
        
        // Try to bring the window to foreground explicitly
        console.log('[DEBUG] Attempting to bring Camera window to foreground...');
        const focusSuccess = await windowManager.bringWindowToForeground(cameraWindows[0].window_title || 'Camera');
        
        if (focusSuccess) {
          console.log('[DEBUG] Successfully brought Camera window to foreground');
        } else {
          console.warn('[DEBUG] Failed to bring Camera window to foreground');
        }
        
        // Add a longer delay to give the window time to be properly focused
        console.log('[DEBUG] Waiting for window to be properly focused...');
        await new Promise(resolve => setTimeout(resolve, 2000));
        
        // Try to focus the window again after the delay
        console.log('[DEBUG] Attempting to bring Camera window to foreground again...');
        await windowManager.bringWindowToForeground(cameraWindows[0].window_title || 'Camera');
      } else {
        console.warn('[DEBUG] No camera window found, will attempt screenshot anyway');
      }
    }
    // Then take the screenshot
    console.log('[DEBUG] Taking screenshot...');
    const success = await screenCapture.captureScreenshotWithCoordinates(
      'Camera', // Window title
      outputPath,
      left,
      top,
      width,
      height
    );
    
    if (!success) {
      throw new Error('Failed to capture screenshot');
    }
    
    // Read the captured image file
    const imageBuffer = fs.readFileSync(outputPath);
    
    // Get image file size
    const fileSizeInBytes = imageBuffer.length;
    const fileSizeInKB = (fileSizeInBytes / 1024).toFixed(2);
    
    console.log(`[DEBUG] Image captured - Size: ${fileSizeInBytes} bytes (${fileSizeInKB} KB)`);
    
    // Use sharp to get image dimensions
    try {
      const imageInfo = await sharp(imageBuffer).metadata();
      console.log(`[DEBUG] Image dimensions: ${imageInfo.width}x${imageInfo.height} pixels, format: ${imageInfo.format}`);
    } catch (err) {
      console.log(`[DEBUG] Could not get image dimensions: ${err.message}`);
    }
    
    // If the directory parameter was provided, keep the file
    // Otherwise, clean up the temporary file
    if (!directory) {
      fs.unlinkSync(outputPath);
      console.log(`[DEBUG] Temporary file deleted: ${outputPath}`);
    } else {
      console.log(`[DEBUG] Image saved to: ${outputPath}`);
    }
    
    // Set the content type and send the image
    res.set('Content-Type', 'image/png');
    res.send(imageBuffer);
  } catch (err) {
    console.error("CAMERA SNAPSHOT ERROR", err);
    res.status(500).json({ 
      success: false, 
      error: err.message 
    });
  }
});

app.listen(3002, () => console.log('Server running on http://localhost:3002'));
