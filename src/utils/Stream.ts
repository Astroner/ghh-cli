import { Readable } from "stream";

import * as Monad from "fp-ts/lib/Monad";
import * as Apply from "fp-ts/lib/Apply";
import * as Task from "fp-ts/lib/Task";
import { pipeable } from "fp-ts/lib/pipeable";
import { flow, pipe } from "fp-ts/lib/function";

export type Subscription = {
    unsubscribe(): void;
}

export type Stream<T> = {
    ended: boolean;
    subscribers: Array<(t: T) => void>
    endScribers: Array<() => void>
}

export const URI = "Stream";
export type URI = typeof URI;

declare module 'fp-ts/HKT' {
    interface URItoKind<A> {
      readonly Stream: Stream<A>
    }
}

export const create = <T>(): Stream<T> => {
    return {
        ended: false,
        subscribers: [],
        endScribers: [],
    }
}

export const next = <T>(stream: Stream<T>, value: T) => {
    if(stream.ended) stream;
    stream.subscribers.forEach(cb => cb(value));

    return stream;
};

export const end = <T>(stream: Stream<T>, value?: T) => {
    if(stream.ended) return stream;
    if(value) stream.subscribers.forEach(cb => cb(value));

    stream.ended = true;
    stream.subscribers = [];
    stream.endScribers.forEach(cb => cb());

    return stream;
}

export const subscribe = <T>(stream: Stream<T>, cb: (val: T) => void): Subscription => {
    if(stream.ended) return {
        unsubscribe: () => {}
    }

    stream.subscribers.push(cb)

    return {
        unsubscribe: () => stream.subscribers.splice(stream.subscribers.indexOf(cb), 1)
    }
}

export const subscribeEnd = (stream: Stream<any>, cb: () => void): Subscription => {
    if(stream.ended) {
        setTimeout(cb, 0);
        return {
            unsubscribe: () => {}
        }
    }
    stream.endScribers.push(cb)

    return {
        unsubscribe: () => stream.endScribers.splice(stream.subscribers.indexOf(cb), 1)
    }
}

export const flatten = <T>(stream: Stream<Stream<T>>) => {
    const result = create<T>();

    let prevStream: Stream<T> | null = null;
    let valueSub: Subscription | null = null;
    let endSub: Subscription | null = null;

    subscribe(stream, (s) => {
        valueSub?.unsubscribe();
        endSub?.unsubscribe();
        if(prevStream) end(prevStream);

        prevStream = s;
        valueSub = subscribe(s, (val) => {
            next(result, val);
        })

        endSub = subscribeEnd(s, () => end(result))
    })

    subscribeEnd(result, () => {
        valueSub?.unsubscribe();
        endSub?.unsubscribe();
        if(prevStream) end(prevStream);

        end(result)
    });

    return result;
}

export const monadInstance: Monad.Monad1<"Stream"> = {
    URI,
    of() {
        return create()
    },
    map<A, B>(fa: Stream<A>, f: (a: A) => B) {
        
        const mapped = create<B>()

        subscribe(fa, (a: A) => next(mapped, f(a)))
        subscribeEnd(fa, () => end(mapped))

        return mapped;
    },
    ap<A, B>(fab: Stream<(a: A) => B>, fa: Stream<A>) {
        let transform: ((a: A) => B) | null = null;
        let arg: A | null = null;

        const result = create<B>()

        const update = () => {
            if(!transform || !arg) return;
            
            return next(result, transform(arg));
        }

        let ended = 0;

        subscribe(fab, (f) => (transform = f, update()));
        subscribe(fa, (a) => (arg = a, update()));


        subscribeEnd(fab, () => {
            if(++ended == 2) end(result);
        })

        subscribeEnd(fa, () => {
            if(++ended == 2) end(result);
        })

        return result;
    },
    chain<A, B>(fa: Stream<A>, f: (a: A) => Stream<B>) {
        return flatten(monadInstance.map(fa, f))
    },
}

const { ap, apFirst, apSecond, map, chain } = pipeable(monadInstance);

export { ap, apFirst, apSecond, map, chain };

export const sequenceT = Apply.sequenceT(monadInstance)
export const sequenceS = Apply.sequenceS(monadInstance)

export const toTask = (stream: Stream<any>): Task.Task<void> => {
    return () => new Promise<void>((resolve) => {
        subscribeEnd(stream, resolve)
    }) 
}

export const fromReadable = (str: Readable): Stream<unknown> => {
    const result = create<unknown>()

    str.on('data', (chunk) => result.subscribers.forEach(cb => cb(chunk)))
    str.on('close', () => end(result))
    str.on('error', () => end(result))

    return result;
}

export const tap = <T>(cb: (t: T) => void) => (stream: Stream<T>) => {
    subscribe(stream, cb);

    return stream;
}

export const tapEnd = <T>(cb: () => void) => (stream: Stream<T>) => {
    subscribeEnd(stream, cb);

    return stream;
}

interface StreamFilter {
    <A>(predicate: (a: A) => unknown): (stream: Stream<A>) => Stream<A>
    <A, B extends A>(predicate: (a: A) => a is B): (stream: Stream<A>) => Stream<B>
}

export const filter: StreamFilter = (predicate: (a: unknown) => unknown) => (stream: Stream<unknown>) => {
    const result = create<unknown>();

    subscribe(stream, (a) => {
        if(predicate(a)) next(result, a);
    })

    subscribeEnd(stream, () => end(result));

    return result;
}

export const fromTask = <T>(task: Task.Task<T>) => {
    const stream = create<T>();

    task().then(t => end(stream, t));

    return stream;
}
