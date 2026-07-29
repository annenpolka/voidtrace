set shell := ["bash", "-euo", "pipefail", "-c"]

# Install the pinned JavaScript dependencies after checking external tools.
setup:
    node tools/check-toolchain.ts
    pnpm install --frozen-lockfile

# Regenerate every committed artifact from specs/main.pkl.
spec-gen:
    pnpm spec:gen

# Validate Pkl and compare a clean regeneration with committed generated files.
spec-check:
    pnpm spec:check

format:
    pnpm format

lint:
    pnpm lint

typecheck:
    pnpm typecheck

test:
    pnpm test

# Pull-request gate.
check:
    pnpm check
