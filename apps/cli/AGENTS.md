# CLI agent rules

- This package is a transport adapter. It may parse arguments, choose an application operation,
  and route deterministic JSON to stdout or stderr.
- Import application behavior only from `@voidtrace/runtime-node`; never compose Kernel, Rules,
  Catalog, or generated specification packages here.
- Do not add mechanics formulas, Artifact defaults, interactive prompts, filesystem access, or
  hidden fixture selection.
- Successful domain output belongs on stdout. Contract-valid Problem output belongs on stderr.
- Keep `voidtrace` and `vt` mapped to the same executable.
