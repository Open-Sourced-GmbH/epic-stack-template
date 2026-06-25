import { getUserImgSrc, initials } from '#app/utils/misc.tsx'
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar.tsx'

/**
 * The one way to render a user's avatar across the app — the standard
 * composition of the {@link Avatar} primitive: the photo when there is one (via
 * `getUserImgSrc`), degrading to {@link initials} otherwise (or while the image
 * loads), never a broken-image glyph. Replaces the hand-rolled `rounded-full` +
 * `object-cover` circles in the navbar, dropdown, drawer, and the blog/admin
 * author chips so identity reads identically everywhere.
 *
 * It's a thin *composition*, not a design-system primitive — so it lives here
 * with the other shared components (no `ui/*` design-sync lockstep). Size and
 * shape it with `className` on the root (`size-7`, `size-9`, …, default
 * `size-10`); `fallbackClassName` tunes the initials chip (e.g. a smaller text
 * scale on tiny avatars, or a different tonal background).
 */
export function UserAvatar({
	name,
	imageObjectKey,
	className,
	fallbackClassName,
	alt = '',
}: {
	/** Display name — drives the initials fallback. */
	name: string
	/** The user image's storage object key, if they have a photo. */
	imageObjectKey?: string | null
	/** Sizing/shape utilities for the avatar root (default `size-10` circle). */
	className?: string
	/** Extra classes for the initials fallback chip. */
	fallbackClassName?: string
	/** Image alt text; defaults to empty (the avatar is decorative beside a name). */
	alt?: string
}) {
	return (
		<Avatar className={className}>
			{imageObjectKey ? (
				<AvatarImage src={getUserImgSrc(imageObjectKey)} alt={alt} />
			) : null}
			<AvatarFallback className={fallbackClassName}>
				{initials(name)}
			</AvatarFallback>
		</Avatar>
	)
}
