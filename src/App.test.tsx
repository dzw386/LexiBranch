import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
  within,
  waitFor,
} from '@testing-library/react'
import { XMLValidator } from 'fast-xml-parser'
import { renderToStaticMarkup } from 'react-dom/server'
import { I18nextProvider } from 'react-i18next'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { layoutPhyloTree } from './layout/layout'
import i18n from './i18n'
import languagesPhyloXml from './parsers/fixtures/languages.phyloxml?raw'
import metadataNhx from './parsers/fixtures/metadata.nhx?raw'
import { parse as parsePhyloXml } from './parsers/phyloxml'
import { SAMPLES } from './parsers/samples'
import {
  AUTOSAVE_DELAY_MS,
  SAVED_PROJECT_STORAGE_KEY,
} from './state/persistence'
import { createTreeHistory } from './state/history'
import { createInitialTree, getInitialTree, useTreeStore } from './state/store'
import type { PhyloTree } from './domain/types'

function renderApp() {
  return renderToStaticMarkup(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  )
}

function mountApp() {
  return render(
    <I18nextProvider i18n={i18n}>
      <App />
    </I18nextProvider>,
  )
}

function countRenderedNodes(): number {
  return document.querySelectorAll('.react-flow__node').length
}

function createTextFile(name: string, contents: string): File {
  const file = new File([contents], name, { type: 'text/plain' })
  Object.defineProperty(file, 'text', { value: async () => contents })
  return file
}

function importFile(file: File, buttonLabel = 'Import'): void {
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')

  if (input === null) {
    throw new Error('The tree file input was not rendered.')
  }

  fireEvent.click(screen.getByRole('button', { name: buttonLabel }))
  fireEvent.change(input, { target: { files: [file] } })
}

describe('App', () => {
  afterEach(async () => {
    cleanup()
    vi.useRealTimers()
    vi.restoreAllMocks()
    vi.unstubAllGlobals()
    useTreeStore.setState({
      tree: createInitialTree(),
      history: createTreeHistory(),
      selectedNodeId: null,
      pendingMoveNodeId: null,
      viewMode: 'cladogram',
    })
    await i18n.changeLanguage('en')
  })

  it('renders the initial React Flow tree', () => {
    const markup = renderApp()
    const { nodes, edges } = layoutPhyloTree(createInitialTree())

    expect(nodes).toHaveLength(7)
    expect(nodes.map((node) => node.data.label)).toEqual(
      expect.arrayContaining([
        'Proto-language',
        'Germanic',
        'Slavic',
        'English',
        'German',
        'Polish',
        'Russian',
      ]),
    )
    expect(edges).toHaveLength(6)
    expect(markup).toContain('react-flow')
    expect(markup).toContain('react-flow__background')
    expect(markup).toContain('react-flow__controls')
    expect(edges.every((edge) => edge.type === 'phylo')).toBe(true)
    expect(edges.some((edge) => edge.data?.branchLength === 0.8)).toBe(true)
  })

  it('renders the app shell around the canvas', () => {
    const markup = renderApp()

    expect(markup).toContain('<header')
    expect(markup).toContain('LexiBranch')
    expect(markup).toContain('New tree')
    expect(markup).toContain('Import')
    expect(markup).toContain('Export')
    expect(markup).toContain('Tree tools sidebar')
    expect(markup).toContain('Phylogenetic tree canvas')
  })

  it('switches between cladogram and phylogram view modes', () => {
    mountApp()

    expect(
      screen
        .getByRole('button', { name: 'Cladogram' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
    expect(useTreeStore.getState().viewMode).toBe('cladogram')

    fireEvent.click(screen.getByRole('button', { name: 'Phylogram' }))
    expect(useTreeStore.getState().viewMode).toBe('phylogram')
    expect(
      screen
        .getByRole('button', { name: 'Phylogram' })
        .getAttribute('aria-pressed'),
    ).toBe('true')

    fireEvent.click(screen.getByRole('button', { name: 'Cladogram' }))
    expect(useTreeStore.getState().viewMode).toBe('cladogram')
    expect(
      screen
        .getByRole('button', { name: 'Cladogram' })
        .getAttribute('aria-pressed'),
    ).toBe('true')
  })

  it('provides a compact view selector and responsive sidebar controls', () => {
    mountApp()

    fireEvent.change(screen.getByRole('combobox', { name: 'View mode' }), {
      target: { value: 'phylogram' },
    })
    expect(useTreeStore.getState().viewMode).toBe('phylogram')

    const sidebarToggles = screen.getAllByRole('button', {
      name: 'Toggle tree tools sidebar',
    })
    const mobileToggle = sidebarToggles.find((button) =>
      button.className.includes('md:hidden'),
    )
    const desktopToggle = sidebarToggles.find((button) =>
      button.className.includes('md:inline-flex'),
    )

    if (mobileToggle === undefined || desktopToggle === undefined) {
      throw new Error('Responsive sidebar controls were not rendered.')
    }

    const sidebar = screen.getByRole('complementary', {
      name: 'Tree tools sidebar',
    })
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false')
    fireEvent.click(mobileToggle)
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('true')
    expect(sidebar.className).toContain('absolute')
    expect(document.querySelector('.react-flow')).not.toBeNull()

    fireEvent.click(within(sidebar).getByRole('button', { name: 'Close' }))
    expect(mobileToggle.getAttribute('aria-expanded')).toBe('false')

    expect(desktopToggle.getAttribute('aria-expanded')).toBe('true')
    fireEvent.click(desktopToggle)
    expect(desktopToggle.getAttribute('aria-expanded')).toBe('false')
    expect(sidebar.className).not.toContain('md:flex')
    expect(document.querySelector('.react-flow')).not.toBeNull()
  })

  it('switches the interface language immediately and persists the choice', async () => {
    mountApp()

    const languageSelector = screen.getByRole('combobox', { name: 'Language' })
    expect((languageSelector as HTMLSelectElement).value).toBe('en')

    fireEvent.change(languageSelector, { target: { value: 'pl' } })

    await waitFor(() => {
      expect(screen.getByText('Nowe drzewo')).toBeDefined()
      expect(
        (screen.getByRole('combobox', { name: 'Język' }) as HTMLSelectElement)
          .value,
      ).toBe('pl')
    })
    expect(window.localStorage.getItem('lexibranch-language')).toBe('pl')

    fireEvent.change(screen.getByRole('combobox', { name: 'Język' }), {
      target: { value: 'en' },
    })

    await waitFor(() => expect(screen.getByText('New tree')).toBeDefined())
    expect(window.localStorage.getItem('lexibranch-language')).toBe('en')
  })

  it('debounces tree autosave, flushes on close, and restores the saved tree', () => {
    window.localStorage.clear()
    vi.useFakeTimers()
    mountApp()

    act(() => useTreeStore.getState().setLabel('germanic', 'Temporary label'))
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1))
    expect(window.localStorage.getItem(SAVED_PROJECT_STORAGE_KEY)).toBeNull()

    act(() => useTreeStore.getState().setLabel('germanic', 'Saved label'))
    act(() => vi.advanceTimersByTime(AUTOSAVE_DELAY_MS - 1))
    expect(window.localStorage.getItem(SAVED_PROJECT_STORAGE_KEY)).toBeNull()

    act(() => vi.advanceTimersByTime(1))

    const serializedProject = window.localStorage.getItem(
      SAVED_PROJECT_STORAGE_KEY,
    )
    expect(serializedProject).not.toBeNull()
    const savedProject = JSON.parse(serializedProject ?? '') as {
      tree: PhyloTree
    }
    expect(savedProject.tree.nodes.germanic?.label).toBe('Saved label')

    act(() => useTreeStore.getState().setLabel('germanic', 'Last edit'))
    window.dispatchEvent(new Event('pagehide'))
    expect(getInitialTree().nodes.germanic?.label).toBe('Last edit')
    expect(getInitialTree()).toEqual(useTreeStore.getState().tree)
  })

  it('undoes and redoes tree edits with Ctrl+Z and Ctrl+Shift+Z', () => {
    mountApp()

    act(() => useTreeStore.getState().setLabel('germanic', 'North Germanic'))
    fireEvent.keyDown(window, { key: 'z', ctrlKey: true })
    expect(useTreeStore.getState().tree.nodes.germanic?.label).toBe('Germanic')

    fireEvent.keyDown(window, { key: 'z', ctrlKey: true, shiftKey: true })
    expect(useTreeStore.getState().tree.nodes.germanic?.label).toBe(
      'North Germanic',
    )
  })

  it('leaves Ctrl+Z available to text inputs', async () => {
    mountApp()

    act(() => useTreeStore.getState().setLabel('germanic', 'North Germanic'))
    fireEvent.click(await screen.findByText('North Germanic'))
    const labelInput = await screen.findByLabelText('Label')

    fireEvent.keyDown(labelInput, { key: 'z', ctrlKey: true })

    expect(useTreeStore.getState().tree.nodes.germanic?.label).toBe(
      'North Germanic',
    )
  })

  it('creates a new tree with the translated root label after confirmation', async () => {
    mountApp()
    const originalTree = useTreeStore.getState().tree

    fireEvent.click(screen.getByRole('button', { name: 'New tree' }))
    expect((await screen.findByRole('dialog')).textContent).toContain(
      'Your current tree will be replaced with a blank tree.',
    )

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    expect(useTreeStore.getState().tree).toBe(originalTree)

    fireEvent.click(screen.getByRole('button', { name: 'New tree' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Create new tree' }),
    )

    const { tree, selectedNodeId, pendingMoveNodeId } = useTreeStore.getState()
    expect(Object.keys(tree.nodes)).toHaveLength(1)
    expect(tree.nodes[tree.rootId]?.label).toBe('New node')
    expect(selectedNodeId).toBeNull()
    expect(pendingMoveNodeId).toBeNull()
  })

  it('uses the Polish new-node label for the new tree root', async () => {
    await i18n.changeLanguage('pl')
    mountApp()

    fireEvent.click(screen.getByRole('button', { name: 'Nowe drzewo' }))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Utwórz nowe drzewo' }),
    )

    const { tree } = useTreeStore.getState()
    expect(tree.nodes[tree.rootId]?.label).toBe('Nowy węzeł')
  })

  it('renders translated shell text when the language changes', async () => {
    await i18n.changeLanguage('pl')

    const markup = renderApp()

    expect(markup).toContain('Nowe drzewo')
    expect(markup).toContain('Importuj')
    expect(markup).toContain('Eksportuj')
    expect(markup).toContain('Panel narzędzi drzewa')
    expect(markup).toContain('Obszar drzewa filogenetycznego')
    expect(markup).toContain('Elementy sterujące widokiem drzewa')
  })

  it('localizes React Flow control labels and screen-reader descriptions', async () => {
    const labels = [
      { english: 'Zoom In', polish: 'Powiększ' },
      { english: 'Zoom Out', polish: 'Pomniejsz' },
      { english: 'Fit View', polish: 'Dopasuj widok' },
    ]
    mountApp()

    for (const { english } of labels) {
      expect(
        screen.getByRole('button', { name: english }).getAttribute('title'),
      ).toBe(english)
    }
    expect(
      screen.getByText(
        'Press Enter or Space to select the node. Press Escape to deselect it.',
      ),
    ).toBeTruthy()
    expect(screen.getByText('This branch is not interactive.')).toBeTruthy()

    await i18n.changeLanguage('pl')

    await waitFor(() => {
      for (const { polish } of labels) {
        expect(
          screen.getByRole('button', { name: polish }).getAttribute('title'),
        ).toBe(polish)
      }
      expect(
        screen.getByText(
          'Naciśnij Enter lub spację, aby zaznaczyć węzeł. Naciśnij Escape, aby go odznaczyć.',
        ),
      ).toBeTruthy()
      expect(screen.getByText('Ta gałąź nie jest interaktywna.')).toBeTruthy()
    })
  })

  it('imports a Newick file and replaces the tree in the canvas', async () => {
    mountApp()

    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]')
    if (fileInput === null) {
      throw new Error('The tree file input was not rendered.')
    }
    const inputClick = vi.spyOn(fileInput, 'click')

    importFile(
      createTextFile('languages.nwk', '(English:0.4,Polish:0.3)Proto;'),
    )

    expect(inputClick).toHaveBeenCalledTimes(1)
    await waitFor(() => {
      const tree = useTreeStore.getState().tree
      expect(Object.keys(tree.nodes)).toHaveLength(3)
      expect(Object.values(tree.nodes).map((node) => node.label)).toEqual(
        expect.arrayContaining(['Proto', 'English', 'Polish']),
      )
    })
    expect(useTreeStore.getState().selectedNodeId).toBeNull()
    expect(await screen.findByText('Proto')).toBeDefined()
  })

  it('imports NHX metadata and shows it in the node details panel', async () => {
    mountApp()

    importFile(createTextFile('languages.nhx', metadataNhx))

    await waitFor(() => {
      const tree = useTreeStore.getState().tree
      const english = Object.values(tree.nodes).find(
        (node) => node.label === 'English',
      )

      expect(english?.metadata).toEqual({
        code: 'eng',
        note: 'first-second',
      })
    })

    fireEvent.click(await screen.findByText('English'))
    expect(await screen.findByDisplayValue('eng')).toBeDefined()
  })

  it('imports phyloXML files and preserves their tree data', async () => {
    mountApp()

    const fileInput =
      document.querySelector<HTMLInputElement>('input[type="file"]')
    if (fileInput === null) {
      throw new Error('The tree file input was not rendered.')
    }
    expect(fileInput.accept).toContain('.xml')
    expect(fileInput.accept).toContain('.phyloxml')

    importFile(createTextFile('languages.xml', languagesPhyloXml))

    await waitFor(() => {
      const tree = useTreeStore.getState().tree
      expect(Object.keys(tree.nodes)).toHaveLength(5)
      expect(tree.nodes[tree.rootId]).toMatchObject({
        label: 'Proto-Indo-European',
        metadata: { source: 'fixture & example' },
      })
      expect(
        Object.values(tree.nodes).find((node) => node.label === 'English'),
      ).toMatchObject({
        branchLength: 0.3,
        metadata: { code: 'eng', confidence: 0.98, attested: true },
      })
    })
  })

  it('loads each sample from the Load example menu and clears selection', async () => {
    mountApp()

    for (const [index, sample] of SAMPLES.entries()) {
      useTreeStore.getState().selectNode(useTreeStore.getState().tree.rootId)
      expect(useTreeStore.getState().selectedNodeId).not.toBeNull()

      fireEvent.click(screen.getByRole('button', { name: 'Load example' }))
      const menuItems = screen.getAllByRole('menuitem')
      expect(menuItems).toHaveLength(SAMPLES.length)
      fireEvent.click(menuItems[index]!)

      const expectedTree = parsePhyloXml(sample.text)
      const expectedRootLabel =
        expectedTree.nodes[expectedTree.rootId]?.label ?? ''

      await waitFor(() => {
        const { tree, selectedNodeId } = useTreeStore.getState()
        expect(selectedNodeId).toBeNull()
        expect(Object.keys(tree.nodes)).toHaveLength(
          Object.keys(expectedTree.nodes).length,
        )
        expect(tree.nodes[tree.rootId]?.label).toBe(expectedRootLabel)
      })
      expect(await screen.findByText(expectedRootLabel)).toBeDefined()
    }
  })

  it('shows a translated dialog for invalid Newick without parser internals', async () => {
    await i18n.changeLanguage('pl')
    const originalTree = useTreeStore.getState().tree
    mountApp()

    importFile(createTextFile('broken.nwk', '(English,Polish'), 'Importuj')

    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('Nie udało się zaimportować pliku')
    expect(dialog.textContent).toContain('broken.nwk')
    expect(dialog.textContent).toContain('Problem występuje w pobliżu znaku')
    expect(dialog.textContent).not.toContain('Expected ")"')
    expect(useTreeStore.getState().tree).toBe(originalTree)
  })

  it('closes the import error dialog and accepts a retried import', async () => {
    mountApp()

    importFile(createTextFile('broken.nwk', '(English,Polish'))
    expect(await screen.findByRole('dialog')).toBeDefined()

    fireEvent.click(screen.getAllByRole('button', { name: 'Close' })[0])
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())

    importFile(
      createTextFile('languages.nwk', '(English:0.4,Polish:0.3)Proto;'),
    )

    await waitFor(() =>
      expect(Object.keys(useTreeStore.getState().tree.nodes)).toHaveLength(3),
    )
  })

  it('exports the tree as a Newick Blob download from the format picker', async () => {
    const createObjectURL = vi
      .fn<(blob: Blob) => string>()
      .mockReturnValue('blob:lexibranch')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        expect(
          document.querySelector<HTMLAnchorElement>('a[download]')?.download,
        ).toBe('tree.nwk')
      })

    mountApp()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    expect(screen.getByRole('combobox', { name: 'File format' })).toBeDefined()
    expect(
      screen.getByText(
        'Newick does not preserve metadata. The downloaded file will only include the tree structure, labels, and branch lengths.',
      ),
    ).toBeDefined()

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    if (blob === undefined) {
      throw new Error('The export Blob was not created.')
    }

    const exportedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    expect(exportedText).toBe(
      '((English:0.4,German:0.4)Germanic:0.8,(Polish:0.4,Russian:0.4)Slavic:0.8)Proto-language;',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:lexibranch'),
    )
  })

  it('exports metadata as NHX from the format picker', async () => {
    const createObjectURL = vi
      .fn<(blob: Blob) => string>()
      .mockReturnValue('blob:lexibranch-nhx')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        expect(
          document.querySelector<HTMLAnchorElement>('a[download]')?.download,
        ).toBe('tree.nhx')
      })

    mountApp()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'File format' }), {
      target: { value: 'nhx' },
    })
    expect(
      screen.queryByText(
        'Newick does not preserve metadata. The downloaded file will only include the tree structure, labels, and branch lengths.',
      ),
    ).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    if (blob === undefined) {
      throw new Error('The NHX export Blob was not created.')
    }

    const exportedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    expect(exportedText).toContain('Germanic:0.8[&&NHX:branch=West Germanic]')
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:lexibranch-nhx'),
    )
  })

  it('exports the tree as phyloXML from the format picker', async () => {
    const createObjectURL = vi
      .fn<(blob: Blob) => string>()
      .mockReturnValue('blob:lexibranch-phyloxml')
    const revokeObjectURL = vi.fn<(url: string) => void>()
    vi.stubGlobal('URL', { createObjectURL, revokeObjectURL })
    const anchorClick = vi
      .spyOn(HTMLAnchorElement.prototype, 'click')
      .mockImplementation(() => {
        expect(
          document.querySelector<HTMLAnchorElement>('a[download]')?.download,
        ).toBe('tree.xml')
      })

    mountApp()

    fireEvent.click(screen.getByRole('button', { name: 'Export' }))
    fireEvent.change(screen.getByRole('combobox', { name: 'File format' }), {
      target: { value: 'phyloxml' },
    })
    expect(screen.queryByText(/Newick does not preserve metadata/u)).toBeNull()

    fireEvent.click(screen.getByRole('button', { name: 'Download' }))

    expect(createObjectURL).toHaveBeenCalledWith(expect.any(Blob))
    expect(anchorClick).toHaveBeenCalledTimes(1)
    const blob = createObjectURL.mock.calls[0]?.[0]
    if (blob === undefined) {
      throw new Error('The phyloXML export Blob was not created.')
    }
    expect(blob.type).toBe('application/xml;charset=utf-8')

    const exportedText = await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve(String(reader.result))
      reader.onerror = () => reject(reader.error)
      reader.readAsText(blob)
    })
    expect(XMLValidator.validate(exportedText)).toBe(true)
    expect(exportedText).toContain('<name>Proto-language</name>')
    expect(exportedText).toContain(
      '<property ref="branch" datatype="xsd:string">West Germanic</property>',
    )
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
    await waitFor(() =>
      expect(revokeObjectURL).toHaveBeenCalledWith('blob:lexibranch-phyloxml'),
    )
  })

  it('renders the node details panel before a node is selected', () => {
    const markup = renderApp()

    expect(markup).toContain('Node details')
    expect(markup).toContain('Select a node to view its details.')
  })

  it('shows the clicked node data in the details panel', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    expect(await screen.findByDisplayValue('West Germanic')).toBeDefined()
    expect(screen.getByText('germanic')).toBeDefined()
  })

  it('replaces the details form when selection changes', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    expect(screen.getAllByText('Edit node')).toHaveLength(1)

    fireEvent.click(screen.getByText('English'))

    expect(screen.getAllByText('Edit node')).toHaveLength(1)
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe(
      'English',
    )
  })

  it('clears the details panel when clicking the empty canvas', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    await screen.findByDisplayValue('West Germanic')

    fireEvent.click(document.querySelector('.react-flow__pane')!)
    await screen.findByText('Select a node to view its details.')
  })

  it('updates the selected node and its branch length on valid edits', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    fireEvent.change(await screen.findByLabelText('Label'), {
      target: { value: 'North Germanic' },
    })
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '1.25' },
    })

    expect(screen.getByText('Germanic')).toBeDefined()
    expect(
      (screen.getByLabelText('Branch length') as HTMLInputElement).value,
    ).toBe('1.25')
    expect(useTreeStore.getState().tree.nodes.germanic).toMatchObject({
      label: 'Germanic',
      branchLength: 0.8,
    })

    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))

    expect(await screen.findByText('North Germanic')).toBeDefined()
    expect(useTreeStore.getState().tree.nodes.germanic).toMatchObject({
      label: 'North Germanic',
      branchLength: 1.25,
    })
  })

  it('keeps the canvas value when an edit is invalid', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    fireEvent.change(await screen.findByLabelText('Label'), {
      target: { value: '' },
    })
    fireEvent.change(screen.getByLabelText('Branch length'), {
      target: { value: '-1' },
    })

    expect(screen.getByText('Label cannot be empty.')).toBeDefined()
    expect(
      screen.getByText(
        'Branch length must be a number between 0 and 1,000,000.',
      ),
    ).toBeDefined()
    fireEvent.click(screen.getByRole('button', { name: 'Save changes' }))
    expect(screen.getByText('Germanic')).toBeDefined()
    expect(useTreeStore.getState().tree.nodes.germanic).toMatchObject({
      label: 'Germanic',
      branchLength: 0.8,
    })
  })

  it('adds a child node to the selected node and re-renders the canvas', async () => {
    mountApp()

    await screen.findByText('Germanic')
    expect(countRenderedNodes()).toBe(7)

    fireEvent.click(screen.getByText('Germanic'))
    fireEvent.click(await screen.findByRole('button', { name: 'Add child' }))

    const { tree, selectedNodeId } = useTreeStore.getState()
    expect(tree.nodes.germanic?.childIds).toHaveLength(3)
    expect(selectedNodeId).not.toBeNull()
    expect(tree.nodes[selectedNodeId ?? '']?.parentId).toBe('germanic')
    await waitFor(() => expect(countRenderedNodes()).toBe(8))
  })

  it('deletes a subtree only after confirmation', async () => {
    mountApp()

    await screen.findByText('German')
    fireEvent.click(screen.getByText('German'))
    fireEvent.click(
      await screen.findByRole('button', { name: 'Delete subtree' }),
    )

    const dialog = await screen.findByRole('dialog')
    expect(dialog.textContent).toContain('permanently delete “German”')

    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }))
    expect(useTreeStore.getState().tree.nodes.german).toBeDefined()
    expect(countRenderedNodes()).toBe(7)

    fireEvent.click(screen.getByRole('button', { name: 'Delete subtree' }))
    fireEvent.click(await screen.findByRole('button', { name: 'Delete' }))

    expect(useTreeStore.getState().tree.nodes.german).toBeUndefined()
    expect(useTreeStore.getState().selectedNodeId).toBe('germanic')
    await waitFor(() => expect(countRenderedNodes()).toBe(6))
  })

  it('moves a subtree onto a parent picked from the canvas', async () => {
    mountApp()

    await screen.findByText('English')
    fireEvent.click(screen.getByText('English'))
    fireEvent.click(await screen.findByRole('button', { name: 'Move subtree' }))

    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByText('Pick a new parent for “English”.')).toBeDefined()

    fireEvent.click(screen.getByText('Slavic'))

    const { tree, pendingMoveNodeId, selectedNodeId } = useTreeStore.getState()
    expect(tree.nodes.english?.parentId).toBe('slavic')
    expect(tree.nodes.slavic?.childIds).toContain('english')
    expect(tree.nodes.germanic?.childIds).not.toContain('english')
    expect(pendingMoveNodeId).toBeNull()
    expect(selectedNodeId).toBe('english')
    expect(screen.queryByRole('status')).toBeNull()
  })

  it('rejects moving a node under its own descendant and keeps the mode', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))
    fireEvent.click(await screen.findByRole('button', { name: 'Move subtree' }))
    await screen.findByRole('status')

    fireEvent.click(screen.getByText('English'))

    expect(
      screen.getByText('“Germanic” cannot be moved under its own descendant.'),
    ).toBeDefined()
    expect(useTreeStore.getState().pendingMoveNodeId).toBe('germanic')
    expect(useTreeStore.getState().selectedNodeId).toBe('germanic')
    expect((screen.getByLabelText('Label') as HTMLInputElement).value).toBe(
      'Germanic',
    )
    expect(useTreeStore.getState().tree.nodes.germanic?.parentId).toBe(
      'proto-language',
    )

    fireEvent.keyDown(window, { key: 'Escape' })
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(useTreeStore.getState().pendingMoveNodeId).toBeNull()
  })

  it('reorders siblings from the details panel', async () => {
    mountApp()

    await screen.findByText('German')
    fireEvent.click(screen.getByText('German'))

    fireEvent.click(await screen.findByRole('button', { name: 'Move up' }))
    expect(useTreeStore.getState().tree.nodes.germanic?.childIds).toEqual([
      'german',
      'english',
    ])

    fireEvent.click(screen.getByRole('button', { name: 'Move down' }))
    expect(useTreeStore.getState().tree.nodes.germanic?.childIds).toEqual([
      'english',
      'german',
    ])
  })

  it('round-trips typed metadata through the store and updates the node badge', async () => {
    mountApp()

    await screen.findByText('Germanic')
    fireEvent.click(screen.getByText('Germanic'))

    fireEvent.change(screen.getByPlaceholderText('New key'), {
      target: { value: 'confidence' },
    })
    fireEvent.change(
      screen.getByLabelText('Type', { selector: '#new-metadata-type' }),
      {
        target: { value: 'number' },
      },
    )
    fireEvent.change(
      screen.getByLabelText('Value', { selector: '#new-metadata-value' }),
      {
        target: { value: '0.98' },
      },
    )
    fireEvent.click(screen.getByRole('button', { name: 'Add metadata' }))

    expect(useTreeStore.getState().tree.nodes.germanic?.metadata).toEqual({
      branch: 'West Germanic',
      confidence: 0.98,
    })
    await waitFor(() => {
      expect(
        document.querySelector(
          '[data-id="germanic"] .phylo-node__metadata-badge',
        )?.textContent,
      ).toBe('2')
    })
  })

  it('disables sidebar editing controls while pendingMoveNodeId is set', async () => {
    mountApp()

    await screen.findByText('English')
    fireEvent.click(screen.getByText('English'))
    fireEvent.click(await screen.findByRole('button', { name: 'Move subtree' }))

    expect(await screen.findByRole('status')).toBeDefined()
    expect(screen.getByLabelText('Label').hasAttribute('disabled')).toBe(true)
    expect(
      screen.getByLabelText('Branch length').hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Save changes' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Add child' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Move subtree' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByRole('button', { name: 'Move up' }).hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Move down' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Delete subtree' })
        .hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen.getByPlaceholderText('New key').hasAttribute('disabled'),
    ).toBe(true)
    expect(
      screen
        .getByRole('button', { name: 'Add metadata' })
        .hasAttribute('disabled'),
    ).toBe(true)

    fireEvent.click(screen.getByText('Slavic'))
    await waitFor(() => expect(screen.queryByRole('status')).toBeNull())
    expect(screen.getByLabelText('Label').hasAttribute('disabled')).toBe(false)
    expect(
      screen
        .getByRole('button', { name: 'Add child' })
        .hasAttribute('disabled'),
    ).toBe(false)
  })
})
