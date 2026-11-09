import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  Modal,
} from 'react-native';
import Screen from '../components/Screen';
import PlayerCard from '../components/PlayerCard';
import { PlayerDataBadge } from '../components/PlayerDataBadge';
import { CreatePlayerForm } from '../components/CreatePlayerForm';
import { apiRequest } from '../api/client';
import { useAuth } from '../auth/AuthContext';

export const SearchOrCreatePlayerScreen = ({ navigation }: any) => {
  const { session } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [hasSearched, setHasSearched] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);

  const handleSearch = async () => {
    if (!searchQuery.trim()) return;

    setLoading(true);
    setHasSearched(true);

    try {
      // Diviser la recherche en prénom et nom
      const parts = searchQuery.trim().split(' ');
      const firstName = parts[0];
      const lastName = parts.slice(1).join(' ') || '';

      const queryParams = new URLSearchParams();
      if (firstName) queryParams.append('firstName', firstName);
      if (lastName) queryParams.append('lastName', lastName);

      const players = await apiRequest<any[]>(`/players/search?${queryParams.toString()}`);
      setSearchResults(players);
    } catch (error) {
      console.error('Erreur de recherche:', error);
      setSearchResults([]);
    } finally {
      setLoading(false);
    }
  };

  const handlePlayerCreated = (newPlayer: any) => {
    setShowCreateForm(false);
    setSearchResults([newPlayer, ...searchResults]);
  };

  const isScout = session?.user?.role === 'SCOUT';

  return (
    <Screen>
      <View style={styles.container}>
        <View style={styles.searchSection}>
          <Text style={styles.title}>Rechercher un joueur</Text>
          <View style={styles.searchBar}>
            <TextInput
              style={styles.searchInput}
              placeholder="Nom et prénom du joueur"
              value={searchQuery}
              onChangeText={setSearchQuery}
              onSubmitEditing={handleSearch}
              autoCapitalize="words"
            />
            <TouchableOpacity
              style={styles.searchButton}
              onPress={handleSearch}
              disabled={loading}
            >
              {loading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.searchButtonText}>Rechercher</Text>
              )}
            </TouchableOpacity>
          </View>
        </View>

        {hasSearched && !loading && (
          <View style={styles.resultsSection}>
            <View style={styles.resultsHeader}>
              <Text style={styles.resultsTitle}>
                {searchResults.length} résultat{searchResults.length !== 1 ? 's' : ''}
              </Text>

              {isScout && searchResults.length === 0 && (
                <TouchableOpacity
                  style={styles.createButton}
                  onPress={() => setShowCreateForm(true)}
                >
                  <Text style={styles.createButtonText}>+ Créer le profil</Text>
                </TouchableOpacity>
              )}
            </View>

            {searchResults.length === 0 ? (
              <View style={styles.noResults}>
                <Text style={styles.noResultsText}>Aucun joueur trouvé</Text>
                {isScout && (
                  <Text style={styles.noResultsSubtext}>
                    Vous pouvez créer un nouveau profil pour ce joueur
                  </Text>
                )}
              </View>
            ) : (
              <FlatList
                data={searchResults}
                keyExtractor={(item) => item.id}
                renderItem={({ item }) => (
                  <View style={styles.playerItem}>
                    <PlayerDataBadge
                      dataSource={item.dataSource || 'PLATFORM_DATA'}
                      createdByScout={item.createdByScout}
                      compact
                    />
                    <PlayerCard
                      player={{
                        id: item.id,
                        name: `${item.firstName} ${item.lastName}`,
                        position: item.positions[0] || 'N/A',
                        age: item.age || 0,
                        club: item.club || 'N/A',
                        nationality: item.nationality || 'N/A',
                        photoUrl: item.photoUrl,
                        uroomScore: item.uroomScore || 0,
                        trend: 'flat',
                        metrics: [],
                        tags: item.tags || [],
                        dataSource: item.dataSource,
                        createdByScout: item.createdByScout,
                      }}
                      onPress={() =>
                        navigation.navigate('PlayerProfile', { playerId: item.id })
                      }
                    />
                  </View>
                )}
              />
            )}
          </View>
        )}

        <Modal
          visible={showCreateForm}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <CreatePlayerForm
              onPlayerCreated={handlePlayerCreated}
              onCancel={() => setShowCreateForm(false)}
            />
          </View>
        </Modal>
      </View>
    </Screen>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  searchSection: {
    backgroundColor: '#fff',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  searchBar: {
    flexDirection: 'row',
    gap: 8,
  },
  searchInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  searchButton: {
    backgroundColor: '#007AFF',
    borderRadius: 8,
    paddingHorizontal: 20,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  searchButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  resultsSection: {
    flex: 1,
    padding: 16,
  },
  resultsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  resultsTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  createButton: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  noResults: {
    padding: 40,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 18,
    color: '#666',
    marginBottom: 8,
  },
  noResultsSubtext: {
    fontSize: 14,
    color: '#999',
    textAlign: 'center',
  },
  playerItem: {
    marginBottom: 12,
  },
  modalContainer: {
    flex: 1,
  },
});
