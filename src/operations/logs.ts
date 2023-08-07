import * as fs from "fs";
import * as readline from "readline";

import * as chokidar from "chokidar";

import { flow, pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Console from "fp-ts/lib/Console";
import * as Option from "fp-ts/lib/Option";
import * as IO from "fp-ts/lib/IO";
import * as array from "fp-ts/lib/Array";


import { Executor, WingInfoC } from "./types";
import { DataFile, readDataFile } from "../utils/dataFile";
import { request } from "../utils/request";
import * as StreamEither from "../utils/StreamEither";

const lines = (path: string) => TaskEither.tryCatch(
    () => new Promise<number>((resolve, reject) => {
        const input = fs.createReadStream(path);
        const reader = readline.createInterface({
            input,
        })

        let lines = 0;            
        reader.on('line', () => lines++);
        reader.once('close', () => resolve(lines));
        input.once('error', reject)
    }),
    (err) => new Error(`Failed to count lines of "${path}":\n${err}`)
)

const readLines = (path: string) => {
    const stream = StreamEither.right<Error, { index: number, text: string }>();

    const input = fs.createReadStream(path);
    const reader = readline.createInterface({
        input,
    })

    let index = 0;
    reader.on('line', text => StreamEither.next(stream, { index: index++, text }));
    reader.once('close', () => StreamEither.end(stream));
    input.once('error', (err) => StreamEither.fail(stream, err))

    return stream;
}

const tail = (path: string, linesCount: number) => pipe(
    StreamEither.fromTaskEither(lines(path)),
    StreamEither.chain(totalLines => pipe(
        readLines(path),
        StreamEither.filter(data => data.index >= totalLines - linesCount),
    )),
    StreamEither.accumulate
)

const fileChanges = (path: string) => {
    const stream = StreamEither.right<Error, void>();

    const watcher = chokidar.watch(path, {
        usePolling: true
    })

    watcher.on('change', () => StreamEither.next(stream, undefined))
    watcher.on('close', () => StreamEither.end(stream))
    watcher.on('error', (err) => StreamEither.fail(stream, err))

    StreamEither.subscribeError(stream, () => watcher.close());

    return stream;
}

const watchLinesSince = (path: string, start: number) => {
    const stream = StreamEither.right<Error, string>();


    const changes = fileChanges(path);

    let lastIndex = start;

    pipe(
        changes,
        StreamEither.tap(() => pipe(
            readLines(path),
            StreamEither.filter(line => line.index > lastIndex),
            StreamEither.tap(line => StreamEither.next(stream, line.text)),
            StreamEither.tapError(err => {
                StreamEither.fail(stream, err);
                StreamEither.end(changes);
            }),
            StreamEither.accumulate,
            TaskEither.chain(flow(
                array.last,
                TaskEither.fromOption(() => new Error("Failed to get last changed string"))
            )),
            TaskEither.map(a => (lastIndex = a.index, a)),
            f => f()
        )),
        StreamEither.tapEnd(() => StreamEither.end(stream)),
        StreamEither.tapError(e => StreamEither.fail(stream, e)),
    )

    return stream;
}

export const logs: Executor<"logs"> = (arg) => (ctx) => pipe(
    readDataFile(ctx.dataFilePath),
    TaskEither.filterOrElse(
        (data): data is DataFile => !!data,
        () => new Error("Mother ship is not launched"),
    ),
    TaskEither.chain(request("get", `/wing/info/`, WingInfoC, { name: arg.name })),
    TaskEither.chain(data => pipe(
        tail(data.logFilePath, arg.lines ?? 20),
        TaskEither.chainFirst(flow(
            array.map(line => line.text),
            array.map(Console.log),
            IO.sequenceArray,
            io => TaskEither.fromIO<void, Error>(io),
        )),
        TaskEither.chain(flow(
            array.last,
            Option.map(line => line.index),
            TaskEither.fromOption(() => new Error("Empty array")), 
        )),
        StreamEither.fromTaskEither,
        StreamEither.chain(lastIndex => watchLinesSince(data.logFilePath, lastIndex)),
        StreamEither.tap(console.log),
        StreamEither.tapError(console.error),
        StreamEither.toTaskEither
    )),
)
