# Techloop Polling

Real-time polling system built for the Techloop+ WebDev Workshop. Create polls, share via URL or QR code, and watch live results update instantly.

## Features

- **Create polls** – Anyone can create a poll with a question and dynamic options
- **Share via URL** – Primary sharing method; copy link and send to participants
- **QR code** – Optional; participants can scan to vote from their phones
- **Live results** – Vote counts update in real time for everyone (WebSocket/Socket.io)
- **No refresh needed** – Fully real-time experience

## Tech Stack

- **Frontend:** HTML, CSS, JavaScript
- **Backend:** Node.js, Express.js
- **Real-time:** Socket.io

## Quick Start

```bash
npm install
npm start
```

Open [http://localhost:3000](http://localhost:3000)

## Deploy Online

### Render

1. Push this repo to GitHub
2. Go to [render.com](https://render.com) → New → Web Service
3. Connect your repo
4. Settings:
   - **Build command:** `npm install`
   - **Start command:** `npm start`
   - **Instance type:** Free
5. Deploy

Your app will get a URL like `https://your-app.onrender.com`

## Project Structure

```
polling/
├── server.js          # Express + Socket.io backend
├── package.json
├── public/
│   ├── index.html     # Create poll
│   ├── poll.html      # Host view (results, share, QR)
│   ├── vote.html      # Participant vote view
│   ├── css/style.css
│   └── js/
│       ├── create.js
│       ├── poll.js
│       └── vote.js
└── README.md
```

Techloop+ WebDev Workshop
