import { useState, useEffect, useCallback } from 'react'
import NoteList from './components/NoteList'
import Editor from './components/Editor'

// ── Debounce lives OUTSIDE the component so the timer
//    persists across renders and isn't reset on every keystroke
function debounce(fn, delay) {
  let timer
  return (...args) => {
    clearTimeout(timer)
    timer = setTimeout(() => fn(...args), delay)
  }
}

// ── Created ONCE at module level, not inside the component
const debouncedSave = debounce(async ({ id, title, content, onDone }) => {
  await window.electronAPI.updateNote({ id, title, content })
  const updated = await window.electronAPI.getNotes()
  onDone(updated)
}, 800)

export default function App() {
  const [notes, setNotes] = useState([])
  const [activeId, setActiveId] = useState(null)
  const [saving, setSaving] = useState(false)

  const activeNote = notes.find((n) => n.id === activeId) || null

  // ── Load notes on mount
  useEffect(() => {
    window.electronAPI.getNotes().then(setNotes)
  }, [])

  // ── Handlers
  const handleNewNote = useCallback(async () => {
    const result = await window.electronAPI.createNote()
    const fresh = await window.electronAPI.getNotes()
    setNotes(fresh)
    setActiveId(result.lastInsertRowid)
  }, [])

  const handleDelete = useCallback(
    async (id) => {
      await window.electronAPI.deleteNote(id)
      setNotes(await window.electronAPI.getNotes())
      if (activeId === id) setActiveId(null)
    },
    [activeId]
  )

  const handleExport = useCallback(async () => {
    if (!activeNote) return
    await window.electronAPI.exportNote({
      title: activeNote.title,
      content: activeNote.content
    })
  }, [activeNote])

  const handleImport = useCallback(async () => {
    const imported = await window.electronAPI.importNote()
    if (imported) {
      const result = await window.electronAPI.createNote()
      await window.electronAPI.updateNote({
        id: result.lastInsertRowid,
        title: imported.title,
        content: imported.content
      })
      const fresh = await window.electronAPI.getNotes()
      setNotes(fresh)
      setActiveId(result.lastInsertRowid)
    }
  }, [])

  // ── Menu events from main process
  useEffect(() => {
    const removeNewNote = window.electronAPI.onNewNote(handleNewNote)
    const removeExport = window.electronAPI.onExport(handleExport)

    // This runs before the effect re-fires, removing the stale listeners
    return () => {
      removeNewNote()
      removeExport()
    }
  }, [activeNote])

  const handleChange = useCallback(({ id, title, content }) => {
    // 1. Update the UI instantly — no waiting at all
    setNotes((prev) => prev.map((n) => (n.id === id ? { ...n, title, content } : n)))

    // 2. Show "Saving..." immediately
    setSaving(true)

    // 3. Actual SQLite write deferred 800ms after typing stops
    debouncedSave({
      id,
      title,
      content,
      // Pass setNotes/setSaving as a callback so the module-level
      // function can update state without a stale closure
      onDone: (updated) => {
        setNotes(updated)
        setSaving(false)
      }
    })
  }, [])

  return (
    <div className="app">
      <NoteList
        notes={notes}
        activeId={activeId}
        onSelect={setActiveId}
        onNew={handleNewNote}
        onDelete={handleDelete}
        onImport={handleImport}
      />
      <Editor note={activeNote} saving={saving} onChange={handleChange} />
    </div>
  )
}
