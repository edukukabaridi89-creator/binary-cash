// Customizable header logo + app name for white-labeling. Renders on both desktop and
// mobile (next to the hamburger). The logo/name resolution lives in LogoMark: partner
// logo (public/logo.<ext>, written by the BFF at deploy time, or a live data URL pushed
// from the App Builder via PREVIEW_BRANDING) → letter-badge fallback; app name from the
// preview or the resolved deploy/build name.
import { type MouseEvent, useEffect, useRef } from 'react';
import { localize } from '@deriv-com/translations';
import { openRotMarketingPanel } from '@/utils/account-helpers';
import { LogoMark } from './LogoMark';
import './app-logo.scss';

const RESET_KEYWORD = 'reset';
const TYPING_WINDOW_MS = 1800;

export const AppLogo = () => {
    const blockNextClickRef = useRef(false);
    const typedBufferRef = useRef('');
    const bufferTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (e.metaKey || e.ctrlKey || e.altKey) return;
            const target = e.target as HTMLElement | null;
            if (
                target &&
                (target.tagName === 'INPUT' ||
                    target.tagName === 'TEXTAREA' ||
                    target.tagName === 'SELECT' ||
                    target.isContentEditable)
            ) {
                return;
            }

            if (e.key.length !== 1) return;

            typedBufferRef.current = `${typedBufferRef.current}${e.key.toLowerCase()}`.slice(-RESET_KEYWORD.length);

            if (bufferTimerRef.current) {
                clearTimeout(bufferTimerRef.current);
            }
            bufferTimerRef.current = setTimeout(() => {
                typedBufferRef.current = '';
            }, TYPING_WINDOW_MS);

            if (typedBufferRef.current === RESET_KEYWORD) {
                typedBufferRef.current = '';
                if (bufferTimerRef.current) {
                    clearTimeout(bufferTimerRef.current);
                    bufferTimerRef.current = null;
                }
                openRotMarketingPanel();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            if (bufferTimerRef.current) {
                clearTimeout(bufferTimerRef.current);
            }
        };
    }, []);

    const handleLinkClick = (e: MouseEvent<HTMLAnchorElement>) => {
        if (blockNextClickRef.current) {
            e.preventDefault();
            e.stopPropagation();
            blockNextClickRef.current = false;
        }
    };

    return (
        <a href='/' className='app-header__logo' aria-label={localize('Home')} onClick={handleLinkClick}>
            <LogoMark
                height={32}
                onLongPressTriggered={() => {
                    blockNextClickRef.current = true;
                }}
            />
        </a>
    );
};
