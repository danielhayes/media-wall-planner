/**
 * Disk access. Chrome and Edge expose the File System Access API, which lets the app keep
 * a handle to the open file (Save overwrites in place, Recent reopens with one click).
 * Elsewhere, Open uses a file input and Save produces a download.
 */

export interface RecentEntry {
  id: string
  name: string
  handle?: FileSystemFileHandle
  lastOpened: number
}

type PermissionMode = 'read' | 'readwrite'
interface HandleWithPermission extends FileSystemFileHandle {
  queryPermission?: (d: { mode: PermissionMode }) => Promise<PermissionState>
  requestPermission?: (d: { mode: PermissionMode }) => Promise<PermissionState>
}
interface PickerWindow extends Window {
  showOpenFilePicker?: (o?: unknown) => Promise<FileSystemFileHandle[]>
  showSaveFilePicker?: (o?: unknown) => Promise<FileSystemFileHandle>
  showDirectoryPicker?: (o?: unknown) => Promise<FileSystemDirectoryHandle>
}
const win = window as PickerWindow
const TYPES = [{ description: 'Media wall project', accept: { 'application/json': ['.json'] } }]

export function hasFSAccess() {
  return typeof win.showOpenFilePicker === 'function' && typeof win.showSaveFilePicker === 'function'
}

export function isAbort(err: unknown) {
  return (err as DOMException)?.name === 'AbortError'
}

/** Open picker. Returns null if the user cancelled. */
export async function pickOpen(): Promise<{ handle: FileSystemFileHandle; file: File } | null> {
  try {
    const [handle] = await win.showOpenFilePicker!({ types: TYPES, multiple: false })
    return { handle, file: await handle.getFile() }
  } catch (err) {
    if (isAbort(err)) return null
    throw err
  }
}

/** Save picker. Returns null if the user cancelled. */
export async function pickSave(suggestedName: string): Promise<FileSystemFileHandle | null> {
  try {
    return await win.showSaveFilePicker!({ suggestedName, types: TYPES })
  } catch (err) {
    if (isAbort(err)) return null
    throw err
  }
}

export async function pickDirectory(): Promise<FileSystemDirectoryHandle | null> {
  if (typeof win.showDirectoryPicker !== 'function') return null
  try {
    return await win.showDirectoryPicker({ mode: 'readwrite' })
  } catch (err) {
    if (isAbort(err)) return null
    throw err
  }
}

export async function ensurePermission(handle: FileSystemFileHandle, mode: PermissionMode): Promise<boolean> {
  const h = handle as HandleWithPermission
  if (!h.queryPermission || !h.requestPermission) return true
  if ((await h.queryPermission({ mode })) === 'granted') return true
  return (await h.requestPermission({ mode })) === 'granted'
}

export async function writeHandle(handle: FileSystemFileHandle, text: string) {
  const writable = await handle.createWritable()
  await writable.write(text)
  await writable.close()
}

export function downloadText(name: string, text: string) {
  const blob = new Blob([text], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = name
  a.click()
  URL.revokeObjectURL(url)
}

/** File input fallback for browsers without the File System Access API. */
export function pickOpenFallback(): Promise<File | null> {
  return new Promise((resolve) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'application/json,.json'
    input.onchange = () => resolve(input.files?.[0] ?? null)
    input.oncancel = () => resolve(null)
    input.click()
  })
}

// ---------------- Recent files (IndexedDB, because file handles can't go in localStorage) ----------------

const DB_NAME = 'media-wall-planner'
const STORE = 'recent'
const MAX_RECENT = 10

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!('indexedDB' in window)) return reject(new Error('IndexedDB unavailable'))
    const req = indexedDB.open(DB_NAME, 1)
    req.onupgradeneeded = () => {
      if (!req.result.objectStoreNames.contains(STORE)) req.result.createObjectStore(STORE, { keyPath: 'id' })
    }
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
  })
}

async function withStore<T>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await openDb()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const req = fn(tx.objectStore(STORE))
    req.onsuccess = () => resolve(req.result)
    req.onerror = () => reject(req.error)
    tx.oncomplete = () => db.close()
  })
}

export async function listRecent(): Promise<RecentEntry[]> {
  try {
    const all = await withStore<RecentEntry[]>('readonly', (s) => s.getAll())
    return all.sort((a, b) => b.lastOpened - a.lastOpened)
  } catch {
    return []
  }
}

export async function getRecent(id: string): Promise<RecentEntry | null> {
  try {
    return (await withStore<RecentEntry | undefined>('readonly', (s) => s.get(id))) ?? null
  } catch {
    return null
  }
}

export async function removeRecent(id: string) {
  try {
    await withStore('readwrite', (s) => s.delete(id))
  } catch {
    /* ignore */
  }
}

/** Record a file in the recent list, merging with an existing entry for the same file. Returns the entry id. */
export async function rememberFile(name: string, handle?: FileSystemFileHandle): Promise<string | null> {
  try {
    const all = await listRecent()
    let match: RecentEntry | undefined
    for (const e of all) {
      if (handle && e.handle) {
        if (await handle.isSameEntry(e.handle)) {
          match = e
          break
        }
      } else if (!handle && !e.handle && e.name === name) {
        match = e
        break
      }
    }
    const entry: RecentEntry = {
      id: match?.id ?? Math.random().toString(36).slice(2, 10) + Date.now().toString(36),
      name,
      handle: handle ?? match?.handle,
      lastOpened: Date.now(),
    }
    await withStore('readwrite', (s) => s.put(entry))
    // Trim the list
    const trimmed = (await listRecent()).slice(MAX_RECENT)
    for (const e of trimmed) await removeRecent(e.id)
    return entry.id
  } catch {
    return null
  }
}
