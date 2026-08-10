import React from 'react';
import { formatIndianCurrencyFull } from '../utils/currencyUtils';

/**
 * Displays formatted Indian currency text (e.g. ₹1 Lakh) with exact numeric representation (₹1,00,000)
 * in small size below the main text.
 */
export default function IndianCurrencyDisplay({
    amount,
    color = 'inherit',
    size = 'md',
    showNumericSubtext = true,
    subtextColor = 'var(--text-muted)',
    align = 'left',
    style = {},
    subtextStyle = {},
    customMainFontSize,
    customSubFontSize
}) {
    const { words, numeric } = formatIndianCurrencyFull(amount);

    let mainFontSize = '1.1rem';
    let subFontSize = '0.8rem';

    if (customMainFontSize) {
        mainFontSize = customMainFontSize;
    } else if (size === '2xl') {
        mainFontSize = '3.5rem';
        subFontSize = '1.3rem';
    } else if (size === 'xl') {
        mainFontSize = '2.5rem';
        subFontSize = '1.1rem';
    } else if (size === 'lg') {
        mainFontSize = '1.6rem';
        subFontSize = '0.9rem';
    } else if (size === 'md') {
        mainFontSize = '1.1rem';
        subFontSize = '0.8rem';
    } else if (size === 'sm') {
        mainFontSize = '0.9rem';
        subFontSize = '0.7rem';
    } else if (size === 'xs') {
        mainFontSize = '0.8rem';
        subFontSize = '0.65rem';
    }

    if (customSubFontSize) {
        subFontSize = customSubFontSize;
    }

    const shouldShowSubtext = showNumericSubtext && words !== numeric;

    return (
        <div style={{
            display: 'inline-flex',
            flexDirection: 'column',
            alignItems: align === 'center' ? 'center' : align === 'right' ? 'flex-end' : 'flex-start',
            lineHeight: 1.15,
            ...style
        }}>
            <span style={{
                fontSize: mainFontSize,
                fontWeight: 'bold',
                color: color,
                whiteSpace: 'nowrap'
            }}>
                {words}
            </span>
            {shouldShowSubtext && (
                <span style={{
                    fontSize: subFontSize,
                    color: subtextColor,
                    fontWeight: 'normal',
                    opacity: 0.85,
                    marginTop: '2px',
                    whiteSpace: 'nowrap',
                    ...subtextStyle
                }}>
                    {numeric}
                </span>
            )}
        </div>
    );
}
