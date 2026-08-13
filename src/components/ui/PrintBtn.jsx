import { Printer } from 'lucide-react'

const printZone = (zoneId) => {
  const el = document.getElementById(zoneId)
  if (!el) return
  const w = window.open('', '_blank', 'width=900,height=700')
  if (!w) return
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"></head><body>' + el.innerHTML + '</body></html>')
  w.document.close()
  w.focus()
  w.print()
}

function PrintBtn({ zoneId, label = 'Imprimer' }) {
  // Retire un éventuel émoji imprimante passé en label (anciens appels)
  const clean = String(label).replace(/🖨️?\s*/g, '').trim() || 'Imprimer'
  return (
    <button
      type="button"
      onClick={() => printZone(zoneId)}
      className="no-print text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
      style={{ background: '#475569', color: 'white', border: 'none', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '5px' }}
    >
      <Printer size={13} strokeWidth={2.4} /> {clean}
    </button>
  )
}

export default PrintBtn
