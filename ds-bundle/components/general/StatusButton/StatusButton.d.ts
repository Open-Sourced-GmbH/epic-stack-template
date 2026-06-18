import * as React from 'react';

/**
 * StatusButton — from epic-stack-template@0.1.0.
 */
export interface StatusButtonProps {
/** Drives the trailing status indicator: spinner / check / cross. */
status: 'idle' | 'pending' | 'success' | 'error';
/** Optional tooltip message shown on the status indicator. */
message?: string | null;
/** Tuning for the pending-spinner delay (see the `spin-delay` package). */
spinDelay?: { delay?: number; minDuration?: number };
/** Inherited from Button. @default 'default' */
variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
/** Inherited from Button. @default 'default' */
size?: 'default' | 'wide' | 'sm' | 'lg' | 'pill' | 'icon';
children?: React.ReactNode;
className?: string;
disabled?: boolean;
type?: 'button' | 'submit' | 'reset';
onClick?: React.MouseEventHandler<HTMLButtonElement>;
/** Plus all native <button> attributes. */
[key: string]: unknown;
}

export declare const StatusButton: React.ComponentType<StatusButtonProps>;
