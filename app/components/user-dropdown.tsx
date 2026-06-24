import { Img } from 'openimg/react'
import { useRef } from 'react'
import { Link, Form } from 'react-router'
import { getUserImgSrc } from '#app/utils/misc.tsx'
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

/**
 * The logged-in user affordance, shared by the generic app chrome (root.tsx) and
 * the marketing header. The avatar is the way *into* the backend from anywhere:
 * it links to the account hub, and surfaces an Admin entry for users who hold the
 * `admin` role (so a non-admin never sees a dead link).
 */
export function UserDropdown() {
	const user = useUser()
	const isAdmin = userHasRole(user, 'admin')
	const formRef = useRef<HTMLFormElement>(null)
	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button asChild variant="secondary">
					<Link
						to="/settings/profile"
						// this is for progressive enhancement
						onClick={(e) => e.preventDefault()}
						className="flex items-center gap-2"
						aria-label="User menu"
					>
						<Img
							className="size-8 rounded-full object-cover"
							alt={user.name ?? user.username}
							src={getUserImgSrc(user.image?.objectKey)}
							width={256}
							height={256}
							aria-hidden="true"
						/>
						<span className="text-body-sm font-bold">
							{user.name ?? user.username}
						</span>
					</Link>
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuPortal>
				<DropdownMenuContent sideOffset={8} align="end">
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
