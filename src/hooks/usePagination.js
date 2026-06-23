import { useState, useEffect } from 'react'

export function usePagination(items, pageSize = 20) {
  const [page, setPage] = useState(1)

  // Revenir à la page 1 dès que le nombre de résultats change (filtre appliqué)
  useEffect(() => { setPage(1) }, [items.length])

  const total      = items.length
  const totalPages = Math.max(1, Math.ceil(total / pageSize))
  const safePage   = Math.min(page, totalPages)
  const start      = (safePage - 1) * pageSize
  const end        = Math.min(start + pageSize, total)

  return {
    pageItems:  items.slice(start, end),
    page:       safePage,
    totalPages,
    total,
    start:      start + 1,
    end,
    setPage,
    hasPrev:    safePage > 1,
    hasNext:    safePage < totalPages,
    prev:       () => setPage(p => Math.max(1, p - 1)),
    next:       () => setPage(p => Math.min(totalPages, p + 1)),
  }
}
