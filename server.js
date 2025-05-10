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
  next();
});

app.post('/api/create-dir', (req, res) => {
  console.log(req.body); 
  console.log(`[${req.method}] ${req.url}`);
  const { parent_path, dir_name } = req.body;
  // Only allow creation under tree-view-app/public/MENU
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  // Remove everything up to and including /MENU/ from parent_path
  if (!parent_path || !dir_name) {
    return res.status(400).json({ error: "Missing parent_path or dir_name" });
  }
  // Compute relative path from menuRoot to parent_path
  let relParent = "";
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
  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }
  // Ensure target_path is under menuRoot and not menuRoot itself
  const resolvedTarget = path.resolve(target_path);
  if (!resolvedTarget.startsWith(menuRoot) || resolvedTarget === menuRoot) {
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
  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }
  const resolvedTarget = path.resolve(target_path);
  if (!resolvedTarget.startsWith(menuRoot)) {
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
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

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
  // Only allow saving under MENU
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const resolvedDir = path.resolve(dir_path);
  if (!resolvedDir.startsWith(menuRoot)) {
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
    fs.writeFileSync(targetFile, imgBuffer);
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
  } catch (err) {
    console.error("SAVE IMAGE FILE ERROR", err);
    res.status(500).json({ success: false, error: err.message });
  }
});

app.post('/api/save-json-file', (req, res) => {
  const { dir_path, file_name, json_text } = req.body;
  if (!dir_path || !file_name || typeof json_text !== "string") {
    return res.status(400).json({ error: "Missing dir_path, file_name, or json_text" });
  }
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  const resolvedDir = path.resolve(dir_path);
  if (!resolvedDir.startsWith(menuRoot)) {
    return res.status(400).json({ error: "Invalid directory path" });
  }
  // Prevent path traversal in file_name
  if (file_name.includes("..") || file_name.includes("/") || file_name.includes("\\")) {
    return res.status(400).json({ error: "Invalid file name" });
  }
  const targetFile = path.join(resolvedDir, file_name);
  try {
    fs.writeFileSync(targetFile, json_text, "utf8");
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
  } catch (err) {
    console.error("SAVE JSON FILE ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/ask-chatgpt', async (req, res) => {
  const { target_path } = req.body;
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');
  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }
  const resolvedTarget = path.resolve(target_path);
  if (!resolvedTarget.startsWith(menuRoot)) {
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
  const { target_path } = req.body;
  const menuRoot = path.join(__dirname, 'tree-view-app', 'public', 'MENU');

  if (!target_path) {
    return res.status(400).json({ error: "Missing target_path" });
  }

  const resolvedTarget = path.resolve(target_path);
  if (!resolvedTarget.startsWith(menuRoot)) {
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
              text: `Extract structured JSON from this Sony camera menu screenshot. Format:
{
  "menu": "<menu name>",
  "items": [
    { "label": "<item label>", "value": "<selected value>", "description": "brief item decription"},
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

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
