Button from epic-stack-template. Use via `window.EpicUI.Button` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface ButtonProps {
/** Visual style variant. @default 'default' */
variant?: 'default' | 'destructive' | 'outline' | 'secondary' | 'ghost' | 'link';
/** Size preset. @default 'default' */
size?: 'default' | 'wide' | 'sm' | 'lg' | 'pill' | 'icon';
/** Render as the child element via Radix Slot instead of a native <button>. @default false */
asChild?: boolean;
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

### Variants

```jsx
() => (
	<div className="flex flex-wrap gap-3">
		{variants.map((v) => (
			<Button key={v} variant={v}>
				{v}
			</Button>
		))}
	</div>
)
```

### Sizes

```jsx
() => (
	<div className="flex flex-wrap items-center gap-3">
		{sizes.map((s) => (
			<Button key={s} size={s}>
				{s}
			</Button>
		))}
	</div>
)
```
