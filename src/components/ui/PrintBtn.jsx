import { useState, useEffect, useRef, useMemo } from 'react'

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

function PrintBtn({ zoneId, label = '🖨 Imprimer' }) {
  return (
    <button
      type="button"
      onClick={() => printZone(zoneId)}
      className="no-print text-xs px-3 py-1.5 rounded-lg font-semibold transition-all"
      style={{ background: '#475569', color: 'white', border: 'none', cursor: 'pointer' }}
    >
      {label}
    </button>
  )
}

export default PrintBtn
