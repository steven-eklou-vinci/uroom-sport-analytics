import React from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import { ScoutReport } from '../types';

interface ScoutReportsListProps {
  reports: ScoutReport[];
  showClubFit?: boolean; // true pour les clubs et admins
}

export const ScoutReportsList: React.FC<ScoutReportsListProps> = ({ 
  reports, 
  showClubFit = false 
}) => {
  if (!reports || reports.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>Aucun rapport scout disponible</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <Text style={styles.sectionTitle}>Rapports scouts ({reports.length})</Text>
      
      {reports.map((report) => (
        <View key={report.id} style={styles.reportCard}>
          <View style={styles.reportHeader}>
            <Text style={styles.reportDate}>
              {new Date(report.createdAt).toLocaleDateString('fr-FR', {
                day: 'numeric',
                month: 'long',
                year: 'numeric'
              })}
            </Text>
            {report.author && (
              <Text style={styles.reportAuthor}>Par {report.author.name}</Text>
            )}
          </View>

          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Résumé</Text>
            <Text style={styles.reportText}>{report.summary}</Text>
          </View>

          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Forces</Text>
            {report.strengths.map((strength, index) => (
              <View key={index} style={styles.bulletItem}>
                <Text style={styles.bulletIcon}>✓</Text>
                <Text style={styles.bulletText}>{strength}</Text>
              </View>
            ))}
          </View>

          <View style={styles.reportSection}>
            <Text style={styles.reportSectionTitle}>Faiblesses</Text>
            {report.weaknesses.map((weakness, index) => (
              <View key={index} style={styles.bulletItem}>
                <Text style={styles.bulletIcon}>•</Text>
                <Text style={styles.bulletText}>{weakness}</Text>
              </View>
            ))}
          </View>

          {showClubFit && report.clubFit && report.clubFit.length > 0 && (
            <View style={styles.reportSection}>
              <View style={styles.clubFitHeader}>
                <Text style={styles.reportSectionTitle}>Adéquation club</Text>
                <Text style={styles.clubFitBadge}>Clubs uniquement</Text>
              </View>
              {report.clubFit.map((fit, index) => (
                <View key={index} style={styles.bulletItem}>
                  <Text style={styles.bulletIcon}>→</Text>
                  <Text style={styles.bulletText}>{fit}</Text>
                </View>
              ))}
            </View>
          )}
        </View>
      ))}
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  emptyContainer: {
    padding: 40,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  reportCard: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginBottom: 16,
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  reportHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e1e1e1',
  },
  reportDate: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  reportAuthor: {
    fontSize: 13,
    color: '#666',
  },
  reportSection: {
    marginTop: 16,
  },
  reportSectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 8,
    color: '#333',
  },
  reportText: {
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  bulletItem: {
    flexDirection: 'row',
    marginBottom: 8,
    paddingLeft: 4,
  },
  bulletIcon: {
    fontSize: 14,
    marginRight: 8,
    color: '#007AFF',
    fontWeight: 'bold',
  },
  bulletText: {
    flex: 1,
    fontSize: 14,
    lineHeight: 20,
    color: '#555',
  },
  clubFitHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  clubFitBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FF9800',
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 8,
  },
});
