import { createContext, type ServerBuild } from 'react-router'

/**
 * Middleware context holding the server build, seeded from the Express
 * adapter's `getLoadContext`. With `future.v8_middleware` enabled the load
 * context is a `RouterContextProvider`, so loaders read the build via
 * `context.get(serverBuildContext)` instead of `context.serverBuild`.
 */
export const serverBuildContext = createContext<ServerBuild>()
