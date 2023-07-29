import * as ReaderTaskEither from "fp-ts/lib/ReaderTaskEither";
import * as Console from "fp-ts/lib/Console";

import { Executor } from "./types";
import { chalk } from "../chalk";


export const help: Executor<"help"> = ({ operation }) => ReaderTaskEither.fromIO(Console.log(chalk.green("Here's a hand")))