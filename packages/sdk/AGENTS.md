# SDK package rules

- Expose the application-facing VoidTrace facade used by CLI, Lab, and future API surfaces.
- Do not introduce mechanics, filesystem, network, process, UI, or LLM behavior.
- Delegate evaluation to the Kernel with the generated core Ruleset.
- Snapshot a finite Breakpoint request as one graph, load one generated core Ruleset, and delegate
  the two-Sweep orchestration and analysis semantics to `@voidtrace/experiments`.
- Return fresh, deeply frozen snapshots for generated descriptive data.
- Do not make callers reconstruct Catalog, Rules, or Kernel package composition.
