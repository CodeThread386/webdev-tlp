/**
 * ============================================
 * POLL RESULTS PAGE - poll.js
 * ============================================
 *
 * This script runs on poll.html - the "host" view where you see live vote counts.
 * You get here after creating a poll, or when someone shares the poll link with you.
 *
 * THE URL: poll.html?id=abc123
 * The ?id=abc123 part is the "query string". We need to extract "abc123" to know which poll to show.
 *
 * RESPONSIBILITIES:
 * 1. Load the poll data (from URL param + API)
 * 2. Display vote bars that update in REAL TIME when someone votes (Socket.io)
 * 3. Show the share URL and copy button
 * 4. Generate a QR code so people can scan with their phone to vote
 *
 * REAL-TIME FLOW:
 * - We join the poll's "room" via Socket.io
 * - When someone votes (on vote.html), the server sends us an 'update' event
 * - We re-render the bars with the new counts. No page refresh needed!
 */

// Import Socket.io client. We need the client library to connect to our server's Socket.io.
// We use the ESM build from CDN (matches our server version). io() will connect to the same host.
import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';

// ============ GET POLL ID FROM URL ============
// window.location = info about the current URL
// window.location.search = "?id=abc123" (the query string)
// URLSearchParams parses it. .get('id') returns "abc123".
const params = new URLSearchParams(window.location.search);
const pollId = params.get('id');

if (!pollId) {
  // No ID = invalid link. Redirect to home.
  window.location.href = '/';
} else {
  // ---------- SOCKET.IO - CONNECT AND JOIN ----------
  const socket = io();

  // Tell the server "I'm watching this poll". The server adds us to a room.
  // From now on, when anyone votes in this poll, we'll get an 'update' event.
  socket.emit('join', pollId);

  // Register handlers. When server sends 'poll' or 'update', call renderPoll with the data.
  // 'poll' = initial data when we join. 'update' = new data when someone votes.
  socket.on('poll', renderPoll);
  socket.on('update', renderPoll);

  // ---------- FETCH POLL DATA (INITIAL LOAD) ----------
  // We might get data from socket.emit('poll') when we join. But to be safe, we also fetch.
  // Why both? Socket might not have sent it yet, or we might have missed it. Fetch is reliable.
  fetch(`/api/polls/${pollId}`)
    .then(res => res.ok ? res.json() : Promise.reject())
    // If res.ok is false (404, 500, etc.), we reject so .catch() runs. Otherwise parse JSON.
    .then(renderPoll)
    .catch(() => {
      document.getElementById('pollQuestion').textContent = 'Poll not found';
    });

  /**
   * RENDER POLL - Draw the question, vote bars, share URL, and QR code.
   * Called on initial load AND every time we receive an 'update' from Socket.io.
   *
   * @param {Object} poll - { question: string, options: [{ text, votes }, ...] }
   */
  function renderPoll(poll) {
    document.getElementById('pollQuestion').textContent = poll.question;

    // TOTAL VOTES: We need this to calculate percentages for the bar widths.
    // reduce((accumulator, current) => ..., initialValue) - "reduce" = boil array down to one value.
    // Here: start with 0, add each option's votes. Result = total votes.
    const total = poll.options.reduce((s, o) => s + o.votes, 0);

    // BUILD HTML for each option. We use map() to transform the options array into HTML strings.
    // Each option becomes: [label] [progress bar with width = %] [vote count]
    const container = document.getElementById('resultsContainer');
    container.innerHTML = poll.options
      .map(
        (opt, i) => `
        <div class="result-item">
          <span class="result-label">${escapeHtml(opt.text)}</span>
          <div class="result-bar-wrap">
            <div class="result-bar" style="width: ${total ? (opt.votes / total) * 100 : 0}%"></div>
          </div>
          <span class="result-count">${opt.votes}</span>
        </div>
      `
      )
      .join('');
    // total ? (opt.votes / total) * 100 : 0  = if total is 0, use 0% (avoid division by zero)

    // ---------- SHARE URL ----------
    // window.location.origin = the base URL: "http://localhost:3000" or "https://our-app.onrender.com"
    // We build the full vote URL so it works whether we're local or deployed.
    const voteUrl = `${window.location.origin}/vote.html?id=${pollId}`;
    const shareInput = document.getElementById('shareUrl');
    shareInput.value = voteUrl;

    // ---------- QR CODE ----------
    // We use a free API: api.qrserver.com. You pass a URL, it returns an image of a QR code.
    // No JavaScript library needed - just set the img src to the API URL with our vote URL as the data param.
    // encodeURIComponent() encodes special characters (spaces, &, etc.) so they're safe in a URL.
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(voteUrl)}" alt="QR Code" width="180" height="180">`;
  }

  // ---------- COPY BUTTON ----------
  document.getElementById('copyBtn').addEventListener('click', () => {
    const input = document.getElementById('shareUrl');
    input.select();  // Select the text - gives visual feedback and prepares for copy
    navigator.clipboard.writeText(input.value).then(() => {
      // Clipboard API is async. When done, show "Copied!" temporarily.
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy'), 2000);  // Reset after 2 seconds
    });
  });
}

/**
 * ESCAPE HTML - Prevent XSS (Cross-Site Scripting)
 *
 * If someone creates a poll with option text like: <script>alert('hacked')</script>
 * and we insert it directly into innerHTML, the browser would EXECUTE that script!
 *
 * We use this trick: put the text in textContent (which treats it as plain text, no HTML),
 * then read it back via innerHTML. The browser automatically escapes < > & " ' so they
 * display as text instead of being interpreted as HTML/code.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
