# Node runtime package rules

- Isolate filesystem, stdin, and other Node-specific concerns from the SDK and Kernel.
- Call `@voidtrace/sdk`; never import Kernel, Rules, Catalog, or generated artifacts directly.
- Do not implement or duplicate mechanics, formulas, Artifact validation, or trace semantics.
- Normalize file, stdin, JSON, and unexpected failures into contract-valid Problems.
- Never expose raw OS errors, V8 parser diagnostics, stack traces, or exception text in a Problem.
- Keep stdin use explicit and reject requests that assign more than one source to stdin.
