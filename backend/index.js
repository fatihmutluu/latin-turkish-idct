const express = require('express')
const cors = require('cors')
const { Pool } = require('pg')
const OpenAI = require('openai');

const client = new OpenAI();

const app = express()

// CORS configuration
app.use(cors({
  origin: [
    'http://localhost:3000', 
    'http://frontend:3000', 
    /^http:\/\/localhost:\d+$/
  ],
  methods: ['GET', 'POST', 'OPTIONS', "DELETE"],
  allowedHeaders: ['Content-Type', 'Authorization']
}))

app.use(express.json())

// PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
})

// Initialize Database
async function initDB() {
  try {
    await pool.query(`
      CREATE TABLE IF NOT EXISTS words (
        id SERIAL PRIMARY KEY,
        source_language VARCHAR(10),
        target_language VARCHAR(10),
        source_word VARCHAR(255),
        direct_translation VARCHAR(255),
        explanation TEXT,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );
    `)
    console.log('Database initialized successfully')
  } catch (error) {
    console.error('Database initialization error:', error)
  }
}

initDB()

// Test endpoint
app.get('/test', (req, res) => {
  res.status(200).json({ message: 'Backend is running' })
})

// Translation endpoint
app.post('/translate', async (req, res) => {
  console.log('Translate endpoint - request received:', req.body)
  
  const { word, sourceLang, targetLang } = req.body
  
  if (!word || !sourceLang || !targetLang) {
    return res.status(400).json({
      error: 'Invalid request',
      details: 'Missing required parameters'
    })
  }

  try {
    // Check existing translation in database
    const existing = await pool.query(
      `SELECT * FROM words 
       WHERE source_word = $1 
       AND source_language = $2 
       AND target_language = $3 
       LIMIT 1`,
      [word, sourceLang, targetLang]
    )

    if (existing.rows.length > 0) {
      console.log('Existing translation found:', existing.rows[0])
      return res.json(existing.rows[0])
    }

    // databse dont have the translation, get it from logeion
    let logeionUrl = "https://logeion.uchicago.edu/" + word;
    let prompt = logeionUrl + "\n\n" +
    "Bu sayfadaki Latince kelimeyi bana Türkçeye çevirmen lazım. " +
    "Eğer kelime yanlışsa doğru kelimeyi tahmin etmeye çalış yakın olarak ya da yazım yanlışını düzelt. " +
    "Fakat seni public açacağımız için rastgele ya da farklı dilde kelime yazanlar olacaktır. onlar için direkt" +
    "{" + "\n" +
    "  \"latinWord\":\"" + word + "\"," + "\n" +
    "  \"turkishWord\":\"" + "Yanlış Kelime" + "\"," + "\n" +
    "  \"explanation\":\"" + "Kelime Bulunamadı" + "\"" + "\n" +
    "} dönebilirsin" + "\n\n" +
    "Direkt kelime çevirisi (kelimenin Latince - Türkçe direkt çevirisi) ve altına da açıklama yazısı (sitede açıklama kısmında ne var. örnek cümle kullanım alanı vs vs). " +
    "Seni bir bota bağladım dolayısıyla cevabımda sadece JSON formatında istediğim bilgileri ver, başka bir yazı yazma ve ```json şeklinde işaratleme text olarak json ver. İşte senden istediğim dönüş formatı: " + "\n\n" +
    "{" + "\n" +
    "  \"latinWord\":\"" + word + "\"," + "\n" +
    "  \"turkishWord\":\"" + "bla" + "\"," + "\n" +
    "  \"explanation\":\"" + "blbalblalblalblabla" + "\"" + "\n" +
    "}" + "\n\n" +
    "Şimdi bu kelimeyi çevir ve bana dönüş yap. " + "\n\n";

    const response = await client.chat.completions.create({
      model: "gpt-4o-mini",
      messages: [{ role: "user", content: prompt }],
    });

    let completion = response.choices[0].message.content.trim();
    console.log('Completion:', completion);

    // Remove ```json if present
    if (completion.startsWith('```json')) {
      completion = completion.slice(7, -3).trim();
    }

    const { latinWord, turkishWord, explanation } = JSON.parse(completion);

    // Insert new translation
    const inserted = await pool.query(
      `INSERT INTO words 
       (source_language, target_language, source_word, direct_translation, explanation) 
       VALUES ($1, $2, $3, $4, $5) 
       RETURNING *`,
      [sourceLang, targetLang, latinWord, turkishWord, explanation]
    )

    console.log('New translation inserted:', inserted.rows[0])
    res.json(inserted.rows[0])
  } catch (error) {
    console.error('Translation endpoint error:', error)
    res.status(500).json({
      error: 'Internal server error',
      details: error.message
    })
  }
})

app.delete('/delete/:id', async (req, res) => {
  console.log('Delete endpoint - request received:', req.params)
  const { id } = req.params

  try {
    const result = await pool.query('DELETE FROM words WHERE id = $1 RETURNING *', [id])
    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Kelime bulunamadı' })
    }

    console.log('Deleted translation:', result.rows[0])
    res.status(200).json({ message: 'Kelime başarıyla silindi', deleted: result.rows[0] })
  } catch (error) {
    console.error('Delete endpoint error:', error)
    res.status(500).json({ error: 'Internal server error', details: error.message })
  }
})

// Root endpoint
app.get('/', (req, res) => {
  res.send('Dictionary Backend is Running')
})

const port = process.env.PORT || 8080
app.listen(port, '0.0.0.0', () => {
  console.log(`Backend listening on port ${port}`)
})