"use client";
import React, { useEffect, useState } from 'react';
import { useSession } from 'next-auth/react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

interface Player {
  id: string;
  firstName: string;
  lastName: string;
  birthDate: string;
  nationality: string;
  positions: string[];
  foot: string;
  heightCm?: number;
  weightKg?: number;
  photoUrl?: string;
  isFollowing?: boolean;
  followedByOtherScouts?: boolean;
  otherScoutsCount?: number;
}

export default function PlayersSearchPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [players, setPlayers] = useState<Player[]>([]);
  const [filteredPlayers, setFilteredPlayers] = useState<Player[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingIds, setFollowingIds] = useState<Set<string>>(new Set());

  // Filtres
  const [filters, setFilters] = useState({
    search: '',
    position: '',
    nationality: '',
    footedness: '',
    ageMin: '',
    ageMax: '',
    heightMin: '',
    heightMax: '',
  });

  // Tri
  const [sortBy, setSortBy] = useState('lastName');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.push('/auth/login');
    }
    if (session?.user?.role === 'PLAYER') {
      router.push('/dashboard/player');
    }
  }, [session, status, router]);

  useEffect(() => {
    fetchPlayers();
  }, [session]);

  useEffect(() => {
    applyFilters();
  }, [filters, players, sortBy, sortOrder]);

  const fetchPlayers = async () => {
    try {
      // If scout, use the API that includes follow status
      const endpoint = session?.user?.role === 'SCOUT' 
        ? '/api/players/with-follow-status' 
        : '/api/players';
      
      const res = await fetch(endpoint);
      if (res.ok) {
        const data = await res.json();
        console.log('Fetched players:', data.length);
        console.log('Sample players with follow info:', data.slice(0, 3).map((p: Player) => ({
          name: `${p.firstName} ${p.lastName}`,
          isFollowing: p.isFollowing,
          followedByOtherScouts: p.followedByOtherScouts,
          otherScoutsCount: p.otherScoutsCount
        })));
        
        setPlayers(data);
        setFilteredPlayers(data);
        
        // Update followingIds for scouts
        if (session?.user?.role === 'SCOUT') {
          const ids = new Set<string>(
            data.filter((p: Player) => p.isFollowing).map((p: Player) => p.id)
          );
          setFollowingIds(ids);
        }
      }
    } catch (error) {
      console.error('Erreur fetch joueurs:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleFollowToggle = async (playerId: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();

    const isCurrentlyFollowing = followingIds.has(playerId);

    try {
      const res = await fetch(`/api/players/follow/${playerId}`, {
        method: isCurrentlyFollowing ? 'DELETE' : 'POST',
        headers: {
          'Content-Type': 'application/json'
        }
      });

      if (res.ok) {
        // Refresh all players to get updated follow counts
        fetchPlayers();
      } else {
        const error = await res.json();
        alert(error.message || 'Erreur lors de l\'opération');
      }
    } catch (error) {
      console.error('Erreur follow toggle:', error);
      alert('Erreur lors de l\'opération');
    }
  };

  const calculateAge = (birthDate: string) => {
    const today = new Date();
    const birth = new Date(birthDate);
    let age = today.getFullYear() - birth.getFullYear();
    const monthDiff = today.getMonth() - birth.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
      age--;
    }
    return age;
  };

  const applyFilters = () => {
    let result = [...players];

    // Recherche par nom
    if (filters.search) {
      result = result.filter(p =>
        `${p.firstName} ${p.lastName}`.toLowerCase().includes(filters.search.toLowerCase())
      );
    }

    // Filtre par position
    if (filters.position) {
      result = result.filter(p => p.positions.includes(filters.position));
    }

    // Filtre par nationalité
    if (filters.nationality) {
      result = result.filter(p => p.nationality === filters.nationality);
    }

    // Filtre par pied
    if (filters.footedness) {
      result = result.filter(p => p.foot === filters.footedness);
    }

    // Filtre par âge
    if (filters.ageMin) {
      result = result.filter(p => calculateAge(p.birthDate) >= parseInt(filters.ageMin));
    }
    if (filters.ageMax) {
      result = result.filter(p => calculateAge(p.birthDate) <= parseInt(filters.ageMax));
    }

    // Filtre par taille
    if (filters.heightMin && filters.heightMin !== '') {
      result = result.filter(p => p.heightCm && p.heightCm >= parseInt(filters.heightMin));
    }
    if (filters.heightMax && filters.heightMax !== '') {
      result = result.filter(p => p.heightCm && p.heightCm <= parseInt(filters.heightMax));
    }

    // Tri
    result.sort((a, b) => {
      let aVal: any = a[sortBy as keyof Player];
      let bVal: any = b[sortBy as keyof Player];

      if (sortBy === 'age') {
        aVal = calculateAge(a.birthDate);
        bVal = calculateAge(b.birthDate);
      }
      
      if (sortBy === 'height') {
        aVal = a.heightCm || 0;
        bVal = b.heightCm || 0;
      }

      if (typeof aVal === 'string') {
        return sortOrder === 'asc' 
          ? aVal.localeCompare(bVal) 
          : bVal.localeCompare(aVal);
      }
      return sortOrder === 'asc' ? aVal - bVal : bVal - aVal;
    });

    setFilteredPlayers(result);
  };

  const resetFilters = () => {
    setFilters({
      search: '',
      position: '',
      nationality: '',
      footedness: '',
      ageMin: '',
      ageMax: '',
      heightMin: '',
      heightMax: '',
    });
    setSortBy('lastName');
    setSortOrder('asc');
  };

  if (loading) return <div style={{ padding: '2rem', color: '#fff' }}>Chargement...</div>;

  const positions = ['Gardien', 'Défenseur central', 'Latéral droit', 'Latéral gauche', 'Milieu défensif', 'Milieu central', 'Milieu offensif', 'Ailier droit', 'Ailier gauche', 'Attaquant'];
  const nationalities = [...new Set(players.map(p => p.nationality))].sort();

  return (
    <section style={{ padding: '2rem' }}>
      <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 style={{ fontSize: '2rem', fontWeight: 'bold', color: '#fff' }}>
          Recherche de joueurs
        </h1>
        <Link href="/dashboard/club" style={{ textDecoration: 'none' }}>
          <button style={{
            background: '#334155',
            color: '#fff',
            padding: '0.5rem 1.2rem',
            borderRadius: '6px',
            border: 'none',
            fontWeight: 600,
            cursor: 'pointer',
            transition: 'background 0.2s'
          }}>
            ← Retour
          </button>
        </Link>
      </div>

      {/* Filtres */}
      <div style={{ background: '#1E293B', padding: '1.5rem', borderRadius: '8px', marginBottom: '2rem' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff' }}>Filtres</h2>
          <button
            onClick={resetFilters}
            style={{
              background: '#475569',
              color: '#fff',
              padding: '0.4rem 1rem',
              borderRadius: '6px',
              border: 'none',
              fontSize: '0.875rem',
              fontWeight: 600,
              cursor: 'pointer'
            }}
          >
            Réinitialiser
          </button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
          {/* Recherche */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Rechercher
            </label>
            <input
              type="text"
              placeholder="Nom du joueur..."
              value={filters.search}
              onChange={(e) => setFilters({ ...filters, search: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Position */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Position
            </label>
            <select
              value={filters.position}
              onChange={(e) => setFilters({ ...filters, position: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Toutes</option>
              {positions.map(pos => (
                <option key={pos} value={pos}>{pos}</option>
              ))}
            </select>
          </div>

          {/* Nationalité */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Nationalité
            </label>
            <select
              value={filters.nationality}
              onChange={(e) => setFilters({ ...filters, nationality: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Toutes</option>
              {nationalities.map(nat => (
                <option key={nat} value={nat}>{nat}</option>
              ))}
            </select>
          </div>

          {/* Pied */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Pied
            </label>
            <select
              value={filters.footedness}
              onChange={(e) => setFilters({ ...filters, footedness: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            >
              <option value="">Tous</option>
              <option value="Droitier">Droitier</option>
              <option value="Gaucher">Gaucher</option>
              <option value="Ambidextre">Ambidextre</option>
            </select>
          </div>

          {/* Âge min */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Âge min
            </label>
            <input
              type="number"
              placeholder="16"
              value={filters.ageMin}
              onChange={(e) => setFilters({ ...filters, ageMin: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Âge max */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Âge max
            </label>
            <input
              type="number"
              placeholder="35"
              value={filters.ageMax}
              onChange={(e) => setFilters({ ...filters, ageMax: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Taille min */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Taille min (cm)
            </label>
            <input
              type="number"
              placeholder="160"
              value={filters.heightMin}
              onChange={(e) => setFilters({ ...filters, heightMin: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
          </div>

          {/* Taille max */}
          <div>
            <label style={{ display: 'block', fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
              Taille max (cm)
            </label>
            <input
              type="number"
              placeholder="200"
              value={filters.heightMax}
              onChange={(e) => setFilters({ ...filters, heightMax: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            />
          </div>
        </div>

        {/* Tri */}
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #334155' }}>
          <h3 style={{ fontSize: '1rem', fontWeight: 'bold', color: '#fff', marginBottom: '1rem' }}>Trier par</h3>
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '0.5rem',
                borderRadius: '6px',
                border: '1px solid #334155',
                background: '#0F172A',
                color: '#fff',
                fontSize: '0.875rem'
              }}
            >
              <option value="lastName">Nom</option>
              <option value="age">Âge</option>
              <option value="height">Taille</option>
              <option value="nationality">Nationalité</option>
            </select>
            <button
              onClick={() => setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc')}
              style={{
                background: '#14B8A6',
                color: '#fff',
                padding: '0.5rem 1rem',
                borderRadius: '6px',
                border: 'none',
                fontWeight: 600,
                cursor: 'pointer',
                fontSize: '0.875rem'
              }}
            >
              {sortOrder === 'asc' ? '↑ Croissant' : '↓ Décroissant'}
            </button>
          </div>
        </div>
      </div>

      {/* Résultats */}
      <div style={{ background: '#1E293B', padding: '1.5rem', borderRadius: '8px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: '#fff' }}>
            Résultats ({filteredPlayers.length})
          </h2>
        </div>

        {filteredPlayers.length === 0 ? (
          <p style={{ color: '#94A3B8', textAlign: 'center', padding: '2rem' }}>
            Aucun joueur ne correspond à vos critères.
          </p>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))', gap: '1.5rem' }}>
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                style={{
                  background: '#0F172A',
                  padding: '1.5rem',
                  borderRadius: '8px',
                  border: '1px solid #334155',
                  transition: 'all 0.2s',
                  position: 'relative'
                }}
                onMouseOver={(e) => {
                  e.currentTarget.style.transform = 'translateY(-4px)';
                  e.currentTarget.style.borderColor = '#14B8A6';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(20,184,166,0.3)';
                }}
                onMouseOut={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.borderColor = '#334155';
                  e.currentTarget.style.boxShadow = 'none';
                }}
              >
                {/* Badge for other scouts following */}
                {session?.user?.role === 'SCOUT' && player.followedByOtherScouts && (
                  <div style={{
                    position: 'absolute',
                    top: '1rem',
                    right: '1rem',
                    background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
                    color: '#fff',
                    padding: '0.35rem 0.6rem',
                    borderRadius: '6px',
                    fontSize: '0.7rem',
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.25rem',
                    boxShadow: '0 2px 8px rgba(59, 130, 246, 0.3)',
                    zIndex: 10
                  }}>
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '12px', height: '12px', strokeWidth: 2 }}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {player.otherScoutsCount} autre{player.otherScoutsCount! > 1 ? 's' : ''}
                  </div>
                )}

                <Link href={`/dashboard/players/${player.id}/view`} style={{ textDecoration: 'none', display: 'block', cursor: 'pointer' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                    <img
                      src={player.photoUrl || '/cercle-bleu-utilisateur-blanc.png'}
                      alt={`${player.firstName} ${player.lastName}`}
                      style={{
                        width: '60px',
                        height: '60px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '2px solid #14B8A6'
                      }}
                    />
                    <div>
                      <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', color: '#fff', marginBottom: '0.25rem' }}>
                        {player.firstName} {player.lastName}
                      </h3>
                      <p style={{ fontSize: '0.875rem', color: '#94A3B8' }}>
                        {calculateAge(player.birthDate)} ans • {player.nationality}
                      </p>
                    </div>
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#14B8A6' }}>Position(s):</strong> {player.positions.join(', ')}
                  </div>
                  <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '0.5rem' }}>
                    <strong style={{ color: '#14B8A6' }}>Pied:</strong> {player.foot}
                  </div>
                  {player.heightCm && (
                    <div style={{ fontSize: '0.875rem', color: '#94A3B8', marginBottom: '1rem' }}>
                      <strong style={{ color: '#14B8A6' }}>Taille:</strong> {player.heightCm} cm
                    </div>
                  )}
                </Link>

                {/* Follow button for scouts */}
                {session?.user?.role === 'SCOUT' && (
                  <button
                    onClick={(e) => handleFollowToggle(player.id, e)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      borderRadius: '6px',
                      border: 'none',
                      fontWeight: 600,
                      cursor: 'pointer',
                      fontSize: '0.875rem',
                      transition: 'all 0.2s',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      gap: '0.5rem',
                      background: followingIds.has(player.id) 
                        ? '#ef4444' 
                        : 'linear-gradient(135deg, #14b8a6 0%, #0f766e 100%)',
                      color: '#fff',
                      boxShadow: followingIds.has(player.id)
                        ? '0 2px 8px rgba(239, 68, 68, 0.3)'
                        : '0 2px 8px rgba(20, 184, 166, 0.3)'
                    }}
                    onMouseOver={(e) => {
                      e.currentTarget.style.transform = 'scale(1.02)';
                    }}
                    onMouseOut={(e) => {
                      e.currentTarget.style.transform = 'scale(1)';
                    }}
                  >
                    {followingIds.has(player.id) ? (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '16px', height: '16px', strokeWidth: 2 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                        Ne plus suivre
                      </>
                    ) : (
                      <>
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" style={{ width: '16px', height: '16px', strokeWidth: 2 }}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                        </svg>
                        Suivre
                      </>
                    )}
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
