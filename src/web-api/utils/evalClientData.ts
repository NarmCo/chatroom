import { FEATURES } from '../../utils/features';
import * as errorsJSON from '../../../requests/error.json';

const lang = process.env.LANG;
if (lang === undefined) {
    throw 'please set LANG variable in .env';
}

const errors = errorsJSON as {
    [feature in keyof typeof FEATURES]: {
        [code: string]: { [lang: string]: string };
    };
};
const evalClientData: (
    feature: keyof typeof FEATURES | null,
    code: number,
    data: unknown
) => unknown = (feature, code, data) => {
    if (code === 7898) {
        return data;
    }
    if (
        errors[feature ?? 'Null'] === undefined ||
        errors[feature ?? 'Null'][code.toString()] === undefined ||
        errors[feature ?? 'Null'][code.toString()][lang] === undefined
    ) {
        return 'message is not available';
    } else {
        return errors[feature ?? 'Null'][code.toString()][lang];
    }
};

export default evalClientData;
