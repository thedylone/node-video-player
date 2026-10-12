/** describes an error for the log, with its stack trace if it has one. */
const describe = (error: unknown) =>
    error instanceof Error ? (error.stack ?? error.message) : String(error);

/**
 * writes a timestamped line. on a terminal, the uptime ticker's line is
 * cleared first so the message gets a line of its own; the ticker redraws
 * itself within a second.
 */
const write = (stream: NodeJS.WriteStream, level: string, message: string) => {
    if (process.stdout.isTTY) {
        process.stdout.clearLine(0);
        process.stdout.cursorTo(0);
    }
    stream.write(`${new Date().toISOString()} ${level} ${message}\n`);
};

export const log = {
    /** logs to stdout. */
    info: (message: string) => write(process.stdout, "info", message),
    /** logs to stderr, followed by the error (and its stack) if given. */
    error: (message: string, error?: unknown) =>
        write(
            process.stderr,
            "error",
            error === undefined ? message : message + ": " + describe(error)
        ),
};
