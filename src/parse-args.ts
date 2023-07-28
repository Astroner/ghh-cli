import * as parse from "minimist"

import { constant, flow, pipe } from "fp-ts/lib/function";
import * as Either from "fp-ts/lib/Either";
import * as Array from "fp-ts/lib/Array";

import * as t from 'io-ts';

import { OperationName, Operation } from "./model";

const optionalString = t.union([t.string, t.undefined]);

const decoders: Record<OperationName, (parsed: parse.ParsedArgs) => Either.Either<Error, Operation>> = {
    boot: () => Either.of({
        name: "boot",
        config: null
    }),
    down: () => Either.of({
        name: "down",
        config: null
    }),
    start: (parsed) => pipe(
        Either.Do,
        Either.bind("name", flow(
            () => parsed["n"],
            optionalString.asDecoder().decode,
            Either.mapLeft(() => new Error("Name(-n) should be a string")),
        )),
        Either.bind("configPath", flow(
            () => parsed._,
            Array.lookup(1),
            Either.fromOption(() => new Error("Config path is not provided"))
        )),
        Either.map(config => ({
            name: "start",
            config,
        }))
    ),
    stop: (parsed) => pipe(
        Either.Do,
        Either.bind("name", flow(
            () => parsed._,
            Array.lookup(1),
            Either.fromOption(() => new Error("Application name is not provided"))
        )),
        Either.map(config => ({
            name: "stop",
            config,
        }))
    ),
    ls: () => Either.of({
        name: "ls",
        config: null
    })
}

const getOperation = flow(
    (args: parse.ParsedArgs) => Array.head(args._),
    Either.fromOption(constant(new Error("Operation is not provided"))),
    Either.filterOrElse(
        (item): item is OperationName => item in decoders,
        item => new Error(`"${item}" is not a valid operation`)
    )
)

export const parseArgs = (argv: string[]): Either.Either<Error, Operation> => pipe(
    Either.Do,
    Either.let("parsed", () => parse(argv)),
    Either.bind("operationName", ({ parsed }) => getOperation(parsed)),
    Either.chain(({ parsed, operationName }) => decoders[operationName](parsed))
)