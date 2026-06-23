import { useMemo } from 'react'
import { fmtF } from "../../lib/utils"
import { Badge, PrintBtn } from "../../components/ui"

function Finances({ clinique, otrMode, ventesHist = [], depsHist = [] }) {
  const mask = v => otrMode ? '••••• F' : fmtF(v)

  const months = useMemo(() => {
    const result = []
    const now = new Date()
    for (let i = 5; i >= 0; i--) {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      result.push({
        key: `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
        label: d.toLocaleDateString('fr-FR', { month: 'short' }),
      })
    }
    return result
  }, [])

  const DATA = useMemo(() => months.map(({ key, label }) => ({
    m: label,
    r: ventesHist
      .filter(v => v.statut === 'Payé' && String(v.date || '').startsWith(key))
      .reduce((s, v) => s + (v.total || 0), 0),
    d: depsHist
      .filter(dep => String(dep.date || '').startsWith(key))
      .reduce((s, dep) => s + (dep.montant || 0), 0),
  })), [ventesHist, depsHist, months])

  const cur = DATA[DATA.length - 1]
  const res = cur.r - cur.d
  const marge = cur.r > 0 ? Math.round((res / cur.r) * 100) : 0
  const max = Math.max(...DATA.flatMap(m => [m.r, m.d]), 1)
  const curMonthLabel = months[months.length - 1].label
  const curMonthKey = months[months.length - 1].key

  const CATS_DEP = ['Achats stock','Salaires','Électricité','Eau','Loyer','WiFi / Internet','Entretien','Transport','Frais vétérinaires','Autres']
  const curDeps = depsHist.filter(d => String(d.date || '').startsWith(curMonthKey))
  const totalDepCur = curDeps.reduce((s, d) => s + (d.montant || 0), 0)

  const DP = useMemo(() => CATS_DEP
    .map(cat => {
      const m = curDeps.filter(d => d.categorie === cat).reduce((s, d) => s + (d.montant || 0), 0)
      return { t: cat, m, p: totalDepCur > 0 ? Math.round((m / totalDepCur) * 100) : 0 }
    })
    .filter(x => x.m > 0)
    .sort((a, b) => b.m - a.m),
  [depsHist, curMonthKey])

  const curVentes = ventesHist.filter(v => v.statut === 'Payé' && String(v.date || '').startsWith(curMonthKey))
  const totalVentesCur = curVentes.reduce((s, v) => s + (v.total || 0), 0)
  const RP = [{ t: 'Ventes comptoir', m: totalVentesCur, p: 100 }]

  const hasData = DATA.some(m => m.r > 0 || m.d > 0)

  return (
    <div className="app-page space-y-5">
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { l: `Recettes (${curMonthLabel})`, v: mask(cur.r), mod: 'stat-tile--green' },
          { l: `Dépenses (${curMonthLabel})`, v: mask(cur.d), mod: 'stat-tile--red' },
          { l: 'Résultat net', v: mask(res), mod: res >= 0 ? 'stat-tile--blue' : 'stat-tile--orange' },
          { l: 'Taux de marge', v: cur.r > 0 ? `${marge}%` : '–', mod: 'stat-tile--purple' },
        ].map((s, i) => (
          <div key={i} className={`stat-tile ${s.mod}`}>
            <div className="stat-tile__label">{s.l}</div>
            <div className="stat-tile__value text-xl">{s.v}</div>
          </div>
        ))}
      </div>

      <div id="finances-print" className="space-y-5">
        <div className="panel-surface p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="font-bold text-lg flex items-center gap-2">📈 Évolution 6 mois</h3>
            <PrintBtn zoneId="finances-print" label="🖨 Rapport"/>
          </div>
          {!hasData ? (
            <div className="text-center text-slate-400 py-10 text-sm">
              Aucune donnée pour les 6 derniers mois.<br/>
              <span className="text-xs">Enregistrez des ventes et dépenses pour voir les statistiques.</span>
            </div>
          ) : (
            <>
              <div className="flex items-end gap-3 h-44">
                {DATA.map((m, i) => {
                  const hR = Math.round((m.r / max) * 168)
                  const hD = Math.round((m.d / max) * 168)
                  const delta = m.r - m.d
                  return (
                    <div key={i} className="flex-1 flex flex-col items-center gap-1">
                      <div className="flex items-end gap-1 h-44">
                        <div className="w-4 bg-green-400 rounded-t" style={{ height: `${hR}px` }}/>
                        <div className="w-4 bg-red-400 rounded-t" style={{ height: `${hD}px` }}/>
                      </div>
                      <div className="text-xs font-bold text-slate-500">{m.m}</div>
                      <div className={`text-xs font-bold ${delta >= 0 ? 'text-green-600' : 'text-red-500'}`}>
                        {delta >= 0 ? '+' : ''}{Math.round(delta / 1000)}k
                      </div>
                    </div>
                  )
                })}
              </div>
              <div className="flex gap-5 mt-3 justify-center">
                <div className="flex items-center gap-2 text-xs text-[var(--app-text)]"><div className="w-3 h-3 bg-green-400 rounded"/>Recettes</div>
                <div className="flex items-center gap-2 text-xs text-[var(--app-text)]"><div className="w-3 h-3 bg-red-400 rounded"/>Dépenses</div>
              </div>
            </>
          )}
        </div>

        <div className="grid grid-cols-2 gap-5">
          {[
            [RP, '📥 Recettes ce mois', 'green'],
            [DP.length ? DP : [{ t: 'Aucune dépense enregistrée', m: 0, p: 0 }], '📤 Dépenses par catégorie', 'red'],
          ].map(([data, title, color], i) => (
            <div key={i} className="panel-surface p-5">
              <h3 className="font-bold mb-4 text-[var(--app-text)]">{title}</h3>
              <div className="space-y-3">
                {data.map((r, j) => (
                  <div key={j}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-semibold text-[var(--app-text)]">{r.t}</span>
                      <span className="text-[var(--app-muted)]">{r.m > 0 ? mask(r.m) : '–'} {r.p > 0 && <strong>· {r.p}%</strong>}</span>
                    </div>
                    {r.p > 0 && (
                      <div className="rounded-full h-2" style={{ background: 'var(--app-border)' }}>
                        <div className={`h-2 rounded-full ${color === 'green' ? 'bg-green-500' : 'bg-red-500'}`} style={{ width: `${r.p}%` }}/>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>

        <div className="app-card">
          <div className="p-5 border-b"><h3 className="font-bold">📋 Bilan mensuel</h3></div>
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>{['Mois','Recettes','Dépenses','Résultat','Marge'].map(h => (
                <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {[...DATA].reverse().map((m, i) => {
                const r = m.r - m.d
                const mg = m.r > 0 ? Math.round((r / m.r) * 100) : 0
                return (
                  <tr key={i} className={`border-t hover:bg-slate-50 ${i === 0 ? 'bg-blue-50/40' : ''}`}>
                    <td className="p-3 font-semibold">
                      {m.m}
                      {i === 0 && <span className="ml-2 text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">Mois courant</span>}
                    </td>
                    <td className="p-3 font-mono text-green-600 font-bold">{mask(m.r)}</td>
                    <td className="p-3 font-mono text-red-600 font-bold">{mask(m.d)}</td>
                    <td className={`p-3 font-mono font-bold ${r >= 0 ? 'text-blue-600' : 'text-red-600'}`}>{mask(r)}</td>
                    <td className="p-3">
                      <Badge color={mg >= 50 ? 'green' : mg >= 30 ? 'yellow' : 'red'}>
                        {m.r > 0 ? `${mg}%` : '–'}
                      </Badge>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Finances
