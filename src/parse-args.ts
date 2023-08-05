import * as parse from "minimist";

import { constant, flow, pipe } from "fp-ts/lib/function";
import * as Either from "fp-ts/lib/Either";
import * as Array from "fp-ts/lib/Array";
import * as Option from "fp-ts/lib/Option";

import * as t from "io-ts";
import * as d from "io-ts/Decoder";

import { OperationName, Operation } from "./model";

const optionalString = t.union([t.string, t.undefined]);

const StringToNumber: d.Decoder<string, number> = {
    decode: str => pipe(
        Either.of(+str),
        Either.filterOrElse(
            n => !Number.isNaN(n),
            () => new Error("Not a number")
        ),
        Either.fold(
            e => d.failure(str, e.message),
            n => d.success(n)
        )
    )
}

const decoders: Record<
    OperationName,
    (parsed: parse.ParsedArgs) => Either.Either<Error, Operation>
> = {
    launch: () =>
        Either.of({
            name: "launch",
            config: null,
        }),
    land: () =>
        Either.of({
            name: "land",
            config: null,
        }),
    start: (parsed) =>
        pipe(
            Either.Do,
            Either.bind(
                "name",
                flow(
                    () => parsed["n"],
                    optionalString.asDecoder().decode,
                    Either.map(s => s?.trim()),
                    Either.mapLeft(
                        () => new Error("Name(-n) should be a string"),
                    ),
                ),
            ),
            Either.bind(
                "configPath",
                flow(
                    () => parsed._,
                    Array.lookup(1),
                    Either.fromOption(
                        () => new Error("Config path is not provided"),
                    ),
                ),
            ),
            Either.bind(
                "port",
                flow(
                    () => parsed["p"],
                    StringToNumber.decode,
                    Either.mapLeft(
                        () => new Error("Port(-p) should be "),
                    ),
                ),
            ),
            Either.map((config) => ({
                name: "start",
                config,
            })),
        ),
    stop: flow(
        (parsed) => parsed._,
        Array.lookup(1),
        Either.fromOption(() => new Error("Wing name is not provided")),
        Either.map((appName) => ({
            name: "stop",
            config: {
                name: appName,
            },
        })),
    ),
    ls: () =>
        Either.of({
            name: "ls",
            config: null,
        }),
    help: flow(
        (parsed) => parsed._,
        Array.lookup(1),
        Option.toUndefined,
        Either.of,
        Either.map((operation) => ({
            name: "help",
            config: {
                operation,
            },
        })),
    ),
    status: () =>
        Either.of({
            name: "status",
            config: null,
        }),
    clean: () =>
        Either.of({
            name: "clean",
            config: null,
        }),
    remove: flow(
        (parsed) => parsed._,
        Array.lookup(1),
        Either.fromOption(() => new Error("Wing name is not provided")),
        Either.map((name) => ({
            name: "remove",
            config: {
                name: name,
            },
        })),
    )
};

const getOperation = flow(
    (args: parse.ParsedArgs) => Array.head(args._),
    Either.fromOption(constant(new Error("Operation is not provided"))),
    Either.filterOrElse(
        (item) => item.length > 0,
        constant(new Error("Operation is not provided")),
    ),
    Either.filterOrElse(
        (item): item is OperationName => item in decoders,
        (item) => new Error(`"${item}" is not a valid operation`),
    ),
);

export const parseArgs = (argv: string[]): Either.Either<Error, Operation> =>
    pipe(
        Either.Do,
        Either.let("parsed", () => parse(argv)),
        Either.bind("operationName", ({ parsed }) => getOperation(parsed)),
        Either.chain(({ parsed, operationName }) =>
            decoders[operationName](parsed),
        ),
    );
