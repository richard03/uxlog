import { describe, it, expect } from 'vitest'
import {
  detectSourceFormat, defaultSourceKind, nameFromFileName, nameFromText, normalizeSourceText,
  decodeHeaderValue, parseEml, emlToSourceText, SOURCE_ACCEPT,
} from './sourceFiles.js'

describe('formát a název zdroje', () => {
  it('rozpozná formát podle přípony', () => {
    expect(detectSourceFormat('Rozhovor.DOCX')).toBe('docx')
    expect(detectSourceFormat('zprava.pdf')).toBe('pdf')
    expect(detectSourceFormat('poznamky.md')).toBe('text')
    expect(detectSourceFormat('a.txt')).toBe('text')
    expect(detectSourceFormat('mail.eml')).toBe('eml')
    expect(detectSourceFormat('obrazek.png')).toBeNull()
    expect(detectSourceFormat('bez-pripony')).toBeNull()
    expect(SOURCE_ACCEPT).toContain('.docx')
  })

  it('výchozí typ zdroje', () => {
    expect(defaultSourceKind('eml')).toBe('email')
    expect(defaultSourceKind('docx')).toBe('document')
    expect(defaultSourceKind(null)).toBe('other')
  })

  it('název z názvu souboru a z vloženého textu', () => {
    expect(nameFromFileName('C:\\x\\Rozhovor_s_Janou.docx')).toBe('Rozhovor s Janou')
    expect(nameFromText('\n\n  Ahoj Petře,\nposílám…')).toBe('Ahoj Petře,')
    expect(nameFromText('x'.repeat(100))).toHaveLength(78)
    expect(nameFromText('')).toBe('')
  })

  it('sjednotí text', () => {
    expect(normalizeSourceText('a  \r\nb\r\n\r\n\r\n\r\nc\u00a0d  ')).toBe('a\nb\n\nc d')
    expect(normalizeSourceText(null)).toBe('')
  })
})

describe('e-mail .eml', () => {
  it('dekóduje kódované hlavičky (Base64 i Quoted-Printable)', () => {
    expect(decodeHeaderValue('=?UTF-8?B?UMWZw61sb2hh?=')).toBe('Příloha')
    expect(decodeHeaderValue('=?utf-8?Q?Sch=C5=AFzka_v_p=C3=A1tek?=')).toBe('Schůzka v pátek')
    expect(decodeHeaderValue('Obyčejný text')).toBe('Obyčejný text')
  })

  it('rozebere jednoduchý e-mail s quoted-printable tělem', () => {
    const raw = [
      'From: Jana <jana@example.com>',
      'To: tym@example.com',
      'Subject: =?utf-8?Q?Zp=C4=9Btn=C3=A1_vazba?=',
      'Date: Tue, 3 Nov 2026 10:00:00 +0100',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: quoted-printable',
      '',
      'Dobr=C3=BD den,',
      'u=C5=BEivatel=C3=A9 cht=C4=9Bj=C3=AD rychlej=C5=A1=C3=AD platbu.',
    ].join('\r\n')
    const mail = parseEml(raw)
    expect(mail).toMatchObject({ subject: 'Zpětná vazba', from: 'Jana <jana@example.com>', to: 'tym@example.com' })
    expect(mail.body).toBe('Dobrý den,\nuživatelé chtějí rychlejší platbu.')
    const text = emlToSourceText(mail, { subject: 'Předmět', from: 'Od', to: 'Komu', date: 'Datum' })
    expect(text.startsWith('Předmět: Zpětná vazba\nOd: Jana <jana@example.com>')).toBe(true)
    expect(text.endsWith('rychlejší platbu.')).toBe(true)
  })

  it('z multipart zprávy vezme text/plain a přeskočí přílohy', () => {
    const raw = [
      'Subject: Test',
      'Content-Type: multipart/mixed; boundary="AAA"',
      '',
      '--AAA',
      'Content-Type: multipart/alternative; boundary="BBB"',
      '',
      '--BBB',
      'Content-Type: text/html; charset=utf-8',
      '',
      '<p>HTML verze</p>',
      '--BBB',
      'Content-Type: text/plain; charset=utf-8',
      'Content-Transfer-Encoding: base64',
      '',
      'UHJvc3TDvSB0ZXh0',
      '--BBB--',
      '--AAA',
      'Content-Type: text/plain',
      'Content-Disposition: attachment; filename="priloha.txt"',
      '',
      'obsah přílohy',
      '--AAA--',
    ].join('\n')
    expect(parseEml(raw).body).toBe('Prostý text')
  })

  it('jen HTML tělo převede na text', () => {
    const raw = 'Subject: H\nContent-Type: text/html\n\n<div>Řádek 1</div><div>Řádek&nbsp;2 &amp; dál</div>'
    expect(parseEml(raw).body).toBe('Řádek 1\nŘádek 2 & dál')
  })

  it('zvládne poškozený vstup', () => {
    expect(parseEml('')).toEqual({ subject: '', from: '', to: '', date: '', body: '' })
    expect(parseEml(null).body).toBe('')
  })
})
