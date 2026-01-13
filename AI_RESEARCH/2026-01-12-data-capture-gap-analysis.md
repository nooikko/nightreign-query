# Data Capture Gap Analysis: Fextralife Wiki vs. Current Schema

Date: 2026-01-12

## Executive Summary

This gap analysis compares the rich data available on Fextralife's Elden Ring Nightreign wiki (documented in `2026-01-12-fextralife-wiki-page-structure-audit.md`) against our current database schema and normalization schemas. The analysis identifies what structured data we are **NOT** currently capturing and prioritizes missing fields by data richness and implementation value.

## Methodology

1. Reviewed existing research: `2026-01-12-fextralife-wiki-page-structure-audit.md`
2. Analyzed current schema: `/packages/database/prisma/schema.prisma`
3. Analyzed normalization schemas: `/apps/scraper/src/normalizer/schemas.ts`
4. Identified gaps per entity type
5. Assigned priority levels (HIGH/MEDIUM/LOW) based on:
   - Data richness (structured tables vs. narrative text)
   - Query utility (enables specific searches/filters)
   - Completeness of wiki data

---

## 1. Boss Pages

### Wiki Provides (from audit)
**Infobox:**
- HP (solo/duo/trio for each phase) ✅ CAPTURED
- Stance values ✅ CAPTURED
- Parryability status ✅ CAPTURED
- Damage types dealt ✅ CAPTURED
- Special weaknesses ✅ CAPTURED
- Damage negation (8 types: Standard, Slash, Strike, Pierce, Magic, Fire, Lightning, Holy) ✅ CAPTURED
- Status resistances (6 types: Poison, Scarlet Rot, Blood Loss, Frostbite, Sleep, Madness) ✅ CAPTURED
- Rune drops (solo/trio values) ⚠️ PARTIAL (captured in `rewards` string)
- Boss reward reference ⚠️ PARTIAL (captured in `rewards` string)

**Content Sections:**
1. Boss overview ✅ CAPTURED (via ContentChunk system)
2. Phase-specific combat information ✅ CAPTURED (in `phases` JSON)
3. Boss guide ✅ CAPTURED (via ContentChunk system)
4. Video guides ❌ NOT CAPTURED
5. Fight strategy by playstyle (Melee, Magic/Ranged) ✅ CAPTURED (in `strategies`)
6. **Attacks & Counters table** ❌ NOT CAPTURED
   - Attack name
   - Attack description
   - Counter strategy
7. Lore, notes & trivia ❌ NOT CAPTURED
8. Image gallery ❌ NOT CAPTURED
9. Related bosses links ❌ NOT CAPTURED

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **Attack Pattern Table** | **HIGH** | Structured combat data with attack names, descriptions, and counter strategies. Enables query: "How to dodge [boss] grab attack?" |
| Lore & Trivia | MEDIUM | Narrative content, useful for comprehensive guides but less queryable |
| Video Guide URLs | LOW | External links, low structured value |
| Image URLs | LOW | Visual assets, not text-searchable |
| Related Boss Cross-References | MEDIUM | Enables relationship queries ("bosses similar to X") |
| Rune Drop Structured Data | MEDIUM | Currently string, should be numeric with solo/trio breakdown |

### Recommended Schema Changes

```prisma
model Boss {
  // ... existing fields ...

  // HIGH PRIORITY
  attackPatterns Json? // BossAttackPattern[] - {name, description, counter}
  runeDrops      Json? // {solo: number, trio: number}

  // MEDIUM PRIORITY
  lore           String?
  relatedBosses  Json? // string[] - boss names
  imageUrls      Json? // string[]
  videoGuides    Json? // {url, title, author}[]
}
```

---

## 2. Weapon Pages

### Wiki Provides (from audit)
**Infobox:**
- Attack Power (Physical, Magic, Fire, Lightning, Holy) ✅ CAPTURED
- Critical damage ✅ CAPTURED
- Guard Damage Negation ❌ NOT CAPTURED
- Attribute Scaling (STR, DEX, INT, FAI, ARC) ✅ CAPTURED
- Weapon Type ✅ CAPTURED
- Level Requirement ❌ NOT CAPTURED
- Attack Affinity ⚠️ PARTIAL (in `stats`)
- Status Ailment (e.g., Hemorrhage with buildup) ✅ CAPTURED
- Weapon Skill ✅ CAPTURED
- Unique Weapon Effect ✅ CAPTURED

**Content Sections:**
1. Notes & Tips ❌ NOT CAPTURED
2. Potential passive benefits ✅ CAPTURED
3. Potential weapon skills ⚠️ PARTIAL (only one skill stored)
4. Quality upgrades section ✅ CAPTURED
5. **Class-specific upgrade tables (8 tables)** ✅ CAPTURED
   - 15 levels × 4 quality tiers × 8 classes
   - Attack Power and Damage Negation columns
6. Descriptive lore text ❌ NOT CAPTURED
7. Related weapons list ❌ NOT CAPTURED

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **Guard Damage Negation** | **HIGH** | Combat stat for shields/blocking weapons. 5 damage types + boost value. Critical for defensive builds. |
| **Level Requirement** | **HIGH** | Gating stat - essential for "weapons I can use at level X" queries |
| **Alternative Weapon Skills** | MEDIUM | Some weapons can equip multiple skills. Currently stores only one. |
| Lore Description | MEDIUM | Narrative flavor text, useful but less queryable |
| Notes & Tips | MEDIUM | Strategy guidance, could be in ContentChunk instead |
| Related Weapons | MEDIUM | Cross-reference for "similar weapons" queries |
| Image URL | LOW | Visual asset |

### Recommended Schema Changes

```prisma
model Weapon {
  // ... existing fields ...

  // HIGH PRIORITY
  guardNegation     Json? // {physical, magic, fire, lightning, holy, boost}
  levelRequirement  Int?

  // MEDIUM PRIORITY
  alternativeSkills Json? // string[] - other compatible weapon skills
  lore             String?
  relatedWeapons   Json? // string[]
  notesAndTips     String?
  imageUrl         String?
}
```

---

## 3. Nightfarer (Character/Class) Pages

### Wiki Provides (from audit)
**Infobox:**
- HP/FP/Stamina stats ⚠️ PARTIAL (base stats only, no progression)
- Attribute ratings (STR, DEX, INT, FAI, ARC - letter grades) ✅ CAPTURED
- Starting vessel ✅ CAPTURED
- Portrait image ❌ NOT CAPTURED

**Content Sections:**
1. Ability documentation ✅ CAPTURED
   - Passive ability
   - Character Skill
   - Ultimate Art
2. Key features (weapon preferences, role, playstyle) ❌ NOT CAPTURED
3. Ability breakdowns (detailed mechanics) ⚠️ PARTIAL (may be in ContentChunk)
4. Starting equipment specifications ❌ NOT CAPTURED
5. Video guides ❌ NOT CAPTURED
6. **Attribute progression table (levels 1-15)** ❌ NOT CAPTURED
7. **Character progression table (HP/FP/Stamina per level 1-15)** ❌ NOT CAPTURED
8. Vessel gallery (compatible equipment) ❌ NOT CAPTURED
9. Relic recommendations ❌ NOT CAPTURED
10. Notes & Tips ❌ NOT CAPTURED
11. **Remembrance Quest walkthrough** ❌ NOT CAPTURED
12. **Journal entries (lore narrative)** ❌ NOT CAPTURED
13. Related Nightfarer links ❌ NOT CAPTURED

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **HP/FP/Stamina Progression Table (Levels 1-15)** | **HIGH** | Core combat stats progression. Equivalent to weapon upgrade tables. Enables "best HP at level 10" queries. |
| **Attribute Progression Table (Levels 1-15)** | **HIGH** | Stat scaling per level. Critical for build planning. |
| **Starting Equipment** | **HIGH** | Initial loadout impacts early game strategy |
| **Relic Recommendations** | **HIGH** | Character-specific synergies for build optimization |
| Remembrance Quest Data | MEDIUM | Story progression, could be separate Quest entity |
| Journal Entries (Lore) | MEDIUM | Narrative content |
| Weapon Preferences/Playstyle | MEDIUM | Build guidance metadata |
| Vessel Gallery | MEDIUM | Compatible equipment list |
| Portrait/Images | LOW | Visual assets |
| Video Guides | LOW | External links |

### Recommended Schema Changes

```prisma
model Nightfarer {
  // ... existing fields ...

  // HIGH PRIORITY - Add progression tables (parallel to weapon upgrades)
  statProgression     Json? // NightfarerStatProgression - levels 1-15 with HP/FP/Stamina
  attributeProgression Json? // AttributeProgression - levels 1-15 with STR/DEX/INT/FAI/ARC
  startingEquipment   Json? // {weapon, vessel, armor, items}
  recommendedRelics   Json? // string[] - relic names

  // MEDIUM PRIORITY
  weaponPreferences   Json? // string[] - weapon types this class excels with
  playstyleRole       String? // "Tank", "DPS", "Support", "Spellcaster"
  remembranceQuests   Json? // QuestStep[] - could be separate model
  journalEntries      Json? // string[] - lore text
  portraitUrl         String?
  compatibleVessels   Json? // string[]
}
```

### New Schema Definitions Needed

```typescript
// For statProgression
export const NightfarerStatProgressionSchema = z.object({
  nightfarerName: z.string(),
  levels: z.array(z.object({
    level: z.number().min(1).max(15),
    hp: z.number(),
    fp: z.number(),
    stamina: z.number(),
  })),
})

// For attributeProgression
export const AttributeProgressionSchema = z.object({
  nightfarerName: z.string(),
  levels: z.array(z.object({
    level: z.number().min(1).max(15),
    vigor: z.number().optional(),
    mind: z.number().optional(),
    endurance: z.number().optional(),
    strength: z.number().optional(),
    dexterity: z.number().optional(),
    intelligence: z.number().optional(),
    faith: z.number().optional(),
    arcane: z.number().optional(),
  })),
})
```

---

## 4. Relic Pages

### Wiki Provides (from audit)
**Infobox:**
- Name ✅ CAPTURED
- Type (Relic) ✅ IMPLIED
- Color Classification ✅ CAPTURED
- Associated Character ❌ NOT CAPTURED
- Acquisition Method ❌ NOT CAPTURED

**Content Sections:**
1. Overview with lore ❌ NOT CAPTURED
2. How to Get section ❌ NOT CAPTURED
3. **Relic Effects & Information** ⚠️ PARTIAL
   - Base effects ✅ CAPTURED
   - **Character-specific mechanics** ❌ NOT CAPTURED
4. Notes & Tips ❌ NOT CAPTURED
5. Cross-references to related systems ❌ NOT CAPTURED
6. Related relic links ❌ NOT CAPTURED

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **Character-Specific Effects** | **HIGH** | Critical gameplay mechanic. Same relic has different effects per Nightfarer. Enables "best relics for Wylder" queries. |
| **Associated Character** | **HIGH** | Primary character synergy for this relic |
| **Acquisition Method** | **HIGH** | Where/how to obtain. Essential for completionist queries. |
| Lore Description | MEDIUM | Flavor text |
| Related Relics | MEDIUM | Cross-reference for builds |
| Notes & Tips | LOW | Strategy guidance |

### Recommended Schema Changes

```prisma
model Relic {
  // ... existing fields ...

  // HIGH PRIORITY
  characterEffects   Json? // RelicCharacterEffect[] - {character, effect}
  associatedCharacter String? // Primary Nightfarer synergy
  acquisitionMethod  String? // "Dropped by X", "Found in Y", "Quest reward"
  location           String? // Where to find it

  // MEDIUM PRIORITY
  lore              String?
  relatedRelics     Json? // string[]
  notesAndTips      String?
}
```

### New Schema Definition Needed

```typescript
export const RelicCharacterEffectSchema = z.object({
  nightfarerName: z.string().describe('Nightfarer class name'),
  effect: z.string().describe('Effect specific to this character'),
})
```

---

## 5. NPC Pages

### Wiki Provides (from audit)
**Infobox:**
- Name ✅ CAPTURED
- Classification (NPC) ✅ IMPLIED
- Game (Nightreign/Elden Ring) ❌ NOT CAPTURED
- Location ✅ CAPTURED
- Character image ❌ NOT CAPTURED

**Content Sections:**
1. Character overview with opening quote ❌ NOT CAPTURED
2. Location information ⚠️ PARTIAL
   - Primary location ✅ CAPTURED
   - **Movement patterns between sub-areas** ❌ NOT CAPTURED
   - **Combat status (can be fought or not)** ❌ NOT CAPTURED
   - **Drops if defeated** ❌ NOT CAPTURED
3. **Dialogue sections (categorized)** ❌ NOT CAPTURED
   - Introduction
   - Visit
   - Recommendation
   - Small Talk (multiple entries)
   - Other dialogue options
4. Notes regarding quests/functionality ⚠️ PARTIAL
5. Related NPCs cross-references ❌ NOT CAPTURED

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **Dialogue System** | **HIGH** | Extensive categorized dialogue. Core narrative content. Enables "what does X say about Y" queries. |
| **Movement Patterns** | **HIGH** | NPC location changes over time/story progression. Critical for "where is X now?" |
| **Combat Data** | **HIGH** | Can NPC be fought? What do they drop? Important for completionism. |
| Opening Quote | MEDIUM | Character flavor/recognition |
| Related NPCs | MEDIUM | Relationship mapping for story queries |
| Character Image | LOW | Visual asset |

### Recommended Schema Changes

```prisma
model NPC {
  // ... existing fields ...

  // HIGH PRIORITY
  dialogue          Json? // NPCDialogue[] - {category, text, conditions?}
  movementPattern   Json? // LocationMovement[] - {location, questStage?, conditions?}
  canBeFought       Boolean? @default(false)
  dropsIfDefeated   Json? // string[] - items dropped

  // MEDIUM PRIORITY
  openingQuote      String?
  relatedNPCs       Json? // string[]
  portraitUrl       String?
}
```

### New Schema Definition Needed

```typescript
export const NPCDialogueSchema = z.object({
  category: z.enum(['introduction', 'visit', 'recommendation', 'smallTalk', 'quest', 'other']),
  text: z.string(),
  conditions: z.string().optional().describe('When this dialogue appears'),
})

export const LocationMovementSchema = z.object({
  location: z.string(),
  sublocation: z.string().optional(),
  questStage: z.string().optional(),
  conditions: z.string().optional(),
})
```

---

## 6. Location Pages

### Wiki Provides (from audit)
**Infobox:**
- Location name ✅ CAPTURED
- Description/lore text ✅ CAPTURED
- Location image ❌ NOT CAPTURED

**Content Sections:**
1. Header/description ✅ CAPTURED
2. Location information overview ✅ CAPTURED
3. **Features/services list** ⚠️ PARTIAL
   - Interactive elements (Codex, Training Yard, etc.) ❌ NOT CAPTURED
   - NPCs present ✅ CAPTURED (via NPC.location)
   - Functionality available ❌ NOT CAPTURED
4. Video guides ❌ NOT CAPTURED
5. **Services detailed subsections** ❌ NOT CAPTURED
   - Each service gets dedicated explanation
   - NPC interactions
6. **Maps and navigation** ❌ NOT CAPTURED
7. Gallery ❌ NOT CAPTURED
8. Notes section ❌ NOT CAPTURED
9. Related locations links ✅ CAPTURED (in `connections`)

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **Interactive Features** | **HIGH** | Hub-specific features (Codex, Training Yard, etc.). Enables "where can I level up?" queries. |
| **Services** | **HIGH** | Detailed service descriptions (upgrade, merchant, etc.). Critical for "where to upgrade weapons?" |
| Map Data/Coordinates | MEDIUM | Navigation aid, but may require custom format |
| Location Type/Category | MEDIUM | "Legacy Dungeon", "Hub", "Field", "Cave" - useful for filtering |
| NPCs Present | MEDIUM | Already captured via reverse relationship, but explicit list helpful |
| Notes & Tips | LOW | Strategy guidance |
| Images/Gallery | LOW | Visual assets |

### Recommended Schema Changes

```prisma
model Location {
  // ... existing fields ...

  // HIGH PRIORITY
  interactiveFeatures Json? // string[] - "Codex", "Training Yard", "Grace"
  services           Json? // LocationService[] - {name, description, npcProvider?}
  locationType       String? // "Hub", "Legacy Dungeon", "Cave", "Field"

  // MEDIUM PRIORITY
  npcsPresent        Json? // string[] - NPC names (denormalized for query performance)
  mapData            Json? // {coordinates?, imageUrl?, connections?}
  notesAndTips       String?
}
```

### New Schema Definition Needed

```typescript
export const LocationServiceSchema = z.object({
  name: z.string().describe('Service name (e.g., "Weapon Upgrade")'),
  description: z.string().describe('What this service does'),
  npcProvider: z.string().optional().describe('NPC who provides this service'),
})
```

---

## 7. Item Pages (Consumables & Key Items)

### Wiki Provides (from audit)
**Infobox:**
- Type (Consumable/Key Item) ✅ CAPTURED
- Max number per slot ❌ NOT CAPTURED
- FP Cost ❌ NOT CAPTURED
- Primary effect description ✅ CAPTURED
- Description (lore) ✅ CAPTURED

**Content Sections:**
1. Item description (lore text) ✅ CAPTURED
2. Effect section (gameplay mechanics) ✅ CAPTURED
3. Where to Find ✅ CAPTURED
4. Notes & Tips ❌ NOT CAPTURED
5. Related items list ❌ NOT CAPTURED

### Gaps Identified

| Missing Field | Priority | Reason |
|---------------|----------|--------|
| **Max Per Slot** | **HIGH** | Inventory limit. Important for "how many X can I carry?" |
| **FP Cost** | **HIGH** | Resource cost to use item. Critical for build planning. |
| **Purchase Info** | MEDIUM | Already captured in schema but may not be populated |
| Related Items | MEDIUM | Cross-reference for similar items |
| Notes & Tips | LOW | Usage guidance |

### Recommended Schema Changes

```prisma
model Item {
  // ... existing fields ...

  // HIGH PRIORITY
  maxPerSlot    Int? // Inventory stack limit
  fpCost        Int? // FP cost to use (for consumables)

  // MEDIUM PRIORITY (already in schema via purchaseLocations JSON)
  // relatedItems  Json? // string[]
  notesAndTips  String?
}
```

---

## Summary Table: Priority Breakdown

### HIGH Priority Gaps (Structured, Queryable, High Value)

| Entity Type | Missing Field | Impact |
|-------------|---------------|--------|
| **Boss** | Attack Pattern Table | Combat strategy queries |
| **Weapon** | Guard Damage Negation | Defensive build queries |
| **Weapon** | Level Requirement | Gating/accessibility queries |
| **Nightfarer** | HP/FP/Stamina Progression (Levels 1-15) | Character progression planning |
| **Nightfarer** | Attribute Progression (Levels 1-15) | Build optimization |
| **Nightfarer** | Starting Equipment | Early game strategy |
| **Nightfarer** | Recommended Relics | Build synergy |
| **Relic** | Character-Specific Effects | Multi-character gameplay |
| **Relic** | Associated Character | Primary synergy identification |
| **Relic** | Acquisition Method | Completionist queries |
| **NPC** | Dialogue System | Narrative/lore queries |
| **NPC** | Movement Patterns | NPC location tracking |
| **NPC** | Combat Data (droppable loot) | Combat/farming queries |
| **Location** | Interactive Features | Hub functionality queries |
| **Location** | Services | "Where can I X?" queries |
| **Item** | Max Per Slot | Inventory management |
| **Item** | FP Cost | Resource planning |

### MEDIUM Priority Gaps (Less Structured, Moderate Value)

- Lore/description fields across all entities
- Cross-reference lists (related X)
- Alternative skills/equipment lists
- Remembrance Quest data (Nightfarer)
- Rune drop structured data (Boss)
- Notes & Tips sections

### LOW Priority Gaps (External/Visual Assets)

- Video guide URLs
- Image URLs/galleries
- Portrait URLs

---

## Implementation Recommendations

### Phase 1: Core Progression Tables (Highest Value)
1. **Nightfarer Progression Tables**
   - Implement `statProgression` (HP/FP/Stamina per level)
   - Implement `attributeProgression` (stats per level)
   - Add schemas in `/apps/scraper/src/normalizer/schemas.ts`
   - Update Prisma model

2. **Boss Attack Patterns**
   - Implement `attackPatterns` table
   - Structured combat data

3. **Weapon Combat Stats**
   - Add `guardNegation` field
   - Add `levelRequirement` field

### Phase 2: Character-Specific Systems
1. **Relic Character Effects**
   - Implement `characterEffects` array
   - Enable "best relics for X character" queries

2. **Nightfarer Starting Equipment & Recommendations**
   - Add `startingEquipment`
   - Add `recommendedRelics`

### Phase 3: Narrative & Location Systems
1. **NPC Dialogue System**
   - Implement categorized dialogue storage
   - Movement pattern tracking

2. **Location Services**
   - Interactive features enumeration
   - Service descriptions

### Phase 4: Polish & Cross-References
1. Related entity links across all types
2. Lore/description fields
3. Notes & Tips sections

---

## Data Richness Comparison

Based on the audit, here's how entity types rank by **structured data available but NOT captured**:

1. **Nightfarer** - Missing 2 major progression tables (15 levels each) + equipment + quests
2. **Relic** - Missing character-specific effects (critical multiplier)
3. **NPC** - Missing extensive dialogue system + movement patterns
4. **Boss** - Missing attack pattern tables
5. **Location** - Missing service/feature enumeration
6. **Weapon** - Missing guard stats + level requirements
7. **Item** - Missing inventory/FP cost constraints

---

## Sources

- AI_RESEARCH/2026-01-12-fextralife-wiki-page-structure-audit.md
- AI_RESEARCH/2026-01-12-fextralife-weapon-table-structure.md
- /packages/database/prisma/schema.prisma
- /apps/scraper/src/normalizer/schemas.ts
- /packages/types/src/index.ts

---

## Next Steps

### Recommended Agent Handoffs

1. **For Nightfarer Progression Tables** (HIGH priority, parallel to weapon upgrades):
   - **typescript-expert**: Create `NightfarerStatProgressionSchema` and `AttributeProgressionSchema`
   - **system-architecture-reviewer**: Review schema changes for Nightfarer model

2. **For Boss Attack Patterns** (HIGH priority):
   - **typescript-expert**: Create `BossAttackPatternSchema`
   - Update `NormalizedBossSchema` in schemas.ts

3. **For Relic Character Effects** (HIGH priority):
   - **typescript-expert**: Create `RelicCharacterEffectSchema`
   - Update `NormalizedRelicSchema`

4. **For NPC Dialogue System** (HIGH priority):
   - **system-architecture-reviewer**: Design dialogue storage strategy (JSON vs. separate table)
   - **typescript-expert**: Implement chosen approach

5. **For All Schema Updates**:
   - **nextjs-expert**: Update scraper/normalizer to extract new fields
   - **unit-test-maintainer**: Add tests for new schema validations

### Monitoring

- Track wiki data population status for Nightfarer progression tables
- Prioritize implementing schemas for data that's already available on wiki
- Consider manual data entry for small, high-value datasets (like attack patterns)
