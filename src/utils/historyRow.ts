import { HistoryModel } from '../features/History/schema';

type HistoryRow = HistoryModel<
    ['feature', 'table', 'row', 'operations', 'data']
>;

export type { HistoryRow };
