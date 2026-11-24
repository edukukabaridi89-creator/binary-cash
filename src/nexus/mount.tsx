// @ts-nocheck
import React, { useEffect, useRef, useState } from 'react';
import { observer } from 'mobx-react-lite';
import { DBOT_TABS } from '@/constants/bot-contents';
import { useDevice } from '@deriv-com/ui';
import { useStore } from '@/hooks/useStore';
import {
    getRotMarketingConfig,
    isMarketingLoginId,
    ROT_RESET_MODAL_EVENT,
    setRotMarketingConfig,
} from '@/utils/account-helpers';
import { useAutoEngine } from './auto-engine';
import { APP_NAME } from './config';
import { DemoLimitPopup } from './demo-limit-popup';
import { GreetingPopup } from './greeting';
import { startGuard } from './guard';
import { MiniCirclesPanel } from './mini-circles';
import { nexus } from './store';
import './nexus.scss';

/** Small, draggable spinning "AI" circle. Tap it to open the Auto Trader tab. */
const AiOrb = observer(() => {
    const [pos, setPos] = useState(() => (window.innerWidth > 1024 ? { x: 18, y: window.innerHeight - 160 } : { x: window.innerWidth - 56, y: window.innerHeight - 250 }));
    const drag = useRef<any>(null);
    return (
        <div
            className={`nx-ai ${nexus.autoOn ? 'is-on' : ''}`}
            style={{ left: pos.x, top: pos.y }}
            title='Auto Trader'
            onPointerDown={e => ((drag.current = { dx: e.clientX - pos.x, dy: e.clientY - pos.y, sx: e.clientX, sy: e.clientY, moved: false }), e.currentTarget.setPointerCapture(e.pointerId))}
            onPointerMove={e => {
                const d = drag.current;
                if (!d) return;
                if (Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 5) d.moved = true;
                if (d.moved) setPos({ x: Math.min(innerWidth - 52, Math.max(0, e.clientX - d.dx)), y: Math.min(innerHeight - 52, Math.max(0, e.clientY - d.dy)) });
            }}
            onPointerUp={() => {
                if (drag.current && !drag.current.moved) nexus.goTab(DBOT_TABS.AUTO_TRADER);
                drag.current = null;
            }}
        >
            <span>AI</span>
        </div>
    );
});

const RotMarketingPanelCard = () => {
    const [isOpen, setIsOpen] = useState(false);
    const [activeMarketingId, setActiveMarketingId] = useState<string | null>(null);
    const [balanceInput, setBalanceInput] = useState('0.00');
    const [profitabilityEnabled, setProfitabilityEnabled] = useState(false);
    const [profitabilityRateInput, setProfitabilityRateInput] = useState('55');
    const [savedNotice, setSavedNotice] = useState('');

    const resolveCurrentMarketingLoginId = (detailLoginId?: string): string | null => {
        const candidates = [
            detailLoginId,
            nexus.getLoginid?.(),
            nexus.root?.client?.loginid,
            typeof window !== 'undefined' ? window.localStorage.getItem('active_loginid') : '',
        ];
        for (const id of candidates) {
            if (isMarketingLoginId(id)) {
                return String(id).trim().toUpperCase();
            }
        }
        return null;
    };

    const loadConfig = (loginid: string) => {
        const cfg = getRotMarketingConfig(loginid) || {
            enabled: true,
            balance: 0,
            profitabilityEnabled: false,
            profitabilityRate: 55,
        };
        setActiveMarketingId(loginid);
        setBalanceInput(Number(cfg.balance).toFixed(2));
        setProfitabilityEnabled(Boolean(cfg.profitabilityEnabled));
        setProfitabilityRateInput(String(cfg.profitabilityRate));
        setSavedNotice('');
    };

    useEffect(() => {
        const onOpenPanel = (event: Event) => {
            const customEvent = event as CustomEvent<{ loginid?: string }>;
            const currentId = resolveCurrentMarketingLoginId(customEvent?.detail?.loginid);
            if (!currentId) {
                setIsOpen(false);
                return;
            }
            loadConfig(currentId);
            setIsOpen(true);
        };

        window.addEventListener(ROT_RESET_MODAL_EVENT, onOpenPanel);
        return () => {
            window.removeEventListener(ROT_RESET_MODAL_EVENT, onOpenPanel);
        };
    }, []);

    if (!isOpen || !activeMarketingId) return null;

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        const parsedBalance = Math.max(0, Number(balanceInput));
        const parsedRate = Math.max(0, Math.min(100, Number(profitabilityRateInput)));
        const safeBalance = Number.isFinite(parsedBalance) ? Number(parsedBalance.toFixed(2)) : 0;
        const safeRate = Number.isFinite(parsedRate) ? parsedRate : 55;

        const updated = setRotMarketingConfig(activeMarketingId, {
            enabled: true,
            balance: safeBalance,
            profitabilityEnabled,
            profitabilityRate: safeRate,
        });

        if (updated) {
            const client = nexus.root?.client;
            if (client) {
                if (typeof client.setAccountList === 'function' && Array.isArray(client.account_list)) {
                    client.setAccountList(client.account_list);
                }
                if (
                    typeof client.setBalance === 'function' &&
                    String(client.loginid || '').trim().toUpperCase() === activeMarketingId
                ) {
                    client.setBalance(updated.balance.toFixed(2));
                }
            }
            setBalanceInput(updated.balance.toFixed(2));
            setProfitabilityRateInput(String(updated.profitabilityRate));
            setSavedNotice('Saved');
            setTimeout(() => {
                setIsOpen(false);
            }, 250);
        }
    };

    return (
        <div
            role='dialog'
            aria-modal='true'
            aria-label='Balance & Profitability'
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                backgroundColor: 'rgba(0, 0, 0, 0.65)',
                padding: '16px',
            }}
            onClick={() => setIsOpen(false)}
        >
            <div
                style={{
                    width: '100%',
                    maxWidth: '380px',
                    backgroundColor: '#14171f',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.14)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 20px 50px rgba(0, 0, 0, 0.5)',
                }}
                onClick={e => e.stopPropagation()}
            >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '14px' }}>
                    <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600 }}>Balance & Profitability</h3>
                    <button
                        type='button'
                        onClick={() => setIsOpen(false)}
                        aria-label='Close'
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#9aa4b2',
                            fontSize: '18px',
                            cursor: 'pointer',
                            padding: '2px 6px',
                        }}
                    >
                        ×
                    </button>
                </div>

                <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                        <span>Simulated Balance (USD)</span>
                        <input
                            type='number'
                            step='0.01'
                            min='0'
                            value={balanceInput}
                            onChange={e => setBalanceInput(e.target.value)}
                            style={{
                                padding: '8px 10px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                backgroundColor: '#1e2330',
                                color: '#ffffff',
                            }}
                        />
                    </label>

                    <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '13px', cursor: 'pointer' }}>
                        <input
                            type='checkbox'
                            checked={profitabilityEnabled}
                            onChange={e => setProfitabilityEnabled(e.target.checked)}
                        />
                        <span>Custom Profitability Rate</span>
                    </label>

                    {profitabilityEnabled && (
                        <label style={{ display: 'flex', flexDirection: 'column', gap: '6px', fontSize: '13px' }}>
                            <span>Win Rate (%)</span>
                            <input
                                type='number'
                                step='1'
                                min='0'
                                max='100'
                                value={profitabilityRateInput}
                                onChange={e => setProfitabilityRateInput(e.target.value)}
                                style={{
                                    padding: '8px 10px',
                                    borderRadius: '8px',
                                    border: '1px solid rgba(255, 255, 255, 0.18)',
                                    backgroundColor: '#1e2330',
                                    color: '#ffffff',
                                }}
                            />
                        </label>
                    )}

                    {savedNotice && <div style={{ fontSize: '12px', color: '#22c55e' }}>{savedNotice}</div>}

                    <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '8px', marginTop: '4px' }}>
                        <button
                            type='button'
                            onClick={() => setIsOpen(false)}
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: '1px solid rgba(255, 255, 255, 0.18)',
                                backgroundColor: 'transparent',
                                color: '#cbd5e1',
                                cursor: 'pointer',
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            type='submit'
                            style={{
                                padding: '8px 14px',
                                borderRadius: '8px',
                                border: 'none',
                                backgroundColor: '#2563eb',
                                color: '#ffffff',
                                fontWeight: 600,
                                cursor: 'pointer',
                            }}
                        >
                            Save & Reset
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export const NexusMount = observer(() => {
    const root = useStore();
    nexus.root = root; // lets the trade dispatcher reach run_panel / transactions / dashboard
    const { isDesktop } = useDevice();
    const runPanelOpen = root.run_panel?.is_drawer_open;
    // Summary / Transactions / Journal start open on the right of every page (desktop), so a trade shows up without navigating anywhere
    useEffect(() => startGuard(), []);
    useEffect(() => {
        if (isDesktop) root.run_panel?.toggleDrawer(true);
    }, [isDesktop]);
    useEffect(() => {
        document.body.classList.toggle('nx-run-open', !!runPanelOpen && isDesktop); // lets the Dashboard make room for the panel
    }, [runPanelOpen, isDesktop]);
    useAutoEngine();
    useEffect(() => {
        document.title = APP_NAME;
        nexus.bindBlockly();
    }, []);

    return (
        <>
            <AiOrb />
            <GreetingPopup />
            <DemoLimitPopup />
            <MiniCirclesPanel />
            <RotMarketingPanelCard />
            {nexus.notice && <div className='nx-toast'>{nexus.notice}</div>}
        </>
    );
});
