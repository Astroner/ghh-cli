#!/usr/bin/env node

import * as path from "path";

import { flow, pipe } from "fp-ts/lib/function";
import * as Either from "fp-ts/lib/Either";
import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Console from "fp-ts/lib/Console";
import { parseArgs } from "./parse-args";
import { runOperation } from "./operations";
import { chalk } from "./chalk";


export const command = flow(
    parseArgs,
    ReaderTaskEither.fromEither,
    ReaderTaskEither.chain(runOperation),
)

if(require.main === module)
    pipe(
        {
            appDirectory: path.resolve(process.env.HOME ?? "~", "ghh"),
            dataFilePath: path.resolve(process.env.HOME ?? "~", "/ghh/", "data.json"),
        },
        command(process.argv.slice(2)),
        TaskEither.fold(
            e => Task.fromIO(Console.error(chalk.red(e.message))),
            () => Task.fromIO(Console.log(chalk.green("Done")))
        )
    )