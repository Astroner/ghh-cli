#!/usr/bin/env node

import { flow, pipe } from "fp-ts/lib/function";
import * as Either from "fp-ts/lib/Either";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Console from "fp-ts/lib/Console";
import { parseArgs } from "./parse-args";
import { runOperation } from "./operations";


export const bootstrap = flow(
    parseArgs,
    TaskEither.fromEither,
    TaskEither.chain(runOperation),
    TaskEither.fold(
        e => Task.fromIO(Console.log(`Failure: ${e.message}`)),
        e => Task.fromIO(Console.log(`Success`)),
    ),
    task => task()
)

if(require.main === module)
    bootstrap(process.argv.slice(2));