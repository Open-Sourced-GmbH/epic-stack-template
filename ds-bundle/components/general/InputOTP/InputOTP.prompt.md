InputOTP from epic-stack-template. Use via `window.EpicUI.InputOTP` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InputOTPProps {
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
```

## Examples

### SixDigit

```jsx
() => (
	<InputOTP maxLength={6} value="123456" onChange={() => {}}>
		<InputOTPGroup>
			<InputOTPSlot index={0} />
			<InputOTPSlot index={1} />
			<InputOTPSlot index={2} />
		</InputOTPGroup>
		<InputOTPSeparator />
		<InputOTPGroup>
			<InputOTPSlot index={3} />
			<InputOTPSlot index={4} />
			<InputOTPSlot index={5} />
		</InputOTPGroup>
	</InputOTP>
)
```
