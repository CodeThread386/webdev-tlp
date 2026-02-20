// Vote page - participant view

const params = new URLSearchParams(window.location.search);
const pollId = params.get('id');

if (!pollId) {
  showError('Invalid poll link');
} else {
  const socket = io();
  let hasVoted = false;

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

  function renderOptions(poll) {
    const container = document.getElementById('optionsContainer');
    container.innerHTML = poll.options
      .map(
        (opt, i) => `
        <button type="button" class="vote-option" data-index="${i}">
          ${escapeHtml(opt.text)}
        </button>
      `
      )
      .join('');

    container.querySelectorAll('.vote-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (hasVoted) return;
        const index = parseInt(btn.dataset.index, 10);
        socket.emit('vote', { pollId, optionIndex: index });
        hasVoted = true;
        container.querySelectorAll('.vote-option').forEach(b => (b.disabled = true));
        btn.classList.add('voted');
        document.getElementById('votedMsg').style.display = 'block';
        document.getElementById('viewResults').href = `/poll.html?id=${pollId}`;
      });
    });
  }

  function showError(msg) {
    document.getElementById('pollQuestion').textContent = 'Oops';
    document.getElementById('errorMsg').textContent = msg;
    document.getElementById('errorMsg').style.display = 'block';
  }
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
