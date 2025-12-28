import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const app = express();
const PORT = process.env.PORT || 3001;
// Middleware
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: '10mb' }));
// Database setup
const dbPath = path.join(__dirname, '../data/screenplays.db');
const db = new Database(dbPath);
// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS screenplays (
    id TEXT PRIMARY KEY,
    title TEXT NOT NULL,
    content TEXT NOT NULL, -- JSON string
    title_page TEXT NOT NULL, -- JSON string
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE INDEX IF NOT EXISTS idx_screenplays_updated_at ON screenplays(updated_at DESC);
  CREATE INDEX IF NOT EXISTS idx_screenplays_title ON screenplays(title);
`);
// Initialize with sample data if empty
const count = db.prepare('SELECT COUNT(*) as count FROM screenplays').get();
if (count.count === 0) {
    const sampleScreenplay = {
        id: 'sample-1',
        title: 'Sample Screenplay',
        content: JSON.stringify([
            {
                type: 'scene-heading',
                children: [{ text: 'INT. SAMPLE ROOM - DAY' }]
            },
            {
                type: 'action',
                children: [{ text: 'A writer sits at a computer, working on a screenplay.' }]
            },
            {
                type: 'character',
                children: [{ text: 'WRITER' }]
            },
            {
                type: 'dialogue',
                children: [{ text: 'This is a sample screenplay to get you started!' }]
            }
        ]),
        title_page: JSON.stringify({
            title: 'Sample Screenplay',
            author: 'Your Name',
            contact: 'your@email.com',
            basedOn: ''
        })
    };
    db.prepare(`
    INSERT INTO screenplays (id, title, content, title_page)
    VALUES (?, ?, ?, ?)
  `).run(sampleScreenplay.id, sampleScreenplay.title, sampleScreenplay.content, sampleScreenplay.title_page);
}
// API Routes
app.get('/api/screenplays', (req, res) => {
    try {
        const screenplays = db.prepare(`
      SELECT * FROM screenplays ORDER BY updated_at DESC
    `).all();
        // Parse JSON fields
        const parsed = screenplays.map((s) => ({
            ...s,
            content: JSON.parse(s.content),
            title_page: JSON.parse(s.title_page)
        }));
        res.json(parsed);
    }
    catch (error) {
        console.error('Error fetching screenplays:', error);
        res.status(500).json({ error: 'Failed to fetch screenplays' });
    }
});
app.get('/api/screenplays/:id', (req, res) => {
    try {
        const screenplay = db.prepare(`
      SELECT * FROM screenplays WHERE id = ?
    `).get(req.params.id);
        if (!screenplay) {
            return res.status(404).json({ error: 'Screenplay not found' });
        }
        // Parse JSON fields
        screenplay.content = JSON.parse(screenplay.content);
        screenplay.title_page = JSON.parse(screenplay.title_page);
        res.json(screenplay);
    }
    catch (error) {
        console.error('Error fetching screenplay:', error);
        res.status(500).json({ error: 'Failed to fetch screenplay' });
    }
});
app.post('/api/screenplays', (req, res) => {
    try {
        const { title, content, title_page } = req.body;
        if (!title || !content) {
            return res.status(400).json({ error: 'Title and content are required' });
        }
        const id = `screenplay-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
        db.prepare(`
      INSERT INTO screenplays (id, title, content, title_page)
      VALUES (?, ?, ?, ?)
    `).run(id, title, JSON.stringify(content), JSON.stringify(title_page || {}));
        const screenplay = db.prepare(`
      SELECT * FROM screenplays WHERE id = ?
    `).get(id);
        screenplay.content = JSON.parse(screenplay.content);
        screenplay.title_page = JSON.parse(screenplay.title_page);
        res.status(201).json(screenplay);
    }
    catch (error) {
        console.error('Error creating screenplay:', error);
        res.status(500).json({ error: 'Failed to create screenplay' });
    }
});
app.put('/api/screenplays/:id', (req, res) => {
    try {
        const { title, content, title_page } = req.body;
        const { id } = req.params;
        // Check if screenplay exists
        const existing = db.prepare('SELECT id FROM screenplays WHERE id = ?').get(id);
        if (!existing) {
            return res.status(404).json({ error: 'Screenplay not found' });
        }
        db.prepare(`
      UPDATE screenplays
      SET title = ?, content = ?, title_page = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(title, JSON.stringify(content), JSON.stringify(title_page || {}), id);
        const screenplay = db.prepare(`
      SELECT * FROM screenplays WHERE id = ?
    `).get(id);
        screenplay.content = JSON.parse(screenplay.content);
        screenplay.title_page = JSON.parse(screenplay.title_page);
        res.json(screenplay);
    }
    catch (error) {
        console.error('Error updating screenplay:', error);
        res.status(500).json({ error: 'Failed to update screenplay' });
    }
});
app.delete('/api/screenplays/:id', (req, res) => {
    try {
        const result = db.prepare('DELETE FROM screenplays WHERE id = ?').run(req.params.id);
        if (result.changes === 0) {
            return res.status(404).json({ error: 'Screenplay not found' });
        }
        res.json({ message: 'Screenplay deleted successfully' });
    }
    catch (error) {
        console.error('Error deleting screenplay:', error);
        res.status(500).json({ error: 'Failed to delete screenplay' });
    }
});
// Health check
app.get('/api/health', (req, res) => {
    res.json({ status: 'OK', timestamp: new Date().toISOString() });
});
// Error handling
app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({ error: 'Internal server error' });
});
// Graceful shutdown
process.on('SIGINT', () => {
    console.log('Shutting down gracefully...');
    db.close();
    process.exit(0);
});
process.on('SIGTERM', () => {
    console.log('Shutting down gracefully...');
    db.close();
    process.exit(0);
});
app.listen(PORT, () => {
    console.log(`🚀 Server running on http://localhost:${PORT}`);
    console.log(`📊 Database: ${dbPath}`);
});
