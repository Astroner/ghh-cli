#!/usr/bin/env node

import * as path from "path";
import * as fs from "fs";

import { flow, pipe } from "fp-ts/lib/function";
import * as Either from "fp-ts/lib/Either";
import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Console from "fp-ts/lib/Console";
import { parseArgs } from "./parse-args";
import { runOperation } from "./operations";
import { chalk } from "./chalk";
import { ExecutionContext } from "./operations/types";


export const command = flow(
    parseArgs,
    ReaderTaskEither.fromEither,
    ReaderTaskEither.chain(runOperation),
)

if(require.main === module)
    pipe(
        {
            appDirectory: path.resolve(process.env.HOME ?? "~", "ghh"),
            dataFilePath: path.resolve(process.env.HOME ?? "~", "./ghh/", "data.json"),
        },
        pipe(
            ReaderTaskEither.ask<ExecutionContext>(),
            ReaderTaskEither.chainFirstW((ctx) => pipe(
                TaskEither.tryCatch(
                    () => new Promise<void>((resolve, reject) => {
                        fs.mkdir(ctx.appDirectory, (err) => {
                            if(!err || err.code === "EEXIST") resolve()
                            else reject()
                        })
                    }),
                    () => new Error(`Failed to create data directory at ${ctx.appDirectory}`)
                ),
                ReaderTaskEither.fromTaskEither,
            )),
            ReaderTaskEither.chain(() => command(process.argv.slice(2))),
        ),
        TaskEither.fold(
            e => Task.fromIO(Console.error(chalk.red(e.message))),
            () => Task.of(null)
        ),
        f => {
            fs.mkdirSync(path.resolve(process.env.HOME ?? "~", "ghh"));
            f();
        }
    )