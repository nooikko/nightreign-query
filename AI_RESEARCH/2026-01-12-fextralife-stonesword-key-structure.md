# Research: Fextralife Stonesword Key Wiki Page Structure

Date: 2026-01-12

## Summary

Analysis of the Stonesword Key wiki page from Elden Ring Fextralife to understand data structure, content organization, and extraction requirements for the scraper implementation.

## Prior Research

This research builds upon the initial project setup documented in PRD.md and IMPLEMENTATION_PLAN.md for the nightreign-query project.

## Current Findings

### Page URL
https://eldenring.wiki.fextralife.com/Stonesword+Key

### Page Structure Overview

The Fextralife wiki follows a consistent hierarchical structure:

```
Page Heading: Item Name (Stonesword Key)
├── Infobox (metadata)
├── Item description text
├── Where to Find Section
│   ├── Organized by Region
│   │   ├── Where to purchase (merchants)
│   │   └── Where to find (world locations)
├── How to Use Section
│   └── List of sealed locations requiring the item
├── Notes Section
├── Related Items
└── Discussion (community comments)
```

### 1. Infobox Data Structure

**Fields Present:**
- **Type**: "Key Item"
- **Effect**: "Use to break one imp statue seal"
- **Description**: Multi-line flavor text explaining the item's nature and mechanics

**Example:**
```
Type: Key Item
Effect: Use to break one imp statue seal
Description: "A sword-shaped stone key. Breaks the seal on imp statues,
but remains embedded in the statue after use, meaning it can only be
used once as an item."
```

### 2. Location Information Format

#### Regional Organization

Locations are grouped under 12+ major region headings:

1. **Limgrave**
2. **Weeping Peninsula**
3. **Caelid**
4. **Liurnia of the Lakes**
5. **Mt. Gelmir**
6. **Altus Plateau**
7. **Leyndell, Royal Capital**
8. **Mountaintops of the Giants**
9. **Underground areas**:
   - Siofra River
   - Nokron
   - Deeproot Depths
   - Ainsel River
10. **Crumbling Farum Azula**
11. **Roundtable Hold**

#### Location Entry Patterns

**Three common patterns identified:**

1. **Simple Description**
   ```
   "Held by a corpse at Dragon-Burnt Ruins, next to the main arc,
   in a room with a Giant Rat."
   ```

2. **Detailed Navigation**
   ```
   "From the 'Behind the Castle' Site of Grace, walk down towards
   the west back onto a section of the castle and look to the left
   to find a wooden platform."
   ```

3. **Landmark-Based**
   ```
   "Found on a corpse under a burnt tree near the cliffs north of
   Fort Laiedd in Mt. Gelmir."
   ```

#### Merchant Entry Format

Standard pattern:
```
"Can be purchased from the [NPC Name] for [X] Runes each.
[Location description]. Stock: [Y]."
```

**Example:**
```
"Can be purchased from the Isolated Merchant for 2,000 Runes each.
He can be found in his shack at the very west of the Weeping Peninsula.
Stock: 3."
```

**Key Fields:**
- NPC name
- Price in Runes
- Location description
- Stock quantity

#### Multiple Items at One Location

```
"Stormveil Castle: Can be found in a same hidden underground room
with a mini-boss that drops a Golden Seed, this hidden area can be
accessed by an open window right above Imp Statue fog door where
you find the Iron Whetblade."
```

Pattern: Describes multiple rewards/items at the same location with unified access instructions.

### 3. Interactive Elements

#### Map Coordinate Links

**Pattern:**
```
[Map Link](/Interactive+Map?id=456&lat=-195.546875&lng=106.473881&code=mapA)
```

**URL Parameters:**
- `id`: Map identifier
- `lat`: Latitude coordinate
- `lng`: Longitude coordinate
- `code`: Map code (e.g., "mapA" for overworld)

#### Video Timestamp Links

**Pattern:**
```
[Video Location](https://youtu.be/7zS9MfxqlCs?t=255)
```

**Parameters:**
- YouTube URL with `?t=` parameter for timestamp in seconds

### 4. Usage Section Structure

**Section Heading:** "Elden Ring Stonesword Key Use"

**Format:** Bulleted list organized by geographic region

**Entry Pattern:** `Region - Location Name: Description`

**Examples:**

1. "**Limgrave - Fringefolk Hero's Grave:** To access it you need two Stonesword Keys"
2. "**Limgrave - Tombsward Catacombs:** requires a Stonesword key to access"
3. "**Roundtable Hold:** first door will require one Key to open, and the second door behind the first requires two keys"
4. "**Liurnia - Black Knife Catacombs:** use to open a room contain Rosus' Axe"
5. "**Underground - Night's Sacred Ground:** Used to unlock a room that houses the Mimic Tear Ashes"

**Information Captured:**
- Number of keys required (explicit or implied)
- Reward/content behind seal (sometimes)
- Location specifics

### 5. Navigation & Metadata

**Breadcrumb Trail:**
```
Equipment & Magic > Items > Key Items
```

**Related Items Section:**
- Cross-references to other key items
- Linked text to other wiki pages

**Notes Section:**
- Capacity limits: "99 held, 600 stored"
- Gameplay tips
- Mechanic clarifications

### 6. Community Features

**Discussion Threads:**
- Located below main content
- User-contributed tips and corrections
- Not primary data source but may contain additional location info

## Key Takeaways for Scraper Implementation

### Data Extraction Priorities

1. **Infobox Data**
   - Type, Effect, Description fields
   - Structured metadata

2. **Location Entries**
   - Region/area grouping
   - Purchase locations (NPC, price, stock)
   - World locations (navigation text)
   - Map coordinates (lat/lng from links)
   - Video timestamps

3. **Usage Information**
   - Sealed location names
   - Number of keys required
   - Rewards behind seals

### HTML Parsing Considerations

**Critical Selectors Needed:**
- Infobox container and field labels
- Region heading elements (likely `<h2>` or `<h3>`)
- Location entry paragraphs/list items
- Link elements with map coordinate parameters
- Link elements with YouTube URLs

**Text Parsing Challenges:**
- Free-form navigation text (no strict structure)
- Inconsistent merchant format variations
- Multiple items described in single paragraph
- Region names appear in both headings AND entry text

### Data Model Requirements

Based on this structure, the scraper should extract:

```typescript
interface StoneswordKeyLocation {
  region: string;
  locationType: 'purchase' | 'world' | 'sealed';

  // For purchases
  npcName?: string;
  price?: number;
  stock?: number;

  // For world locations
  description: string;

  // Optional
  mapCoordinates?: {
    lat: number;
    lng: number;
    mapId: string;
    mapCode: string;
  };
  videoUrl?: string;
  videoTimestamp?: number;

  // For sealed locations
  keysRequired?: number;
  rewards?: string[];
}

interface StoneswordKeyData {
  itemName: string;
  type: string;
  effect: string;
  description: string;
  locations: StoneswordKeyLocation[];
  notes: string[];
}
```

### Scraper Architecture Recommendations

1. **HTML Parser**: Use Cheerio or similar for DOM traversal
2. **Region Detection**: Parse heading hierarchy to assign locations to regions
3. **Pattern Matching**: Regex for extracting prices, stock numbers, coordinates
4. **Link Processing**: Extract and parse `href` attributes for map/video data
5. **Text Cleaning**: Remove wiki markup, normalize whitespace
6. **Validation**: Verify required fields present, coordinate ranges valid

## Version Considerations

- Wiki content is user-editable and may change
- No version information in HTML
- Consider caching/timestamping scraped data
- May need periodic re-scraping for updates

## Sources

- Primary: https://eldenring.wiki.fextralife.com/Stonesword+Key (accessed 2026-01-12)
- Tool: WebFetch for content extraction and analysis

## Next Steps Recommendations

1. **For scraper implementation**: The backend-api-specialist or typescript-expert agent can implement the HTML parsing logic using this structure
2. **For data validation**: The unit-test-maintainer agent can create tests to verify extraction accuracy
3. **For API design**: Consider how this data structure maps to GraphQL schema in the tRPC API

## Gaps Identified

- Exact HTML element types/classes (would need raw HTML inspection)
- CSS selectors for specific sections (requires browser dev tools)
- Handling of wiki markup/templates in text content
- Rate limiting or robots.txt policies for Fextralife
- Mobile vs desktop HTML differences
