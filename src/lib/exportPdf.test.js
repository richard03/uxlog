/**
 * Unit testy pro PDF export konkurence.
 */

import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock jsPDF before importing the module
const mockSave = vi.fn()
const mockText = vi.fn()
const mockAddPage = vi.fn()
const mockSetFontSize = vi.fn()
const mockSetFont = vi.fn()
const mockSetTextColor = vi.fn()
const mockSetDrawColor = vi.fn()
const mockSetLineWidth = vi.fn()
const mockLine = vi.fn()
const mockAddFileToVFS = vi.fn()
const mockAddFont = vi.fn()
const mockSplitTextToSize = vi.fn((text) => [text])

vi.mock('jspdf', () => ({
  jsPDF: vi.fn(() => ({
    save: mockSave,
    text: mockText,
    addPage: mockAddPage,
    setFontSize: mockSetFontSize,
    setFont: mockSetFont,
    setTextColor: mockSetTextColor,
    setDrawColor: mockSetDrawColor,
    setLineWidth: mockSetLineWidth,
    line: mockLine,
    addFileToVFS: mockAddFileToVFS,
    addFont: mockAddFont,
    splitTextToSize: mockSplitTextToSize,
    internal: { pageSize: { getHeight: () => 297 } },
  })),
}))

vi.mock('./pdfFonts.js', () => ({
  loadRobotoFonts: vi.fn(async () => ({ regular: 'mockBase64Regular', bold: 'mockBase64Bold' })),
  registerFonts: vi.fn(),
}))

import { exportCompetitionPdf } from './exportPdf.js'

const LABELS = {
  title: 'Analýza konkurence',
  description: 'Popis',
  strengths: 'Silné stránky',
  weaknesses: 'Slabé stránky',
  inspiration: 'Inspirace',
  noData: 'Žádné záznamy',
}

describe('exportCompetitionPdf', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('generuje PDF s titulní stránkou a uloží soubor', async () => {
    await exportCompetitionPdf({
      competitions: [
        { name: 'Competitor A', url: 'https://a.com', description: 'Desc A', strengths: 'Strong', weaknesses: 'Weak', inspiration: 'Inspire' },
      ],
      projectName: 'Testovací projekt',
      labels: LABELS,
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockSave.mock.calls[0][0]).toMatch(/\.pdf$/)
    expect(mockAddPage).toHaveBeenCalled()
  })

  it('zobrazí zprávu o prázdných datech pokud nejsou konkurenti', async () => {
    await exportCompetitionPdf({
      competitions: [],
      projectName: 'Prázdný projekt',
      labels: LABELS,
    })

    expect(mockSave).toHaveBeenCalledTimes(1)
    expect(mockText).toHaveBeenCalledWith('Žádné záznamy', expect.any(Number), expect.any(Number))
  })

  it('vytvoří novou stránku pro každého konkurenta', async () => {
    await exportCompetitionPdf({
      competitions: [
        { name: 'A', url: '', description: '', strengths: '', weaknesses: '', inspiration: '' },
        { name: 'B', url: '', description: '', strengths: '', weaknesses: '', inspiration: '' },
        { name: 'C', url: '', description: '', strengths: '', weaknesses: '', inspiration: '' },
      ],
      projectName: 'Multi',
      labels: LABELS,
    })

    // 3 competitors = 3 addPage calls (one per competitor)
    expect(mockAddPage).toHaveBeenCalledTimes(3)
  })

  it('sanitizuje název souboru', async () => {
    await exportCompetitionPdf({
      competitions: [],
      projectName: 'Projekt / test <special>',
      labels: LABELS,
    })

    const filename = mockSave.mock.calls[0][0]
    expect(filename).not.toMatch(/[/<>]/)
    expect(filename).toMatch(/-konkurence\.pdf$/)
  })
})
