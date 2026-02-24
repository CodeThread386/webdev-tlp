/**
 * ============================================
 * CREATE POLL PAGE - create.js
 * ============================================
 *
 * This script runs ONLY on index.html (the "Create Poll" / landing page).
 * It does NOT run on poll.html or vote.html - each page has its own script.
 *
 * RESPONSIBILITIES:
 * 1. Let users add/remove option fields (the "+ Add option" and × buttons)
 * 2. When they submit, send the data to our server via fetch()
 * 3. On success, redirect to the poll results page
 *
 * HOW IT CONNECTS TO THE SERVER:
 * - We send a POST request to /api/polls with { question, options }
 * - The server creates the poll, returns { id, question, options }
 * - We redirect to /poll.html?id=<that id>
 */

// ============ DOMContentLoaded - WHY WE NEED THIS ============
// When the browser loads a page, it parses HTML top to bottom. When it hits <script src="create.js">,
// it downloads and runs create.js IMMEDIATELY. At that moment, the HTML below the script might
// not exist yet! So document.getElementById('pollForm') could return null.
//
// DOMContentLoaded fires when the HTML is fully parsed (DOM is ready). We wait for that.
document.addEventListener('DOMContentLoaded', () => {
  // ---------- GET REFERENCES TO DOM ELEMENTS ----------
  // We'll use these repeatedly. Storing in variables is cleaner than calling getElementById every time.
  const form = document.getElementById('pollForm');
  const optionsContainer = document.getElementById('optionsContainer');
  const addOptionBtn = document.getElementById('addOption');

  // ============ ADD OPTION BUTTON ============
  // When user clicks "+ Add option", we create a new row with an input and a remove button.
  addOptionBtn.addEventListener('click', () => {
    // Count how many option rows exist. +1 because we're adding a new one (e.g. "Option 5")
    const count = optionsContainer.querySelectorAll('.option-row').length + 1;

    // Create the new row. We use createElement + innerHTML to build it.
    // Template literal (backticks): ${count} gets replaced with the value of count.
    const row = document.createElement('div');
    row.className = 'option-row';  // Same class as existing rows so CSS applies
    row.innerHTML = `
      <input type="text" class="option-input" placeholder="Option ${count}" required>
      <button type="button" class="btn-icon btn-remove" title="Remove" aria-label="Remove option">×</button>
    `;

    // The remove button (×) - we need a click handler. We add it to THIS row's remove button.
    // We only allow remove if there are more than 2 options (a poll needs at least 2).
    row.querySelector('.btn-remove').addEventListener('click', () => {
      if (optionsContainer.querySelectorAll('.option-row').length > 2) {
        row.remove();  // Remove this row from the DOM
      }
    });

    // Add the new row to the page. appendChild adds it as the last child of optionsContainer.
    optionsContainer.appendChild(row);
  });

  // ============ REMOVE OPTION - EVENT DELEGATION ============
  // The HTML already has 4 option rows with remove buttons. The rows we ADD above also have
  // remove buttons. But wait - the rows in the HTML were there when the page loaded. We could
  // add listeners to those in a loop. But what about the dynamically added rows? We could
  // add a listener when we create each row (we do that above). So why this listener too?
  //
  // This handles the INITIAL 4 rows. The remove buttons in the HTML don't have listeners
  // from our "add option" code - that only runs when we CREATE new rows. So we need a
  // way to handle clicks on ANY remove button, including existing ones.
  //
  // EVENT DELEGATION: We listen on the PARENT (optionsContainer). When you click anywhere
  // inside it, the event "bubbles" up. So we get the click. We check: was it on a .btn-remove?
  // If yes, find the row and remove it. This way ONE listener handles all remove buttons,
  // including ones we add later.
  optionsContainer.addEventListener('click', (e) => {
    if (e.target.classList.contains('btn-remove')) {
      const row = e.target.closest('.option-row');  // closest() goes up the DOM tree to find .option-row
      if (optionsContainer.querySelectorAll('.option-row').length > 2 && row) {
        row.remove();
      }
    }
  });

  // ============ FORM SUBMIT ============
  // When user clicks "Create Poll", the form's default behavior is to submit (which reloads the page).
  // We want to handle it with JavaScript instead - send the data via fetch, then redirect.
  form.addEventListener('submit', async (e) => {
    e.preventDefault();  // CRITICAL: Stop the default form submit. Without this, page reloads and we lose control.

    // Collect data from the form:
    const question = document.getElementById('question').value.trim();
    const optionInputs = optionsContainer.querySelectorAll('.option-input');
    // [...optionInputs] = spread operator. querySelectorAll returns a NodeList (array-like).
    // Spread converts it to a real array so we can use .map() and .filter().
    // .map() gets each input's value.
    // .filter(v => v) removes empty strings (user left some options blank).
    const options = [...optionInputs]
      .map(input => input.value.trim())
      .filter(v => v);

    // Client-side validation. Server also validates - never trust the client. But this gives
    // instant feedback without a round-trip to the server.
    if (options.length < 2) {
      alert('Please add at least 2 options.');
      return;
    }

    // Disable the button and show "Creating..." - good UX. User knows something is happening.
    const btn = form.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.textContent = 'Creating...';

    try {
      // fetch() = the modern way to make HTTP requests from JavaScript.
      // It returns a Promise - a value that will be ready "later". await pauses until it resolves.
      const res = await fetch('/api/polls', {
        method: 'POST',                              // We're creating, so POST (not GET)
        headers: { 'Content-Type': 'application/json' },  // Tell server we're sending JSON
        body: JSON.stringify({ question, options }),      // Convert JS object to JSON string
      });

      const data = await res.json();  // Parse the response body as JSON. res.json() also returns a Promise.

      // res.ok is true for 200-299 status codes, false for 400, 404, 500, etc.
      if (!res.ok) throw new Error(data.error || 'Failed to create poll');

      // Success! Redirect to the poll page. The server gave us data.id - we put it in the URL.
      // poll.html will read ?id=xxx and fetch/display that poll.
      window.location.href = `/poll.html?id=${data.id}`;
    } catch (err) {
      // Something went wrong: network error, server error, or we threw above.
      alert(err.message || 'Something went wrong');
      btn.disabled = false;
      btn.textContent = 'Create Poll';
    }
  });
});
