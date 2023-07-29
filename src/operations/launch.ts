import { ChildProcess, fork } from "child_process";
import * as path from "path";
import * as fs from "fs";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import * as Either from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";
import * as t from "io-ts";

import { Executor } from "./types";
import { chalk } from "../chalk";
import { readDataFile, writeDataFile } from "./utils/dataFile";

export const launch: Executor<"launch"> = () => (ctx) => pipe(
    Console.log(chalk.bgGreen.black("Initiating the launch sequence")),
    TaskEither.fromIO,
    TaskEither.chain(() => TaskEither.Do),
    TaskEither.bind("appData", () => readDataFile(ctx.dataFilePath)),
    TaskEither.filterOrElse(
        ({ appData }) => !appData,
        () => new Error("Mother-ship is already launched"),
    ),
    TaskEither.bind("process", () => TaskEither.tryCatch(
        () => new Promise<ChildProcess>((resolve, reject) => {

            const process = fork(path.resolve(__dirname, "../mother-ship/"), {
                detached: true,
                stdio: [
                    0,
                    fs.openSync(path.resolve(ctx.appDirectory, "mother-ship-logs.txt"), "w+"),
                    fs.openSync(path.resolve(ctx.appDirectory, "mother-ship-errors.txt"), "w+"),
                    'ipc'
                ]
            });

            process.unref();

            process.once("spawn", () => {
                process.removeAllListeners();
                resolve(process);
            })
            process.once("error", (err) => {
                reject(err)
            })
        }),
        (err: any) => new Error("Failed to start the mother-ship: " + err.message)
    )),
    TaskEither.bind("pid", flow(
        ({ process }) => process.pid,
        TaskEither.fromNullable(new Error("Failed to get mother-ship PID")),
    )),
    TaskEither.bind("port", flow(
        ({ process }) => TaskEither.tryCatch(
            () => new Promise<unknown>((resolve, reject) => {
                process.once("message", (data) => {
                    process.removeAllListeners();
                    process.channel?.unref();
                    resolve(data);
                })
                process.once("error", () => reject())
            }),
            () => new Error("Failed to get mother-ship port")
        ),
        TaskEither.chain(flow(
            t.number.decode,
            Either.mapLeft(() => new Error("Failed to decode signal from mother-ship")),
            TaskEither.fromEither
        ))
    )),
    TaskEither.chainFirst(({ pid, port }) => TaskEither.fromIO(pipe(
        Console.log(chalk.green(`Mother-ship launched\n  Port: ${port}\n  PID: ${pid}`)),
    ))),
    TaskEither.chain(flow(
        ({ port, pid }) => ({ port, pid }),
        writeDataFile(ctx.dataFilePath)
    ))
)