import { TimeRecord, RecordType } from '../entities/TimeRecord';
import { apiClient } from '../../services/api/apiClient';

/**
 * Interface do repositório para garantir que a implementação
 * (MOCK ou API Real) obedeçam ao mesmo contrato de tipos.
 */
export interface ITimeRecordRepository {
  createRecord(userId: string, companyId: string, type: RecordType): Promise<TimeRecord>;
  getTodayRecords(userId: string): Promise<TimeRecord[]>;
}

/**
 * Implementação Real que fará chamadas ao Backend (Render/Postgres)
 */
export class TimeRecordApiRepository implements ITimeRecordRepository {
  async createRecord(userId: string, companyId: string, type: RecordType): Promise<TimeRecord> {
    const response = await apiClient.post<TimeRecord>('/time-records', {
      userId,
      companyId,
      type
    });
    return response.data;
  }

  async getTodayRecords(userId: string): Promise<TimeRecord[]> {
    const response = await apiClient.get<TimeRecord[]>(`/time-records/today/${userId}`);
    return response.data;
  }
}
