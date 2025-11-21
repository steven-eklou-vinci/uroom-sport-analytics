"use client";

import { useEffect } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useState } from 'react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';
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
    <section>
      <div style={{marginBottom:'1.5rem'}}>
        <Link href="/dashboard/overview" style={{textDecoration:'none'}}>
          <button style={{background:'#14B8A6',color:'#fff',border:'none',borderRadius:'6px',padding:'0.5rem 1.2rem',fontWeight:600,fontSize:'1rem',boxShadow:'0 2px 8px 0 rgba(16,30,54,0.06)',cursor:'pointer',transition:'background 0.18s'}} onMouseOver={e=>e.currentTarget.style.background='#0F766E'} onMouseOut={e=>e.currentTarget.style.background='#14B8A6'}>&larr; Retour</button>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary uppercase tracking-tight">Joueurs</h1>
        <Link href="/dashboard/players/new">
          <Button>Ajouter un joueur</Button>
        </Link>
      </div>
      <Card>
        <input
          className="mb-6 p-2 rounded border border-gray-200 w-full text-dark bg-light focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
          placeholder="Recherche joueur..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Table>
          <thead>
            <tr className="bg-primary text-white">
              <th className="py-2 px-3 text-left">Photo</th>
              <th className="py-2 px-3 text-left">Prénom</th>
              <th className="py-2 px-3 text-left">Nom</th>
              <th className="py-2 px-3 text-left">Poste</th>
              <th className="py-2 px-3 text-left">Pays</th>
              <th className="py-2 px-3 text-left">Tags</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(player => (
              <tr key={player.id} className="even:bg-light odd:bg-white hover:bg-secondary/10 transition-colors" style={{verticalAlign:'middle'}}>
                <td className="py-2 px-3" style={{paddingTop:0,paddingBottom:0,verticalAlign:'middle'}}>
                  <div style={{display:'flex',alignItems:'center',justifyContent:'center',height:'100%'}}>
                    <Image
                      src={player.photoUrl || "/cercle-bleu-utilisateur-blanc.png"}
                      alt={player.firstName + ' ' + player.lastName}
                      width={48}
                      height={48}
                      style={{borderRadius:'50%',objectFit:'cover',border:'2px solid #e2e8f0',background:'#f1f5f9',flexShrink:0,display:'block'}} 
                    />
                  </div>
                </td>
                <td className="py-2 px-3 font-semibold text-dark" style={{verticalAlign:'middle',textAlign:'center'}}>{player.firstName}</td>
                <td className="py-2 px-3 font-semibold text-dark" style={{verticalAlign:'middle',textAlign:'center'}}>{player.lastName}</td>
                <td className="py-2 px-3" style={{verticalAlign:'middle',textAlign:'center'}}>
                  {Array.isArray(player.positions) ? player.positions.join(', ') : player.position || ''}
                </td>
                <td className="py-2 px-3" style={{verticalAlign:'middle',textAlign:'center'}}>{player.nationality}</td>
                <td className="py-2 px-3" style={{verticalAlign:'middle',textAlign:'center'}}>{player.tags?.join(', ')}</td>
                <td className="py-2 px-3" style={{verticalAlign:'middle',textAlign:'center'}}>
                  <Link href={`/dashboard/players/${player.id}`}>
                    <Button variant="secondary">Voir</Button>
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Card>
    </section>
  );
}
