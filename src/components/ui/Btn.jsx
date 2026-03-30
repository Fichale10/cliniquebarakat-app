function Btn({onClick,children,color='brand',sm,className=''}){
  const styles={
    brand:{background:'linear-gradient(135deg,#166534,#1d4ed8)',boxShadow:'0 2px 10px rgba(22,101,52,0.25)',border:'none'},
    accent:{background:'linear-gradient(180deg,#f97316,#ea580c)',boxShadow:'0 2px 12px rgba(234,88,12,0.38)',border:'none'},
    blue:{background:'#2563eb',border:'none'},
    slate:{background:'#475569',border:'none'},
    green:{background:'#15803d',border:'none'},
    red:{background:'#dc2626',border:'none'},
    amber:{background:'#d97706',border:'none'},
  };
  const s=styles[color]||styles.brand;
  return <button onClick={onClick} style={{...s,borderRadius:'10px',transition:'all .2s',cursor:'pointer'}}
    className={`text-white font-semibold transition-all hover:brightness-110 hover:-translate-y-px active:translate-y-0 ${sm?'text-xs px-3 py-1.5':'text-sm px-4 py-2'} ${className}`}>{children}</button>;
}

export default Btn
