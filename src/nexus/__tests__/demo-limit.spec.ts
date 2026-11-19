/** Demo limit is OFF by default; it only locks when NEXT_PUBLIC_DEMO_LIMIT_TRADES is set. */
const load = (limit?: string) => {
    jest.resetModules();
    if (limit === undefined) delete process.env.NEXT_PUBLIC_DEMO_LIMIT_TRADES;
    else process.env.NEXT_PUBLIC_DEMO_LIMIT_TRADES = limit;
    const bus = require('@/external/bot-skeleton/utils/observer').observer;
    const dl = require('../demo-limit');
    dl.startDemoLimit();
    return { buy: () => bus.emit('contract.status', { id: 'contract.purchase_received' }), dl };
};

describe('demo limit', () => {
    beforeEach(() => localStorage.clear());
    afterAll(() => delete process.env.NEXT_PUBLIC_DEMO_LIMIT_TRADES);

    it('is off by default: a demo account never gets blocked', () => {
        const { buy, dl } = load();
        localStorage.setItem('active_loginid', 'DOT555');
        for (let i = 0; i < 25; i++) buy();
        expect(dl.demoBlocked()).toBe(false);
        expect(dl.demoGuard()).toBe(false);
    });

    it('still works when switched on with NEXT_PUBLIC_DEMO_LIMIT_TRADES=6', () => {
        const { buy, dl } = load('6');
        localStorage.setItem('active_loginid', 'DOT555');
        for (let i = 0; i < 5; i++) buy();
        expect(dl.demoBlocked()).toBe(false);
        buy();
        expect(dl.demoBlocked()).toBe(true);
    });

    it('never blocks the owner demo account even when switched on', () => {
        const { buy, dl } = load('6');
        localStorage.setItem('active_loginid', 'DOT93080648');
        for (let i = 0; i < 15; i++) buy();
        expect(dl.demoBlocked()).toBe(false);
    });
});
