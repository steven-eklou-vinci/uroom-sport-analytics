"use client";
import React, { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';

interface Player {
  id?: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  position: string;
  clubId?: string;
  nationality?: string;
  height?: number;
  weight?: number;
}

const emptyPlayer: Player = {
  firstName: '',
  lastName: '',
  birthDate: '',
  position: '',
  nationality: '',
  height: undefined,
  weight: undefined,
};

export default function PlayerDetailPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [player, setPlayer] = useState<Player>(emptyPlayer);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const isNew = params.id === 'new';

  useEffect(() => {
    if (!isNew) {
      setLoading(true);
  fetch(`${process.env.NEXT_PUBLIC_API_URL}/players/${params.id}`)
        .then((res) => {
          if (!res.ok) throw new Error('Erreur lors du chargement du joueur');
          return res.json();
        })
        .then((data) => setPlayer(data))
        .catch((e) => setError(e.message))
        .finally(() => setLoading(false));
    }
  }, [params.id, isNew]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setPlayer((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      const method = isNew ? 'POST' : 'PUT';
      const url = isNew
        ? `${process.env.NEXT_PUBLIC_API_URL}/players`
        : `${process.env.NEXT_PUBLIC_API_URL}/players/${params.id}`;
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(player),
      });
      if (!res.ok) throw new Error('Erreur lors de la sauvegarde');
      router.push('/dashboard/players');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div>Chargement...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <div className="max-w-xl mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">
        {isNew ? 'Créer un joueur' : 'Modifier le joueur'}
      </h1>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block mb-1">Prénom</label>
          <input name="firstName" value={player.firstName} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block mb-1">Nom</label>
          <input name="lastName" value={player.lastName} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block mb-1">Date de naissance</label>
          <input type="date" name="birthDate" value={player.birthDate} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block mb-1">Poste</label>
          <input name="position" value={player.position} onChange={handleChange} required className="input input-bordered w-full" />
        </div>
        <div>
          <label className="block mb-1">Nationalité</label>
          <input name="nationality" value={player.nationality || ''} onChange={handleChange} className="input input-bordered w-full" />
        </div>
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block mb-1">Taille (cm)</label>
            <input type="number" name="height" value={player.height || ''} onChange={handleChange} className="input input-bordered w-full" />
          </div>
          <div className="flex-1">
            <label className="block mb-1">Poids (kg)</label>
            <input type="number" name="weight" value={player.weight || ''} onChange={handleChange} className="input input-bordered w-full" />
          </div>
        </div>
        <div className="flex gap-2 mt-4">
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {isNew ? 'Créer' : 'Enregistrer'}
          </button>
          <Link href="/dashboard/players" className="btn btn-secondary">Annuler</Link>
        </div>
      </form>
    </div>
  );
}
