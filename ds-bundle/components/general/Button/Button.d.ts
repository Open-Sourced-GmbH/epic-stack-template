import * as React from 'react';

/**
 * Button — from epic-stack-template@0.1.0.
 */
export interface ButtonProps {
/** Visual style variant. @default 'default' */
variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
/** Size preset. @default 'default' */
size?: 'default' | 'wide' | 'sm' | 'lg' | 'pill' | 'icon';
/** Render as the child element via Radix Slot instead of a native <button>. @default false */
asChild?: boolean;
children?: React.ReactNode;
className?: string;
disabled?: boolean;
type?: 'button' | 'submit' | 'reset';
onClick?: React.MouseEventHandler<HTMLButtonElement>;
/** Plus all native <button> attributes. */
[key: string]: unknown;
}

export declare const Button: React.ComponentType<ButtonProps>;
