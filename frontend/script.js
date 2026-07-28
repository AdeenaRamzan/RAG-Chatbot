// ═══════════════════════════════════════════
//  RAG Chatbot — Frontend Script (v2.0)
// ═══════════════════════════════════════════

const API_BASE = window.location.origin;

// ─── State ───────────────────────────────
let sessionId = localStorage.getItem('rag_session_id') || null;
let isGenerating = false;

// ─── DOM Elements ────────────────────────
const $ = (sel) => document.querySelector(sel);
const sidebar = $('#sidebar');
const sidebarToggle = $('#sidebarToggle');
const chatMessages = $('#chatMessages');
const chatInput = $('#chatInput');
const sendBtn = $('#sendBtn');
const modelSelect = $('#modelSelect');
const headerModel = $('#headerModel');
const fileInput = $('#fileInput');
const uploadZone = $('#uploadZone');
const uploadProgress = $('#uploadProgress');
const progressBar = $('#progressBar');
const progressText = $('#progressText');
const docList = $('#docList');
const newChatBtn = $('#newChatBtn');
const welcomeScreen = $('#welcomeScreen');
const toastContainer = $('#toastContainer');

// ═══════════════════════════════════════════
//  SIDEBAR TOGGLE
// ═══════════════════════════════════════════
sidebarToggle.addEventListener('click', () => {
  sidebar.classList.toggle('collapsed');
});

// ═══════════════════════════════════════════
//  MODEL SELECTOR
// ═══════════════════════════════════════════
const modelDisplayNames = {
  'llama-3.3-70b-versatile': 'Llama 3.3 70B',
  'llama-3.1-8b-instant': 'Llama 3.1 8B',
  'mixtral-8x7b-32768': 'Mixtral 8x7B'
};

modelSelect.addEventListener('change', () => {
  headerModel.textContent = modelDisplayNames[modelSelect.value] || modelSelect.value;
});

// ═══════════════════════════════════════════
//  CHAT INPUT — Auto-resize & Shortcuts
// ═══════════════════════════════════════════
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 160) + 'px';
});

chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

sendBtn.addEventListener('click', sendMessage);

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

  // Hide welcome screen
  const welcome = $('#welcomeScreen');
  if (welcome) {
    welcome.remove();
  }

  // Add user message
  appendMessage('user', question);
  chatInput.value = '';
  chatInput.style.height = 'auto';

  // Show typing indicator
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
      let msg = `Server error (${response.status})`;
      if (errorData.detail) {
        msg = typeof errorData.detail === 'object' ? JSON.stringify(errorData.detail) : errorData.detail;
      }
      throw new Error(msg);
    }

    const data = await response.json();
    sessionId = data.session_id;
    localStorage.setItem('rag_session_id', sessionId);

    // Remove typing indicator and show response
    typingEl.remove();
    appendMessage('assistant', data.answer);

  } catch (err) {
    typingEl.remove();
    appendMessage('assistant', `⚠️ Error: ${err.message}`);
    showToast(err.message, 'error');
  } finally {
    isGenerating = false;
    sendBtn.disabled = false;
    chatInput.focus();
  }
}

// ═══════════════════════════════════════════
//  MESSAGE RENDERING
// ═══════════════════════════════════════════
function appendMessage(role, content) {
  const msg = document.createElement('div');
  msg.className = `message ${role}`;

  const avatar = document.createElement('div');
  avatar.className = 'message-avatar';
  if (role === 'user') {
    avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`;
  } else {
    avatar.innerHTML = `<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7L12 12L22 7L12 2Z"/><path d="M2 17L12 22L22 17"/><path d="M2 12L12 17L22 12"/></svg>`;
  }

  const wrapper = document.createElement('div');
  wrapper.className = 'message-content-wrapper';

  const bubble = document.createElement('div');
  bubble.className = 'message-content';
  bubble.innerHTML = renderMarkdown(content);

  wrapper.appendChild(bubble);

  // Action bar for assistant messages
  if (role === 'assistant') {
    const actionBar = document.createElement('div');
    actionBar.className = 'message-action-bar';
    const copyBtn = document.createElement('button');
    copyBtn.className = 'copy-btn';
    copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
    copyBtn.onclick = () => {
      navigator.clipboard.writeText(content);
      copyBtn.innerHTML = `✓ Copied!`;
      setTimeout(() => {
        copyBtn.innerHTML = `<svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg> Copy`;
      }, 2000);
    };
    actionBar.appendChild(copyBtn);
    wrapper.appendChild(actionBar);
  }

  msg.appendChild(avatar);
  msg.appendChild(wrapper);
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function renderMarkdown(text) {
  let html = escapeHtml(text);

  // Code blocks
  html = html.replace(/```(\w*)\n([\s\S]*?)```/g, '<pre><code>$2</code></pre>');
  // Inline code
  html = html.replace(/`([^`]+)`/g, '<code>$1</code>');
  // Bold
  html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
  // Italic
  html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
  // Unordered lists
  html = html.replace(/^[-•]\s+(.+)$/gm, '<li>$1</li>');
  html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');
  // Ordered lists
  html = html.replace(/^\d+\.\s+(.+)$/gm, '<li>$1</li>');
  // Paragraphs
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

function showTypingIndicator() {
  const typing = document.createElement('div');
  typing.className = 'typing-indicator';
  typing.innerHTML = `
    <div class="message-avatar">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2L2 7L12 12L22 7L12 2Z"/><path d="M2 17L12 22L22 17"/><path d="M2 12L12 17L22 12"/></svg>
    </div>
    <div class="typing-dots">
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    </div>
  `;
  chatMessages.appendChild(typing);
  scrollToBottom();
  return typing;
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatMessages.scrollTop = chatMessages.scrollHeight;
  });
}

// ═══════════════════════════════════════════
//  FILE UPLOAD
// ═══════════════════════════════════════════
uploadZone.addEventListener('click', () => fileInput.click());

uploadZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  uploadZone.classList.add('dragover');
});

uploadZone.addEventListener('dragleave', () => {
  uploadZone.classList.remove('dragover');
});

uploadZone.addEventListener('drop', (e) => {
  e.preventDefault();
  uploadZone.classList.remove('dragover');
  const file = e.dataTransfer.files[0];
  if (file) uploadFile(file);
});

fileInput.addEventListener('change', () => {
  if (fileInput.files[0]) {
    uploadFile(fileInput.files[0]);
    fileInput.value = '';
  }
});

async function uploadFile(file) {
  const allowedTypes = ['.pdf', '.docx', '.html'];
  const ext = '.' + file.name.split('.').pop().toLowerCase();

  if (!allowedTypes.includes(ext)) {
    showToast(`Unsupported file type. Use: ${allowedTypes.join(', ')}`, 'error');
    return;
  }

  // Show progress
  uploadProgress.classList.add('active');
  progressBar.style.width = '0%';
  progressText.textContent = `Uploading ${file.name}...`;

  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 18, 92);
    progressBar.style.width = progress + '%';
  }, 250);

  try {
    const formData = new FormData();
    formData.append('file', file);

    const response = await fetch(`${API_BASE}/upload-doc`, {
      method: 'POST',
      body: formData
    });

    clearInterval(progressInterval);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(errorData.detail || `Upload failed (${response.status})`);
    }

    progressBar.style.width = '100%';
    progressText.textContent = 'Uploaded & Vectorized!';
    showToast(`${file.name} indexed successfully`, 'success');

    setTimeout(() => {
      uploadProgress.classList.remove('active');
    }, 1500);

    loadDocuments();

  } catch (err) {
    clearInterval(progressInterval);
    uploadProgress.classList.remove('active');
    showToast(`Upload failed: ${err.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  DOCUMENT LIST
// ═══════════════════════════════════════════
async function loadDocuments() {
  try {
    const response = await fetch(`${API_BASE}/list-docs`);
    const docs = await response.json();

    if (docs.length === 0) {
      docList.innerHTML = `
        <div class="doc-empty">
          <div class="doc-empty-icon">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5"><rect x="3" y="3" width="18" height="18" rx="2" ry="2"/><line x1="9" y1="9" x2="15" y2="9"/><line x1="9" y1="13" x2="15" y2="13"/><line x1="9" y1="17" x2="11" y2="17"/></svg>
          </div>
          <div>No documents indexed yet</div>
        </div>
      `;
      return;
    }

    docList.innerHTML = docs.map(doc => {
      const ext = doc.filename.split('.').pop().toLowerCase();
      const badgeClass = ['pdf', 'docx', 'html'].includes(ext) ? ext : 'file';
      
      return `
        <div class="doc-item" data-id="${doc.id}">
          <div class="doc-badge ${badgeClass}">${ext.toUpperCase()}</div>
          <div class="doc-info">
            <div class="doc-name" title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</div>
            <div class="doc-meta">Doc ID: ${doc.id}</div>
          </div>
          <button class="doc-delete" onclick="deleteDocument(${doc.id})" title="Delete document">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"/><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/></svg>
          </button>
        </div>
      `;
    }).join('');

  } catch (err) {
    docList.innerHTML = `
      <div class="doc-empty">
        <div class="doc-empty-icon">⚠️</div>
        <div>Failed to load document index</div>
      </div>
    `;
  }
}

async function deleteDocument(fileId) {
  try {
    const response = await fetch(`${API_BASE}/delete-doc`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ file_id: fileId })
    });

    if (!response.ok) throw new Error('Delete failed');

    const data = await response.json();
    if (data.error) throw new Error(data.error);

    showToast('Document deleted from index', 'success');

    const item = document.querySelector(`.doc-item[data-id="${fileId}"]`);
    if (item) {
      item.style.transition = 'all 0.3s ease';
      item.style.opacity = '0';
      item.style.transform = 'translateX(-20px)';
      setTimeout(() => loadDocuments(), 300);
    } else {
      loadDocuments();
    }
  } catch (err) {
    showToast(`Delete failed: ${err.message}`, 'error');
  }
}

// ═══════════════════════════════════════════
//  NEW CHAT WORKSPACE
// ═══════════════════════════════════════════
newChatBtn.addEventListener('click', () => {
  sessionId = null;
  localStorage.removeItem('rag_session_id');

  chatMessages.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-badge">AI Knowledge Engine</div>
      <h2 class="welcome-title">Ask Anything About Your Documents</h2>
      <p class="welcome-subtitle">Upload PDFs, Word docs, or HTML files to perform instant semantic searching, summary generation, and precise Q&A powered by RAG vector retrieval.</p>
      
      <div class="welcome-features">
        <div class="feature-card">
          <div class="feature-icon">🔍</div>
          <div class="feature-title">Semantic RAG Search</div>
          <div class="feature-desc">Retrieves precise context from your vector store using FastEmbed.</div>
        </div>
        <div class="feature-card">
          <div class="feature-icon">⚡</div>
          <div class="feature-title">Groq LLM Acceleration</div>
          <div class="feature-desc">Ultra-low latency streaming response with 70B parameter models.</div>
        </div>
        <div class="feature-card">
          <div class="feature-icon">🛡️</div>
          <div class="feature-title">Private & Secure</div>
          <div class="feature-desc">Your documents stay isolated in local/ephemeral vector memory.</div>
        </div>
      </div>

      <div class="welcome-tips-container">
        <div class="welcome-tips-label">Try asking:</div>
        <div class="welcome-tips">
          <span class="welcome-tip" data-tip="Summarize the primary topic and key takeaways of this document.">✨ Summarize the main takeaways</span>
          <span class="welcome-tip" data-tip="What are the critical dates, metrics, or statistics mentioned?">📊 Extract key figures & metrics</span>
          <span class="welcome-tip" data-tip="List all action items or conclusions specified in the text.">🎯 Find conclusions & action items</span>
        </div>
      </div>
    </div>
  `;

  bindWelcomeTips();
  showToast('New workspace chat initialized', 'info');
});

// ═══════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════
function showToast(message, type = 'info') {
  const icons = {
    success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"/></svg>`,
    error: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/></svg>`,
    info: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>`
  };

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `<span>${icons[type] || ''}</span> ${escapeHtml(message)}`;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.classList.add('fade-out');
    setTimeout(() => toast.remove(), 300);
  }, 4000);
}

// ═══════════════════════════════════════════
//  INITIALIZATION
// ═══════════════════════════════════════════
document.addEventListener('DOMContentLoaded', () => {
  loadDocuments();
  chatInput.focus();
});
