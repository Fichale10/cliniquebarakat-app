import { useState } from 'react'
import { Btn, PrintBtn, Field, AutoSuggest, Badge, EmptyState } from '../../components/ui'
import { newId } from '../../lib/db'

const today  = () => new Date().toISOString().split('T')[0]
const fmtF   = v => new Intl.NumberFormat('fr-FR').format(Math.round(v || 0)) + ' F'
const STATUTS = ['En attente', 'Payé', 'Annulé']
const MODES   = ['Espèces', 'Mobile Money', 'Virement', 'Chèque', '–']

const EMPTY_FORM = { date: today(), client: '', description: '', montant: '', statut: 'En attente', mode: 'Espèces' }

function FacPrint({ f }) {
  const statutColor = f.statut === 'Payé' ? '#15803d' : f.statut === 'Annulé' ? '#dc2626' : '#d97706'
  const statutBg    = f.statut === 'Payé' ? '#f0fdf4'  : f.statut === 'Annulé' ? '#fef2f2'  : '#fffbeb'
  return (
    <div id={`fp-${f.id}`} className="hidden">
      <div style={{ fontFamily: "'Segoe UI',Arial,sans-serif", padding: '44px 48px', maxWidth: '640px', margin: '0 auto', color: '#1e293b' }}>

        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '3px solid #16a34a', paddingBottom: '22px', marginBottom: '28px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '48px', height: '48px', borderRadius: '50%', background: '#f0fdf4', border: '2px solid #86efac', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '26px' }}>🐄</div>
            <div>
              <div style={{ fontSize: '20px', fontWeight: '900', color: '#14532d', letterSpacing: '1px' }}>LA BARAKAT</div>
              <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>Pharmacie & Clinique Vétérinaire · Lomé, Togo</div>
            </div>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ fontSize: '24px', fontWeight: '900', color: '#16a34a', letterSpacing: '1px' }}>FACTURE</div>
            <div style={{ fontFamily: "'Courier New',monospace", fontSize: '13px', fontWeight: '700', color: '#475569', marginTop: '4px' }}>{f.num}</div>
            <div style={{ fontSize: '11px', color: '#94a3b8', marginTop: '2px' }}>{f.date}</div>
          </div>
        </div>

        {/* Billing info */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '28px' }}>
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Facturé à</div>
            <div style={{ fontSize: '15px', fontWeight: '800', color: '#1e293b' }}>{f.client}</div>
          </div>
          <div style={{ background: '#f8fafc', borderRadius: '10px', padding: '14px 16px' }}>
            <div style={{ fontSize: '10px', fontWeight: '700', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.6px', marginBottom: '6px' }}>Détails</div>
            <div style={{ fontSize: '12px', color: '#475569' }}>Mode : <strong style={{ color: '#1e293b' }}>{f.mode}</strong></div>
            <div style={{ fontSize: '12px', color: '#475569', marginTop: '3px' }}>
              Statut : <strong style={{ color: statutColor, background: statutBg, padding: '1px 8px', borderRadius: '20px', fontSize: '11px' }}>{f.statut}</strong>
            </div>
          </div>
        </div>

        {/* Items table */}
        <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: '24px' }}>
          <thead>
            <tr style={{ background: '#f0fdf4' }}>
              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '11px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #bbf7d0' }}>Description</th>
              <th style={{ padding: '10px 12px', textAlign: 'right', fontSize: '11px', fontWeight: '800', color: '#16a34a', textTransform: 'uppercase', letterSpacing: '0.5px', borderBottom: '2px solid #bbf7d0', whiteSpace: 'nowrap' }}>Montant</th>
            </tr>
          </thead>
          <tbody>
            <tr>
              <td style={{ padding: '14px 12px', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>{f.description || '—'}</td>
              <td style={{ padding: '14px 12px', textAlign: 'right', fontWeight: '700', borderBottom: '1px solid #f1f5f9', fontSize: '13px' }}>{fmtF(f.montant)}</td>
            </tr>
          </tbody>
        </table>

        {/* Total */}
        <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '28px' }}>
          <div style={{ background: '#f0fdf4', border: '1.5px solid #86efac', borderRadius: '10px', padding: '14px 22px', minWidth: '220px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '13px', fontWeight: '700', color: '#15803d' }}>Total TTC</span>
              <span style={{ fontSize: '20px', fontWeight: '900', color: '#15803d' }}>{fmtF(f.montant)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div style={{ borderTop: '1px dashed #cbd5e1', paddingTop: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div style={{ fontSize: '10px', color: '#94a3b8' }}>Merci de votre confiance · La Barakat · Lomé, Togo</div>
          <div style={{ fontSize: '9px', color: '#e2e8f0', fontFamily: "'Courier New',monospace", letterSpacing: '2px' }}>ORIGINAL</div>
        </div>
      </div>
    </div>
  )
}

function printFac(id) {
  const el = document.getElementById(`fp-${id}`)
  if (!el) return
  el.classList.remove('hidden')
  const w = window.open('', '_blank', 'width=760,height=680')
  w.document.write('<!DOCTYPE html><html><head><meta charset="UTF-8"><style>*{box-sizing:border-box;}body{margin:0;background:#fff;}@media print{body{margin:0;}}</style></head><body>' + el.innerHTML + '</body></html>')
  w.document.close()
  w.focus()
  w.print()
  setTimeout(() => el.classList.add('hidden'), 500)
}

function Factures({ factures = [], setFactures, clients = [], sb, dbInsert, dbUpdate, dbDelete }) {
  const [showForm, setShowForm] = useState(false)
  const [form, setForm]         = useState(EMPTY_FORM)
  const [cliSugg, setCliSugg]   = useState([])
  const [saving, setSaving]     = useState(false)

  const totalP = factures.filter(f => f.statut === 'Payé').reduce((s, f) => s + (f.montant || 0), 0)
  const totalA = factures.filter(f => f.statut === 'En attente').reduce((s, f) => s + (f.montant || 0), 0)

  const genNum = () => {
    const yr = new Date().getFullYear()
    const n  = factures.filter(f => (f.num || '').includes(String(yr))).length + 1
    return `FAC-${yr}-${String(n).padStart(3, '0')}`
  }

  // ── Créer ────────────────────────────────────────────────────
  const addFacture = async () => {
    if (!form.client || !form.montant) return alert('Client et montant requis')
    setSaving(true)
    try {
      const row = { id: newId(), num: genNum(), date: form.date, client: form.client, description: form.description, montant: parseInt(form.montant), statut: form.statut, mode: form.mode }
      const saved = await dbInsert(sb, 'factures', row)
      setFactures([saved, ...factures])
      setForm(EMPTY_FORM)
      setShowForm(false)
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    } finally {
      setSaving(false)
    }
  }

  // ── Changer statut ───────────────────────────────────────────
  const toggleStatut = async (id, current) => {
    const next = current === 'Payé' ? 'En attente' : 'Payé'
    try {
      await dbUpdate(sb, 'factures', id, { statut: next })
      setFactures(factures.map(f => f.id === id ? { ...f, statut: next } : f))
    } catch (e) {
      alert('Erreur : ' + (e?.message || e))
    }
  }

  // ── Supprimer ────────────────────────────────────────────────
  const deleteFacture = async (id) => {
    if (!confirm('Supprimer cette facture ?')) return
    try {
      await dbDelete(sb, 'factures', id)
      setFactures(factures.filter(f => f.id !== id))
    } catch (e) {
      alert('Erreur suppression : ' + (e?.message || e))
    }
  }

  return (
    <div id="factures-print" className="app-page space-y-5">
      {factures.map(f => <FacPrint key={f.id} f={f} />)}

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="stat-tile stat-tile--blue">
          <div className="stat-tile__label">📄 Total factures</div>
          <div className="stat-tile__value">{factures.length}</div>
        </div>
        <div className="stat-tile stat-tile--green">
          <div className="stat-tile__label">✅ Total encaissé</div>
          <div className="stat-tile__value">{fmtF(totalP)}</div>
        </div>
        <div className="stat-tile stat-tile--yellow">
          <div className="stat-tile__label">⏳ En attente</div>
          <div className="stat-tile__value">{fmtF(totalA)}</div>
        </div>
      </div>

      <div className="app-card">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold flex items-center gap-2">📄 Factures</h2>
            <p className="text-xs text-slate-400 mt-0.5">{factures.length} facture(s)</p>
          </div>
          <div className="flex gap-2">
            <PrintBtn zoneId="factures-print" label="🖨 Imprimer"/>
            <Btn onClick={() => setShowForm(!showForm)}>{showForm ? '✕ Annuler' : '+ Nouvelle facture'}</Btn>
          </div>
        </div>

        {showForm && (
          <div className="p-5 bg-blue-50 border-b border-blue-200">
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              <Field label="Date" value={form.date} onChange={e => setForm({...form, date: e.target.value})} type="date"/>
              <div>
                <label className="text-xs font-bold text-slate-600 mb-1 block">Client *</label>
                <AutoSuggest value={form.client}
                  onChange={e => { setForm({...form, client: e.target.value}); setCliSugg(clients.filter(c => c.nom.toLowerCase().includes(e.target.value.toLowerCase()))) }}
                  list={cliSugg} onSelect={c => { setForm({...form, client: c.nom}); setCliSugg([]) }}
                  placeholder="Nom du client"/>
              </div>
              <Field label="Description" value={form.description} onChange={e => setForm({...form, description: e.target.value})} placeholder="Prestations…"/>
              <Field label="Montant (F) *" value={form.montant} onChange={e => setForm({...form, montant: e.target.value})} type="number" placeholder="0"/>
              <Field label="Statut" value={form.statut} onChange={e => setForm({...form, statut: e.target.value})} options={STATUTS}/>
              <Field label="Mode paiement" value={form.mode} onChange={e => setForm({...form, mode: e.target.value})} options={MODES}/>
            </div>
            <div className="mt-3">
              <Btn onClick={addFacture} disabled={saving}>{saving ? '⏳ Enregistrement…' : '✓ Créer la facture'}</Btn>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-slate-50">
              <tr>{['N°','Date','Client','Description','Montant','Mode','Statut','Actions'].map(h => (
                <th key={h} className="text-left p-3 text-xs font-bold text-slate-600 uppercase whitespace-nowrap">{h}</th>
              ))}</tr>
            </thead>
            <tbody>
              {factures.map(f => (
                <tr key={f.id} className="border-t hover:bg-slate-50">
                  <td className="p-3 font-mono text-xs font-bold text-slate-500">{f.num}</td>
                  <td className="p-3 text-sm">{f.date}</td>
                  <td className="p-3 font-semibold">{f.client}</td>
                  <td className="p-3 text-sm text-slate-600 max-w-[150px] truncate">{f.description}</td>
                  <td className="p-3 font-bold font-mono text-blue-600 whitespace-nowrap">{fmtF(f.montant)}</td>
                  <td className="p-3 text-sm">{f.mode}</td>
                  <td className="p-3"><Badge color={f.statut === 'Payé' ? 'green' : f.statut === 'Annulé' ? 'red' : 'yellow'}>{f.statut}</Badge></td>
                  <td className="p-3">
                    <div className="flex gap-1">
                      <button onClick={() => toggleStatut(f.id, f.statut)}
                        className="text-xs bg-slate-100 hover:bg-slate-200 text-slate-700 px-2 py-1 rounded-lg">
                        {f.statut === 'Payé' ? '↩' : '✓ Payé'}
                      </button>
                      <button onClick={() => printFac(f.id)}
                        className="text-xs bg-slate-700 hover:bg-slate-800 text-white px-2 py-1 rounded-lg no-print">
                        🖨
                      </button>
                      <button onClick={() => deleteFacture(f.id)}
                        className="text-xs bg-red-50 hover:bg-red-100 text-red-500 px-2 py-1 rounded-lg no-print">
                        🗑
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {!factures.length && (
                <tr><td colSpan={8}><EmptyState icon="📄" title="Aucune facture" subtitle="Émettez votre première facture client." /></td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}

export default Factures
