Checkbox from epic-stack-template. Use via `window.EpicUI.Checkbox` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface CheckboxProps {
/** Controlled checked state; 'indeterminate' for a mixed state. */
checked?: boolean | 'indeterminate';
/** Uncontrolled initial checked state. */
defaultChecked?: boolean;
onCheckedChange?: (checked: boolean | 'indeterminate') => void;
disabled?: boolean;
required?: boolean;
name?: string;
value?: string;
id?: string;
className?: string;
}
```

## Examples

### States

```jsx
() => (
	<div className="flex flex-col gap-3">
		<div className="flex items-center gap-2">
			<Checkbox id="cb-unchecked" />
			<Label htmlFor="cb-unchecked">Unchecked</Label>
		</div>
		<div className="flex items-center gap-2">
			<Checkbox id="cb-checked" defaultChecked />
			<Label htmlFor="cb-checked">Checked</Label>
		</div>
		<div className="flex items-center gap-2">
			<Checkbox id="cb-disabled" disabled />
			<Label htmlFor="cb-disabled">Disabled</Label>
		</div>
	</div>
)
```
