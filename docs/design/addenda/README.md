# Addenda workflow

A design addendum is a small, dated, categorized delta to a spec — not a new pile of documents. Rules:

1. **File location = category.** Put it under the build it amends (`addenda/build-1/`, `addenda/build-2/`, ...), or under `addenda/cross-cutting/` if it changes something in `core-principles.md` that applies to every build.
2. **Name it `YYYY-MM-DD-short-slug.md`.** One addendum, one topic.
3. **Every addendum has a status header:** `proposed`, `accepted`, or `merged`. Register it in `docs/design/INDEX.md` the moment it's created — the index is the one place that shows current state without reading every file.
4. **Once accepted, merge it into the canonical spec** (`docs/design/specs/build-N-*.md`, or `core-principles.md` for cross-cutting changes) and flip the addendum's status to `merged`, noting the date. The addendum file stays as historical record; the spec is what anyone builds against going forward. Nobody should ever need to read the addenda folder to know current behavior — that's what the specs and `HANDOVER.md` are for.
5. **A rejected addendum stays too**, status `rejected`, with a one-line reason — this is what stops the same idea from being re-litigated blind six months later.

Template:

```markdown
# <Title>

**Status:** proposed | accepted | rejected | merged
**Date:** YYYY-MM-DD
**Amends:** docs/design/specs/build-N-....md (or core-principles.md)

## What changes

## Why

## Merged into (once merged)
```
