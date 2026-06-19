// design-sync barrel entry — re-exports the curated styleguide design-system
// surface (the same 14 components declared in design-sync.config.json and
// rendered by app/components/styleguide/specimens.tsx) so package-build.mjs
// bundles the *real* shipped component code into window.EpicUI. (The snapshot's
// manifest.json is a generated artifact, not a source of this list.) This is
// NOT an app entry; it exists only
// so the converter has a single entry point in synth/no-dist mode. Keep it in
// lockstep with specimens.tsx and design-sync.config.json — enforced by
// app/components/styleguide/design-sync.test.ts.
//
// Compound components (DropdownMenu / Tooltip / InputOTP / Accordion / Card)
// export their sub-parts too — the design agent needs them to compose, and the lockstep
// test maps each sub-part back to its canonical root by name prefix. The command
// palette is the exception: its complete, self-contained API is `CommandPalette`
// (give it `commands` and it renders the whole palette + dialog), so only that
// high-level component is carded — the raw cmdk primitives stay internal.
export {
	Accordion,
	AccordionContent,
	AccordionItem,
	AccordionTrigger,
} from '#app/components/ui/accordion.tsx'
export { Badge, badgeVariants } from '#app/components/ui/badge.tsx'
export { Button, buttonVariants } from '#app/components/ui/button.tsx'
export {
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from '#app/components/ui/card.tsx'
export { Checkbox } from '#app/components/ui/checkbox.tsx'
export { CommandPalette } from '#app/components/ui/command.tsx'
export {
	DropdownMenu,
	DropdownMenuCheckboxItem,
	DropdownMenuContent,
	DropdownMenuGroup,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuPortal,
	DropdownMenuRadioGroup,
	DropdownMenuRadioItem,
	DropdownMenuSeparator,
	DropdownMenuShortcut,
	DropdownMenuSub,
	DropdownMenuSubContent,
	DropdownMenuSubTrigger,
	DropdownMenuTrigger,
} from '#app/components/ui/dropdown-menu.tsx'
export { Field, Field as FormField } from '#app/components/ui/field.tsx'
export { Input } from '#app/components/ui/input.tsx'
export {
	InputOTP,
	InputOTPGroup,
	InputOTPSeparator,
	InputOTPSlot,
} from '#app/components/ui/input-otp.tsx'
export { Label } from '#app/components/ui/label.tsx'
export { Slider } from '#app/components/ui/slider.tsx'
export { Spinner } from '#app/components/ui/spinner.tsx'
export { StatusButton } from '#app/components/ui/status-button.tsx'
export { Textarea } from '#app/components/ui/textarea.tsx'
export {
	Tooltip,
	TooltipContent,
	TooltipProvider,
	TooltipTrigger,
} from '#app/components/ui/tooltip.tsx'
