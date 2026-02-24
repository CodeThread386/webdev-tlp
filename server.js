import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const app = express();
const server = createServer(app);
const io = new Server(server);

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());

const polls = {};

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

app.get('/api/polls/:id', (req, res) => {
    const poll = polls[req.params.id];
    if (!poll) return res.status(404).json({ error: 'Poll not found' });
    res.json(poll);
});

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

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
    console.log(`Techloop Polling running at http://localhost:${PORT}`);
});