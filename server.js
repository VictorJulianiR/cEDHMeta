
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import sqlite3 from 'sqlite3';

const app = express();
const port = process.env.PORT || 8889;

const DBNAME = 'logs.db';
const db = new sqlite3.Database(DBNAME, (err) => {
  if (err) {
    return console.error('Error opening database:', err.message);
  }
  console.log(`Connected to the SQLite database: ${DBNAME}`);
  
  // Create tables if they don't exist
  db.serialize(() => {
    db.run(`CREATE TABLE IF NOT EXISTS traffic_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      ip TEXT,
      method TEXT,
      url TEXT,
      user_agent TEXT
    )`);

    db.run(`CREATE TABLE IF NOT EXISTS search_queries (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      timestamp TEXT NOT NULL,
      ip TEXT,
      type TEXT,
      commander TEXT,
      card TEXT,
      standing_limit INTEGER,
      time_period TEXT,
      min_inclusion TEXT,
      top_n INTEGER
    )`);
  });
});

// Middleware to parse JSON bodies from incoming requests
app.use(express.json());

// Block direct requests to the database file and its journal file for security
app.get(`/${DBNAME}`, (req, res) => res.status(403).send('Access Forbidden'));
app.get(`/${DBNAME}-journal`, (req, res) => res.status(403).send('Access Forbidden'));

// Simple logging middleware to track requests
app.use((req, res, next) => {
  // Don't log requests for the log endpoint itself to avoid noise
  if (req.originalUrl === '/api/log') {
    return next();
  }
  // Get IP address, prioritizing x-forwarded-for from proxies
  const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  const timestamp = new Date().toISOString();
  const { method, originalUrl } = req;
  const userAgent = req.headers['user-agent'];

  // Log formatted string to the console for real-time monitoring
  console.log(`[${timestamp}] IP: ${ip} | TRAFFIC: ${method} ${originalUrl} | User-Agent: "${userAgent}"`);
  
  // Insert traffic data into the database
  const stmt = `INSERT INTO traffic_logs (timestamp, ip, method, url, user_agent) VALUES (?, ?, ?, ?, ?)`;
  db.run(stmt, [timestamp, ip, method, originalUrl, userAgent], (err) => {
    if (err) {
      console.error('SQLite traffic log error:', err.message);
    }
  });

  // Continue to the next middleware/route handler
  next();
});

// New endpoint for logging search queries from the client
app.post('/api/log', (req, res) => {
    const ip = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
    const timestamp = new Date().toISOString();
    const logData = req.body;

    // Log to console for real-time monitoring
    console.log(`[${timestamp}] IP: ${ip} | SEARCH_QUERY: ${JSON.stringify(logData)}`);

    // Insert search query data into the database
    const { type, commander, card, standingLimit, timePeriod, minInclusion, topN } = logData;
    const stmt = `INSERT INTO search_queries (timestamp, ip, type, commander, card, standing_limit, time_period, min_inclusion, top_n) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`;
    db.run(stmt, [timestamp, ip, type, commander, card, standingLimit, timePeriod, minInclusion, topN], (err) => {
        if (err) {
            console.error('SQLite search query log error:', err.message);
            // Even if logging fails, we don't want to break the user experience.
        }
    });
    
    // Respond to the client to confirm receipt
    res.status(200).send({ status: 'logged' });
});

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Serve static files from the root directory
app.use(express.static(path.join(__dirname, '/')));

// For any other request, serve the index.html file to support client-side routing
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

app.listen(port, () => {
    console.log(`cEDH Analyzer server is running on http://localhost:${port}`);
    console.log('Press Ctrl+C to stop.');
});

// Gracefully close the database connection on shutdown
process.on('SIGINT', () => {
    db.close((err) => {
        if (err) {
            return console.error(err.message);
        }
        console.log('Closed the database connection.');
        process.exit(0);
    });
});