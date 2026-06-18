Input from epic-stack-template. Use via `window.EpicUI.Input` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface InputProps {
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
```

## Examples

### States

```jsx
() => (
	<div className="flex max-w-sm flex-col gap-3">
		<Input placeholder="Default input" />
		<Input placeholder="Disabled" disabled />
		<Input aria-invalid defaultValue="bad value" />
	</div>
)
```

## Related

`InputOTP`
