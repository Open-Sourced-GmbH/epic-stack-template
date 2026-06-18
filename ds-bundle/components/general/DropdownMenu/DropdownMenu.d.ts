import * as React from 'react';

/**
 * DropdownMenu — from epic-stack-template@0.1.0.
 */
export interface DropdownMenuProps {
/** Compound (Radix) menu. Compose: DropdownMenuTrigger + DropdownMenuContent containing DropdownMenuLabel / DropdownMenuSeparator / DropdownMenuItem / DropdownMenuCheckboxItem / DropdownMenuRadioGroup+DropdownMenuRadioItem / DropdownMenuSub(+SubTrigger/+SubContent) / DropdownMenuShortcut. */
/** Controlled open state. */
open?: boolean;
/** Uncontrolled initial open state. */
defaultOpen?: boolean;
onOpenChange?: (open: boolean) => void;
/** Block outside interaction while open. @default true */
modal?: boolean;
dir?: 'ltr' | 'rtl';
children?: React.ReactNode;
}

export declare const DropdownMenu: React.ComponentType<DropdownMenuProps>;
