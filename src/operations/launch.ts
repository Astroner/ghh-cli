import { fork } from "child_process";
import * as path from "path";
import * as fs from "fs";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import * as IOEither from "fp-ts/lib/IOEither";
import * as Either from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { Executor } from "./types";
import { chalk } from "../chalk";
import { readDataFile, writeDataFile } from "./utils/dataFile";

export const launch: Executor<"launch"> = () => (ctx) =>
    pipe(
        Console.log(chalk.bgGreen.black("Initiating the launch sequence")),
        TaskEither.fromIO,
        TaskEither.chain(() => TaskEither.Do),
        TaskEither.bind("appData", () => readDataFile(ctx.dataFilePath)),
        TaskEither.filterOrElse(
            ({ appData }) => !appData,
            () => new Error("Mother-ship is already launched"),
        ),
        TaskEither.bind(
            "subprocess",
            flow(
                () =>
                    IOEither.tryCatch(
                        () => {
                            const subprocess = fork(
                                path.resolve(__dirname, "../mother-ship/"),
                                {
                                    detached: true,
                                    stdio: [
                                        0,
                                        fs.openSync(
                                            path.resolve(
                                                ctx.appDirectory,
                                                "mother-ship-logs.txt",
                                            ),
                                            "w+",
                                        ),
                                        fs.openSync(
                                            path.resolve(
                                                ctx.appDirectory,
                                                "mother-ship-errors.txt",
                                            ),
                                            "w+",
                                        ),
                                        "ipc",
                                    ],
                                },
                            );

                            subprocess.unref();

                            return subprocess;
                        },
                        (err: any) =>
                            new Error(
                                "Failed to start the mother-ship: " +
                                    err.message,
                            ),
                    ),
                TaskEither.fromIOEither,
            ),
        ),
        TaskEither.bind(
            "config",
            flow(
                ({ subprocess }) =>
                    TaskEither.tryCatch(
                        () =>
                            new Promise<unknown>((resolve, reject) => {
                                subprocess.once("message", (data) => {
                                    subprocess.removeAllListeners();
                                    subprocess.disconnect();
                                    resolve(data);
                                });
                                subprocess.once("error", () => reject());
                            }),
                        () => new Error("Failed to get mother-ship port"),
                    ),
                TaskEither.chain(
                    flow(
                        t.type({
                            port: t.number,
                            pid: t.number,
                            token: t.string,
                        }).decode,
                        Either.mapLeft(
                            () =>
                                new Error(
                                    "Failed to decode signal from mother-ship",
                                ),
                        ),
                        TaskEither.fromEither,
                    ),
                ),
            ),
        ),
        TaskEither.chainFirst(({ config }) =>
            TaskEither.fromIO(
                pipe(
                    Console.log(
                        chalk.green(
                            `Mother-ship launched\n  Port: ${config.port}\n  PID: ${config.pid}`,
                        ),
                    ),
                ),
            ),
        ),
        TaskEither.chain(
            flow(({ config }) => config, writeDataFile(ctx.dataFilePath)),
        ),
    );
