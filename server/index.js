const express = require('express')
const cors = require('cors')
const bodyParser = require('body-parser')

const app = express()
app.use(cors())
app.use(bodyParser.json())

// Simple auth endpoint (stub)
app.post('/api/auth/login', (req, res) => {
  const { name } = req.body || {}
  if (!name) return res.status(400).json({ error: 'name required' })
  // return a fake token
  return res.json({ name, token: 'stub-token-' + (name || 'anon') })
})

// Smart meter data stub
app.get('/api/data/smart-meter', (req, res) => {
  // sample payload: consumption and an impact score unit
  return res.json({ consumption_kwh: 320, impact: 300 })
})

// Grocery app data stub
app.get('/api/data/grocery', (req, res) => {
  return res.json({ purchases_last_month: 42, impact: 180 })
})

// Travel history data stub
app.get('/api/data/travel', (req, res) => {
  return res.json({ km_driven: 120, impact: 210 })
})

// Community endpoints: store stories in-memory (development stub)
const community = { stories: [], totalImpact: 0 }

app.get('/api/community', (req, res) => {
  return res.json({ stories: community.stories.slice(0,50), totalImpact: community.totalImpact })
})

app.post('/api/community', (req, res) => {
  const { name, text } = req.body || {}
  if(!text) return res.status(400).json({ error: 'text required' })
  community.stories.unshift({ name: name || 'Anonymous', text, ts: Date.now() })
  // optionally update totalImpact with a dummy value or rely on client
  community.totalImpact += 0
  return res.json({ ok: true })
})

const port = process.env.PORT || 4000
app.listen(port, () => console.log(`Server stub listening on http://localhost:${port}`))
