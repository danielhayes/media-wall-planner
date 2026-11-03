import { useEffect, useState } from 'react'
import { useStore } from '../lib/store'
import { listRecent, removeRecent, hasFSAccess } from '../lib/files'
import type { RecentEntry } from '../lib/files'
import { exportLegacyProjects, request, resolvePending, saveProject, saveProjectAs } from '../lib/fileOps'

/** The File section: New, Open, Save, Save As, Recent, and the one-time legacy export. */
export function FilePanel() {
  const project = useStore((s) => s.project)
  const dirty = useStore((s) => s.dirty)
  const fileName = useStore((s) => s.fileName)
  const fileError = useStore((s) => s.fileError)
  const pending = useStore((s) => s.pending)
  const recentVersion = useStore((s) => s.recentVersion)
  const legacy = useStore((s) => s.legacyProjects)
  const { setFileError, setPending, removeLegacy, discardLegacy, bumpRecent } = useStore()
  const [recent, setRecent] = useState<RecentEntry[]>([])
  const [note, setNote] = useState<string | null>(null)
  const [showLegacy, setShowLegacy] = useState(false)
  const [confirmDiscard, setConfirmDiscard] = useState(false)
  const fs = hasFSAccess()

  useEffect(() => {
    let live = true
    listRecent().then((r) => live && setRecent(r))
    return () => {
      live = false
    }
  }, [recentVersion])

  const title = fileName ? fileName.replace(/\.json$/i, '') : project ? project.name || 'Untitled' : 'No file'

  return (
    <section>
      <h2>File</h2>
      <div className="file-title" title={fileName ?? 'Not saved to a file yet'}>
        <span className={`file-name${dirty ? ' dirty' : ''}`}>{title}</span>
        {dirty && <span className="dirty-dot" title="Unsaved changes">●</span>}
        {!fileName && project && <span className="muted"> · unsaved</span>}
      </div>
      <div className="row buttons">
        <button onClick={() => request({ kind: 'new' })}>New</button>
        <button onClick={() => request({ kind: 'open' })}>Open…</button>
      </div>
      <div className="row buttons">
        <button className={dirty ? 'primary' : ''} disabled={!project} onClick={() => void saveProject()} title={fs ? 'Save (⌘S / Ctrl+S)' : 'Download the project file'}>
          Save
        </button>
        <button disabled={!project} onClick={() => void saveProjectAs()} title={fs ? 'Save As (⇧⌘S / Ctrl+Shift+S)' : 'Download under a new name'}>
          Save As…
        </button>
      </div>
      {!fs && <p className="muted">This browser cannot write files directly, so Save downloads a copy and Open asks for the file each time. Chrome and Edge save in place.</p>}
      {fileError && (
        <p className="error">
          {fileError} <button className="eye" onClick={() => setFileError(null)} title="Dismiss">×</button>
        </p>
      )}

      {pending && (
        <div className="prompt">
          <p>Unsaved changes in <strong>{title}</strong>.</p>
          <div className="row buttons">
            <button className="primary" onClick={() => void resolvePending('save')}>Save, then continue</button>
            <button className="danger" onClick={() => void resolvePending('discard')}>Discard</button>
            <button onClick={() => setPending(null)}>Cancel</button>
          </div>
        </div>
      )}

      {recent.length > 0 && (
        <>
          <h3>Recent</h3>
          <ul className="items">
            {recent.map((r) => (
              <li key={r.id} onClick={() => request({ kind: 'recent', id: r.id })} title={r.handle ? 'Reopen this file' : 'Reopen (you will be asked for the file)'}>
                <span className="name">{r.name.replace(/\.json$/i, '')}</span>
                <button
                  className="eye"
                  title="Remove from Recent"
                  onClick={(e) => {
                    e.stopPropagation()
                    void removeRecent(r.id).then(bumpRecent)
                  }}
                >
                  ×
                </button>
              </li>
            ))}
          </ul>
        </>
      )}

      {legacy.length > 0 && (
        <div className="legacy">
          <p>
            <strong>{legacy.length}</strong> project{legacy.length === 1 ? '' : 's'} from the previous version {legacy.length === 1 ? 'is' : 'are'} still stored in this browser. Export them to files to keep them.
          </p>
          <div className="row buttons">
            <button
              className="primary"
              onClick={() => {
                void exportLegacyProjects().then((msg) => setNote(msg))
              }}
            >
              {fs ? 'Export all to a folder…' : 'Download all'}
            </button>
            <button onClick={() => setShowLegacy((v) => !v)}>{showLegacy ? 'Hide list' : 'Show list'}</button>
          </div>
          {showLegacy && (
            <ul className="items">
              {legacy.map((p) => (
                <li key={p.id} onClick={() => request({ kind: 'legacy', id: p.id })} title="Open this project (then Save As to write it to a file)">
                  <span className="name">{p.name}</span>
                  <span className="muted">{new Date(p.updatedAt).toLocaleDateString()}</span>
                  <button
                    className="eye"
                    title="Forget this project"
                    onClick={(e) => {
                      e.stopPropagation()
                      removeLegacy(p.id)
                    }}
                  >
                    ×
                  </button>
                </li>
              ))}
            </ul>
          )}
          {confirmDiscard ? (
            <div className="row buttons">
              <button className="danger" onClick={() => { discardLegacy(); setConfirmDiscard(false) }}>Discard {legacy.length}</button>
              <button onClick={() => setConfirmDiscard(false)}>Cancel</button>
            </div>
          ) : (
            <div className="row buttons">
              <button onClick={() => setConfirmDiscard(true)}>Discard all without exporting</button>
            </div>
          )}
        </div>
      )}
      {note && <p className="muted">{note}</p>}
    </section>
  )
}
