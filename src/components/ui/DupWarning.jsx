import Btn from './Btn'

function DupWarning({ dups, entity, onOk, onCancel }) {
  if (!dups || !dups.length) return null
  return (
    <div className="bg-amber-50 border-2 border-amber-300 rounded-xl p-4 mb-4">
      <div className="flex gap-3">
        <span className="text-2xl">⚠️</span>
        <div className="flex-1">
          <p className="font-bold text-amber-800">Doublon détecté !</p>
          {dups.map((d, i) => (
            <div key={i} className="text-sm bg-amber-100 rounded px-3 py-1 mt-1 font-medium text-amber-900">
              → {d.nom} {d.tel ? '· ' + d.tel : ''} {d.espece ? '(' + d.espece + ')' : ''}
            </div>
          ))}
          <div className="flex gap-2 mt-3">
            <Btn onClick={onOk} color="amber" sm>
              Continuer quand même
            </Btn>
            <Btn onClick={onCancel} color="slate" sm>
              Annuler
            </Btn>
          </div>
        </div>
      </div>
    </div>
  )
}

export default DupWarning
