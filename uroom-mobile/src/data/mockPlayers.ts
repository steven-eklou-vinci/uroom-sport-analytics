import { Player } from '../types';

export const mockPlayers: Player[] = [
  {
    id: 'p-001',
    name: 'Amine K.',
    position: 'MF',
    age: 15,
    club: 'Uroom Academy',
    nationality: 'FR',
    photoUrl: undefined,
    uroomScore: 78,
    trend: 'up',
    metrics: [
      { label: 'Tech', value: '7.6' },
      { label: 'Phys', value: '7.1' },
      { label: 'Tac', value: '7.4' },
      { label: 'Ment', value: '7.2' }
    ],
    tags: ['vision', 'pressing']
  },
  {
    id: 'p-002',
    name: 'Loic M.',
    position: 'DF',
    age: 16,
    club: 'Paris FC',
    nationality: 'FR',
    photoUrl: undefined,
    uroomScore: 72,
    trend: 'flat',
    metrics: [
      { label: 'Tech', value: '6.8' },
      { label: 'Phys', value: '7.4' },
      { label: 'Tac', value: '7.0' },
      { label: 'Ment', value: '6.9' }
    ],
    tags: ['duel', 'leadership']
  },
  {
    id: 'p-003',
    name: 'Sami R.',
    position: 'FW',
    age: 14,
    club: 'Lyon',
    nationality: 'MA',
    photoUrl: undefined,
    uroomScore: 81,
    trend: 'up',
    metrics: [
      { label: 'Tech', value: '7.9' },
      { label: 'Phys', value: '7.3' },
      { label: 'Tac', value: '7.1' },
      { label: 'Ment', value: '7.5' }
    ],
    tags: ['finishing', 'speed']
  }
];
