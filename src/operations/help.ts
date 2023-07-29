import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";

import { Executor } from "./types";
import { chalk } from "../chalk";


export const help: Executor<"help"> = ({ operation }) => TaskEither.fromIO(Console.log(chalk.green("Here's a hand")))