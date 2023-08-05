import { pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";

import { Executor } from "./types";
import { DataFile, readDataFile } from "../utils/dataFile";
import { logStreamFromMotherShip } from "../utils/logStreamFromMotherShip";
import { chalk } from "../chalk";

export const restart: Executor<"restart"> = (arg) => (ctx) => pipe(
    readDataFile(ctx.dataFilePath),
    TaskEither.filterOrElse(
        (data): data is DataFile => !!data,
        () => new Error("Mother ship is not launched"),
    ),
    TaskEither.chain(logStreamFromMotherShip("put", `/wing/restart/`, arg)),
    TaskEither.chain(() => TaskEither.fromIO(Console.log(chalk.green("Done"))))
)
