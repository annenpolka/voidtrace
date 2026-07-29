# Specification authoring rules

- `main.pkl` is the sole entrypoint consumed by generators.
- Use the finite Clause vocabulary from `patterns/base.pkl`.
- Do not embed TypeScript, JavaScript, Rust, Python, or shell snippets in Pkl.
- Clause IDs are permanent and must remain unique.
- `guarantee` states the intended verification method; `maturity` states whether the oracle exists.
- A Clause may become `active` only when an independent oracle exists.
- Do not describe an unverified Warframe mechanic as stable evidence.
- Add a new pattern only when an existing pattern cannot express the claim without distortion.
