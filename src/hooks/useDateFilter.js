import { useState, useCallback, useMemo } from 'react'

/** Date du jour au format YYYY-MM-DD (usage formulaires / filtres). */
export function today() {
  return new Date().toISOString().split('T')[0]
}

/**
 * Filtre par période (aligné sur FilterPeriode : jour, semaine, mois, année).
 * @param {string} initial — '' | 'jour' | 'semaine' | 'mois' | 'annee'
 */
export function useDateFilter(initial = '') {
  const [period, setPeriod] = useState(initial)

  const bounds = useMemo(() => {
    const now = new Date()
    const jour = today()
    const semaine = new Date(now.getTime() - now.getDay() * 86400000).toISOString().split('T')[0]
    const mois = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0]
    const annee = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0]
    return { jour, semaine, mois, annee }
  }, [])

  /** true si dateStr (YYYY-MM-DD) est dans la période choisie, ou si period est vide */
  const matches = useCallback(
    (dateStr) => {
      if (!period || !dateStr) return true
      const min = bounds[period]
      if (!min) return true
      return String(dateStr) >= min
    },
    [period, bounds]
  )

  return { period, setPeriod, matches, bounds, today }
}
