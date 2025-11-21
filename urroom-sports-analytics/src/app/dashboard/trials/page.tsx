"use client";

export default function TrialsPage() {
  return (
    <main style={{padding:'2rem'}}>
      <div style={{marginBottom:'1.5rem'}}>
        <a href="/dashboard/overview" style={{textDecoration:'none'}}>
          <button style={{background:'#14B8A6',color:'#fff',border:'none',borderRadius:'6px',padding:'0.5rem 1.2rem',fontWeight:600,fontSize:'1rem',boxShadow:'0 2px 8px 0 rgba(16,30,54,0.06)',cursor:'pointer',transition:'background 0.18s'}} onMouseOver={e=>e.currentTarget.style.background='#0F766E'} onMouseOut={e=>e.currentTarget.style.background='#14B8A6'}>&larr; Retour</button>
        </a>
      </div>
      <h1 style={{fontSize:'2rem',fontWeight:700,marginBottom:'1.5rem'}}>Demandes d’essai</h1>
      <p style={{color:'#64748B'}}>Page de gestion des demandes d’essai. (À implémenter)</p>
    </main>
  );
}
