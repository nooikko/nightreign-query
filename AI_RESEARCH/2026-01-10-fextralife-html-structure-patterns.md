# Research: Fextralife Elden Ring Nightreign HTML Structure Patterns

Date: 2026-01-10

## Summary

This research documents the HTML structure and parsing patterns for Fextralife's Elden Ring Nightreign wiki (eldenringnightreign.wiki.fextralife.com). The wiki uses Bootstrap-based responsive design with custom Fextralife templates and searchable content patterns suitable for Cheerio parsing.

## Prior Research

References:
- [2026-01-09-maxroll-fextralife-nightreign-content-assessment.md](./2026-01-09-maxroll-fextralife-nightreign-content-assessment.md) - Initial content source assessment

## Current Findings

### Base Domain & Framework

- **Domain**: `eldenringnightreign.wiki.fextralife.com`
- **CSS Framework**: Bootstrap (evident from class patterns like `dropdown-toggle`, `alert`, `container`)
- **Custom Framework**: Fextralife proprietary templates and styling
- **Search System**: Google Custom Search Engine integration (classes: `.gsc-control-cse`)

### Common HTML Patterns Across All Pages

#### Navigation Structure
```html
<!-- Breadcrumb navigation -->
<!-- Pattern: "Parent Category / Subcategory / Page Title" -->
<!-- Classes: Standard Bootstrap breadcrumb styling -->

<!-- Left sidebar menu -->
<div class="left-side-menu-container">
  <!-- Multi-level hierarchical navigation -->
</div>

<!-- Searchable elements -->
<element class="searchable" data-key="[identifier]">
  <!-- Filterable content -->
</element>
```

#### Responsive Design Classes
- `.hidden-lg` - Hidden on large screens
- `.hidden-xs` - Hidden on extra-small screens
- Responsive sidebar menus that collapse on mobile

### Boss Pages Structure

**Example**: [Maris, Fathom of Night](https://eldenringnightreign.wiki.fextralife.com/Maris+Fathom+of+Night)

#### Key Sections

1. **Boss Information Panel**
   - Boss image (`<img>` element)
   - Drop information table
   - HP stats across difficulty levels (symbols: ·, ··, ∴)
   - Vulnerability/weakness indicators with icon images

2. **Statistics Tables**

   **Negations/Resistances Table**:
   ```html
   <!-- Table structure (implied from content) -->
   <table>
     <thead>
       <tr>
         <th>Standard</th>
         <th>Slash</th>
         <th>Strike</th>
         <th>Pierce</th>
         <th>Magic</th>
         <th>Fire</th>
         <th>Lightning</th>
         <th>Holy</th>
       </tr>
     </thead>
     <tbody>
       <tr>
         <td><!-- Icon image (57px) + numeric value --></td>
         <!-- ... -->
       </tr>
     </tbody>
   </table>
   ```

   **Resistances/Status Effects Table**:
   - Columns: Poison, Scarlet Rot, Blood Loss, Frostbite, Sleep, Madness
   - Icon images: 25-100px dimensions
   - Numeric resistance values

3. **Combat Information**
   - Stance value
   - Parryable status (Yes/No)
   - Critical hit vulnerability
   - Damage types inflicted
   - Deep of Night scaling table

4. **Strategy Guide Sections**
   - Strategy narrative text
   - Attacks & Counters table with three columns:
     - Attack name
     - Description
     - Counter strategy
   - Phase 1 and Phase 2 attack listings

5. **Variant Information** (Everdark Sovereign)
   - Separate section for enhanced boss versions
   - Phase-specific HP values
   - Updated attack tables
   - Video guide placeholders

#### CSS Selectors for Boss Pages

```css
/* Inferred selectors based on content structure */
.wiki-content         /* Main content container */
.boss-infobox         /* Boss information panel (implied) */
.attack-table         /* Attack listing tables */
.stat-table           /* Statistics tables */
.icon                 /* Damage/status effect icons */
.searchable           /* Filterable elements */
```

#### Boss Listing Page

**URL**: [Bosses](https://eldenringnightreign.wiki.fextralife.com/Bosses)

**Structure**:
- Organized by categories: "Night Lords & Night Bosses", "Evergaol Bosses", "Field Bosses", "Location Bosses"
- Individual boss entries use markdown-style linking
- Each entry includes:
  - Linked boss name: `[Boss Name](/path "Description")`
  - Expedition/Location field (italicized)
  - Type designation (e.g., "Nightlord (Day 3)")
  - Rewards with linked item names
  - Thumbnail images: `![description](/file/path "caption")`

**Special Table**: "Boss Odds in Depth Levels"
- Columns: Boss Name, Deep 1-5
- Shows percentage spawn chances
- Negative numbers indicate reduced spawn probability

### Weapons Pages Structure

#### Weapons Listing Page

**URL**: [Weapons](https://eldenringnightreign.wiki.fextralife.com/Weapons)

**Structure**:
- Grid-based display (NOT traditional tables)
- Grouped by weapon type: Daggers, Straight Swords, Greatswords, etc.
- Section headers use heading tags: `### [Weapon Type]`

**Individual Weapon Links**:
```html
<a href="/Weapon+Name" title="Game Title Wiki Guide">
  <img src="weapon-image.png" alt="Weapon Name" />
  Weapon Name
</a>
```

**Pattern**:
- Image thumbnail with alt text
- Link text matching weapon name
- URL format: spaces encoded as "+"
- Tooltip/title attribute for hover information

**CSS Classes**:
- `.searchable` - Enables filtering
- `.related-games-content` - Related content containers
- `.featured-items-content` - Featured section styling

#### Individual Weapon Page

**Example**: [Marais Executioner's Sword](https://eldenringnightreign.wiki.fextralife.com/Marais+Executioner's+Sword)

**Structure**:

1. **Main Information Box**
   - Weapon icon image
   - Attack Power section:
     ```
     Phy 87 Mag 58 Fire 0 Ligt 0 Holy 0 Crit 100
     ```
     Grid format with damage types

   - Guard Negation section:
     - Physical, magical, fire, lightning, holy resistances
     - Boost stat

   - Attribute Scaling section:
     ```
     STR B DEX C ARC B
     ```
     Linked stat names

2. **Key Metadata Fields** (label-value pairs)
   - Level Req.: [number]
   - Attack Affinity: [type] / [type]
   - Status Ailment: [ailment or "n/a"]
   - Weapon Skill: [linked skill name]
   - Unique Weapon Effect: [linked effect name]

3. **Description Section**
   - Lore-focused paragraph text

4. **Multi-Class Upgrade Tables**
   - Eight identical table structures (one per character class):
     - Wylder, Guardian, Ironeye, Duchess, Raider, Revenant, Recluse, Executor

   **Table Structure**:
   ```html
   <table>
     <thead>
       <tr>
         <th>Level</th>
         <th colspan="2">Common</th>
         <th colspan="2">Rare</th>
         <th colspan="2">Epic</th>
         <th colspan="2">Legendary</th>
       </tr>
       <tr>
         <th></th>
         <th>ATK Pwr</th>
         <th>Dmg Neg</th>
         <!-- Repeated for each quality tier -->
       </tr>
     </thead>
     <tbody>
       <tr>
         <td>1</td>
         <td>[attack]</td>
         <td>[negation]</td>
         <!-- ... -->
       </tr>
       <!-- Levels 1-15 -->
     </tbody>
   </table>
   ```

5. **Navigation Elements**
   - Related weapons listed at bottom
   - Bullet-point separation with "♦" divider

### Relics Pages Structure

#### Relics Listing Page

**URL**: [Relics](https://eldenringnightreign.wiki.fextralife.com/Relics)

**Structure**:

1. **Introduction Section**
   - Text content describing relics system
   - Color-coding explanation (red, green, blue, yellow)
   - Acquisition methods

2. **Gallery Sections**
   - Multiple image galleries displaying relics visually
   - `<img>` elements within linked containers
   - Thumbnail images with links to detail pages

3. **Comparison Tables**

   **Column Headers**:
   - Name (with image thumbnail)
   - Equipped by (which Nightfarer(s))
   - Color (Red/Green/Blue/Yellow)
   - How to Get
   - Relic Effect (up to 3 passive bonus slots)

   **Row Structure**:
   - Thumbnail image linked to detail page
   - Relic name as clickable link
   - Character class(es)
   - Color designation
   - Acquisition instructions
   - Listed passive effects (dashes for empty slots on lower-quality relics)

   **Table Categories**:
   - Standard relics
   - Boss-obtained relics
   - Character-specific relics

**CSS Classes**:
- `.searchable` - Applied to tables and lists for filtering

#### Individual Relic/Effect Page

**Example**: [Power of House Marais](https://eldenringnightreign.wiki.fextralife.com/Power+of+House+Marais)

**Structure**:

1. **Header Elements**
   - Breadcrumb navigation: "Equipment & Magic / Unique Weapon Effects"
   - Page title
   - Skill icon image

2. **Content Sections**
   - Heading: "How to Get [Effect Name] Skill in ER Nightreign"
   - Heading: "Elden Ring Nightreign [Effect Name] Notes & Tips"

3. **Data Display**
   - Unordered lists (`<ul>`) for:
     - Weapon associations
     - Stackable details
   - Descriptive text paragraphs
   - Bullet points listing game mechanics (damage scaling, stack limits)

4. **Related Content Links**
   - Bottom of page
   - Text links separated by " ♦ " symbols
   - Links to other unique weapon effects

**CSS Classes**:
- `.searchable` - Filtering functionality
- `.left-side-menu-container` - Sidebar navigation
- `.featured-wiki`, `.featured-items-content` - Sidebar content areas

**Note**: No complex data tables on effect pages; relies on structured text and lists

### Classes/Nightfarers Pages Structure

**URL**: [Nightfarers (Classes)](https://eldenringnightreign.wiki.fextralife.com/Nightfarers+(Classes))

**Structure**:

1. **Class Infoboxes** (card-style)

   Each Nightfarer has:
   - Class icon (image)
   - Character name (heading with link)
   - Description (tagline)
   - Core stats display (HP, FP, Stamina as icons with values)
   - Stat grades (STR, DEX, INT, FAI, ARC using letter grades A-D)
   - Abilities section:
     - Passive
     - Skill
     - Ultimate Art
     (all with links)
   - Starting equipment:
     - Vessel
     - Gear items
     (all with links)

   **Example Data**:
   ```
   Guardian:
   HP: 280, FP: 55, Stamina: 60
   STR: B, INT: D
   ```

2. **Comparison Tables**

   **Attributes Comparison Table**:
   - Columns: Nightfarer name, HP (A-D), FP (A-D), Stamina (A-D), STR-ARC (letter grades)
   - All 10 Nightfarers listed

   **Starting Equipment Table**:
   - Columns: Class name, Starting Equipment, Nightfarer Skills (Passive/Character Skill/Ultimate)

   **Level Up Cost Table**:
   - Columns: Level (1-15), Next Level Cost, Increase, Total Required Runes

**CSS Classes**:
- `.gsc-control-cse` - Search functionality
- `.left-side-menu-container` - Navigation sidebar
- `.wcomp-articles` - Article display
- `.featured-wiki` - Promotional cards
- `.dropdown-menu` - User menus
- `.alert` - Warning messages

**Data Attributes**:
- `data-key` - For searchable/filterable elements

## Key Parsing Patterns for Cheerio

### 1. Tables
```javascript
// Standard table parsing
$('table').each((i, table) => {
  const headers = $(table).find('thead th').map((i, th) => $(th).text().trim()).get();
  const rows = $(table).find('tbody tr').map((i, tr) => {
    return $(tr).find('td').map((i, td) => $(td).text().trim()).get();
  }).get();
});
```

### 2. Image Links (Weapons, Relics, Bosses)
```javascript
// Grid-based weapon/relic listings
$('a').each((i, link) => {
  const href = $(link).attr('href');
  const title = $(link).attr('title');
  const img = $(link).find('img');
  const imgSrc = img.attr('src');
  const imgAlt = img.attr('alt');
  const name = $(link).text().trim() || imgAlt;
});
```

### 3. Searchable Elements
```javascript
// Elements with data-key for filtering
$('.searchable[data-key]').each((i, el) => {
  const key = $(el).attr('data-key');
  const content = $(el).text().trim();
});
```

### 4. Metadata Fields (Label-Value Pairs)
```javascript
// Common pattern for weapon stats, boss info, etc.
// Look for patterns like "Label: Value"
// May need to parse from paragraph text or definition lists
```

### 5. Markdown-style Links
```javascript
// Boss entries and related items
// Pattern in text: [Name](/path "Description")
// Parse from anchor tags with specific patterns
$('a[href^="/"]').each((i, link) => {
  const href = $(link).attr('href');
  const text = $(link).text().trim();
  const title = $(link).attr('title');
});
```

### 6. Icon Images with Stats
```javascript
// Damage types, status effects, stat grades
$('img.icon').each((i, img) => {
  const src = $(img).attr('src');
  const alt = $(img).attr('alt');
  const width = $(img).attr('width'); // 25-100px range
  // Value typically adjacent in text or sibling element
  const value = $(img).next().text().trim();
});
```

## CSS Selector Reference

### Common Selectors Across Page Types

```css
/* Content Areas */
.wiki-content                    /* Main content container */
.searchable                      /* Filterable content */
.left-side-menu-container        /* Navigation sidebar */

/* Tables */
table                            /* All tables */
table thead th                   /* Table headers */
table tbody tr                   /* Table rows */
table tbody td                   /* Table cells */

/* Navigation */
.dropdown-menu                   /* Dropdown menus */
.featured-wiki                   /* Featured content cards */
.featured-items-content          /* Featured items */

/* Boss-Specific */
.boss-infobox                    /* Boss info panel (implied) */
.attack-table                    /* Attack listings */
.stat-table                      /* Statistics tables */

/* Classes/Nightfarers */
.wcomp-articles                  /* Article display */
.alert                           /* Warning messages */

/* Search */
.gsc-control-cse                 /* Google Custom Search */

/* Responsive */
.hidden-lg                       /* Hidden on large screens */
.hidden-xs                       /* Hidden on extra-small screens */
```

### Data Attributes

```javascript
// Common data attributes for targeting
[data-key]                       // Searchable element identifiers
[data-source]                    // Possible infobox parameter names (from general wiki patterns)
[data-toggle]                    // Dropdown functionality
```

## Gaps Identified

1. **Exact CSS class names for infoboxes**: The WebFetch tool provided general structure but not precise class names for boss/weapon infoboxes. Will need browser inspection or direct HTML parsing to confirm.

2. **Table styling classes**: Standard table structures visible, but specific Fextralife-custom classes for table styling not fully documented.

3. **Dynamic content**: Some content may be loaded via JavaScript. Static HTML parsing may miss dynamically-rendered elements.

4. **Version-specific changes**: Wiki structure may change as Nightreign updates. Documentation current as of 2026-01-10.

5. **Mobile vs Desktop HTML**: Responsive design may render different HTML structures on mobile. This research focused on desktop patterns.

## Recommendations for Next Steps

### For Cheerio Parser Implementation:
- **nextjs-expert agent** or **typescript-expert agent** can implement Cheerio parsers based on these patterns
- Start with simpler structures (relics listing, weapons listing) before complex tables (multi-class upgrade tables)
- Implement robust error handling for missing fields
- Consider pagination if listing pages have multiple pages

### For Data Validation:
- **unit-test-maintainer agent** can create tests to validate parsed data structures
- Test against multiple page types to ensure parser flexibility
- Validate that all expected fields are extracted

### For Architecture:
- **system-architecture-reviewer agent** can evaluate the scraping architecture
- Consider caching strategy for scraped data
- Plan for incremental updates vs full re-scrapes

## Key Takeaways

1. **Bootstrap-based responsive design** with custom Fextralife templates
2. **Consistent searchable patterns** using `.searchable` class and `data-key` attributes
3. **Mixed content presentation**: Some pages use tables, others use grid-based image links, others use lists
4. **Image-heavy design**: Boss icons, weapon thumbnails, damage type icons all embedded in content
5. **Hierarchical navigation**: Breadcrumbs and multi-level sidebar menus for context
6. **Markdown-style linking** in some contexts (boss listings, related items)
7. **Multi-class weapon tables**: Unique pattern requiring special parsing logic (8 tables per weapon)
8. **Letter grade stats**: Classes use A-D grading system for attributes
9. **Icon + value pairs**: Common pattern for stats (HP, FP, damage types, resistances)
10. **Version-specific content**: Nightreign wiki is separate from base Elden Ring wiki

## Additional Resources for Implementation

- [Cheerio Documentation](https://cheerio.js.org/) - For parsing implementation
- [Bootstrap Documentation](https://getbootstrap.com/) - Understanding the CSS framework
- [Fextralife Main Wiki](https://eldenring.wiki.fextralife.com/Elden+Ring+Wiki) - Base Elden Ring wiki for comparison
- Browser DevTools - For inspecting actual HTML and confirming class names

## Sources

- [Maris Fathom of Night | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Maris+Fathom+of+Night)
- [Bosses | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Bosses)
- [Weapons | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Weapons)
- [Marais Executioner's Sword | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Marais+Executioner's+Sword)
- [Relics | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Relics)
- [Power of House Marais | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Power+of+House+Marais)
- [Nightfarers (Classes) | Nightreign Wiki Elden Ring](https://eldenringnightreign.wiki.fextralife.com/Nightfarers+(Classes))
- [Elden Ring Nightreign Wiki - FextraLife](https://eldenringnightreign.wiki.fextralife.com/Elden+Ring+Nightreign+Wiki)
- [Portable Infoboxes | Portability Hub | Fandom](https://portability.fandom.com/wiki/Portable_Infoboxes) - General wiki infobox patterns
- [Infoboxes - wiki.gg Support Wiki](https://support.wiki.gg/wiki/Infoboxes) - General wiki infobox patterns
