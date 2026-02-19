import { app, shell, BrowserWindow, ipcMain, session } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import Store from 'electron-store'
import Anthropic from '@anthropic-ai/sdk'

// Persistent settings store
const store = new Store<{
  apiKey: string
  model: string
}>()

function createWindow(): void {
  const mainWindow = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1100,
    minHeight: 700,
    show: false,
    autoHideMenuBar: true,
    titleBarStyle: 'hiddenInset',
    backgroundColor: '#0f172a',
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false,
      contextIsolation: true,
      nodeIntegration: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // Grant microphone permission automatically in dev
  session.defaultSession.setPermissionRequestHandler((_webContents, permission, callback) => {
    if (permission === 'media') {
      callback(true)
    } else {
      callback(false)
    }
  })

  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

app.whenReady().then(() => {
  electronApp.setAppUserModelId('com.revops.interview-assistant')

  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // ── IPC: Settings ──────────────────────────────────────────────────────────
  ipcMain.handle('settings:get', () => {
    return {
      apiKey: store.get('apiKey', ''),
      model: store.get('model', 'claude-opus-4-5')
    }
  })

  ipcMain.handle('settings:save', (_event, settings: { apiKey: string; model: string }) => {
    store.set('apiKey', settings.apiKey)
    store.set('model', settings.model)
    return true
  })

  // ── IPC: Fetch job posting URL ─────────────────────────────────────────────
  ipcMain.handle('job:fetch-url', async (_event, url: string) => {
    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent':
            'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        }
      })
      if (!response.ok) throw new Error(`HTTP ${response.status}`)
      const html = await response.text()
      // Strip HTML tags for plain text
      const text = html
        .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
        .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 8000)
      return { success: true, text }
    } catch (err) {
      return { success: false, error: String(err) }
    }
  })

  // ── IPC: Analyze question via Claude (streaming) ──────────────────────────
  ipcMain.on(
    'claude:analyze-stream',
    async (
      event,
      payload: {
        requestId: string
        question: string
        jobDescription: string
        knowledgeContext: string
        conversationHistory: string
      }
    ) => {
      const apiKey = store.get('apiKey', '')
      const model = store.get('model', 'claude-opus-4-5')

      if (!apiKey) {
        if (!event.sender.isDestroyed()) {
          event.sender.send('claude:stream-error', {
            requestId: payload.requestId,
            error: 'No API key configured. Please add your Anthropic API key in Settings.'
          })
        }
        return
      }

      try {
        const client = new Anthropic({ apiKey })

        const systemPrompt = `You are an expert RevOps interview coach preparing a candidate for a Senior Director / VP Revenue Operations role at a late-stage startup.

## RevOps Knowledge Base
${payload.knowledgeContext}

## Target Job Description
${payload.jobDescription || 'No specific job description provided. Give general RevOps best-practice answers.'}

## Competency Classification
Classify the question into EXACTLY ONE of these 14 competencies — use the exact label string:
- Revenue Strategy & GTM Planning
- Sales Operations & Pipeline Management
- Marketing Operations & Lead Management
- Customer Success Operations
- Data & Analytics
- Technology Stack Management
- Forecasting & Revenue Intelligence
- Compensation & Quota Design
- Process Design & Optimization
- Cross-Functional Alignment
- Change Management
- AI-First RevOps Architecture
- Prioritization & Portfolio Management
- KPIs & Metrics

## Answer Framing Checklist (apply to every suggestedResponse)
Structure answers using these 5 steps, in order:
1. Lead with strategic framing — why this matters at the business level
2. Describe the system or architecture designed (or would design)
3. Anchor to a specific metric or measurable outcome
4. Name the tools or data sources most relevant to the role
5. Close with the compounding or long-term value created

## Positioning Anchors (weave into every response)
- Systems thinking: connect every answer to the broader revenue architecture
- Revenue architecture: structural design, not just tactical fixes
- Yield over volume: PAM not TAM; quality engagement not spray-and-pray
- Data before AI: the foundation must be right before the acceleration layer
- GTM as product: what is the feedback loop and iteration cycle?
- Prioritization discipline: what are we explicitly NOT doing, and why?

## Response Length
- Opener/intro questions ("Tell me about yourself", "Why this role"): 1–2 paragraphs
- Behavioral questions: 2–3 paragraphs in STAR format
- Design / scenario / architecture questions: 3–4 paragraphs

## Tone
Senior Director or VP level. Strategic. Structured. Outcome-oriented. Measured. No hype.

Format your response as JSON:
{
  "competency": "string - one of the 14 competency labels above",
  "keyPoints": ["string array - 3-5 bullet points to hit"],
  "suggestedResponse": "string - a full suggested answer following the 5-step Answer Framing Checklist",
  "toolsToMention": ["string array - specific tools or platforms to name-drop for this role"],
  "metricsToMention": ["string array - specific KPIs or metrics to cite"],
  "confidence": "high|medium|low - how well this question maps to RevOps"
}`

        const stream = client.messages.stream({
          model,
          max_tokens: 1500,
          system: systemPrompt,
          messages: [
            {
              role: 'user',
              content: `Interview question detected: "${payload.question}"\n\nConversation context:\n${payload.conversationHistory || 'Start of interview'}\n\nProvide coaching advice for this question.`
            }
          ]
        })

        let fullText = ''
        stream.on('text', (delta) => {
          fullText += delta
          if (!event.sender.isDestroyed()) {
            event.sender.send('claude:stream-chunk', { requestId: payload.requestId, delta })
          }
        })

        await stream.done()

        if (!event.sender.isDestroyed()) {
          event.sender.send('claude:stream-done', { requestId: payload.requestId, fullText })
        }
      } catch (err) {
        if (!event.sender.isDestroyed()) {
          event.sender.send('claude:stream-error', { requestId: payload.requestId, error: String(err) })
        }
      }
    }
  )

  // ── IPC: Detect if transcript contains a question ─────────────────────────
  ipcMain.handle(
    'claude:detect-question',
    async (
      _event,
      payload: { transcript: string; previousTranscript: string }
    ) => {
      const apiKey = store.get('apiKey', '')
      const model = store.get('model', 'claude-opus-4-5')

      if (!apiKey) return { success: true, data: { isQuestion: false } }

      try {
        const client = new Anthropic({ apiKey })

        const message = await client.messages.create({
          model,
          max_tokens: 200,
          system: `You detect interview questions in a live Revenue Operations (RevOps) interview transcript.

The candidate is interviewing for a Senior Director or VP RevOps role. The interviewer may ask direct questions OR use implicit prompts. Flag ALL of the following as questions worth analyzing:
- Direct questions ending in "?" ("How do you approach territory design?")
- Implicit prompts: "Tell me about...", "Walk me through...", "Describe a time when...", "Talk to me about your experience with..."
- Topic invitations: "Let's talk about your forecasting approach", "I'd love to understand how you think about attribution"

Do NOT flag as questions:
- The candidate speaking (responding to an earlier question)
- Filler speech, pleasantries, or small talk
- Incomplete fragments under 5 words

Return JSON only: {"isQuestion": boolean, "question": "the interview question being asked, cleaned up, or empty string", "type": "behavioral|technical|situational|general|not-a-question"}`,
          messages: [
            {
              role: 'user',
              content: `Previous: "${payload.previousTranscript}"\nNew text: "${payload.transcript}"\n\nIs this an interview question?`
            }
          ]
        })

        const content = message.content[0]
        if (content.type !== 'text') return { success: true, data: { isQuestion: false } }

        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) return { success: true, data: { isQuestion: false } }

        return { success: true, data: JSON.parse(jsonMatch[0]) }
      } catch {
        return { success: true, data: { isQuestion: false } }
      }
    }
  )

  createWindow()

  app.on('activate', function () {
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})
