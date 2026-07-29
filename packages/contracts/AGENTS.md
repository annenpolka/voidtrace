# Contract package rules

- Generated JSON Schema is the runtime authority; do not redefine Artifact shapes here.
- Re-export generated TypeScript types instead of maintaining handwritten duplicates.
- Validation must not coerce values, insert defaults, remove properties, or mutate inputs.
- Snapshot runtime inputs once into behavior-free own data before validation, hashing, or comparison.
- Canonicalization accepts only JSON values and must remain RFC 8785 compatible.
- Artifact content hashes exclude only the self-referential `contentHash` field.
- Do not import Kernel, Rules, Catalog, UI, filesystem, network, or LLM concerns.
- This package owns transport contracts and reproducibility utilities, not game mechanics.
