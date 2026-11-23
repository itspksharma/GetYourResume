import { useState } from 'react';
import { Upload, FileJson, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { download, exportWorkspace, useWorkspace } from '@/lib/store';

export function ImportPanel() {
  const restore = useWorkspace((s) => s.importData);
  const [raw, setRaw] = useState('');
  const [isJSON, setIsJSON] = useState(false);
  const [message, setMessage] = useState('');
  const [busy, setBusy] = useState(false);
  async function read(file: File) {
    setMessage('');
    setRaw('');
    setBusy(true);
    try {
      if (file.size > 5 * 1024 * 1024) throw new Error('Choose a file smaller than 5 MB.');
      const ext = file.name.split('.').pop()?.toLowerCase();
      setIsJSON(ext === 'json');
      if (ext === 'json') setRaw(await file.text());
      else if (ext === 'pdf') {
        const pdfjs = await import('pdfjs-dist');
        const worker = await import('pdfjs-dist/build/pdf.worker.min.mjs?url');
        pdfjs.GlobalWorkerOptions.workerSrc = worker.default;
        const loading = pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
        try {
          const pdf = await loading.promise;
          if (pdf.numPages > 20) throw new Error('Please import a resume of 20 pages or fewer.');
          let text = '';
          for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const content = await page.getTextContent();
            text +=
              content.items
                .map((item) =>
                  'str' in item ? item.str + ('hasEOL' in item && item.hasEOL ? '\n' : ' ') : '',
                )
                .join('') + '\n\n';
            if (text.length > 60000) throw new Error('This PDF contains too much text.');
          }
          if (text.trim().length < 30)
            throw new Error(
              'This looks like a scanned or image-only PDF. OCR is not supported. Please enter your details using the guided profile.',
            );
          setRaw(text.trim());
        } finally {
          await loading.destroy();
        }
      } else if (ext === 'docx') {
        const mammoth = await import('mammoth/mammoth.browser');
        const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
        if (!result.value.trim())
          throw new Error('No readable text was found. Use the guided profile instead.');
        if (result.value.length > 60000) throw new Error('This document contains too much text.');
        setRaw(result.value);
      } else throw new Error('Choose a GetYourResume JSON backup, text-based PDF, or DOCX.');
    } catch (e) {
      setMessage(
        e instanceof Error ? e.message : 'Could not read this file. Your profile has not changed.',
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <div className="stack">
      <div className="section-line">
        <h3>
          <Upload size={18} />
          Bring your experience with you
        </h3>
        <Button variant="outline" size="sm" onClick={exportWorkspace}>
          <FileJson size={15} />
          Export backup
        </Button>
      </div>
      <p>
        Restore a JSON backup or extract text from an existing resume. Files are processed in your
        browser.
      </p>
      <label className="upload-area">
        <Upload size={26} />
        <strong>{busy ? 'Reading your file…' : 'Choose JSON, PDF, or DOCX'}</strong>
        <span>Up to 5 MB · PDF text extraction supports up to 20 pages</span>
        <input
          type="file"
          accept=".json,.pdf,.docx"
          disabled={busy}
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) void read(f);
            e.target.value = '';
          }}
        />
      </label>
      {message && (
        <div className="notice warning" role="status">
          {message}
        </div>
      )}
      {raw && (
        <div className="stack">
          <label className="field">
            {isJSON ? 'Backup preview' : 'Extracted text — verify carefully'}
            <textarea
              rows={9}
              value={raw}
              onChange={(e) => setRaw(e.target.value)}
              maxLength={isJSON ? 5000000 : 60000}
            />
          </label>
          {isJSON ? (
            <>
              <p>
                Restoring replaces this workspace. The previous stored data is kept as a recovery
                copy. Export a backup first.
              </p>
              <Button
                onClick={() => {
                  if (
                    window.confirm(
                      'Replace this workspace with the selected backup? Export your current work first.',
                    )
                  ) {
                    try {
                      restore(raw);
                      setMessage('Backup restored successfully.');
                      setRaw('');
                    } catch (e) {
                      setMessage(
                        e instanceof Error ? e.message : 'Restore failed. Current data kept.',
                      );
                    }
                  }
                }}
              >
                Restore this backup
              </Button>
            </>
          ) : (
            <>
              <div className="notice">
                Text extraction does not reliably identify fields. Review this text and copy the
                correct details into the guided profile. Nothing has been added or overwritten.
              </div>
              <Button
                variant="outline"
                onClick={() => download('GetYourResume-extracted.txt', raw, 'text/plain')}
              >
                <FileText size={16} />
                Download extracted text
              </Button>
            </>
          )}
        </div>
      )}
    </div>
  );
}
