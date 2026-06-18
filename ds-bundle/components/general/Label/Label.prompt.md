Label from epic-stack-template. Use via `window.EpicUI.Label` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface LabelProps {
/** Associates the label with a form control by its id. */
htmlFor?: string;
children?: React.ReactNode;
className?: string;
/** Plus all native <label> attributes. */
[key: string]: unknown;
}
```

## Examples

### Field

```jsx
() => (
	<div className="grid max-w-sm gap-1.5">
		<Label htmlFor="email">Email</Label>
		<Input id="email" type="email" placeholder="you@example.com" />
	</div>
)
```
