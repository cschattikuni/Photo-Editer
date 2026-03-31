import express from 'express';
import cors from 'cors';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb' }));

// Initialize SQLite Database
const dbPath = path.join(__dirname, '../photo-app.db');
const db = new Database(dbPath);

// Create tables if they don't exist
db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    description TEXT,
    originalImage TEXT NOT NULL,
    processedImage TEXT,
    filters TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    email TEXT UNIQUE NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS user_settings (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    setting_key TEXT NOT NULL,
    setting_value TEXT,
    FOREIGN KEY (user_id) REFERENCES users(id),
    UNIQUE(user_id, setting_key)
  );
`);

// ============ PROJECT ENDPOINTS ============

// GET all projects
app.get('/api/projects', (req, res) => {
  try {
    const projects = db.prepare('SELECT * FROM projects ORDER BY created_at DESC').all();
    res.json(projects);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch projects' });
  }
});

// GET single project
app.get('/api/projects/:id', (req, res) => {
  try {
    const project = db.prepare('SELECT * FROM projects WHERE id = ?').get(req.params.id);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }
    res.json(project);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch project' });
  }
});

// CREATE new project
app.post('/api/projects', (req, res) => {
  try {
    const { name, description, originalImage, processedImage, filters } = req.body;
    
    if (!name || !originalImage) {
      return res.status(400).json({ error: 'Name and originalImage are required' });
    }

    const stmt = db.prepare(`
      INSERT INTO projects (name, description, originalImage, processedImage, filters)
      VALUES (?, ?, ?, ?, ?)
    `);

    const result = stmt.run(
      name,
      description || null,
      originalImage,
      processedImage || null,
      filters ? JSON.stringify(filters) : null
    );

    res.status(201).json({
      id: result.lastInsertRowid,
      name,
      description,
      originalImage,
      processedImage,
      filters
    });
  } catch (error) {
    console.error('Error creating project:', error);
    res.status(500).json({ error: 'Failed to create project' });
  }
});

// UPDATE project
app.put('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, originalImage, processedImage, filters } = req.body;

    const stmt = db.prepare(`
      UPDATE projects 
      SET name = ?, description = ?, originalImage = ?, processedImage = ?, filters = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `);

    stmt.run(
      name,
      description,
      originalImage,
      processedImage,
      filters ? JSON.stringify(filters) : null,
      id
    );

    res.json({ id, name, description, originalImage, processedImage, filters });
  } catch (error) {
    console.error('Error updating project:', error);
    res.status(500).json({ error: 'Failed to update project' });
  }
});

// DELETE project
app.delete('/api/projects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const stmt = db.prepare('DELETE FROM projects WHERE id = ?');
    stmt.run(id);
    res.json({ message: 'Project deleted successfully' });
  } catch (error) {
    console.error('Error deleting project:', error);
    res.status(500).json({ error: 'Failed to delete project' });
  }
});

// ============ USER ENDPOINTS ============

// CREATE user
app.post('/api/users', (req, res) => {
  try {
    const { username, email } = req.body;

    if (!username || !email) {
      return res.status(400).json({ error: 'Username and email are required' });
    }

    const stmt = db.prepare('INSERT INTO users (username, email) VALUES (?, ?)');
    const result = stmt.run(username, email);

    res.status(201).json({ id: result.lastInsertRowid, username, email });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create user' });
  }
});

// GET user settings
app.get('/api/users/:userId/settings', (req, res) => {
  try {
    const settings = db.prepare(`
      SELECT setting_key, setting_value FROM user_settings WHERE user_id = ?
    `).all(req.params.userId);

    const settingsObj = {};
    settings.forEach((s: any) => {
      settingsObj[s.setting_key] = s.setting_value;
    });

    res.json(settingsObj);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch settings' });
  }
});

// UPDATE user settings
app.put('/api/users/:userId/settings', (req, res) => {
  try {
    const { userId } = req.params;
    const settings = req.body;

    for (const [key, value] of Object.entries(settings)) {
      const stmt = db.prepare(`
        INSERT INTO user_settings (user_id, setting_key, setting_value) VALUES (?, ?, ?)
        ON CONFLICT(user_id, setting_key) DO UPDATE SET setting_value = ?
      `);
      stmt.run(userId, key, value, value);
    }

    res.json({ message: 'Settings updated', settings });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update settings' });
  }
});

// ============ HEALTH CHECK ============

app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', message: 'Photo Edit App Backend is running' });
});

// Start server
app.listen(PORT, () => {
  console.log(`\n✅ Backend Server running on http://localhost:${PORT}`);
  console.log(`📁 Database: ${dbPath}\n`);
});
