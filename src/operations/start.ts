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
    TaskEither.chainFirst(() => TaskEither.fromIO(Console.log(chalk.bgGreen.black("Connecting to the mother-ship")))),
    TaskEither.bind("data", flow(
        () => readDataFile(ctx.dataFilePath),
        TaskEither.chain(TaskEither.fromNullable(new Error("Mother-ship is not launched")))
    )),
    TaskEither.chain(({ data, configPath }) => TaskEither.tryCatch(
        async () => {
            const { data: stream } = await axios.post<Readable>(`http://127.0.0.1:${data.port}/wing/start`, {
                name: args.name,
                port: args.port,
                cwd: process.cwd(),
                config: configPath
            }, {
                headers: {
                    Authorization: data.token
                },
                responseType: "stream"
            })

            return stream;
        },
        (err) => new Error("Cannot connect to the mother-ship:\n" + err)
    )),
    TaskEither.chainFirst(() => TaskEither.fromIO(Console.log(chalk.yellow("Connection established:")))),
    TaskEither.chain<Error, Readable, void>(flow(
        StreamEither.fromReadable,
        StreamEither.map(data => data + ""),
        StreamEither.chainEither(flow(
            Json.parse,
            Either.mapLeft(() => new Error("Failed to parse message from the mother-ship")),
            Either.chain(flow(
                t.type({
                    type: t.union([t.literal("info"), t.literal("error")]),
                    message: t.string,
                }).decode,
                Either.mapLeft(() => new Error("Failed to validate message from the mother-ship"))
            )),
        )),
        StreamEither.tap(data => {
            switch(data.type) {
                case 'info':
                    console.log(chalk.green(`> ${data.message}`))
                    break;

                case 'error':
                    console.log(chalk.red(`> ${data.message}`))
                    break;
            }
        }),
        StreamEither.tapEnd(() => console.log(chalk.yellow('Connection closed'))),
        StreamEither.toTaskEither
    )),
    TaskEither.chain(() => TaskEither.fromIO(Console.log(chalk.green("Done"))))
)
