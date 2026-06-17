export interface PrintColumn<T = any> {
  header: string;
  value: (row: T) => string | number | null | undefined;
  width?: string;
}

export function printTable<T = any>(options: {
  title: string;
  columns: PrintColumn<T>[];
  rows: T[];
  subtitle?: string;
}) {
  const { title, columns, rows, subtitle } = options;

  const now = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  const colWidths = columns.map((c) => (c.width ? `width="${c.width}"` : '')).join('|');
  void colWidths;

  const thead = columns
    .map((c) => `<th${c.width ? ` style="width:${c.width}"` : ''}>${c.header}</th>`)
    .join('');

  const tbody = rows
    .map(
      (row) =>
        `<tr>${columns.map((c) => `<td>${c.value(row) ?? '—'}</td>`).join('')}</tr>`,
    )
    .join('');

  const html = `<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: Arial, Helvetica, sans-serif;
      font-size: 11px;
      color: #1e293b;
      padding: 24px 32px;
      background: #fff;
    }
    h1 {
      font-size: 15px;
      font-weight: 700;
      margin-bottom: 2px;
    }
    .meta {
      font-size: 10px;
      color: #64748b;
      margin-bottom: 16px;
    }
    table {
      width: 100%;
      border-collapse: collapse;
    }
    thead { background: #f1f5f9; }
    th {
      text-align: left;
      font-size: 9px;
      font-weight: 700;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      color: #475569;
      padding: 6px 8px;
      border: 1px solid #cbd5e1;
    }
    td {
      padding: 5px 8px;
      border: 1px solid #e2e8f0;
      vertical-align: top;
    }
    tr:nth-child(even) td { background: #f8fafc; }
    .footer {
      margin-top: 10px;
      font-size: 10px;
      color: #94a3b8;
    }
    @page { margin: 1.2cm; size: A4 landscape; }
    @media print { body { padding: 0; } }
  </style>
</head>
<body>
  <h1>${title}</h1>
  <div class="meta">${subtitle ? subtitle + '&ensp;&middot;&ensp;' : ''}Imprimé le ${now}</div>
  <table>
    <thead><tr>${thead}</tr></thead>
    <tbody>${tbody}</tbody>
  </table>
  <div class="footer">${rows.length} enregistrement${rows.length !== 1 ? 's' : ''}</div>
  <script>window.onload = function () { window.print(); };<\/script>
</body>
</html>`;

  const win = window.open('', '_blank');
  if (!win) {
    alert('Veuillez autoriser les pop-ups pour imprimer.');
    return;
  }
  win.document.write(html);
  win.document.close();
}
