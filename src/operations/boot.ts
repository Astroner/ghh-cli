import { ChildProcess, fork } from "child_process";
import * as path from "path";
import * as fs from "fs";

import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import { flow, pipe } from "fp-ts/lib/function";

import { Executor } from "./types";
import { chalk } from "../chalk";

export const boot: Executor<"boot"> = () => (ctx) => pipe(
    Console.log(chalk.bgGreen.black("Starting the mother-ship")),
    TaskEither.fromIO,
    TaskEither.chain(() => TaskEither.tryCatch(
        () => new Promise<ChildProcess>((resolve, reject) => {

            const process = fork(path.resolve(__dirname, "../mother-ship/"), {
                detached: true,
                stdio: [
                    0,
                    fs.openSync(path.resolve(__dirname, "../../logs.txt"), "w"),
                    fs.openSync(path.resolve(__dirname, "../../error.txt"), "w"),
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
    TaskEither.chainFirst((process) => TaskEither.fromIO(Console.log(`Process PID: ${process.pid}`))),
    TaskEither.chainFirst((process) => TaskEither.tryCatch(
        () => Promise.race([
            new Promise((resolve) => {
                process.once("message", (data) => {
                    console.log(data)
                    resolve(data);
                })
            }),
            new Promise((_, reject) => setTimeout(() => reject(), 10000))
        ]),
        () => new Error("Failed to get process port")
    )),
    TaskEither.map(process => (process.kill("SIGINT"), undefined))
)