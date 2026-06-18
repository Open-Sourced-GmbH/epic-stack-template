StatusButton from epic-stack-template. Use via `window.EpicUI.StatusButton` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface StatusButtonProps {
/** Drives the trailing status indicator: spinner / check / cross. */
status: 'idle' | 'pending' | 'success' | 'error';
/** Optional tooltip message shown on the status indicator. */
message?: string | null;
/** Tuning for the pending-spinner delay (see the `spin-delay` package). */
spinDelay?: { delay?: number; minDuration?: number };
/** Inherited from Button. @default 'default' */
variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
/** Inherited from Button. @default 'default' */
size?: 'default' | 'wide' | 'sm' | 'lg' | 'pill' | 'icon';
children?: React.ReactNode;
className?: string;
disabled?: boolean;
type?: 'button' | 'submit' | 'reset';
onClick?: React.MouseEventHandler<HTMLButtonElement>;
/** Plus all native <button> attributes. */
[key: string]: unknown;
}
```

## Examples

### States

```jsx
() => (
	<div className="flex flex-wrap items-center gap-3">
		<StatusButton status="idle">idle</StatusButton>
		<StatusButton status="pending" spinDelay={{ delay: 0, minDuration: 0 }}>
			pending
		</StatusButton>
		<StatusButton status="success">success</StatusButton>
		<StatusButton status="error">error</StatusButton>
	</div>
)
```
