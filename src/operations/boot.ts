import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";

import { Executor } from "./types";
import { chalk } from "../chalk";

export const boot: Executor<"boot"> = () => TaskEither.fromIO(Console.log(chalk.green("Ya skazala startuem")))