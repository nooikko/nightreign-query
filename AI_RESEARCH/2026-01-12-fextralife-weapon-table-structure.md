# Research: Fextralife Weapon Upgrade Table Structure

Date: 2026-01-12

## Summary

Investigation of Fextralife's Elden Ring Nightreign weapon page HTML structure reveals that **upgrade tables are currently unpopulated with data**. The tables exist as structural templates but contain empty cells. However, analysis of the parent Elden Ring wiki provides insight into the likely final structure.

## Prior Research

No prior AI_RESEARCH files were consulted for this initial investigation.

## Current Findings

### Nightreign Wiki Status (eldenringnightreign.wiki.fextralife.com)

**Pages Examined:**
- Moonveil weapon page
- Greatsword weapon page
- Broadsword weapon page
- Main Weapons directory page

**Structure Identified:**

Each weapon page contains **8 separate upgrade tables**, one for each Nightfarer class:
1. Wylder
2. Guardian
3. Ironeye
4. Duchess
5. Raider
6. Revenant
7. Recluse
8. Executor

**Table Structure Pattern:**

```html
### [Nightfarer Class] [Weapon Name] Upgrades

[Class description text]

<table>
  <thead>
    <tr>
      <th>![common quality icon]</th>
      <th>![rare quality icon]</th>
      <th>![epic quality icon]</th>
      <th>![legendary quality icon]</th>
    </tr>
  </thead>
  <tbody>
    <tr>
      <td>[Weapon Name]</td>
      <td>ATK Pwr</td>
      <td>Dmg Neg</td>
      <td>ATK Pwr</td>
      <td>Dmg Neg</td>
      <td>ATK Pwr</td>
      <td>Dmg Neg</td>
      <td>ATK Pwr</td>
      <td>Dmg Neg</td>
    </tr>
    <tr>
      <td>Lv 1</td>
      <td> </td>
      <td> </td>
      <td> </td>
      <td> </td>
      <td> </td>
      <td> </td>
      <td> </td>
      <td> </td>
    </tr>
    <!-- Rows for Lv 2 through Lv 15 follow same pattern -->
  </tbody>
</table>
```

**Key Observations:**

1. **Quality Tiers**: 4 tiers (Common, Rare, Epic, Legendary)
2. **Stats per Tier**: 2 stats (ATK Pwr, Dmg Neg)
3. **Upgrade Levels**: 15 levels (Lv 1 through Lv 15)
4. **Cell Structure**: First column is level label, followed by 8 stat columns (2 per quality tier)
5. **Current Data**: All cells contain only whitespace - **no numerical values are populated**
6. **Table Attributes**: No custom class names or data-* attributes detected
7. **Section Organization**: Each class table is separated by an H3 heading

### Comparison with Elden Ring Wiki (eldenring.wiki.fextralife.com)

The original Elden Ring wiki has fully populated upgrade tables with this pattern:

**Column Structure:**
- Weapon Name
- Attack Power (multiple damage types: Phy, Mag, Fire, Light, Holy, Sta)
- Stat Scaling (Str, Dex, Int, Fai, Arc with letter grades)
- Passive Effects (status buildup values)
- Damage Reduction percentages

**Row Structure:**
- Starts at "Standard"
- Progresses through upgrade levels (Standard +1, +2, etc. up to +10)
- Each row contains numerical stat values

**Rendering Method:**
- Uses standard HTML `<table>` elements
- Stats displayed as text in `<td>` cells
- Icons embedded using `<img>` tags for status effects

## Challenges Identified

### Web Scraping Limitations

1. **No Data Present**: The Nightreign wiki tables are placeholder templates only
2. **HTML Access**: WebFetch tool provides rendered content but not always raw HTML markup
3. **Dynamic Rendering**: Some content may be generated client-side or via wiki templates
4. **No Structured Data**: No JSON-LD, data attributes, or API endpoints detected

### Implications for Parser Development

**Current State:**
- Cannot build parser from live data examples
- Must infer structure from template and Elden Ring patterns
- Will need to handle edge cases without real-world examples

**When Data Becomes Available:**
The expected structure based on template will be:
```
Column 0: Level label (Lv 1, Lv 2, ..., Lv 15)
Column 1: Common ATK Pwr (numerical value)
Column 2: Common Dmg Neg (numerical value)
Column 3: Rare ATK Pwr (numerical value)
Column 4: Rare Dmg Neg (numerical value)
Column 5: Epic ATK Pwr (numerical value)
Column 6: Epic Dmg Neg (numerical value)
Column 7: Legendary ATK Pwr (numerical value)
Column 8: Legendary Dmg Neg (numerical value)
```

## Key Takeaways

1. **Nightreign wiki is incomplete** - upgrade tables exist but contain no data
2. **Structure is consistent** across all examined weapons
3. **8 tables per weapon** - one for each Nightfarer class
4. **Standard HTML tables** - no custom classes or data attributes
5. **4 quality tiers × 2 stats = 8 data columns** per row
6. **15 levels** of upgrades per class
7. **Parser must handle empty cells** during development/testing
8. **No alternative data sources** identified (no API, no embedded JSON)

## Recommendations for Next Steps

### For Parser Development
- **typescript-expert agent**: Can create TypeScript interfaces for the expected table structure
- **nextjs-expert agent**: Can implement scraping logic with cheerio or similar HTML parser
- Consider building parser with mock data based on identified structure
- Add robust error handling for empty/missing cells

### Alternative Approaches to Consider
1. **Manual Data Entry**: Given limited weapon count, manual database population might be viable
2. **Community API**: Check if unofficial APIs exist for Nightreign data
3. **Wait for Wiki Completion**: Monitor wiki for data population before scraping
4. **OCR from Screenshots**: If game data is available via screenshots/videos

### Monitoring Strategy
- Periodically check weapon pages for data population
- Focus on popular weapons (Moonveil, Broadsword) as likely early completions
- Consider setting up automated checks for content changes

## Sources

- https://eldenringnightreign.wiki.fextralife.com/Moonveil
- https://eldenringnightreign.wiki.fextralife.com/Greatsword
- https://eldenringnightreign.wiki.fextralife.com/Broadsword
- https://eldenringnightreign.wiki.fextralife.com/Weapons
- https://eldenring.wiki.fextralife.com/Moonveil (for comparison)

## Technical Notes

### HTML Parser Requirements

When data becomes available, parser will need to:

1. **Identify Table Sections**
   - Look for H3 headings matching pattern: `### [Class] [Weapon] Upgrades`
   - Extract class name from heading

2. **Parse Table Headers**
   - Detect quality tier icons or header text
   - Map to quality enum (Common, Rare, Epic, Legendary)

3. **Extract Table Rows**
   - Skip header rows (quality icons, stat labels)
   - Parse data rows starting from "Lv 1"
   - Extract level number from first column
   - Parse 8 numerical values from remaining columns

4. **Handle Edge Cases**
   - Empty cells (current state)
   - Missing tables (incomplete pages)
   - Malformed data
   - Different weapons with varying stat types

### Example Parser Logic (Pseudocode)

```typescript
// Find all H3 headings with upgrade pattern
const headings = page.querySelectorAll('h3');
const upgradeTables = [];

for (const heading of headings) {
  const match = heading.textContent.match(/(\w+) (\w+) Upgrades/);
  if (match) {
    const [, classType, weaponName] = match;
    const table = heading.nextElementSibling('table');

    const rows = table.querySelectorAll('tbody tr').slice(1); // Skip header
    const upgrades = rows.map(row => {
      const cells = row.querySelectorAll('td');
      return {
        level: parseInt(cells[0].textContent.replace('Lv ', '')),
        common: { atkPwr: cells[1], dmgNeg: cells[2] },
        rare: { atkPwr: cells[3], dmgNeg: cells[4] },
        epic: { atkPwr: cells[5], dmgNeg: cells[6] },
        legendary: { atkPwr: cells[7], dmgNeg: cells[8] }
      };
    });

    upgradeTables.push({ classType, weaponName, upgrades });
  }
}
```

## Conclusion

While the Nightreign wiki structure is clear, the absence of actual data makes immediate scraping impossible. The parser can be built based on the identified template structure, but testing and validation will require either:
- Waiting for wiki completion
- Creating mock data
- Finding alternative data sources

The consistent structure across all weapons suggests that once data is available, a single parser implementation should work for all weapons.
