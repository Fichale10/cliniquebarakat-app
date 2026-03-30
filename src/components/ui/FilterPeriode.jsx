import { useState, useEffect, useRef, useMemo } from 'react'
import FilterSelect from './FilterSelect'

function FilterPeriode({value,onChange}){
  const opts=[{v:'',l:'Toutes périodes'},{v:'jour',l:"Aujourd'hui"},{v:'semaine',l:'Cette semaine'},{v:'mois',l:'Ce mois'},{v:'annee',l:'Cette année'}];
  return <FilterSelect label="📅 Période" value={value} onChange={onChange} options={opts}/>;
}

// Hook utilitaire filtre date

export default FilterPeriode
