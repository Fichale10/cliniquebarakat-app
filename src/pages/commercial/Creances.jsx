import { useState } from 'react'
import { Badge, EmptyState } from '../../components/ui'
import { dbUpdate } from '../../lib/db'
import { fmtF, venteTTC, venteRestant } from '../../lib/ventes'

function Creances({ ventesHist, setVentesHist, otrMode, sb, tva }) {
  const mask  = v => otrMode ? '••••• F' : fmtF(v)

  const creances   = (ventesHist || []).filter(v => ['À crédit','Partiellement payé','En attente'].includes(v.statut))
  const restant    = v => venteRestant(v, tva)
  const totalDu    = creances.reduce((s, v) => s + restant(v), 0)

  const marquerPaye = async (id) => {
    const vente = (ventesHist || []).find(v => v.id === id)
    if (!vente) return
    try {
      const patch = { statut: 'Payé', montant_paye: venteTTC(vente, tva) }
      await dbUpdate(sb, 'ventes', id, patch)
      setVentesHist((ventesHist || []).map(v => v.id === id ? { ...v, ...patch } : v))
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  const encaisserVersement = async (id) => {
    const vente = (ventesHist || []).find(v => v.id === id)
    if (!vente) return
    const du = restant(vente)
    const saisie = prompt(`Montant du versement (restant dû : ${fmtF(du)})`)
    if (saisie == null) return
    const montant = Math.round(parseFloat(String(saisie).replace(',', '.')) || 0)
    if (montant <= 0) return alert('Montant invalide')
    if (montant > du) return alert(`Le versement dépasse le restant dû (${fmtF(du)})`)
    const nouveauPaye = (vente.montant_paye || 0) + montant
    const patch = nouveauPaye >= venteTTC(vente, tva)
      ? { statut: 'Payé', montant_paye: venteTTC(vente, tva) }
      : { statut: 'Partiellement payé', montant_paye: nouveauPaye }
    try {
      await dbUpdate(sb, 'ventes', id, patch)
      setVentesHist((ventesHist || []).map(v => v.id === id ? { ...v, ...patch } : v))
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  const parClient = {}
  creances.forEach(v => {
    if (!parClient[v.client]) parClient[v.client] = { client: v.client, total: 0, ventes: [] }
    parClient[v.client].total += restant(v)
    parClient[v.client].ventes.push(v)
  })
  const listeClients = Object.values(parClient).sort((a, b) => b.total - a.total)
  const [expanded, setExpanded] = useState(null)

  return (
    <div className="app-page space-y-5">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-tile stat-tile--orange">
          <div className="stat-tile__label">💰 Total à recouvrer</div>
          <div className="stat-tile__value">{mask(totalDu)}</div>
        </div>
        <div className="stat-tile stat-tile--slate">
          <div className="stat-tile__label">👥 Clients débiteurs</div>
          <div className="stat-tile__value">{listeClients.length}</div>
        </div>
        <div className="stat-tile stat-tile--blue">
          <div className="stat-tile__label">📋 Créances en cours</div>
          <div className="stat-tile__value">{creances.length}</div>
        </div>
      </div>

      <div className="app-card">
        <div className="p-5 border-b">
          <h2 className="text-xl font-bold flex items-center gap-2">💰 Suivi des créances</h2>
          <p className="text-xs text-slate-400 mt-0.5">Clients qui n'ont pas encore payé — groupés par client</p>
        </div>

        {!listeClients.length && <EmptyState icon="✅" title="Aucune créance en attente" subtitle="Tous vos clients sont à jour — félicitations !" />}

        <div className="divide-y">
          {listeClients.map(c => (
            <div key={c.client}>
              <div className="p-5 hover:bg-slate-50 cursor-pointer" onClick={() => setExpanded(expanded === c.client ? null : c.client)}>
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center font-black text-orange-600">
                      {c.client.substring(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-bold text-slate-900">{c.client}</p>
                      <p className="text-xs text-slate-500">{c.ventes.length} vente(s) impayée(s)</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className="text-xl font-black text-orange-600 font-mono">{mask(c.total)}</div>
                    <div className="text-xs text-slate-400">{expanded === c.client ? '▲ Masquer' : '▼ Voir détail'}</div>
                  </div>
                </div>
              </div>

              {expanded === c.client && (
                <div className="px-5 pb-4 bg-orange-50/30 border-t">
                  <div className="space-y-2 mt-3">
                    {c.ventes.map(v => (
                      <div key={v.id} className="flex items-center justify-between bg-white rounded-xl p-3 border border-orange-200 gap-4">
                        <div>
                          <div className="flex items-center gap-2">
                            <Badge color={v.statut === 'À crédit' ? 'orange' : 'yellow'}>{v.statut}</Badge>
                            <span className="text-xs text-slate-400">{v.date}</span>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(v.lignes || []).map((l, i) => (
                              <span key={i} className="text-xs bg-slate-100 rounded px-2 py-0.5">💊 {l.med} ×{l.qte}</span>
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <div className="font-black text-orange-600 font-mono">{mask(restant(v))}</div>
                          {(v.montant_paye || 0) > 0 && (
                            <div className="text-xs text-green-600">déjà payé : {mask(v.montant_paye)}</div>
                          )}
                          <button onClick={() => encaisserVersement(v.id)}
                            className="mt-1 text-xs bg-amber-50 hover:bg-amber-100 text-amber-700 px-3 py-1.5 rounded-lg font-bold block w-full">
                            💵 Versement
                          </button>
                          <button onClick={() => marquerPaye(v.id)}
                            className="mt-1 text-xs bg-green-50 hover:bg-green-100 text-green-700 px-3 py-1.5 rounded-lg font-bold block w-full">
                            ✓ Marquer payé
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                  <div className="mt-3 text-right font-bold text-orange-700">Total : {mask(c.total)}</div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default Creances
