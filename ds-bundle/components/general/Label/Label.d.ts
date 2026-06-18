import * as React from 'react';

/**
 * Label — from epic-stack-template@0.1.0.
 */
export interface LabelProps {
/** Associates the label with a form control by its id. */
htmlFor?: string;
children?: React.ReactNode;
className?: string;
/** Plus all native <label> attributes. */
[key: string]: unknown;
}

export declare const Label: React.ComponentType<LabelProps>;
