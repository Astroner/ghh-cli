import { resolve } from "path";

import { pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Console from "fp-ts/lib/Console";

import { command } from "../src/";

pipe(
    {
        appDirectory: __dirname,
        dataFilePath: resolve(__dirname, "./data.json")
    },
    command(["status"]),
    TaskEither.fold(
        e => Task.fromIO(Console.error(e)),
        () => Task.fromIO(Console.log("Done")),
    ),
    run => run()
);