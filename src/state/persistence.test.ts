import { beforeEach, describe, expect, it } from 'vitest'
import { addChild, createEmptyTree } from '../domain/tree'
import {
  loadSavedTree,
  saveTree,
  SAVED_PROJECT_STORAGE_KEY,
} from './persistence'

describe('tree persistence', () => {
  beforeEach(() => window.localStorage.clear())

  it('saves a versioned project and restores its tree', () => {
    const root = createEmptyTree()
    const tree = addChild(root, root.rootId, {
      id: 'language',
      label: 'Language',
      branchLength: 1.25,
      metadata: { code: 'lng', attested: true },
    })

    saveTree(tree)

    const savedProject = JSON.parse(
      window.localStorage.getItem(SAVED_PROJECT_STORAGE_KEY) ?? 'null',
    ) as { appVersion?: unknown; tree?: unknown } | null
    expect(savedProject?.appVersion).toEqual(expect.any(String))
    expect(savedProject?.tree).toEqual(tree)
    expect(loadSavedTree()).toEqual(tree)
  })

  it('ignores malformed or structurally invalid saved projects', () => {
    window.localStorage.setItem(SAVED_PROJECT_STORAGE_KEY, '{not json')
    expect(loadSavedTree()).toBeNull()

    window.localStorage.setItem(
      SAVED_PROJECT_STORAGE_KEY,
      JSON.stringify({
        appVersion: '0.0.0',
        tree: { rootId: 'missing', nodes: {} },
      }),
    )
    expect(loadSavedTree()).toBeNull()
  })
})
