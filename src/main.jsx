import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { registerSW } from 'virtual:pwa-register'
import Root from './Root'
import './index.css'

// ── Mise à jour PWA : bandeau « Nouvelle version disponible » ──
// Évite que les postes restent sur une ancienne version sans le savoir.
const updateSW = registerSW({
  onNeedRefresh() {
    if (document.getElementById('pwa-update-banner')) return
    const bar = document.createElement('div')
    bar.id = 'pwa-update-banner'
    bar.style.cssText = 'position:fixed;bottom:16px;left:50%;transform:translateX(-50%);z-index:99999;background:#0d9488;color:white;padding:10px 16px;border-radius:14px;box-shadow:0 8px 30px rgba(0,0,0,.3);display:flex;gap:12px;align-items:center;font-size:14px;font-weight:600;max-width:92vw'
    const txt = document.createElement('span')
    txt.textContent = '🔄 Nouvelle version de l\'application disponible'
    const btn = document.createElement('button')
    btn.textContent = 'Mettre à jour'
    btn.style.cssText = 'background:white;color:#0d9488;font-weight:800;border:none;border-radius:10px;padding:7px 14px;cursor:pointer;font-size:13px'
    btn.onclick = () => updateSW(true)
    const later = document.createElement('button')
    later.textContent = 'Plus tard'
    later.style.cssText = 'background:transparent;color:rgba(255,255,255,.8);font-weight:700;border:1px solid rgba(255,255,255,.4);border-radius:10px;padding:7px 12px;cursor:pointer;font-size:13px'
    later.onclick = () => bar.remove()
    bar.append(txt, btn, later)
    document.body.appendChild(bar)
  },
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <BrowserRouter>
    <Root />
  </BrowserRouter>
)