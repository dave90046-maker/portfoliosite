// Tab switching (supports any number of tabs)
const tabButtons = document.querySelectorAll('.tab-btn');
const tabPanels = document.querySelectorAll('.tab-panel');

tabButtons.forEach(btn => {
  btn.addEventListener('click', () => {
    const target = btn.getAttribute('data-tab');

    tabButtons.forEach(b => {
      b.classList.toggle('active', b === btn);
      b.setAttribute('aria-selected', b === btn ? 'true' : 'false');
    });

    tabPanels.forEach(panel => {
      panel.classList.toggle('active', panel.getAttribute('data-tab-panel') === target);
    });
  });
});

// ICP Research
const ICP_API_URL = 'https://dave-gtm-api.vercel.app/api/research';
const ICP_SECTION_HEADERS = [
  'Company Overview',
  'Buyer Persona',
  'Top Pain Points',
  'Outreach Angle',
  'Marketing Channel Fit'
];

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

function renderSectionBody(text) {
  const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
  let html = '';
  let listBuffer = [];

  const flushList = () => {
    if (listBuffer.length) {
      html += '<ul>' + listBuffer.map(item => `<li>${escapeHtml(item)}</li>`).join('') + '</ul>';
      listBuffer = [];
    }
  };

  lines.forEach(line => {
    const bulletMatch = line.match(/^[-*•]\s*(.+)$/) || line.match(/^\d+[.)]\s*(.+)$/);
    if (bulletMatch) {
      listBuffer.push(bulletMatch[1]);
    } else {
      flushList();
      html += `<p>${escapeHtml(line)}</p>`;
    }
  });
  flushList();

  return html || `<p>${escapeHtml(text.trim())}</p>`;
}

function parseBrief(rawText) {
  const escapedHeaders = ICP_SECTION_HEADERS.map(h => h.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
  const headerRegex = new RegExp(`(?:^|\\n)\\s*#{0,3}\\s*\\**\\s*(${escapedHeaders.join('|')})\\s*\\**\\s*:?[ \\t]*`, 'gi');

  const matches = [...rawText.matchAll(headerRegex)];
  if (matches.length === 0) return null;

  const sections = {};
  matches.forEach((match, i) => {
    const headerName = ICP_SECTION_HEADERS.find(h => h.toLowerCase() === match[1].toLowerCase());
    const contentStart = match.index + match[0].length;
    const contentEnd = i + 1 < matches.length ? matches[i + 1].index : rawText.length;
    sections[headerName] = rawText.slice(contentStart, contentEnd).trim();
  });

  return sections;
}

function renderResults(rawText) {
  const resultsEl = document.getElementById('icp-results');
  const sections = parseBrief(rawText);

  if (!sections) {
    resultsEl.innerHTML = `<div class="icp-section"><div class="icp-section-body">${renderSectionBody(rawText)}</div></div>`;
    resultsEl.hidden = false;
    return;
  }

  resultsEl.innerHTML = ICP_SECTION_HEADERS
    .filter(header => sections[header])
    .map(header => `
      <div class="icp-section">
        <h3 class="icp-section-title">${escapeHtml(header)}</h3>
        <div class="icp-section-body">${renderSectionBody(sections[header])}</div>
      </div>
    `).join('');

  resultsEl.hidden = false;
}

const icpForm = document.getElementById('icp-form');
if (icpForm) {
  const companyInput = document.getElementById('company-name');
  const submitBtn = document.getElementById('icp-submit');
  const statusEl = document.getElementById('icp-status');
  const errorEl = document.getElementById('icp-error');
  const resultsEl = document.getElementById('icp-results');

  icpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const company = companyInput.value.trim();
    if (!company) return;

    submitBtn.disabled = true;
    statusEl.hidden = false;
    errorEl.hidden = true;
    resultsEl.hidden = true;
    resultsEl.innerHTML = '';

    try {
      const response = await fetch(ICP_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company })
      });

      if (!response.ok) {
        throw new Error(`Request failed with status ${response.status}`);
      }

      const data = await response.json();
      if (!data || typeof data.result !== 'string') {
        throw new Error('Unexpected response format');
      }

      renderResults(data.result);
    } catch (err) {
      errorEl.textContent = "Something went wrong generating this research brief. Please try again in a moment.";
      errorEl.hidden = false;
    } finally {
      submitBtn.disabled = false;
      statusEl.hidden = true;
    }
  });
}
