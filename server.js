const express = require('express');
const fs = require('fs');
const path = require('path');
const app = express();
app.use(express.json());
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
    const imageBase64 = fs.readFileSync(resolvedTarget, { encoding: 'base64' });
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
    { "label": "<item label>", "value": "<selected value>" },
    ...
  ]
}
Respond with only valid JSON, no extra text.`
            },
            {
              type: "image_url",
              image_url: {
                url: `data:image/png;base64,${imageBase64}`
              }
            }
          ]
        }
      ],
      max_tokens: 1000
    });
    const content = gptRes.choices[0].message.content;
    res.status(200).json({ success: true, content });
  } catch (err) {
    console.error("ASK CHATGPT ERROR", err);
    res.status(500).json({ error: err.message });
  }
});

app.listen(3001, () => console.log('Server running on http://localhost:3001'));
