// Owned preview — mirrors the `card` specimen: a card surface composing
// CardHeader (CardTitle + CardDescription), CardContent, and a CardFooter with
// actions. Tokens only, so it follows the brand accent and light/dark theme.
import {
	Button,
	Card,
	CardContent,
	CardDescription,
	CardFooter,
	CardHeader,
	CardTitle,
} from 'epic-stack-template'

export const Default = () => (
	<Card className="max-w-sm">
		<CardHeader>
			<CardTitle>Upgrade your plan</CardTitle>
			<CardDescription>
				Unlock unlimited projects and priority support.
			</CardDescription>
		</CardHeader>
		<CardContent className="text-body-sm text-muted-foreground">
			You're currently on the free plan. Upgrade any time — changes apply
			immediately and you can cancel whenever you like.
		</CardContent>
		<CardFooter className="justify-end gap-3">
			<Button variant="ghost">Maybe later</Button>
			<Button>Upgrade</Button>
		</CardFooter>
	</Card>
)
