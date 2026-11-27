declare module 'node:test' {
  export function describe(name: string, fn: () => void | Promise<void>): void;
  export function it(name: string, fn: () => void | Promise<void>): void;
  export function test(name: string, fn: () => void | Promise<void>): void;
}

declare module 'node:assert/strict' {
  const assert: {
    ok(value: unknown, message?: string): asserts value;
    equal<T>(actual: T, expected: T, message?: string): void;
    notEqual<T>(actual: T, expected: T, message?: string): void;
    deepEqual<T>(actual: T, expected: T, message?: string): void;
    throws(fn: () => unknown, error?: RegExp | Function | Error, message?: string): void;
    match(value: string, regexp: RegExp, message?: string): void;
  };
  export default assert;
}

declare module 'node:fs' {
  export function readFileSync(path: string, encoding: 'utf8'): string;
}

declare module 'node:path' {
  export function resolve(...paths: string[]): string;
}

declare module 'node:process' {
  export function cwd(): string;
}
