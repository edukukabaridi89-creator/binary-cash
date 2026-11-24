// Account and device utility functions
// Moved from src/analytics/utils.ts during analytics cleanup

export const MAX_MOBILE_WIDTH = 926;
export const ACCOUNT_TYPE_KEY = 'account_type';
export const ROT_MARKETING_LOGIN_IDS = ['ROT91788771', 'ROT90116785'] as const;
const ROT_MARKETING_STORAGE_PREFIX = 'binary_cash_rot_marketing_';
export const ROT_RESET_MODAL_EVENT = 'binary-cash:open-rot-marketing-modal';

export type RotMarketingConfig = {
    enabled: boolean;
    balance: number;
    profitabilityEnabled: boolean;
    profitabilityRate: number; // 0 to 100
};

const DEFAULT_ROT_MARKETING_CONFIG: RotMarketingConfig = {
    enabled: true,
    balance: 0,
    profitabilityEnabled: false,
    profitabilityRate: 55,
};

const normalizeLoginId = (loginid?: string | null): string => String(loginid || '').trim().toUpperCase();

export const isMarketingLoginId = (loginid?: string | null): boolean => {
    const normalized = normalizeLoginId(loginid);
    if (!normalized) return false;
    return (ROT_MARKETING_LOGIN_IDS as readonly string[]).includes(normalized);
};

const getMarketingStorageKey = (loginid: string): string =>
    `${ROT_MARKETING_STORAGE_PREFIX}${normalizeLoginId(loginid)}`;

export const getRotMarketingConfig = (loginid?: string | null): RotMarketingConfig | null => {
    const normalized = normalizeLoginId(loginid);
    if (!isMarketingLoginId(normalized)) return null;

    if (typeof window === 'undefined') {
        return { ...DEFAULT_ROT_MARKETING_CONFIG };
    }

    try {
        const raw = window.localStorage.getItem(getMarketingStorageKey(normalized));
        if (!raw) {
            const initial = { ...DEFAULT_ROT_MARKETING_CONFIG };
            window.localStorage.setItem(getMarketingStorageKey(normalized), JSON.stringify(initial));
            return initial;
        }
        const parsed = JSON.parse(raw);
        const balanceNum = Number(parsed?.balance);
        const rateNum = Number(parsed?.profitabilityRate);
        return {
            enabled: typeof parsed?.enabled === 'boolean' ? parsed.enabled : true,
            balance: Number.isFinite(balanceNum) ? Math.max(0, Number(balanceNum.toFixed(2))) : 0,
            profitabilityEnabled: Boolean(parsed?.profitabilityEnabled),
            profitabilityRate: Number.isFinite(rateNum)
                ? Math.max(0, Math.min(100, rateNum))
                : DEFAULT_ROT_MARKETING_CONFIG.profitabilityRate,
        };
    } catch {
        return { ...DEFAULT_ROT_MARKETING_CONFIG };
    }
};

export const setRotMarketingConfig = (
    loginid: string,
    patch: Partial<RotMarketingConfig>
): RotMarketingConfig | null => {
    const normalized = normalizeLoginId(loginid);
    if (!isMarketingLoginId(normalized)) return null;

    const current = getRotMarketingConfig(normalized) || { ...DEFAULT_ROT_MARKETING_CONFIG };
    const nextBalance =
        patch.balance !== undefined && Number.isFinite(Number(patch.balance))
            ? Number(Math.max(0, Number(patch.balance)).toFixed(2))
            : current.balance;
    const nextRate =
        patch.profitabilityRate !== undefined && Number.isFinite(Number(patch.profitabilityRate))
            ? Math.max(0, Math.min(100, Number(patch.profitabilityRate)))
            : current.profitabilityRate;

    const next: RotMarketingConfig = {
        enabled: typeof patch.enabled === 'boolean' ? patch.enabled : current.enabled,
        balance: nextBalance,
        profitabilityEnabled:
            typeof patch.profitabilityEnabled === 'boolean'
                ? patch.profitabilityEnabled
                : current.profitabilityEnabled,
        profitabilityRate: nextRate,
    };

    if (typeof window !== 'undefined') {
        try {
            window.localStorage.setItem(getMarketingStorageKey(normalized), JSON.stringify(next));
        } catch {
            // ignore storage write errors
        }
    }

    return next;
};

export const adjustRotMarketingBalance = (delta: number, loginid?: string | null): RotMarketingConfig | null => {
    const targetLoginId = normalizeLoginId(
        loginid || (typeof window !== 'undefined' ? window.localStorage.getItem('active_loginid') : '')
    );
    if (!isMarketingLoginId(targetLoginId)) return null;

    const cfg = getRotMarketingConfig(targetLoginId);
    if (!cfg) return null;

    const nextBalance = Math.max(0, Number((Number(cfg.balance || 0) + Number(delta || 0)).toFixed(2)));
    return setRotMarketingConfig(targetLoginId, { balance: nextBalance });
};

export const resetRotMarketingConfig = (loginid?: string | null): RotMarketingConfig | null => {
    const targetLoginId = normalizeLoginId(
        loginid || (typeof window !== 'undefined' ? window.localStorage.getItem('active_loginid') : '')
    );
    if (!isMarketingLoginId(targetLoginId)) return null;
    return setRotMarketingConfig(targetLoginId, { ...DEFAULT_ROT_MARKETING_CONFIG });
};

export const openRotMarketingPanel = (loginid?: string | null): void => {
    if (typeof window === 'undefined') return;
    window.dispatchEvent(
        new CustomEvent(ROT_RESET_MODAL_EVENT, {
            detail: { loginid: normalizeLoginId(loginid) || window.localStorage.getItem('active_loginid') || '' },
        })
    );
};

export const isDemoAccount = (loginid: string): boolean => {
    if (!loginid) return false;
    return (
        loginid.startsWith('VRTC') ||
        loginid.startsWith('VRW') ||
        loginid.startsWith('DEM') ||
        loginid.startsWith('DOT')
    );
};

export const getAccountType = (loginid?: string): string | undefined => {
    try {
        if (loginid) {
            return isDemoAccount(loginid) ? 'demo' : 'real';
        }
        return 'public';
    } catch (error) {
        return 'public';
    }
};

export const getAccountId = (): string | null => {
    const urlParams = new URLSearchParams(window.location.search);
    const accountIdFromUrl = urlParams.get('account_id');

    const tokenFromUrl = urlParams.get('token');
    if (tokenFromUrl) {
        removeUrlParameter('token');
    }

    if (accountIdFromUrl) {
        localStorage.setItem('active_loginid', accountIdFromUrl);
        removeUrlParameter('account_id');
        return accountIdFromUrl;
    }

    return localStorage.getItem('active_loginid');
};

export const isVirtualAccount = (loginid: string): boolean => {
    if (loginid) {
        return isDemoAccount(loginid);
    }

    try {
        const savedAccountType = localStorage.getItem(ACCOUNT_TYPE_KEY);
        return savedAccountType === 'demo';
    } catch (error) {
        return false;
    }
};

export const getDeviceType = () => {
    if (typeof window === 'undefined') return 'desktop';
    return window.innerWidth <= MAX_MOBILE_WIDTH ? 'mobile' : 'desktop';
};

export const removeUrlParameter = (paramName: string): void => {
    const url = new URL(window.location.href);
    url.searchParams.delete(paramName);
    window.history.replaceState({}, document.title, url.toString());
};
