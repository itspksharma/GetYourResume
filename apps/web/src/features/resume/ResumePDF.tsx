import { PDFDocument, PDFString, rgb, type PDFFont, type PDFPage } from 'pdf-lib';
import fontkit from '@pdf-lib/fontkit';
import { sectionLabels, type ResumeVersion, type Entry } from '@gyr/shared';
import { normalizeBasePath } from '../../../base-path';
import { PDF_MARGIN, PDF_BODY_SIZE } from './templates';
import { wrapText } from './pdf-layout';

const black = rgb(0, 0, 0);
const fontBytes = new Map<string, Promise<ArrayBuffer>>();
function loadFont(name: string) {
  const url = `${normalizeBasePath(import.meta.env.BASE_URL)}fonts/${name}.ttf`;
  if (!fontBytes.has(url))
    fontBytes.set(
      url,
      fetch(url)
        .then((r) => {
          if (!r.ok)
            throw new Error(
              'The resume font could not be loaded. Please check your connection and retry.',
            );
          return r.arrayBuffer();
        })
        .catch((error) => {
          fontBytes.delete(url);
          throw error;
        }),
    );
  return fontBytes.get(url)!;
}
type TextStyle = {
  font?: PDFFont;
  size?: number;
  indent?: number;
  align?: 'left' | 'center';
  link?: string;
  gap?: number;
};

/** Measured text layout: every line is placed explicitly inside the page margins. */
export async function resumeBlob(v: ResumeVersion): Promise<Blob> {
  const prefix = v.template === 'classic' ? 'LiberationSerif' : 'LiberationSans';
  const doc = await PDFDocument.create();
  doc.registerFontkit(fontkit);
  const buffers = await Promise.all(
    ['Regular', 'Bold', 'Italic'].map((weight) => loadFont(`${prefix}-${weight}`)),
  );
  const [regular, bold, italic] = await Promise.all(
    buffers.map((bytes) => doc.embedFont(bytes, { subset: true })),
  );
  const supported = new Set(regular.getCharacterSet());
  const dimensions: [number, number] = v.paper === 'Letter' ? [612, 792] : [595.28, 841.89];
  const margin = PDF_MARGIN;
  const width = dimensions[0] - margin * 2;
  const usableHeight = dimensions[1] - margin * 2;
  const body = PDF_BODY_SIZE;
  const leading = v.template === 'developer' ? 1.4 : 1.45;
  let page!: PDFPage;
  let cursor = 0;
  const newPage = () => {
    page = doc.addPage(dimensions);
    cursor = dimensions[1] - margin;
  };
  const ensure = (height: number) => {
    if (cursor - Math.min(height, usableHeight) < margin) newPage();
  };
  newPage();
  const clean = (text: string) => {
    const value = [...text.replace(/\r\n?/g, '\n').replace(/\t/g, '    ')]
      .filter((char) => char === '\n' || char.codePointAt(0)! >= 32)
      .join('');
    const missing = [
      ...new Set([...value].filter((c) => c !== '\n' && !supported.has(c.codePointAt(0)!))),
    ];
    if (missing.length)
      throw new Error(
        `The selected resume font does not support these characters: ${missing.slice(0, 8).join(' ')}. Please use supported text before downloading; your saved content has not changed.`,
      );
    return value;
  };
  const lines = (text: string, font = regular, size = body, maxWidth = width) =>
    wrapText(clean(text), maxWidth, (s) => font.widthOfTextAtSize(s, size));
  const link = (url: string, x: number, y: number, lineWidth: number, size: number) => {
    const annotation = doc.context.obj({
      Type: 'Annot',
      Subtype: 'Link',
      Rect: [x, y - 2, x + lineWidth, y + size],
      Border: [0, 0, 0],
      A: { Type: 'Action', S: 'URI', URI: PDFString.of(url) },
    });
    page.node.addAnnot(doc.context.register(annotation));
  };
  function drawLine(text: string, style: TextStyle = {}) {
    const font = style.font || regular;
    const size = style.size || body;
    const height = size * leading;
    ensure(height);
    const lineWidth = font.widthOfTextAtSize(text, size);
    const x =
      style.align === 'center' ? margin + (width - lineWidth) / 2 : margin + (style.indent || 0);
    const y = cursor - size;
    page.drawText(text, { x, y, font, size, color: black });
    if (style.link) link(style.link, x, y, lineWidth, size);
    cursor -= height;
  }
  function paragraph(text: string, style: TextStyle = {}) {
    if (!text.trim()) return;
    const font = style.font || regular;
    const size = style.size || body;
    const rows = lines(text, font, size, width - (style.indent || 0));
    // Keep short paragraphs/bullets together; longer ones continue safely.
    ensure(Math.min(rows.length, 3) * size * leading);
    for (let i = 0; i < rows.length; i++) {
      if (rows.length - i === 2) ensure(2 * size * leading);
      drawLine(rows[i], style);
    }
    cursor -= style.gap ?? 4;
  }
  function sectionHeading(title: string, reserve = body * leading * 2) {
    const gap = v.template === 'developer' ? 11 : 15;
    ensure(gap + body * leading + 11 + Math.min(reserve, usableHeight / 2));
    cursor -= gap;
    drawLine(title.toUpperCase(), { font: bold });
    cursor -= 4;
    page.drawLine({
      start: { x: margin, y: cursor },
      end: { x: margin + width, y: cursor },
      thickness: 0.45,
      color: rgb(0.35, 0.35, 0.35),
    });
    cursor -= 8;
  }
  function entryHeader(e: Entry) {
    const dates = [e.start, e.end].filter(Boolean).join(' - ');
    const dateWidth = dates ? Math.min(155, width * 0.34) : 0;
    const titleWidth = dates ? width - dateWidth - 14 : width;
    const titles = lines(e.title, bold, body, titleWidth);
    const dateLines = dates ? lines(dates, regular, 10, dateWidth) : [];
    const meta = [e.organization, e.location].filter(Boolean).join(' | ');
    const estimated =
      Math.max(titles.length, dateLines.length) * body * leading +
      (meta ? lines(meta, italic, 10).length * 10 * leading : 0) +
      (e.url ? lines(e.url, regular, 10).length * 10 * leading : 0) +
      body * leading;
    return { dates, titleWidth, titles, dateLines, meta, estimated };
  }
  function entry(e: Entry) {
    const h = entryHeader(e);
    ensure(Math.min(h.estimated, usableHeight * 0.6));
    cursor -= 3;
    for (let i = 0; i < Math.max(h.titles.length, h.dateLines.length); i++) {
      ensure(body * leading);
      const y = cursor - body;
      if (h.titles[i])
        page.drawText(h.titles[i], { x: margin, y, size: body, font: bold, color: black });
      if (h.dateLines[i])
        page.drawText(h.dateLines[i], {
          x: margin + width - regular.widthOfTextAtSize(h.dateLines[i], 10),
          y: y + 1,
          size: 10,
          font: regular,
          color: black,
        });
      cursor -= body * leading;
    }
    if (h.meta) paragraph(h.meta, { font: italic, size: 10, gap: 2 });
    if (e.url) paragraph(e.url, { size: 10, link: e.url, gap: 2 });
    for (const item of e.description
      .split('\n')
      .map((s) => s.replace(/^\s*[•*-]\s*/, '').trim())
      .filter(Boolean)) {
      const rows = lines(item, regular, body, width - 13);
      ensure(Math.min(rows.length, 3) * body * leading);
      for (let i = 0; i < rows.length; i++) {
        ensure(body * leading);
        if (i === 0)
          page.drawText('•', {
            x: margin,
            y: cursor - body,
            font: regular,
            size: body,
            color: black,
          });
        drawLine(rows[i], { indent: 13 });
      }
      cursor -= 3;
    }
    cursor -= 5;
  }
  const p = v.profile;
  const align = v.template === 'classic' ? 'center' : 'left';
  paragraph(p.personal.name || 'Your name', { font: bold, size: 23, align, gap: 5 });
  paragraph(p.personal.title, { size: 12, align, gap: 3 });
  paragraph([p.personal.email, p.personal.phone, p.personal.location].filter(Boolean).join(' | '), {
    size: 10,
    align,
    gap: 2,
  });
  for (const key of ['linkedin', 'github', 'portfolio'] as const)
    if (p.personal[key])
      paragraph(p.personal[key], { size: 10, align, link: p.personal[key], gap: 1 });
  cursor -= 8;
  ensure(4);
  page.drawLine({
    start: { x: margin, y: cursor },
    end: { x: margin + width, y: cursor },
    thickness: v.template === 'modern' ? 1 : 0.7,
    color: black,
  });
  cursor -= 3;
  for (const s of [...new Set(v.sections)].filter((s) => !v.hidden.includes(s))) {
    if (s === 'summary') {
      if (p.summary || p.objective) {
        sectionHeading(sectionLabels[s]);
        paragraph(p.summary || p.objective);
      }
      continue;
    }
    if (s === 'skills') {
      if (p.technicalSkills.length || p.softSkills.length) {
        sectionHeading(sectionLabels[s]);
        paragraph(p.technicalSkills.join(' · '));
        paragraph(p.softSkills.join(' · '));
      }
      continue;
    }
    const entries = p[s].filter((e) => e.title || e.organization || e.description || e.url);
    if (!entries.length) continue;
    sectionHeading(sectionLabels[s], entryHeader(entries[0]).estimated + 4);
    for (const e of entries) entry(e);
  }
  doc.setTitle(`${p.personal.name || 'Professional'} Resume`);
  if (p.personal.name) doc.setAuthor(p.personal.name);
  const bytes = await doc.save({ useObjectStreams: false });
  const data = new Uint8Array(bytes.length);
  data.set(bytes);
  return new Blob([data], { type: 'application/pdf' });
}
export async function downloadResume(version: ResumeVersion) {
  const blob = await resumeBlob(version);
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `${version.name.replace(/[^\p{L}\p{N} _-]/gu, '').trim() || 'Resume'}.pdf`;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
