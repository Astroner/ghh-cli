import * as Either from "fp-ts/lib/Either";
import { flow, pipe } from "fp-ts/lib/function";

import * as t from "io-ts";

const decoder = t.type({
    hookPath: t.union([t.undefined, t.string]),
    ghSecurityKey: t.union([t.undefined, t.string]),
    projects: t.array(t.type({
        label: t.union([t.undefined, t.string]),
        repos: t.union([t.undefined, t.array(t.string)]),
        branches: t.union([t.undefined, t.array(t.string)]),
        projectPath: t.union([t.undefined, t.array(t.string)]),
        envs: t.union([t.undefined, t.UnknownRecord]),
        ghSecurityKey: t.union([t.undefined, t.string]),
        scripts: t.union([t.string, t.array(t.union([t.string, t.type({
            script: t.string,
            cwd: t.union([t.undefined, t.string]),
            envs: t.union([t.undefined, t.UnknownRecord]),
        })]))])
    }))
});

export const decodeConfig = flow(
    decoder.decode,
    Either.mapLeft(() => new Error("Config file format miss-match"))
)