import * as React from 'react';

/**
 * Input — from epic-stack-template@0.1.0.
 */
export interface InputProps {
type?: React.HTMLInputTypeAttribute;
placeholder?: string;
value?: string;
defaultValue?: string;
disabled?: boolean;
required?: boolean;
readOnly?: boolean;
name?: string;
id?: string;
className?: string;
onChange?: React.ChangeEventHandler<HTMLInputElement>;
/** Apply the invalid styling (red border). */
'aria-invalid'?: boolean | 'true' | 'false';
/** Plus all native <input> attributes. */
[key: string]: unknown;
}

export declare const Input: React.ComponentType<InputProps>;
