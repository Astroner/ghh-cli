import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import * as t from "io-ts";

import { Executor, WingInfoC } from "./types";
import { pipe } from "fp-ts/lib/function";
import { request } from "../utils/request";
import { DataFile, readDataFile } from "../utils/dataFile";
import { chalk } from "../chalk";

export const ls: Executor<"ls"> = () => ctx => pipe(
    TaskEither.fromIO(Console.log(chalk.bgGreen.black("Requesting data from the mother-ship"))),
    TaskEither.chain(() => readDataFile(ctx.dataFilePath)),
    TaskEither.filterOrElse(
        (data): data is DataFile => !!data,
        () => new Error("Mother-ship is not launched"),
    ),
    TaskEither.chain(request("get", "/list", t.array(WingInfoC))),
    TaskEither.chain(data => TaskEither.fromIO(() => console.table(data, ["name", "status", "port", "pid"])))
)
