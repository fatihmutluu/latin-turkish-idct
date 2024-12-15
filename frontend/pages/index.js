import { useState } from 'react'

export default function Home() {
  const [word, setWord] = useState('')
  const [sourceLang, setSourceLang] = useState('la')
  const [targetLang, setTargetLang] = useState('tr')
  const [translation, setTranslation] = useState(null)
  const [error, setError] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError(null)
    setIsLoading(true)
    
    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/translate`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ word, sourceLang, targetLang })
      })

      if (!response.ok) {
        const errorText = await response.text()
        setError(errorText || 'Translation request failed')
        setIsLoading(false)
        return
      }

      const data = await response.json()
      setTranslation(data)
    } catch (error) {
      setError(error.message || 'An unexpected error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const handleDelete = async (id) => {
    try {
      if (!confirm('Bu kelimeyi silmek istediğinizden emin misiniz?')) {
        return
      }
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/delete/${id}`, {
        method: 'DELETE'
      })

      if (!response.ok) {
        const errorText = await response.text()
        setError(errorText || 'Delete request failed')
        return
      }

      setTranslation(null)
      alert('Kelime başarıyla silindi!')
    } catch (error) {
      setError(error.message || 'An unexpected error occurred')
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 to-blue-100 flex flex-col items-center py-10 px-4">
      <h1 className="text-4xl font-extrabold text-gray-800 mb-6 drop-shadow-md">Latince - Türkçe Sözlük</h1>
      <form 
        onSubmit={handleSubmit} 
        className="bg-white shadow-lg rounded-lg p-6 w-full max-w-lg space-y-4"
      >
        <div className="flex space-x-3">
          <select 
            value={sourceLang} 
            onChange={(e) => setSourceLang(e.target.value)} 
            className="border-gray-300 rounded-lg p-2 flex-1 bg-gray-50 focus:ring-2 focus:ring-blue-400"
          >
            <option value="la">Latin</option>
          </select>
          <select 
            value={targetLang} 
            onChange={(e) => setTargetLang(e.target.value)} 
            className="border-gray-300 rounded-lg p-2 flex-1 bg-gray-50 focus:ring-2 focus:ring-blue-400"
          >
            <option value="tr">Türkçe</option>
          </select>
        </div>
        <input
          type="text"
          value={word}
          onChange={e => setWord(e.target.value)}
          className="border border-gray-300 rounded-lg p-2 w-full bg-gray-50 focus:ring-2 focus:ring-blue-400"
          placeholder="Kelimeyi girin"
          required
        />
        <button 
          type="submit" 
          className="bg-blue-600 text-white font-medium px-4 py-2 w-full rounded-lg shadow-md hover:bg-blue-700 transition disabled:opacity-50"
          disabled={isLoading}
        >
          {isLoading ? 'Çeviriliyor...' : 'Çevir'}
        </button>
      </form>

      {error && (
        <div className="mt-4 p-4 bg-red-100 text-red-700 rounded-lg shadow-md">
          {error}
        </div>
      )}

      {!isLoading && translation && (
        <div className="mt-8 bg-white shadow-lg rounded-lg p-6 w-full max-w-lg relative">
          <button 
            className="absolute top-2 right-2 hover:bg-red-100 text-red-500 rounded-full p-2 focus:outline-none"
            onClick={() => handleDelete(translation.id)}
          >
            🗑️
          </button>
          <h2 className="text-2xl font-bold text-gray-800 mb-2">
            {translation.source_word}
          </h2>
          <p className="text-lg text-gray-700">
            <span className="font-medium text-gray-800">Çeviri: </span>
            {translation.direct_translation}
          </p>
          <div className="mt-3 text-gray-600">
            <span className="font-medium text-gray-800">Açıklama: </span>
            {translation.explanation || "Açıklama bulunmamaktadır"}
          </div>
        </div>
      )}
    </div>
  )
}