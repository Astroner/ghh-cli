import * as fs from "fs";

import axios from "axios";

import { constUndefined, flow, pipe } from "fp-ts/lib/function";
import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";

import { Executor } from "./types";
import { readDataFile } from "./utils/dataFile";
import { chalk } from "../chalk";

export const land: Executor<"land"> = () => ctx => pipe(
    Console.log(chalk.bgYellow.black("Landing the mother-ship")),
    TaskEither.fromIO,
    TaskEither.chain(() => readDataFile(ctx.dataFilePath)),
    TaskEither.chain(TaskEither.fromNullable(new Error("Mother-ship is not launched"))),
    TaskEither.chain(data => TaskEither.tryCatch(
        () => axios.post(`http://127.0.0.1:${data.port}/land`, null, {
            headers: {
                Authorization: data.token
            }
        }),
        (err) => new Error("Failed to call the mother-ship: " + err)
    )),
    TaskEither.chain(() => TaskEither.tryCatch(
        () => new Promise<void>((resolve, reject) => {
            fs.unlink(ctx.dataFilePath, err => {
                if(err) reject(err);
                else resolve()
            })
        }),
        (err) => new Error(`Failed to delete data file at "${ctx.dataFilePath}"\n${err}`),
    )),
    TaskEither.chain(() => TaskEither.fromIO(Console.log(chalk.green("Done"))))
)