// Create poll page - dynamic options, form submit

document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('pollForm');
  const optionsContainer = document.getElementById('optionsContainer');
  const addOptionBtn = document.getElementById('addOption');

  // Add option
  addOptionBtn.addEventListener('click', () => {
    const count = optionsContainer.querySelectorAll('.option-row').length + 1;
    const row = document.createElement('div');
    row.className = 'option-row';
    row.innerHTML = `
      <input type="text" class="option-input" placeholder="Option ${count}" required>
      <button type="button" class="btn-icon btn-remove" title="Remove" aria-label="Remove option">×</button>
    `;
    row.querySelector('.btn-remove').addEventListener('click', () => {
      if (optionsContainer.querySelectorAll('.option-row').length > 2) {
        row.remove();
      }
    });
    optionsContainer.appendChild(row);
  });

  // Remove option (delegate)
  optionsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
      const row = e.target.closest('.option-row');
      if (optionsContainer.querySelectorAll('.option-row').length > 2 && row) {
        row.remove();
      }
    }
  });

  // Submit
  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const question = document.getElementById('question').value.trim();
    const optionInputs = optionsContainer.querySelectorAll('.option-input');
    const options = [...optionInputs]
      .map(input => input.value.trim())
      .filter(v => v);

    if (options.length < 2) {
      alert('Please add at least 2 options.');
      return;
    }

    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      const res = await fetch('/api/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ question, options }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create poll');

      window.location.href = `/poll.html?id=${data.id}`;
    } catch (err) {
      alert(err.message || 'Something went wrong');
      btn.disabled = false;
      btn.textContent = 'Create Poll';
    }
  });
});
