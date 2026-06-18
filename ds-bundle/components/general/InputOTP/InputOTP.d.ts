import * as React from 'react';

/**
 * InputOTP — from epic-stack-template@0.1.0.
 */
export interface InputOTPProps {
/** One-time-code input (the `input-otp` package). Compose the boxes with InputOTPGroup + InputOTPSlot (index 0..maxLength-1), optionally split by InputOTPSeparator. */
/** Number of character slots. */
maxLength: number;
value?: string;
defaultValue?: string;
onChange?: (value: string) => void;
onComplete?: (value: string) => void;
disabled?: boolean;
/** Regex source constraining allowed characters. */
pattern?: string;
className?: string;
containerClassName?: string;
children?: React.ReactNode;
}

export declare const InputOTP: React.ComponentType<InputOTPProps>;
