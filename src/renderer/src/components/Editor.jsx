import { useEffect, useRef, useReducer } from 'react'
import PropTypes from 'prop-types'

function editorReducer(state, action) {
  switch (action.type) {
    case 'reset':
      return {
        title: action.note?.title ?? '',
        content: action.note?.content ?? ''
      }
    case 'setTitle':
      return { ...state, title: action.title }
    case 'setContent':
      return { ...state, content: action.content }
    default:
      return state
  }
}

export default function Editor({ note, saving, onChange }) {
  const [state, dispatch] = useReducer(editorReducer, {
    title: note?.title ?? '',
    content: note?.content ?? ''
  })
  const titleRef = useRef(null)

  // Sync local state when active note changes
  useEffect(() => {
    if (note) {
      dispatch({ type: 'reset', note })
    }
  }, [note])

  // Auto-focus title when a new blank note opens
  useEffect(() => {
    if (note && !note.title && titleRef.current) {
      titleRef.current.focus()
    }
  }, [note])

  if (!note) {
    return (
      <div className="editor editor--empty">
        <p>Select a note or create a new one</p>
      </div>
    )
  }

  const handleTitleChange = (e) => {
    dispatch({ type: 'setTitle', title: e.target.value })
    onChange({ id: note.id, title: e.target.value, content: state.content })
  }

  const handleContentChange = (e) => {
    dispatch({ type: 'setContent', content: e.target.value })
    onChange({ id: note.id, title: state.title, content: e.target.value })
  }

  return (
    <div className="editor">
      <div className="editor__header">
        <input
          ref={titleRef}
          className="editor__title"
          type="text"
          placeholder="Note title..."
          value={state.title}
          onChange={handleTitleChange}
          data-testid="title-input"
        />
        <span className="editor__status">{saving ? 'Saving...' : 'Saved'}</span>
      </div>
      <textarea
        className="editor__body"
        placeholder="Start writing..."
        value={state.content}
        onChange={handleContentChange}
        data-testid="editor"
        spellCheck
      />
      <div className="editor__footer">
        <span>{state.content.length} characters</span>
        <span>{state.content.split(/\s+/).filter(Boolean).length} words</span>
        <span>Last saved: {new Date(note.updated_at).toLocaleTimeString()}</span>
      </div>
    </div>
  )
}

Editor.propTypes = {
  note: PropTypes.object,
  saving: PropTypes.bool.isRequired,
  onChange: PropTypes.func.isRequired
}
