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

  // ── IPC: Analyze question via Claude ──────────────────────────────────────
  ipcMain.handle(
    'claude:analyze',
    async (
      _event,
      payload: {
        question: string
        jobDescription: string
        knowledgeContext: string
        conversationHistory: string
      }
    ) => {
      const apiKey = store.get('apiKey', '')
      const model = store.get('model', 'claude-opus-4-5')

      if (!apiKey) {
        return { success: false, error: 'No API key configured. Please add your Anthropic API key in Settings.' }
      }

      try {
        const client = new Anthropic({ apiKey })

        const systemPrompt = `You are an expert RevOps interview coach with deep knowledge in Revenue Operations, Sales Operations, Marketing Operations, and Customer Success Operations.

Your role is to help a candidate ace their RevOps interview by providing tailored, expert response recommendations.

## RevOps Knowledge Base
${payload.knowledgeContext}

## Target Job Description
${payload.jobDescription || 'No specific job description provided. Give general RevOps best-practice answers.'}

## Instructions
When given an interview question:
1. Identify the core RevOps competency being tested
2. Structure a STAR-format response (Situation, Task, Action, Result) where applicable
3. Include specific metrics, tools, or frameworks relevant to the job
4. Keep the tone confident, data-driven, and strategic
5. Highlight alignment with the specific role's requirements
6. Provide 2-3 key talking points the candidate should hit

Format your response as JSON:
{
  "competency": "string - the RevOps competency being tested",
  "keyPoints": ["string array - 3-5 bullet points to hit"],
  "suggestedResponse": "string - a full suggested answer (2-4 paragraphs)",
  "toolsToMention": ["string array - relevant tools/tech to name-drop"],
  "metricsToMention": ["string array - relevant KPIs/metrics to reference"],
  "confidence": "high|medium|low - how well this matches RevOps"
}`

        const message = await client.messages.create({
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

        const content = message.content[0]
        if (content.type !== 'text') throw new Error('Unexpected response type')

        // Parse JSON response
        const jsonMatch = content.text.match(/\{[\s\S]*\}/)
        if (!jsonMatch) throw new Error('Could not parse JSON response')

        const parsed = JSON.parse(jsonMatch[0])
        return { success: true, data: parsed }
      } catch (err) {
        return { success: false, error: String(err) }
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
          system: `You detect interview questions in live transcripts.

Return JSON only: {"isQuestion": boolean, "question": "extracted question or empty string", "type": "behavioral|technical|situational|general|not-a-question"}

A question is worth analyzing if it's clearly an interview question directed at the candidate (not filler speech or the candidate talking).`,
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
