/**
 * printReport.js
 * Opens a new window with formatted HTML and triggers window.print().
 * On iOS Safari this opens the native Share → Save as PDF / iMessage flow.
 */
export function printReport(title, rows) {
  const win = window.open('', '_blank')
  if (!win) {
    alert('Please allow pop-ups to generate the PDF.')
    return
  }

  win.document.write(`<!DOCTYPE html>
<html>
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${title}</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    font-family: -apple-system, 'Helvetica Neue', Arial, sans-serif;
    font-size: 13px; color: #111; background: #fff;
    padding: 20px;
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
    color: #555; border-bottom: 1px solid #ccc;
    padding: 4px 6px;
  }
  th.right, td.right { text-align: right; }
  td { padding: 5px 6px; border-bottom: 1px solid #eee; }
  tr:last-child td { border-bottom: none; }
  .win  { color: #1a7a3a; font-weight: 600; }
  .loss { color: #c0392b; font-weight: 600; }
  .even { color: #7a6020; }
  .total-row td { font-weight: 700; border-top: 1.5px solid #bbb; background: #f8f8f8; }
  .player-header { font-weight: 700; font-size: 13px; padding: 8px 6px 2px; background: #f4f4f4; }
  @media print {
    body { padding: 10px; }
    @page { margin: 15mm; }
  }
</style>
</head>
<body>
${rows}
<script>window.onload = function() { window.print(); }<\/script>
</body>
</html>`)
  win.document.close()
}
