// Owned preview — mirrors the `select` specimen. `States`: the trigger matches
// Input (default / Field-paired / invalid). `Open`: rendered open and contained
// (position="item-aligned") so the listbox shows in place — grouped items, the
// selected brand check, and a separator. This preview renders in isolation, so
// Radix Select's always-on scroll-lock is harmless here (unlike the shared
// styleguide page, where the `select` specimen stays closed).
import {
	Field,
	Select,
	SelectContent,
	SelectGroup,
	SelectItem,
	SelectLabel,
	SelectSeparator,
	SelectTrigger,
	SelectValue,
} from 'epic-stack-template'

export const States = () => (
	<div className="flex w-full max-w-sm flex-col gap-6">
		<Select defaultValue="medium">
			<SelectTrigger aria-label="Size">
				<SelectValue placeholder="Select a size" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="small">Small</SelectItem>
				<SelectItem value="medium">Medium</SelectItem>
				<SelectItem value="large">Large</SelectItem>
			</SelectContent>
		</Select>
		<Field label="Plan" htmlFor="preview-plan">
			<Select>
				<SelectTrigger>
					<SelectValue placeholder="Choose a plan" />
				</SelectTrigger>
				<SelectContent>
					<SelectItem value="free">Free</SelectItem>
					<SelectItem value="pro">Pro</SelectItem>
				</SelectContent>
			</Select>
		</Field>
		<Select>
			<SelectTrigger aria-invalid aria-label="Country">
				<SelectValue placeholder="Select a country" />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value="ch">Switzerland</SelectItem>
				<SelectItem value="de">Germany</SelectItem>
			</SelectContent>
		</Select>
	</div>
)

export const Open = () => (
	<div className="relative h-56 w-full max-w-sm">
		<Select defaultValue="medium" open>
			<SelectTrigger aria-label="Open example">
				<SelectValue />
			</SelectTrigger>
			<SelectContent position="item-aligned">
				<SelectGroup>
					<SelectLabel>Sizes</SelectLabel>
					<SelectItem value="small">Small</SelectItem>
					<SelectItem value="medium">Medium</SelectItem>
					<SelectItem value="large">Large</SelectItem>
				</SelectGroup>
				<SelectSeparator />
				<SelectItem value="custom">Custom…</SelectItem>
			</SelectContent>
		</Select>
	</div>
)
