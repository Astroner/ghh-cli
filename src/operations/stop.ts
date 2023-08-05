import { flow, pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import * as t from "io-ts";

import { Executor } from "./types";
import { DataFile, readDataFile } from "../utils/dataFile";
import { logStreamFromMotherShip } from "../utils/logStreamFromMotherShip";
import { chalk } from "../chalk";

export const stop: Executor<"stop"> = ({ name }) => (ctx) => pipe(
    readDataFile(ctx.dataFilePath),
    TaskEither.filterOrElse(
        (data): data is DataFile => !!data,
        () => new Error("Mother ship is not launched"),
    ),
    TaskEither.chain(logStreamFromMotherShip("post", `/wing/stop/${name}`)),
    TaskEither.chain(() => TaskEither.fromIO(Console.log(chalk.green("Done"))))
)
