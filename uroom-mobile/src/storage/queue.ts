import AsyncStorage from '@react-native-async-storage/async-storage';

const QUEUE_KEY = 'uroom.sync.queue';

type QueueItem = {
  id: string;
  payload: Record<string, unknown>;
};

export async function enqueue(item: QueueItem): Promise<void> {
  const existing = await getQueue();
  existing.push(item);
  await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(existing));
}

export async function getQueue(): Promise<QueueItem[]> {
  const raw = await AsyncStorage.getItem(QUEUE_KEY);
  return raw ? (JSON.parse(raw) as QueueItem[]) : [];
}

export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
}
