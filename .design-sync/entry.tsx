// design-sync barrel entry — re-exports the curated styleguide design-system
// surface (the same 6 components in app/components/styleguide/specimens.tsx +
// styleguide/manifest.json) so package-build.mjs bundles the *real* shipped
// component code into window.EpicUI. This is NOT an app entry; it exists only
// so the converter has a single entry point in synth/no-dist mode. Keep it in
// lockstep with specimens.tsx and design-sync.config.json — enforced by
// app/components/styleguide/design-sync.test.ts.
export { Button, buttonVariants } from '#app/components/ui/button.tsx'
export { Checkbox } from '#app/components/ui/checkbox.tsx'
export { Input } from '#app/components/ui/input.tsx'
export { Label } from '#app/components/ui/label.tsx'
export { StatusButton } from '#app/components/ui/status-button.tsx'
export { Textarea } from '#app/components/ui/textarea.tsx'
