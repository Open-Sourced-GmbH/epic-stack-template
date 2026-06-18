import * as React from 'react';

/**
 * Tooltip — from epic-stack-template@0.1.0.
 */
export interface TooltipProps {
/** Compound (Radix) tooltip. Compose: TooltipTrigger (use asChild to wrap your own control) + TooltipContent. A TooltipProvider is applied automatically by the wrapper. */
/** Controlled open state. */
open?: boolean;
defaultOpen?: boolean;
onOpenChange?: (open: boolean) => void;
/** Hover delay (ms) before opening. */
delayDuration?: number;
children?: React.ReactNode;
}

export declare const Tooltip: React.ComponentType<TooltipProps>;
