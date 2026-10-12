import type { Connect, Plugin } from "vite";

type ServerModule = {
    app: Connect.NextHandleFunction;
    start: () => () => void;
};

/**
 * mounts the express app exported by the module at `path` into the vite dev
 * server. vite loads a new copy of the module after it is edited; each time
 * that happens, the old copy's timers are stopped and the new copy's started,
 * so only one database scan runs at a time.
 */
export default function express(path: string): Plugin {
    return {
        name: "vite3-plugin-express",
        configureServer: (server) => {
            let loaded: ServerModule | undefined;
            let stop: (() => void) | undefined;
            const load = async () => {
                const mod = (await server.ssrLoadModule(path)) as ServerModule;
                if (mod !== loaded) {
                    stop?.();
                    loaded = mod;
                    stop = mod.start();
                }
                return mod;
            };
            // start scanning when the dev server starts, not on the first request
            server.httpServer?.once("listening", () => {
                load().catch((err) => console.error(err));
            });
            server.middlewares.use(async (req, res, next) => {
                try {
                    const { app } = await load();
                    app(req, res, next);
                } catch (err) {
                    console.error(err);
                    next(err);
                }
            });
        },
    };
}
