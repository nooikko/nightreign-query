# Research: Fextralife Elden Ring Nightreign Wiki Page Structure Audit
Date: 2026-01-12

## Summary

This research documents the page structure, infobox fields, content sections, and data richness for different entity types on the Fextralife Elden Ring Nightreign wiki (https://eldenringnightreign.wiki.fextralife.com). The audit examined seven distinct entity types to understand data parity and available fields for each content category.

## Wiki Overview

**Base URL**: https://eldenringnightreign.wiki.fextralife.com/Elden+Ring+Nightreign+Wiki

**Main Category Pages**:
- Items: `/Items`
- Bosses: `/Bosses`
- Weapons: `/Weapons`
- NPCs: `/NPCs`
- Locations: `/Locations`
- Nightfarers (Classes): `/Nightfarers+(Classes)`
- Relics: `/Relics`

## Entity Type Analysis

### 1. Boss Pages

**Example Examined**: Nameless King (`/Nameless+King`)

#### Infobox Fields
- HP (solo/trio for both phases)
- Stance values
- Parryability status
- Damage types dealt
- Special weaknesses
- Damage negation percentages (Standard, Slash, Strike, Pierce)
- Elemental resistances (Magic, Fire, Lightning, Holy)
- Status effect resistances (Poison, Scarlet Rot, Blood Loss, Frostbite, Sleep, Madness)
- Rune drops (solo and trio values)
- Boss reward reference

#### Content Sections
1. Boss overview
2. Phase-specific combat information (multiple phases if applicable)
3. Boss guide
4. Video guides
5. Fight strategy (broken down by playstyle: Melee, Magic/Ranged)
6. Attacks & Counters table (attack name, description, counter strategy)
7. Lore, notes & trivia
8. Image gallery
9. Related bosses links
10. User discussion section

#### Data Richness: **Very High**
- Detailed combat statistics for each phase
- Comprehensive resistance tables
- Attack pattern documentation with counters
- Strategic guides for different playstyles
- Video content
- Lore integration

---

### 2. Weapon Pages

**Example Examined**: Moonveil (`/Moonveil`)

#### Infobox Fields
- Attack Power (Physical, Magic, Fire, Light, Holy)
- Critical damage
- Guard Damage Negation (Physical, Magic, Fire, Light, Holy, Boost)
- Attribute Scaling (STR, DEX, INT, FAI, ARC - letter grades)
- Weapon Type
- Level Requirement
- Attack Affinity (damage types)
- Status Ailment (e.g., Hemorrhage with buildup value)
- Weapon Skill
- Unique Weapon Effect

#### Content Sections
1. Weapon title with image
2. Notes & Tips
3. Potential passive benefits
4. Potential weapon skills
5. Quality upgrades section
6. Class-specific upgrade tables (8 tables, one per Nightfarer class)
   - Levels 1-15
   - Four quality tiers (Common, Rare, Epic, Legendary)
   - Attack Power and Damage Negation columns
7. Descriptive lore text
8. Discussion/comment threads
9. Related weapons list

#### Data Richness: **Very High**
- Extremely detailed stat tables
- Class-specific progression data (8 separate upgrade paths)
- 15 upgrade levels × 4 quality tiers × 8 classes = 480 stat entries per weapon
- Scaling information
- Multiple damage type breakdowns

---

### 3. NPC Pages

**Example Examined**: Iron Menial (`/Iron+Menial`)

#### Infobox Fields
- Name
- Classification (NPC)
- Game (Nightreign/Elden Ring)
- Location
- Character image

#### Content Sections
1. Character overview with opening quote
2. Location information
   - Primary location
   - Movement patterns between sub-areas
   - Combat status (can be fought or not)
   - Drops if defeated
3. Dialogue sections (categorized)
   - Introduction
   - Visit
   - Recommendation
   - Small Talk (multiple entries)
   - Other dialogue options
4. Notes regarding quests/functionality
5. Related NPCs cross-references
6. User discussion thread

#### Data Richness: **Medium-High**
- Comprehensive dialogue documentation
- Location tracking including movement patterns
- Quest integration notes
- Relationship mapping to other NPCs
- Less mechanical data than combat-oriented entities

---

### 4. Location Pages

**Example Examined**: Roundtable Hold (`/Roundtable+Hold`)

#### Infobox Fields
- Location name
- Description/lore text
- Location image

#### Content Sections
1. Header/description
2. Location information overview
3. Features/services list
   - Interactive elements (Codex, Training Yard, etc.)
   - NPCs present
   - Functionality available
4. Video guides section
5. Services detailed subsections
   - Each service gets dedicated explanation
   - NPC interactions
6. Maps and navigation
7. Gallery
8. Notes section
9. Related locations links
10. Discussion/comments thread

#### Data Richness: **High**
- Comprehensive service documentation
- NPC roster with cross-links
- Interactive feature enumeration
- Visual aids (maps, images)
- Hub locations particularly well-documented
- May vary for smaller locations

---

### 5. Item Pages (Consumables)

**Example Examined**: Flask of Crimson Tears (`/Flask+of+Crimson+Tears`)

#### Infobox Fields
- Type (Consumable/Key Item)
- Max number per slot
- FP Cost
- Primary effect description

#### Content Sections
1. Item description (lore text)
2. Effect section (gameplay mechanics)
3. Where to Find
4. Notes & Tips
5. Related items list (comprehensive alphabetical directory)
6. Discussion section

#### Data Richness: **Medium**
- Basic mechanical data
- Location information (when available)
- Usage guidance
- Less detailed than weapons/bosses
- Some location data may be incomplete ("Location goes here" placeholders)

---

### 6. Item Pages (Key Items/Relics)

**Examples Examined**:
- Stonesword Key (`/Stonesword+Key`)
- Golden Sprout (`/Golden+Sprout`)

#### Infobox Fields (Key Items like Stonesword Key)
- Type
- Max per slot
- FP Cost
- Description

#### Infobox Fields (Relics like Golden Sprout)
- Name
- Type (Relic)
- Color Classification
- Associated Character
- Acquisition Method

#### Content Sections (Key Items)
1. Effect in game
2. Where to Find (detailed location types)
3. Notes & Tips
4. Related consumables list

#### Content Sections (Relics)
1. Overview with lore
2. How to Get section
3. Relic Effects & Information (detailed mechanics)
4. Character-specific mechanics
5. Notes & Tips
6. Cross-references to related systems
7. Navigation breadcrumbs
8. Related relic links (120+ items)
9. Discussion section

#### Data Richness: **Medium-High**
- Relics have significantly more detail than basic consumables
- Character-specific interactions documented
- Acquisition methods detailed
- System integration cross-referenced

---

### 7. Nightfarer (Character/Class) Pages

**Example Examined**: Wylder (`/Wylder`)

#### Infobox Fields
- HP/FP/Stamina stats
- Attribute ratings (STR, DEX, INT, FAI, ARC - letter grades)
- Starting vessel
- Portrait image

#### Content Sections
1. Ability documentation (three types)
   - Passive ability
   - Character Skill
   - Ultimate Art
2. Key features (weapon preferences, role, playstyle)
3. Ability breakdowns (detailed mechanics)
4. Starting equipment specifications
5. Video guides
6. Attribute progression table (levels 1-15)
7. Character progression table (HP/FP/Stamina scaling)
8. Vessel gallery (compatible equipment)
9. Relic recommendations
10. Notes & Tips
11. Remembrance Quest walkthrough (multi-chapter)
12. Journal entries (lore narrative)
13. Related Nightfarer links
14. Community discussion

#### Data Richness: **Very High**
- Comprehensive stat progression data
- Multiple ability types documented
- Equipment compatibility
- Quest integration
- Lore narrative
- Build recommendations
- Similar depth to boss pages

---

## Comparative Analysis

### Data Richness Ranking (Highest to Lowest)

1. **Weapons** - Extremely detailed with class-specific upgrade tables (480+ data points per weapon)
2. **Bosses** - Comprehensive combat data, resistance tables, strategy guides
3. **Nightfarers** - Complete character progression, abilities, quests, lore
4. **Relics** - Character-specific effects, system integration, acquisition details
5. **Locations** - Feature documentation, NPC rosters, services (varies by location type)
6. **NPCs** - Dialogue, locations, quests, relationships
7. **Consumables/Basic Items** - Minimal data, some incomplete location info

### Common Patterns Across Entity Types

**All pages include**:
- Infobox with key stats/metadata
- Image/visual representation
- Descriptive lore text
- Notes & Tips section
- Related entities cross-links
- User discussion/comments section
- Navigation breadcrumbs

**Combat-related entities (Bosses, Weapons, Nightfarers) include**:
- Detailed numerical statistics
- Progression/upgrade tables
- Strategy/build recommendations
- Video guides

**Non-combat entities (Items, NPCs, Locations) include**:
- Where to find/how to acquire
- Functionality/purpose description
- Less numerical data, more narrative

### Section Standardization

The wiki uses relatively standardized templates per entity type:
- Section naming is consistent within entity types
- Infobox structures are templated
- Table formats are uniform (especially for stats/upgrades)

### Content Completeness Observations

**Well-documented**:
- Boss combat statistics
- Weapon upgrade paths
- Character progression
- Relic effects

**Potentially incomplete**:
- Item locations (some have "Location goes here" placeholders)
- Smaller location pages (less detail than hub areas)
- Some NPC dialogue sections may be incomplete

## Data Parity Assessment

### High Data Parity
- Bosses, Weapons, and Nightfarers have extremely comprehensive, comparable data richness
- All three types include detailed numerical progression, strategic guidance, and mechanical depth

### Medium Data Parity
- Locations and NPCs have good structural documentation
- Focus is narrative/functional rather than statistical
- Data depth appropriate for non-combat entities

### Lower Data Parity
- Basic consumable items have minimal fields
- Some pages show incomplete data (placeholders)
- Less emphasis on detailed mechanical information

### Overall Assessment
**The wiki demonstrates strong data parity within entity categories** (combat vs. non-combat). Combat-related entities (weapons, bosses, characters) receive extensive statistical documentation, while narrative entities (NPCs, locations, basic items) receive appropriate functional/story documentation. The data richness is well-matched to the entity type's gameplay relevance.

## Key Takeaways for Implementation

1. **Expect varying levels of detail**: Combat entities will have 10-20× more data fields than basic items
2. **Class-specific variations are significant**: Weapons have 8 separate upgrade paths (one per Nightfarer class)
3. **Tables dominate numerical data**: Upgrade tables, stat tables, attack tables, progression tables
4. **Location data may be inconsistent**: Some items have detailed "Where to Find" sections, others have placeholders
5. **Dialogue is heavily documented**: NPCs have extensive categorized dialogue sections
6. **Cross-referencing is extensive**: Every page links to related entities of the same and different types
7. **Video content supplements text**: Many entity types include embedded guides
8. **Community content is integrated**: Discussion threads are part of standard page structure

## Technical Implementation Considerations

### Database Schema Implications
- Need flexible schema to handle vastly different field counts per entity type
- Class-specific data requires junction tables or JSON columns
- Progression tables need dedicated structures (not flat fields)
- Consider separate tables for: base stats, upgrade stats, dialogue, location data

### Scraping Strategy
- Different parsers needed per entity type due to structure variation
- Infobox parsing must be template-aware
- Table extraction is critical for weapons/bosses/characters
- Handle placeholder content gracefully ("Location goes here")
- Cross-reference extraction for relationship mapping

### Data Validation
- Expect incomplete data for some entity types
- Validate numerical data where present
- Track data completeness per entity
- Flag placeholder content for manual review

## Sources

All information gathered from official Fextralife Elden Ring Nightreign Wiki pages:
- Main Wiki: https://eldenringnightreign.wiki.fextralife.com/Elden+Ring+Nightreign+Wiki
- Boss Example: https://eldenringnightreign.wiki.fextralife.com/Nameless+King
- Weapon Example: https://eldenringnightreign.wiki.fextralife.com/Moonveil
- NPC Example: https://eldenringnightreign.wiki.fextralife.com/Iron+Menial
- Location Example: https://eldenringnightreign.wiki.fextralife.com/Roundtable+Hold
- Consumable Example: https://eldenringnightreign.wiki.fextralife.com/Flask+of+Crimson+Tears
- Key Item Example: https://eldenringnightreign.wiki.fextralife.com/Stonesword+Key
- Relic Example: https://eldenringnightreign.wiki.fextralife.com/Golden+Sprout
- Nightfarer Example: https://eldenringnightreign.wiki.fextralife.com/Wylder

Research conducted: 2026-01-12
