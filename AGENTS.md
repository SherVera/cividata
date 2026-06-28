# AGENTS.md

Guidance for AI coding agents working in this repository.

## Project Context

- Treat this file as the source of truth for agent behavior.
- Read existing files before making assumptions about the stack, commands, or architecture.
- Keep changes small, direct, and aligned with the patterns already present in the repo.

## Working Rules

- Do not overwrite user changes or revert unrelated work.
- Prefer editing existing files over introducing new abstractions.
- Use standard library and existing dependencies before adding new packages.
- Keep generated code readable, maintainable, and narrowly scoped to the request.
- Avoid broad refactors unless the user explicitly asks for them.

## Validation

- Run the smallest relevant checks after changes when project commands are available.
- If no test, lint, or build command exists yet, state that clearly in the final response.
- Fix any errors introduced by your own changes before handing work back.

## Communication

- Be concise and explicit about what changed.
- Mention any commands run and whether they passed or failed.
- Call out assumptions, skipped validation, or follow-up work when relevant.
