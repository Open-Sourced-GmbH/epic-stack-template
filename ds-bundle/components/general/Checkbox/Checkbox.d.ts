import * as React from 'react';

/**
 * Checkbox — from epic-stack-template@0.1.0.
 */
export interface CheckboxProps {
/** Controlled checked state; 'indeterminate' for a mixed state. */
checked?: boolean | 'indeterminate';
/** Uncontrolled initial checked state. */
defaultChecked?: boolean;
onCheckedChange?: (checked: boolean | 'indeterminate') => void;
disabled?: boolean;
required?: boolean;
name?: string;
value?: string;
id?: string;
className?: string;
}

export declare const Checkbox: React.ComponentType<CheckboxProps>;
