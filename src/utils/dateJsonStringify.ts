// eslint-disable-next-line @typescript-eslint/no-explicit-any
(Date.prototype as any).toJSON = function () {
    return this.toISOString();
};

export {};
