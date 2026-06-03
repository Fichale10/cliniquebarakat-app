import { NAV_ALL } from './data'

export const DEFAULT_VIEW = 'dashboard'

export const VIEW_IDS = NAV_ALL.map((n) => n.id)

const VIEW_SET = new Set(VIEW_IDS)

export function isValidView(id) {
  return typeof id === 'string' && VIEW_SET.has(id)
}

export function pathForView(viewId) {
  return `/${isValidView(viewId) ? viewId : DEFAULT_VIEW}`
}
