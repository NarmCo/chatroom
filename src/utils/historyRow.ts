import { HistoryModel } from '../features/History/schema';

type HistoryRow = HistoryModel<
    ['yearCompanyID', 'feature', 'table', 'row', 'operations', 'data']
>;

export type { HistoryRow };
