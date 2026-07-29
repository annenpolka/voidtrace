# Catalog package rules

- Validate every snapshot with the generated `CatalogSnapshot` contract from
  `@voidtrace/contracts`; do not redefine the wire shape here.
- Catalog data is normalized input, not executable game mechanics.
- Mod effects remain data-only. Rules and Kernel packages own their meaning and execution.
- Snapshot caller input before indexing it, reject ambiguous IDs and references, and expose only
  deeply frozen data.
- Verify the canonical Artifact content hash before exposing a loaded Catalog.
- Fixtures in this repository must use clearly synthetic identities and values unless independent
  game-data evidence is added in a later slice.
