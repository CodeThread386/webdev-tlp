// Poll host view - live results, share URL, QR code

const params = new URLSearchParams(window.location.search);
const pollId = params.get('id');

if (!pollId) {
  window.location.href = '/';
} else {
  const socket = io();

  socket.emit('join', pollId);
  socket.on('poll', renderPoll);
  socket.on('update', renderPoll);

  fetch(`/api/polls/${pollId}`)
    .then(res => res.ok ? res.json() : Promise.reject())
    .then(renderPoll)
    .catch(() => {
      document.getElementById('pollQuestion').textContent = 'Poll not found';
    });

  function renderPoll(poll) {
    document.getElementById('pollQuestion').textContent = poll.question;

    const total = poll.options.reduce((s, o) => s + o.votes, 0);
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

    // Share URL
    const voteUrl = `${window.location.origin}/vote.html?id=${pollId}`;
    const shareInput = document.getElementById('shareUrl');
    shareInput.value = voteUrl;

    // QR code (using free API - no library needed)
    const qrContainer = document.getElementById('qrContainer');
    qrContainer.innerHTML = `<img src="https://api.qrserver.com/v1/create-qr-code/?size=180x180&data=${encodeURIComponent(voteUrl)}" alt="QR Code" width="180" height="180">`;
  }

  // Copy button
  document.getElementById('copyBtn').addEventListener('click', () => {
    const input = document.getElementById('shareUrl');
    input.select();
    navigator.clipboard.writeText(input.value).then(() => {
      const btn = document.getElementById('copyBtn');
      btn.textContent = 'Copied!';
      setTimeout(() => (btn.textContent = 'Copy'), 2000);
    });
  });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
