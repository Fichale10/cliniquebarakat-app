import { useState } from 'react';

// Exporte la date d'aujourd'hui au format ISO (AAAA-MM-JJ)
export const today = new Date().toISOString().split('T')[0];

export function useDateFilter(initialDate = '') {
  const [date, setDate] = useState(initialDate);

  const handleDateChange = (e) => {
    setDate(e.target.value);
  };

  const resetDate = () => {
    setDate(initialDate);
  };

  return {
    date,
    setDate,
    handleDateChange,
    resetDate
  };
}
