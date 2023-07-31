import * as fs from "fs";

import axios from "axios";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import { pipe } from "fp-ts/lib/function";

import { Executor } from "./types";
import { chalk } from "../chalk";
import { DataFile, readDataFile } from "./utils/dataFile";

export const clean: Executor<"clean"> = () => (ctx) =>
    pipe(
        Console.info(chalk.bgYellow.black("Cleaning everything up")),
        TaskEither.fromIO,
        TaskEither.chain(() => readDataFile(ctx.dataFilePath)),
        TaskEither.filterOrElse(
            (data): data is DataFile => !!data,
            () => new Error("ALREADY"),
        ),
        TaskEither.chainFirst((data) =>
            pipe(
                TaskEither.tryCatch(
                    () =>
                        axios.get(
                            `http://127.0.0.1:${data.port}/ping`,
                            {
                                headers: {
                                    Authorization: data.token,
                                },
                            },
                        ),
                    () => new Error("INACTIVE"),
                ),
            ),
        ),
        TaskEither.orElseFirst(
            e => 
                e.message === "INACTIVE" 
                ? TaskEither.tryCatch(
                    () =>
                        new Promise<void>((resolve, reject) => {
                            fs.unlink(ctx.dataFilePath, (err) => {
                                if (!err) resolve();
                                else reject(err);
                            });
                        }),
                    (err) =>
                        new Error(
                            `Failed to delete data file at "${ctx.dataFilePath}"\n` +
                                err,
                        ),
                )
                : TaskEither.left(e)
        ),
        TaskEither.fold(
            (e) => 
                e.message === "ALREADY" 
                ? TaskEither.fromIO(Console.log(chalk.yellow("Everything is already clean")))
                : e.message === "INACTIVE" 
                ? TaskEither.fromIO(Console.log(chalk.yellow("Mother-ship is not active, data file deleted")))
                : TaskEither.left(e),
            () => TaskEither.fromIO(Console.error(chalk.red("Cannot delete data file because mother ship is launched")))
        )
    );
