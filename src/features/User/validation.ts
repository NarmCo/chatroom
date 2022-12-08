const partialPhone = (v: string) =>
    3 <= v.length && v.length <= 14 && /\+?\d+/.test(v);

export { partialPhone };