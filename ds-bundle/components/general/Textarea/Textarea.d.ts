import * as React from 'react';

/**
 * Textarea — from epic-stack-template@0.1.0.
 */
export interface TextareaProps {
placeholder?: string;
value?: string;
defaultValue?: string;
rows?: number;
disabled?: boolean;
required?: boolean;
readOnly?: boolean;
name?: string;
id?: string;
className?: string;
onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
/** Plus all native <textarea> attributes. */
[key: string]: unknown;
}

export declare const Textarea: React.ComponentType<TextareaProps>;
