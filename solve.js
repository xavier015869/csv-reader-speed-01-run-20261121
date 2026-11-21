// A fast CSV reader that returns exactly csv-reader 1.0.0's answers.
//
// run(input) reads input {text, header} once, left to right, and answers {columns, rows, errors} under
// csv-reader's broken-row policy:
//   - a U+FEFF at the very start of the text is dropped;
//   - a record ends at LF or CRLF, and a line left with no characters is no record;
//   - outside quotes a CR not followed by LF is dropped (stray_cr);
//   - a field that opens with a quote runs to the next quote that is not doubled ("" inside it is one
//     quote, and each CRLF or lone CR inside it is read as LF); what follows its closing quote, up to the
//     next comma or line break, is appended as it stands (quote_junk, when anything was appended); a
//     quote that never closes is a literal character and the text after it is read again as unquoted
//     (unterminated_quote);
//   - a quote inside an unquoted field is a literal character; fields stay strings, never trimmed;
//   - columns is the first record when header is true, else null; rows holds the records after it (every
//     record when header is false), each padded with "" (short_row) or cut (long_row) to the first
//     record's width;
//   - each error is {code, line, row} in the order met: line the 1-based line its record starts on
//     (every LF, CRLF and lone CR inside quotes counted), row its record's index in rows, null for the
//     header; a record's short_row or long_row comes when the record ends.
//
// Where the reference builds every field a character at a time, this reader copies each field out of
// the text with one slice whenever the field holds no character that needs rewriting (the common case),
// and only stitches segments together for the rare field that drops a stray CR, doubles a quote or
// normalises a line break inside quotes. The scan itself is a single pass over char codes.

/** How a field ended: at a comma (the record goes on), at a line break or at the end of the text. */
const COMMA = 0;
const BREAK = 1;
const END = 2;

/** csv-reader's answer for one case's input {text, header}: {columns, rows, errors}. */
export function run(input) {
  const text = String(input.text);
  const header = input.header === true;
  const n = text.length;
  const errors = [];
  const rows = [];
  let columns = null;
  let width = -1;

  let pos = 0; // the next character to read
  let line = 1; // the line that character is on
  if (text.charCodeAt(0) === 0xFEFF) pos = 1;

  while (true) {
    // Lines with no characters are no records.
    while (pos < n) {
      const c = text.charCodeAt(pos);
      if (c === 10) {
        pos += 1;
        line += 1;
      } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
        pos += 2;
        line += 1;
      } else {
        break;
      }
    }
    if (pos >= n) break;

    // The record being read: the line it starts on and the index in rows it takes (null: the header).
    const recordLine = line;
    const recordRow = header && columns === null ? null : rows.length;
    const fields = [];
    let quoted = false;
    let ended = END;

    do {
      quoted = text.charCodeAt(pos) === 34;
      ended = END;
      let value = '';
      let parts = null; // value segments, when the value is not one slice of the text
      let segStart = pos; // where the current plain segment starts
      let kept = 0; // characters an unquoted scan kept (decides quote_junk)
      let junkCheck = false; // this scan reads junk after a closing quote
      let scan = true; // the unquoted scan below still has to run

      if (quoted) {
        const open = pos;
        const openLine = line;
        pos += 1;
        segStart = pos;
        let closed = false;
        while (pos < n) {
          const c = text.charCodeAt(pos);
          if (c === 34) {
            if (text.charCodeAt(pos + 1) === 34) {
              if (parts === null) parts = [];
              parts.push(text.slice(segStart, pos), '"');
              pos += 2;
              segStart = pos;
              continue;
            }
            value = parts === null ? text.slice(segStart, pos) : (parts.push(text.slice(segStart, pos)), parts.join(''));
            pos += 1;
            closed = true;
            break;
          }
          if (c === 13) {
            // CRLF and a lone CR inside quotes are each one LF.
            if (parts === null) parts = [];
            parts.push(text.slice(segStart, pos), '\n');
            pos += text.charCodeAt(pos + 1) === 10 ? 2 : 1;
            line += 1;
            segStart = pos;
            continue;
          }
          if (c === 10) line += 1;
          pos += 1;
        }
        if (!closed) {
          // The quote never closes: it is a literal character, and the text after it is read again
          // as unquoted, from the character after the quote, on the line the quote opened on.
          errors.push({ code: 'unterminated_quote', line: recordLine, row: recordRow });
          pos = open + 1;
          line = openLine;
          parts = ['"'];
          segStart = pos;
        } else if (pos >= n) {
          ended = END;
          scan = false;
        } else {
          const c = text.charCodeAt(pos);
          if (c === 44) {
            pos += 1;
            ended = COMMA;
            scan = false;
          } else if (c === 10) {
            pos += 1;
            line += 1;
            ended = BREAK;
            scan = false;
          } else if (c === 13 && text.charCodeAt(pos + 1) === 10) {
            pos += 2;
            line += 1;
            ended = BREAK;
            scan = false;
          } else {
            // What follows the closing quote is appended as it stands: read on as unquoted.
            parts = [value];
            segStart = pos;
            junkCheck = true;
          }
        }
      }

      if (scan) {
        // Unquoted characters up to the next comma or line break: a CR not followed by LF is dropped
        // (stray_cr). The value is one slice of the text unless a stray CR cut it into segments.
        let endPos = n;
        while (pos < n) {
          const c = text.charCodeAt(pos);
          if (c === 44) {
            endPos = pos;
            pos += 1;
            ended = COMMA;
            break;
          }
          if (c < 14) {
            if (c === 10) {
              endPos = pos;
              pos += 1;
              line += 1;
              ended = BREAK;
              break;
            }
            if (c === 13) {
              if (text.charCodeAt(pos + 1) === 10) {
                endPos = pos;
                pos += 2;
                line += 1;
                ended = BREAK;
                break;
              }
              errors.push({ code: 'stray_cr', line: recordLine, row: recordRow });
              if (parts === null) parts = [];
              parts.push(text.slice(segStart, pos));
              kept += pos - segStart;
              pos += 1;
              segStart = pos;
              continue;
            }
          }
          pos += 1;
        }
        if (parts === null) {
          value = text.slice(segStart, endPos);
        } else {
          parts.push(text.slice(segStart, endPos));
          kept += endPos - segStart;
          value = parts.join('');
        }
        if (junkCheck && kept > 0) {
          errors.push({ code: 'quote_junk', line: recordLine, row: recordRow });
        }
      }

      fields.push(value);
    } while (ended === COMMA);

    // A line that held only stray CRs is left with no characters: no record (its stray_cr errors stay).
    if (fields.length === 1 && fields[0] === '' && !quoted) continue;

    if (width < 0) width = fields.length;
    if (header && columns === null) {
      columns = fields;
      continue;
    }
    if (fields.length < width) {
      errors.push({ code: 'short_row', line: recordLine, row: recordRow, fields: fields.length });
      while (fields.length < width) fields.push('');
    } else if (fields.length > width) {
      errors.push({ code: 'long_row', line: recordLine, row: recordRow, extra: fields.splice(width) });
    }
    rows.push(fields);
  }
  return { columns: header ? (columns ?? []) : null, rows, errors };
}
