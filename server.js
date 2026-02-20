const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const path = require('path');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Serve static files from public folder
app.use(express.static(path.join(__dirname, 'public')));

// Parse JSON body
app.use(express.json());

// In-memory poll store
const polls = {};

// ============ REST API ============

// Create a new poll
app.post('/api/polls', (req, res) => {
  const { question, options } = req.body;

  if (!question || !options || !Array.isArray(options) || options.length < 2) {
    return res.status(400).json({ error: 'Question and at least 2 options required' });
  }

  const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 8);
  polls[id] = {
    question: question.trim(),
    options: options.filter(o => o && o.trim()).map(text => ({ text: text.trim(), votes: 0 })),
  };

  res.json({ id, ...polls[id] });
});

// Get a poll by ID
app.get('/api/polls/:id', (req, res) => {
  const poll = polls[req.params.id];
  if (!poll) return res.status(404).json({ error: 'Poll not found' });
  res.json(poll);
});

// ============ Socket.io ============

io.on('connection', (socket) => {
  socket.on('join', (pollId) => {
    socket.join(pollId);
    const poll = polls[pollId];
    if (poll) socket.emit('poll', poll);
  });

  socket.on('vote', ({ pollId, optionIndex }) => {
    const poll = polls[pollId];
    if (!poll || optionIndex < 0 || optionIndex >= poll.options.length) return;

    poll.options[optionIndex].votes++;
    io.to(pollId).emit('update', poll);
  });
});

// ============ Start server ============

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Techloop Polling running at http://localhost:${PORT}`);
});
