"use client";

import { useEffect, useMemo, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

type Club = {
  id: string;
  name: string;
  country?: string | null;
  tier?: string | null;
  contactEmail?: string | null;
  subscriptionTier?: string | null;
  notes?: string | null;
};

type Opportunity = {
  id: string;
  clubName: string;
  country: string;
  tier: string;
  contactEmail?: string | null;
  subscriptionTier: string;
  ageGroup: string;
  positions: string[];
  profile: string;
  urgency: string;
  summary: string;
};

const backendBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

function hashString(value: string) {
  let hash = 0;
  for (let i = 0; i < value.length; i += 1) {
    hash = (hash << 5) - hash + value.charCodeAt(i);
    hash |= 0;
  }
  return Math.abs(hash);
}

function buildOpportunity(club: Club): Opportunity {
  const isRcNord = club.id === 'club-rc-nord' || club.contactEmail === 'club.rcn@uroom.app';
  if (isRcNord) {
    return {
      id: club.id,
      clubName: club.name,
      country: club.country || 'N/A',
      tier: club.tier || 'N/A',
      contactEmail: club.contactEmail || null,
      subscriptionTier: club.subscriptionTier || 'PRO',
      ageGroup: 'U16',
      positions: ['MID'],
      profile: 'Milieu relayeur',
      urgency: 'Haute',
      summary: 'U16 | MID | Milieu relayeur'
    };
  }

  const seed = hashString(club.id || club.name || 'uroom');
  const ageGroups = ['U15', 'U16', 'U17'];
  const positionSets = [
    ['DEF'],
    ['MID'],
    ['FWD'],
    ['DEF', 'MID'],
    ['MID', 'FWD'],
    ['DEF', 'FWD'],
    ['GK']
  ];
  const profiles = ['Technique', 'Vitesse', 'Vision', 'Impact physique', 'Leadership'];
  const urgencies = ['Haute', 'Normale', 'A surveiller'];

  const ageGroup = ageGroups[seed % ageGroups.length];
  const positions = positionSets[seed % positionSets.length];
  const profile = profiles[seed % profiles.length];
  const urgency = urgencies[seed % urgencies.length];

  return {
    id: club.id,
    clubName: club.name,
    country: club.country || 'N/A',
    tier: club.tier || 'N/A',
    contactEmail: club.contactEmail || null,
    subscriptionTier: club.subscriptionTier || 'FREE',
    ageGroup,
    positions,
    profile,
    urgency,
    summary: `${ageGroup} | ${positions.join(', ')} | ${profile}`
  };
}

export default function OpportunitiesPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [clubs, setClubs] = useState<Club[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [ageFilter, setAgeFilter] = useState('');
  const [positionFilter, setPositionFilter] = useState('');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role !== 'AGENT' && session?.user?.role !== 'ADMIN') {
      router.push('/dashboard/overview');
    }
  }, [session, status, router]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`${backendBaseUrl}/clubs`)
      .then((res) => res.json())
      .then((data) => {
        if (cancelled) return;
        setClubs(Array.isArray(data) ? data : []);
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err?.message || 'Erreur chargement clubs');
      })
      .finally(() => {
        if (cancelled) return;
        setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, []);

  const opportunities = useMemo(() => clubs.map(buildOpportunity), [clubs]);

  const filtered = opportunities.filter((opp) => {
    const matchSearch = opp.clubName.toLowerCase().includes(search.toLowerCase());
    const matchAge = !ageFilter || opp.ageGroup === ageFilter;
    const matchPosition = !positionFilter || opp.positions.includes(positionFilter);
    return matchSearch && matchAge && matchPosition;
  });

  return (
    <section style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '1.5rem' }}>
        <Link href="/dashboard/agent" style={{ textDecoration: 'none' }}>
          <button style={{
            background: '#14B8A6',
            color: '#fff',
            border: 'none',
            borderRadius: '6px',
            padding: '0.5rem 1.2rem',
            fontWeight: 600,
            fontSize: '1rem',
            boxShadow: '0 2px 8px 0 rgba(16,30,54,0.06)',
            cursor: 'pointer',
            transition: 'background 0.18s'
          }} onMouseOver={e => e.currentTarget.style.background = '#0F766E'} onMouseOut={e => e.currentTarget.style.background = '#14B8A6'}>
            &larr; Retour
          </button>
        </Link>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.85rem', fontWeight: 700, color: '#E2E8F0' }}>Opportunites clubs</h1>
        <div style={{ color: '#94A3B8', fontSize: '0.95rem' }}>
          {filtered.length} opportunite{filtered.length > 1 ? 's' : ''}
        </div>
      </div>

      <div style={{
        background: 'linear-gradient(145deg, #0B1220 0%, #0F172A 100%)',
        border: '1px solid #1F2937',
        borderRadius: '14px',
        padding: '1.5rem',
        boxShadow: '0 18px 40px rgba(2, 6, 23, 0.35)',
        marginBottom: '1.5rem'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
          <input
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#0B1220',
              color: '#E2E8F0',
              outline: 'none'
            }}
            placeholder="Recherche club..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
          <select
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#0B1220',
              color: '#E2E8F0',
              outline: 'none'
            }}
            value={ageFilter}
            onChange={(e) => setAgeFilter(e.target.value)}
          >
            <option value="">Toutes categories</option>
            <option value="U15">U15</option>
            <option value="U16">U16</option>
            <option value="U17">U17</option>
          </select>
          <select
            style={{
              padding: '0.65rem 0.85rem',
              borderRadius: '10px',
              border: '1px solid #334155',
              background: '#0B1220',
              color: '#E2E8F0',
              outline: 'none'
            }}
            value={positionFilter}
            onChange={(e) => setPositionFilter(e.target.value)}
          >
            <option value="">Tous postes</option>
            <option value="GK">GK</option>
            <option value="DEF">DEF</option>
            <option value="MID">MID</option>
            <option value="FWD">FWD</option>
          </select>
        </div>
      </div>

      {loading && (
        <div style={{ color: '#94A3B8', padding: '1rem 0' }}>Chargement des opportunites...</div>
      )}

      {!loading && error && (
        <div style={{ color: '#F87171', padding: '1rem 0' }}>{error}</div>
      )}

      {!loading && !error && filtered.length === 0 && (
        <div style={{ color: '#94A3B8', padding: '1rem 0' }}>
          Aucune opportunite ne correspond aux filtres.
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.25rem' }}>
        {filtered.map((opp) => (
          <article key={opp.id} style={{
            background: '#0B1220',
            borderRadius: '14px',
            border: '1px solid #1F2937',
            padding: '1.5rem',
            boxShadow: '0 10px 24px rgba(2, 6, 23, 0.3)'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 700, color: '#E2E8F0' }}>{opp.clubName}</h3>
                <div style={{ color: '#94A3B8', fontSize: '0.85rem', marginTop: '0.35rem' }}>{opp.country} • {opp.tier}</div>
              </div>
              <span style={{
                padding: '0.3rem 0.7rem',
                borderRadius: '999px',
                background: opp.urgency === 'Haute' ? 'rgba(20,184,166,0.2)' : 'rgba(148,163,184,0.2)',
                color: opp.urgency === 'Haute' ? '#14B8A6' : '#CBD5F5',
                fontSize: '0.75rem',
                fontWeight: 600
              }}>
                Priorite {opp.urgency}
              </span>
            </div>

            <div style={{ marginTop: '1rem', display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              <span style={{ padding: '0.35rem 0.6rem', borderRadius: '999px', background: '#1F2937', color: '#E2E8F0', fontSize: '0.75rem' }}>{opp.ageGroup}</span>
              {opp.positions.map((pos) => (
                <span key={pos} style={{ padding: '0.35rem 0.6rem', borderRadius: '999px', background: '#111827', color: '#A5B4FC', fontSize: '0.75rem' }}>{pos}</span>
              ))}
              <span style={{ padding: '0.35rem 0.6rem', borderRadius: '999px', background: '#0F172A', color: '#38BDF8', fontSize: '0.75rem' }}>{opp.profile}</span>
            </div>

            <p style={{ marginTop: '1rem', color: '#CBD5F5', fontSize: '0.9rem', lineHeight: 1.5 }}>
              Recherche active: {opp.summary}. Abonnement {opp.subscriptionTier}.
            </p>

            <div style={{ marginTop: '1.2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ color: '#64748B', fontSize: '0.8rem' }}>{opp.contactEmail || 'Contact interne Uroom'}</span>
              {opp.contactEmail ? (
                <a
                  href={`mailto:${opp.contactEmail}`}
                  style={{
                    background: '#14B8A6',
                    color: '#fff',
                    padding: '0.45rem 1rem',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    fontWeight: 600,
                    fontSize: '0.85rem'
                  }}
                >
                  Contacter
                </a>
              ) : (
                <span style={{ color: '#94A3B8', fontSize: '0.85rem' }}>Contact indisponible</span>
              )}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
