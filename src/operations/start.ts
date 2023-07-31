import * as path from "path";
import * as fs from "fs";
import axios from "axios";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Either from "fp-ts/lib/Either";
import * as Console from "fp-ts/lib/Console";
import * as Json from "fp-ts/lib/Json";
import { flow, pipe } from "fp-ts/lib/function";

import { Executor } from "./types";
import { readDataFile } from "./utils/dataFile";
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
            const { data: stream } = await axios.post<fs.ReadStream>(`http://127.0.0.1:${data.port}/wing/start`, {
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
    TaskEither.chain(stream => TaskEither.tryCatch(
        () => new Promise<void>((resolve, reject) => {
            console.log(chalk.yellow("Connection established:"));
            stream.on('data', (message: string) => {
                const json = JSON.parse(message);

                switch(json.type) {
                    case 'info':
                        console.log(chalk.green(`> ${json.message}`))
                        break;

                    case 'error':
                        console.log(chalk.red(`> ${json.message}`))
                        break;
                    
                    default:
                        console.log(chalk.red('> Unknown message'))
                }
            })
            stream.once('end', () => (console.log(chalk.yellow('Connection closed')), resolve()))
            stream.once('error', (err) => reject(err))
        }),
        (err) => new Error(`Connection error: ${err}`)
    )),
    TaskEither.chain(() => TaskEither.fromIO(Console.log(chalk.green("Done"))))
)
