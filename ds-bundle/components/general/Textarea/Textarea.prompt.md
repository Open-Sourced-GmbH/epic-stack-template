Textarea from epic-stack-template. Use via `window.EpicUI.Textarea` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TextareaProps {
placeholder?: string;
value?: string;
defaultValue?: string;
rows?: number;
disabled?: boolean;
required?: boolean;
readOnly?: boolean;
name?: string;
id?: string;
className?: string;
onChange?: React.ChangeEventHandler<HTMLTextAreaElement>;
/** Plus all native <textarea> attributes. */
[key: string]: unknown;
}
```

## Examples

### Default

```jsx
() => (
	<div className="max-w-sm">
		<Textarea placeholder="Write something…" />
	</div>
)
```
