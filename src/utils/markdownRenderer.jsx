import React from 'react';

export const MarkdownRenderer = ({ content }) => {
  if (!content) return null;

  // Split content by lines
  const lines = content.split('\n');
  const renderedElements = [];
  
  let inList = false;
  let listItems = [];
  let inCodeBlock = false;
  let codeLines = [];
  let codeLang = '';
  
  let inTable = false;
  let tableHeaders = [];
  let tableRows = [];

  const flushList = (key) => {
    if (listItems.length > 0) {
      renderedElements.push(
        <ul key={`ul-${key}`} className="markdown-ul">
          {listItems.map((item, idx) => (
            <li key={`li-${key}-${idx}`}>{renderInline(item)}</li>
          ))}
        </ul>
      );
      listItems = [];
      inList = false;
    }
  };

  const flushTable = (key) => {
    if (tableHeaders.length > 0 || tableRows.length > 0) {
      renderedElements.push(
        <div key={`table-container-${key}`} className="markdown-table-container">
          <table className="markdown-table">
            {tableHeaders.length > 0 && (
              <thead>
                <tr>
                  {tableHeaders.map((h, idx) => (
                    <th key={`th-${key}-${idx}`}>{renderInline(h)}</th>
                  ))}
                </tr>
              </thead>
            )}
            <tbody>
              {tableRows.map((row, rowIdx) => (
                <tr key={`tr-${key}-${rowIdx}`}>
                  {row.map((cell, cellIdx) => (
                    <td key={`td-${key}-${rowIdx}-${cellIdx}`}>{renderInline(cell)}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      );
      tableHeaders = [];
      tableRows = [];
      inTable = false;
    }
  };

  const flushCodeBlock = (key) => {
    if (codeLines.length > 0) {
      renderedElements.push(
        <pre key={`code-${key}`} className="markdown-pre">
          <div className="markdown-code-header">{codeLang || 'text'}</div>
          <code className="markdown-code">{codeLines.join('\n')}</code>
        </pre>
      );
      codeLines = [];
      inCodeBlock = false;
    }
  };

  // Helper to parse bold, code spans, etc. in a line
  const renderInline = (text) => {
    if (!text) return '';
    
    // Replace markdown formatting with React elements
    // Split by code tags `code`
    const parts = [];
    let currentText = text;
    
    // Regex for inline code `code`
    const inlineCodeRegex = /`([^`]+)`/g;
    // Regex for bold **bold**
    const boldRegex = /\*\*([^*]+)\*\*/g;
    
    // For simplicity, we process inline formatting by parsing nested structures
    // Let's do a simple replacement check
    // We can split text by segments of formatting
    let lastIndex = 0;
    
    // Combine bold and code regexes or parse sequentially
    // Let's do a simple helper for bold and code
    // Standard text tokenization:
    // We'll replace bold with <strong> and code with <code> using dangerouslySetInnerHTML for inline text
    // to keep it simple but safe from XSS by escaping first.
    
    const escapeHtml = (unsafe) => {
      return unsafe
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
    };

    let html = escapeHtml(text);
    // Replace **text** with <strong>text</strong>
    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    // Replace *text* with <em>text</em>
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');
    // Replace `text` with <code class="inline-code">text</code>
    html = html.replace(/`([^`]+)`/g, '<code class="inline-code">$1</code>');

    return <span dangerouslySetInnerHTML={{ __html: html }} />;
  };

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();

    // 1. Handle Code Blocks
    if (trimmed.startsWith('```')) {
      if (inCodeBlock) {
        flushCodeBlock(i);
      } else {
        flushList(i);
        flushTable(i);
        inCodeBlock = true;
        codeLang = trimmed.substring(3).trim();
      }
      continue;
    }

    if (inCodeBlock) {
      codeLines.push(line);
      continue;
    }

    // 2. Handle horizontal rules
    if (trimmed === '---' || trimmed === '***' || trimmed === '___') {
      flushList(i);
      flushTable(i);
      renderedElements.push(<hr key={`hr-${i}`} className="markdown-hr" />);
      continue;
    }

    // 3. Handle Headers
    if (trimmed.startsWith('#')) {
      flushList(i);
      flushTable(i);
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.substring(level).trim();
      const Tag = `h${Math.min(level, 6)}`;
      renderedElements.push(
        <Tag key={`h-${i}`} className={`markdown-${Tag}`}>
          {renderInline(text)}
        </Tag>
      );
      continue;
    }

    // 4. Handle blockquotes
    if (trimmed.startsWith('>')) {
      flushList(i);
      flushTable(i);
      const text = line.substring(line.indexOf('>') + 1).trim();
      
      // Check if it's a GitHub style callout: [!NOTE], [!IMPORTANT], etc.
      let alertClass = '';
      let alertTitle = '';
      let cleanText = text;

      if (text.startsWith('[!NOTE]')) {
        alertClass = 'alert-note';
        alertTitle = '筆記';
        cleanText = text.substring(7).trim();
      } else if (text.startsWith('[!IMPORTANT]')) {
        alertClass = 'alert-important';
        alertTitle = '重要常考';
        cleanText = text.substring(12).trim();
      } else if (text.startsWith('[!WARNING]')) {
        alertClass = 'alert-warning';
        alertTitle = '注意陷阱';
        cleanText = text.substring(10).trim();
      }

      if (alertClass) {
        renderedElements.push(
          <div key={`alert-${i}`} className={`markdown-alert ${alertClass}`}>
            <div className="alert-header">{alertTitle}</div>
            <div className="alert-body">{renderInline(cleanText)}</div>
          </div>
        );
      } else {
        renderedElements.push(
          <blockquote key={`quote-${i}`} className="markdown-blockquote">
            {renderInline(text)}
          </blockquote>
        );
      }
      continue;
    }

    // 5. Handle Lists
    if (trimmed.startsWith('- ') || trimmed.startsWith('* ') || trimmed.startsWith('+ ')) {
      flushTable(i);
      inList = true;
      listItems.push(trimmed.substring(2));
      continue;
    }

    // 6. Handle Tables
    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      flushList(i);
      const cells = trimmed.split('|').slice(1, -1).map(c => c.trim());
      
      // Check if this is a separator line like |---|---|
      const isSeparator = cells.every(c => /^:?-+:?$/.test(c));
      
      if (isSeparator) {
        // Just skip separator lines, they configure alignment usually but we simplify
        continue;
      }

      if (!inTable) {
        inTable = true;
        tableHeaders = cells;
      } else {
        tableRows.push(cells);
      }
      continue;
    }

    // If we were in a table and this line is not part of a table, flush it
    if (inTable && !trimmed.startsWith('|')) {
      flushTable(i);
    }

    // If we were in a list and this line is not part of a list, flush it
    if (inList && !trimmed.startsWith('- ') && !trimmed.startsWith('* ') && !trimmed.startsWith('+ ')) {
      flushList(i);
    }

    // 7. Regular paragraphs
    if (trimmed.length > 0) {
      renderedElements.push(
        <p key={`p-${i}`} className="markdown-p">
          {renderInline(line)}
        </p>
      );
    } else {
      // Empty line, add a spacer
      renderedElements.push(<div key={`space-${i}`} className="markdown-spacer" />);
    }
  }

  // Flush any remaining active blocks
  flushList(lines.length);
  flushTable(lines.length);
  flushCodeBlock(lines.length);

  return <div className="markdown-rendered-content">{renderedElements}</div>;
};
