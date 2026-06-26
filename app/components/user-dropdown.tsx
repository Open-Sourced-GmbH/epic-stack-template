import { useRef } from 'react'
import { Link, Form } from 'react-router'
import { useUser, userHasRole } from '#app/utils/user.ts'
import { Button } from './ui/button'
import {
	DropdownMenu,
	DropdownMenuTrigger,
	DropdownMenuPortal,
	DropdownMenuContent,
	DropdownMenuItem,
} from './ui/dropdown-menu'
import { Icon } from './ui/icon'
import { Separator } from './ui/separator'
import { UserAvatar } from './user-avatar'

/** Inline chevron — the curated icon sprite has no chevron glyph (see icons/types). */
function ChevronDown({ className }: { className?: string }) {
	return (
		<svg
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			strokeWidth="2"
			strokeLinecap="round"
			strokeLinejoin="round"
			aria-hidden="true"
			className={className}
		>
			<path d="m6 9 6 6 6-6" />
		</svg>
	)
}

/**
 * The logged-in user affordance, shared by the universal navbar (AppShell) on
 * every `full`/`marketing` surface. The trigger is a ghost pill — a ringed
 * {@link UserAvatar}, the display name, and a chevron that flips when the menu
 * opens — and the avatar is the way *into* the backend from anywhere: an
 * identity header (avatar + name + email) tops the menu, then it links to the
 * account hub and surfaces an Admin entry for users who hold the `admin` role
 * (so a non-admin never sees a dead link).
 */
export function UserDropdown() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'admin')
	const displayName = user.name ?? user.username
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="ghost" className="h-auto gap-2 px-2 py-1">
					<Link
						to="/settings/profile"
						// this is for progressive enhancement
						onClick={(e) => e.preventDefault()}
						className="group flex items-center gap-2"
						aria-label="User menu"
					>
						<UserAvatar
							name={displayName}
							imageObjectKey={user.image?.objectKey}
							className="ring-border group-hover:ring-brand size-8 ring-1 transition-[box-shadow]"
						/>
						<span className="text-body-sm font-bold">{displayName}</span>
						<ChevronDown className="text-muted-foreground size-3.5 transition-transform group-data-[state=open]:rotate-180" />
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="end" className="w-57">
					<div className="flex items-center gap-2 px-2 py-1.5">
						<UserAvatar
							name={displayName}
							imageObjectKey={user.image?.objectKey}
							className="size-9"
						/>
						<div className="min-w-0">
							<p className="text-body-sm truncate font-bold">{displayName}</p>
							<p className="text-muted-foreground truncate text-body-2xs">
								{user.email}
							</p>
						</div>
					</div>
					<Separator className="my-1" />
					<DropdownMenuItem asChild>
						<Link prefetch="intent" to="/settings/profile">
							<Icon className="text-body-md" name="avatar">
								Account
							</Icon>
						</Link>
					</DropdownMenuItem>
					{isAdmin ? (
						<DropdownMenuItem asChild>
							<Link prefetch="intent" to="/admin/blog">
								<Icon className="text-body-md" name="file-text">
									Admin
								</Icon>
							</Link>
						</DropdownMenuItem>
					) : null}
					<Form action="/logout" method="POST" ref={formRef}>
						<DropdownMenuItem asChild>
							<button type="submit" className="w-full">
								<Icon className="text-body-md" name="exit">
									Logout
								</Icon>
							</button>
						</DropdownMenuItem>
					</Form>
				</DropdownMenuContent>
			</DropdownMenuPortal>
		</DropdownMenu>
	)
}
