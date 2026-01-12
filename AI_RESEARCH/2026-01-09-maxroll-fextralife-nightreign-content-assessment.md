# Research: Maxroll.gg and Fextralife Elden Ring Nightreign Content Assessment

Date: 2026-01-09

## Summary

Both Maxroll.gg and Fextralife provide comprehensive Elden Ring Nightreign content with distinct organizational approaches. Fextralife offers more granular, structured data in table formats suitable for scraping, while Maxroll provides narrative guides with database links. Both sites have explicit anti-scraping policies in their robots.txt and ToS. The game was released May 30, 2025, with DLC released December 4, 2025, making content relatively stable but subject to ongoing updates.

## Prior Research

No prior AI_RESEARCH files consulted - this is initial research for the Nightreign query application.

## Current Findings

### 1. Maxroll.gg Nightreign Content

#### Available Pages/Sections

**Primary Navigation:**
- `/elden-ring-nightreign` - Main hub
- `/elden-ring-nightreign/database` - Central database (React app, dynamically loaded)
- `/elden-ring-nightreign/guides/` - Guide section
- `/elden-ring-nightreign/characters/` - Character guides

**Content Categories (Confirmed via database):**
- Weapons
- Skills
- Sorceries
- Incantations
- Relics
- Talismans
- Talents
- Characters (Nightfarers)
- Passives

**Specific Guides Identified:**
- Beginner's Guide
- Limveld Map & Key Locations
- Roundtable Hold
- Relics & Vessels Guide
- Incantation & Sorcery Types
- Expedition Progression Guide
- Shifting Earth Events
- Raid Event Guide
- Individual character guides for all 9 Nightfarers (Guardian, Wylder, Ironeye, Recluse, Duchess, Raider, Executor, Revenant, Scholar)

#### URL Structure

Pattern: `https://maxroll.gg/elden-ring-nightreign/[section]/[slug]`

Examples:
- `https://maxroll.gg/elden-ring-nightreign/characters/guardian-character-guide`
- `https://maxroll.gg/elden-ring-nightreign/guides/relics-vessels-guide`
- `https://maxroll.gg/elden-ring-nightreign/database`
- `https://maxroll.gg/elden-ring-nightreign/database/passives`

#### Data Format

**Guides:** Primarily **prose-based** with embedded item links. Structure includes:
- Descriptive paragraphs
- Inline links to database items
- Image sliders showing gameplay
- Subsections for specific mechanics
- Pros/Cons visual comparisons
- Strategic recommendations

**Example from Guardian guide:**
> "Certain weapons are usable from behind a shield, so maximizing your Guard Boost is very important as it facilitates better damage output."

**Database:** React application with dynamically loaded content. Actual data structure not visible in HTML (requires JavaScript execution). Database mentions organizing by:
- Item categories
- Searchable/filterable interfaces
- Individual item pages

**Content Depth:** Hybrid guide-wiki approach - narrative-driven strategy guides that link to structured database entries.

#### API Availability

**No public API identified.** The database appears to be a client-side React application that fetches data, but no documented API endpoints found. The database update news mentions "expanded Nightfarer stats, weapon Scaling, Skills, & Passives & searchable relic modifiers" but no JSON/API access documented.

#### Anti-Bot Measures

**robots.txt Analysis:**
- **Explicit prohibition:** "Use of any robot, crawler, or other tool to scrape, harvest, extract, or retrieve any content on this website using automated means is prohibited without written permission."
- **User-agent blocks:** Disallows GPTBot, Claude-SearchBot, PerplexityBot, Amazonbot, and other AI/scraping bots
- **Standard crawlers:** Allow general web crawlers with limited restrictions
- **No specific Elden Ring Nightreign blocks** in paths
- **Prohibited uses:** AI training, machine learning development, data mining
- **Contact for exceptions:** licensing@ziffdavis.com

**Ownership:** Maxroll.gg is owned by IGN Entertainment, Inc. (a Ziff Davis brand) as of 2026. Copyright restrictions apply.

**Existing scrapers:** GitHub project exists for Diablo IV data (BeautifulSoup/Selenium), indicating scraping is technically feasible but not officially sanctioned.

---

### 2. Fextralife Nightreign Wiki

#### Available Pages/Sections

**Dedicated Wiki:** `https://eldenringnightreign.wiki.fextralife.com/`

**Major Categories:**

1. **Character:**
   - Nightfarers (Classes)
   - Skills
   - Dormant Powers
   - Stats
   - Relics
   - Vessels
   - Builds
   - Gestures

2. **Equipment & Magic:**
   - Weapons (by type with damage/effects)
   - Shields
   - Weapon Skills
   - Spells (Sorceries/Incantations)
   - Talismans
   - Upgrades
   - Garbs/Skins
   - Items

3. **World:**
   - Map
   - Locations
   - Sites of Grace
   - Roundtable Hold
   - Expeditions
   - Events
   - NPCs
   - Merchants
   - Creatures/Enemies
   - Bosses
   - Lore
   - Remembrance Quests

4. **Guides:**
   - Walkthrough
   - Game Progress Route
   - Endings
   - New Game Plus
   - Boss Tactics
   - Achievements

5. **General:**
   - Patch Notes
   - DLC
   - Network Test
   - Combat Mechanics
   - Solo/Duo Mode Guides
   - FAQs

#### URL Structure

Pattern: `https://eldenringnightreign.wiki.fextralife.com/[Page+Name+With+Plus+Signs]`

Examples:
- `/Bosses`
- `/Weapons`
- `/Nightfarers+(Classes)`
- `/Skills`
- `/Relics`
- `/Magic+Spells`
- `/Black+Knife` (individual weapon)
- Individual boss pages (e.g., `/Night+Lord+Gideon+Ofnir`)

#### Data Format

**Highly structured with extensive tables:**

**Bosses Page:**
- Multiple categorical sections (Night Lords, Night Bosses, Evergaol, Field, Location, Remembrance, Shifting Earth, Event)
- Boss entries include:
  - Name and location/expedition
  - Type classification
  - Rewards (linked pages)
  - **Detailed resistance tables** with damage type percentages
  - Status effect buildup values
  - Quote: "The negation numbers are the % of your damage that gets blocked...Bigger number = less damage. A negation of 100 means no damage goes through."
- Individual boss pages linked from main list

**Weapons Page:**
- Organized by weapon type (Daggers, Straight Swords, Greatswords, Halberds, etc.)
- **Individual weapon pages** with comprehensive data

**Individual Weapon Page (Black Knife example):**
- Basic stats table:
  - Attack Power (Physical, Magical, Fire, Lightning, Holy, Critical)
  - Guard Damage Negation across all types
  - Attribute Scaling (STR, DEX, FAI ratings)
- Equipment details: Type, level requirement, attack affinity, status ailments, weapon skill
- **Upgrade progression tables** for each Nightfarer class (8 tables)
  - Quality tiers: Common, Rare, Epic, Legendary
  - Level progression (Lv 1-15)
  - Attack power and damage negation by tier
- Passive benefits section
- Weapon skills list
- Related weapon links
- Lore text
- Community discussion threads

**Relics Page:**
- **Color-coded categorization** (Red/Burning, Green/Tranquil, Blue/Drizzly, Yellow/Luminous)
- **Quality tiers** (Delicate=1 effect, Polished=2, Grand=3)
- Gallery sections with visual icons
- **Comparison tables:** Name, equipped character, color, acquisition, effects
- Separate tables for depths relics
- Effects categorized as: Offensive, Defensive, Utility, Attribute/Stats, Status Effect, Character-specific
- Character-exclusive abilities tagged (e.g., [Guardian])
- Quote: "Relics come with up to three effects, and each character can equip up to three relics on their designated vessels."

**Skills Page:**
- Structured table with columns:
  - Skill Name (clickable links)
  - FP Cost
  - Usable Armament Types
  - Effect Description
- Quick Search functionality
- Sortable columns
- Note: "some weapons will now have different skills than what they had in Elden Ring"

**Talismans Page:**
- Hybrid format:
  - Individual dedicated pages
  - Comprehensive searchable comparison table
  - Visual gallery with clickable links
- Information includes:
  - Effect descriptions (e.g., "Improved Physical Damage Negation +15%")
  - Acquisition methods (Teardrop Scarabs, chests, Dormant Powers, merchants)
  - Strategic pairing recommendations
  - Equip limit: "Players can equip up to 2 Talismans at a time"

**Nightfarers Page:**
- Visual tables comparing all 8 Nightfarers
- Individual character cards with icons, descriptions, stats
- Core attributes:
  - HP, FP, Stamina
  - Six stats (STR, DEX, INT, FAI, ARC, +1)
  - Starting equipment and weapons
  - Associated Vessel
- Abilities:
  - One Passive Ability (unique)
  - One Character Skill
  - One Ultimate Art
- Linked ability pages for detailed mechanics
- Remembrance Quests
- Build recommendations
- Quote: "every Nightfarer can use every Weapon in the game, and no Nightfarer is locked out of using any weapon"

#### Data Quality vs Maxroll

**Fextralife Strengths:**
- More granular, tabular data structure
- Comprehensive stat tables with numerical values
- Consistent page templates (especially for items)
- Individual pages for nearly every game element
- Better for programmatic data extraction
- Community-contributed (though moderation noted as limited per external critiques)

**Maxroll Strengths:**
- More narrative strategy guides
- Better contextual explanations
- Professional editorial voice
- Strategic recommendations integrated into content
- Image sliders and visual learning aids
- Recent database updates (expanded stats, scaling info)

**Data Quality Issues:**
- Fextralife has community concerns about accuracy (noted in search results - "beacon of misinformation" critique, limited community editing access)
- Maxroll more professionally curated but less detailed stat tables on guide pages
- For raw data extraction: **Fextralife superior**
- For strategic understanding: **Maxroll superior**

#### Known Scraping Challenges

**robots.txt Analysis:**
- **General restrictions:**
  - Disallow: `/forums/search.php`, `/login`, `/register`, `/forums/ucp.php*`
  - Disallow: `/authentication`, `/filemanager`, `/changes`, `/settings`
  - Disallow: `/Editing+Guide`, `/ws/*`, `/pixel.png*`
- **GPTBot completely blocked:** `Disallow: /`
- **Most public content accessible** to standard crawlers
- Sitemap provided for discoverability

**Terms of Service (via search results):**
- Owned by **Valnet Inc.**
- Articles are "original works protected under applicable copyrights"
- Safe Harbor policies for user-generated content
- DMCA compliance and repeat infringer policy
- Accounts/IPs terminated for copyright violations
- Contributors responsible for verifying public domain/ownership

**Fandom Wiki Alternative:**
- `https://eldenring.fandom.com/wiki/Elden_Ring_Nightreign` exists
- **Creative Commons CC-BY-SA license** on content
- May be more legally permissive for data use with attribution
- Less comprehensive than Fextralife dedicated wiki

#### Additional Resources Identified

1. **Game8 Wiki:** `https://game8.co/games/Elden-Ring-Nightreign`
2. **PureEldenRing:** `https://www.pureeldenring.com` (database, forums, maps)
3. **PCGamingWiki:** `https://www.pcgamingwiki.com/wiki/Elden_Ring_Nightreign`
4. **Official Site:** `https://en.bandainamcoent.eu/elden-ring/elden-ring-nightreign`

---

### 3. Content Inventory Needed for App

Based on site examination, here's what's available:

#### Boss Guides
**Availability:** ✅ Comprehensive

**Sources:**
- Fextralife: Categorized boss lists with resistance tables, individual pages
- Maxroll: Strategy guides integrated into progression/event guides

**Data Structure:**
- Weaknesses: Detailed resistance tables (Fextralife)
- Strategies: Prose guides (Maxroll), tactical guides (Fextralife)
- Phases: Mentioned in guides but not systematically tabulated
- Rewards: Listed and linked on both sites

**Boss Categories Available:**
- Night Lords (8 + Everdark Sovereign variants)
- Night Bosses (Night 1 and Night 2)
- Evergaol Bosses
- Field Bosses (normal and formidable)
- Location Bosses (by dungeon type)
- Remembrance Bosses
- Shifting Earth Bosses
- Event Bosses

#### Weapons
**Availability:** ✅ Comprehensive

**Data Available (Fextralife):**
- Attack Power (all damage types + Critical)
- Guard Damage Negation
- Attribute Scaling (STR, DEX, FAI, etc.)
- Weapon type classification
- Level requirement
- Attack affinity (Slash/Pierce/Strike)
- Status ailments
- Weapon skills
- **Upgrade tables per Nightfarer** (8 separate tables)
  - Quality tiers: Common, Rare, Epic, Legendary
  - 15 levels per tier
  - Scaling values by character
- Passive effects (random per weapon)
- Lore descriptions

**Data Available (Maxroll):**
- Weapon recommendations in character guides
- Strategic usage context
- Passive effects database
- Links to weapon entries

#### Relics
**Availability:** ✅ Comprehensive

**Data Available:**
- Color coding (4 types)
- Quality tiers (3 levels)
- Effect descriptions
- Offensive/Defensive/Utility categorization
- Character-specific effects tagged
- Acquisition methods
- Fixed vs. random generation rules
- Combination mechanics
- Visual gallery

#### Nightfarers (Characters)
**Availability:** ✅ Complete (9 characters with DLC)

**Data Available:**
- Base stats (HP, FP, Stamina)
- Attribute ratings (STR, DEX, INT, FAI, ARC)
- Starting equipment
- Passive Ability
- Character Skill
- Ultimate Art
- Associated Vessel
- Remembrance Quests
- Build recommendations
- Stat comparison tables

**Characters:**
- Guardian
- Wylder
- Ironeye
- Recluse
- Duchess
- Raider
- Executor
- Revenant
- Scholar (DLC - The Forsaken Hollows)
- Undertaker (DLC - The Forsaken Hollows)

#### Skills/Spells
**Availability:** ✅ Comprehensive

**Data Available:**
- Skill name
- FP cost
- Usable weapon types
- Effect descriptions
- Sorcery vs. Incantation categorization
- Individual skill pages

#### Items/Talismans
**Availability:** ✅ Comprehensive

**Talismans:**
- Effect values (numerical)
- Acquisition methods
- Equip limit (2 max)
- Strategic recommendations
- Visual gallery + searchable table

**Items:**
- Categorized by type
- Acquisition methods
- Effects/uses

---

### 4. Data Freshness and Stability

#### Release Timeline
- **Network Test:** February 14-17, 2025
- **Full Release:** May 30, 2025
- **First DLC (The Forsaken Hollows):** December 4, 2025 ($15, added Scholar and Undertaker Nightfarers)

#### Content Stability
**Relatively stable but ongoing updates:**

1. **Maxroll Database Updates:**
   - Recent updates noted for "expanded Nightfarer stats, weapon Scaling, Skills, & Passives & searchable relic modifiers"
   - Quote: "Over the past few weeks, they've made updates to provide more clarity about some of the game's more obscure mechanics, such as Nightfarer and weapon scaling"
   - Active development continues

2. **DLC Expansion:**
   - Released December 2025 (2 months ago)
   - Adds 2 new Nightfarers
   - Likely additional items, relics, bosses

3. **Update Frequency:**
   - Patch notes tracked (Fextralife)
   - Balance changes possible
   - New content releases expected

4. **Community Contribution:**
   - Fextralife is community-edited (though with limitations noted)
   - Data accuracy improves over time but requires verification
   - Maxroll professionally maintained, slower but more accurate

**Recommendation:** Data is stable enough for scraping but should implement:
- Version tracking
- Regular update checks
- Data validation against multiple sources
- Change detection for patch updates

---

## Scraping Complexity Assessment

### Technical Complexity

#### Fextralife
**Difficulty: Medium**

**Pros:**
- Clean HTML structure with tables
- Consistent URL patterns (`/Page+Name`)
- Individual pages for items
- Tabular data ideal for extraction
- Standard web scraping techniques applicable

**Cons:**
- Plus-sign URL encoding
- Some pages may require JavaScript (check individual pages)
- Nested tables for complex data (e.g., weapon upgrade tables)
- Community discussions intermixed with data

**Recommended Tools:**
- BeautifulSoup or Cheerio for HTML parsing
- Standard HTTP requests (no heavy JavaScript likely)
- CSS selectors for table extraction

**Example Scraping Strategy:**
1. Fetch category pages (e.g., `/Weapons`, `/Bosses`)
2. Extract links to individual item pages
3. Parse individual pages for detailed stats
4. Extract tables using table selectors
5. Store structured JSON

#### Maxroll
**Difficulty: High**

**Pros:**
- Clean URL structure
- Professional content organization
- Database exists with categorized data

**Cons:**
- **React application:** Database content loaded via JavaScript
- HTML source may not contain actual data (client-side rendering)
- Requires browser automation (Puppeteer/Playwright/Selenium)
- Prose-heavy guides harder to extract structured data
- Database structure not visible in static HTML

**Recommended Tools:**
- Puppeteer or Playwright for JavaScript execution
- Wait for React components to load
- Extract from rendered DOM
- May need to intercept network requests to capture JSON data

**Example Scraping Strategy:**
1. Use headless browser
2. Navigate to database pages
3. Wait for React to render
4. Extract rendered data from DOM
5. OR intercept API calls to get raw JSON (if available)

### Legal/Policy Complexity

#### Both Sites: High Risk

**Maxroll:**
- ❌ Explicit prohibition in robots.txt
- ❌ AI bots specifically blocked
- ❌ Terms require written permission
- ❌ Owned by IGN/Ziff Davis (large corporation with legal resources)
- ⚠️ GitHub scrapers exist for other games (technical feasibility proven)
- 📧 Contact required: licensing@ziffdavis.com

**Fextralife:**
- ❌ GPTBot completely blocked
- ⚠️ General crawlers partially allowed
- ❌ Copyright protection under Valnet Inc.
- ❌ DMCA enforcement and repeat infringer policy
- ⚠️ Community contributions complicate ownership
- ⚠️ External critiques of accuracy/practices

**Fandom Wiki (Alternative):**
- ✅ CC-BY-SA license (more permissive)
- ✅ Attribution allows reuse
- ⚠️ Less comprehensive than dedicated wikis
- ⚠️ May lag in updates

### Recommended Approach

#### Option 1: Manual Data Entry (Safest)
**Pros:**
- No legal issues
- Ensures data accuracy
- Can add own insights
- Full control over structure

**Cons:**
- Time-intensive
- Requires game knowledge
- Ongoing maintenance burden

#### Option 2: Fandom Wiki Scraping (Lower Risk)
**Pros:**
- CC-BY-SA license permits reuse with attribution
- Legal clarity
- Standard wiki format

**Cons:**
- Less comprehensive
- May have outdated info
- Still requires proper attribution
- Smaller community

#### Option 3: Request Permission (Uncertain)
**Pros:**
- Legal if granted
- Could establish partnership
- Professional approach

**Cons:**
- Likely to be denied
- Time delay
- May request fees/licensing

#### Option 4: Limited Fair Use Scraping (Grey Area)
**Pros:**
- Technically feasible
- Comprehensive data
- Educational/reference use may qualify

**Cons:**
- Legal risk (violates ToS)
- Ethical concerns
- Could face C&D or legal action
- Damages relationship with community

#### Option 5: Community Collaboration
**Pros:**
- Builds goodwill
- Shared maintenance
- Legal clarity
- Open source spirit

**Cons:**
- Requires coordination
- Quality control challenges
- Slower development

---

## Target URLs/Sections Per Source

### Primary Target: Fextralife (Technical Preference)

#### Core Data Pages
```
Base: https://eldenringnightreign.wiki.fextralife.com/

Categories:
/Bosses                    - Boss list with categories
/Weapons                   - Weapons by type
/Skills                    - Skills table
/Relics                    - Relics with effects
/Talismans                 - Talismans with effects
/Nightfarers+(Classes)     - Character stats and abilities
/Magic+Spells              - Sorceries and Incantations
/Items                     - Items list
/Dormant+Powers            - Dormant powers
/NPCs                      - NPC list
/Locations                 - Location guide
/Map                       - Map information
```

#### Individual Item Pages (Examples)
```
/Black+Knife               - Individual weapon
/[Weapon+Name]             - Pattern for other weapons
/[Boss+Name]               - Individual boss pages
/[Skill+Name]              - Individual skill pages
/Guardian                  - Individual Nightfarer
/[Character+Name]          - Other characters
```

#### Scraping Priority Order
1. **High Priority (Core Data):**
   - Nightfarers (9 pages)
   - Weapons (enumerate from `/Weapons` page)
   - Bosses (enumerate from `/Bosses` page)
   - Relics (table on main page)
   - Skills (table on main page)

2. **Medium Priority (Supporting Data):**
   - Talismans
   - Spells/Magic
   - Dormant Powers
   - Items

3. **Low Priority (Context):**
   - Locations
   - NPCs
   - Lore pages

### Secondary Source: Maxroll (Strategic Guidance)

#### Guide Pages
```
Base: https://maxroll.gg/elden-ring-nightreign/

Guides:
/guides/beginner-guide                    - Beginner overview
/guides/limveld-map-key-locations         - Map guide
/guides/relics-vessels-guide              - Relics system
/guides/incantation-sorcery-types         - Magic guide
/guides/expedition-progression-guide      - Progression
/guides/roundtable-hold                   - Hub guide
```

#### Character Guides
```
/characters/guardian-character-guide      - Guardian
/characters/wylder-character-guide        - Wylder
/characters/ironeye-character-guide       - Ironeye
/characters/recluse-character-guide       - Recluse
/characters/duchess-character-guide       - Duchess
/characters/raider-character-guide        - Raider
/characters/executor-character-guide      - Executor
/characters/revenant-character-guide      - Revenant
```

#### Database (Requires JavaScript)
```
/database                                 - Main database
/database/passives                        - Passives list
/database/[category]                      - Other categories (TBD)
```

**Note:** Maxroll database would require browser automation to render React components.

---

## Legal/ToS Considerations

### Maxroll.gg
1. **Ownership:** IGN Entertainment, Inc. (Ziff Davis brand)
2. **Explicit Prohibition:** robots.txt states automated scraping prohibited without written permission
3. **AI Bot Blocks:** GPTBot, Claude-SearchBot, PerplexityBot explicitly disallowed
4. **Copyright:** Content protected, reproduction requires permission
5. **Prohibited Uses:** AI training, ML development, data mining
6. **Contact:** licensing@ziffdavis.com for written permission
7. **Enforcement:** Large corporation with legal resources

### Fextralife
1. **Ownership:** Valnet Inc.
2. **Copyright:** Articles are "original works protected under applicable copyrights"
3. **User Content:** Safe Harbor policies, contributors verify public domain/ownership
4. **DMCA:** Active enforcement, repeat infringer termination
5. **robots.txt:** GPTBot blocked completely, general crawlers partially allowed
6. **Restricted Paths:** Admin areas, editing tools, search, user accounts disallowed
7. **Community Concerns:** External critiques about accuracy and editing access
8. **Enforcement:** DMCA takedowns, account/IP bans for violations

### Fandom Wiki Alternative
1. **License:** Creative Commons CC-BY-SA
2. **Permissions:** Reuse allowed with attribution
3. **Requirements:** Must attribute, share-alike license
4. **Scope:** Less comprehensive than dedicated wikis
5. **Updates:** May lag behind Fextralife/Maxroll

### Fair Use Considerations
- **Educational/Reference Purpose:** May qualify for fair use
- **Transformative Use:** Query app adds value beyond copying
- **Non-Commercial:** Strengthens fair use claim (if applicable)
- **Amount Copied:** Full database scraping weakens fair use
- **Market Impact:** Competing reference app could harm market
- **ToS Violation:** Explicit prohibition undermines fair use defense

### Risk Assessment
**High Risk:** Both primary sources explicitly prohibit automated scraping
**Medium Risk:** Fandom wiki with CC license (proper attribution required)
**Low Risk:** Manual data entry or obtaining permission
**Unknown Risk:** Community collaboration or limited personal use

---

## Recommendations for Next Steps

### Immediate Actions

1. **Decide on Legal Approach:**
   - **Option A:** Request permission from Maxroll/Fextralife (professional, slow, likely denied)
   - **Option B:** Use Fandom wiki with CC-BY-SA compliance (legal, less comprehensive)
   - **Option C:** Manual data entry (safe, time-intensive)
   - **Option D:** Community collaboration (ethical, requires coordination)
   - **Option E:** Limited scraping for personal use (grey area, ToS violation)

2. **If Proceeding with Scraping (Any Source):**
   - Implement respectful crawling (rate limiting, user-agent identification)
   - Cache data locally to minimize requests
   - Add proper attribution in app
   - Monitor for C&D notices
   - Prepare to remove data if requested

3. **Technical Implementation:**
   - **For Fextralife:** Use BeautifulSoup/Cheerio + standard HTTP
   - **For Maxroll:** Use Puppeteer/Playwright for React rendering
   - **For Fandom:** Standard scraping with CC-BY-SA attribution

### Agent Recommendations

Based on these findings, recommend involving:

1. **Legal Consultation:** Assess fair use viability and risk tolerance before proceeding

2. **nextjs-expert agent:** If proceeding, implement:
   - Data fetching layer (API routes or server-side)
   - Caching strategy for scraped data
   - Attribution display component
   - Error handling for failed fetches

3. **typescript-expert agent:** Create type definitions for:
   - Boss data (weaknesses, phases, rewards)
   - Weapon data (stats, scaling, upgrades by character)
   - Relic data (effects, categories, tiers)
   - Nightfarer data (stats, abilities, vessels)
   - Skill/Spell data (FP cost, effects, compatibility)

4. **system-architecture-reviewer agent:** Evaluate:
   - Data storage strategy (static JSON vs. database)
   - Update mechanism for game patches
   - Caching and CDN strategy
   - Attribution implementation
   - Data validation across sources

### Data Strategy Recommendation

**Recommended Primary Source: Fextralife** (with caveats)

**Reasoning:**
- More structured, tabular data
- Easier to scrape technically (no React rendering)
- Individual pages for comprehensive details
- Consistent templates across item types
- Better for programmatic extraction

**Caveats:**
- ToS violation risk
- Community accuracy concerns (verify against Maxroll)
- Need proper attribution
- Monitor for policy changes

**Supplementary Source: Maxroll**
- Use for strategic guidance prose
- Validate Fextralife data accuracy
- Character build recommendations
- Harder to scrape but more authoritative

**Safest Alternative: Fandom Wiki**
- CC-BY-SA license allows reuse
- Less comprehensive but legally clear
- Proper attribution required
- May need supplementation with manual data

---

## Key Takeaways

1. **Content Availability:** Both Maxroll and Fextralife have comprehensive Nightreign data covering all needed categories (bosses, weapons, relics, nightfarers, skills, items)

2. **Data Structure:** Fextralife superior for scraping (tables, individual pages, consistent structure); Maxroll better for strategy (prose guides, contextual recommendations)

3. **Technical Feasibility:** Fextralife easier (standard HTML scraping); Maxroll harder (React app requiring browser automation)

4. **Legal Risk:** Both sites explicitly prohibit automated scraping in ToS/robots.txt; Fandom wiki offers CC-BY-SA alternative

5. **Data Freshness:** Game released May 2025, DLC December 2025; relatively stable but ongoing patches/updates expected

6. **Scraping Complexity:** Medium for Fextralife, High for Maxroll (React), Low for Fandom

7. **Quality Trade-off:** Fextralife more granular data but community accuracy concerns; Maxroll more authoritative but narrative-focused

8. **Recommended Approach:**
   - **Safest:** Fandom wiki with attribution or manual entry
   - **Most Comprehensive:** Fextralife scraping (with legal risk)
   - **Most Authoritative:** Maxroll (hardest to scrape)
   - **Best Hybrid:** Fextralife for data + Maxroll for validation/strategy

9. **Version-Specific:** All sources cover post-release (v1.0+) and DLC content; network test data historical

10. **Community Alternatives:** Game8, PureEldenRing exist but not examined in detail

---

## Additional Resources

### Examined Sources
- [Maxroll Elden Ring Nightreign Database](https://maxroll.gg/elden-ring-nightreign/database)
- [Fextralife Nightreign Wiki](https://eldenringnightreign.wiki.fextralife.com/Elden+Ring+Nightreign+Wiki)
- [Maxroll Database Update News](https://maxroll.gg/elden-ring-nightreign/news/elden-ring-nightreign-database-update)
- [Fextralife Bosses Page](https://eldenringnightreign.wiki.fextralife.com/Bosses)
- [Fextralife Weapons Page](https://eldenringnightreign.wiki.fextralife.com/Weapons)
- [Fextralife Relics Page](https://eldenringnightreign.wiki.fextralife.com/Relics)
- [Fextralife Skills Page](https://eldenringnightreign.wiki.fextralife.com/Skills)
- [Fextralife Nightfarers Page](https://eldenringnightreign.wiki.fextralife.com/Nightfarers+(Classes))
- [Fextralife Black Knife Weapon Page](https://eldenringnightreign.wiki.fextralife.com/Black+Knife)
- [Maxroll Guardian Character Guide](https://maxroll.gg/elden-ring-nightreign/characters/guardian-character-guide)
- [Maxroll Relics Guide](https://maxroll.gg/elden-ring-nightreign/guides/relics-vessels-guide)

### robots.txt/ToS Sources
- [Maxroll robots.txt](https://maxroll.gg/robots.txt)
- [Fextralife robots.txt](https://eldenring.wiki.fextralife.com/robots.txt)
- [Fextralife Terms of Use](https://fextralife.com/terms-of-use/)
- [Fextralife Copyright Policy](https://fextralife.com/copyright-policy/)

### Alternative Wikis
- [Fandom Elden Ring Nightreign Wiki](https://eldenring.fandom.com/wiki/Elden_Ring_Nightreign) (CC-BY-SA)
- [Game8 Nightreign Wiki](https://game8.co/games/Elden-Ring-Nightreign)
- [PureEldenRing Database](https://www.pureeldenring.com)
- [PCGamingWiki](https://www.pcgamingwiki.com/wiki/Elden_Ring_Nightreign)

### Official Resources
- [Official Nightreign Website](https://en.bandainamcoent.eu/elden-ring/elden-ring-nightreign)
- [Network Test Info](https://www.bandainamcoent.com/news/elden-ring-nightreign-network-test-registrations-now-live)

### Community Discussion
- [Maxroll on GitHub (Diablo scraper example)](https://github.com/danparizher/maxroll-d4-scraper)
- Various community critiques noted in search results

---

## Documentation Version

**Last Updated:** 2026-01-09
**Game Version Covered:** 1.0 + The Forsaken Hollows DLC (December 2025)
**Sources Last Verified:** 2026-01-09
**Next Recommended Review:** After next major patch or DLC release
