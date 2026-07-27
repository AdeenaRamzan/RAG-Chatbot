// ═══════════════════════════════════════════
//  RAG Chatbot — Frontend Script
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
//  SIDEBAR
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
//  CHAT INPUT — Auto-resize
// ═══════════════════════════════════════════
chatInput.addEventListener('input', () => {
  chatInput.style.height = 'auto';
  chatInput.style.height = Math.min(chatInput.scrollHeight, 150) + 'px';
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
document.querySelectorAll('.welcome-tip').forEach(tip => {
  tip.addEventListener('click', () => {
    chatInput.value = tip.dataset.tip;
    chatInput.dispatchEvent(new Event('input'));
    sendMessage();
  });
});

// ═══════════════════════════════════════════
//  SEND MESSAGE
// ═══════════════════════════════════════════
async function sendMessage() {
  const question = chatInput.value.trim();
  if (!question || isGenerating) return;

  // Hide welcome screen
  if (welcomeScreen) {
    welcomeScreen.remove();
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
  avatar.textContent = role === 'user' ? '👤' : '🧠';

  const bubble = document.createElement('div');
  bubble.className = 'message-content';
  bubble.innerHTML = renderMarkdown(content);

  msg.appendChild(avatar);
  msg.appendChild(bubble);
  chatMessages.appendChild(msg);
  scrollToBottom();
}

function renderMarkdown(text) {
  // Simple markdown rendering
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
  // Line breaks into paragraphs
  html = html.replace(/\n\n/g, '</p><p>');
  html = html.replace(/\n/g, '<br>');
  html = `<p>${html}</p>`;
  // Clean up empty paragraphs
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
    <div class="message-avatar">🧠</div>
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

  // Animate progress
  let progress = 0;
  const progressInterval = setInterval(() => {
    progress = Math.min(progress + Math.random() * 15, 90);
    progressBar.style.width = progress + '%';
  }, 300);

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
    progressText.textContent = 'Upload complete!';
    showToast(`${file.name} uploaded successfully`, 'success');

    setTimeout(() => {
      uploadProgress.classList.remove('active');
    }, 1500);

    // Refresh document list
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
          <div class="doc-empty-icon">📭</div>
          <div>No documents uploaded yet</div>
        </div>
      `;
      return;
    }

    docList.innerHTML = docs.map(doc => {
      const ext = doc.filename.split('.').pop().toLowerCase();
      const icon = { pdf: '📕', docx: '📘', html: '🌐' }[ext] || '📄';
      return `
        <div class="doc-item" data-id="${doc.id}">
          <span class="doc-icon">${icon}</span>
          <div class="doc-info">
            <div class="doc-name" title="${escapeHtml(doc.filename)}">${escapeHtml(doc.filename)}</div>
            <div class="doc-id">ID: ${doc.id}</div>
          </div>
          <button class="doc-delete" onclick="deleteDocument(${doc.id})" title="Delete document">🗑</button>
        </div>
      `;
    }).join('');

  } catch (err) {
    docList.innerHTML = `
      <div class="doc-empty">
        <div class="doc-empty-icon">⚠️</div>
        <div>Failed to load documents</div>
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

    showToast('Document deleted', 'success');

    // Animate removal
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
//  NEW CHAT
// ═══════════════════════════════════════════
newChatBtn.addEventListener('click', () => {
  sessionId = null;
  localStorage.removeItem('rag_session_id');

  chatMessages.innerHTML = `
    <div class="welcome-screen" id="welcomeScreen">
      <div class="welcome-icon">🧠</div>
      <h2 class="welcome-title">RAG Chatbot</h2>
      <p class="welcome-subtitle">Upload a document and start asking questions. I'll use AI to find answers from your content.</p>
      <div class="welcome-tips">
        <span class="welcome-tip" data-tip="What is this document about?">💡 What is this about?</span>
        <span class="welcome-tip" data-tip="Summarize the key points">📝 Summarize key points</span>
        <span class="welcome-tip" data-tip="What are the main conclusions?">🎯 Main conclusions?</span>
      </div>
    </div>
  `;

  // Re-bind tip listeners
  document.querySelectorAll('.welcome-tip').forEach(tip => {
    tip.addEventListener('click', () => {
      chatInput.value = tip.dataset.tip;
      chatInput.dispatchEvent(new Event('input'));
      sendMessage();
    });
  });

  showToast('New chat started', 'info');
});

// ═══════════════════════════════════════════
//  TOAST NOTIFICATIONS
// ═══════════════════════════════════════════
function showToast(message, type = 'info') {
  const icons = { success: '✅', error: '❌', info: 'ℹ️' };
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
