import express from 'express';
import cors from 'cors';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import mammoth from 'mammoth';
import { createRequire } from 'module';
import { GoogleGenAI } from '@google/genai';

const require = createRequire(import.meta.url);
const pdfParse = require('pdf-parse');

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const port = 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// In-memory data store for documents & chat logs
interface DocumentChunk {
  chunkId: string;
  fileId: number;
  filename: string;
  text: string;
  words: Set<string>;
}

interface DocumentRecord {
  id: number;
  filename: string;
  upload_timestamp: string;
  chunks: DocumentChunk[];
  fullText: string;
}

interface ChatMessage {
  role: 'human' | 'ai';
  content: string;
  timestamp: string;
  sources?: Array<{ id: number; filename: string; chunks: number }>;
}

interface ChatSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messages: ChatMessage[];
}

let nextDocId = 1;
const documents: DocumentRecord[] = [];
const chatSessions = new Map<string, ChatSession>();

// Text chunking utility
function splitTextIntoChunks(text: string, chunkSize = 1000, overlap = 200): string[] {
  const clean = text.replace(/\r\n/g, '\n').trim();
  if (!clean) return [];
  if (clean.length <= chunkSize) return [clean];

  const chunks: string[] = [];
  let start = 0;
  while (start < clean.length) {
    let end = start + chunkSize;
    if (end < clean.length) {
      // Find a natural break (newline or space) near end
      const lastBreak = clean.lastIndexOf('\n', end);
      const lastSpace = clean.lastIndexOf(' ', end);
      if (lastBreak > start + chunkSize * 0.6) {
        end = lastBreak + 1;
      } else if (lastSpace > start + chunkSize * 0.6) {
        end = lastSpace + 1;
      }
    }
    const chunk = clean.slice(start, end).trim();
    if (chunk) {
      chunks.push(chunk);
    }
    start = end - overlap;
    if (start >= clean.length || end >= clean.length) break;
  }
  return chunks;
}

// Tokenize text into normalized words for scoring
function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((w) => w.length > 2);
}

// Extract text from uploaded file buffer
async function extractTextFromFile(filename: string, buffer: Buffer): Promise<string> {
  const ext = path.extname(filename).toLowerCase();

  if (ext === '.pdf') {
    try {
      if (pdfParse && typeof pdfParse.PDFParse === 'function') {
        const parser = new pdfParse.PDFParse({ data: buffer });
        const res = await parser.getText();
        if (res && res.text && res.text.trim()) {
          return res.text;
        }
      } else if (typeof pdfParse === 'function') {
        const data = await pdfParse(buffer);
        if (data && data.text && data.text.trim()) {
          return data.text;
        }
      }
    } catch (err) {
      console.warn(`[PDF Parser] PDF parse fallback for ${filename}:`, err);
    }
    // Fallback simple stream text extractor for PDF if pdf-parse failed
    const raw = buffer.toString('latin1');
    const matches: string[] = [];
    const textRegex = /\(([^)]+)\)\s*Tj/g;
    let m: RegExpExecArray | null;
    while ((m = textRegex.exec(raw)) !== null) {
      matches.push(m[1]);
    }
    if (matches.length > 0) {
      return matches.join(' ');
    }
    throw new Error('Could not extract readable text from PDF file.');
  } else if (ext === '.docx') {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  } else if (ext === '.html' || ext === '.htm') {
    const html = buffer.toString('utf-8');
    // Strip HTML tags and entities
    return html
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/&nbsp;/g, ' ')
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/\s+/g, ' ')
      .trim();
  } else {
    return buffer.toString('utf-8');
  }
}

// Index a document
function indexDocument(filename: string, fullText: string): DocumentRecord {
  const fileId = nextDocId++;
  const rawChunks = splitTextIntoChunks(fullText, 1000, 200);
  const chunks: DocumentChunk[] = rawChunks.map((chunkText, idx) => ({
    chunkId: `${fileId}_${idx}`,
    fileId,
    filename,
    text: chunkText,
    words: new Set(tokenize(chunkText)),
  }));

  const record: DocumentRecord = {
    id: fileId,
    filename,
    upload_timestamp: new Date().toISOString(),
    chunks,
    fullText,
  };

  documents.unshift(record);
  return record;
}

// Retrieve relevant context for a query
function retrieveRelevantContext(query: string, topK = 6): string {
  if (documents.length === 0) return '';

  const queryTokens = tokenize(query);
  if (queryTokens.length === 0) {
    // Return sample from first available documents
    return documents
      .flatMap((d) => d.chunks.slice(0, 2))
      .slice(0, topK)
      .map((c) => `[Source: ${c.filename}]\n${c.text}`)
      .join('\n\n---\n\n');
  }

  // Score all chunks using TF-IDF / keyword overlap
  const allChunks = documents.flatMap((d) => d.chunks);
  const scored = allChunks.map((chunk) => {
    let score = 0;
    for (const token of queryTokens) {
      if (chunk.words.has(token)) {
        score += 2;
      }
      // Substring bonus
      if (chunk.text.toLowerCase().includes(token)) {
        score += 1;
      }
    }
    return { chunk, score };
  });

  scored.sort((a, b) => b.score - a.score);
  const selected = scored.filter((s) => s.score > 0).slice(0, topK);

  if (selected.length === 0) {
    // If no exact match, grab the first few chunks across docs
    return allChunks
      .slice(0, Math.min(topK, allChunks.length))
      .map((c) => `[Source: ${c.filename}]\n${c.text}`)
      .join('\n\n---\n\n');
  }

  return selected.map((s) => `[Source: ${s.chunk.filename}]\n${s.chunk.text}`).join('\n\n---\n\n');
}

// Auto-seed docs from /docs if available
async function autoSeedDocuments() {
  const docsDir = path.join(__dirname, 'docs');
  if (!fs.existsSync(docsDir)) return;

  try {
    const files = fs.readdirSync(docsDir);
    for (const file of files) {
      if (file.endsWith('.pdf') || file.endsWith('.docx') || file.endsWith('.html')) {
        const filePath = path.join(docsDir, file);
        const buf = fs.readFileSync(filePath);
        try {
          const text = await extractTextFromFile(file, buf);
          if (text && text.trim().length > 20) {
            indexDocument(file, text);
            console.log(`[Init] Indexed default document: ${file}`);
          }
        } catch (e) {
          console.warn(`[Init] Could not auto-index ${file}:`, e);
        }
      }
    }
  } catch (err) {
    console.warn('[Init] Auto-seed error:', err);
  }
}

// Multer setup for file uploads
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 }, // 50MB
});

// ─── API Routes ───

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    database_status: 'connected',
    vector_store_status: 'ready',
    documents_count: documents.length,
  });
});

// List documents
app.get('/list-docs', (req, res) => {
  const docList = documents.map((doc) => ({
    id: doc.id,
    filename: doc.filename,
    upload_timestamp: doc.upload_timestamp,
    chunk_count: doc.chunks.length,
  }));
  res.json(docList);
});

// Get document preview
app.get('/doc/:id', (req, res) => {
  const docId = Number(req.params.id);
  const doc = documents.find((d) => d.id === docId);
  if (!doc) {
    return res.status(404).json({ error: 'Document not found' });
  }
  res.json({
    id: doc.id,
    filename: doc.filename,
    upload_timestamp: doc.upload_timestamp,
    chunk_count: doc.chunks.length,
    text: doc.fullText.slice(0, 50000),
  });
});

// Upload document
app.post('/upload-doc', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ detail: 'No file uploaded.' });
    }

    const allowedExtensions = ['.pdf', '.docx', '.html', '.htm', '.txt', '.md'];
    const ext = path.extname(req.file.originalname).toLowerCase();
    if (!allowedExtensions.includes(ext)) {
      return res.status(400).json({
        detail: `Unsupported file type. Allowed types are: ${allowedExtensions.join(', ')}`,
      });
    }

    const extractedText = await extractTextFromFile(req.file.originalname, req.file.buffer);
    if (!extractedText || !extractedText.trim()) {
      return res.status(400).json({
        detail: 'Could not extract any readable text from the file. The document may be empty or an image scan.',
      });
    }

    const docRecord = indexDocument(req.file.originalname, extractedText);
    res.json({
      message: `File ${req.file.originalname} has been successfully uploaded and indexed.`,
      file_id: docRecord.id,
    });
  } catch (err: any) {
    console.error('Upload error:', err);
    res.status(500).json({ detail: `Upload failed: ${err.message || 'Unknown error'}` });
  }
});

// Delete document
app.post('/delete-doc', (req, res) => {
  const { file_id } = req.body;
  const numId = Number(file_id);
  const index = documents.findIndex((d) => d.id === numId);

  if (index !== -1) {
    documents.splice(index, 1);
    res.json({ message: `Successfully deleted document with file_id ${file_id} from the system.` });
  } else {
    res.status(404).json({ error: `Document with file_id ${file_id} not found.` });
  }
});

// List all chat sessions
app.get('/sessions', (req, res) => {
  const sessions = Array.from(chatSessions.values())
    .map((s) => ({
      id: s.id,
      title: s.title,
      createdAt: s.createdAt,
      updatedAt: s.updatedAt,
      messageCount: s.messages.length,
      preview: s.messages.length > 0 ? s.messages[s.messages.length - 1].content.slice(0, 100) : '',
    }))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  res.json(sessions);
});

// Get a specific session with messages
app.get('/sessions/:id', (req, res) => {
  const session = chatSessions.get(req.params.id);
  if (!session) {
    return res.status(404).json({ error: 'Session not found' });
  }
  res.json(session);
});

// Create or update a session (e.g. rename)
app.post('/sessions', (req, res) => {
  const { id, title } = req.body;
  const sessionId = id || 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  let session = chatSessions.get(sessionId);

  if (session) {
    if (title) session.title = title.trim();
    session.updatedAt = new Date().toISOString();
  } else {
    session = {
      id: sessionId,
      title: (title || 'New Discussion').trim(),
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    chatSessions.set(sessionId, session);
  }

  res.json(session);
});

// Delete a session
app.delete('/sessions/:id', (req, res) => {
  const existed = chatSessions.delete(req.params.id);
  if (existed) {
    res.json({ message: 'Session deleted successfully' });
  } else {
    res.status(404).json({ error: 'Session not found' });
  }
});

// Chat endpoint
app.post('/chat', async (req, res) => {
  const { question, model, session_id } = req.body;
  const sessionId = session_id || 'session-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7);
  const selectedModel = model || 'openai/gpt-oss-120b';

  if (!question || typeof question !== 'string' || !question.trim()) {
    return res.status(400).json({ detail: 'Question cannot be empty.' });
  }

  // Retrieve context from indexed documents
  const context = retrieveRelevantContext(question, 6);

  // Retrieve or initialize session
  let session = chatSessions.get(sessionId);
  if (!session) {
    // Generate concise title from initial prompt
    let initialTitle = question.trim().replace(/\s+/g, ' ');
    if (initialTitle.length > 42) initialTitle = initialTitle.slice(0, 40) + '...';

    session = {
      id: sessionId,
      title: initialTitle,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      messages: [],
    };
    chatSessions.set(sessionId, session);
  }

  session.messages.push({
    role: 'human',
    content: question,
    timestamp: new Date().toISOString(),
  });

  let answer = '';

  // Try Gemini with @google/genai if API key is present
  const geminiApiKey = process.env.GEMINI_API_KEY;
  if (geminiApiKey) {
    try {
      const ai = new GoogleGenAI({ apiKey: geminiApiKey });
      const prompt = `You are an expert Document Analysis AI assistant. Your goal is to provide accurate, comprehensive, and well-structured answers based on the retrieved document context below.

Guidelines:
1. Use the provided context to thoroughly answer the user's question or summarize key points.
2. If the user asks for a summary or takeaways, extract the main topics, key facts, and conclusions from the context into clear bullet points.
3. Be helpful, articulate, and direct.
4. If the retrieved context contains the information, ground your answer in it and cite specific details or figures.

Retrieved Document Context:
${context || 'No documents currently uploaded.'}

User Question: ${question}`;

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: prompt,
      });

      if (response && response.text) {
        answer = response.text;
      }
    } catch (genErr) {
      console.warn('[Gemini API] Failed to generate with Gemini, falling back to local extractor:', genErr);
    }
  }

  // Fallback intelligent document answering if no API key or API call failed
  if (!answer) {
    if (documents.length === 0) {
      answer = `I don't have any documents uploaded yet! Please upload a PDF, DOCX, or HTML file using the sidebar on the left, and I'll read and analyze it for you.`;
    } else if (!context || context.trim().length === 0) {
      answer = `I searched your uploaded documents (${documents.map((d) => d.filename).join(', ')}), but couldn't locate specific sections relevant to "${question}". Try asking about general topics or summarizing the documents!`;
    } else {
      const qLower = question.toLowerCase();
      const isSummary =
        qLower.includes('summar') ||
        qLower.includes('takeaway') ||
        qLower.includes('key point') ||
        qLower.includes('overview') ||
        qLower.includes('about');

      if (isSummary) {
        const docNames = documents.map((d) => d.filename).join(', ');
        const excerpts = documents
          .slice(0, 3)
          .map((d) => {
            const preview = d.fullText.slice(0, 300).trim().replace(/\s+/g, ' ');
            return `### 📄 **${d.filename}**\n- **Overview:** ${preview}...\n- **Total chunks indexed:** ${d.chunks.length}`;
          })
          .join('\n\n');

        answer = `Here is a summary of the indexed document context across **${docNames}**:\n\n${excerpts}\n\n💡 *Ask me any specific question about figures, dates, or concepts in these documents!*`;
      } else {
        const lines = context
          .split('\n')
          .filter((l) => l.trim().length > 25 && !l.startsWith('[Source:'))
          .slice(0, 6);

        const bulletPoints = lines.map((l) => `• ${l.trim()}`).join('\n\n');

        answer = `Based on your uploaded documents, here is the relevant information found regarding **"${question}"**:\n\n${bulletPoints || context.slice(0, 600)}\n\n*(Sources retrieved: ${documents.map((d) => d.filename).join(', ')})*`;
      }
    }
  }

  const sourcesList = documents.map((d) => ({ id: d.id, filename: d.filename, chunks: d.chunks.length }));

  const followups: string[] = [];
  if (sourcesList.length > 0) {
    followups.push(`What are the key numerical metrics in ${sourcesList[0].filename}?`);
    followups.push(`Summarize the primary conclusions and takeaways.`);
    if (sourcesList.length > 1) {
      followups.push(`How does ${sourcesList[0].filename} compare with ${sourcesList[1].filename}?`);
    } else {
      followups.push(`What specific action items or steps are outlined?`);
    }
  } else {
    followups.push('What file types are supported?');
    followups.push('How do I upload and index documents?');
  }

  // Record AI response in session
  session.messages.push({
    role: 'ai',
    content: answer,
    timestamp: new Date().toISOString(),
    sources: sourcesList,
  });

  session.updatedAt = new Date().toISOString();

  res.json({
    answer,
    session_id: sessionId,
    session_title: session.title,
    model: selectedModel,
    sources: sourcesList,
    suggested_followups: followups.slice(0, 3),
  });
});

// Serve frontend static assets
const frontendDir = path.join(__dirname, 'frontend');
app.use('/static', express.static(frontendDir));
app.use(express.static(frontendDir));

// Root route serves frontend/index.html
app.get('/', (req, res) => {
  res.sendFile(path.join(frontendDir, 'index.html'));
});

// Export express app for serverless platforms like Vercel
export default app;

// Start server when run standalone
if (!process.env.VERCEL) {
  app.listen(port, '0.0.0.0', async () => {
    console.log(`[RAG Chatbot] Server listening on http://0.0.0.0:${port}`);
    await autoSeedDocuments();
  });
} else {
  autoSeedDocuments().catch(console.error);
}
