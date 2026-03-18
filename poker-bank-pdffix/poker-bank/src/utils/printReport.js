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

  @media print {
    /* Prevent orphaned section headers */
    .section { page-break-inside: avoid; }
    table { page-break-inside: auto; }
    tr { page-break-inside: avoid; }
  }
</style>
</head>
<body>
${rows}
<script>
  // Slight delay so content renders before print dialog opens
  window.onload = function() {
    setTimeout(function() { window.print(); }, 150);
  };
<\/script>
</body>
</html>`)
  win.document.close()
}
