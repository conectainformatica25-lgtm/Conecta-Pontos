import { create } from 'zustand';
import { TimeRecord, RecordType } from '../domain/entities/TimeRecord';
import { apiClient } from '../services/api/apiClient';

interface TimeStore {
  records: TimeRecord[];
  isLoading: boolean;
  error: string | null;
  addRecord: (userId: string, companyId: string, type: RecordType) => Promise<void>;
  fetchRecordsByUserId: (userId: string) => Promise<void>;
  fetchRecordsByCompanyId: (companyId: string) => Promise<void>;
  getRecordsByUserId: (userId: string) => TimeRecord[];
  getTodayRecordsByUserId: (userId: string) => TimeRecord[];
  getAllRecordsByCompany: (companyId: string) => TimeRecord[];
}

export const useTimeStore = create<TimeStore>((set, get) => ({
  records: [],
  isLoading: false,
  error: null,
  
  addRecord: async (userId, companyId, type) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.post('/records', { userId, companyId, type });
      set((state) => ({
        records: [response.data, ...state.records],
        isLoading: false
      }));
    } catch (error) {
      set({ error: 'Falha ao registrar ponto', isLoading: false });
      console.error(error);
    }
  },

  fetchRecordsByUserId: async (userId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get(`/records/${userId}`);
      set({ records: response.data, isLoading: false });
    } catch (error: any) {
      set({ 
        error: `Falha ao buscar: ${error.message || JSON.stringify(error)}`, 
        isLoading: false 
      });
      console.error(error);
    }
  },

  fetchRecordsByCompanyId: async (companyId) => {
    try {
      set({ isLoading: true, error: null });
      const response = await apiClient.get(`/records/company/${companyId}`);
      set({ records: response.data, isLoading: false });
    } catch (error) {
      set({ error: 'Falha ao buscar pontos da empresa', isLoading: false });
      console.error(error);
    }
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
