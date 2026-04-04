# /memory — AW Memory Layer

Store, search, or retrieve memories from the AW memory layer.

## Usage

- `/memory store <content>` — Store a memory with auto-curation
- `/memory search <query>` — Search memories by semantic similarity
- `/memory pack <query>` — Get a token-budgeted memory pack for context injection
- `/memory stats` — Show memory statistics

## Behavior

When the user invokes `/memory`, determine the subcommand and use the appropriate MCP tool:

### store

Call `memory_curated_store` MCP tool with:
- content: the text to remember
- Derive type, namespace, tags from context if not explicitly provided
- Show the curation decision (CREATE/UPDATE/SKIP/CONTRADICT) and 3D classification

### search

Call `memory_search` MCP tool with the query text.
Show results with confidence scores and classification tags.

### pack

Call `memory_pack` MCP tool with the query.
Return the XML memory pack for context injection.

### stats

Call `memory_search` with a broad query and summarize:
- Total memories by layer
- Top overlays and angles
- Recent activity

## Process

1. Parse the subcommand from the user input
2. Validate required arguments (content for store, query for search/pack)
3. Call the appropriate MCP tool
4. Format and display results with relevant metadata
5. For `store`, confirm the curation decision before proceeding if `auto_approve` is false

## Notes

- Memory packs are XML-formatted and designed for context injection into agent sessions
- The 3D classification system uses layer/overlay/angle dimensions
- Confidence scores range from 0.0 to 1.0
- Curation decisions: CREATE (new memory), UPDATE (refine existing), SKIP (duplicate), CONTRADICT (conflicts with existing)
