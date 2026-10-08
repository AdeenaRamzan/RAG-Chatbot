// ═══════════════════════════════════════════
//  RAG Intelligence — Conversational Client
// ═══════════════════════════════════════════

const API_BASE = window.location.origin;

// State
let sessionId = localStorage.getItem('rag_session_id') || null;
let isGenerating = false;
let currentDocuments = [];
let allSessions = [];
let chatHistory = [];
let activeDocumentId = null;

// DOM Elements
const $ = (sel) => document.querySelector(sel);
const mainContent = $('#mainContent');
const scrollThread = $('#scrollThread');
const welcomeScreen = $('#welcomeScreen');
const chatMessages = $('#chatMessages');
const chatInput = $('#chatInput');
const sendBtn = $('#sendBtn');
const attachBtn = $('#attachBtn');
const fileInput = $('#fileInput');
const modelSelect = $('#modelSelect');
const newChatBtn = $('#newChatBtn');
const exportChatBtn = $('#exportChatBtn');
const sourcesToggleBtn = $('#sourcesToggleBtn');
const navSourceCount = $('#navSourceCount');
const shelfCardsRow = $('#shelfCardsRow');
const shelfSummary = $('#shelfSummary');
const toastContainer = $('#toastContainer');
const uploadInlineStatus = $('#uploadInlineStatus');
const uploadInlineText = $('#uploadInlineText');
const dragOverlay = $('#dragOverlay');

// Chat History Sidebar Elements
const historySidebar = $('#historySidebar');
const historyToggleBtn = $('#historyToggleBtn');
const closeHistoryBtn = $('#closeHistoryBtn');
const historyComposeBtn = $('#historyComposeBtn');
const historySearchInput = $('#historySearchInput');
const historyThreadsList = $('#historyThreadsList');
const historyCounter = $('#historyCounter');

// Split Reader Elements
const readerPane = $('#readerPane');
const readerTitle = $('#readerTitle');
const readerTags = $('#readerTags');
const readerContent = $('#readerContent');
const closeReaderBtn = $('#closeReaderBtn');
const copyDocTextBtn = $('#copyDocTextBtn');

// Token Counter Elements
const composerTokenPill = $('#composerTokenPill');
const composerTokenCount = $('#composerTokenCount');
const composerTokenContextInfo = $('#composerTokenContextInfo');
const tokenContextDetail = $('#tokenContextDetail');

// Model Tokenizer Specifications
const modelTokenSpecs = {
  'openai/gpt-oss-120b': {
    name: 'GPT OSS 120B',
    context: '128k',
    charRatio: 3.85,
    baseTokens: 3
  },
  'openai/gpt-oss-20b': {
    name: 'GPT OSS 20B',
    context: '128k',
    charRatio: 3.9,
    baseTokens: 2
  },
  'qwen/qwen3.8-27b': {
    name: 'Qwen 3.8 27B',
    context: '32k',
    charRatio: 3.5,
    baseTokens: 4
  },
  'groq/compound': {
    name: 'Groq Compound',
    context: '128k',
    charRatio: 3.75,
    baseTokens: 8
  }
};

function estimateQueryTokens(text, modelKey) {
  if (!text || text.trim().length === 0) return 0;
  const spec = modelTokenSpecs[modelKey] || modelTokenSpecs['openai/gpt-oss-120b'];
  const trimmed = text.trim();
  const charLen = trimmed.length;

  let tokens = Math.ceil(charLen / spec.charRatio) + spec.baseTokens;
  const specialChars = (trimmed.match(/[{}[\]()<>=;:,.*&^%$#@!~`|\\]/g) || []).length;
  tokens += Math.ceil(specialChars * 0.35);

  return Math.max(1, tokens);
}

function updateTokenCounter() {
  if (!composerTokenCount) return;
  const currentText = chatInput ? chatInput.value : '';
  const selectedModelKey = modelSelect ? modelSelect.value : 'openai/gpt-oss-120b';
  const spec = modelTokenSpecs[selectedModelKey] || modelTokenSpecs['openai/gpt-oss-120b'];

  if (!currentText || currentText.trim().length === 0) {
    composerTokenCount.textContent = '0';
    if (composerTokenPill) {
      composerTokenPill.classList.remove('has-tokens');
      composerTokenPill.title = `Estimated query tokens for ${spec.name}`;
    }
    if (composerTokenContextInfo) composerTokenContextInfo.classList.remove('active');
    if (tokenContextDetail) {
      tokenContextDetail.textContent = `0 tokens · ${spec.context} context window (${spec.name})`;
    }
    return;
  }

  const queryTokens = estimateQueryTokens(currentText, selectedModelKey);
  const charCount = currentText.length;

  composerTokenCount.textContent = queryTokens.toLocaleString();
  if (composerTokenPill) {
    composerTokenPill.classList.add('has-tokens');
    composerTokenPill.title = `~${queryTokens.toLocaleString()} tokens (${charCount} chars) for ${spec.name}`;
  }

  if (composerTokenContextInfo) composerTokenContextInfo.classList.add('active');
  if (tokenContextDetail) {
    tokenContextDetail.textContent = `~${queryTokens.toLocaleString()} query tokens (${charCount} chars) · ${spec.context} limit (${spec.name})`;
  }
}

// Sources Drawer Elements
const sourcesDrawer = $('#sourcesDrawer');
const drawerScrim = $('#drawerScrim');
const closeDrawerBtn = $('#closeDrawerBtn');
const drawerUploadZone = $('#drawerUploadZone');
const drawerSearchInput = $('#drawerSearchInput');
const drawerDocList = $('#drawerDocList');
const drawerSubtitle = $('#drawerSubtitle');

// ═══════════════════════════════════════════
//  CHAT HISTORY SIDEBAR
// ═══════════════════════════════════════════
function toggleHistorySidebar() {
  historySidebar.classList.toggle('collapsed');
}

historyToggleBtn.addEventListener('click', toggleHistorySidebar);
closeHistoryBtn.addEventListener('click', () => {
  historySidebar.classList.add('collapsed');
});

// Shortcut Ctrl/Cmd + H
document.addEventListener('keydown', (e) => {
  if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'h') {
    e.preventDefault();
    toggleHistorySidebar();
  }
});

historyComposeBtn.addEventListener('click', () => {
  startNewSession();
});

historySearchInput.addEventListener('input', () => {
  renderHistoryList();
});

async function loadSessions() {
  try {
    const res = await fetch(`${API_BASE}/sessions`);
    if (!res.ok) throw new Error('Failed to load sessions');
    allSessions = await res.json();
    historyCounter.textContent = allSessions.length;
    renderHistoryList();
  } catch (err) {
    console.warn('Could not load sessions:', err);
  }
}

function renderHistoryList() {
  const query = historySearchInput.value.trim().toLowerCase();
  const filtered = query
    ? allSessions.filter(s => s.title.toLowerCase().includes(query))
    : allSessions;

  historyCounter.textContent = filtered.length;

  if (filtered.length === 0) {
    historyThreadsList.innerHTML = `
      <div class="history-empty-hint">
        ${query ? 'No discussions matching filter.' : 'No previous conversations yet. Start a discussion above!'}
      </div>
    `;
    return;
  }

  // Group threads into Today, Previous 7 Days, Older
  const now = new Date();
  const oneDay = 24 * 60 * 60 * 1000;
  const groups = {
    today: [],
    week: [],
    older: []
  };

  filtered.forEach(session => {
    const sessionDate = new Date(session.updatedAt || session.createdAt);
    const diffDays = Math.floor((now - sessionDate) / oneDay);
    if (diffDays === 0) {
      groups.today.push(session);
    } else if (diffDays < 7) {
      groups.week.push(session);
    } else {
      groups.older.push(session);
    }
  });

  let html = '';

  const renderGroup = (title, items) => {
    if (items.length === 0) return '';
    let groupHtml = `<div class="history-group-heading">${title}</div>`;
    items.forEach(s => {
      const isActive = s.id === sessionId ? 'active' : '';
      const dateStr = new Date(s.updatedAt || s.createdAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric'
      });
      const msgsLabel = s.messageCount === 1 ? '1 msg' : `${s.messageCount || 0} msgs`;

      groupHtml += `
        <div class="history-thread-item ${isActive}" data-id="${s.id}">
          <div class="history-thread-main" onclick="switchSession('${s.id}')">
            <span class="history-thread-title" title="${escapeHtml(s.title)}">${escapeHtml(s.title)}</span>
            <span class="history-thread-meta">
              <span>${msgsLabel}</span>
              <span>·</span>
              <span>${dateStr}</span>
            </span>
          </div>
          <div class="history-thread-actions">
            <button class="history-thread-btn" onclick="renameSession('${s.id}', event)" title="Rename discussion">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M12 20h9"/><path d="M16.5 3.5a2.121 2.121 0 0 1 3 3L7 19l-4 1 1-4L16.5 3.5z"/>
              </svg>
            </button>
            <button class="history-thread-btn del" onclick="deleteSession('${s.id}', event)" title="Delete discussion">
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
            </button>
          </div>
        </div>
      `;
    });
    return groupHtml;
  };

  html += renderGroup('Today', groups.today);
  html += renderGroup('Previous 7 Days', groups.week);
  html += renderGroup('Older', groups.older);

  historyThreadsList.innerHTML = html;
}

async function switchSession(newSessionId) {
  if (isGenerating) return;
  sessionId = newSessionId;
  localStorage.setItem('rag_session_id', sessionId);

  // Update active styling in sidebar
  document.querySelectorAll('.history-thread-item').forEach(el => {
    el.classList.toggle('active', el.dataset.id === sessionId);
  });

  try {
    const res = await fetch(`${API_BASE}/sessions/${sessionId}`);
    if (!res.ok) throw new Error('Could not load session');
    const session = await res.json();

    // Clear and restore thread
    chatMessages.innerHTML = '';
    const welcome = $('#welcomeScreen');
    if (welcome) welcome.remove();

    chatHistory = [];

    if (session.messages && session.messages.length > 0) {
      session.messages.forEach(msg => {
        if (msg.role === 'human' || msg.role === 'user') {
          appendUserMessage(msg.content);
          chatHistory.push({ role: 'user', content: msg.content });
        } else {
          appendAssistantMessage(msg.content, msg.sources);
          chatHistory.push({ role: 'assistant', content: msg.content, sources: msg.sources });
        }
      });
    } else {
      showWelcomeScreen();
    }

    showToast(`Loaded "${session.title}"`, 'info');
  } catch (err) {
    showToast(`Failed to load thread: ${err.message}`, 'error');
  }
}

async function renameSession(targetSessionId, e) {
  e.stopPropagation();
  const session = allSessions.find(s => s.id === targetSessionId);
  if (!session) return;

  const currentTitle = session.title || 'Discussion';
  const newTitle = prompt('Rename discussion:', currentTitle);
  if (!newTitle || newTitle.trim() === '' || newTitle.trim() === currentTitle) return;

  try {
    const res = await fetch(`${API_BASE}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id: targetSessionId, title: newTitle.trim() })
    });
    if (!res.ok) throw new Error('Failed to rename session');

    showToast('Discussion renamed', 'success');
    loadSessions();
  } catch (err) {
    showToast(`Rename failed: ${err.message}`, 'error');
  }
}

async function deleteSession(targetSessionId, e) {
  e.stopPropagation();
  if (!confirm('Are you sure you want to delete this discussion thread?')) return;

  try {
    const res = await fetch(`${API_BASE}/sessions/${targetSessionId}`, {
      method: 'DELETE'
    });
    if (!res.ok) throw new Error('Failed to delete session');

    showToast('Discussion deleted', 'success');

    if (sessionId === targetSessionId) {
      startNewSession();
    } else {
      loadSessions();
    }
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

function startNewSession() {
  sessionId = 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  localStorage.setItem('rag_session_id', sessionId);
  chatHistory = [];

  chatMessages.innerHTML = '';
  showWelcomeScreen();
  loadSessions();
  showToast('Started new discussion thread', 'info');
}

function showWelcomeScreen() {
  const existingWelcome = $('#welcomeScreen');
  if (existingWelcome) return;

  const welcomeHtml = `
    <div class="welcome-view" id="welcomeScreen">
      <div class="hero-typography">
        <span class="hero-tag">Document Synthesis</span>
        <h1 class="hero-title">What would you like to uncover?</h1>
        <p class="hero-desc">
          Ask targeted questions, synthesize complex findings, or extract figures directly from your indexed documents.
        </p>
      </div>

      <div class="sources-shelf">
        <div class="shelf-header">
          <span class="shelf-label">Active Sources</span>
          <span class="shelf-hint" id="shelfSummary">${currentDocuments.length} documents loaded</span>
        </div>
        <div class="shelf-cards-row" id="shelfCardsRow"></div>
      </div>

      <div class="discovery-prompts">
        <div class="prompt-group-label">Try exploring</div>
        <div class="prompt-cards-grid">
          <button class="discovery-card welcome-tip" data-tip="Provide an executive summary of the primary topics and takeaways across all loaded documents.">
            <div class="card-title">Executive Summary</div>
            <div class="card-detail">Synthesize overarching themes and high-level findings.</div>
          </button>
          <button class="discovery-card welcome-tip" data-tip="Extract key figures, quantitative metrics, dates, and specifications from the text.">
            <div class="card-title">Metrics &amp; Figures</div>
            <div class="card-detail">Pull numerical benchmarks, dates, and specifications.</div>
          </button>
          <button class="discovery-card welcome-tip" data-tip="Compare the companies, products, or entities described across the documents.">
            <div class="card-title">Comparative Analysis</div>
            <div class="card-detail">Map out organizations, products, and operational scopes.</div>
          </button>
          <button class="discovery-card welcome-tip" data-tip="What are the main conclusions, guidelines, or action items outlined?">
            <div class="card-title">Action Items &amp; Takeaways</div>
            <div class="card-detail">Extract explicit procedures, steps, and recommendations.</div>
          </button>
        </div>
      </div>
    </div>
  `;
  scrollThread.insertAdjacentHTML('afterbegin', welcomeHtml);
  renderShelfCards();
  bindWelcomeTips();
}

// ═══════════════════════════════════════════
//  DOCUMENT SPLIT READER
// ═══════════════════════════════════════════
async function openDocumentReader(fileId, filename) {
  activeDocumentId = fileId;
  readerTitle.textContent = filename || 'Loading...';
  readerTags.innerHTML = `<span>Loading metadata...</span>`;
  readerContent.textContent = `Fetching indexed text for ${filename}...`;
  readerPane.classList.add('open');

  try {
    const res = await fetch(`${API_BASE}/doc/${fileId}`);
    if (!res.ok) throw new Error('Could not fetch document content');
    const data = await res.json();

    readerTitle.textContent = data.filename;
    const dateStr = data.upload_timestamp
      ? new Date(data.upload_timestamp).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
      : 'Ready';
    
    readerTags.innerHTML = `
      <span>Doc ID #${data.id}</span>
      <span>·</span>
      <span>${data.chunk_count || 1} chunks</span>
      <span>·</span>
      <span>${dateStr}</span>
      <span>·</span>
      <span>${(data.text || '').length.toLocaleString()} chars</span>
    `;

    rawDocumentText = data.text || '';
    renderDocumentInReader(rawDocumentText, data.filename);
  } catch (err) {
    readerContent.textContent = `Failed to preview text: ${err.message}`;
  }
}

let rawDocumentText = '';

function renderDocumentInReader(rawText, filename = '') {
  if (!rawText || !rawText.trim()) {
    readerContent.innerHTML = `<div class="reader-text-paragraph">No text extracted.</div>`;
    return;
  }

  // Detect language hint from filename or content
  const ext = filename.split('.').pop().toLowerCase();
  let defaultLang = 'clike';
  const lower = rawText.toLowerCase();

  if (['py', 'python'].includes(ext) || lower.includes('def ') || lower.includes('import os') || lower.includes('open(')) {
    defaultLang = 'python';
  } else if (['js', 'jsx', 'ts', 'tsx'].includes(ext) || lower.includes('function(') || lower.includes('const ')) {
    defaultLang = 'javascript';
  } else if (['json'].includes(ext) || lower.trim().startsWith('{') || lower.trim().startsWith('[')) {
    defaultLang = 'json';
  } else if (['sh', 'bash'].includes(ext) || lower.includes('curl ') || lower.includes('npm ')) {
    defaultLang = 'bash';
  } else if (['sql'].includes(ext) || lower.includes('select ') && lower.includes('from ')) {
    defaultLang = 'sql';
  } else if (['html', 'xml', 'htm'].includes(ext) || lower.includes('<html') || lower.includes('<!doctype')) {
    defaultLang = 'markup';
  }

  // Parse markdown code blocks ```lang ... ```
  const parts = [];
  const fenceRegex = /```(\w*)\n?([\s\S]*?)```/g;
  let lastIndex = 0;
  let match;

  while ((match = fenceRegex.exec(rawText)) !== null) {
    if (match.index > lastIndex) {
      parts.push({ type: 'text', content: rawText.slice(lastIndex, match.index) });
    }
    const detectedLang = (match[1] || defaultLang).toLowerCase();
    parts.push({ type: 'code', lang: normalizePrismLang(detectedLang), code: match[2].trim() });
    lastIndex = fenceRegex.lastIndex;
  }

  if (lastIndex < rawText.length) {
    parts.push({ type: 'text', content: rawText.slice(lastIndex) });
  }

  // If no fenced blocks found, check for raw code constructs (e.g. Python file operations)
  if (parts.length === 1 && parts[0].type === 'text') {
    const textContent = parts[0].content;
    const codeBlockPattern = /((?:(?:with\s+open|def\s+\w+|import\s+\w+|from\s+\w+|class\s+\w+)[\s\S]+?)(?=\n\n[A-Z]|\n\n--|\n\nUsing|\n\nAlways|$))/g;
    let bMatch;
    let bLast = 0;
    const refined = [];

    while ((bMatch = codeBlockPattern.exec(textContent)) !== null) {
      if (bMatch.index > bLast) {
        refined.push({ type: 'text', content: textContent.slice(bLast, bMatch.index) });
      }
      refined.push({ type: 'code', lang: 'python', code: bMatch[1].trim() });
      bLast = codeBlockPattern.lastIndex;
    }

    if (bLast > 0) {
      if (bLast < textContent.length) {
        refined.push({ type: 'text', content: textContent.slice(bLast) });
      }
      parts.length = 0;
      parts.push(...refined);
    }
  }

  // Build formatted HTML
  let html = '';
  parts.forEach((part, idx) => {
    if (part.type === 'code') {
      const codeId = `snippet_${idx}`;
      const langUpper = (part.lang || 'CODE').toUpperCase();
      const escapedCode = escapeHtml(part.code);
      html += `
        <div class="reader-code-snippet">
          <div class="reader-code-snippet-header">
            <span>${langUpper}</span>
            <button class="reader-code-snippet-copy" onclick="copySnippet('${codeId}', this)">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
              </svg>
              <span>Copy</span>
            </button>
          </div>
          <pre><code id="${codeId}" class="language-${part.lang}">${escapedCode}</code></pre>
        </div>
      `;
    } else {
      const paragraphs = part.content.split(/\n\s*\n/).filter(p => p.trim());
      paragraphs.forEach(p => {
        let formatted = escapeHtml(p.trim());
        formatted = formatted.replace(/`([^`]+)`/g, '<code class="reader-inline-code">$1</code>');
        formatted = formatted.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
        html += `<div class="reader-text-paragraph">${formatted}</div>`;
      });
    }
  });

  readerContent.innerHTML = html;

  // Run Prism syntax highlighting
  if (window.Prism) {
    try {
      Prism.highlightAllUnder(readerContent);
    } catch (e) {
      console.warn('Prism highlight error:', e);
    }
  }
}

function normalizePrismLang(lang) {
  const map = {
    py: 'python',
    js: 'javascript',
    ts: 'typescript',
    sh: 'bash',
    shell: 'bash',
    yml: 'yaml',
    htm: 'markup',
    html: 'markup',
    xml: 'markup',
  };
  return map[lang] || lang || 'clike';
}

window.copySnippet = function(elementId, btn) {
  const el = document.getElementById(elementId);
  if (!el) return;
  navigator.clipboard.writeText(el.textContent);
  const orig = btn.innerHTML;
  btn.innerHTML = `✓ Copied`;
  setTimeout(() => {
    btn.innerHTML = orig;
  }, 2000);
};

closeReaderBtn.addEventListener('click', () => {
  readerPane.classList.remove('open');
  activeDocumentId = null;
});

copyDocTextBtn.addEventListener('click', () => {
  const text = rawDocumentText || readerContent.textContent;
  if (!text) return;
  navigator.clipboard.writeText(text);
  copyDocTextBtn.innerHTML = `✓ Copied`;
  setTimeout(() => {
    copyDocTextBtn.innerHTML = `
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>
      </svg>
      <span>Copy Text</span>
    `;
  }, 2000);
});

// In-Document Search & Live Highlighting
const readerSearchInput = $('#readerSearchInput');
const readerMatchCounter = $('#readerMatchCounter');

if (readerSearchInput) {
  readerSearchInput.addEventListener('input', () => {
    const term = readerSearchInput.value.trim();
    if (!term) {
      if (readerMatchCounter) readerMatchCounter.textContent = '';
      renderDocumentInReader(rawDocumentText, readerTitle.textContent);
      return;
    }

    renderDocumentInReader(rawDocumentText, readerTitle.textContent);

    const walker = document.createTreeWalker(readerContent, NodeFilter.SHOW_TEXT, null, false);
    const nodesToReplace = [];
    let matchCount = 0;
    const regex = new RegExp(`(${term.replace(/[.*+?^${}()|[\\]\\\\]/g, '\\\\$&')})`, 'gi');

    while (walker.nextNode()) {
      const node = walker.currentNode;
      if (node.parentNode && (node.parentNode.tagName === 'SCRIPT' || node.parentNode.tagName === 'STYLE' || node.parentNode.classList.contains('reader-match-counter'))) continue;
      if (regex.test(node.nodeValue)) {
        nodesToReplace.push(node);
      }
    }

    nodesToReplace.forEach(node => {
      const span = document.createElement('span');
      span.innerHTML = node.nodeValue.replace(regex, (m) => {
        matchCount++;
        return `<mark class="reader-search-highlight">${m}</mark>`;
      });
      node.parentNode.replaceChild(span, node);
    });

    if (readerMatchCounter) {
      readerMatchCounter.textContent = matchCount === 1 ? '1 match' : `${matchCount} matches`;
    }
  });

  readerSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      readerSearchInput.value = '';
      if (readerMatchCounter) readerMatchCounter.textContent = '';
      renderDocumentInReader(rawDocumentText, readerTitle.textContent);
    }
  });
}

// ═══════════════════════════════════════════
//  SLIDE-OVER SOURCES DRAWER
// ═══════════════════════════════════════════
function openSourcesDrawer() {
  sourcesDrawer.classList.add('open');
  drawerScrim.classList.add('open');
}

function closeSourcesDrawer() {
  sourcesDrawer.classList.remove('open');
  drawerScrim.classList.remove('open');
}

sourcesToggleBtn.addEventListener('click', openSourcesDrawer);
closeDrawerBtn.addEventListener('click', closeSourcesDrawer);
drawerScrim.addEventListener('click', closeSourcesDrawer);

drawerUploadZone.addEventListener('click', () => fileInput.click());
drawerSearchInput.addEventListener('input', () => renderDrawerList());

// ═══════════════════════════════════════════
//  FULL-PAGE DRAG & DROP
// ═══════════════════════════════════════════
let dragCounter = 0;
window.addEventListener('dragenter', (e) => {
  e.preventDefault();
  dragCounter++;
  dragOverlay.classList.add('active');
});

window.addEventListener('dragleave', (e) => {
  e.preventDefault();
  dragCounter--;
  if (dragCounter <= 0) {
    dragCounter = 0;
    dragOverlay.classList.remove('active');
  }
});

window.addEventListener('dragover', (e) => {
  e.preventDefault();
});

window.addEventListener('drop', (e) => {
  e.preventDefault();
  dragCounter = 0;
  dragOverlay.classList.remove('active');
  if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
    uploadFile(e.dataTransfer.files[0]);
  }
});

// ═══════════════════════════════════════════
//  CHAT INPUT & AUTO-RESIZE
// ═══════════════════════════════════════════
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
  updateTokenCounter();
});

modelSelect.addEventListener('change', () => {
  updateTokenCounter();
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

attachBtn.addEventListener('click', () => {
  fileInput.click();
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) {
    uploadFile(fileInput.files[0]);
    fileInput.value = '';
  }
});

// ═══════════════════════════════════════════
//  WELCOME TIPS
// ═══════════════════════════════════════════
function bindWelcomeTips() {
  document.querySelectorAll('.welcome-tip').forEach(tip => {
    tip.onclick = () => {
      chatInput.value = tip.dataset.tip;
      chatInput.dispatchEvent(new Event('input'));
      sendMessage();
    };
  });
}
bindWelcomeTips();

// ═══════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════
async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question || isGenerating) return;

  // Remove welcome screen
  const welcome = $('#welcomeScreen');
  if (welcome) {
    welcome.remove();
  }

  // Append user message
  appendUserMessage(question);
  chatHistory.push({ role: 'user', content: question });
  chatInput.value = '';
  chatInput.style.height = 'auto';
  updateTokenCounter();

  // Typing state
  isGenerating = true;
  sendBtn.disabled = true;
  const typingEl = showTypingIndicator();

  try {
    const bodyPayload = {
      question,
      model: modelSelect.value
    };
    if (sessionId) {
      bodyPayload.session_id = sessionId;
    }

    const response = await fetch(`${API_BASE}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(bodyPayload)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      let msg = `Inference failed (${response.status})`;
      if (errorData.detail) {
        msg = typeof errorData.detail === 'object' ? JSON.stringify(errorData.detail) : errorData.detail;
      }
      throw new Error(msg);
    }

    const data = await response.json();
    sessionId = data.session_id;
    localStorage.setItem('rag_session_id', sessionId);

    typingEl.remove();
    appendAssistantMessage(data.answer, data.sources, data.suggested_followups);
    chatHistory.push({ role: 'assistant', content: data.answer, sources: data.sources });

    // Refresh history sidebar list to show updated thread title/message count
    loadSessions();

  } catch (err) {
    typingEl.remove();
    appendAssistantMessage(`⚠️ **Retrieval issue:** ${err.message}`);
    showToast(err.message, 'error');
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ═══════════════════════════════════════════
//  RENDER MESSAGES
// ═══════════════════════════════════════════
function appendUserMessage(text) {
  const node = document.createElement('div');
  node.className = 'message-node user';
  node.innerHTML = `
    <div class="user-bubble">${escapeHtml(text)}</div>
  `;
  chatMessages.appendChild(node);
  scrollToBottom();
}

function appendAssistantMessage(text, sources = null, followups = null) {
  const node = document.createElement('div');
  node.className = 'message-node assistant';

  const body = document.createElement('div');
  body.className = 'assistant-body';

  const prose = document.createElement('div');
  prose.className = 'assistant-prose';
  prose.innerHTML = renderMarkdown(text);
  body.appendChild(prose);

  // Sources & Citations
  if (sources && sources.length > 0) {
    const strip = document.createElement('div');
    strip.className = 'citations-strip';
    
    const tag = document.createElement('span');
    tag.className = 'citations-tag';
    tag.textContent = 'Grounded In:';
    strip.appendChild(tag);

    sources.forEach(src => {
      const pill = document.createElement('button');
      pill.className = 'citation-pill';
      pill.innerHTML = `
        <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/></svg>
        <span>${escapeHtml(src.filename)}</span>
      `;
      pill.title = `Inspect ${src.filename} in split reader`;
      pill.onclick = () => openDocumentReader(src.id, src.filename);
      strip.appendChild(pill);
    });

    body.appendChild(strip);
  }

  // Follow-up Suggestions
  if (followups && followups.length > 0) {
    const followupRow = document.createElement('div');
    followupRow.className = 'followup-suggestions-row';
    followupRow.innerHTML = `
      <div class="followup-label">Explore Next</div>
      <div class="followup-chips">
        ${followups.map(f => `
          <button class="followup-chip" onclick="askFollowup('${escapeHtml(f)}')">
            <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M5 12h14M12 5l7 7-7 7"/>
            </svg>
            <span>${escapeHtml(f)}</span>
          </button>
        `).join('')}
      </div>
    `;
    body.appendChild(followupRow);
  }

  // Action buttons
  const actionsRow = document.createElement('div');
  actionsRow.className = 'assistant-actions-row';

  const copyBtn = document.createElement('button');
  copyBtn.className = 'action-text-btn';
  copyBtn.innerHTML = `
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
    <span>Copy</span>
  `;
  copyBtn.onclick = () => {
    navigator.clipboard.writeText(text);
    copyBtn.innerHTML = `✓ Copied`;
    setTimeout(() => {
      copyBtn.innerHTML = `
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        <span>Copy</span>
      `;
    }, 2000);
  };
  actionsRow.appendChild(copyBtn);

  body.appendChild(actionsRow);
  node.appendChild(body);
  chatMessages.appendChild(node);

  if (window.Prism) {
    try {
      Prism.highlightAllUnder(node);
    } catch (e) {
      console.warn('Prism highlight error in chat:', e);
    }
  }

  scrollToBottom();
}

window.askFollowup = function(query) {
  if (isGenerating) return;
  chatInput.value = query;
  chatInput.dispatchEvent(new Event('input'));
  sendMessage();
};

function showTypingIndicator() {
  const node = document.createElement('div');
  node.className = 'message-node assistant';
  node.innerHTML = `
    <div class="typing-line">
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <div class="typing-dot"></div>
      <span>Consulting knowledge base...</span>
    </div>
  `;
  chatMessages.appendChild(node);
  scrollToBottom();
  return node;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    scrollThread.scrollTop = scrollThread.scrollHeight;
  });
}

// ═══════════════════════════════════════════
//  MARKDOWN PARSER
// ═══════════════════════════════════════════
function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Headers
  html = html.replace(/^### (.*$)/gim, '<h3>$1</h3>');
  html = html.replace(/^## (.*$)/gim, '<h2>$1</h2>');
  html = html.replace(/^# (.*$)/gim, '<h1>$1</h1>');

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code class="language-$1">$2</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold & Italic
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

  // Bullet and numbered lists
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');

  // Tables
  html = html.replace(/(?:^\|.+?\|\s*$\n?)+/gm, (tableMatch) => {
    const rows = tableMatch.trim().split('\n').filter(Boolean);
    if (rows.length < 2) return tableMatch;
    let tHtml = '<div class="markdown-table-scroll"><table class="markdown-table">';
    rows.forEach((row, rIdx) => {
      if (row.includes('---')) return;
      const cols = row.split('|').filter((_, cIdx, arr) => cIdx > 0 && cIdx < arr.length - 1);
      const tag = rIdx === 0 ? 'th' : 'td';
      tHtml += '<tr>' + cols.map(c => `<${tag}>${c.trim()}</${tag}>`).join('') + '</tr>';
    });
    tHtml += '</table></div>';
    return tHtml;
  });

  // Paragraphs & Line breaks
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  html = html.replace(/<p>\s*<\/p>/g, '');
  return html;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ═══════════════════════════════════════════
//  DOCUMENT UPLOAD
// ═══════════════════════════════════════════
async function uploadFile(file) {
  const allowed = ['.pdf', '.docx', '.html', '.htm', '.txt', '.md'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();

  if (!allowed.includes(ext)) {
    showToast(`Format not supported. Use: ${allowed.join(', ')}`, 'error');
    return;
  }

  uploadInlineStatus.classList.add('active');
  uploadInlineText.textContent = `Indexing ${file.name}...`;

  try {
    const formData = new FormData();
    formData.append('file', file);

    const res = await fetch(`${API_BASE}/upload-doc`, {
      method: 'POST',
      body: formData
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      throw new Error(errData.detail || `Upload failed (${res.status})`);
    }

    const data = await res.json();
    showToast(`${file.name} indexed successfully`, 'success');
    await loadDocuments();

    if (data.file_id) {
      openDocumentReader(data.file_id, file.name);
    }

  } catch (err) {
    showToast(`Upload failed: ${err.message}`, 'error');
  } finally {
    uploadInlineStatus.classList.remove('active');
  }
}

// ═══════════════════════════════════════════
//  DOCUMENT REPOSITORY SYNC
// ═══════════════════════════════════════════
async function loadDocuments() {
  try {
    const res = await fetch(`${API_BASE}/list-docs`);
    currentDocuments = await res.json();
    renderShelfCards();
    renderDrawerList();

    const count = currentDocuments.length;
    navSourceCount.textContent = count;
    if (shelfSummary) {
      shelfSummary.textContent = `${count} ${count === 1 ? 'document' : 'documents'} loaded`;
    }
    if (drawerSubtitle) {
      drawerSubtitle.textContent = `${count} ${count === 1 ? 'file' : 'files'} indexed in vector store`;
    }
  } catch (err) {
    console.error('Error loading documents:', err);
  }
}

function renderShelfCards() {
  if (!shelfCardsRow) return;

  const cardsHtml = currentDocuments.slice(0, 6).map(doc => {
    const ext = doc.filename.split('.').pop().toLowerCase().toUpperCase();
    const chunks = doc.chunk_count ? `${doc.chunk_count} chunks` : 'Indexed';
    return `
      <div class="shelf-card" onclick="openDocumentReader(${doc.id}, '${escapeHtml(doc.filename)}')">
        <div class="shelf-card-top">
          <span class="shelf-card-badge">${ext}</span>
          <span class="shelf-card-chunks">${chunks}</span>
        </div>
        <div class="shelf-card-title" title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</div>
      </div>
    `;
  }).join('');

  const addCardHtml = `
    <div class="shelf-add-card" onclick="document.getElementById('fileInput').click()">
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
        <line x1="12" y1="5" x2="12" y2="19"/>
        <line x1="5" y1="12" x2="19" y2="12"/>
      </svg>
      <span>Add Source</span>
    </div>
  `;

  shelfCardsRow.innerHTML = cardsHtml + addCardHtml;
}

function renderDrawerList() {
  const query = drawerSearchInput.value.trim().toLowerCase();
  const list = query
    ? currentDocuments.filter(d => d.filename.toLowerCase().includes(query))
    : currentDocuments;

  if (list.length === 0) {
    drawerDocList.innerHTML = `
      <div style="padding: 24px; text-align: center; color: var(--text-faint); font-size: 13px;">
        No sources found.
      </div>
    `;
    return;
  }

  drawerDocList.innerHTML = list.map(doc => {
    const ext = doc.filename.split('.').pop().toLowerCase().toUpperCase();
    const chunks = doc.chunk_count ? `${doc.chunk_count} chunks` : 'Ready';
    return `
      <div class="drawer-doc-card">
        <div class="drawer-doc-main" onclick="openDocumentReader(${doc.id}, '${escapeHtml(doc.filename)}')">
          <div class="drawer-doc-title" title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</div>
          <div class="drawer-doc-meta">${ext} · ${chunks}</div>
        </div>
        <button class="drawer-doc-del-btn" onclick="deleteDoc(${doc.id})" title="Delete source">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
        </button>
      </div>
    `;
  }).join('');
}

async function deleteDoc(fileId) {
  try {
    const res = await fetch(`${API_BASE}/delete-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });
    if (!res.ok) throw new Error('Deletion failed');

    showToast('Source removed from knowledge base', 'success');
    if (activeDocumentId === fileId) {
      readerPane.classList.remove('open');
      activeDocumentId = null;
    }
    loadDocuments();
  } catch (err) {
    showToast(`Failed to delete: ${err.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  EXPORT TRANSCRIPT
// ═══════════════════════════════════════════
newChatBtn.addEventListener('click', () => {
  startNewSession();
});

exportChatBtn.addEventListener('click', () => {
  if (chatHistory.length === 0) {
    showToast('No messages to export', 'info');
    return;
  }

  let md = `# RAG Intelligence — Discussion Transcript\n\n`;
  md += `*Exported on ${new Date().toLocaleString()}*\n\n---\n\n`;

  chatHistory.forEach(item => {
    if (item.role === 'user') {
      md += `### 👤 Question\n\n${item.content}\n\n`;
    } else {
      md += `### 🤖 Synthesis\n\n${item.content}\n\n`;
      if (item.sources && item.sources.length > 0) {
        md += `*Grounded in: ${item.sources.map(s => s.filename).join(', ')}*\n\n`;
      }
    }
    md += `---\n\n`;
  });

  const blob = new Blob([md], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `rag-session-${Date.now()}.md`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('Transcript exported as Markdown', 'success');
});

// ═══════════════════════════════════════════
//  TOAST ALERTS
// ═══════════════════════════════════════════
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${escapeHtml(message)}</span>`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 250);
  }, 3200);
}

// ═══════════════════════════════════════════
//  BOOTSTRAP
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', async () => {
  await loadDocuments();
  await loadSessions();

  // If a previous session exists, switch to it, otherwise show welcome
  if (sessionId && allSessions.some(s => s.id === sessionId)) {
    switchSession(sessionId);
  } else {
    showWelcomeScreen();
  }

  chatInput.focus();
  updateTokenCounter();
});
