import * as TaskEither from "fp-ts/lib/TaskEither";
import * as Either from "fp-ts/lib/Either";
import * as Applicative from "fp-ts/lib/Applicative";
import * as Apply from "fp-ts/lib/Apply";
import { pipeable } from "fp-ts/pipeable";

import * as Stream from "./Stream";
import { Readable } from "stream";

export type StreamLeft<E> = {
    type: "left"
    error: E;
}

export type StreamRight<E, T> = {
    type: "right"
    errorSubscribers: Array<(e: E) => void>
    stream: Stream.Stream<T>
}

export type StreamEither<E, T> = StreamLeft<E> | StreamRight<E, T>;

export const URI = "StreamEither";

export type URI = typeof URI;

declare module 'fp-ts/HKT' {
    interface URItoKind2<E, A> {
      readonly StreamEither: StreamEither<E, A>
    }
}

export const right = <E, T>(): StreamEither<E, T> => ({
    type: "right",
    errorSubscribers: [],
    stream: Stream.create(),
})

export const left = <E, T>(error: E): StreamEither<E, T> => ({
    type: "left",
    error,
})

export const isLeft = <E, T>(stream: StreamEither<E, T>): stream is StreamLeft<E> => {
    return stream.type === "left"
}

export const isRight = <E, T>(stream: StreamEither<E, T>): stream is StreamRight<E, T> => {
    return stream.type === "right"
}

export const next = <E, T>(value: T) => (stream: StreamEither<E, T>): StreamEither<E, T> => {
    if(isLeft(stream)) return stream;
    Stream.next(value)(stream.stream);

    return stream;
}

export const end = <E, T>(stream: StreamEither<E, T>): StreamEither<E, T> => {
    if(isLeft(stream)) return stream;

    stream.errorSubscribers = [];

    Stream.end(stream.stream);

    return stream;
}

export const fail = <E, T>(e: E) => (stream: StreamEither<E, T>): StreamEither<E, T> => {
    if(isLeft(stream)) return stream;

    stream.errorSubscribers.forEach(cb => cb(e));

    stream.errorSubscribers = [];

    stream.stream.endScribers = [];
    stream.stream.subscribers = [];

    // @ts-ignore
    stream.type = "left";
    // @ts-ignore
    stream.error = e;
    // @ts-ignore
    delete stream.errorSubscribers;
    // @ts-ignore
    delete stream.stream;

    return stream;
}

export const subscribe = <E, T>(cb: (v: T) => void) => (stream: StreamEither<E, T>): Stream.Subscription => {
    if(isLeft(stream)) return {
        unsubscribe: () => {}
    }

    return Stream.subscribe(cb)(stream.stream);
}

export const subscribeEnd = (cb: () => void) => (stream: StreamEither<any, any>): Stream.Subscription => {
    if(isLeft(stream)) return {
        unsubscribe: () => {}
    }

    return Stream.subscribeEnd(cb)(stream.stream);
}

export const subscribeError = <E, T>(cb: (e: E) => void) => (stream: StreamEither<E, T>): Stream.Subscription => {
    if(isLeft(stream)) {
        setTimeout(() => cb(stream.error), 0)
        return {
            unsubscribe: () => {}
        }
    }

    stream.errorSubscribers.push(cb);

    return {
        unsubscribe: () => stream.errorSubscribers.splice(stream.errorSubscribers.indexOf(cb), 1)
    }
}

const applicativeInstance: Applicative.Applicative2<"StreamEither"> = {
    URI,
    of() {
        return right();
    },
    map<E, A, B>(fa: StreamEither<E, A>, f: (a: A) => B) {
        if(isLeft(fa)) return fa as StreamEither<E, B>;

        return {
            type: "right",
            errorSubscribers: [],
            stream: Stream.map<A, B>(f)(fa.stream)
        }
    },
    ap<E, A, B>(fab: StreamEither<E, (a: A) => B>, fa: StreamEither<E, A>) {
        if(isLeft(fab)) return fab as StreamEither<E, B>
        if(isLeft(fa)) return fa as StreamEither<E, B>

        const result: StreamEither<E, B> = {
            type: "right",
            errorSubscribers: [],
            stream: Stream.ap(fa.stream)(fab.stream)
        };

        const errorHandler = subscribeError<E, any>(
            (e: E) => fail<E, B>(e)(result)
        )

        errorHandler(fab);
        errorHandler(fa);

        return result;
    },
}

const { map, ap, apFirst, apSecond } = pipeable(applicativeInstance);

export { map, ap, apFirst, apSecond };

export const sequenceT = Apply.sequenceT(applicativeInstance);
export const sequenceS = Apply.sequenceS(applicativeInstance);

export const fromReadable = (readable: Readable): StreamEither<Error, unknown> => {
    const result = right<Error, unknown>();

    readable.on('data', chunk => {
        next<Error, unknown>(chunk)(result);
    })

    readable.once('error', err => {
        fail(err)(result);
    })

    readable.once('end', () => {
        end(result);
    })

    return result;
}

export const toTaskEither = <E, T>(stream: StreamEither<E, T>): TaskEither.TaskEither<E, void> => {
    return () => new Promise<Either.Either<E, void>>((resolve) => {
        subscribeEnd(() => resolve(Either.right(undefined)))(stream)
        subscribeError<E, T>((err) => resolve(Either.left(err)))(stream)
    })
}

export const chainEither = <E, A, B>(map: (a: A) => Either.Either<E, B>) => (stream: StreamEither<E, A>): StreamEither<E, B> => {
    if(isLeft(stream)) return stream;

    const result = right<E, B>();

    subscribe<E, A>((a: A) => {
        const val = map(a);
        if(Either.isLeft(val)) fail<E, B>(val.left)(result)
        else next<E, B>(val.right)(result)
    })(stream)

    subscribeEnd(() => end(result))(stream);
    subscribeError<E, A>((err: E) => fail<E, B>(err)(result))(stream);

    return result;
}

export const tap = <E, A>(cb: (a: A) => void) => (stream: StreamEither<E, A>) => {
    subscribe<E, A>(cb)(stream);

    return stream;
}

export const tapEnd = <E, A>(cb: () => void) => (stream: StreamEither<E, A>) => {
    subscribeEnd(cb)(stream);

    return stream;
}

export const tapError = <E, A>(cb: (e: E) => void) => (stream: StreamEither<E, A>) => {
    subscribeError<E, A>(cb)(stream);

    return stream;
}
