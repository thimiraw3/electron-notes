import { useState } from 'react'
import PropTypes from 'prop-types'

export default function NoteList({ notes, activeId, onSelect, onNew, onDelete, onImport }) {
  const [search, setSearch] = useState('')

  const filtered = notes.filter(
    (n) =>
      n.title.toLowerCase().includes(search.toLowerCase()) ||
      n.content.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <aside className="note-list">
      <div className="note-list__toolbar">
        <button className="btn btn--primary" onClick={onNew}>
          + New
        </button>
        <button className="btn" onClick={onImport}>
          Import
        </button>
      </div>

      <input
        className="note-list__search"
        type="text"
        placeholder="Search notes..."
        value={search}
        onChange={(e) => setSearch(e.target.value)}
      />

      <ul className="note-list__items">
        {filtered.length === 0 && <li className="note-list__empty">No notes yet</li>}
        {filtered.map((note) => (
          <li
            key={note.id}
            className={`note-list__item ${note.id === activeId ? 'note-list__item--active' : ''}`}
            onClick={() => onSelect(note.id)}
          >
            <div className="note-list__item-title">{note.title || 'Untitled'}</div>
            <div className="note-list__item-preview">
              {note.content?.slice(0, 60) || 'No content'}
            </div>
            <div className="note-list__item-footer">
              <span className="note-list__item-date">
                {new Date(note.updated_at).toLocaleDateString()}
              </span>
              <button
                className="btn btn--danger btn--small"
                onClick={(e) => {
                  e.stopPropagation()
                  onDelete(note.id)
                }}
              >
                Delete
              </button>
            </div>
          </li>
        ))}
      </ul>
    </aside>
  )
}

NoteList.propTypes = {
  notes: PropTypes.array.isRequired,
  activeId: PropTypes.number,
  onSelect: PropTypes.func.isRequired,
  onNew: PropTypes.func.isRequired,
  onDelete: PropTypes.func.isRequired,
  onImport: PropTypes.func.isRequired
}
