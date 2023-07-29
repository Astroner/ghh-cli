#!/usr/bin/env node

import { flow, pipe } from "fp-ts/lib/function";
import * as Either from "fp-ts/lib/Either";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Console from "fp-ts/lib/Console";
import { parseArgs } from "./parse-args";
import { runOperation } from "./operations";
import { chalk } from "./chalk";


export const command = flow(
    parseArgs,
    TaskEither.fromEither,
    TaskEither.chain(runOperation),
    TaskEither.fold(
        e => Task.fromIO(Console.log(chalk.red(`Failure: ${e.message}`))),
        e => Task.fromIO(Console.log(chalk.green(`Done`))),
    ),
    task => task()
)

if(require.main === module)
    command(process.argv.slice(2));