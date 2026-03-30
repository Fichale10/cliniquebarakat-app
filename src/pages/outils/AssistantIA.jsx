import { useState, useEffect, useRef, useMemo } from 'react'
import { logAction } from '../../lib/roles'

function AssistantIA({patients, meds, user}){
  const [messages,setMessages]=useState([
    {role:'assistant',content:'Bonjour ! Je suis l\'assistant IA de La Barakat 🐾\n\nJe peux vous aider avec :\n• **Calcul de posologie** selon le poids de l\'animal\n• **Aide au diagnostic** différentiel\n• **Interactions médicamenteuses**\n• **Protocoles de vaccination**\n• **Questions générales** en médecine vétérinaire\n\nComment puis-je vous aider ?'}
  ]);
  const [input,setInput]=useState('');
  const [loading,setLoading]=useState(false);
  const [selectedPat,setSelectedPat]=useState('');
  const chatRef=useRef(null);

  useEffect(()=>{ if(chatRef.current) chatRef.current.scrollTop=chatRef.current.scrollHeight; },[messages]);

  const buildContext=()=>{
    let ctx='Tu es un assistant vétérinaire expert intégré dans le logiciel La Barakat (Pharmacie & Clinique Vétérinaire, Lomé, Togo). Tu réponds en français, de manière professionnelle mais accessible. Tu fournis des informations médicales vétérinaires précises. Rappelle toujours que le vétérinaire doit confirmer tout diagnostic ou traitement.\n\n';
    if(selectedPat){
      const p=patients.find(pa=>pa.nom===selectedPat);
      if(p) ctx+=`Patient sélectionné : ${p.nom} (${p.espece}, ${p.race}, ${p.age}, ${p.poids})\nAllergies : ${p.allergies||'Aucune'}\nAntécédents : ${p.antecedents||'Aucun'}\n\n`;
    }
    ctx+=`Médicaments disponibles en stock : ${meds.filter(m=>m.stock>0).slice(0,15).map(m=>`${m.nom} (${m.categorie}, dose: ${m.doseMgKg||'?'} mg/kg)`).join(', ')}\n`;
    return ctx;
  };

  const sendMessage=async()=>{
    if(!input.trim()||loading) return;
    const userMsg={role:'user',content:input};
    setMessages(m=>[...m,userMsg]);
    setInput('');setLoading(true);

    try{
      const resp=await fetch('https://api.anthropic.com/v1/messages',{
        method:'POST',
        headers:{'Content-Type':'application/json'},
        body:JSON.stringify({
          model:'claude-sonnet-4-20250514',
          max_tokens:1000,
          system:buildContext(),
          messages:[...messages.filter(m=>m.role!=='assistant'||messages.indexOf(m)>0),userMsg].map(m=>({role:m.role,content:m.content})),
        })
      });
      const data=await resp.json();
      const reply=data.content?.[0]?.text||'Désolé, je n\'ai pas pu traiter votre demande.';
      setMessages(m=>[...m,{role:'assistant',content:reply}]);
      logAction(user,'assistant_ia',input.substring(0,80));
    }catch(e){
      setMessages(m=>[...m,{role:'assistant',content:'❌ Erreur de connexion à l\'IA. Vérifiez votre connexion internet.'}]);
    }
    setLoading(false);
  };

  const SHORTCUTS=[
    'Calcule la dose d\'amoxicilline pour un chien de 15 kg',
    'Quels sont les signes d\'une parvovirose canine ?',
    'Protocole de vaccination chaton',
    'Interactions entre ivermectine et autres antiparasitaires',
    'Dosage du kétoprofène chez le bovin',
  ];

  const renderMsg=(content)=>content.split('\n').map((line,i)=>{
    if(line.startsWith('**')&&line.endsWith('**')) return <strong key={i} style={{display:'block',marginTop:'4px'}}>{line.slice(2,-2)}</strong>;
    if(line.startsWith('• ')) return <div key={i} style={{paddingLeft:'12px',color:'inherit'}}>• {line.slice(2)}</div>;
    return <span key={i}>{line}<br/></span>;
  });

  return <div className="app-page space-y-4">
    <div className="app-card overflow-hidden" style={{height:'calc(100vh - 180px)',display:'flex',flexDirection:'column'}}>
      {/* Header */}
      <div style={{padding:'14px 18px',borderBottom:'1px solid #e2e8f0',display:'flex',alignItems:'center',justifyContent:'space-between',flexWrap:'wrap',gap:'10px',flexShrink:0}}>
        <div style={{display:'flex',alignItems:'center',gap:'10px'}}>
          <div style={{width:'38px',height:'38px',borderRadius:'10px',background:'linear-gradient(135deg,#166534,#1d4ed8)',display:'flex',alignItems:'center',justifyContent:'center',fontSize:'20px'}}>🤖</div>
          <div>
            <div style={{fontWeight:800,fontSize:'15px',color:'#1e293b'}}>Assistant IA Vétérinaire</div>
            <div style={{fontSize:'11px',color:'#94a3b8'}}>Propulsé par Claude · Informations à valider par un vétérinaire</div>
          </div>
        </div>
        <select value={selectedPat} onChange={e=>setSelectedPat(e.target.value)}
          style={{border:'1.5px solid #e2e8f0',borderRadius:'9px',padding:'6px 10px',fontSize:'12px',outline:'none',maxWidth:'200px'}}>
          <option value="">Sans patient sélectionné</option>
          {patients.map(p=><option key={p.id} value={p.nom}>{p.nom} ({p.espece})</option>)}
        </select>
      </div>

      {/* Messages */}
      <div ref={chatRef} style={{flex:1,overflowY:'auto',padding:'16px',display:'flex',flexDirection:'column',gap:'12px'}}>
        {messages.map((m,i)=><div key={i} style={{display:'flex',justifyContent:m.role==='user'?'flex-end':'flex-start'}}>
          <div style={{
            maxWidth:'80%',padding:'12px 14px',borderRadius:m.role==='user'?'16px 16px 4px 16px':'16px 16px 16px 4px',
            background:m.role==='user'?'linear-gradient(135deg,#166534,#1d4ed8)':'#f8fafc',
            color:m.role==='user'?'white':'#1e293b',
            fontSize:'13px',lineHeight:'1.6',
            border:m.role==='assistant'?'1px solid #e2e8f0':'none',
            boxShadow:'0 1px 4px rgba(0,0,0,0.06)',
          }}>
            {renderMsg(m.content)}
          </div>
        </div>)}
        {loading&&<div style={{display:'flex',gap:'4px',padding:'12px 14px',background:'#f8fafc',borderRadius:'16px 16px 16px 4px',width:'fit-content',border:'1px solid #e2e8f0'}}>
          {[0,1,2].map(i=><div key={i} style={{width:'8px',height:'8px',borderRadius:'50%',background:'#94a3b8',animation:'bounce 1.2s infinite',animationDelay:`${i*0.2}s`}}/>)}
        </div>}
      </div>

      {/* Raccourcis */}
      {messages.length<=1&&<div style={{padding:'0 16px 12px',display:'flex',flexWrap:'wrap',gap:'6px',flexShrink:0}}>
        {SHORTCUTS.map((s,i)=><button key={i} onClick={()=>{setInput(s);}}
          style={{fontSize:'12px',padding:'5px 10px',borderRadius:'999px',border:'1px solid #e2e8f0',background:'white',color:'#475569',cursor:'pointer',fontWeight:500,transition:'all .15s'}}
          onMouseEnter={e=>{e.target.style.borderColor='#166534';e.target.style.color='#166534';}}
          onMouseLeave={e=>{e.target.style.borderColor='#e2e8f0';e.target.style.color='#475569';}}>
          {s}
        </button>)}
      </div>}

      {/* Input */}
      <div style={{padding:'12px 16px',borderTop:'1px solid #e2e8f0',display:'flex',gap:'10px',flexShrink:0}}>
        <input value={input} onChange={e=>setInput(e.target.value)} onKeyDown={e=>e.key==='Enter'&&!e.shiftKey&&sendMessage()}
          placeholder="Posez votre question vétérinaire…"
          style={{flex:1,border:'1.5px solid #e2e8f0',borderRadius:'12px',padding:'10px 14px',fontSize:'14px',outline:'none',fontFamily:"'Outfit',sans-serif"}}
          onFocus={e=>e.target.style.borderColor='#166534'} onBlur={e=>e.target.style.borderColor='#e2e8f0'}/>
        <button onClick={sendMessage} disabled={loading||!input.trim()}
          style={{padding:'10px 18px',borderRadius:'12px',border:'none',background:'linear-gradient(135deg,#166534,#1d4ed8)',color:'white',fontWeight:700,fontSize:'14px',cursor:'pointer',opacity:loading||!input.trim()?0.5:1,transition:'opacity .2s'}}>
          ↑
        </button>
      </div>
    </div>
  </div>;
}


// ══════════════════════════════════════════════════════════════
//   NOTIFICATIONS PUSH
// ══════════════════════════════════════════════════════════════

export default AssistantIA
