import axios from "axios";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import { constUndefined, constant, pipe } from "fp-ts/lib/function";

import { Executor } from "./types";
import { chalk } from "../chalk";
import { DataFile, readDataFile } from "../utils/dataFile";

export const status: Executor<"status"> = () => (ctx) =>
    pipe(
        Console.info(chalk.blue("Retrieving mother-ship status...")),
        TaskEither.fromIO,
        TaskEither.chain(() => readDataFile(ctx.dataFilePath)),
        TaskEither.filterOrElse(
            (data): data is DataFile => !!data,
            () => new Error("OFFLINE"),
        ),
        TaskEither.chain((data) =>
            pipe(
                TaskEither.tryCatch(
                    () =>
                        axios.get(`http://127.0.0.1:${data.port}/ping`, {
                            headers: {
                                Authorization: data.token,
                            },
                        }),
                    () => new Error("ONLINE_ERROR"),
                ),
                TaskEither.map(
                    constant(
                        chalk.green(
                            `Mother-ship is ONLINE\n  Port: ${data.port}\n  PID: ${data.pid}`,
                        ),
                    ),
                ),
                TaskEither.orElse(
                    constant(
                        TaskEither.of<Error, string>(
                            chalk.red(
                                `Mother-ship is missing! It should be at port ${data.port} with PID ${data.pid}.\n`,
                            ) +
                                `It probably went out of control, so try to find and kill the process then run ${chalk.yellow(
                                    "ghh clean",
                                )} to clear an old data.\n` +
                                "After it you can safely launch the mother-ship again.",
                        ),
                    ),
                ),
            ),
        ),
        TaskEither.fold(
            (err) =>
                err.message === "OFFLINE"
                    ? TaskEither.fromIO(
                          Console.info(
                              chalk.green("Mother-ship is ") +
                                  chalk.yellow("OFFLINE"),
                          ),
                      )
                    : TaskEither.left<Error, void>(err),
            (message) => TaskEither.fromIO(Console.info(message)),
        ),
        TaskEither.map(constUndefined),
    );
