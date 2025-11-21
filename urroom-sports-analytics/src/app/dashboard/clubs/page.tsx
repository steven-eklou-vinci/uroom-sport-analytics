"use client";

import { useEffect, useState } from 'react';
import Link from 'next/link';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Table from '../../components/ui/Table';

export default function ClubsDashboard() {
  const [clubs, setClubs] = useState<any[]>([]);
  const [search, setSearch] = useState('');

  useEffect(() => {
    fetch(`${process.env.NEXT_PUBLIC_API_URL}/clubs`)
      .then(res => res.json())
      .then(setClubs);
  }, []);

  const filtered = clubs.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <section>
      <div style={{marginBottom:'1.5rem'}}>
        <Link href="/dashboard/overview" style={{textDecoration:'none'}}>
          <button style={{background:'#14B8A6',color:'#fff',border:'none',borderRadius:'6px',padding:'0.5rem 1.2rem',fontWeight:600,fontSize:'1rem',boxShadow:'0 2px 8px 0 rgba(16,30,54,0.06)',cursor:'pointer',transition:'background 0.18s'}} onMouseOver={e=>e.currentTarget.style.background='#0F766E'} onMouseOut={e=>e.currentTarget.style.background='#14B8A6'}>&larr; Retour</button>
        </Link>
      </div>
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-primary uppercase tracking-tight">Clubs</h1>
        <Link href="/dashboard/clubs/new">
          <Button>Ajouter un club</Button>
        </Link>
      </div>
      <Card>
        <input
          className="mb-6 p-2 rounded border border-gray-200 w-full text-dark bg-light focus:border-secondary focus:ring-2 focus:ring-secondary/20 outline-none"
          placeholder="Recherche club..."
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        <Table>
          <thead>
            <tr className="bg-primary text-white">
              <th className="py-2 px-3">Nom</th>
              <th className="py-2 px-3">Pays</th>
              <th className="py-2 px-3">Ville</th>
              <th className="py-2 px-3">Joueurs</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {filtered.map(club => (
              <tr key={club.id} className="even:bg-light odd:bg-white hover:bg-secondary/10 transition-colors">
                <td className="py-2 px-3 font-medium text-dark">{club.name}</td>
                <td className="py-2 px-3">{club.country}</td>
                <td className="py-2 px-3">{club.city}</td>
                <td className="py-2 px-3">{club.players?.length || 0}</td>
                <td className="py-2 px-3">
                  <Link href={`/dashboard/clubs/${club.id}`}>
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
