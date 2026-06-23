// Owned preview — mirrors the `pagination` specimen: the pager at page 1 (prev
// disabled, a trailing ellipsis), in the middle (an ellipsis collapsing the run
// on either side of current ±1), and at the last page (next disabled). `href`s
// are inert anchors here; in the app the consumer maps each page to a real URL.
import { Pagination } from 'epic-stack-template'

export const FirstPage = () => (
	<Pagination page={1} pageCount={8} getPageHref={(p) => `#page-${p}`} />
)

export const Middle = () => (
	<Pagination page={5} pageCount={10} getPageHref={(p) => `#page-${p}`} />
)

export const LastPage = () => (
	<Pagination page={8} pageCount={8} getPageHref={(p) => `#page-${p}`} />
)
