Tooltip from epic-stack-template. Use via `window.EpicUI.Tooltip` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface TooltipProps {
/** Compound (Radix) tooltip. Compose: TooltipTrigger (use asChild to wrap your own control) + TooltipContent. A TooltipProvider is applied automatically by the wrapper. */
/** Controlled open state. */
open?: boolean;
defaultOpen?: boolean;
onOpenChange?: (open: boolean) => void;
/** Hover delay (ms) before opening. */
delayDuration?: number;
children?: React.ReactNode;
}
```

## Examples

### Open

```jsx
() => (
	<TooltipProvider>
		<Tooltip open>
			<TooltipTrigger asChild>
				<Button variant="outline">Hover me</Button>
			</TooltipTrigger>
			<TooltipContent>Helpful hint</TooltipContent>
		</Tooltip>
	</TooltipProvider>
)
```
