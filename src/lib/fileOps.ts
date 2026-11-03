import { DEFAULT_SNAP, useStore } from './store'
import type { PendingAction } from './store'
import type { Project } from './types'
import { settle } from './geometry'
import * as F from './files'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

export function fileBaseName(fileName: string) {
  return fileName.replace(/\.json$/i, '')
}

export function suggestedFileName(project: Project | null, fileName: string | null) {
  if (fileName) return fileName
  return `${(project?.name || 'Untitled wall').replace(/[^\w-]+/g, '_')}.json`
}

export function projectJson(p: Project) {
  return JSON.stringify(p, null, 2)
}

/** Validate file text and return a project named after the file. Throws with a readable message. */
export function parseProject(text: string, fileName: string): Project {
  let raw: Project
  try {
    raw = JSON.parse(text) as Project
  } catch {
    throw new Error('That file is not valid JSON.')
  }
  if (!raw || !raw.wall || !Array.isArray(raw.items)) throw new Error('That file does not look like a media wall project.')
  const p: Project = {
    ...raw,
    id: raw.id || uid(),
    name: fileBaseName(fileName),
    snap: { ...DEFAULT_SNAP, ...raw.snap },
    createdAt: raw.createdAt ?? Date.now(),
    updatedAt: raw.updatedAt ?? Date.now(),
  }
  p.items = settle(p.items, p.wall, p.floorDepth)
  return p
}

async function currentHandle(): Promise<FileSystemFileHandle | null> {
  const id = useStore.getState().fileId
  if (!id) return null
  const entry = await F.getRecent(id)
  return entry?.handle ?? null
}

/** Save to the open file, or fall through to Save As when there is none. Resolves true when saved. */
export async function saveProject(): Promise<boolean> {
  const st = useStore.getState()
  if (!st.project) return false
  const handle = await currentHandle()
  if (!handle) return saveProjectAs()
  try {
    if (!(await F.ensurePermission(handle, 'readwrite'))) {
      st.setFileError('Permission to write the file was declined. Use Save As to pick a location.')
      return false
    }
    await F.writeHandle(handle, projectJson({ ...st.project, name: fileBaseName(handle.name) }))
    const id = await F.rememberFile(handle.name, handle)
    useStore.getState().markSaved(handle.name, id)
    useStore.getState().bumpRecent()
    return true
  } catch (err) {
    st.setFileError(`Could not save: ${(err as Error).message}`)
    return false
  }
}

export async function saveProjectAs(): Promise<boolean> {
  const st = useStore.getState()
  if (!st.project) return false
  const name = suggestedFileName(st.project, st.fileName)
  try {
    if (F.hasFSAccess()) {
      const handle = await F.pickSave(name)
      if (!handle) return false
      await F.writeHandle(handle, projectJson({ ...st.project, name: fileBaseName(handle.name) }))
      const id = await F.rememberFile(handle.name, handle)
      useStore.getState().markSaved(handle.name, id)
      useStore.getState().bumpRecent()
      return true
    }
    F.downloadText(name, projectJson({ ...st.project, name: fileBaseName(name) }))
    const id = await F.rememberFile(name)
    useStore.getState().markSaved(name, id)
    useStore.getState().bumpRecent()
    return true
  } catch (err) {
    st.setFileError(`Could not save: ${(err as Error).message}`)
    return false
  }
}

async function loadFromHandle(handle: FileSystemFileHandle) {
  const file = await handle.getFile()
  const project = parseProject(await file.text(), handle.name)
  const id = await F.rememberFile(handle.name, handle)
  useStore.getState().openProject(project, handle.name, id)
  useStore.getState().bumpRecent()
}

/** Open a file from disk via the picker (or a file input where pickers are unsupported). */
export async function openProjectFile() {
  const st = useStore.getState()
  try {
    if (F.hasFSAccess()) {
      const picked = await F.pickOpen()
      if (!picked) return
      await loadFromHandle(picked.handle)
      return
    }
    const file = await F.pickOpenFallback()
    if (!file) return
    const project = parseProject(await file.text(), file.name)
    const id = await F.rememberFile(file.name)
    useStore.getState().openProject(project, file.name, id)
    useStore.getState().bumpRecent()
  } catch (err) {
    st.setFileError((err as Error).message)
  }
}

export async function openRecentFile(id: string) {
  const st = useStore.getState()
  const entry = await F.getRecent(id)
  if (!entry) return
  if (!entry.handle) {
    // Name only (no File System Access API): ask for the file again.
    await openProjectFile()
    return
  }
  try {
    if (!(await F.ensurePermission(entry.handle, 'read'))) {
      st.setFileError('Permission to read the file was declined.')
      return
    }
    await loadFromHandle(entry.handle)
  } catch (err) {
    const e = err as DOMException
    if (e.name === 'NotFoundError') {
      await F.removeRecent(id)
      useStore.getState().bumpRecent()
      st.setFileError(`"${entry.name}" was moved or deleted, so it was removed from Recent.`)
    } else st.setFileError(e.message)
  }
}

export function openLegacyProject(id: string) {
  const st = useStore.getState()
  const p = st.legacyProjects.find((x) => x.id === id)
  if (!p) return
  useStore.getState().openProject({ ...p }, null, null)
  useStore.setState({ dirty: true })
}

/** Run an action now, or park it behind the unsaved-changes prompt when the project is dirty. */
export function request(action: PendingAction) {
  const st = useStore.getState()
  st.setFileError(null)
  if (st.dirty && st.project) st.setPending(action)
  else void perform(action)
}

export async function perform(action: PendingAction) {
  const st = useStore.getState()
  st.setPending(null)
  if (action.kind === 'new') st.newProject()
  else if (action.kind === 'open') await openProjectFile()
  else if (action.kind === 'recent') await openRecentFile(action.id)
  else if (action.kind === 'legacy') openLegacyProject(action.id)
}

/** Resolve the unsaved-changes prompt: save first (then continue) or discard. */
export async function resolvePending(choice: 'save' | 'discard') {
  const st = useStore.getState()
  const action = st.pending
  if (!action) return
  if (choice === 'save') {
    const ok = await saveProject()
    if (!ok) return // keep the prompt up; the user cancelled or saving failed
  }
  await perform(action)
}

/** Write every legacy project to a folder (Chrome/Edge) or as downloads, then clear the list. */
export async function exportLegacyProjects(): Promise<string | null> {
  const st = useStore.getState()
  const list = st.legacyProjects
  if (!list.length) return null
  const used = new Set<string>()
  const nameFor = (p: Project) => {
    const base = (p.name || 'Untitled wall').replace(/[^\w-]+/g, '_')
    let n = base
    let k = 2
    while (used.has(n.toLowerCase())) n = `${base}_${k++}`
    used.add(n.toLowerCase())
    return `${n}.json`
  }
  try {
    const dir = await F.pickDirectory()
    if (dir) {
      for (const p of list) {
        const name = nameFor(p)
        const handle = await dir.getFileHandle(name, { create: true })
        await F.writeHandle(handle, projectJson({ ...p, name: fileBaseName(name) }))
        await F.rememberFile(name, handle)
      }
      useStore.getState().discardLegacy()
      useStore.getState().bumpRecent()
      return `Saved ${list.length} project${list.length === 1 ? '' : 's'} to the folder.`
    }
    if (!F.hasFSAccess() || typeof (window as { showDirectoryPicker?: unknown }).showDirectoryPicker !== 'function') {
      for (const p of list) F.downloadText(nameFor(p), projectJson(p))
      useStore.getState().discardLegacy()
      return `Downloaded ${list.length} project${list.length === 1 ? '' : 's'}.`
    }
    return null // cancelled
  } catch (err) {
    st.setFileError(`Could not export: ${(err as Error).message}`)
    return null
  }
}
