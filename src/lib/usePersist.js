// src/lib/usePersist.js
// Hook qui remplace useState par une version persistée en localStorage
// Usage identique à useState, mais les données survivent au refresh
//
// import { usePersist } from '../../lib/usePersist'
// const [consults, setConsults] = usePersist('consultations', [])

import { useState, useEffect, useRef } from 'react';

const PREFIX = 'lb_';

function read(key) {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function write(key, value) {
  try {
    localStorage.setItem(PREFIX + key, JSON.stringify(value));
  } catch (e) {
    console.warn('usePersist write error:', key, e);
  }
}

export function usePersist(key, initialValue) {
  const [state, setState] = useState(() => {
    const stored = read(key);
    return stored !== null ? stored : initialValue;
  });

  // Ref pour éviter l'écriture au premier render si la valeur vient du cache
  const isFirstRender = useRef(true);

  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }
    write(key, state);
  }, [key, state]);

  // Setter enrichi qui accepte aussi une fonction (comme useState)
  const setPersisted = (valueOrFn) => {
    setState(prev => {
      const next = typeof valueOrFn === 'function' ? valueOrFn(prev) : valueOrFn;
      write(key, next); // écriture synchrone immédiate
      return next;
    });
  };

  return [state, setPersisted];
}