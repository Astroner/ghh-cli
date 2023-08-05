import * as path from "path";
import * as fs from "fs";
import axios from "axios";
import { Readable } from "stream";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Either from "fp-ts/lib/Either";
import * as Console from "fp-ts/lib/Console";
import * as Json from "fp-ts/lib/Json";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { Executor } from "./types";
import { readDataFile } from "../utils/dataFile";
import * as StreamEither from "../utils/StreamEither";
import { chalk } from "../chalk";
import { logStreamFromMotherShip } from "../utils/logStreamFromMotherShip";

export const start: Executor<"start"> = (args) => ctx => pipe(
    TaskEither.Do,
    TaskEither.bind("configPath", flow(
        () => path.isAbsolute(args.configPath) ? args.configPath : path.resolve(process.cwd(), args.configPath),
        TaskEither.of,
        TaskEither.chainFirst(path => TaskEither.tryCatch(
            () => new Promise<void>((resolve, reject) => {
                fs.access(path, (err) => {
                    if(err) reject(err);
                    else resolve()
                })
            }),
            (err) => new Error(`Cannot access config path at "${path}"\n${err}`)
        )),
    )),
    TaskEither.bind("data", flow(
        () => readDataFile(ctx.dataFilePath),
        TaskEither.chain(TaskEither.fromNullable(new Error("Mother-ship is not launched")))
    )),
    TaskEither.chain(({ data, configPath }) => pipe(
        data,
        logStreamFromMotherShip("post", "/wing/start", {
            name: args.name,
            port: args.port,
            cwd: process.cwd(),
            config: configPath
        })
    )),
    TaskEither.chain(() => TaskEither.fromIO(Console.log(chalk.green("Done"))))
)
