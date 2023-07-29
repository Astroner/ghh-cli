import { resolve } from "path";

import { pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Task from "fp-ts/lib/Task";
import * as Console from "fp-ts/lib/Console";

import { command } from "../src/";

pipe(
    {
        appDirectory: resolve(__dirname, "data"),
        dataFilePath: resolve(__dirname, "data", "data.json")
    },
    command(["clean"]),
    TaskEither.fold(
        e => Task.fromIO(Console.error(e)),
        () => Task.fromIO(Console.log("Done")),
    ),
    run => run()
);