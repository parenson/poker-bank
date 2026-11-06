/**
 * printReport.js
 * Opens a print window. iOS Safari names the saved PDF after the <title> tag.
 * The @page CSS suppresses the browser-printed URL header/footer.
 */
export function printReport(title, rows, filename) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups to generate the PDF.')
    return
  }

  // Use filename as the document title so iOS names the PDF correctly.
  // Strip spaces/special chars for a clean filename.
  const safeTitle = (filename || title).replace(/[^a-zA-Z0-9_\-\s]/g, '').trim()

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${safeTitle}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }

  /* Hide browser-generated URL header/footer in print */
  @page {
    size: auto;
    margin: 12mm 14mm 12mm 14mm;
  }
  @page :first { margin-top: 10mm; }

  /* Force Safari to suppress running heads */
  html {
    -webkit-print-color-adjust: exact;
    print-color-adjust: exact;
  }

  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px; color: #111; background: #fff;
    padding: 16px;
  }
  h1 { font-size: 18px; font-weight: 700; margin-bottom: 4px; }
  .subtitle { font-size: 12px; color: #666; margin-bottom: 16px; }
  .section { margin-bottom: 20px; }
  .section-title {
    font-size: 13px; font-weight: 700; text-transform: uppercase;
    letter-spacing: 0.06em; color: #444;
    border-bottom: 1px solid #ddd; padding-bottom: 4px; margin-bottom: 8px;
  }
  table { width: 100%; border-collapse: collapse; font-size: 12px; }
  th {
    text-align: left; font-weight: 600; font-size: 11px;
    text-transform: uppercase; letter-spacing: 0.04em;
    color: #555; border-bottom: 1px solid #ccc; padding: 4px 6px;
  }
  th.right, td.right { text-align: right; }
  td { padding: 5px 6px; border-bottom: 1px solid #eee; }
  tr:last-child td { border-bottom: none; }
  .win  { color: #1a7a3a; font-weight: 600; }
  .loss { color: #c0392b; font-weight: 600; }
  .even { color: #7a6020; }
  .total-row td { font-weight: 700; border-top: 1.5px solid #bbb; background: #f8f8f8; }

  .toolbar {
    position: sticky; top: 0; z-index: 10;
    display: flex; gap: 8px; flex-wrap: wrap;
    background: #fff; padding: 0 0 12px; margin-bottom: 8px;
    border-bottom: 1px solid #ddd;
  }
  .toolbar button {
    flex: 1 1 auto; padding: 10px 14px; font-size: 14px; font-weight: 600;
    border: 1px solid #2a6b3f; border-radius: 8px;
    background: #2a6b3f; color: #fff; cursor: pointer;
  }
  .toolbar button.secondary { background: #fff; color: #2a6b3f; }
  .toast { font-size: 12px; color: #1a7a3a; width: 100%; min-height: 14px; }

  @media print {
    .toolbar { display: none; }
    /* Prevent orphaned section headers */
    .section { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
<div class="toolbar">
  <button id="pb-print">Print / Save PDF</button>
  <button id="pb-share" class="secondary">Share</button>
  <button id="pb-copy" class="secondary">Copy</button>
  <div class="toast" id="pb-toast"></div>
</div>
<div id="pb-report">
${rows}
</div>
<script>
  var REPORT_TITLE = ${JSON.stringify(safeTitle)};

  // Plain-text version of the report, used for Share and Copy.
  function reportText() {
    var out = [];
    var root = document.getElementById('pb-report');
    var h1 = root.querySelector('h1');
    if (h1) out.push(h1.textContent.trim());
    var sub = root.querySelector('.subtitle');
    if (sub) out.push(sub.textContent.replace(/\\s+/g, ' ').trim());
    var sections = root.querySelectorAll('.section');
    for (var i = 0; i < sections.length; i++) {
      out.push('');
      var t = sections[i].querySelector('.section-title');
      if (t) out.push(t.textContent.replace(/\\s+/g, ' ').trim());
      var p = sections[i].querySelector('p');
      if (p) out.push(p.textContent.replace(/\\s+/g, ' ').trim());
      var rowsEl = sections[i].querySelectorAll('tr');
      for (var r = 0; r < rowsEl.length; r++) {
        var cells = rowsEl[r].querySelectorAll('th,td');
        var parts = [];
        for (var c = 0; c < cells.length; c++) parts.push(cells[c].textContent.replace(/\\s+/g, ' ').trim());
        out.push(parts.join('  |  '));
      }
    }
    return out.join('\\n');
  }

  function toast(msg) {
    var el = document.getElementById('pb-toast');
    el.textContent = msg;
    setTimeout(function() { el.textContent = ''; }, 2500);
  }

  document.getElementById('pb-print').onclick = function() { window.print(); };

  document.getElementById('pb-share').onclick = function() {
    var text = reportText();
    if (navigator.share) {
      navigator.share({ title: REPORT_TITLE, text: text }).catch(function() {});
    } else {
      copyText(text);
    }
  };

  document.getElementById('pb-copy').onclick = function() { copyText(reportText()); };

  function copyText(text) {
    function fallback() {
      var ta = document.createElement('textarea');
      ta.value = text;
      ta.style.position = 'fixed'; ta.style.opacity = '0';
      document.body.appendChild(ta);
      ta.focus(); ta.select();
      try { document.execCommand('copy'); toast('Copied to clipboard'); }
      catch (e) { toast('Copy failed'); }
      document.body.removeChild(ta);
    }
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function() { toast('Copied to clipboard'); }, fallback);
    } else {
      fallback();
    }
  }

  // Try the print dialog automatically; newer browsers may block this without
  // a tap, which is why the Print button above exists.
  window.onload = function() {
    setTimeout(function() { try { window.print(); } catch (e) {} }, 150);
  };
<\/script>
</body>
</html>`)
  win.document.close()
}
