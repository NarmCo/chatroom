import { Parser } from '@mrnafisia/type-query';
import type { Table } from '@mrnafisia/type-query';
import { GetOptions } from '../../utils/getOptions';

const parseGetOptions = <T extends Table>(
    table: T,
    fields: unknown,
    start: unknown,
    step: unknown,
    orders: unknown
): GetOptions<T['columns']> | undefined => {
    const columnKeys = Object.keys(table.columns);

    // fields
    if (!Array.isArray(fields) || fields.length === 0) {
        return undefined;
    }
    for (const field of fields) {
        if (!columnKeys.includes(field)) {
            return undefined;
        }
    }

    // start
    let parsedStart: bigint | undefined = undefined;
    if (start !== undefined) {
        parsedStart = Parser.bigInt(start);
        if (parsedStart === undefined) {
            return undefined;
        }
    }

    // step
    let parsedStep: number | undefined = undefined;
    if (step !== undefined) {
        parsedStep = Parser.integer(step);
        if (parsedStep === undefined) {
            return undefined;
        }
    }

    // orders
    if (orders !== undefined) {
        if (!Array.isArray(orders)) {
            return undefined;
        }
        for (const order of orders) {
            if (
                typeof order !== 'object' ||
                Object.keys(order).length !== 2 ||
                order.by === undefined ||
                order.direction === undefined
            ) {
                return undefined;
            }
            if (!columnKeys.includes(order.by)) {
                return undefined;
            }
            if (order.direction !== 'asc' && order.direction !== 'desc') {
                return undefined;
            }
        }
    }

    return { fields, start: parsedStart, step: parsedStep, orders };
};

export default parseGetOptions;
