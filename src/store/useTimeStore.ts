import { create } from 'zustand';
import { TimeRecord, RecordType } from '../domain/entities/TimeRecord';

interface TimeStore {
  records: TimeRecord[];
  addRecord: (userId: string, companyId: string, type: RecordType) => void;
  getRecordsByUserId: (userId: string) => TimeRecord[];
  getTodayRecordsByUserId: (userId: string) => TimeRecord[];
  getAllRecordsByCompany: (companyId: string) => TimeRecord[];
}

export const useTimeStore = create<TimeStore>((set, get) => ({
  records: [],
  
  addRecord: (userId, companyId, type) => {
    const newRecord: TimeRecord = {
      id: Math.random().toString(36).substring(7),
      userId,
      companyId,
      type,
      timestamp: new Date().toISOString(),
    };
    
    set((state) => ({
      records: [...state.records, newRecord]
    }));
  },

  getRecordsByUserId: (userId) => {
    return get().records.filter(r => r.userId === userId);
  },

  getTodayRecordsByUserId: (userId) => {
    const todayStr = new Date().toISOString().split('T')[0];
    return get().records.filter(r => 
      r.userId === userId && 
      r.timestamp.startsWith(todayStr)
    );
  },

  getAllRecordsByCompany: (companyId) => {
    return get().records.filter(r => r.companyId === companyId);
  }
}));
