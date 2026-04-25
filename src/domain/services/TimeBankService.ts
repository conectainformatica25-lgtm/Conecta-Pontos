import { TimeRecord, RecordType } from '../entities/TimeRecord';

export class TimeBankService {
  /**
   * Calcula o total de horas trabalhadas em um dia baseando-se nas premissas:
   * (Saída Almoço - Entrada) + (Saída - Retorno Almoço)
   */
  static calculateDailyHours(records: TimeRecord[]): number {
    if (records.length < 2) return 0;

    let totalMs = 0;

    const entrada = records.find(r => r.type === 'ENTRADA')?.timestamp;
    const saidaAlmoco = records.find(r => r.type === 'SAIDA_ALMOCO')?.timestamp;
    const retornoAlmoco = records.find(r => r.type === 'RETORNO_ALMOCO')?.timestamp;
    const saida = records.find(r => r.type === 'SAIDA')?.timestamp;

    // Se bateu entrada e (saiu pro almoço OU a jornada acabou cedo)
    if (entrada && saidaAlmoco) {
      totalMs += new Date(saidaAlmoco).getTime() - new Date(entrada).getTime();
    } else if (entrada && saida && !saidaAlmoco && !retornoAlmoco) {
      // Trabalhou direto (meio período)
      totalMs += new Date(saida).getTime() - new Date(entrada).getTime();
    }

    // Se bateu retorno do almoço e a saída final
    if (retornoAlmoco && saida) {
      totalMs += new Date(saida).getTime() - new Date(retornoAlmoco).getTime();
    }

    // Retorna as horas (ms -> horas decimais)
    return totalMs / (1000 * 60 * 60);
  }

  /**
   * Calcula o balanço em horas (Saldo Positivo ou Negativo)
   */
  static calculateBalance(workedHours: number, expectedHours: number): number {
    return workedHours - expectedHours;
  }

  /**
   * Formata a exibição Decimal (ex: 8.5) para String em HR:MIN (ex: 08:30)
   */
  static formatDecimalToTime(decimalHours: number): string {
    const isNegative = decimalHours < 0;
    const absHours = Math.abs(decimalHours);
    
    const h = Math.floor(absHours);
    const m = Math.round((absHours - h) * 60);
    
    const hStr = h.toString().padStart(2, '0');
    const mStr = m.toString().padStart(2, '0');

    return `${isNegative ? '-' : ''}${hStr}:${mStr}`;
  }

  /**
   * Agrupa os batimentos por dia em um formato de Record
   */
  static groupRecordsByDay(records: TimeRecord[]): Record<string, TimeRecord[]> {
    const groups: Record<string, TimeRecord[]> = {};
    
    // Sort records descending (newest first)
    const sorted = [...records].sort(
      (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
    );

    for (const record of sorted) {
      const dateStr = new Date(record.timestamp).toLocaleDateString('pt-BR');
      if (!groups[dateStr]) {
        groups[dateStr] = [];
      }
      groups[dateStr].push(record);
    }

    return groups;
  }
}
