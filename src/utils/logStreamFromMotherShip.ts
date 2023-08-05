
import { constant, flow, pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import * as t from "io-ts";

import { streamFromMotherShip } from "./streamFromMotherShip";
import { chalk } from "../chalk";
import * as StreamEither from "../utils/StreamEither";
import { DataFile } from "./dataFile";

export const motherShipMessageC = t.type({
    type: t.union([t.literal("info"), t.literal("error")]),
    message: t.string,
});

export const logStreamFromMotherShip = (method: string, path: string, data?: unknown) => (dataFile: DataFile) => pipe(
    TaskEither.fromIO(Console.log(chalk.bgGreen.black("Connecting to the mother-ship"))),
    TaskEither.map(constant(dataFile)),
    TaskEither.chain(streamFromMotherShip(method, path, motherShipMessageC, data)),
    TaskEither.chainFirst(() => TaskEither.fromIO(Console.log(chalk.yellow("Connection established:")))),
    TaskEither.chain(flow(
        StreamEither.tap(data => {
            switch(data.type) {
                case 'info':
                    console.log(chalk.green(`> ${data.message}`))
                    break;
    
                case 'error':
                    console.log(chalk.red(`> ${data.message}`))
                    break;
            }
        }),
        StreamEither.tapEnd(() => console.log(chalk.yellow('Connection closed'))),
        StreamEither.toTaskEither
    ))
)