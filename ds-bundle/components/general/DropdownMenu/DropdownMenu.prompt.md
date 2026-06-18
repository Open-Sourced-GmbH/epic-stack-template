DropdownMenu from epic-stack-template. Use via `window.EpicUI.DropdownMenu` (bundle loaded from the root `_ds_bundle.js`).

## Props

```ts
interface DropdownMenuProps {
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
```

## Examples

### Open

```jsx
() => (
	<DropdownMenu open>
		<DropdownMenuTrigger asChild>
			<Button variant="outline">Open menu</Button>
		</DropdownMenuTrigger>
		<DropdownMenuContent>
			<DropdownMenuLabel>My account</DropdownMenuLabel>
			<DropdownMenuSeparator />
			<DropdownMenuItem>
				Profile<DropdownMenuShortcut>⇧⌘P</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem>
				Settings<DropdownMenuShortcut>⌘S</DropdownMenuShortcut>
			</DropdownMenuItem>
			<DropdownMenuItem>Log out</DropdownMenuItem>
		</DropdownMenuContent>
	</DropdownMenu>
)
```
