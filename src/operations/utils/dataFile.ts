import * as fs from "fs";

import { constant, flow, pipe } from "fp-ts/lib/function";
import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Either from "fp-ts/lib/Either";
import * as Json from "fp-ts/lib/Json";
import * as t from "io-ts";

const dataFileType = t.type({
    port: t.number,
    pid: t.number,
    token: t.string
})

export type DataFile = t.TypeOf<typeof dataFileType>;

export const readDataFile = (path: string): TaskEither.TaskEither<Error, DataFile | null> => pipe(
    TaskEither.tryCatch(
        () => new Promise<string | null>((resolve, reject) => {
            fs.readFile(path, (err, data) => {
                if(err)
                    if(err.code === "ENOENT") resolve(null);
                    else reject(err)

                else resolve(data.toString())
            })
        }),
        (err) => new Error(`Cannot access "${path}"\n` + err)
    ),
    TaskEither.chain(TaskEither.fromNullable(new Error("NULL"))),
    TaskEither.chain(flow(
        Json.parse,
        Either.mapLeft(() => new Error("Failed to parse json data file")),
        Either.chain(flow(
            dataFileType.decode,
            Either.mapLeft(() => new Error("Format miss match")),
        )),
        TaskEither.fromEither
    )),
    TaskEither.orElse(
        (err) => err.message === "NULL" 
            ? TaskEither.of<Error, DataFile | null>(null) 
            : TaskEither.left<Error, DataFile | null>(err),
    )
)

export const writeDataFile = (path: string) => (data: DataFile) => pipe(
    Json.stringify(data),
    Either.mapLeft(constant(new Error("Failed to stringify the data"))),
    TaskEither.fromEither,
    TaskEither.chain(str => TaskEither.tryCatch(
        () => new Promise<void>((resolve, reject) => {
            fs.writeFile(path, str, (err) => {
                if(err) reject(err)
                else resolve()
            })
        }),
        (err) => new Error(`Failed to write new data to the data file "${path}"\n${err}`)
    )),
    TaskEither.chain(str => TaskEither.tryCatch(
        () => new Promise<void>((resolve, reject) => {
            fs.chmod(path, fs.constants.S_IRUSR | fs.constants.S_IWUSR, (err) => {
                if(err) reject(err)
                else resolve()
            })
        }),
        (err) => new Error(`Failed to write new data to the data file "${path}"\n${err}`)
    ))
)