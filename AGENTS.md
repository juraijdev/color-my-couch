# Architecture rules

- Keep suggestion response parsing and validation inside the suggest-colors function directory, independently tested; malformed or incomplete suggestions must never reach recoloring.
- Parameterize the shared upload area for room photos while retaining furniture upload defaults; room-first suggestions must not change normal customization.