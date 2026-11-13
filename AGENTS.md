# Architecture rules

- Keep suggestion response parsing and validation inside the suggest-colors function directory, independently tested; malformed or incomplete suggestions must never reach recoloring.
- Parameterize the shared upload area for room photos while retaining furniture upload defaults; room-first suggestions must not change normal customization.
- Keep mobile navigation and category controls wrapping, constrain floating panels to the viewport, and give mobile material grids a bounded vertical scroll area; this prevents horizontal overflow without changing desktop layouts or AI behavior.
