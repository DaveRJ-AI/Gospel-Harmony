# Gospel Harmonizer – Map Project Handoff

## Project purpose
This map is a relational Gospel geography map, not a strict atlas.

Its purpose is to help users:
- see the relative relationship of places and regions named in the Gospel text
- follow travel and event flow by Gospel
- select places or regions and surface events for selected location
- compare single-Gospel and multi-Gospel movement patterns

The governing principle has been:

> prioritize what the Gospel text actually names and uses for events and movement, rather than trying to build a fully literal historical atlas.

## Current status
The map is in a strong pilot-ready state.

### Working well
- region-aware map is functioning
- region selection works from the left panel
- region click parity on the map works
- single-Gospel path view is usable
- multi-Gospel comparison view is usable
- event panel now supports region-level events
- Egypt and Tyre & Sidon have been added as regions and return events
- decorative underlays now make the map feel much more alive and old-world

### Visual direction accepted
The project evolved away from simple geometric underlays only and toward:
- soft region shapes for structure
- decorative illustrated underlays for atmosphere
- a parchment background for old-map feel
- region color differentiation retained for usability

That combination has been well received and should remain the preferred design language.

## High-level design philosophy

### 1. Relational, not literal
This map should remain relational first.
It is acceptable for site positioning to be adjusted within a region to improve:
- readability
- path flow
- overlap reduction
- sequence clarity

Sites do not need fixed literal placement inside a region.

### 2. Text-driven inclusion standard
A place or region belongs in the model when:
- the Gospel text names it as a setting for an event
- or the text uses it meaningfully in movement or sequencing

A region should not be added merely because it exists historically.

### 3. Visual hierarchy
Preferred layer hierarchy:
1. parchment background
2. region shapes and region decorative art
3. Gospel paths
4. sequence markers and transitions
5. nodes and labels

### 4. Simplicity over cleverness
When a visual choice becomes too clever or crowded, default back to:
- cleaner
- more legible
- more stable

## Decisions already made

### Regions currently in play
The working region set is:
- Galilee
- Judea
- Samaria
- Perea
- Decapolis
- Egypt
- Tyre & Sidon

### Important exclusions and decisions
- No separate Transjordan region
- No separate Judean Wilderness region
- Additional regions should only be added if tied to actual Gospel events

## Event and episode terminology
User preference is to present these as Events, even if code or data still uses episodes.

### Accepted visible label
- Events for selected location

It is fine if the code continues using episode-oriented naming internally for now.

## Theme terminology
User preference is for the top navigation wording:
- Themes instead of Type

## Region selection behavior
Accepted behavior:
- regions stay in the left list for now
- selecting a region highlights that region on the map
- clicking region label or region underlay should behave like left-panel selection
- selecting a region should return events associated with that region

## Travel-sequence decisions
Travel-sequence logic was expanded to include:
- Egypt in Matthew
- Tyre & Sidon in Matthew and Mark

That alignment between region selection, region events, and Gospel travel sequences is important and should be preserved.

## Region and event curation standard
This standard was explicitly adopted:

> add region ids to events when the event is actually set in that region, not for a mere mention.

### Example accepted
- Samaria returning the Woman at the Well event was treated as a good proof of concept.

## Numbering and path behavior decisions

### Sequence display
Path numbering has gone through many iterations.

### Current accepted direction
- single-Gospel mode may show more detailed sequence markers
- multi-Gospel mode should avoid clutter
- clarity beats completeness when numbers become unreadable

### Important lesson
Dense numbering near clustered sites, especially in Galilee and around Jerusalem, Mount of Olives, Bethany, and Gethsemane, quickly becomes unreadable.

## Map art and decorative underlays
The project discovered that illustrated underlays work much better than abstract ridge marks.

### Earlier experiments that were less successful
- faint contour lines
- simple ridge mark style
- low-opacity abstract geography hints

### Accepted visual direction
Use soft, hand-drawn, watercolor, vintage-map-style underlays with low opacity.

These are decorative only and should not carry logic.

## Accepted underlay direction by region

### Full map
- parchment background as bottom layer

### Galilee
- vintage map-style Galilee image
- mountain, hill, and sea visual feel

### Tyre & Sidon
- coastal vintage map-style image
- greener, more coastal, less mountain-heavy than Galilee

### Sea of Galilee
- dedicated water underlay image

### Judea
- vintage old-map style underlay
- more historical manuscript feel

### Wilderness and Judea-wilderness zone
- desert or arid underlay

### Egypt
- desert climate with pyramids
- region image may carry much of the Egypt identity

### Jordan River
- long or vertical river image
- no pyramids
- should feel like a river corridor

### Decapolis
- vintage map-style underlay
- region label embedded in the image is acceptable

## Key art-layer lesson
A plain colored oval underlay by itself often feels too geometric and sterile.

The more successful formula has been:
- parchment base
- decorative region image
- subtle region tint
- clear nodes, labels, and paths on top

## Current visual and UX preferences
User preferences that should be respected:
- likes iterative refinement
- values clean, readable placement over theoretical purity
- prefers strong practical code instructions
- likes being told what to search for in VS Code
- appreciates full copy and paste blocks when changes are complex
- prefers professional but not over-engineered visuals
- wants the map to feel alive, old-world, and manuscript-like
- wants region colors to remain helpful and differentiating
- is open to moving sites within regions to improve usability
- is willing to keep pilot data somewhat simplified if the result is clearer

## Important path and layout lessons learned

### Galilee cluster
This has repeatedly been the most difficult cluster because of:
- Capernaum
- Chorazin
- Cana
- Bethsaida
- Nazareth
- Magdala
- Sea of Galilee

High traffic between those nodes caused many overlap problems.

### Judea cluster
This was also difficult because of:
- Jerusalem
- Mount of Olives
- Bethany
- Gethsemane
- Golgotha
- Tomb Garden Area
- Jericho
- Wilderness

Moving sites within Judea was explicitly accepted as a valid method to improve path clarity.

### General conclusion
Traffic-based placement is better than geographically rigid placement.

## Current feature set to preserve
Do not regress these without a strong reason:
- region selection highlight
- region click parity
- Egypt and Tyre & Sidon region support
- region-backed events
- travel sequence inclusion for Egypt and Tyre & Sidon
- decorative illustrated underlays
- parchment bottom underlay
- Events and Themes terminology direction

## Open and in-process elements
These are active or likely next areas of work:

### 1. Final tuning of underlay sizes, opacities, and placement
The concept is working, but exact x, y, width, height, and opacity may still need tuning.

### 2. Region styling cohesion
Possible next refinement:
- soften raw region geometry further
- let art carry more of the regional identity
- possibly reduce plain fill dominance

### 3. User guidance note
Still worth considering:
- single Gospel equals detailed sequence view
- multiple Gospels equals comparison view

### 4. Event-driven interaction polish
Potential next phase:
- improve selected-event highlighting on map
- polish event panel ordering and behavior
- refine event-to-map visual feedback

### 5. Continued event curation
As more dataset work proceeds, keep tagging region ids where textually justified.

## Data-model and implementation principles

### Place and region model
- regions are represented as places
- event lookup can work by matching selected place id to event placeIds
- decorative art should not affect logic

### Decorative art
- presentation only
- should use pointerEvents: none
- should sit behind functional map elements

### Routing and labels
User-facing wording may change without needing to refactor route ids immediately.
Example:
- visible label Themes
- route can still remain /types if needed

## Current successful atmosphere formula
The visual combination that now feels right is:
- parchment base
- vintage regional illustrations
- colored regional differentiation
- simple but readable labels
- restrained but present paths
- old-world and manuscript tone without overcomplicating the map

## Suggested next priorities for a new chat or session

### Option A – final visual cohesion pass
- unify region art weights
- reduce any remaining geometric look
- refine opacity, placement, and layering
- make all regions feel part of one visual family

### Option B – event interaction refinement
- improve event selection feedback
- make event-to-map highlighting more deliberate
- refine event panel ordering and behavior

### Option C – dataset expansion
- add more events
- add more place-region-event associations
- continue text-grounded modeling

### Option D – explanatory UX
- add a lightweight legend or help note for single versus multi Gospel comparison behavior

## Practical note for new AI session
The browser-based thread became too heavy and slow.
New work should continue in VS Code plus AI.

When resuming, assume:
- current code is ahead of older chat snapshots
- latest file state in the repo should be treated as source of truth
- small visual tweaks may already have been made manually since the last guidance

Best practice for the next AI session:
1. read the current MapView.tsx
2. inspect current map assets in public/assets/map/
3. preserve existing working behaviors
4. make focused, incremental changes
5. prefer copy and paste ready edits with search anchors

## Files likely relevant
Current or likely relevant files include:
- src/components/map/MapView.tsx
- src/data/map/places.json
- src/data/map/episodes.json
- src/data/map/gospel-travel-sequences.json
- public/assets/map/*

## Suggested kickoff prompt for the next AI session
Use something like this:

Continuing Gospel Harmonizer map project in VS Code.

Current state:
- relational Gospel map is functioning well
- region selection and region click parity are working
- Events for selected location is the preferred user-facing wording
- Themes is preferred over Type in visible navigation
- Egypt and Tyre & Sidon are added as regions and included in events and travel sequences
- decorative regional underlays and parchment background are now core to the design direction
- site placement is relational and readability-first, not rigidly geographic

Current priorities:
1. preserve all working functionality
2. refine visual cohesion of region underlays, opacities, and placement
3. improve event-driven interaction and panel behavior
4. continue text-grounded event and region curation

Please read current MapView.tsx and related map data files first, then recommend the next smallest high-value improvements.

## Final note
The map has moved from build the skeleton to refine the experience.

The current direction is:
- more beautiful
- more atmospheric
- still functional
- still grounded in Gospel text usage

That balance should be protected in future iterations.
