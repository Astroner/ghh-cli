import * as fs from "fs";

import axios from "axios";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import { pipe } from "fp-ts/lib/function";

import { Executor } from "./types";
import { chalk } from "../chalk";
import { DataFile, readDataFile } from "./utils/dataFile";

export const clean: Executor<"clean"> = () => ctx => pipe(
    Console.info(chalk.bgYellow.black("Cleaning everything up")),
    TaskEither.fromIO,
    TaskEither.chain(() => readDataFile(ctx.dataFilePath)),
    TaskEither.filterOrElse(
        (data): data is DataFile => !!data,
        () => new Error("ALREADY")
    ),
    TaskEither.chain((data) => pipe(
        TaskEither.tryCatch(
            () => axios.post(`http://127.0.0.1:${data.port}/land`, {}, {
                headers: {
                    Authorization: data.token
                }
            }),
            () => new Error("CANNOT_CALL")
        ),
    )),
    TaskEither.map(() => chalk.green("Done")),
    TaskEither.orElse(
        err => 
            err.message === "ALREADY"
            ? TaskEither.of(chalk.green("Done"))
            : err.message === "CANNOT_CALL"
            ? TaskEither.of(chalk.red("Could not call the mother-ship, so it is probably already landed\n") + chalk.yellow("Everything's cleaned up"))
            : TaskEither.left(err),
    ),
    TaskEither.chainFirst(() => TaskEither.tryCatch(
        () => new Promise<void>((resolve, reject) => {
            fs.unlink(ctx.dataFilePath, err => {
                if(!err || err.code === "ENOENT") resolve();
                else reject(err)
            })
        }),
        (err) => new Error(`Failed to delete data file at "${ctx.dataFilePath}"\n` + err),
    )),
    TaskEither.chain(message => TaskEither.fromIO(Console.log(message)))
)