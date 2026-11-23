/** Wrap measured text, preserving paragraph breaks and splitting long URLs safely. */
export function wrapText(
  text: string,
  maxWidth: number,
  measure: (text: string) => number,
): string[] {
  const result: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (!paragraph.trim()) {
      result.push('');
      continue;
    }
    let line = '';
    for (const word of paragraph.trim().split(/\s+/)) {
      if (measure(word) > maxWidth) {
        if (line) {
          result.push(line);
        }
        let chunk = '';
        for (const char of word) {
          if (chunk && measure(chunk + char) > maxWidth) {
            result.push(chunk);
            chunk = '';
          }
          chunk += char;
        }
        line = chunk;
      } else if (line && measure(`${line} ${word}`) > maxWidth) {
        result.push(line);
        line = word;
      } else line = line ? `${line} ${word}` : word;
    }
    if (line) result.push(line);
  }
  return result;
}
