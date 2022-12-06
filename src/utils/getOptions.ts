import { OrderDirection } from '@mrnafisia/type-query';
import Table from '@mrnafisia/type-query/dist/types/table';

type GetOptions<Column extends Table['columns']> = {
    fields: (keyof Column)[];
    start?: bigint;
    step?: number;
    orders?: { by: keyof Column; direction: OrderDirection }[];
};

export type { GetOptions };
