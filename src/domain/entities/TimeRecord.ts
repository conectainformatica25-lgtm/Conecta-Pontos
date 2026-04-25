export type RecordType = 'ENTRADA' | 'SAIDA_ALMOCO' | 'RETORNO_ALMOCO' | 'SAIDA';

export interface TimeRecord {
  id: string;
  userId: string;
  companyId: string;
  type: RecordType;
  timestamp: string; // ISO 8601 string
}

export interface DailyRecord {
  date: string; // YYYY-MM-DD
  records: TimeRecord[];
  totalHoursWorked: number; // in hours (e.g. 8.5)
}
