"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Button from '../../components/ui/Button';
import Image from 'next/image';

export default function PlayersDashboard() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [players, setPlayers] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  // Rediriger les CLUB vers la page de recherche
  useEffect(() => {
    if (status === 'loading') return;
    if (session?.user?.role === 'CLUB') {
      router.push('/dashboard/players/search');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/players`)
      .then(res => res.json())
      .then(setPlayers);
  }, []);

  const filtered = players.filter(p =>
    (p.firstName + ' ' + p.lastName).toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section style={{ padding: '2rem' }}>
      <div style={{marginBottom:'1.5rem'}}>
        <Link href="/dashboard/overview" style={{textDecoration:'none'}}>
          <button style={{background:'#14B8A6',color:'#fff',border:'none',borderRadius:'6px',padding:'0.5rem 1.2rem',fontWeight:600,fontSize:'1rem',boxShadow:'0 2px 8px 0 rgba(16,30,54,0.06)',cursor:'pointer',transition:'background 0.18s'}} onMouseOver={e=>e.currentTarget.style.background='#0F766E'} onMouseOut={e=>e.currentTarget.style.background='#14B8A6'}>&larr; Retour</button>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 style={{ fontSize: '1.75rem', fontWeight: 700, color: '#E2E8F0', letterSpacing: '0.04em', textTransform: 'uppercase' }}>Joueurs</h1>
        <Link href="/dashboard/players/new">
          <Button>Ajouter un joueur</Button>
        </Link>
      </div>
      <div style={{
        background: 'linear-gradient(145deg, #0B1220 0%, #0F172A 100%)',
        border: '1px solid #1F2937',
        borderRadius: '14px',
        padding: '1.75rem',
        boxShadow: '0 18px 40px rgba(2, 6, 23, 0.35)'
      }}>
        <input
          style={{
            width: '100%',
            marginBottom: '1.5rem',
            padding: '0.65rem 0.85rem',
            borderRadius: '10px',
            border: '1px solid #334155',
            background: '#0B1220',
            color: '#E2E8F0',
            outline: 'none'
          }}
          placeholder="Recherche joueur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0 0.65rem' }}>
          <thead>
            <tr style={{ background: '#0B1220' }}>
              {['Photo', 'Prénom', 'Nom', 'Poste', 'Pays', 'Tags', ''].map((label, idx) => (
                <th key={label || idx} style={{
                  padding: '0.85rem 1rem',
                  textAlign: 'left',
                  color: '#A8B3CF',
                  fontSize: '0.75rem',
                  letterSpacing: '0.14em',
                  textTransform: 'uppercase'
                }}>
                  {label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filtered.map((player, index) => {
              const rowBg = index % 2 === 0 ? '#0B1220' : '#0F172A';
              const baseCell = {
                background: rowBg,
                borderTop: '1px solid #1F2937',
                borderBottom: '1px solid #1F2937',
                padding: '0.75rem 1rem',
                color: '#E2E8F0',
                fontSize: '0.95rem'
              } as const;
              return (
                <tr key={player.id}>
                  <td style={{ ...baseCell, borderLeft: '1px solid #1F2937', borderTopLeftRadius: '12px', borderBottomLeftRadius: '12px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%' }}>
                      <Image
                        src={player.photoUrl || "/cercle-bleu-utilisateur-blanc.png"}
                        alt={player.firstName + ' ' + player.lastName}
                        width={48}
                        height={48}
                        style={{ borderRadius: '50%', objectFit: 'cover', border: '2px solid #243041', background: '#0B1220', flexShrink: 0, display: 'block' }}
                      />
                    </div>
                  </td>
                  <td style={{ ...baseCell, fontWeight: 600 }}>{player.firstName}</td>
                  <td style={{ ...baseCell, fontWeight: 600 }}>{player.lastName}</td>
                  <td style={baseCell}>
                    {Array.isArray(player.positions) ? player.positions.join(', ') : player.position || ''}
                  </td>
                  <td style={baseCell}>{player.nationality}</td>
                  <td style={baseCell}>{player.tags?.join(', ')}</td>
                  <td style={{ ...baseCell, borderRight: '1px solid #1F2937', borderTopRightRadius: '12px', borderBottomRightRadius: '12px', textAlign: 'center' }}>
                    <Link href={`/dashboard/players/${player.id}`}>
                      <Button
                        variant="secondary"
                        style={{
                          background: '#101827',
                          color: '#E2E8F0',
                          border: '1px solid #2B3A52',
                          padding: '0.45rem 1.15rem',
                          fontSize: '0.9rem',
                          boxShadow: 'none'
                        }}
                      >
                        Voir
                      </Button>
                    </Link>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
