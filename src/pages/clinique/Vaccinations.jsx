import { useState, useEffect, useMemo } from 'react'
import { Syringe, AlertTriangle, CalendarClock, CheckCircle2, Trash2, MessageCircle, RotateCw, ShieldPlus, Printer, FileDown } from 'lucide-react'
import { EmptyState, Badge, PrintBtn } from '../../components/ui'
import { dbFetch, dbInsert, dbDelete, newId } from '../../lib/db'

// ── Protocoles vaccinaux par espèce (validité par défaut en mois) ──
const PROTOCOLES = {
  'Chien':        [{v:'Rage',m:12},{v:'Carré – Hépatite – Parvo – Lepto (CHPL)',m:12},{v:'Parvovirose',m:12},{v:'Toux du chenil',m:12}],
  'Chat':         [{v:'Rage',m:12},{v:'Typhus – Coryza (TC)',m:12},{v:'Leucose féline',m:12}],
  'Bovin':        [{v:'PPCB (péripneumonie contagieuse)',m:12},{v:'Charbon symptomatique',m:12},{v:'Charbon bactéridien',m:12},{v:'Pasteurellose bovine',m:12},{v:'Fièvre aphteuse',m:6},{v:'Dermatose nodulaire',m:12}],
  'Ovin / Caprin':[{v:'PPR (peste des petits ruminants)',m:12},{v:'Clavelée / Variole caprine',m:12},{v:'Pasteurellose',m:12},{v:'Charbon symptomatique',m:12}],
  'Volaille':     [{v:'Newcastle (La Sota / I-2)',m:6},{v:'Gumboro',m:6},{v:'Bronchite infectieuse',m:6},{v:'Variole aviaire',m:12},{v:'Typhose aviaire',m:12}],
  'Équin / Asin': [{v:'Tétanos',m:12},{v:'Rage',m:12}],
  'Camelin':      [{v:'Pasteurellose',m:12},{v:'Variole cameline',m:12}],
  'Autre':        [],
}
const ESPECES = Object.keys(PROTOCOLES)
const VOIES = ['Sous-cutanée','Intramusculaire','Intraveineuse','Orale (eau de boisson)','Oculaire / nasale','Autre']

const addMonths = (dateStr, months) => {
  if (!dateStr) return ''
  const d = new Date(dateStr + 'T00:00:00')
  d.setMonth(d.getMonth() + (parseInt(months) || 0))
  return d.toISOString().split('T')[0]
}
const joursAvant = (dateStr) => {
  if (!dateStr) return null
  return Math.round((new Date(dateStr + 'T00:00:00') - new Date(new Date().toISOString().split('T')[0] + 'T00:00:00')) / 86400000)
}
const fmtDate = (d) => d ? d.split('-').reverse().join('/') : '—'

const statutVacc = (v) => {
  const j = joursAvant(v.rappel)
  if (j === null) return { label: 'Sans rappel', color: 'slate', j }
  if (j < 0)   return { label: 'En retard',     color: 'red',   j }
  if (j <= 30) return { label: `Rappel ${j}j`,  color: 'yellow',j }
  return { label: 'À jour', color: 'green', j }
}

function Vaccinations({ patients = [], equipe = [], clinique, user, sb }) {
  const today = () => new Date().toISOString().split('T')[0]
  const [vaccs, setVaccs] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [showForm, setShowForm] = useState(false)
  const [q, setQ] = useState('')
  const [fEspece, setFEspece] = useState('')
  const [fStatut, setFStatut] = useState('')
  const [cert, setCert] = useState(null)
  const [confirmDel, setConfirmDel] = useState(null)

  const EMPTY = { date: today(), espece: 'Chien', patient: '', nombre: 1, proprio: '', tel: '',
    vaccin: '', autreVaccin: '', lot: '', dose: '', voie: 'Sous-cutanée',
    veterinaire: user?.name || '', validite: 12, rappel: addMonths(today(), 12), notes: '' }
  const [form, setForm] = useState(EMPTY)
  const f = k => e => setForm({ ...form, [k]: e.target.value })

  useEffect(() => { (async () => {
    try { setVaccs((await dbFetch(sb, 'vaccinations', { force: true })) || []) }
    catch (e) { console.warn('[vaccinations]', e?.message || e) }
    finally { setLoading(false) }
  })() }, [])

  // Patient connu → pré-remplissage propriétaire, téléphone et espèce
  const ESPECE_MAP = { Chien:'Chien', Chat:'Chat', Bovin:'Bovin', Caprin:'Ovin / Caprin', Ovin:'Ovin / Caprin', Volaille:'Volaille', Équin:'Équin / Asin', Asin:'Équin / Asin', Camelin:'Camelin' }
  const changePatient = e => {
    const nom = e.target.value
    const p = patients.find(x => x.nom === nom)
    setForm(prev => ({ ...prev, patient: nom,
      ...(p ? { proprio: p.proprio || prev.proprio, tel: p.tel || prev.tel, espece: ESPECE_MAP[p.espece] || prev.espece } : {}) }))
  }

  // Espèce → réinitialise le vaccin ; Vaccin → validité par défaut ; Date/Validité → rappel auto
  const changeEspece = e => {
    const espece = e.target.value
    setForm(prev => ({ ...prev, espece, vaccin: '', autreVaccin: '' }))
  }
  const changeVaccin = e => {
    const vaccin = e.target.value
    const proto = (PROTOCOLES[form.espece] || []).find(p => p.v === vaccin)
    const validite = proto ? proto.m : form.validite
    setForm(prev => ({ ...prev, vaccin, validite, rappel: addMonths(prev.date, validite) }))
  }
  const changeDate = e => {
    const date = e.target.value
    setForm(prev => ({ ...prev, date, rappel: addMonths(date, prev.validite) }))
  }
  const changeValidite = e => {
    const validite = e.target.value
    setForm(prev => ({ ...prev, validite, rappel: addMonths(prev.date, validite) }))
  }

  const enregistrer = async () => {
    const vaccinFinal = form.vaccin === '__autre' || form.espece === 'Autre' ? form.autreVaccin : form.vaccin
    if (!form.patient || !vaccinFinal) { alert('Patient / troupeau et vaccin requis.'); return }
    setSaving(true)
    try {
      const row = {
        id: newId(), date: form.date, espece: form.espece, patient: form.patient,
        nombre: parseInt(form.nombre) || 1, proprio: form.proprio, tel: form.tel,
        vaccin: vaccinFinal, lot: form.lot, dose: form.dose, voie: form.voie,
        veterinaire: form.veterinaire, validite_mois: parseInt(form.validite) || 12,
        rappel: form.rappel || null, notes: form.notes, created_by: user?.name || '',
      }
      const saved = await dbInsert(sb, 'vaccinations', row)
      setVaccs([saved, ...vaccs])
      setForm(EMPTY); setShowForm(false); setCert(saved)
    } catch (e) { alert('Erreur : ' + (e?.message || e)) }
    finally { setSaving(false) }
  }

  const revacciner = async (v) => {
    if (!confirm(`Revacciner ${v.patient} (${v.vaccin}) aujourd'hui ?\nUn nouveau certificat sera créé avec le prochain rappel.`)) return
    try {
      const row = { ...v, id: newId(), date: today(), rappel: addMonths(today(), v.validite_mois || 12), created_by: user?.name || '' }
      delete row.created_at
      const saved = await dbInsert(sb, 'vaccinations', row)
      setVaccs([saved, ...vaccs]); setCert(saved)
    } catch (e) { alert('Erreur : ' + (e?.message || e)) }
  }

  const supprimer = async (id) => {
    try { await dbDelete(sb, 'vaccinations', id); setVaccs(vaccs.filter(x => x.id !== id)); if (cert?.id === id) setCert(null) }
    catch (e) { alert('Erreur : ' + (e?.message || e)) }
    finally { setConfirmDel(null) }
  }

  const envoyerRappelWA = (v) => {
    const msg = encodeURIComponent(
      `Bonjour ${v.proprio || ''},\n\nRappel de vaccination pour ${v.patient} (${v.espece}) :\n💉 ${v.vaccin}\n📅 Rappel prévu le ${fmtDate(v.rappel)}\n\nMerci de prendre rendez-vous.\nLa Barakat – Clinique Vétérinaire 🐄`)
    const tel = (v.tel || '').replace(/[^0-9+]/g, '')
    window.open(`https://wa.me/${tel}?text=${msg}`, '_blank')
  }
  // Téléchargement direct d'un vrai fichier .pdf (jsPDF, chargé à la demande)
  const telechargerPDF = async () => {
    if (!cert) return
    try {
      const { jsPDF } = await import('jspdf')
      const { default: autoTable } = await import('jspdf-autotable')
      const doc = new jsPDF({ unit: 'mm', format: 'a4' })
      const W = 210, H = 297, M = 16
      const VERT = [20, 83, 45], VERT2 = [22, 101, 52], ARDOISE = [30, 41, 59], GRIS = [100, 116, 139]
      const nomClinique = clinique?.nom || 'La Barakat'

      // ── Filigrane de sécurité (nom de la clinique en diagonale) ──
      doc.saveGraphicsState()
      doc.setGState(new doc.GState({ opacity: 0.045 }))
      doc.setFont('helvetica', 'bold'); doc.setFontSize(52); doc.setTextColor(20, 83, 45)
      doc.text(nomClinique.toUpperCase(), W / 2, H / 2 + 20, { align: 'center', angle: 38 })
      doc.restoreGraphicsState()

      // ── Bandeau d'en-tête ──
      doc.setFillColor(240, 253, 244); doc.rect(0, 0, W, 46, 'F')
      doc.setFillColor(...VERT); doc.rect(0, 46, W, 1.4, 'F')
      // Logo de la clinique (public/logo.png), médaillon initiales en secours
      const logoData = await new Promise(res => {
        const img = new Image()
        img.onload = () => { try { const c = document.createElement('canvas'); c.width = img.naturalWidth; c.height = img.naturalHeight; c.getContext('2d').drawImage(img, 0, 0); res(c.toDataURL('image/png')) } catch { res(null) } }
        img.onerror = () => res(null)
        img.src = '/logo.png'
      })
      if (logoData) {
        doc.addImage(logoData, 'PNG', M, 11.5, 23, 23)
      } else {
        const initiales = nomClinique.split(/\s+/).map(w => w[0]).join('').slice(0, 2).toUpperCase()
        doc.setFillColor(...VERT); doc.circle(M + 11.5, 23, 9, 'F')
        doc.setFont('helvetica', 'bold'); doc.setFontSize(13); doc.setTextColor(255, 255, 255)
        doc.text(initiales, M + 11.5, 24.8, { align: 'center' })
      }
      // Nom + coordonnées
      doc.setFont('helvetica', 'bold')
      doc.setTextColor(...VERT); doc.setFontSize(17)
      doc.text(nomClinique, M + 28, 19)
      doc.setFontSize(10); doc.setTextColor(...VERT2)
      doc.text(clinique?.sousTitre || 'Pharmacie & Clinique Vétérinaire', M + 28, 25)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(8); doc.setTextColor(71, 85, 105)
      const coords = [[clinique?.adresse, clinique?.ville].filter(Boolean).join(', '), clinique?.tel && `Tél : ${clinique.tel}`, clinique?.email].filter(Boolean).join('  ·  ')
      if (coords) doc.text(coords, M + 28, 30.5)
      if (clinique?.agrement) doc.text(`Agrément n° ${clinique.agrement}`, M + 28, 35)
      // Cartouche N° de certificat
      doc.setDrawColor(...VERT); doc.setLineWidth(0.4); doc.setFillColor(255, 255, 255)
      doc.roundedRect(W - M - 46, 13, 46, 20, 2, 2, 'FD')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(7.5); doc.setTextColor(...GRIS)
      doc.text('CERTIFICAT N°', W - M - 23, 19, { align: 'center' })
      doc.setFontSize(12); doc.setTextColor(...VERT)
      doc.text(String(cert.id).slice(0, 8).toUpperCase(), W - M - 23, 25.5, { align: 'center' })
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(...GRIS)
      doc.text(`Établi le ${fmtDate(cert.date)}`, W - M - 23, 30, { align: 'center' })

      let y = 60
      doc.setFont('helvetica', 'bold'); doc.setFontSize(16); doc.setTextColor(...ARDOISE)
      doc.text('CERTIFICAT DE VACCINATION', W / 2, y, { align: 'center', charSpace: 1.4 })
      doc.setDrawColor(...VERT); doc.setLineWidth(0.8)
      doc.line(W / 2 - 24, y + 2.5, W / 2 + 24, y + 2.5)
      y += 12

      // ── Section Identification ──
      const sectionTitre = (titre, yy) => {
        doc.setFont('helvetica', 'bold'); doc.setFontSize(8.5); doc.setTextColor(...VERT)
        doc.text(titre.toUpperCase(), M, yy, { charSpace: 0.8 })
        doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3)
        doc.line(M + doc.getTextWidth(titre.toUpperCase()) + 4, yy - 1.2, W - M, yy - 1.2)
        return yy + 6
      }
      y = sectionTitre("Identification de l'animal", y)
      doc.setFillColor(248, 250, 252); doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3)
      doc.roundedRect(M, y - 3, W - 2 * M, 17, 1.5, 1.5, 'FD')
      doc.setFontSize(10); doc.setTextColor(...ARDOISE)
      const ident = [
        ['Espèce', cert.espece, 'Animal / Troupeau', `${cert.patient}${(cert.nombre || 1) > 1 ? ` (${cert.nombre} animaux)` : ''}`],
        ['Propriétaire', cert.proprio || '—', 'Téléphone', cert.tel || '—'],
      ]
      ident.forEach(r => {
        doc.setFont('helvetica', 'bold'); doc.text(`${r[0]} :`, M + 4, y + 2.5)
        doc.setFont('helvetica', 'normal'); doc.text(String(r[1]), M + 36, y + 2.5)
        doc.setFont('helvetica', 'bold'); doc.text(`${r[2]} :`, W / 2 + 4, y + 2.5)
        doc.setFont('helvetica', 'normal'); doc.text(String(r[3]), W / 2 + 44, y + 2.5)
        y += 7
      })
      y += 8

      // ── Section Vaccinations ──
      y = sectionTitre('Vaccinations réalisées', y)
      autoTable(doc, {
        startY: y, margin: { left: M, right: M },
        head: [['Date', 'Vaccin', 'N° lot', 'Dose / Voie', 'Validité', 'Prochain rappel']],
        body: certLignes.map(l => [fmtDate(l.date), l.vaccin, l.lot || '—', [l.dose, l.voie].filter(Boolean).join(' · ') || '—', `${l.validite_mois} mois`, fmtDate(l.rappel)]),
        styles: { fontSize: 8.8, cellPadding: 2.6, textColor: ARDOISE, lineColor: [226, 232, 240], lineWidth: 0.2 },
        headStyles: { fillColor: VERT, textColor: [255, 255, 255], fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [248, 250, 252] },
        didParseCell: (d) => { if (d.section === 'body' && certLignes[d.row.index]?.id === cert.id) { d.cell.styles.fillColor = [240, 253, 244]; d.cell.styles.fontStyle = 'bold' } },
      })
      y = doc.lastAutoTable.finalY + 8

      if (cert.notes) {
        doc.setFontSize(9.5); doc.setFont('helvetica', 'bold'); doc.setTextColor(...ARDOISE); doc.text('Observations :', M, y)
        doc.setFont('helvetica', 'normal')
        const notes = doc.splitTextToSize(cert.notes, W - 2 * M - 30)
        doc.text(notes, M + 30, y); y += notes.length * 4.5 + 5
      }

      doc.setFont('helvetica', 'italic'); doc.setFontSize(8.8); doc.setTextColor(71, 85, 105)
      const legal = doc.splitTextToSize("Je soussigné(e), certifie avoir procédé à la vaccination de l'animal (ou du lot d'animaux) identifié ci-dessus, conformément aux règles de l'art et avec les vaccins mentionnés. Ce certificat est valable jusqu'à la date du prochain rappel.", W - 2 * M)
      doc.text(legal, M, y); y += legal.length * 4 + 8

      // ── Encadrés de signature ──
      const boxW = (W - 2 * M - 8) / 2, boxH = 34
      if (y + boxH > H - 24) y = H - 24 - boxH
      doc.setDrawColor(203, 213, 225); doc.setLineWidth(0.35)
      doc.roundedRect(M, y, boxW, boxH, 2, 2, 'D')
      doc.roundedRect(M + boxW + 8, y, boxW, boxH, 2, 2, 'D')
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ARDOISE)
      doc.text('Le Vétérinaire', M + 4, y + 6)
      doc.text('Le Propriétaire', M + boxW + 12, y + 6)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9.5)
      doc.text(cert.veterinaire || '', M + 4, y + 12)
      doc.setFontSize(7.5); doc.setTextColor(148, 163, 184)
      doc.text('Signature et cachet', M + 4, y + boxH - 4)
      doc.text('Lu et approuvé, signature', M + boxW + 12, y + boxH - 4)
      doc.setFont('helvetica', 'bold'); doc.setFontSize(9); doc.setTextColor(...ARDOISE)
      doc.text(`Fait le ${fmtDate(cert.date)}`, W - M, y - 4, { align: 'right' })

      // ── Pied de page d'authentification ──
      doc.setDrawColor(226, 232, 240); doc.setLineWidth(0.3)
      doc.line(M, H - 14, W - M, H - 14)
      doc.setFont('helvetica', 'normal'); doc.setFontSize(7); doc.setTextColor(148, 163, 184)
      doc.text(`Document officiel généré par ${nomClinique} · Certificat n° ${String(cert.id).slice(0, 8).toUpperCase()} · ${new Date().toLocaleString('fr-FR')}`, W / 2, H - 9, { align: 'center' })

      doc.save(`Certificat_Vaccination_${(cert.patient || 'animal').replace(/[^a-z0-9]/gi, '_')}_${cert.date || ''}.pdf`)
    } catch (e) { alert('Erreur PDF : ' + (e?.message || e)) }
  }
  // ── Filtres & stats ──
  const filtered = useMemo(() => vaccs.filter(v => {
    if (fEspece && v.espece !== fEspece) return false
    if (fStatut) { const s = statutVacc(v); if (fStatut === 'retard' && s.j >= 0) return false; if (fStatut === 'proche' && (s.j === null || s.j < 0 || s.j > 30)) return false; if (fStatut === 'ajour' && (s.j === null || s.j <= 30)) return false }
    if (q) { const t = q.toLowerCase(); return [v.patient, v.proprio, v.vaccin, v.espece].some(x => (x || '').toLowerCase().includes(t)) }
    return true
  }), [vaccs, q, fEspece, fStatut])

  const enRetard = vaccs.filter(v => { const j = joursAvant(v.rappel); return j !== null && j < 0 })
  const proches  = vaccs.filter(v => { const j = joursAvant(v.rappel); return j !== null && j >= 0 && j <= 30 })

  const KPIS = [
    { l: 'Vaccinations',   v: vaccs.length,    icon: Syringe,       color: '#0d9488' },
    { l: 'À jour',         v: vaccs.length - enRetard.length - proches.length, icon: CheckCircle2, color: '#16a34a' },
    { l: 'Rappels < 30j',  v: proches.length,  icon: CalendarClock, color: '#d97706' },
    { l: 'En retard',      v: enRetard.length, icon: AlertTriangle, color: '#dc2626' },
  ]

  // Historique du même animal / troupeau pour le certificat
  const certLignes = cert ? vaccs.filter(v => v.patient === cert.patient && v.espece === cert.espece && (v.proprio || '') === (cert.proprio || '')).sort((a, b) => (b.date || '').localeCompare(a.date || '')) : []

  const inp = { width: '100%', border: '1.5px solid #e2e8f0', borderRadius: '9px', padding: '8px', fontSize: '13px', outline: 'none', background: 'white' }
  const lbl = { fontSize: '11px', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '.05em', display: 'block', marginBottom: '5px' }

  return <div className="app-page space-y-5">

    {/* KPI */}
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {KPIS.map((k, i) => <div key={i} className="stat-tile" style={{ borderRadius: 14, padding: '14px 16px', background: 'white', border: '1px solid #f1f5f9' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
          <span style={{ width: 30, height: 30, borderRadius: 9, background: k.color + '18', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}><k.icon size={15} color={k.color} strokeWidth={2.3} /></span>
          <span style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '.04em' }}>{k.l}</span>
        </div>
        <div style={{ fontSize: 24, fontWeight: 900, color: k.color, fontFamily: "'Space Mono',monospace" }}>{k.v}</div>
      </div>)}
    </div>

    {/* Alerte rappels */}
    {(enRetard.length > 0 || proches.length > 0) && <div style={{ background: '#fffbeb', border: '2px solid #fde68a', borderRadius: 14, padding: '14px 18px' }}>
      <div style={{ fontWeight: 800, color: '#d97706', marginBottom: 8, display: 'flex', alignItems: 'center', gap: 6 }}>
        <CalendarClock size={16} strokeWidth={2.4} /> {enRetard.length + proches.length} rappel(s) à traiter
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {[...enRetard, ...proches].slice(0, 8).map(v => { const s = statutVacc(v); return (
          <div key={v.id} style={{ background: 'white', borderRadius: 9, padding: '8px 12px', border: `1px solid ${s.j < 0 ? '#fecaca' : '#fde68a'}`, fontSize: 13, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontWeight: 700 }}>{v.patient}</span>
            <span style={{ color: '#64748b' }}>{v.vaccin}</span>
            <span style={{ color: s.j < 0 ? '#dc2626' : '#d97706', fontWeight: 700 }}>{s.j < 0 ? `${-s.j}j de retard` : s.j === 0 ? "Aujourd'hui" : `dans ${s.j}j`}</span>
            {v.tel && <button onClick={() => envoyerRappelWA(v)} title="Rappel WhatsApp"
              style={{ background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, padding: '3px 7px', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
              <MessageCircle size={13} color="#16a34a" strokeWidth={2.4} /></button>}
          </div>) })}
      </div>
    </div>}

    <div className="app-card">
      <div className="p-5 border-b flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-xl font-bold flex items-center gap-2"><ShieldPlus size={20} color="#0d9488" strokeWidth={2.3} /> Vaccinations</h2>
          <p className="text-sm text-slate-500">{vaccs.length} vaccination(s) enregistrée(s) · rappels périodiques automatiques</p>
        </div>
        <button onClick={() => setShowForm(!showForm)}
          style={{ padding: '8px 16px', borderRadius: 10, fontSize: 13, fontWeight: 700, cursor: 'pointer', background: showForm ? '#ef4444' : 'linear-gradient(135deg,#166534,#1d4ed8)', color: 'white', border: 'none' }}>
          {showForm ? '✕ Annuler' : '+ Nouvelle vaccination'}
        </button>
      </div>

      {/* Formulaire */}
      {showForm && <div style={{ padding: 20, background: '#f0fdfa', borderBottom: '1px solid #99f6e4' }}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-3">
          <div><label style={lbl}>Date</label><input type="date" value={form.date} onChange={changeDate} style={inp} /></div>
          <div><label style={lbl}>Espèce *</label>
            <select value={form.espece} onChange={changeEspece} style={inp}>{ESPECES.map(e => <option key={e}>{e}</option>)}</select></div>
          <div><label style={lbl}>Animal / Troupeau *</label>
            <input value={form.patient} onChange={changePatient} list="vacc-patients" placeholder="Nom ou identification…" style={inp} />
            <datalist id="vacc-patients">{patients.map(p => <option key={p.id} value={p.nom}>{p.espece}{p.proprio ? ` · ${p.proprio}` : ''}</option>)}</datalist></div>
          <div><label style={lbl}>Nombre d'animaux</label><input type="number" min="1" value={form.nombre} onChange={f('nombre')} style={inp} /></div>
          <div><label style={lbl}>Propriétaire</label><input value={form.proprio} onChange={f('proprio')} placeholder="Nom et prénom" style={inp} /></div>
          <div><label style={lbl}>Téléphone</label><input value={form.tel} onChange={f('tel')} placeholder="+227…" style={inp} /></div>
          <div className="col-span-2"><label style={lbl}>Vaccin *</label>
            {form.espece === 'Autre'
              ? <input value={form.autreVaccin} onChange={f('autreVaccin')} placeholder="Nom du vaccin…" style={inp} />
              : <select value={form.vaccin} onChange={changeVaccin} style={inp}>
                  <option value="">— Choisir —</option>
                  {(PROTOCOLES[form.espece] || []).map(p => <option key={p.v} value={p.v}>{p.v} (validité {p.m} mois)</option>)}
                  <option value="__autre">Autre vaccin…</option>
                </select>}
            {form.vaccin === '__autre' && form.espece !== 'Autre' && <input value={form.autreVaccin} onChange={f('autreVaccin')} placeholder="Nom du vaccin…" style={{ ...inp, marginTop: 6 }} />}
          </div>
          <div><label style={lbl}>N° de lot</label><input value={form.lot} onChange={f('lot')} placeholder="Lot du vaccin" style={inp} /></div>
          <div><label style={lbl}>Dose</label><input value={form.dose} onChange={f('dose')} placeholder="ex: 1 ml / animal" style={inp} /></div>
          <div><label style={lbl}>Voie</label><select value={form.voie} onChange={f('voie')} style={inp}>{VOIES.map(v => <option key={v}>{v}</option>)}</select></div>
          <div><label style={lbl}>Vétérinaire</label>
            {equipe.length ? <select value={form.veterinaire} onChange={f('veterinaire')} style={inp}>
              <option value="">—</option>
              {equipe.map((m, i) => <option key={i} value={m.nom || m.name || m}>{m.nom || m.name || m}</option>)}
              {user?.name && !equipe.some(m => (m.nom || m.name || m) === user.name) && <option value={user.name}>{user.name}</option>}
            </select> : <input value={form.veterinaire} onChange={f('veterinaire')} style={inp} />}
          </div>
          <div><label style={lbl}>Validité (mois)</label><input type="number" min="1" value={form.validite} onChange={changeValidite} style={inp} /></div>
          <div><label style={lbl}>Prochain rappel</label><input type="date" value={form.rappel} onChange={f('rappel')} style={inp} />
            <p style={{ fontSize: 10, color: '#94a3b8', marginTop: 3 }}>Calculé automatiquement, modifiable</p></div>
          <div className="col-span-2"><label style={lbl}>Notes</label><input value={form.notes} onChange={f('notes')} placeholder="Observations…" style={inp} /></div>
        </div>
        <button onClick={enregistrer} disabled={saving}
          style={{ padding: '10px 20px', borderRadius: 10, background: 'linear-gradient(135deg,#166534,#1d4ed8)', color: 'white', border: 'none', fontWeight: 700, fontSize: 14, cursor: 'pointer', opacity: saving ? .6 : 1 }}>
          {saving ? 'Enregistrement…' : '✓ Enregistrer et générer le certificat'}
        </button>
      </div>}

      {/* Filtres */}
      <div className="p-4 border-b flex flex-wrap items-center gap-2">
        <input value={q} onChange={e => setQ(e.target.value)} placeholder="Rechercher animal, propriétaire, vaccin…"
          style={{ flex: 1, minWidth: 200, border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px 12px', fontSize: 13, outline: 'none' }} />
        <select value={fEspece} onChange={e => setFEspece(e.target.value)} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px', fontSize: 13, outline: 'none', background: 'white' }}>
          <option value="">Toutes espèces</option>{ESPECES.map(e => <option key={e}>{e}</option>)}
        </select>
        <select value={fStatut} onChange={e => setFStatut(e.target.value)} style={{ border: '1.5px solid #e2e8f0', borderRadius: 10, padding: '8px', fontSize: 13, outline: 'none', background: 'white' }}>
          <option value="">Tous statuts</option>
          <option value="ajour">À jour</option>
          <option value="proche">Rappel &lt; 30j</option>
          <option value="retard">En retard</option>
        </select>
      </div>

      {/* Liste */}
      <div className="p-4">
        {!loading && !filtered.length && <EmptyState icon={ShieldPlus} title="Aucune vaccination" subtitle="Enregistrez une vaccination pour générer le certificat et suivre les rappels." />}
        <div className="space-y-2">
          {filtered.map(v => { const s = statutVacc(v); return (
            <div key={v.id} className="rounded-xl border border-slate-200 hover:bg-slate-50 transition-all" style={{ padding: '12px 14px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12, flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: 200 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                    <span style={{ fontWeight: 800, fontSize: 14 }}>{v.patient}</span>
                    <Badge color="slate">{v.espece}</Badge>
                    {(v.nombre || 1) > 1 && <Badge color="blue">{v.nombre} animaux</Badge>}
                    <Badge color={s.color}>{s.label}</Badge>
                  </div>
                  <div style={{ fontSize: 12, color: '#64748b', marginTop: 3 }}>
                    {v.vaccin} · vacciné le {fmtDate(v.date)} · rappel {fmtDate(v.rappel)}{v.proprio ? ` · ${v.proprio}` : ''}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
                  <button onClick={() => setCert(cert?.id === v.id ? null : v)} title="Certificat"
                    style={{ padding: '6px 10px', borderRadius: 8, background: cert?.id === v.id ? '#0d9488' : '#f0fdfa', color: cert?.id === v.id ? 'white' : '#0d9488', border: '1px solid #99f6e4', cursor: 'pointer', fontSize: 12, fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: 5 }}>
                    <Printer size={13} strokeWidth={2.4} /> Certificat</button>
                  <button onClick={() => revacciner(v)} title="Revacciner aujourd'hui"
                    style={{ padding: '6px 10px', borderRadius: 8, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    <RotateCw size={13} strokeWidth={2.4} /></button>
                  {v.tel && <button onClick={() => envoyerRappelWA(v)} title="Rappel WhatsApp"
                    style={{ padding: '6px 10px', borderRadius: 8, background: '#f0fdf4', color: '#16a34a', border: '1px solid #bbf7d0', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                    <MessageCircle size={13} strokeWidth={2.4} /></button>}
                  {confirmDel === v.id
                    ? <button onClick={() => supprimer(v.id)} style={{ padding: '6px 10px', borderRadius: 8, background: '#dc2626', color: 'white', border: 'none', cursor: 'pointer', fontSize: 12, fontWeight: 700 }}>Confirmer ?</button>
                    : <button onClick={() => setConfirmDel(v.id)} title="Supprimer"
                        style={{ padding: '6px 10px', borderRadius: 8, background: '#fef2f2', color: '#ef4444', border: '1px solid #fecaca', cursor: 'pointer', display: 'inline-flex', alignItems: 'center' }}>
                        <Trash2 size={13} strokeWidth={2.4} /></button>}
                </div>
              </div>
            </div>) })}
        </div>
      </div>
    </div>

    {/* ── Certificat imprimable ── */}
    {cert && <div className="app-card p-5">
      <div className="flex items-center justify-between flex-wrap gap-3 mb-4 no-print">
        <h3 className="font-bold text-base flex items-center gap-2"><Printer size={17} color="#0d9488" strokeWidth={2.3} /> Certificat de vaccination — {cert.patient}</h3>
        <div className="flex gap-2 flex-wrap">
          <button onClick={telechargerPDF}
            style={{ padding: '8px 14px', borderRadius: 10, background: '#eff6ff', color: '#2563eb', border: '1px solid #bfdbfe', fontWeight: 700, fontSize: 13, cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <FileDown size={15} strokeWidth={2.4} /> Télécharger PDF
          </button>
          <PrintBtn zoneId="vaccin-print" label="Imprimer le certificat" />
        </div>
      </div>

      <div id="vaccin-print" style={{ background: 'white', border: '1px solid #e2e8f0', borderRadius: 12, padding: '28px 32px', maxWidth: 800, margin: '0 auto', fontFamily: 'Georgia, serif', color: '#1e293b' }}>
        {/* En-tête — personnalisable dans Paramètres clinique */}
        <div style={{ textAlign: 'center', borderBottom: '3px double #14532d', paddingBottom: 14, marginBottom: 18 }}>
          <img src="/logo.png" alt="" style={{ width: 74, height: 74, borderRadius: '50%', objectFit: 'cover', display: 'block', margin: '0 auto 8px' }} onError={e => { e.currentTarget.style.display = 'none' }} />
          <div style={{ fontSize: 22, fontWeight: 900, color: '#14532d' }}>{clinique?.nom || 'La Barakat'}</div>
          <div style={{ fontSize: 13, color: '#166534', fontWeight: 700 }}>{clinique?.sousTitre || 'Pharmacie & Clinique Vétérinaire'}</div>
          {(clinique?.adresse || clinique?.ville || clinique?.tel || clinique?.email) && <div style={{ fontSize: 12, color: '#475569', marginTop: 4 }}>
            {[[clinique?.adresse, clinique?.ville].filter(Boolean).join(', '), clinique?.tel && `Tél : ${clinique.tel}`, clinique?.email].filter(Boolean).join(' · ')}
          </div>}
          {clinique?.agrement && <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>Agrément n° {clinique.agrement}</div>}
          <div style={{ fontSize: 18, fontWeight: 800, letterSpacing: '.14em', marginTop: 12, textTransform: 'uppercase' }}>Certificat de vaccination</div>
          <div style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>N° {String(cert.id).slice(0, 8).toUpperCase()} · Établi le {fmtDate(cert.date)}</div>
        </div>

        {/* Identification */}
        <table style={{ width: '100%', fontSize: 13, marginBottom: 16, borderCollapse: 'collapse' }}>
          <tbody>
            <tr>
              <td style={{ padding: '5px 0', width: '50%' }}><b>Espèce :</b> {cert.espece}</td>
              <td style={{ padding: '5px 0' }}><b>Animal / Troupeau :</b> {cert.patient}{(cert.nombre || 1) > 1 ? ` (${cert.nombre} animaux)` : ''}</td>
            </tr>
            <tr>
              <td style={{ padding: '5px 0' }}><b>Propriétaire :</b> {cert.proprio || '—'}</td>
              <td style={{ padding: '5px 0' }}><b>Téléphone :</b> {cert.tel || '—'}</td>
            </tr>
          </tbody>
        </table>

        {/* Vaccinations */}
        <table style={{ width: '100%', fontSize: 12.5, borderCollapse: 'collapse', marginBottom: 18 }}>
          <thead>
            <tr style={{ background: '#f0fdf4' }}>
              {['Date', 'Vaccin', 'N° lot', 'Dose / Voie', 'Validité', 'Prochain rappel'].map(h =>
                <th key={h} style={{ border: '1px solid #cbd5e1', padding: '7px 9px', textAlign: 'left', color: '#14532d' }}>{h}</th>)}
            </tr>
          </thead>
          <tbody>
            {certLignes.map(l => <tr key={l.id} style={{ background: l.id === cert.id ? '#fefce8' : 'white' }}>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 9px' }}>{fmtDate(l.date)}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 9px', fontWeight: 700 }}>{l.vaccin}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 9px' }}>{l.lot || '—'}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 9px' }}>{[l.dose, l.voie].filter(Boolean).join(' · ') || '—'}</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 9px' }}>{l.validite_mois} mois</td>
              <td style={{ border: '1px solid #cbd5e1', padding: '6px 9px', fontWeight: 700 }}>{fmtDate(l.rappel)}</td>
            </tr>)}
          </tbody>
        </table>

        {cert.notes && <p style={{ fontSize: 12, marginBottom: 16 }}><b>Observations :</b> {cert.notes}</p>}

        <p style={{ fontSize: 11.5, color: '#475569', fontStyle: 'italic', marginBottom: 26 }}>
          Je soussigné(e), certifie avoir procédé à la vaccination de l'animal (ou du lot d'animaux) identifié ci-dessus,
          conformément aux règles de l'art et avec les vaccins mentionnés. Ce certificat est valable jusqu'à la date du prochain rappel.
        </p>

        {/* Signatures */}
        <table style={{ width: '100%', fontSize: 12.5 }}>
          <tbody>
            <tr>
              <td style={{ width: '50%', verticalAlign: 'top' }}>
                <b>Le Vétérinaire</b><br />{cert.veterinaire || '________________'}<br /><br /><br />
                <span style={{ color: '#94a3b8' }}>Signature et cachet</span>
              </td>
              <td style={{ width: '50%', verticalAlign: 'top', textAlign: 'right' }}>
                Fait le {fmtDate(cert.date)}<br /><br /><br /><br />
                <span style={{ color: '#94a3b8' }}>Le Propriétaire</span>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>}
  </div>
}

export default Vaccinations
