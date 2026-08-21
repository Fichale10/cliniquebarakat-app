// ============================================================
//  AppIcons — icônes professionnelles (Lucide) pour remplacer
//  les émojis. Usage : <NavIcon id="patients" size={16} />
// ============================================================
import {
  Home, User, Settings, ShieldCheck, ScrollText, Microscope,
  ShoppingCart, Bot, Bell, BarChart3, FileDown, Map, Syringe,
  PawPrint, Stethoscope, FolderOpen, FileText, Scissors, Bed,
  Calendar, ListChecks, Calculator, FileSignature, Users, Factory,
  Receipt, FileSpreadsheet, Coins, Pill, Package, ClipboardList,
  Wallet, TrendingUp, History, ShieldPlus,
} from 'lucide-react'

/** Icône par identifiant de page (NAV_ALL) */
export const NAV_ICONS = {
  dashboard:       Home,
  monprofil:       User,
  parametres:      Settings,
  comptes:         ShieldCheck,
  journal:         ScrollText,
  lots:            Microscope,
  caisse:          ShoppingCart,
  ia:              Bot,
  notifications:   Bell,
  rapports:        BarChart3,
  rapportspdf:     FileDown,
  carteclients:    Map,
  traitements:     Syringe,
  patients:        PawPrint,
  consultations:   Stethoscope,
  dossiers:        FolderOpen,
  ordonnances:     FileText,
  chirurgies:      Scissors,
  hospitalisation: Bed,
  agenda:          Calendar,
  taches:          ListChecks,
  calculateur:     Calculator,
  consentements:   FileSignature,
  vaccinations:    ShieldPlus,
  clients:         Users,
  fournisseurs:    Factory,
  factures:        Receipt,
  devis:           FileSpreadsheet,
  creances:        Coins,
  medicaments:     Pill,
  commandes:       Package,
  inventaire:      ClipboardList,
  depenses:        Wallet,
  finances:        TrendingUp,
  historique:      History,
}

export function NavIcon({ id, size = 16, color, strokeWidth = 2.1, style }) {
  const Icon = NAV_ICONS[id] || ClipboardList
  return <Icon size={size} color={color || 'currentColor'} strokeWidth={strokeWidth} style={style} aria-hidden />
}
