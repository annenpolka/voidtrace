# Rules package rules

- Normative mechanics originate in `specs/**/*.pkl`; never invent a mechanic here.
- Handwritten code may validate and interpret generated Rule IR, but must not duplicate formulas.
- An unsupported rule or operation is an error, never a no-op.
- Rules are data and must remain independent of Kernel state, filesystem, network, UI, and LLMs.
