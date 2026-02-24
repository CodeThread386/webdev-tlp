/**
 * ============================================
 * TECHLOOP POLLING - BACKEND SERVER
 * ============================================
 *
 * WHAT IS A "SERVER"?
 * A server is a program that runs 24/7 (or when your app is running) and waits for
 * requests from browsers. When you visit a website, your browser sends a "request"
 * (e.g. "give me the homepage") and the server sends back a "response" (the HTML, etc.).
 *
 * This file runs on Node.js (JavaScript outside the browser). It does 3 things:
 * 1. Serves our HTML, CSS, and JS files - when you visit /index.html, we send that file
 * 2. Provides a REST API - special URLs that accept data (create poll) or return data (get poll)
 * 3. Uses Socket.io - keeps a connection open so we can PUSH updates to the browser
 *    (normally the browser has to ask "any updates?" - Socket.io lets us say "here's an update!")
 */

// ============ IMPORTS ============
// In JavaScript, we don't write everything from scratch. We use "packages" (libraries).
// "import" loads code from another file or package. Think of it like #include in C or
// import in Python.
import express from 'express';           // Express: the most popular web framework for Node.js.
                                         // It lets us define routes (URL -> what to do) easily.
import { createServer } from 'http';     // Node's built-in HTTP module. Express sits on top of it.
                                         // createServer makes the low-level TCP server that handles connections.
import { Server } from 'socket.io';       // Socket.io: adds WebSocket support. Normal HTTP is "request-response"
                                         // (browser asks, server answers, done). WebSockets keep the connection
                                         // open so server can send data anytime (perfect for live updates).
import path from 'path';                 // Path: handles file paths. Windows uses \, Mac/Linux use /.
                                         // path.join() builds correct paths for the current operating system.
import { fileURLToPath } from 'url';     // In ES modules, we need this to get __dirname (see next line).

// WHY DO WE NEED __dirname?
// When we say "serve files from the public folder", we need the FULL path, e.g.
// C:\Users\you\project\public. __dirname = "directory of this file". In CommonJS it existed
// automatically; in ES modules we have to build it from import.meta.url (the file's URL).
const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ============ SETUP: EXPRESS + HTTP + SOCKET.IO ============
const app = express();                    // Create the Express application. This is our "router" - it decides
                                          // what to do when someone visits /api/polls vs /index.html etc.
const server = createServer(app);         // Create the raw HTTP server. We pass Express so it handles
                                          // all HTTP requests. Same server, one connection.
const io = new Server(server);            // Attach Socket.io to the SAME server. This way, HTTP and WebSocket
                                          // share the same port (3000). When a client connects, Socket.io
                                          // "upgrades" the connection to WebSocket for real-time stuff.

// ============ MIDDLEWARE ============
// Middleware = functions that run on EVERY request before it reaches our route handlers.
// They run in order. Think of it like a pipeline: request -> middleware 1 -> middleware 2 -> route handler.

// 1. Static file serving: "When someone asks for /index.html or /css/style.css, serve it from public/"
//    Without this, visiting localhost:3000 would give 404. With it, we get our actual HTML page.
app.use(express.static(path.join(__dirname, 'public')));

// 2. JSON body parser: "When the request has a JSON body (e.g. from fetch), parse it into req.body"
//    When create.js sends { question: "...", options: [...] }, we need to read that. Without this,
//    req.body would be undefined. express.json() reads the raw body and does JSON.parse() for us.
app.use(express.json());

// ============ DATA STORE ============
// We need somewhere to keep our polls. For simplicity, we use a plain JavaScript object in memory.
// Structure: { "m5x2k9ab": { question: "...", options: [{ text: "A", votes: 3 }, ...] }, ... }
//
// IMPORTANT: This is "in-memory" - it lives in RAM. When the server restarts (deploy, crash, etc.),
// all polls are GONE. For a real app you'd use a database (MongoDB, PostgreSQL, etc.).
const polls = {};

// ============ REST API ============
// REST = Representational State Transfer. It's a convention for designing APIs:
// - Use URLs to represent resources: /api/polls = "the collection of polls"
// - Use HTTP methods: GET = read, POST = create, PUT = update, DELETE = delete
// - Return JSON (or other formats)
//
// Our API:
//   POST /api/polls     -> Create a new poll (body: { question, options })
//   GET  /api/polls/:id -> Get one poll by ID

/**
 * POST /api/polls - CREATE A NEW POLL
 *
 * When does this run? When the user clicks "Create Poll" on index.html, create.js sends
 * a fetch() request to this URL with method: 'POST' and the poll data in the body.
 *
 * req = the incoming request. Contains: body (the JSON data), headers, etc.
 * res = the response we're building. We call res.json() to send JSON back.
 */
app.post('/api/polls', (req, res) => {
  // DESTRUCTURING: Instead of req.body.question and req.body.options, we extract both at once.
  // const { question, options } = req.body  is the same as:
  // const question = req.body.question; const options = req.body.options;
  const { question, options } = req.body;

  // VALIDATION: Never trust client data. Someone could send empty data or malicious input.
  // We check: question exists? options exists and is an array? at least 2 options?
  // !value is "falsy" - true for: null, undefined, "", 0, false. So !question catches empty string too.
  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Question and at least 2 options required' });
    // status(400) = Bad Request (client sent invalid data)
    // .json() sends a JSON response. The return stops the function - we don't want to continue.
  }

  // GENERATE UNIQUE ID: We need an ID to identify this poll. Options:
  // - UUID: long, guaranteed unique, but verbose
  // - Database auto-increment: need a database
  // - This approach: timestamp (base-36) + random chars. Short, unique enough for our use case.
  //   Date.now() = milliseconds since 1970. .toString(36) = base-36 (0-9, a-z) = compact.
  //   Math.random().toString(36).slice(2, 8) = 6 random alphanumeric chars.
  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);

  // STORE THE POLL:
  // - question.trim() removes leading/trailing spaces
  // - filter(o => o && o.trim()) removes empty or whitespace-only options
  // - map(text => ({ text: text.trim(), votes: 0 })) converts each string to { text, votes: 0 }
  polls[id] = {
    question: question.trim(),
    options: options.filter(o => o && o.trim()).map(text => ({ text: text.trim(), votes: 0 })),
  };

  // SEND RESPONSE: The frontend needs the ID to redirect to /poll.html?id=xxx
  // { id, ...polls[id] } = spread operator. Same as { id: id, question: polls[id].question, options: polls[id].options }
  res.json({ id, ...polls[id] });
});

/**
 * GET /api/polls/:id - FETCH A POLL BY ID
 *
 * When does this run? When someone opens poll.html?id=abc123 or vote.html?id=abc123,
 * the frontend fetches from this URL to get the poll data.
 *
 * :id is a "route parameter". Express captures it. /api/polls/abc123 -> req.params.id = "abc123"
 */
app.get('/api/polls/:id', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) return res.status(404).json({ error: 'Poll not found' });  // 404 = Not Found
  res.json(poll);
});

// ============ SOCKET.IO - REAL-TIME UPDATES ============
// THE PROBLEM: When someone votes on the vote page, the poll page (with the bars) needs to update.
// With plain HTTP, the poll page would have to keep asking "any new votes?" every second (polling).
// That's wasteful and has a delay.
//
// THE SOLUTION: WebSockets. We keep a connection open. When a vote comes in, we immediately
// push the updated poll to everyone watching. No delay, no repeated requests.
//
// SOCKET.IO adds: rooms (group sockets), reconnection, fallbacks. io = server side, socket = one client.

io.on('connection', (socket) => {
  // "connection" fires when a new browser tab connects (poll page or vote page).
  // Each tab gets its own "socket" - a two-way channel to that specific client.

  /**
   * JOIN: Client says "I'm viewing poll X"
   * We add this socket to a "room" named after the poll ID. Rooms let us broadcast
   * to a subset of clients. io.to(pollId).emit() sends only to people in that room.
   */
  socket.on('join', (pollId) => {
    socket.join(pollId);                   // Add to room. Now we can target this poll's viewers.
    const poll = polls[pollId];
    if (poll) socket.emit('poll', poll);   // Send current state immediately. If they joined late,
  });                                      // they might have missed the initial fetch - this catches them.

  /**
   * VOTE: Client says "Option Y was voted for in poll X"
   * We update our data and broadcast to everyone watching that poll.
   */
  socket.on('vote', ({ pollId, optionIndex }) => {
    // Destructuring: { pollId, optionIndex } extracts from the object the client sent.
    const poll = polls[pollId];
    if (!poll || optionIndex < 0 || optionIndex >= poll.options.length) return;  // Sanity check

    poll.options[optionIndex].votes++;     // Mutate the poll object - add one vote
    io.to(pollId).emit('update', poll);    // Send updated poll to everyone in this poll's room.
  });                                       // The poll page's socket.on('update', renderPoll) will re-render.
});

// ============ START THE SERVER ============
// process.env = environment variables. When you deploy to Render/Railway, they set PORT (e.g. 10000).
// Locally, it's undefined, so we use 3000. The || means "use 3000 if process.env.PORT is falsy".
const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Techloop Polling running at http://localhost:${PORT}`);
});
