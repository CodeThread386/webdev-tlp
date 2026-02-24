/**
 * ============================================
 * VOTE PAGE - vote.js
 * ============================================
 *
 * This script runs on vote.html - the "participant" view where people click to vote.
 * Participants get here by: clicking the share link, or scanning the QR code.
 *
 * THE URL: vote.html?id=abc123
 * We extract the poll ID to fetch the poll and know which poll to send the vote to.
 *
 * RESPONSIBILITIES:
 * 1. Fetch the poll and display options as clickable buttons
 * 2. When user clicks an option, send the vote to the server via Socket.io
 * 3. Show "Thanks for voting!" and a link to view results
 * 4. Handle errors (invalid link, poll not found)
 *
 * VOTE FLOW:
 * 1. User clicks "Option A"
 * 2. We socket.emit('vote', { pollId, optionIndex: 0 })
 * 3. Server receives it, updates poll.options[0].votes++, then io.to(pollId).emit('update', poll)
 * 4. Everyone on the poll page (including the host) gets the update and their bars re-render
 */

import { io } from 'https://cdn.socket.io/4.6.1/socket.io.esm.min.js';

// ============ GET POLL ID FROM URL ============
const params = new URLSearchParams(window.location.search);
const pollId = params.get('id');

if (!pollId) {
  showError('Invalid poll link');
} else {
  const socket = io();
  let hasVoted = false;

  // ---------- FETCH POLL DATA ----------
  // Get the poll so we know the question and options. We'll render buttons for each option.
  fetch(`/api/polls/${pollId}`)
    .then(res => {
      if (!res.ok) throw new Error('Poll not found');
      return res.json();
    })
    .then(poll => {
      document.getElementById('pollQuestion').textContent = poll.question;
      renderOptions(poll);
    })
    .catch(() => showError('Poll not found'));

  /**
   * RENDER OPTIONS - Create a button for each option.
   * We use data-index to store which option (0, 1, 2...) so when they click, we know which one.
   */
  function renderOptions(poll) {
    const container = document.getElementById('optionsContainer');

    // Build HTML. data-index="${i}" stores the index. In the click handler we read it via dataset.index.
    container.innerHTML = poll.options
      .map(
        (opt, i) => `
        <button type="button" class="vote-option" data-index="${i}">
          ${escapeHtml(opt.text)}
        </button>
      `
      )
      .join('');

    // Attach click handler to each button. We use forEach to loop over the NodeList.
    container.querySelectorAll('.vote-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (hasVoted) return;  // Guard: in case they double-click before we disable

        // dataset.index gives us the data-index value as a string. parseInt(..., 10) converts to number.
        const index = parseInt(btn.dataset.index, 10);

        // SEND VOTE TO SERVER. The server will update the count and broadcast to the poll page.
        socket.emit('vote', { pollId, optionIndex: index });

        hasVoted = true;

        // Disable all buttons - they can't vote again (we could allow it, but typically polls are one-vote)
        container.querySelectorAll('.vote-option').forEach(b => (b.disabled = true));

        // Add 'voted' class to the one they clicked - CSS styles it (e.g. green border)
        btn.classList.add('voted');

        // Show the "Thanks for voting!" message and the link to see results
        document.getElementById('votedMsg').style.display = 'block';
        document.getElementById('viewResults').href = `/poll.html?id=${pollId}`;
      });
    });
  }

  /**
   * SHOW ERROR - When poll doesn't exist (404) or link is invalid.
   * We update the heading, show the error message div, and put the message in it.
   */
  function showError(msg) {
    document.getElementById('pollQuestion').textContent = 'Oops';
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorMsg').style.display = 'block';
  }
}

/**
 * ESCAPE HTML - Same as poll.js. Prevents XSS when we render user-provided text.
 */
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
