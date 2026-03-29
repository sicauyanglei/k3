export function exportToExcel(data: any[], filename: string, columns?: { field: string; title: string }[]) {
  if (!data || data.length === 0) {
    return false
  }
  
  const headers = columns || Object.keys(data[0]).map(key => ({ field: key, title: key }))
  
  let csv = '\uFEFF'
  csv += headers.map(h => h.title).join(',') + '\n'
  
  data.forEach(row => {
    const values = headers.map(h => {
      let val = row[h.field]
      if (val === null || val === undefined) val = ''
      if (typeof val === 'string' && (val.includes(',') || val.includes('"') || val.includes('\n'))) {
        val = '"' + val.replace(/"/g, '""') + '"'
      }
      return val
    })
    csv += values.join(',') + '\n'
  })
  
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = `${filename}_${new Date().toISOString().split('T')[0]}.csv`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  
  return true
}

export function printTable(title: string, data: any[], columns: { field: string; title: string; width?: string }[]) {
  if (!data || data.length === 0) {
    return false
  }
  
  const printWindow = window.open('', '_blank')
  if (!printWindow) {
    return false
  }
  
  const style = `
    <style>
      body { font-family: 'Microsoft YaHei', sans-serif; padding: 20px; }
      h1 { text-align: center; font-size: 18px; margin-bottom: 20px; }
      table { width: 100%; border-collapse: collapse; font-size: 12px; }
      th, td { border: 1px solid #333; padding: 6px 8px; text-align: left; }
      th { background-color: #f0f0f0; font-weight: bold; }
      .text-right { text-align: right; }
      .print-info { text-align: center; margin-top: 20px; font-size: 12px; color: #666; }
      @media print { body { padding: 0; } }
    </style>
  `
  
  let html = `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <title>${title}</title>
      ${style}
    </head>
    <body>
      <h1>${title}</h1>
      <table>
        <thead>
          <tr>
            ${columns.map(c => `<th style="${c.width ? `width: ${c.width}` : ''}">${c.title}</th>`).join('')}
          </tr>
        </thead>
        <tbody>
  `
  
  data.forEach(row => {
    html += '<tr>'
    columns.forEach(c => {
      let val = row[c.field]
      if (val === null || val === undefined) val = ''
      html += `<td>${val}</td>`
    })
    html += '</tr>'
  })
  
  html += `
        </tbody>
      </table>
      <div class="print-info">
        打印时间: ${new Date().toLocaleString()}
      </div>
      <script>window.onload = function() { window.print(); }</script>
    </body>
    </html>
  `
  
  printWindow.document.write(html)
  printWindow.document.close()
  
  return true
}

export function formatNumber(value: number, decimals: number = 2): string {
  if (value === null || value === undefined) return ''
  return value.toLocaleString('zh-CN', { minimumFractionDigits: decimals, maximumFractionDigits: decimals })
}

export function formatMoney(value: number): string {
  if (value === null || value === undefined) return ''
  return '¥' + value.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

export function formatDate(date: Date | string): string {
  if (!date) return ''
  const d = typeof date === 'string' ? new Date(date) : date
  return d.toLocaleDateString('zh-CN')
}
