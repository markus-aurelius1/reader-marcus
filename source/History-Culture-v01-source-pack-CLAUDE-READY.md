# History & Culture — Source Pack Master v01 — CLAUDE READY

**Status:** VERIFY — non-blocking factual/record-integrity items remain explicitly quarantined  
**subject_taxonomy_id:** `prelims-history-and-culture`  
**Parent topics covered:** **6/6**  
**Child subtopics covered:** **29/29**  
**Canonical PYQ gateway scope:** UPSC CSE Prelims GS-I 2011–2026 + UPPCS Prelims GS-I 2018–2025  
**PYQ IDs represented across packs:** **339 unique**  
**Cross-topic PYQ overlaps:** **45** legitimate overlaps retained as evidence, not learner-facing duplication  
**Claude import readiness:** `READY_WITH_VERIFY_GUARDRAILS`

---

## 0. CLAUDE SYNTHESIS CONTROL

This file is the complete subject-level synthesis substrate for **Prelims → History & Culture**.

It combines all six completed Topic Source Packs. The underlying Topic Packs remain the factual working set; this control layer governs how they should be consolidated into final learner-facing notes.

### Core rules

1. **Taxonomy = coverage contract, not presentation order.**
2. Every one of the **29 child taxonomy nodes must appear exactly once** in final coverage.
3. Topic Packs remain primary factual/PYQ payloads.
4. `CORRECT` **overrides** superseded wording.
5. `OMIT` stays out.
6. `VERIFY` is never silently converted into a fact.
7. Malformed/review/suspicious PYQ records may establish **demand**, but not answer-key authority unless the Topic Pack independently resolves the fact.
8. Cross-listed PYQs are legitimate where one question tests more than one knowledge domain. Do not use them to create duplicate note sections.
9. Dynamic UNESCO additions, current award recipients, anniversaries, rankings and year-specific event hooks must remain outside the permanent static core unless explicitly marked `↻ DYNAMIC`.
10. Final notes are revision notes: **short bullets, tables, chronology, comparisons, maps/places where useful, traps, exceptions and recall prompts — not textbook prose.**
11. UPSC common core first; extra UPPCS micro-recall goes in compact `UPPCS+` blocks.
12. Do not broadly re-research or expand the subject during import. If a genuine `VERIFY` blocks a learner-facing fact, resolve only that item using authoritative sources and record the resolution.

### Source precedence

`Topic Pack CORRECT / resolved reference layer`
→ `stable Topic Pack factual payload`
→ `base-note wording`
→ `unresolved VERIFY`

Never revive wording explicitly superseded by a Topic Pack correction.

---

## 0.1 Subject Coverage Ledger

| Topic | topic_taxonomy_id | Child nodes | Audit status |
|---|---|---:|---|
| Ancient & Medieval India | `prelims-history-and-culture-ancient-and-medieval-india` | 9/9 | **PASS_WITH_CORRECTIONS** |
| Religions, Philosophy & Intellectual Traditions | `prelims-history-and-culture-religions-philosophy-and-intellectual-traditions` | 3/3 | **VERIFY** |
| Art & Culture | `prelims-history-and-culture-art-and-culture` | 6/6 | **PASS_WITH_CORRECTIONS** |
| Colonial Rule & Social Change | `prelims-history-and-culture-colonial-rule-and-social-change` | 5/5 | **PASS_WITH_CORRECTIONS** |
| Indian National Movement | `prelims-history-and-culture-indian-national-movement` | 4/4 | **PASS_WITH_CORRECTIONS** |
| Independence, Partition & Post-Independence Transition | `prelims-history-and-culture-independence-partition-and-post-independence-transition` | 2/2 | **PASS_WITH_CORRECTIONS** |

**Total:** `6/6 topics` · `29/29 child subtopics` · **no duplicate child ownership**

---

## 0.2 Subject-Level VERIFY Guardrail

The subject is synthesis-ready, but the following pack-level VERIFY items must remain quarantined exactly as their respective registers require:

- **Ancient & Medieval India** → - **Unresolved VERIFY items:** malformed/`EDITABLE_REVIEW` UPPCS records listed above; `Yavyavati` identification. These do not block synthesis because the required stable facts are independently resolved or the uncertain point is explicitly excluded.
- **Religions, Philosophy & Intellectual Traditions** → - **Unresolved VERIFY items:** canonical/transcription integrity of `UPSC-CSE-2012-GS1-Q072`, `UPSC-CSE-2019-GS1-Q009`, `UPPCS-2021-GS1-Q057`, `UPPCS-2020-GS1-Q040`, `UPPCS-2022-GS1-Q066`, `UPPCS-2020-GS1-Q021`; duplicated 2014/2015 Buddha-kingdom PYQ. These do **not** block factual synthesis.
- **Art & Culture** → - **Unresolved VERIFY items:** Tappa single-origin/development wording; Saka-era founder attribution; malformed `UPSC-CSE-2024-GS1-Q065`; current administrative rules only if later amended.
- **Colonial Rule & Social Change** → - **Unresolved VERIFY items:** none blocking; three malformed canonical PYQs are demand-only and must not be used as answer-key authority.
- **Indian National Movement** → - **Unresolved VERIFY items:** `UPPCS-2023-GS1-Q042`, `UPPCS-2022-GS1-Q144`, defective wording in `UPPCS-2022-GS1-Q070`; none should be used to establish an isolated fact beyond the safe reconstruction stated above.
- **Independence, Partition & Post-Independence Transition** → - **Unresolved VERIFY items:** none.

These are primarily **record-integrity, attribution, transcription or scholarly-identification issues**. They do not justify dropping the affected taxonomy node.

---

## 0.3 Cross-Topic Ownership / De-duplication Map

Use this map when material appears in more than one Topic Pack.

| Boundary | Primary learner-facing home | Secondary handling |
|---|---|---|
| Buddhist/Jain doctrine, sects, philosophy | Religions, Philosophy & Intellectual Traditions | Art & Culture keeps only artistic/architectural expression |
| Stupa/cave/temple/sculpture form | Art & Culture | Ancient/Religions use short cross-reference only where historically necessary |
| Vedic/Upanishadic/philosophical doctrine | Religions, Philosophy & Intellectual Traditions | Ancient history keeps chronology/social context only |
| Historical texts/authors/travellers | Art & Culture where text/author/traveller matching is decisive | Ancient/Medieval keeps ruler/polity evidence only |
| Historical places/old names | Ancient & Medieval → Historical Geography | Cross-link Geography for modern spatial context; do not duplicate physical geography |
| Colonial constitutional Acts/proposals/Constituent Assembly | Colonial Rule & Social Change | Cross-link present-day Polity; keep current constitutional mechanics in Polity |
| British land revenue, drain, education, administration | Colonial Rule & Social Change | Cross-link Economy/GS1 where conceptually relevant |
| Socio-religious/anti-caste reform | Colonial Rule & Social Change | Cross-link Society/GS1 and relevant Polity/Social Justice material |
| Swadeshi, INC, Gandhian mass politics | Indian National Movement | Colonial topic keeps only causal/administrative context |
| INA, transfer of power, Partition settlement | Independence, Partition & Post-Independence Transition | INM keeps Subhas/revolutionary background and cross-link |
| Cabinet Mission / Constituent Assembly detail | Colonial Rule & Social Change | Independence topic keeps only 1946–47 transition facts needed for chronology |
| 1857 / tribal / peasant uprisings | Colonial Rule & Social Change | INM cross-links only where nationalist chronology requires it |
| Awards ↔ Article 18 | Art & Culture for award rules | Cross-link Polity for constitutional doctrine |
| Current UNESCO/GI/award-recipient news | Dynamic/current-affairs layer | Permanent History & Culture keeps only durable institution/tradition core |

### Website cross-link rule

While importing this subject, create stable contextual links wherever a related concept already exists elsewhere in the reader:

- **History & Culture ↔ Polity**
- **History & Culture ↔ Economy**
- **History & Culture ↔ Geography**
- **Prelims ↔ Mains GS1/GS2** when those subjects are later present
- within History & Culture across chapters

Cross-links must point to stable chapter/section IDs, remain sparse and useful, and must not create duplicated content.

---

## 0.4 PYQ De-duplication Rule

The six Topic Packs collectively cite **339 unique PYQ IDs**.

**45 PYQ IDs appear in more than one Topic Pack** because the same question materially tests multiple domains.

During final synthesis:

- preserve those IDs for PYQ/Insights metadata;
- assign each factual note to its most natural learner-facing home;
- use cross-links elsewhere;
- do not count a cross-listed PYQ as evidence for duplicated chapters;
- preserve pack-specific warnings where a record is malformed or answer-integrity is disputed.

The supplied PYQ gateway itself has **no trustworthy subject taxonomy mapping by design**, so Topic Pack semantic classification remains the governing mapping layer.

---

## 0.5 Final History & Culture Synthesis Contract

Final learner-facing material should:

- cover all **29 child nodes**;
- use a pedagogically coherent order;
- retain chronology where chronology itself is examinable;
- use compact comparison tables for dynasties, sects, schools, movements, Acts, organisations, art forms and person–book/institution pairs;
- use maps/place associations selectively for historical geography, sites, ports, inscriptions and cultural locations;
- retain all high-yield `TRAP`, `EXCEPTION`, disputed-identification and answer-key override warnings;
- convert PYQ demand into durable facts, distinctions and elimination cues rather than reproducing full questions;
- keep current awards/UNESCO/anniversary wrappers separate from static knowledge;
- preserve `UPPCS+` micro-recall without overwhelming the UPSC core;
- retain all pack-level correction/verification registers as authoritative import controls.

---

## 0.6 Suggested Learner-Facing Reading Spine

Taxonomy controls coverage, not presentation. A sensible default order is:

1. Prehistory, Chalcolithic Cultures & Harappan Civilisation
2. Vedic Age, Upanishads & Philosophical Schools
3. Mahajanapadas, Mauryas & Ashokan Inscriptions
4. Buddhism & Jainism: Doctrine, Sects & Sites
5. Social-Economic Life & Historical Terminology
6. Sangam & South Indian dynasties
7. Post-Gupta & Early Medieval Dynasties
8. Delhi Sultanate & Mongol invasions
9. Bhakti & Sufi Movements
10. Vijayanagara
11. Mughals: Polity, Administration & Culture
12. Historical Geography: Places, Regions & Old Names
13. Architecture & Sculpture
14. Painting, Crafts & Textiles
15. Performing Arts: Music, Dance, Martial & Folk Traditions
16. Literature, Authors & Foreign Travellers
17. Festivals, Calendars & Heritage Recognition
18. Awards, Honours & Cultural Institutions
19. Europeans & British Expansion
20. British Administration, Economy & Policies
21. Socio-Religious Reform & Anti-Caste Movements
22. Tribal & Peasant Uprisings
23. Constitutional Development: Acts, Commissions & Constituent Assembly
24. Early Nationalism, INC & Swadeshi
25. Nationalist Personalities, Organisations & Books
26. Revolutionary, Leftist & Labour Movements
27. Gandhian Phase & Mass Movements
28. Communal Politics, INA & Partition
29. Post-Independence Political Transition

Claude may improve this order for pedagogy, but **no node may disappear, merge away or appear twice**.

---

## SOURCE PACKS

<!-- SOURCE PACK: ANCIENT & MEDIEVAL INDIA | ORIGINAL FILE: PRE-HISTCULT__Ancient-Medieval-India__SOURCE-PACK__v01.md -->
## HISTORY & CULTURE → Ancient & Medieval India — Topic Source Pack v01

**Status:** PASS_WITH_CORRECTIONS  
**topic_taxonomy_id:** `prelims-history-and-culture-ancient-and-medieval-india`  
**Child subtopics covered:** 9/9  
**Canonical PYQ scope:** UPSC CSE Prelims GS-I 2011–2026 + UPPCS Prelims GS-I 2018–2025  
**Primary content source:** `PRE__ART__BASE__SELF__2026__Art-Culture-Ancient-Medieval__v01.md`  
**Reference gap-fill/correction sources:** Upinder Singh, *A History of Ancient and Early Medieval India*; Poonam Dalal Dahiya, *Ancient and Medieval India*; Ghatnachakra 2026 Indian History PYQ compilation.  
**PYQ handling:** canonical IDs preserved; cross-listed questions appear under every child whose factual demand they materially test; malformed/`EDITABLE_REVIEW` records are used for demand only unless the underlying fact is independently resolved.

### 1. Topic Scope

- **Includes:** stable Ancient–Medieval history substrate: chronology, polity/administration, socio-economic institutions and terminology, ancient trade and ports, prehistoric/Harappan archaeology, Mahajanapadas–Mauryas–Ashokan epigraphy, post-Mauryan extension where needed, Sangam/Pallava/Chola polity, post-Gupta/early-medieval dynasties, Delhi Sultanate and Mongol synchronisms, Vijayanagara, Mughal polity/administration/culture, and historically significant place/region/river names.
- **Excludes:** doctrine-heavy Buddhism/Jainism/Vedic philosophy → sibling **Religions, Philosophy & Intellectual Traditions**; temple/cave/sculpture/painting architecture as a standalone domain → sibling **Art & Culture**; Europeans/British conquest → **Colonial Rule & Social Change**; purely physical geography; current UNESCO/award/event trivia.
- **UPSC depth:** concept + elimination; statement-level distinctions; site/term/dynasty/synchronism associations; archaeology and epigraphy with caution where scholarship is debated.
- **UPPCS depth:** wider recall: rulers, capitals, campaigns, officers, terms, chronology, Sur/Maratha/Bahmani/regional extensions, Gupta–Harsha detail.
- **Allocation by demand:** highest space to Social-Economic Terminology and Mughals; then Harappan, Maurya/Ashoka, Sangam–South, Sultanate, Post-Gupta; Vijayanagara and Historical Geography remain compact but independently complete.

### 2. Child-Subtopic Coverage Ledger

| Child subtopic | taxonomy_id | UPSC PYQs | UPPCS PYQs | Base coverage | Status |
|---|---|---:|---:|---|---|
| Social-Economic Life & Historical Terminology | `...social-economic-life-and-historical-terminology` | 20 | 7 | Strong; broad glossary already present | **PASS_WITH_CORRECTIONS** |
| Prehistory, Chalcolithic Cultures & Harappan Civilisation | `...prehistory-chalcolithic-cultures-and-harappan-civilisation` | 8 | 9 | Strong | **PASS_WITH_CORRECTIONS** |
| Mahajanapadas, Mauryas & Ashokan Inscriptions | `...mahajanapadas-mauryas-and-ashokan-inscriptions` | 6 | 7 | Strong | **PASS_WITH_CORRECTIONS** |
| Mughals: Polity, Administration & Culture | `...mughals-polity-administration-and-culture` | 7 | 21 | Strong | **PASS_WITH_CORRECTIONS** |
| Sangam & South Indian dynasties | `...sangam-and-south-indian-dynasties` | 8 | 5 | Strong | **PASS_WITH_CORRECTIONS** |
| Vijayanagara | `...vijayanagara` | 8* | 1 | Strong | **PASS_WITH_CORRECTIONS** |
| Delhi Sultanate & Mongol invasions | `...delhi-sultanate-and-mongol-invasions` | 3 | 9 | Strong | **PASS_WITH_CORRECTIONS** |
| Historical Geography: Places, Regions & Old Names | `...historical-geography-places-regions-and-old-names` | 8 | 3 | Partial–Strong | **PASS_WITH_CORRECTIONS** |
| Post-Gupta & Early Medieval Dynasties | `...post-gupta-and-early-medieval-dynasties` | 6 | 5 | Strong | **PASS_WITH_CORRECTIONS** |

\*Vijayanagara count includes materially relevant cross-topic PYQs on Hampi, architecture context, synchronism and the Madras–Vijayanagara connection; direct ruler/economy/traveller demand is smaller.

### 3. PYQ Demand Map

#### A. Social-Economic Life & Historical Terminology

##### UPSC

**Canonical IDs:** `UPSC-CSE-2011-GS1-Q056`, `2012-Q021`, `2012-Q082`, `2014-Q021`, `2015-Q055`, `2016-Q038`, `2016-Q088`, `2019-Q001`, `2019-Q010`, `2019-Q012`, `2020-Q025`, `2020-Q029`, `2020-Q082`, `2021-Q040`, `2021-Q045`, `2022-Q052`, `2022-Q058`, `2022-Q060`, `2023-Q043`, `2026-Q017`.

- **Guild/institution terms:** `Shreni`; rules on wages, quality, prices and internal adjudication; merchant bodies.
- **Village/revenue vocabulary:** `Mahattara`, `Pattakila`, `Vishti`, `kulyavapa`, `dronavapa`, `Amil`, pargana–sarkar–suba.
- **Money/exchange:** `Hundi`, `Fanam`, early coin/measurement and place-value evidence.
- **Water/agriculture:** `Araghatta` = water-lifting wheel.
- **Social/legal:** Mitakshara vs Dayabhaga; Arthashastra-era slavery/legal status.
- **Trade:** ancient maritime knowledge; foreign-trade ports; Korkai–Poompuhar–Muchiri.
- **Administrative distinction:** jagirdar ≠ zamindar.
- **Obscure identity terms:** `Kulah-Daran` = Sayyids.
- **Recurring trap:** a familiar-looking term is often placed in the wrong period/institution.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q037`, `2018-Q041`, `2019-Q015`, `2019-Q087`, `2020-Q038`, `2023-Q026`, `2024-Q002`.

- Nanadesi/Manigramam and foreign trade.
- Iqta characteristics and revenue-assignment logic.
- Mughal/Sultanate officer-duty matching.
- Vedic `Bhagadugha` = revenue collector.
- Early trade: river ports + large entrepôts.
- Maratha fiscal terms: `Chauth`, `Sardeshmukhi`.
- **Integrity note:** `UPPCS-2020-GS1-Q038` = `EDITABLE_REVIEW/TABLE_STRUCTURE_UNCLEAR`; `UPPCS-2019-GS1-Q087` is parse-suspicious despite frozen status; use as demand only.

##### Demand synthesis

Know the **term → period → function → closest confusable term**. UPSC tends to ask obscure terms through elimination; UPPCS broadens into officer-duty and direct-definition recall. Ports and land/revenue terms repeatedly bridge this child with Maurya, South India, Sultanate and Mughals.

---

#### B. Prehistory, Chalcolithic Cultures & Harappan Civilisation

##### UPSC

**Canonical IDs:** `UPSC-CSE-2011-GS1-Q092`, `2013-Q045`, `2017-Q002`, `2019-Q007`, `2021-Q032`, `2024-Q055`, `2025-Q072`, `2026-Q018`.

- Harappan cotton, urbanism, religion/ritual interpretation, metal use.
- Harappan vs Rigvedic contrast.
- Sohgaura as **not** Harappan.
- Dholavira water harvesting.
- Inamgaon as Chalcolithic.
- Dancing Girl = bronze.
- Standardized weights/scales, spindle whorls, wells/houses → economic/urban inference.
- UPSC increasingly tests **what archaeology supports**, not textbook labels alone.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q036`, `2018-Q116`, `2020-Q010`, `2020-Q012`, `2020-Q021`, `2021-Q018`, `2022-Q056`, `2023-Q028`, `2025-Q087`.

- UP Harappan sites: Alamgirpur, Hulas, Mandi.
- Mesolithic domestication/site association: Bagor.
- Bhimbetka and V. S. Wakankar.
- Harappan site–state matching: Balu, Manda, Padri, Hulas.
- Boat models/site associations.
- Eastern Harappan boundary = Alamgirpur.
- `UPPCS-2020-GS1-Q021` = `EDITABLE_REVIEW/TABLE_STRUCTURE_UNCLEAR`; demand only.

##### Demand synthesis

Prepare through **phase + diagnostic material + site-feature matrix + evidence limits**. Dholavira, Lothal, Kalibangan, Mohenjo-daro, Harappa, Rakhigarhi, Alamgirpur/Hulas/Mandi are the elimination core. Avoid converting debated archaeological interpretations into certainties.

---

#### C. Mahajanapadas, Mauryas & Ashokan Inscriptions

##### UPSC

**Canonical IDs:** `UPSC-CSE-2016-GS1-Q039`, `2019-Q008`, `2020-Q030`, `2022-Q060`, `2022-Q091`, `2025-Q019`.

- James Prinsep and decipherment of Ashokan Brahmi.
- Kanganahalli: inscribed/labelled representation of Ashoka.
- Ashoka on sectarian harmony → Major Rock Edict XII.
- Major Rock Edict site–state mapping: Dhauli/Jaugada Odisha; Erragudi Andhra Pradesh; Kalsi Uttarakhand.
- `Pradeshika–Rajuka–Yukta` as district-level officials.
- Arthashastra social/legal material as supporting administrative context.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q114`, `2020-Q004`, `2020-Q006`, `2021-Q125`, `2022-Q001`, `2023-Q029`, `2024-Q020`.

- Kharavela–Hathigumpha; Satavahana patronage and public art.
- 16 Mahajanapada capital matching.
- Ashokan religious harmony/dhamma.
- Puranas as source for Maurya/Gupta history.
- Dhamma-mahamatra chronology.
- `Agronomoi` appears as a direct-officer question; exact equivalence with Indian offices should not be overextended.

##### Demand synthesis

Three layers: **Mahajanapada map → Mauryan state/officers → Ashokan epigraphy**. Edict type/site/message and inscriptional evidence outrank later legends. UPPCS requires a wider post-Mauryan ruler–inscription–language matrix.

---

#### D. Mughals: Polity, Administration & Culture

##### UPSC

**Canonical IDs:** `UPSC-CSE-2014-GS1-Q093`, `2015-Q041`, `2019-Q001`, `2019-Q016`, `2019-Q017`, `2021-Q045`, `2022-Q094`.

- Ibadat Khana: inter-religious/intellectual discussion hall.
- Babur: Timurid dynasty; do not attribute first use of arch/dome or gunpowder in India to him.
- Jagirdar vs zamindar.
- Tansen: prior patronage/title traps.
- Jahangir-period move toward portraits/albums/naturalistic painting.
- Pargana → sarkar → suba.
- `Yogavasistha` Persian translation associated with Nizamuddin Panipati under Akbar.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q041`, `2019-Q012`, `2019-Q089`, `2019-Q091`, `2019-Q092`, `2020-Q034`, `2020-Q036`, `2020-Q038`, `2020-Q042`, `2020-Q044`, `2021-Q001`, `2022-Q019`, `2022-Q143`, `2023-Q034`, `2023-Q038`, `2024-Q004`, `2024-Q018`, `2025-Q003`, `2025-Q049`, `2025-Q057`, `2025-Q079`.

- Mansabdari origin/features; officer-duty matching; revenue/currency.
- Tansen before Akbar; Mughal music; Tappa.
- Bairam Khan, Mughal family/court relations, Kavindra Acharya Saraswati.
- Monument chronology and emperor–tomb/city mapping.
- Golconda 1687; Deccan court/culture.
- Baburnama/Tuzuk-i-Baburi language; Persian as Mughal imperial administrative/court language.
- Buland Darwaza purpose/association.
- Mughal succession-battle sequences.
- Sur administration and Maratha/Deshmukh extensions.
- `UPPCS-2019-GS1-Q012` and `UPPCS-2020-GS1-Q038` are `EDITABLE_REVIEW`; use demand only.

##### Demand synthesis

UPSC prioritizes **administrative distinctions + cultural attribution**; UPPCS adds **chronology, battles, officers, Sur–Maratha–Deccan extensions**. The pack therefore retains a compact political spine but gives much more space to mansab–jagir–zamindar and revenue machinery.

---

#### E. Sangam & South Indian dynasties

##### UPSC

**Canonical IDs:** `UPSC-CSE-2020-GS1-Q024`, `2022-Q093`, `2023-Q043`, `2023-Q044`, `2023-Q045`, `2025-Q014`, `2025-Q016`, `2026-Q005`.

- Chronology across Pallava–Pala/Pratihara–Chola.
- Sangam social classification/material culture.
- South Indian ports.
- `Vattakirutal`.
- Hoysala/Gahadavala/Kakatiya/Yadava chronology trap: none are early-8th-century kingdoms in the form tested.
- Mahendravarman I titles.
- Rajendra I–Srivijaya expedition.
- Early Tamilakam ruler–dynasty matching.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q044`, `2019-Q090`, `2020-Q008`, `2024-Q038`, `2025-Q121`.

- Regional ruler/state matching.
- Dynasty-capital associations.
- Chola inscriptions as historical source.
- Kanchipuram period identification.
- Ruler–dynasty direct matching.
- `UPPCS-2019-GS1-Q090` = `EDITABLE_REVIEW/OPTION_BOUNDARY_UNCLEAR`; underlying capital pairs independently resolved.

##### Demand synthesis

Prepare **Sangam polity/society/trade + Pallava ruler-title + Chola ruler-expansion + Chola local/land terminology**. Traditional literary narratives are useful only when labelled as tradition; inscriptions and secure chronology control corrections.

---

#### F. Vijayanagara

##### UPSC

**Canonical IDs:** `UPSC-CSE-2015-GS1-Q047`, `2019-Q011`, `2019-Q023`, `2021-Q035`, `2021-Q038`, `2022-Q059`, `2023-Q048`, `2024-Q056`.

- Harihara/new city and sacral kingship context.
- Kalyana mandapa association (cross-link to Art & Culture).
- Hampi–Tungabhadra location.
- Nuniz on women’s occupations/skills.
- Devaraya II–Vasco da Gama synchronism is false.
- Madras lease from a representative of the Vijayanagara political order (cross-link to Colonial).
- Devaraya I irrigation on Tungabhadra.
- Krishnadevaraya–Portuguese permission at Bhatkal.

##### UPPCS

**Canonical ID:** `UPPCS-2023-GS1-Q033` (`EDITABLE_REVIEW/TABLE_STRUCTURE_UNCLEAR`) — medieval/deccan chronicle matching; demand only.

##### Demand synthesis

High-yield axis = **dynasty/ruler chronology + traveller → ruler + Tungabhadra irrigation + Portuguese/horse-trade connection + nayankara/amaram + Bahmani rivalry**. The corpus is low-volume but unusually specific, so site/ruler associations must be precise.

---

#### G. Delhi Sultanate & Mongol invasions

##### UPSC

**Canonical IDs:** `UPSC-CSE-2019-GS1-Q012`, `2021-Q038`, `2022-Q057`.

- `Amil` = revenue officer; `Iqta` not indigenous; `Mir Bakshi` is Mughal, not Khalji.
- Chengiz Khan reached the Indus during Iltutmish while pursuing Jalal al-Din.
- Timur ≠ reign of Muhammad bin Tughlaq.
- Mongol assault reached/besieged Delhi under Alauddin Khalji.
- Muhammad bin Tughlaq statement about temporary NW territorial loss is a trap.

##### UPPCS

**Canonical IDs:** `UPPCS-2019-GS1-Q015`, `2019-Q016`, `2020-Q032`, `2022-Q044`, `2022-Q106`, `2023-Q034`, `2024-Q150`, `2025-Q030`, `2025-Q095`.

- Iqta characteristics; khalisa/jagir distinction.
- Chronicler–text matching.
- Alauddin conquest sequence.
- Building–builder pairs.
- Iltutmish/Razia-related direct recall.
- Balban centralisation and Mongol frontier pressure.
- `UPPCS-2019-GS1-Q016` = `EDITABLE_REVIEW/TABLE_STRUCTURE_UNCLEAR`.

##### Demand synthesis

UPSC asks **synchronism + institutional precision**; UPPCS asks **order + names + buildings + chroniclers**. The minimum safe preparation is dynasty order, iqta mechanics, central departments, Alauddin reforms/campaigns, and Mongol timeline.

---

#### H. Historical Geography: Places, Regions & Old Names

##### UPSC

**Canonical IDs:** `UPSC-CSE-2015-GS1-Q035`, `2017-Q051`, `2019-Q023`, `2020-Q082`, `2020-Q097`, `2023-Q043`, `2025-Q017`, `2026-Q003`.

- Champaka/Durgara/Kuluta to present regions.
- Motupalli–Kakatiya.
- Pandharpur–Chandrabhaga; Tiruchirappalli–Cauvery; Hampi–Tungabhadra.
- Ghantasala/Kadura/Chaul as trade ports.
- Bhilsa, Dwarasamudra, Girinagar, Sthanesvara.
- South Indian port triplet.
- Asmaka–Godavari; Kosala–Sarayu; negative pairs involving Kamboja/Avanti.
- Ancient rivers: Vitasta, Asikni, Parushni, Yavyavati.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q044`, `2019-Q090`, `2024-Q038`.

- Regional ruler/state and dynasty-capital mapping.
- Period/location classification.
- `UPPCS-2019-GS1-Q090` malformed; demand only.

##### Demand synthesis

This is a **pair-elimination** child. Memorize only historically consequential old-name/current-place, kingdom/capital, port/polity, and ancient-river pairs. Do not drift into generic physical geography.

---

#### I. Post-Gupta & Early Medieval Dynasties

##### UPSC

**Canonical IDs:** `UPSC-CSE-2020-GS1-Q024`, `2021-Q034`, `2022-Q092`, `2023-Q045`, `2025-Q015`, `2025-Q016`.

- Dynasty/ruler chronology.
- Post-Gupta north: Later Guptas, Pushyabhutis, Maukharis, Maitrakas.
- Nannuka/Jayashakti/Nagabhata II/Bhoja dynasty matching.
- Hoysala/Gahadavala/Kakatiya/Yadava chronology.
- Faxian–Chandragupta II (Gupta extension).
- Rajendra I–Srivijaya as late early-medieval/south cross-link.

##### UPPCS

**Canonical IDs:** `UPPCS-2018-GS1-Q035`, `2018-Q044`, `2019-Q090`, `2024-Q149`, `2025-Q121`.

- Samudragupta’s southern contemporaries.
- Regional ruler/capital associations.
- Foreign-traveller chronology.
- Direct ruler–dynasty matching.
- One malformed capital-matching record retained only as demand.

##### Demand synthesis

Think in three blocks: **c. 550–750 post-Gupta fragmentation → c. 750–1000 Pala–Pratihara–Rashtrakuta contest → c. 950–1200 regional powers**. UPSC repeatedly punishes dynasty displacement by 1–3 centuries.

### 4. Base-Note Coverage

#### Social-Economic Life & Historical Terminology
- **Strong:** large term bank already covers officials, revenue, land, coins, guilds, trade and society.
- **Partial:** some terms lack period labels or precise administrative hierarchy.
- **Missing:** compact Mitakshara–Dayabhaga distinction; safer epigraphic place-value chronology; some port/merchant-network context.
- **Outdated/suspect:** isolated older PYQ years beyond current canonical scope; several oversimplified definitions need period qualifiers.

#### Prehistory, Chalcolithic Cultures & Harappan Civilisation
- **Strong:** phase outline, site-feature matrix, town planning, economy, religion, trade.
- **Partial:** prehistory/Chalcolithic sites are much thinner than Harappan section.
- **Missing:** explicit evidence-vs-inference caution; mature-Harappan standard chronology.
- **Outdated/suspect:** Dholavira river attribution; absolute horse/polity/religion claims; “Great Granary” treated as settled identification.

#### Mahajanapadas, Mauryas & Ashokan Inscriptions
- **Strong:** chronology, Mauryan sources, edict types, administration.
- **Partial:** Mahajanapada capitals need a clean table; post-Mauryan extension scattered.
- **Missing:** Kanganahalli and clearer Prinsep/decipherment nuance.
- **Outdated/suspect:** literary legends presented as biographical fact; oversimplified Dhamma = Buddhism; some officer equivalences too modern.

#### Mughals: Polity, Administration & Culture
- **Strong:** rulers, administration, revenue, mansabdari/jagirdari, culture, agrarian relations.
- **Partial:** battle chronology and Sur/Maratha extension fragmented.
- **Missing:** one compact jagirdar-vs-zamindar matrix; court-language/Tansen trap.
- **Outdated/suspect:** a few absolutist “first” claims and loose equivalences.

#### Sangam & South Indian dynasties
- **Strong:** political history, society, economy, ports, Pallavas, Cholas.
- **Partial:** chronology mixes literary tradition and historical reconstruction.
- **Missing:** compact Chola land-term + assembly matrix.
- **Outdated/suspect:** traditional three-Sangam narrative stated too literally; some early-Chola ruler claims too definite.

#### Vijayanagara
- **Strong:** dynasties, rulers, travellers, irrigation, city, Bahmani.
- **Partial:** nayankara/amaram and village machinery can be sharpened.
- **Missing:** explicit 1565 ≠ immediate extinction distinction.
- **Outdated/suspect:** Devaraya I aqueduct source incorrectly linked to Kaveri in one passage; some ruler dates/“most important” labels inconsistent.

#### Delhi Sultanate & Mongol invasions
- **Strong:** dynasty chronology, rulers, Mongol table, administration.
- **Partial:** chroniclers dispersed.
- **Missing:** compact iqta-vs-khalisa-vs-inam and fawazil definitions.
- **Outdated/suspect:** “Iltutmish initiated iqta” needs “consolidated/regularised”; Timur synchronism must be fixed to Nasiruddin Mahmud Tughlaq era.

#### Historical Geography
- **Strong:** many place/port facts exist across other sections.
- **Partial:** no single consolidated map/pair table.
- **Missing:** ancient river-name matrix and old-name/current-place matrix.
- **Outdated/suspect:** a few place identifications elsewhere in notes are imprecise.

#### Post-Gupta & Early Medieval Dynasties
- **Strong:** Harsha, Chalukya, Pallava, Pala, Pratihara, Rashtrakuta, Chola.
- **Partial:** Later Guptas/Maukharis/Maitrakas are thin.
- **Missing:** tripartite-struggle comparison matrix.
- **Outdated/suspect:** Aihole inscription authorship; Kalyani location; overly categorical religious/biographical claims.

### 5. Core Fact Payload

#### A. Social-Economic Life & Historical Terminology

##### 1. Era-wise administrative / agrarian glossary

| Term | Period/context | Exam-safe meaning | Trap / distinction |
|---|---|---|---|
| **Bhaga** | ancient/Mauryan onward | king’s share of agricultural produce | not same as `Bali` |
| **Bali** | Vedic/ancient | tribute/levy; meaning varies by period | do not freeze as one uniform tax rate |
| **Sita** | Mauryan | crown land / revenue from crown land | `Sitadhyaksha` supervised crown lands/agriculture |
| **Samaharta** | Mauryan | chief revenue-collection officer | `Sannidhata` = treasury/store function |
| **Sannidhata** | Mauryan | treasurer / custodian of stores | ≠ Samaharta |
| **Shulkadhyaksha** | Mauryan/Arthashastra | toll/customs-related superintendent | `shulka` = customs/toll |
| **Akaradhyaksha** | Mauryan/Arthashastra | superintendent of mines | mines/metals |
| **Pautavadhyaksha** | Mauryan/Arthashastra | superintendent of weights/measures | standardisation |
| **Pradeshika** | Ashokan | senior district/territorial officer | toured with rajukas/yuktas |
| **Rajuka** | Ashokan | district/rural officer; land/welfare/judicial functions | not simply “patwari” |
| **Yukta** | Mauryan/Ashokan | subordinate/record-account officer | appears with rajukas/pradeshikas |
| **Mahattara** | Gupta/early medieval epigraphy | village elder/notable | UPSC paired with village administration |
| **Pattakila** | early medieval | village headman/local officer | period/local terminology varies |
| **Vishti** | Gupta/early medieval | forced labour/corvée; could function as fiscal obligation | not a coin/tax in cash |
| **Kulyavapa / Dronavapa** | Gupta/early medieval | measures of land | not coin denominations |
| **Bhagadugha** | later Vedic | collector/distributor of king’s share/revenue official | UPPCS direct definition |
| **Samanta** | Gupta/early medieval | subordinate ruler/feudatory | later could become powerful landed chief |
| **Mahasamanta / Mahamandaleshvara** | early medieval | elevated feudatory/territorial lord | hierarchy not identical everywhere |
| **Brahmadeya / Agrahara** | early medieval | land grant, usually to Brahmanas | fiscal/jurisdictional immunities vary by charter |
| **Devadana** | early medieval/South | grant to deity/temple | Chola variants below |
| **Shalabhoga** | Chola | land assigned for maintenance of a school/educational institution | distinguish from temple grant |
| **Pallichchhandam** | Chola/Tamil | land grant to Jaina/Buddhist institution in inscriptional usage | context-sensitive |
| **Vellanvagai** | Chola | land of non-Brahmana peasant proprietors/cultivators | ≠ Brahmadeya |
| **Nagrakkani** | South | land associated with a `nagaram`/merchant town body | local epigraphic term |
| **Iqta** | Sultanate | revenue assignment to muqti/iqtadar in lieu of service; not ownership | surplus `fawazil` due to centre |
| **Khalisa** | Sultanate/Mughal | land whose revenue went directly to crown treasury | ≠ assigned jagir/iqta |
| **Fawazil** | Sultanate | surplus revenue of an iqta remitted to centre | common UPPCS trap |
| **Kharaj** | Sultanate | land/agricultural tax in Islamic fiscal vocabulary | do not equate with every land-tax term |
| **Amil** | Sultanate/Mughal | revenue collection/local fiscal officer | UPSC 2019 |
| **Jagir** | Mughal | assignment of revenue from a territory to a mansabdar/other grantee | not landed proprietary ownership |
| **Paibaqi** | Mughal | unassigned/recovered revenue land available for jagir assignment | changes with transfers |
| **Madad-i-maash** | Mughal | revenue-free/subsistence grant, often to scholars/religious persons | handled through sadr establishment |
| **Jama** | Mughal | assessed revenue | **hasil** = actually realised |
| **Hasil** | Mughal | realised/collected revenue | ≠ jama |
| **Zabt** | Mughal | measurement/assessment system with schedules of crops/prices | strong under Akbar |
| **Dahsala** | Akbar | ten-year averaging framework associated with Todar Mal’s revenue settlement | often linked to zabt; not universal across empire |
| **Kankut** | Mughal | estimate of crop/produce based on measurement/appraisal | alternative assessment method |
| **Batai / Ghallabakhshi** | Mughal | crop-sharing methods | not identical to zabt |
| **Polaj** | Mughal | regularly cultivated land | alongside parauti, chachar, banjar |
| **Taqavi** | medieval/Mughal | agricultural advance/loan | state support, not land category |
| **Khud-kashta** | Mughal agrarian | resident cultivator | **pahi-kashta** = non-resident cultivator |
| **Milkiyat** | Mughal agrarian | zamindar’s proprietary/personal land rights/property | not the same as jagir assignment |
| **Chauth** | Maratha | exaction conventionally one-fourth of assessed revenue from claimed/protected territories | ≠ Sardeshmukhi |
| **Sardeshmukhi** | Maratha | additional 10% claim/levy asserted as hereditary deshmukhi right | often paired with Chauth |

##### 2. Guilds, merchants, money and trade

- **Shreni** = corporate guild of merchants/artisans; could regulate craft standards, wages/prices, rules and internal disputes; guilds also acted as deposit/endowment managers in some inscriptional contexts.
- **Nigama** = market town/corporate mercantile body in some early-historic contexts; do not use as universal synonym of `shreni`.
- **Sarthavaha** = caravan leader/merchant leader.
- **Setthi/Shreshthin** = wealthy merchant/banker; important in early-historic urban economy.
- **Nanadesi** = long-distance merchant body; literally merchants connected with many countries/regions.
- **Manigramam** = important South Indian merchant corporation; active in regional/overseas trade.
- **Ayyavole/Ainnurruvar (Five Hundred of Ayyavole)** = major South Indian merchant corporation; cross-regional/overseas network.
- **Banjaras** = mobile trader-carriers, especially transport of grain and bulk goods; **canonical UPSC 2016 key is corrupt for this record**—factually retain trader/carrier.
- **Sarrafs/Shroffs** = moneychangers/bankers.
- **Hundi** = negotiable credit/remittance instrument/bill of exchange; multiple commercial forms existed.
- **Araghatta** = water wheel/water-lifting device for irrigation.
- **Kulah-Daran** = “cap-wearers”; UPSC’s tested association = **Sayyids**.
- **Fanam** = small coin denomination, especially South India/Vijayanagara sphere; not a textile or tax.
- **Karshapana** = ancient coin/monetary term; commonly associated with punch-marked silver/copper issues depending context.
- **Dinara** = gold coin term, prominent in Gupta context.
- **Tanka** = major Sultanate silver coin; **Jital** = copper/billon denomination.
- **Rupiya** = standardized silver coin strongly associated with Sher Shah, continued/developed under Mughals; do not claim silver coinage began with Sher Shah.
- **Dam** = copper coin in Mughal monetary system.
- **Nishka** = Vedic/ancient value/ornament/weight term; do not automatically treat as standardized struck coin.

##### 3. Ancient port / trade matrix

| Port/site | Historical association |
|---|---|
| **Bharukachchha / Barygaza** | Gujarat; Narmada estuary; major western port in Indo-Roman trade |
| **Sopara / Shurparaka** | Konkan/Maharashtra; western maritime trade |
| **Chaul** | Konkan/Maharashtra; medieval/early-modern port |
| **Tamralipti** | Bengal; major eastern port connected to Ganga delta networks |
| **Ghantasala** | Andhra region; early-historic maritime trade |
| **Kadura** | east-coast trade context in UPSC cluster |
| **Korkai** | Pandya port; pearl/fishery zone |
| **Puhar / Kaveripumpattinam / Poompuhar** | Chola port at Kaveri mouth |
| **Muchiri / Muziris** | Chera/Malabar port; Roman trade |
| **Arikamedu** | near Puducherry; Mediterranean amphorae/rouletted ware, bead/craft trade |
| **Motupalli** | Kakatiya port |
| **Chaul & Dabhol** | important Bahmani/Deccan west-coast ports |

##### 4. Social-law distinction: Mitakshara vs Dayabhaga

| Mitakshara | Dayabhaga |
|---|---|
| Dominant over most of India historically | Strong association with Bengal/Assam tradition |
| Coparcenary/right in ancestral property arises by birth in classical formulation | Heirs acquire rights on father’s death in classical formulation |
| Son can have interest during father’s lifetime | Father retains fuller control during lifetime |
| UPSC trap: do not reverse inheritance timing | UPSC 2021 tested this contrast |

##### 5. Place-value/science demand

- Indian mathematical tradition developed the **place-value decimal system** over time; epigraphic evidence is important because literary dating can be uncertain.
- UPSC 2026 canonical demand: early epigraphic place-value use in the **Mankani plates (Gujarat, c. 595–96 CE)**; more general inscriptional use by the 9th century; Sanskrit inscriptions in Southeast Asia attest dissemination by the 7th century.
- Ancient science questions are generally **chronology-of-capability** traps: surgery/instruments, trigonometric sine, geometry, mathematics. Retain only dated, reference-supported claims; avoid spectacular unsupported “ancient technology” assertions.

---

#### B. Prehistory, Chalcolithic Cultures & Harappan Civilisation

##### 1. Periodisation and diagnostic traits

| Phase | Core diagnostic | High-yield Indian sites |
|---|---|---|
| **Palaeolithic** | hunter-gatherers; chipped stone; handaxe/cleaver → flakes → blades across phases | Soan valley, Narmada valley, Hunsgi, Attirampakkam, Bhimbetka |
| **Mesolithic** | microliths; hunting–gathering with broader subsistence; early domestication at some sites; rock art | Bagor, Adamgarh, Langhnaj, Sarai Nahar Rai, Mahadaha, Bhimbetka |
| **Neolithic** | food production; domestication; ground/polished stone; village settlement | Mehrgarh (north-west), Burzahom/Gufkral, Koldihwa–Mahagara, Chirand, Daojali Hading, south Indian ash-mound sites |
| **Chalcolithic** | copper + stone; village farming cultures, usually non-urban outside Harappan context | Ahar/Banas–Gilund, Kayatha, Malwa/Navdatoli, Jorwe–Inamgaon, Daimabad |
| **Mature Harappan** | urban settlements, standardized weights/bricks/script, craft/trade networks | c. **2600–1900 BCE** |

**UPPCS anchors:** Bhimbetka → V. S. Wakankar; Bagor → Mesolithic; Inamgaon → Maharashtra Chalcolithic.

##### 2. Harappan geographical extent / key sites

- **Western:** Sutkagendor/Makran coast.
- **Eastern:** **Alamgirpur**, Hindon basin, Uttar Pradesh.
- **Northern:** Manda, Jammu region/Chenab catchment.
- **Southern:** Daimabad, Maharashtra, generally treated as southernmost Late Harappan-affiliated reach.
- **UP sites:** Alamgirpur, Hulas, Mandi → direct UPPCS value.
- **Rakhigarhi:** one of the largest Harappan urban sites; Haryana.
- **Dholavira:** Khadir island in the Rann of Kutch, Gujarat; not on the Luni.

##### 3. Site-feature matrix

| Site | High-yield features |
|---|---|
| **Harappa** | cemetery areas; craft/industrial zones; standardized urban construction; early excavations by Daya Ram Sahni |
| **Mohenjo-daro** | Great Bath; bronze Dancing Girl; so-called “Priest-King”; extensive wells/drainage; planned streets |
| **Dholavira** | monumental water reservoirs, channels and dams using seasonal runoff; distinctive multi-part urban plan; large signboard inscription |
| **Kalibangan** | ploughed field; platforms interpreted as fire altars; Ghaggar system |
| **Lothal** | basin conventionally interpreted as dockyard; bead industry, warehouse-like structures, rice evidence, fire-altars; Gujarat |
| **Chanhudaro** | craft production; notable absence of massive citadel-type division |
| **Banawali** | agricultural/plough model and Harappan settlement features; Haryana |
| **Surkotada** | Kutch; equid/horse-identification debate—do not use as proof of widespread Harappan horse culture |
| **Shortughai** | Afghanistan; Harappan trading outpost; canal/irrigation evidence |
| **Arikamedu** | **not Harappan**; early-historic Indo-Roman port/craft site |
| **Sohgaura** | **not Harappan**; Mauryan/early-historic copper-plate context in eastern UP |

##### 4. Town planning / technology

- Planned streets, drainage, standardized baked/mud bricks; 1:2:4 brick proportions common but not universal across all phases/sites.
- Upper/lower settlement divisions occur at major sites, but **Harappan urban layouts show regional diversity**.
- Wells numerous, especially Mohenjo-daro; bathing/drainage integral to houses in many settlements.
- **Dholavira:** exceptional water-management system; reservoirs incorporated into city planning.
- Standardized **cubical stone weights** and scale evidence indicate regulated measurement/exchange.
- Copper/bronze metallurgy; gold/silver/lead known; **iron not part of mature Harappan technology**.
- Spindle whorls and textile evidence → spinning/weaving; Harappans are associated with early cotton use.
- Script: short inscriptions, commonly right-to-left; **undeciphered**. Language remains unknown; Proto-Dravidian is one hypothesis, not established fact.

##### 5. Economy and trade

- Mixed farming: wheat, barley, pulses, sesame; millets especially in Gujarat; cotton; rice at some sites/late contexts.
- Cattle, sheep/goat, buffalo; fishing and hunting significant regionally.
- Craft specialization: bead-making, shell, metallurgy, pottery, faience.
- Long-distance exchange: Afghanistan/Central Asia, Iranian plateau, Oman/Magan, Bahrain/Dilmun, Mesopotamia.
- Mesopotamian texts refer to **Meluhha**, widely associated with the Harappan region.
- Standardization + seals + weights support organized trade but **do not prove a single centralized “merchant government.”**

##### 6. Religion / society — evidence discipline

- Terracotta female figurines, animal/hybrid motifs, “Pashupati” seal, fire installations and Great Bath have ritual interpretations; **specific identifications as Mother Goddess/Proto-Shiva are hypotheses**.
- No structure is securely identified as a conventional temple comparable to later Indian temples.
- Burials show regional variation; grave goods occur, but beliefs about afterlife cannot be reconstructed with certainty.
- House-size variation and luxury goods show social differentiation; **caste, matriarchy, priest-king monarchy** are not archaeologically established.
- Political organization: public works/standardization imply coordination and authority; whether one empire or several states remains unresolved.
- **Horse trap:** horse/equid evidence is disputed and limited; horse is not a characteristic diagnostic element of Harappan culture. Use “not securely/widely attested” rather than “absolutely unknown.”

##### 7. Harappan vs Rigvedic elimination

| Harappan | Early Rigvedic |
|---|---|
| Mature urban centres | largely pastoral/tribal social world; no Harappan-style cities |
| script present but undeciphered | oral Vedic textual tradition |
| bronze/copper; no iron | metal vocabulary includes `ayas`; iron belongs later Vedic/early Iron Age contexts |
| standardized weights, long-distance urban trade | cattle wealth central; agriculture present but less urban-commercial |
| horse not characteristic / evidence disputed | horse and chariot culturally prominent |
| extensive drainage/wells at major cities | settlement pattern fundamentally different |

---

#### C. Mahajanapadas, Mauryas & Ashokan Inscriptions

##### 1. 16 Mahajanapadas — capital anchor

| Mahajanapada | Capital / principal centre | Region clue |
|---|---|---|
| **Anga** | Champa | eastern Bihar |
| **Magadha** | Rajagriha → Pataliputra | south Bihar |
| **Kashi** | Varanasi | middle Ganga |
| **Kosala** | Shravasti; Saketa/Ayodhya | eastern UP |
| **Vajji/Vrijji** | Vaishali | north Bihar confederacy |
| **Malla** | Kusinara/Kushinagar & Pava | eastern UP |
| **Chedi** | Suktimati | Bundelkhand |
| **Vatsa** | Kaushambi | Yamuna, UP |
| **Kuru** | Indraprastha/Hastinapura tradition | upper Ganga–Yamuna |
| **Panchala** | Ahichchhatra/Kampilya | western-central UP |
| **Matsya** | Viratanagara | Rajasthan |
| **Surasena** | Mathura | Yamuna |
| **Assaka/Asmaka** | Potana/Paudanya | Godavari; only Mahajanapada south of Vindhyas in standard lists |
| **Avanti** | Ujjayini / Mahishmati | Malwa–Narmada |
| **Gandhara** | Taxila | north-west |
| **Kamboja** | Rajapura-type NW centres | NW frontier |

**Magadhan rise:** Haryanka → Shishunaga → Nanda → Maurya. High-yield rulers: Bimbisara, Ajatashatru, Udayin; Shishunaga/Kalashoka; Mahapadma Nanda/Dhana Nanda.

##### 2. Mauryan political spine / sources

- **Chandragupta Maurya** founded dynasty c. 4th century BCE with Kautilya/Chanakya tradition; conflict/treaty with Seleucus I Nicator; Megasthenes at court.
- **Bindusara** succeeded Chandragupta; Greek sources use Amitrochates/Amitraghata-type name.
- **Ashoka:** Kalinga war in his 8th regnal year/9th year after consecration in standard reckoning; Major Rock Edict XIII records suffering/remorse and `dhamma-vijaya`.
- **Brihadratha** = last Maurya; killed by Pushyamitra Shunga.
- Major sources: **Arthashastra** (textually layered; do not assume every passage is contemporaneous with Chandragupta), Megasthenes’ *Indica* preserved in later quotations, Ashokan inscriptions, Puranic/Buddhist/Jaina traditions, archaeology/coins.

##### 3. Mauryan administration

| Level/function | Key terms |
|---|---|
| Centre | king; `mantrin/mantriparishad`; `Samaharta` revenue; `Sannidhata` treasury |
| Provinces | major provincial centres include Taxila, Ujjayini, Tosali, Suvarnagiri; princes/kumaras used in some |
| District/local | **Pradeshika, Rajuka, Yukta**; mahamatras |
| Urban | Megasthenes describes committees for Pataliputra; treat details as Greek account, not direct Mauryan manual |
| Army | Megasthenes describes boards/committees; large standing military in literary tradition |
| Revenue/economy | `bhaga`, `bali`, `sita`, tolls, mines, forests, state-regulated economic activity in Arthashastra tradition |
| Welfare/dhamma | `Dhamma-mahamatras`; tours/communication; medical/welfare measures in edicts |

**Rajuka:** substantial territorial/district official; inscriptional duties include welfare/judicial responsibility and dhamma-related touring. Avoid equating with modern patwari.

##### 4. Ashokan epigraphy

**Languages/scripts**
- Most subcontinental edicts: **Prakrit in Brahmi**.
- North-west: Prakrit in **Kharoshthi** at sites such as Shahbazgarhi/Mansehra.
- Afghan/north-western zone: **Greek and Aramaic** inscriptions also occur.
- **James Prinsep (1837)** made the decisive breakthrough in deciphering Ashokan/Mauryan Brahmi; identification of “Devanampiya Piyadasi” with Ashoka emerged with Sri Lankan chronicle work and inscriptions naming Ashoka. Kharoshthi decipherment was a cumulative scholarly process, not Prinsep alone.

**Edict groups**
- **Major Rock Edicts (14-set):** broad dhamma, administration, welfare, sectarian respect, Kalinga and foreign contacts.
- **Separate Kalinga Edicts:** Dhauli/Jaugada; governance of conquered Kalinga.
- **Minor Rock Edicts:** among earliest; more personal Buddhist affiliation in some; name “Ashoka” appears at sites such as Maski/Gujarra.
- **Major Pillar Edicts:** later group; dhamma/administrative themes.
- **Minor Pillar Edicts:** schism/order and commemorative/queen-related records.
- **Rummindei (Lumbini):** visit, identification of Buddha’s birthplace, tax concession.
- **Nigali Sagar:** enlargement/honouring of Kanakamuni Buddha stupa.
- **Bairat/Bhabru:** explicitly Buddhist textual recommendations.
- **Barabar caves:** donations to Ajivikas.

**Major Rock Edict site traps**
- **Dhauli — Odisha**
- **Jaugada — Odisha**
- **Erragudi/Yerragudi — Andhra Pradesh**
- **Kalsi — Uttarakhand**
- **Girnar — Gujarat**
- **Shahbazgarhi / Mansehra — present Pakistan**

**Message anchors**
- RE I: restraint on animal killing/sacrifice.
- RE II: medical treatment/welfare measures; herbs/trees/wells.
- RE III: quinquennial tours by officials; moral duties.
- RE V: Dhamma-mahamatras.
- RE VIII: dhamma-yatra.
- RE XII: restraint/tolerance among sects.
- **RE XIII:** Kalinga war, suffering, dhamma-vijaya.

##### 5. Ashoka’s Dhamma — elimination frame

- Broad **ethical/social policy**, not equivalent to a sectarian “state Buddhism”.
- Recurrent values: respect for parents/elders; generosity toward Brahmanas and shramanas; humane treatment of servants; restraint in killing; moderation; truthfulness; inter-sect respect.
- Ashoka personally supported Buddhism and the sangha, but inscriptions address a plural imperial society.
- **Do not use later Buddhist legends** (e.g., killing 99 brothers, sudden miraculous conversion) as inscriptionally secure biography.

##### 6. Kanganahalli

- Buddhist stupa/archaeological site in Karnataka.
- Relief with inscription conventionally read as **“Ranyo Asoko” / King Ashoka**, giving a rare labelled sculptural representation; UPSC 2019 anchor.

##### 7. Post-Mauryan extension

| Power | High-yield anchors |
|---|---|
| **Shungas** | Pushyamitra; Agnimitra; central-north India |
| **Indo-Greeks** | Menander/Milinda ↔ Nagasena, *Milindapanho* |
| **Shakas/Western Kshatrapas** | Rudradaman I; **Junagadh inscription** in polished/chaste Sanskrit; Sudarshana lake repair |
| **Kushanas** | Kanishka; NW–Ganga contacts; gold coinage; trans-Asian trade |
| **Satavahanas** | Prakrit inscriptions/literature; Gautamiputra Satakarni; matronymics; Deccan trade; land grants |
| **Kharavela** | Kalinga; **Hathigumpha inscription**, Udayagiri, Odisha |

---

#### D. Mughals: Polity, Administration & Culture

##### 1. Political chronology / battle anchors

**Babur:** 1526 First Panipat (Ibrahim Lodi) → 1527 Khanwa (Rana Sanga coalition) → 1528 Chanderi → 1529 Ghaghra.  
**Humayun:** conflict with Sher Khan/Sher Shah → Chausa 1539 → Kannauj/Bilgram 1540 → exile → restoration 1555.  
**Sur interregnum:** Sher Shah 1540–45 → Islam Shah → unstable successors → Humayun restoration.  
**Akbar:** 1556 Second Panipat; Malwa/Gondwana/Rajput/Gujarat/Bengal expansion; Haldighati 1576; Deccan push later.  
**Jahangir:** 1605–27.  
**Shah Jahan:** 1628–58; succession crisis 1657–59.  
**Aurangzeb:** Dharmat 1658 → Samugarh 1658 → Khajwa 1659 → Deorai 1659; Bijapur annexed 1686; Golconda 1687.

**Babur trap:** field artillery/firearms were important at Panipat, but Babur did **not** introduce the arch-and-dome or gunpowder to India for the first time.

##### 2. Sur administration — UPPCS extension

- Sher Shah strengthened road/sarai/communication and policing arrangements; `Sadak-i-Azam`/Grand Trunk route became a major imperial artery.
- Standardized silver **rupiya** strongly associated with his monetary reform; copper and gold issues existed in tri-metallic framework.
- Revenue: measurement, crop rates, direct settlement ideals; **patta** (statement of demand/holding) and **qabuliyat** (cultivator’s acceptance) associated with Sur practice and later Mughal development.
- Administrative divisions often described as sarkar → pargana → village, but labels/functions evolved.
- Avoid “invented everything later used by Akbar”; safer: **important precursor/bridge** for later Mughal institutionalisation.

##### 3. Mughal central / provincial administration

| Office/unit | Function |
|---|---|
| **Emperor/Padshah** | sovereign source of rank, appointment, justice and military command |
| **Wakil** | high coordinating/regency office; relative importance changed after Akbar’s early reign |
| **Diwan-i-Ala / Wazir** | central finance/revenue administration |
| **Mir Bakshi** | military establishment, mansab recommendation/verification, pay/muster-related work |
| **Mir Saman / Khan-i-Saman** | imperial household/karkhanas/stores |
| **Sadr-us-Sudur** | religious/endowment grants (`madad-i-maash`), learned/religious beneficiaries |
| **Qazi-ul-Quzat** | chief judicial office |
| **Suba** | province |
| **Sarkar** | district/intermediate unit |
| **Pargana** | smaller revenue/administrative unit |
| **Village** | basic agrarian unit; muqaddam/headman, patwari/accountant |
| **Subadar** | provincial executive/governor |
| **Provincial Diwan** | revenue/finance; separate check on subadar |
| **Faujdar** | law/order and military authority over assigned tract |
| **Amil-guzar/Amil** | revenue collection |
| **Qanungo** | local revenue records/customary information |
| **Chaudhuri** | local zamindari/revenue intermediary |

**UPSC order:** **pargana < sarkar < suba**.

##### 4. Mansabdari system

- **Mansab** = numerical rank/status in imperial service; neither hereditary caste nor simple military title.
- **Zat** = personal rank/status and basis of personal pay.
- **Sawar** = cavalry quota/obligation attached to rank.
- **Dagh** = branding of horses; **Chehra** = descriptive roll of soldiers; helped prevent substitution/fraud.
- **Do-aspa / Sih-aspa** under Jahangir: enhanced cavalry obligation/pay for selected mansabdars without corresponding rise in zat.
- Mansabdars frequently transferred; office/rank dependent on imperial favour.
- Salary: cash (`naqdi`) or, commonly, revenue assignment through **jagir**.

##### 5. Jagirdar vs Zamindar — UPSC core

| Jagirdar | Zamindar |
|---|---|
| imperial assignee of revenue from a jagir | local landed/revenue intermediary with customary/hereditary social base |
| assignment generally transferable | local rights/status often hereditary |
| did not normally own all land of jagir as private property | could possess personal/property land (`milkiyat`) and local fiscal claims |
| connected to mansab/service/pay | not necessarily mansab-based |
| right mainly to collect assigned revenue, subject to state assessment | local influence could include revenue collection, policing, retainers, caste/clan authority |

**Trap:** both “jagirdars had judicial/police powers unlike zamindars” and “jagirdars were hereditary landholders while zamindars were only revenue officials” are overstatements.

##### 6. Mughal land-revenue vocabulary

- `Jama` = assessed demand; `hasil` = realised revenue.
- `Zabt` = measured assessment using standard crop rates; strong in core northern zones.
- `Dahsala` = ten-year average of yields/prices associated with Akbar–Todar Mal; not uniformly applied everywhere.
- Alternative methods: `batai/ghallabakhshi` share of crop; `kankut` estimation; `nasaq` assessment based on previous/aggregate basis.
- Land categories: **polaj** regularly cultivated; **parauti** temporarily fallow; **chachar** fallow longer; **banjar** long uncultivated.
- `Taqavi` = agricultural advances.
- `Khalisa` = crown-revenue territory; `jagir` = assigned revenue.
- Jagir crisis later: pressure between assessed `jama`, actual `hasil`, number of mansabdars and available productive assignments.

##### 7. Agrarian society

- **Khud-kashta:** resident cultivator in own village.
- **Pahi-kashta:** non-resident cultivator working land in another village.
- Zamindars: superior local status + revenue claims; could maintain armed retainers; role varied greatly.
- Commercial crops called **jins-i-kamil** in Mughal sources: high-revenue crops such as cotton/sugarcane/oilseeds depending region.
- Crop cycles: `kharif` and `rabi`.
- State and private investment in wells/canals; Shah Jahan-period **Shah Nahr/Shah Nahar** restoration/extension in Punjab is the safe association where tested.

##### 8. Akbar: institutions/culture

- **Ibadat Khana**, Fatehpur Sikri: established for religious/intellectual discussions; participation widened beyond Muslim theologians.
- `Sulh-i-kul` = “universal peace”/principle of governance across communities; do not reduce to a single religious sect.
- Translation bureau/Maktab Khana context: Persian translations/adaptations of Sanskrit works.
- **Abul Fazl:** *Akbarnama* + *Ain-i-Akbari*.
- **Badauni:** critical contemporary account; translation activity.
- **Nizamuddin Panipati:** Persian rendering of *Yogavasistha* under Akbar.
- **Bairam Khan:** regent/guardian early in Akbar’s reign; `Khan-i-Khanan`.

##### 9. Mughal painting / music

- **Akbar:** large illustrated manuscripts, narrative scenes, Persian–Indian synthesis.
- **Jahangir:** strong preference for individual portraits, albums (`muraqqa`), flora/fauna and naturalistic observation.
- **Shah Jahan:** greater courtly formality/opulence.
- **Tansen:** original/personal name traditions centre on Ramtanu; served **Raja Ramchandra of Rewa** before Akbar. `Tansen` title is associated with Raja Vikramjit/Vikramaditya of Gwalior tradition; **Akbar’s honorific was “Mian”**. Thus “Tansen was a title given by Akbar” = false.
- **Tappa:** refined/developed in Muhammad Shah-period court tradition; associated especially with Shori Mian in later 18th century—retain only if directly needed.
- **Ibrahim Adil Shah II (Bijapur):** *Kitab-i-Nauras*; Deccan extension, not Mughal emperor.

##### 10. Language/court

- **Baburnama/Tuzuk-i-Baburi:** originally in **Chagatai Turkic**.
- Mughal imperial administration/court literary culture became predominantly **Persian**.
- Persian translations and multilingual patronage coexist; therefore “Turki remained the official Mughal court language throughout” = false.

##### 11. Maratha extension

- **Shivaji:** conflict/negotiation with Deccan sultanates and Mughals; coronation 1674.
- `Ashtapradhan`: conventional eight-minister council; practical power changed over time.
- **Chauth** = quarter claim; **Sardeshmukhi** = additional 10% claim.
- **Deshmukh:** powerful local hereditary intermediary/chief in Maharashtra; Shivaji’s state-building involved controlling/subordinating such local powers.
- Peshwa became dominant office in 18th-century Maratha polity; confederacy phase belongs to later Mughal/regional extension rather than core Mughal machinery.

---

#### E. Sangam & South Indian dynasties

##### 1. Sangam / early historic Tamilakam

**Secure political frame**
- Three crowned lineages (`Muvendar`): **Chera – Chola – Pandya**.
- **Chera:** Vanji/Karur tradition; Muchiri/Muziris and Tondi; Senguttuvan important in literary tradition.
- **Chola:** Uraiyur; Puhar/Kaveripumpattinam; Karikala major ruler in Sangam tradition.
- **Pandya:** Madurai; Korkai; rulers include Nedunjeliyan traditions.
- Emblems: **Chera bow; Chola tiger; Pandya fish**.

**Traditional Sangam assemblies**
- Later tradition speaks of three Sangams under Pandya patronage.
- Treat the detailed first/second/third Sangam lists as **literary tradition**, not securely documented political chronology.
- Surviving “Sangam literature” broadly belongs to early historic Tamil literary corpus, compiled over time.

##### 2. Sangam society / landscapes

| `Tinai` | Landscape | Economy/people | Deity association in literary convention |
|---|---|---|---|
| **Kurinji** | hills | hunting/forest produce | Murugan/Seyon |
| **Mullai** | pastoral | cattle/herding | Mayon |
| **Marutam** | fertile agricultural | wet cultivation | Ventan/Indra |
| **Neytal** | coast | fishing/salt/maritime | Varunan |
| **Palai** | arid/dry zone | raiding/warrior mobility | Korravai |

- Social vocabulary in texts includes **Arasar/kingly groups, Anthanar/Brahmanas, Vanigar/traders, Vellalar/agricultural landholders**; do not project a uniform pan-Indian varna structure mechanically.
- `Vellalar` = important cultivator/landholding groups; `uzhavar` = plough cultivators; `adimai` can denote dependent/slave status.
- Women poets include Avvaiyar and others; texts show women in production, performance and elite culture alongside patriarchal constraints.
- `Natukal`/hero stones commemorate fallen warriors.
- **Vattakirutal:** defeated king/warrior’s ritual fasting to death, a direct UPSC 2023 elimination fact.
- Warrior ideal: `puram` poetry prizes fame/glory; `akam` deals with interior/love themes.

##### 3. Sangam economy/trade

- Agriculture: rice in river valleys; pepper/spices in western regions; cotton/textiles; pastoral production.
- Ports: **Korkai (Pandya), Puhar/Poompuhar (Chola), Muchiri/Muziris (Chera), Tondi**.
- Arikamedu provides archaeological evidence of Mediterranean trade/craft contacts.
- Roman coins/amphorae and literary `Yavana` references → long-distance exchange; avoid assuming all Roman coins indicate direct state-to-state trade.
- Pearl fishing, salt, textiles, spices, ivory/gems are recurrent commodities.
- Customs at ports were an important royal revenue source.

##### 4. Pallavas

**Mahendravarman I (c. early 7th c.)**
- Titles include **Mattavilasa, Vichitrachitta, Gunabhara** → UPSC 2025.
- Author of Sanskrit farce **Mattavilasa Prahasana**.
- Contemporary/rival of Chalukya **Pulakeshin II**.
- Early Pallava rock-cut architectural patronage; detailed architecture belongs to sibling Art & Culture.

**Narasimhavarman I (Mamalla)**
- Defeated Pulakeshin II and captured Vatapi; title **Vatapikonda**.
- Mamallapuram/Mahabalipuram association.
- Xuanzang visited Kanchipuram in Pallava period.

**Narasimhavarman II / Rajasimha**
- structural temple phase; Kailasanatha Kanchipuram/Shore Temple context → Art sibling.

##### 5. Imperial Cholas

**Dynastic spine**
- **Vijayalaya** establishes imperial Chola line c. 9th century.
- **Rajaraja I (985–1014):** major expansion; northern Sri Lanka; Brihadisvara at Thanjavur.
- **Rajendra I (1012/1014–1044):** Ganga expedition → **Gangaikondacholapuram**; naval expedition against **Srivijaya (1025)** → UPSC 2025.
- Later Cholas maintain Tamil country/regional influence before decline in 13th century.

**Administrative geography**
- `Mandalam` → `Valanadu` → `Nadu` → local units/villages; exact hierarchy varies over time.
- `Ur`: general village assembly.
- `Sabha/Mahasabha`: assembly especially of **brahmadeya** villages.
- `Nagaram`: urban/merchant corporate body.
- `Nadu`: territorial unit and assembly/network of local elites.

**Uttaramerur**
- inscriptions detail committee selection (`kudavolai`) and qualifications/disqualifications within brahmadeya assembly.
- Do **not** equate directly with universal modern democracy: participation was structured by landholding/status rules.

**Land terminology**
- `Vellanvagai` = non-Brahmana cultivator/peasant land.
- `Brahmadeya` = Brahmana grant.
- `Devadana/Tirunamattukkani` = temple/deity grant.
- `Shalabhoga` = school/educational maintenance grant.
- `Pallichchhandam` = grant to Jaina/Buddhist institution in Tamil epigraphy.
- `Vetti` = forced labour/corvée; `kadamai` = dues/land-revenue obligation.

**Overseas/merchant dimension**
- Merchant corporations (`Manigramam`, `Nanadesi`, Ayyavole) connect ports, temples, inland markets and overseas trade.
- Chola contacts with Sri Lanka, Southeast Asia and China are both political and commercial; Rajendra’s Srivijaya campaign does not imply permanent annexation of the whole maritime state.

---

#### F. Vijayanagara

##### 1. Dynastic chronology

| Dynasty | Approx. phase | High-yield rulers |
|---|---|---|
| **Sangama** | 14th–15th c. | Harihara I, Bukka I, Devaraya I, Devaraya II |
| **Saluva** | late 15th–early 16th | Saluva Narasimha |
| **Tuluva** | early–late 16th | Vira Narasimha; **Krishnadevaraya (1509–29)**; Achyuta Deva Raya |
| **Aravidu** | after 1565 into 17th c. | Tirumala and successors |

- Empire founded in 14th century by **Harihara and Bukka** in Tungabhadra region.
- **1565 Talikota/Rakshasa-Tangadi** = devastating defeat, death of Aliya Rama Raya, sack/abandonment of the metropolitan centre; **not the instant end of Vijayanagara state**. Aravidu rulers continued from other capitals.

##### 2. Ruler-specific PYQ anchors

**Harihara I**
- UPSC 2015’s sacral-sovereignty/new-city clue belongs to early Vijayanagara foundation tradition in the Tungabhadra zone.

**Devaraya I**
- constructed a **dam across the Tungabhadra** and a long canal/aqueduct feeding the capital’s water system.
- **Correction:** not an aqueduct “from Kaveri”.
- Nicolo Conti visited in early 15th century.

**Devaraya II**
- strengthened cavalry/archery and recruitment; major Sangama ruler.
- Abdur Razzaq visited Vijayanagara in 1440s.
- **Vasco da Gama (1498) was not his contemporary** → UPSC synchronism trap.

**Krishnadevaraya (1509–29)**
- Tuluva ruler; high point of military/administrative prestige.
- 1520 **Raichur** campaign against Bijapur.
- Portuguese relations/horse trade; UPSC 2024 tests permission to Portuguese for a fort at **Bhatkal**.
- Domingo Paes visited during his reign.
- Telugu *Amuktamalyada*; court literary patronage is context, detailed literature → Art sibling.

**Achyuta Deva Raya**
- Fernao Nuniz visit/account is associated with his period; Nuniz also narrates Vijayanagara’s earlier history.

##### 3. Administration / economy

- King (`Raya`) at apex; central officials and provincial governors.
- **Amara-nayaka/Nayankara:** military chiefs received territorial revenue assignments (`amaram`), maintained troops/horses, managed cultivation/irrigation locally and remitted tribute/service to king.
- Assignments were not equivalent to fully private hereditary property at the outset; later localization of Nayaka power became pronounced.
- **Ayagar** system: village service functionaries compensated through shares/land rights; local administration varied regionally.
- Taxes on land, professions, commercial activity; fertile irrigation zones around Tungabhadra and temple/urban markets were central.
- Heavy dependence on imported **war horses**, especially through west-coast/Portuguese-linked trade.
- Cotton/textiles, rice, spices, precious stones and craft goods prominent in traveller accounts and markets.

##### 4. Hampi / water / built landscape

- Hampi/Vijayanagara on **Tungabhadra**, not Malaprabha.
- Kamalapuram tank and Hiriya canal form part of sophisticated irrigation/water infrastructure.
- Fortifications encircled city + agricultural hinterland; travellers noted multiple defensive lines.
- Mahanavami Dibba, royal centre, Lotus Mahal/Hazara Rama etc. are useful context; detailed architecture remains Art & Culture sibling.

##### 5. Travellers

| Traveller | Association |
|---|---|
| **Nicolo Conti** | Devaraya I / early 15th c. |
| **Abdur Razzaq** | Devaraya II, 1440s |
| **Domingo Paes** | Krishnadevaraya |
| **Fernao Nuniz** | Achyuta period; historical account |
| **Duarte Barbosa** | early 16th-century south/west-coast trade context |

**Nuniz PYQ:** women in Vijayanagara were described in diverse occupations/skills including wrestling, astrology/soothsaying and account-keeping.

##### 6. Bahmani / Deccan UPPCS extension

- **Bahmani Sultanate founded 1347** by Alauddin Hasan Bahman Shah; first capital **Gulbarga**, later **Bidar** under Ahmad Shah I Wali.
- Vijayanagara–Bahmani contest repeatedly centred on **Raichur Doab**, Krishna–Godavari interests and western seaports.
- **Mahmud Gawan:** influential vizier; administrative reforms; madrasa at Bidar.
- Successor Deccan sultanates: **Ahmadnagar (Nizam Shahi), Bijapur (Adil Shahi), Berar (Imad Shahi), Bidar (Barid Shahi), Golconda (Qutb Shahi)**.
- At Talikota, leading Deccan sultanates combined against Vijayanagara; political alignments were pragmatic, not a simple permanent religious bloc.

---

#### G. Delhi Sultanate & Mongol invasions

##### 1. Dynasty order

**Mamluk/Slave 1206–1290 → Khalji 1290–1320 → Tughlaq 1320–1414 → Sayyid 1414–1451 → Lodi 1451–1526**

Key transition anchors:
- Qutbuddin Aibak → Iltutmish → Razia → Nasiruddin Mahmud → Balban.
- Jalaluddin Khalji → Alauddin Khalji.
- Ghiyasuddin Tughlaq → Muhammad bin Tughlaq → Firuz Shah Tughlaq → later Tughlaqs.
- Khizr Khan begins Sayyid line after Timur-era disruption.
- Bahlul → Sikandar → Ibrahim Lodi; Babur defeats Ibrahim 1526.

##### 2. Iqta system

- **Iqta** = territorial revenue assignment for service/administration; imported/adapted from wider Islamic political practice, **not indigenous Indian innovation**.
- `Muqti/Iqtadar`: assigned officer; collected revenue, maintained order/troops, met authorised expenditure.
- `Fawazil`: surplus remitted to centre after expenses.
- Iqta did **not** automatically confer private proprietary ownership.
- Transfer/non-hereditary tendency used by strong sultans to limit entrenched provincial power.
- **Iltutmish regularised/consolidated** the iqta system in Delhi Sultanate; safer than “invented it”.
- `Khalisa`: crown-controlled revenue land.
- `Inam`: revenue/land grant to religious/learned beneficiary in standard Sultanate classification.

##### 3. Central administration

| Office | Function |
|---|---|
| **Wazir / Diwan-i-Wizarat** | finance/revenue; chief ministerial function |
| **Ariz-i-Mumalik / Diwan-i-Arz** | military administration, recruitment/muster | 
| **Diwan-i-Insha** | royal correspondence |
| **Barid** | intelligence/news reporting |
| **Sadr-us-Sudur / religious grants** | pious grants/religious establishment |
| **Qazi** | judiciary |
| **Amil** | revenue officer at local/pargana level |
| **Shiqdar** | executive/military authority in shiq |
| **Muqaddam/Chaudhuri** | village/local revenue leadership |
| **Patwari** | village accounts |

**Trap:** **Mir Bakshi** belongs to Mughal system, not Khalji Sultanate.

##### 4. Alauddin Khalji — PYQ core

- Large standing army, cash salaries; **dagh** horse-branding + **chehra** descriptive rolls.
- Market regulation linked to maintaining a large army at controlled cost: grain, cloth/groceries, horses/slaves/cattle; `Shahna-i-Mandi`, `Diwan-i-Riyasat` in standard descriptions.
- Revenue reforms in core territories: measurement/direct demand; heavy assessment; curbed privileges of intermediaries.
- Campaign sequence anchors: **Gujarat 1299 → Ranthambore 1301 → Chittor 1303 → southern/Deccan campaigns through Malik Kafur, including Warangal 1310**.
- Exact dates of some Rajasthan campaigns vary in sources; use secure relative order rather than over-memorising disputed dates.

##### 5. Mongol synchronism

| Period/ruler | What to remember |
|---|---|
| **Iltutmish, 1221** | Chengiz Khan reached Indus while pursuing Jalal al-Din Khwarazm Shah; Iltutmish avoided direct confrontation |
| **Later Mamluks/Balban** | repeated NW raids; Balban fortified frontier; son Prince Muhammad killed fighting Mongols |
| **Jalaluddin Khalji, 1292** | Mongol incursion; converted/settled group remembered as “New Muslims” in Delhi context |
| **Alauddin Khalji** | repeated major invasions c. 1297–1306; one force reached/besieged Delhi (1303); frontier defence reorganised |
| **Muhammad bin Tughlaq** | Tarmashirin incursion/pressure in early reign; UPSC trap is to infer durable NW territorial loss |
| **Timur, 1398** | invaded during **Nasiruddin Mahmud Tughlaq** era; **not** Muhammad bin Tughlaq |

##### 6. Chroniclers / texts

| Person | Text / association |
|---|---|
| **Hasan Nizami** | *Taj-ul-Maasir* |
| **Minhaj-us-Siraj** | *Tabaqat-i-Nasiri* |
| **Amir Khusrau** | *Khazain-ul-Futuh*, *Tughlaq Nama*; court poet across multiple reigns |
| **Ziauddin Barani** | *Tarikh-i-Firoz Shahi*, *Fatawa-i-Jahandari* |
| **Shams-i-Siraj Afif** | *Tarikh-i-Firoz Shahi* (Firuz Shah period) |
| **Ibn Battuta** | *Rihla*; Muhammad bin Tughlaq’s India |

##### 7. Building-builder recall — only cross-context

- **Qutbuddin Aibak:** Quwwat-ul-Islam; began Qutb Minar; Adhai Din ka Jhonpra conversion/construction phase.
- **Iltutmish:** completed major Qutb Minar phase; **Sultan Garhi**.
- **Alauddin Khalji:** **Alai Darwaza**, Siri; Jamat Khana mosque association.
- **Ghiyasuddin Tughlaq:** Tughlaqabad.
- Detailed stylistic features → Art & Culture.

---

#### H. Historical Geography: Places, Regions & Old Names

##### 1. Old/historical name → present location

| Historical name | Present identification |
|---|---|
| **Bhilsa / Besnagar** | Vidisha region, Madhya Pradesh |
| **Dwarasamudra** | Halebidu, Karnataka; Hoysala capital |
| **Girinagara/Girnar** | Junagadh/Girnar region, Gujarat |
| **Sthanesvara** | Thanesar, Haryana |
| **Durgara** | Jammu region |
| **Kuluta** | Kullu valley, Himachal region |
| **Champaka/Chamba** | Chamba Himalayan region; **not Central India** |
| **Vatapi** | Badami, Karnataka |
| **Manyakheta** | Malkhed/Malkhed region, Karnataka; Rashtrakuta capital |
| **Kalyani** | Basavakalyan, Karnataka |
| **Devagiri** | Daulatabad, Maharashtra |
| **Orugallu/Ekasilanagara** | Warangal, Telangana |
| **Kanchi** | Kanchipuram, Tamil Nadu |
| **Vanji/Karur** | Chera centre in Tamilakam; exact literary geography requires context |
| **Uraiyur** | Tiruchirappalli region, Tamil Nadu |
| **Puhar/Kaveripumpattinam** | Tamil Nadu coast at Kaveri mouth |
| **Pratishthana** | Paithan, Maharashtra |
| **Ujjayini** | Ujjain, Madhya Pradesh |
| **Rajagriha** | Rajgir, Bihar |
| **Pataliputra** | Patna, Bihar |
| **Prayaga** | Prayagraj, Uttar Pradesh |
| **Kaushambi** | Kaushambi, Uttar Pradesh |
| **Taxila/Takshashila** | Taxila, present Pakistan |

##### 2. Port → polity/region

| Port | Association |
|---|---|
| **Korkai** | Pandya |
| **Puhar/Poompuhar** | Chola |
| **Muchiri/Muziris** | Chera/Malabar |
| **Motupalli** | Kakatiya |
| **Tamralipti** | Bengal/eastern trade |
| **Bharukachchha/Barygaza** | Gujarat/Narmada estuary |
| **Sopara/Shurparaka** | Konkan |
| **Arikamedu** | Puducherry region; Indo-Roman trade |
| **Ghantasala** | Andhra |
| **Chaul** | Konkan/Maharashtra |
| **Dabhol** | Konkan; Bahmani/Deccan trade |

##### 3. Place → river

- **Pandharpur — Chandrabhaga** (local crescent bend/name of Bhima).
- **Tiruchirappalli — Cauvery/Kaveri**.
- **Hampi — Tungabhadra**, **not Malaprabha**.
- **Pataliputra — Ganga/Son-Gandak zone**.
- **Kaushambi — Yamuna**.
- **Ujjayini — Shipra**.
- **Asmaka — Godavari**.
- **Kosala — Sarayu** in the UPSC territorial-region frame.
- **Kamboja–Vipas** = wrong; Kamboja belongs NW, while Vipasha = Beas in Punjab/Himachal system.
- **Avanti–Mahanadi** = wrong; Avanti = Malwa/Narmada–Shipra zone.

##### 4. Ancient river names

| Ancient/Vedic name | Modern identification |
|---|---|
| **Sindhu** | Indus |
| **Vitasta** | Jhelum |
| **Asikni / Chandrabhaga** | Chenab |
| **Parushni / Iravati** | Ravi |
| **Vipasha** | Beas |
| **Shutudri/Sutudri** | Sutlej |
| **Sarayu** | Sarayu/Ghaghara tradition; local identifications require context |
| **Yamuna** | Yamuna |
| **Ganga** | Ganga |

**UPSC 2026 trap:** Vitasta ≠ Chenab; Asikni ≠ Jhelum; Parushni = Ravi. `Yavyavati` has competing scholarly identifications; do not force it into a single modern river unless the specific source/question requires it.

##### 5. Hill/pilgrimage context

Keep only historically recurrent pairs in this child; religion-specific sacred geography remains in the religion sibling. For elimination, remember:
- **Shravanabelagola/Chandragiri — Karnataka**; Chandragupta Maurya–Bhadrabahu Jain tradition.
- **Girnar — Gujarat**; Ashokan edicts + Rudradaman/Skandagupta inscriptional history.
- **Barabar — Bihar**; Mauryan caves/Ajivika donations.
- **Sanchi — Madhya Pradesh**; Buddhist monument complex (detailed architecture → Art).
- **Kanganahalli/Sannati — Karnataka**; Buddhist stupa/Ashoka representation.

---

#### I. Post-Gupta & Early Medieval Dynasties

##### 1. Chronological frame

**c. 550–750:** post-Gupta fragmentation in north; Later Guptas, Maukharis, Pushyabhutis, Maitrakas, Gauda; Chalukya–Pallava rivalry in Deccan/South.  
**c. 750–1000:** Pala–Gurjara-Pratihara–Rashtrakuta competition, especially over Kannauj; strong regional states.  
**c. 950–1200:** Chandelas, Paramaras, Chaulukyas/Solankis, Chahamanas, Gahadavalas, Western Chalukyas, Cholas; Hoysalas/Kakatiyas/Yadavas rise mainly in later part.

##### 2. Post-Gupta north — UPSC 2021 set

| Dynasty/power | Core region/capital | Anchor |
|---|---|---|
| **Later Guptas** | Magadha | one successor power after imperial Gupta decline |
| **Maukharis** | Kannauj | competed with Later Guptas |
| **Pushyabhutis/Vardhanas** | Thanesar → Kannauj | Harsha |
| **Maitrakas** | Valabhi, Gujarat | western successor state |
| **Gauda** | Bengal | Shashanka; contemporary/adversary in Harsha context |

These four—Later Guptas, Pushyabhutis, Maukharis, Maitrakas—form the UPSC 2021 post-Gupta elimination cluster.

##### 3. Harsha

- **Harshavardhana c. 606–647 CE**, Pushyabhuti/Vardhana line.
- Political centre shifted from Thanesar toward **Kannauj**.
- Eastern conflict involved **Shashanka of Gauda**.
- Southward expansion checked by Chalukya **Pulakeshin II** near Narmada zone.
- **Aihole inscription/prashasti** of Pulakeshin II composed by **Ravikirti**; **Banabhatta did not co-author it**.
- **Banabhatta:** *Harshacharita*; court literary source.
- **Xuanzang/Hiuen Tsang:** visited Harsha’s India; important external account.
- Harsha patronised Buddhism increasingly but also Brahmanical institutions; avoid simple “converted and became exclusively Buddhist”.

##### 4. Chalukyas of Badami / Pallavas

- **Pulakeshin II:** major Badami Chalukya ruler; checked Harsha; conflict with Pallavas.
- **Aihole prashasti — Ravikirti**.
- **Mahendravarman I Pallava** → earlier than Pala Gopala/Pratihara Bhoja/Chola Parantaka.
- **Narasimhavarman I** defeated Pulakeshin II; Vatapi capture.
- Chalukya–Pallava conflict is a key 7th-century Deccan–Tamil political axis.

##### 5. Tripartite struggle: Pala–Pratihara–Rashtrakuta

| Power | Base | Key rulers | High-yield anchors |
|---|---|---|---|
| **Pala** | Bengal–Bihar | Gopala, Dharmapala, Devapala | Gopala elected in tradition/inscriptional account to end disorder; Dharmapala and Kannauj; Buddhist mahaviharas |
| **Gurjara-Pratihara** | western/northern India, later Kannauj | Nagabhata I/II, Mihira Bhoja | checked Arab expansion in western India; Kannauj |
| **Rashtrakuta** | Deccan; Manyakheta | Dantidurga, Dhruva, Govinda III, Amoghavarsha | northern interventions; Amoghavarsha–`Kavirajamarga`; Kailasa Ellora under Krishna I (art cross-link) |

**Kannauj:** prestige/strategic centre; control fluctuated. Do not memorize the struggle as a single continuous three-way war under the same rulers.

##### 6. Pala institutional/cultural anchors

- **Gopala** founded Pala line in mid-8th century.
- **Dharmapala** major expansion; associated with **Vikramashila** and Somapura patronage; Nalanda patronage.
- Palas major patrons of Mahayana/Vajrayana institutions and trans-Himalayan Buddhist networks.
- `Odantapuri` is often linked to Gopala in later tradition; avoid turning uncertain foundation attribution into a hard elimination fact unless specifically sourced.

##### 7. Regional dynasties c. 950–1200

| Dynasty | Region | High-yield ruler/anchor |
|---|---|---|
| **Chandela** | Bundelkhand | Nannuka, Jayashakti; Khajuraho patronage |
| **Paramara** | Malwa | Bhoja |
| **Chaulukya/Solanki** | Gujarat | Mularaja, Siddharaja, Kumarapala traditions |
| **Chahamana/Chauhan** | Ajmer–Delhi region | Prithviraja III; Tarain |
| **Gahadavala** | Kannauj–Varanasi | Govindachandra, Jayachandra |
| **Tomara** | Delhi region | pre-Chahamana Delhi |
| **Western Chalukya** | Deccan | capital **Kalyani = Basavakalyan, Karnataka** |
| **Hoysala** | Karnataka | Vishnuvardhana; later 11th–14th c. |
| **Kakatiya** | Telangana | Warangal/Orugallu; Ganapati, Rudramadevi, Prataparudra |
| **Seuna/Yadava** | Devagiri | Bhillama/Vaitarna–later rulers; late 12th onward |

**UPSC 2023:** Hoysala, Gahadavala, Kakatiya and Yadava are **not** to be placed as established kingdoms in early 8th century.

##### 8. Gupta extension — UPPCS

- **Chandragupta I:** Gupta expansion; Licchavi marriage association.
- **Samudragupta:** Prayag/Allahabad pillar prashasti composed by **Harisena**; northern conquest/direct rule + southern campaign/subordination model.
- **Chandragupta II/Vikramaditya:** western expansion; **Faxian** visited during his reign.
- **Kumaragupta I:** later Gupta stability; Nalanda foundation attribution is traditionally made but exact institutional beginnings are complex—avoid “founded first modern university”.
- **Skandagupta:** Huna pressure; Junagadh inscription records Sudarshana lake repairs under provincial administration.
- Decline involved succession strain, Hunas and regionalisation rather than one single cause.

### 6. UPPCS Extension Layer

#### Direct-recall blocks worth retaining

| Cluster | Additional UPPCS-heavy recall |
|---|---|
| **Prehistory** | Bhimbetka–Wakankar; Bagor–Mesolithic; Balu–Haryana; Manda–Jammu; Padri–Gujarat; Hulas/Mandi–UP |
| **Post-Mauryan** | Kharavela–Hathigumpha; Rudradaman–Junagadh; Satavahana–Prakrit; Menander–Nagasena; Kushana anchors |
| **Gupta/Harsha** | Samudragupta southern rulers; Prayag prashasti–Harisena; Faxian–Chandragupta II; Xuanzang–Harsha |
| **Sultanate** | conquest sequence; chronicler–text; building–builder; Balban centralisation; Khalisa/Iqta/Inam |
| **Vijayanagara/Bahmani** | Devaraya irrigation; traveller chronology; Bahmani capital shift Gulbarga→Bidar; Mahmud Gawan; five Deccan sultanates |
| **Mughals** | Sur bridge; Bairam Khan; Mughal officer matching; succession battles; Golconda/Bijapur; emperor–tomb/city; Tappa/Tansen; court books |
| **Marathas** | Chauth vs Sardeshmukhi; Deshmukh; Shivaji’s administrative vocabulary; Peshwa/confederacy chronology |
| **Regional South** | Pallava–Kanchi; Kakatiya–Warangal; Yadava–Devagiri; Hoysala–Dwarasamudra; Chola rulers and capitals |

#### Compact campaign sequences

- **Alauddin Khalji:** Gujarat → Ranthambore → Chittor → Deccan/Warangal sequence.
- **Babur:** Panipat → Khanwa → Chanderi → Ghaghra.
- **Humayun–Sher Shah:** Chausa → Kannauj/Bilgram → Sur rule → Humayun restoration.
- **Aurangzeb succession:** Dharmat → Samugarh → Khajwa → Deorai.
- **Deccan annexation under Aurangzeb:** Bijapur 1686 → Golconda 1687.
- **Vijayanagara:** foundation (14th c.) → Sangama high phase → Saluva → Tuluva/Krishnadevaraya → Talikota 1565 → Aravidu continuation.

### 7. Cross-Topic / Cross-Subtopic Traps

- **Religion vs political history:** Ashoka’s personal Buddhism ≠ Dhamma as a narrowly Buddhist state creed; Sangam religious material belongs here only where it answers social/political PYQs.
- **Architecture boundary:** builder/site association retained; architectural style/features move to Art & Culture.
- **Literature boundary:** chronicler/text only where it identifies ruler/administration; full literature canon belongs to Art & Culture.
- **Harappan inference:** “Priest-King”, “Mother Goddess”, “Proto-Shiva”, “Great Granary”, one centralized empire → interpretive labels, not equal-certainty facts.
- **Horse:** Harappan horse evidence disputed/limited; Rigvedic horse prominence is safer than “Harappans had absolutely no horse”.
- **Ashokan scripts:** Brahmi most regions; Kharoshthi NW; Greek/Aramaic NW/Afghan zone. Prinsep’s decisive Brahmi breakthrough ≠ sole decipherer of every script.
- **Rajuka:** not a modern patwari equivalent.
- **Jagir ≠ zamindari:** jagir = state revenue assignment; zamindari = locally rooted rights/status/intermediation.
- **Iqta ≠ jagir ≠ khalisa:** all concern revenue/territory but institutional logic and period differ.
- **Mir Bakshi:** Mughal, not Delhi Sultanate.
- **Banjaras:** trader-carriers, despite corrupted canonical UPSC 2016 answer key.
- **Hampi:** Tungabhadra, not Malaprabha; corrupted canonical UPSC 2019 key must not override geography.
- **Chandrabhaga context:** ancient Asikni/Chandrabhaga = Chenab; Pandharpur’s Chandrabhaga = local name/loop of Bhima. Context decides.
- **Kalyani:** Basavakalyan, Karnataka; not “modern Bidar city”.
- **Aihole prashasti:** Ravikirti; Banabhatta = *Harshacharita*.
- **Tansen:** title not bestowed by Akbar; Akbar’s honorific = “Mian”; prior patron Raja Ramchandra of Rewa.
- **Vijayanagara 1565:** metropolitan catastrophe, not immediate political extinction.
- **Devaraya I:** Tungabhadra dam/canal; not Kaveri-to-Hampi aqueduct.
- **Chola local bodies:** sophisticated corporate self-government ≠ universal democratic village republic.
- **Traditional three Sangams:** cultural tradition; not all details historically verifiable.
- **Harsha:** major Buddhist patron later in reign but not securely reducible to exclusive conversion.
- **Early-medieval chronology:** Pala/Pratihara/Rashtrakuta 8th–10th; Hoysala/Kakatiya/Yadava are substantially later → common UPSC displacement trap.

### 8. Correction / Verification Register

#### CORRECT

| Source wording / record | Correction that governs this pack |
|---|---|
| Base: Mature/Indus phase effectively carried to c. 1800 BCE | Use **Mature Harappan c. 2600–1900 BCE**; later regional Late Harappan phases continue afterward. |
| Base: Dholavira linked to Luni | Dholavira = **Khadir island, Rann of Kutch**; water system exploited seasonal runoff/channels, not Luni. |
| Base: Harappan “Great Granaries” as settled structures | Keep conventional label only with caution; function of the Harappa/Mohenjo-daro “granaries” has been questioned. |
| Base: Harappans definitively ruled by merchant group / social system described as settled fact | Political form unresolved; evidence supports complex authority/social differentiation, not a securely identified merchant oligarchy/monarchy. |
| Base: horse absolutely unknown | Use **horse not characteristic; evidence disputed/limited**. |
| Base: Mother Goddess / Pashupati identifications stated as fact | Treat as archaeological **interpretations/hypotheses**. |
| Base: Seleucid marriage presented as named “Helena” marriage | Secure core = treaty/exchange and diplomatic contact; named Helena story not retained as a hard fact. |
| Base: Ashoka killing 99 brothers / Kamashoka-Chandashoka-Dharmashoka as biography | Later literary legend; omit from factual core. |
| Base: Dhamma effectively equated to propagation of Buddhism | Dhamma = broader ethical/social programme; Ashoka personally Buddhist, but policy is not identical to sectarian Buddhist doctrine. |
| Base: Prinsep deciphered both Brahmi and Kharoshthi as a single personal achievement | Prinsep’s decisive 1837 achievement = Ashokan/Mauryan **Brahmi**; Kharoshthi decipherment was cumulative. |
| Base: Rajuka = present-day patwari | Rajuka = substantial district/rural official with land, welfare and judicial responsibilities. |
| Base: Aihole inscription written by Banabhatta and Ravikirti | **Ravikirti** composed Pulakeshin II’s Aihole prashasti; **Banabhatta** wrote *Harshacharita*. |
| Base: Kalyani = modern Bidar | Kalyani = **Basavakalyan, Karnataka**. |
| Base: Devaraya I canal/aqueduct from Kaveri to Hampi | PYQ-safe fact = dam across **Tungabhadra** + canal/aqueduct supplying capital. |
| Base: 1565 treated as end of Vijayanagara | Talikota destroyed metropolitan dominance; **Aravidu line continued** into 17th c. |
| Base: Iltutmish “initiated” iqta | Iqta predates him; he **regularised/consolidated** it in Delhi Sultanate. |
| Base: Timur synchronism susceptible to Muhammad bin Tughlaq confusion | Timur invaded 1398 during late Tughlaq period under **Nasiruddin Mahmud Tughlaq**, not Muhammad bin Tughlaq. |
| Canonical `UPSC-CSE-2016-GS1-Q038` = answer A although option D is “traders” | **Banjaras were trader-carriers; correct factual option is D.** Canonical file remains unchanged; pack overrides answer content. |
| Canonical `UPSC-CSE-2019-GS1-Q023` = answer D despite Hampi–Malaprabha | **Pairs 1 & 2 only are correct; Hampi is on Tungabhadra.** Canonical file remains unchanged; pack overrides answer content. |

#### VERIFY

- `UPPCS-2020-GS1-Q038` — `EDITABLE_REVIEW`, `TABLE_STRUCTURE_UNCLEAR`: officer-duty demand retained; answer record not trusted.
- `UPPCS-2020-GS1-Q021` — `EDITABLE_REVIEW`, `TABLE_STRUCTURE_UNCLEAR`: prehistoric/civilisation demand retained; answer record not trusted.
- `UPPCS-2019-GS1-Q012` — `EDITABLE_REVIEW`, `OPTION_BOUNDARY_UNCLEAR`: Mughal/Sur monetary demand retained; facts independently sourced.
- `UPPCS-2019-GS1-Q090` — `EDITABLE_REVIEW`, `OPTION_BOUNDARY_UNCLEAR`: dynasty-capital demand retained; pairs independently resolved.
- `UPPCS-2023-GS1-Q033` — `EDITABLE_REVIEW`, `TABLE_STRUCTURE_UNCLEAR`: Deccan chronicle demand retained only.
- `UPPCS-2019-GS1-Q016` — `EDITABLE_REVIEW`, `TABLE_STRUCTURE_UNCLEAR`: chronicler-text demand retained; facts independently resolved.
- `UPPCS-2019-GS1-Q087` — frozen but transcription/option structure is poor: use historical-term demand, not its raw layout.
- `UPPCS-2018-GS1-Q041` — singular wording with multi-key answer record around Maratha protection levy; use independently resolved definitions: **Chauth = 25%, Sardeshmukhi = additional 10%**.
- `Yavyavati` modern identification — scholarly/source variation; do not hard-code beyond the canonical elimination that Parushni = Ravi unless a future source fixes it.

#### OMIT

- Detailed Buddhist/Jain doctrine, councils, sects → sibling topic.
- Vedic religious/philosophical doctrine → sibling topic.
- Full temple/cave/sculpture/painting typologies → Art & Culture.
- Full author-text canon and traveller biographies → Art & Culture, except ruler-identification PYQ anchors.
- Current UNESCO inscription dates/statuses and anniversary trivia.
- Unsupported spectacular claims/legends: exact blood-red Daya battle story, literal “99 brothers killed”, named Seleucid princess as settled fact, “first modern university” labels.
- Non-canonical pre-2011 UPSC / non-target state-PCS questions from Ghatnachakra are **not counted as canonical demand**; used only to fill UPPCS-style recall gaps where necessary.

### 9. Supplement Decision

`NO_SUPPLEMENT_NEEDED`

The base notes cover every child node materially; Upinder Singh and Poonam Dalal Dahiya resolve the main archaeology/early-history and medieval-administration gaps; Ghatnachakra supplies useful state-PCS recall context. No unresolved item prevents answering the identified canonical PYQ demand.

### 10. Synthesis Handoff

- **All child subtopics covered:** 9/9.
- **Unresolved VERIFY items:** malformed/`EDITABLE_REVIEW` UPPCS records listed above; `Yavyavati` identification. These do not block synthesis because the required stable facts are independently resolved or the uncertain point is explicitly excluded.
- **Corrections that must override older wording:** Mature Harappan 2600–1900 BCE; Dholavira location/water context; archaeological interpretation caution; Ashoka Dhamma distinction; Prinsep nuance; Rajuka function; Aihole = Ravikirti; Kalyani = Basavakalyan; Devaraya I = Tungabhadra; Vijayanagara survives 1565; Iltutmish regularised iqta; Timur late-Tughlaq synchronism; Banjaras = traders; Hampi = Tungabhadra.
- **Material explicitly excluded:** religion-doctrine deep dives, standalone art/architecture, full literature canon, modern physical geography, current heritage/listing facts, colonial history beyond contextual transitions.
- **Synthesis priority:** preserve PYQ-tested distinctions and correction register; compress narrative chronology; do not drop obscure terms, ports, administrative comparisons or site-feature traps.

---

<!-- SOURCE PACK: RELIGIONS, PHILOSOPHY & INTELLECTUAL TRADITIONS | ORIGINAL FILE: PRE-HISTCULT__Religions-Philosophy-and-Intellectual-Traditions__SOURCE-PACK__v01.md -->
## HISTORY & CULTURE → Religions, Philosophy & Intellectual Traditions — Topic Source Pack v01

**Status:** VERIFY  
**topic_taxonomy_id:** `prelims-history-and-culture-religions-philosophy-and-intellectual-traditions`  
**Child subtopics covered:** 3/3

### 1. Topic Scope

- **Includes:** durable doctrine, terminology, texts, sects/schools, teachers/saints, sacred sites, religious institutions, chronology and comparison points for Buddhism, Jainism, Bhakti, Sufism, Vedic religion, Upanishadic thought and Indian philosophical schools.
- **Excludes:** architecture/sculpture/painting when the decisive knowledge is artistic rather than religious; pure historical geography; present-day polity; year-specific statues, anniversaries, UNESCO/current-event hooks. Cross-topic facts are retained only where needed to answer a canonical PYQ.
- **UPSC depth:** concept-first elimination; doctrine ↔ text ↔ scholar; sect genealogy; terminology; site/tradition identity; saint contemporaneity; Vedic-text chronology; fine distinctions between philosophical schools.
- **UPPCS depth:** UPSC core + councils/order, saint–centre/guru–disciple matching, sect/site recall, Vedic officers and recensions, Vedanta thinker–doctrine pairs.
- **Allocation by demand:** **Buddhism & Jainism = highest**; **Bhakti & Sufi = high**; **Vedic/Upanishads/Philosophy = high and rising**, especially after UPSC 2022–2026.

### 2. Child-Subtopic Coverage Ledger

| Child subtopic | taxonomy_id | UPSC PYQs | UPPCS PYQs | Base coverage | Status |
|---|---|---:|---:|---|---|
| Buddhism & Jainism: Doctrine, Sects & Sites | `prelims-history-and-culture-religions-philosophy-and-intellectual-traditions-buddhism-and-jainism-doctrine-sects-and-sites` | 23 direct/near-direct + 5 Art/Culture overlaps | 3 direct + 1 Art overlap | **Strong** doctrine/sites/texts; sect/council wording needs correction | **VERIFY** — malformed/review PYQs retained only for demand |
| Bhakti & Sufi Movements | `prelims-history-and-culture-religions-philosophy-and-intellectual-traditions-bhakti-and-sufi-movements` | 5 direct + 2 philosophy/music overlaps | 5 direct + 1 philosophy overlap | **Strong**; chronology/order nomenclature needs tightening | **VERIFY** — one malformed match question + one answer conflict |
| Vedic Age, Upanishads & Philosophical Schools | `prelims-history-and-culture-religions-philosophy-and-intellectual-traditions-vedic-age-upanishads-and-philosophical-schools` | 9 direct + 1 historical-geography overlap | 5 direct | **Strong** texts/Vedic life; philosophy has several correctable simplifications | **PASS_WITH_CORRECTIONS** |

### 3. PYQ Demand Map

#### A. Buddhism & Jainism: Doctrine, Sects & Sites

##### UPSC

**Doctrine / core concepts**
- `UPSC-CSE-2011-GS1-Q077` → Jain cosmology: no creator-centred doctrine; world/order governed by inherent principles.
- `UPSC-CSE-2012-GS1-Q022` → Buddhism–Jainism common ground: rejection of Vedic authority/ritual efficacy; do **not** assume identical attitude to austerity.
- `UPSC-CSE-2013-GS1-Q037` → Buddhist **nirvana**: cessation/extinction of craving and release from samsara; not heaven or mere annihilation.
- `UPSC-CSE-2013-GS1-Q047` → Jain karma + asceticism + pervasive sentience/jīva doctrine.
- `UPSC-CSE-2016-GS1-Q050` → Bodhisattva: compassion + postponement of final nirvana for others; Mahayana centrality.
- `UPSC-CSE-2020-GS1-Q031` → **pāramitās** = perfections cultivated on the Bodhisattva path.
- `UPSC-CSE-2020-GS1-Q071` → **parivrājaka** = renunciant/wanderer; **upāsaka** = Buddhist lay follower; **śramaṇa** ≠ high-status Vedic priest.
- `UPSC-CSE-2023-GS1-Q047` → Jain extension of jīva/sentience to earth-, water-, fire-, air- and plant-bodied beings; avoid crude “all non-living objects have souls” formulation.
- `UPSC-CSE-2024-GS1-Q054` → Buddha epithets: **Śākyamuni, Tathāgata**; **Nāyaputta/Nāyaputra** is a Mahavira/Jaina epithet.

**Sects / schools / scholars / texts**
- `UPSC-CSE-2017-GS1-Q053` → **Sautrāntika, Sammitīya** are Buddhist; Sarvāstivāda doctrine requires sect-level discrimination.
- `UPSC-CSE-2018-GS1-Q071` → **Sthānakavāsī** belongs to Jainism, within the Śvetāmbara tradition.
- `UPSC-CSE-2018-GS1-Q074` → **Maitreya** = future Buddha.
- `UPSC-CSE-2019-GS1-Q009` **[review-required]** → Mahayana cluster: Bodhisattva ideal, growing cult/image devotion, transcendent conceptions of Buddhas. Use demand, not answer record blindly.
- `UPSC-CSE-2020-GS1-Q022` → **Sthaviravāda ≠ Mahayana**; **Lokottaravāda** is a Mahāsāṃghika branch; Mahāsāṃghika ideas form part of the background to later Mahayana.
- `UPSC-CSE-2022-GS1-Q055` → distinguish Buddhist texts (**Nettipakaraṇa, Avadānaśataka**) from Jaina texts (**Pariśiṣṭaparvan, Triṣaṣṭilakṣaṇa Mahāpurāṇa**).
- `UPSC-CSE-2022-GS1-Q056` → scholar-tradition matching: **Āryadeva, Dignāga = Buddhist**; **Nāthamuni = Vaiṣṇava**.
- `UPSC-CSE-2023-GS1-Q046` → Jaina authors: **Nayachandra Sūri—Hammīra-Mahākāvya; Somadeva Sūri—Nītivākyāmṛta**; **Milindapañha = Milinda–Nāgasena**, not Nagarjuna.
- `UPSC-CSE-2024-GS1-Q064` → **Saṅghabhūti** and commentary on **Sarvāstivāda Vinaya**.

**Sites / regions / sacred landscape**
- `UPSC-CSE-2014-GS1-Q025` + `UPSC-CSE-2015-GS1-Q039` → kingdoms closely associated with Buddha’s career: **Kosala + Magadha**. The canonical corpus contains an apparent near-verbatim duplicate across the two years; preserve both IDs but treat as one demand cluster.
- `UPSC-CSE-2014-GS1-Q089` → Buddhist shrine-region matching: **Tabo—Spiti; Alchi—Ladakh**; careful with Nako/Lhotsava Lhakhang geography.
- `UPSC-CSE-2023-GS1-Q041` → **Dhānyakaṭaka**: Andhra/Amaravati cultural zone; Mahāsāṃghika association.
- `UPSC-CSE-2023-GS1-Q082` → religious identity of sites: **Bhaja—Buddhist; Sittanavasal—Jain**.

**Cross-topic but useful**
- `UPSC-CSE-2012-GS1-Q072` **[review-required]** → bhūmisparśa mudrā = earth-witness gesture at enlightenment.
- `UPSC-CSE-2013-GS1-Q036` → chaitya vs vihāra belongs primarily to Architecture.
- `UPSC-CSE-2017-GS1-Q069` → Padmapāṇi at Ajanta belongs primarily to Painting.
- `UPSC-CSE-2023-GS1-Q042` → stupa relic/votive/comemorative function belongs primarily to Architecture.
- `UPSC-CSE-2026-GS1-Q002` → early Buddhist aniconism: **empty seat** may signify Buddha’s presence/meditation; Art-Culture overlap.

##### UPPCS

- `UPPCS-2021-GS1-Q057` **[review-required; table malformed]** → Tirthankara–nirvāṇa site matching. Demand retained; answer/options not trusted as transcribed.
- `UPPCS-2023-GS1-Q024` → **Milindapañha: Menander/Milinda ↔ Nāgasena**.
- `UPPCS-2025-GS1-Q105` → Buddhist councils in conventional exam order: **Rājagṛha → Vaiśālī → Pāṭaliputra → Kuṇḍalavana/Kashmir**.
- `UPPCS-2022-GS1-Q075` → **Amaravati** stupa and ayaka platforms/pillars; decisive knowledge is architectural, retained as a cross-topic anchor only.

##### Demand synthesis

- UPSC repeatedly tests **fine conceptual boundaries**, not biographies: nirvana, Bodhisattva, pāramitā, jīva, sect genealogy, epithets, text-author-tradition.
- Sites are tested as **religion + place + sect** packages rather than isolated map points.
- High elimination value: **Buddhist vs Jaina texts/scholars**, **Theravāda/Sthaviravāda vs Mahayana**, **Mahāsāṃghika/Lokottaravāda**, **Sautrāntika/Sarvāstivāda/Sammitīya**, **Śvetāmbara/Digambara/Sthānakavāsī**.
- UPPCS adds **council sequence + Tirthankara site matching**.

#### B. Bhakti & Sufi Movements

##### UPSC

- `UPSC-CSE-2012-GS1-Q069` → Sufi praxis: **breath-control/meditative discipline, ascetic retreat/exercises, samāʿ/holy song and ecstatic devotion**.
- `UPSC-CSE-2013-GS1-Q052` → saint contemporaneity around **Lodi fall/Babur (1526)**; Guru Nanak fits the transition.
- `UPSC-CSE-2014-GS1-Q090` → **Bījak = Kabir tradition**, not Dadu; **Puṣṭimārga = Vallabhacharya**, not Madhva.
- `UPSC-CSE-2016-GS1-Q017` → **Tamil Siddhas/Sittars** and **Lingayats**: anti-ritual/anti-caste heterodoxy and distinctive religious ideas.
- `UPSC-CSE-2019-GS1-Q013` → chronology trap: **Nimbarka ≠ Akbar contemporary**; **Kabir cannot be influenced by Ahmad Sirhindi**, who is later.

**Cross-linked**
- `UPSC-CSE-2018-GS1-Q044` → devotional composers: Tyagaraja mainly Rama; Annamacharya → Venkateswara; not contemporaries; music-history overlap.
- `UPSC-CSE-2022-GS1-Q095` → Ramanuja: bhakti/devotion as the effective road to liberation within Viśiṣṭādvaita; current statue trigger excluded.

##### UPPCS

- `UPPCS-2018-GS1-Q038` → early Chishtis and **samāʿ**; distinguish a true Sufi-practice statement from a separate translation-history assertion.
- `UPPCS-2020-GS1-Q040` **[malformed options despite validated runtime status]** → Sufi saint–centre matching. Preserve demand only; do not trust option D as transcribed.
- `UPPCS-2021-GS1-Q065` → **Fawāʾid-ul-Fuʾād** = conversations of Nizamuddin Auliya compiled by **Amir Hasan Sijzi**.
- `UPPCS-2025-GS1-Q012` → guru–disciple network: **Kabir—Ramananda (tradition); Amir Khusrau—Nizamuddin Auliya; Surdas—Vallabha tradition; Mardana—Guru Nanak**.
- `UPPCS-2025-GS1-Q074` → saint chronology. Transcription appears to intend **Namdev, Kabir, Nanak, Chaitanya**. Source answer conflicts with independently supported chronology; treat factual order as **Namdev → Kabir → Nanak → Chaitanya**.
- `UPPCS-2022-GS1-Q066` **[review-required; philosophical overlap]** → Ramanuja–Viśiṣṭādvaita; Madhva–Dvaita; Nimbarka–Dvaitādvaita; Vallabha–Śuddhādvaita.

##### Demand synthesis

- Core form = **person → teaching/text/order/site/contemporary**.
- UPSC prefers **qualifier traps**: “all Bhakti saints rejected caste/idols,” “all Sufis avoided politics,” “Nirguna = same as Sufi,” etc. These are unsafe generalisations.
- UPPCS prefers **chains and pairs**: guru–disciple, saint–centre, text–compiler, philosophy–teacher, chronological ordering.

#### C. Vedic Age, Upanishads & Philosophical Schools

##### UPSC

- `UPSC-CSE-2011-GS1-Q100` → **dharma + ṛta**: obligation/conduct and cosmic-moral order.
- `UPSC-CSE-2012-GS1-Q073` → early Vedic religion: **nature-deity worship + yajña**, not later image/Bhakti forms.
- `UPSC-CSE-2013-GS1-Q058` → Sāṃkhya: accepts samsara/rebirth framework; **discriminative/self-knowledge** leads liberation.
- `UPSC-CSE-2014-GS1-Q047` → six āstika darśanas; **Lokāyata/Chārvāka and Kāpālika are not among the six**.
- `UPSC-CSE-2014-GS1-Q054` → **Satyameva Jayate — Muṇḍaka Upanishad**.
- `UPSC-CSE-2022-GS1-Q095` → Ramanuja / Viśiṣṭādvaita / devotion.
- `UPSC-CSE-2024-GS1-Q058` → Upanishads **do contain parables/dialogues** and precede the Purāṇas.
- `UPSC-CSE-2026-GS1-Q010` → text-level Vedic vocabulary: **kṣetra-patnī** asked against Rigveda/Atharvaveda/Ashtadhyayi/Arthashastra; canonical key points to **Atharvaveda**.
- `UPSC-CSE-2026-GS1-Q020` → Rigvedic material life inferred from textual detail: wells/water-lifting + draught-animal evidence.
- `UPSC-CSE-2026-GS1-Q001` **[cross-topic]** → Rigvedic **Nadī-sūkta** used as evidence in a historical-geography proposition.

##### UPPCS

- `UPPCS-2018-GS1-Q111` → **Vājasaneyi Saṃhitā = Śukla Yajurveda**.
- `UPPCS-2020-GS1-Q021` **[review-required/table malformed]** → broad socio-economic contrast: Rigvedic pastoral emphasis → Later Vedic agrarian expansion → Indus urbanism → medieval landlordism.
- `UPPCS-2022-GS1-Q066` **[review-required]** → Vedanta thinker–doctrine matching.
- `UPPCS-2023-GS1-Q026` → **Bhāgadugha = revenue collector/collector of the king’s share** in later Vedic administrative terminology.
- `UPPCS-2023-GS1-Q030` → **Nyāya — Akṣapāda Gautama**.

##### Demand synthesis

- “Vedic Age” is not being asked as a generic narrative; demand is moving toward **textual micro-facts + evidence-based inference**.
- Upanishads: chronology, source-text association, atman–brahman ideas, famous phrases/parables.
- Philosophy: school–founder/text–ontology–epistemology–liberation mechanism; Vedanta sub-schools are especially match-question friendly.

### 4. Base-Note Coverage

#### Buddhism & Jainism: Doctrine, Sects & Sites

- **Strong:** Buddha/Mahavira anchors; Four Noble Truths; Eightfold Path; middle path; Buddhist Triratna; Jain Triratna/five vows; councils; major Buddhist/Jain sects; Bodhisattvas; sites; monastic terminology; Buddhist/Jain literature; scholar lists.
- **Partial:** accurate genealogy among early Buddhist nikāyas; exact relationship of Mahāsāṃghika ↔ Lokottaravāda ↔ Mahayana; historically cautious account of Jain sect formation.
- **Missing:** explicit Sthānakavāsī placement; precise “Mahayana is not simply a nikāya caused by the fourth council” correction; clear jīva/ajīva formulation; Mahāvastu attribution.
- **Outdated/suspect:** exact traditional life dates presented as settled; “second/fourth council directly caused neat sect split”; Theravāda = Hinayana equation; Mahāvastu labelled Theravāda; dependent origination equated with momentariness; Jain “living/non-living souls” wording.

#### Bhakti & Sufi Movements

- **Strong:** Alvars/Nayanars; Ramanuja; Lingayats; Maharashtra saints; Saguna/Nirguna; Kabir/Nanak; Sufi vocabulary; Chishti/Suhrawardi/Qadiri/Naqshbandi; Nizamuddin; source genres.
- **Partial:** exact saint chronology; Tamil Siddhas; distinction between movement-wide features and teachings of individual traditions.
- **Missing:** compact guru–disciple/saint–centre grid optimised for UPPCS; explicit correction of over-generalised “all Bhakti = anti-caste/anti-idol”.
- **Outdated/suspect:** “formal beginning” at a single date; direct one-way Islam/Sufism → Bhakti causal claims; “Sufism emerged in 10th century to purify Islam” as a simple origin statement; some saint/order founder labels too categorical.

#### Vedic Age, Upanishads & Philosophical Schools

- **Strong:** four Vedas; priest associations; Brahmana/Aranyaka/Upanishad; ṛta/dharma; principal Vedic religious traits; six darśanas; Vedanta variants; later-Vedic officers.
- **Partial:** internal chronology of the Vedic corpus; school-specific epistemology and ontology.
- **Missing:** clear distinction between **traditional founder** and **earliest extant systematic text**; modern historical caution around recensions and dates.
- **Outdated/suspect:** “Sāṃkhya Sūtra = basic/earliest text”; Kundalini as final stage of Patanjali’s classical Yoga; divine motion of atoms as if foundational to earliest Vaiśeṣika; Bādarāyaṇa called “founder”; Brihadaranyaka called uniquely “the oldest” without qualification; several “oldest in the world” superlatives unnecessary for this topic.

### 5. Core Fact Payload

#### A. Buddhism & Jainism: Doctrine, Sects & Sites

##### 1. Shared Śramaṇa setting

- c. 6th–5th centuries BCE: renunciant/śramaṇa milieu in the middle Ganga plain; Buddhism, Jainism, Ājīvika and other schools debated sacrifice, karma, rebirth, liberation and authority.
- **Buddhism + Jainism common:** do not accept Vedas as supreme revealed authority; challenge sacrificial ritual as route to liberation; karma/rebirth + renunciation/ethical discipline; organised monastic communities; vernacular/Middle Indo-Aryan preaching traditions.
- **Major contrast:** Buddhism rejects a permanent self (**anattā/anātman**) and advocates a middle path; Jainism affirms **jīva** and gives much greater weight to rigorous asceticism/ahiṃsā.

##### 2. Buddhism — life and sacred geography

| Anchor | Durable fact |
|---|---|
| Birth | Lumbini; Śākya clan; associated with Kapilavastu |
| Renunciation | **mahābhiniṣkramaṇa** / great going forth |
| Enlightenment | Uruvelā/Bodh Gaya; Bodhi tree; earth-witness motif |
| First sermon | Sarnath/Isipatana; **dharmacakra-pravartana** |
| Mahāparinirvāṇa | Kuśinagara/Kushinagar |
| Major political world | especially **Kosala + Magadha**; also Vajjis/Mallas in Buddha narratives |

**Eight major pilgrimage places often grouped as Aṣṭamahāsthānas:** Lumbini, Bodh Gaya, Sarnath, Kushinagar + Śrāvastī, Rājagṛha, Vaiśālī, Saṅkāśya.

**Other repeatedly useful centres:** Sanchi/Bharhut; Amaravati–Dhānyakaṭaka/Nagarjunakonda; Ajanta; Nalanda; Vikramashila; Odantapuri; Somapura; Valabhi; Tabo/Alchi.

##### 3. Buddhist doctrine

- **Four Noble Truths:** dukkha → origin (craving/tṛṣṇā) → cessation (nirvāṇa) → path.
- **Noble Eightfold Path:** right view, intention, speech, action, livelihood, effort, mindfulness, concentration.
- **Middle Path (madhyamā pratipad):** rejects both sensual indulgence and extreme self-mortification.
- **Dependent origination (pratītya-samutpāda):** phenomena arise dependent on conditions; do **not** equate mechanically with later doctrine of momentariness.
- **Three marks in standard Buddhist formulation:** impermanence (**anicca/anitya**), unsatisfactoriness (**dukkha**), non-self (**anattā/anātman**).
- **Nirvāṇa:** cessation of craving/ignorance and liberation from samsaric rebirth; not a creator heaven.
- **Triratna:** Buddha–Dhamma/Dharma–Saṅgha.
- **Upāsaka/upāsikā:** lay follower; **bhikṣu/bhikkhu, bhikṣuṇī/bhikkhunī:** monk/nun; **parivrājaka:** wandering renunciant.

##### 4. Buddhist councils — exam convention with historical caution

| Council | Conventional place/patron | High-yield association |
|---|---|---|
| 1st | Rājagṛha; Ajātaśatru | Mahākāśyapa; recitation traditions: Ānanda (discourses), Upāli (discipline) |
| 2nd | Vaiśālī; Kālāśoka | disputes over monastic discipline; later tradition connects early Sthavira/Mahāsāṃghika division to this broad phase |
| 3rd | Pāṭaliputra; Aśoka | Moggaliputta Tissa in Theravāda tradition; purification/mission narratives |
| 4th (northern/Sarvāstivāda tradition) | Kashmir/Kuṇḍalavana; Kaniṣka | Vasumitra; **Mahāvibhāṣā**/Sarvāstivāda scholastic association |

**Correction:** do not learn “4th council = Buddhism formally split into Hinayana and Mahayana.” Mahayana developed over time and could coexist with non-Mahayana monks within the same monasteries.

##### 5. Buddhist sects / schools

| Term | What to retain |
|---|---|
| **Sthavira/Sthaviravāda** | early “Elders” stream; not Mahayana. Do not simply equate every Sthavira-derived school with modern Theravāda. |
| **Mahāsāṃghika** | early Buddhist stream; ideas of a more transcendent Buddha in some sub-schools are part of the background to Mahayana developments. |
| **Lokottaravāda** | branch associated with Mahāsāṃghika; **Mahāvastu** belongs to Lokottaravāda/Mahāsāṃghika Vinaya tradition. |
| **Sarvāstivāda** | Abhidharma school; dharmas held to “exist” across temporal modes in its characteristic theory; Kashmir/Gandhara strongholds. |
| **Vaibhāṣika** | scholastic Sarvāstivāda stream associated with Mahāvibhāṣā. |
| **Sautrāntika** | non-Mahayana Buddhist school emphasising sūtra authority and critiquing parts of Sarvāstivāda Abhidharma; **not Jain**. |
| **Sammitīya** | Buddhist Pudgalavāda-related school; **not Jain**. |
| **Mahayana** | broad doctrinal/devotional developments rather than one early Vinaya nikāya; Bodhisattva ideal, many Buddhas/Buddha-fields, new sūtras, increased Sanskrit use. |
| **Vajrayāna/Tantric Buddhism** | mantra, mudrā, maṇḍala, deity-yoga/esoteric initiation; strong later presence in eastern India and Himalayan/Tibetan traditions. |

##### 6. Mahayana and Bodhisattvas

- **Bodhisattva:** wisdom + **mahākaruṇā**; aims at Buddhahood and works for liberation of beings rather than seeking only individual final release.
- **Pāramitās:** “perfections” of Bodhisattva practice; commonly six (dāna, śīla, kṣānti, vīrya, dhyāna, prajñā), expanded in some traditions to ten.
- **Maitreya:** future Buddha.
- **Avalokiteśvara/Padmapāṇi:** compassion; lotus-bearing form.
- **Mañjuśrī:** wisdom.
- **Vajrapāṇi:** power/protection.
- **Amitābha:** central to Pure Land traditions.
- Major philosophical schools: **Madhyamaka — Nāgārjuna; Āryadeva**; **Yogācāra/Vijñānavāda — Asaṅga, Vasubandhu**.

##### 7. Buddhist texts and scholars — elimination grid

| Text/person | Identification |
|---|---|
| **Tipiṭaka/Tripiṭaka** | Vinaya + Sutta/Sūtra + Abhidhamma/Abhidharma corpora; Pali canon of Theravāda tradition |
| **Milindapañha** | dialogue: Indo-Greek king Milinda/Menander ↔ monk **Nāgasena** |
| **Nettipakaraṇa** | Buddhist exegetical text; **not Jaina** |
| **Avadānaśataka** | Buddhist avadāna collection; **not Jaina** |
| **Mahāvastu** | Lokottaravāda/Mahāsāṃghika-associated text; **not Theravāda** |
| **Lalitavistara** | Mahayana Buddhist biography/narrative of Buddha |
| **Mahāvibhāṣā** | Sarvāstivāda/Vaibhāṣika scholastic association; Kashmir council tradition |
| **Saṅghabhūti** | commentary on Sarvāstivāda Vinaya; travelled to China in late 4th c. CE |
| **Buddhaghosa** | Theravāda commentator; **Visuddhimagga** |
| **Dignāga** | Buddhist logician/epistemologist |
| **Nāgārjuna / Āryadeva** | Madhyamaka Buddhist thinkers |
| **Aśvaghoṣa** | Buddhacarita; Buddhist poet-scholar |

##### 8. Jainism — Tirthankaras and Mahavira

- **24 Tirthankaras** in the present time-cycle; **Ṛṣabhanātha/Ādinātha = 1st; Pārśvanātha = 23rd; Vardhamāna Mahavira = 24th**.
- Mahavira: Jñātṛ/Nāya Kshatriya background near Vaiśālī; renunciation → severe asceticism → **kevala-jñāna**; nirvāṇa at **Pāvā/Pāvāpurī** in Jain tradition.
- Epithets: **Jina** (conqueror), **Nirgrantha/Nigaṇṭha** (free from bonds), **Kevalin**; **Nāyaputta/Nāyaputra** is associated with Mahavira, not Gautama Buddha.
- Precise ancient dates differ across traditions/modern reconstructions → do not spend recall bandwidth on contested year-pairs unless a question specifically demands them.

##### 9. Jain doctrine

- **Triratna:** samyak darśana/faith → samyak jñāna/knowledge → samyak cāritra/conduct.
- **Five great vows (mahāvratas):** ahiṃsā, satya, asteya, brahmacarya, aparigraha. Tradition credits Pārśva with four vows and Mahavira with explicit brahmacarya as the fifth.
- **Jīva vs ajīva:** jīva = conscious/sentient substance; ajīva = non-soul categories. Jain classification recognises earth-, water-, fire-, air- and plant-bodied living beings, explaining UPSC’s “rocks/running water” style formulation.
- **Karma:** subtle material bondage attaching to jīva; liberation requires stopping influx (**saṃvara**) and shedding karma (**nirjarā**).
- **Anekāntavāda:** reality is many-sided; no single finite statement exhausts it.
- **Syādvāda:** conditioned/perspectival predication (“in some respect…”); **saptabhaṅgī** = sevenfold modes of predication.
- **Kevala-jñāna:** omniscience/perfect knowledge; liberated perfected being = siddha.
- **Ahiṃsā:** especially rigorous; central to conduct of ascetics and laity.
- **Cosmos:** eternal/uncreated in classical Jain doctrine; no creator God is required to make or maintain it.

##### 10. Jain sects

| Śvetāmbara | Digambara |
|---|---|
| “white-clad”; mendicants may wear white | “sky-clad”; full nudity is ideal for male mendicants |
| preserves an Āgama canon in Ardhamāgadhī/Prakrit tradition | holds original Angas to be lost; separate authoritative textual corpus |
| accepts possibility of female liberation; 19th Tirthankara Malli represented as female | holds woman must be reborn male for final liberation; Mallinātha male |
| images may be clothed/ornamented | Tirthankara images generally nude/unadorned |

- **Sthānakavāsī:** non-image-worshipping reform stream within **Śvetāmbara Jainism**; stresses meditation/scripture and congregational halls rather than temple-image worship.
- Historical caution: the Digambara–Śvetāmbara division hardened gradually; famine/migration and council stories are sectarian traditions, not a securely dated single “split event.”

##### 11. Jain texts / authors

| Text | Association |
|---|---|
| **Ācārāṅga Sūtra, Sūtrakṛtāṅga** | early Śvetāmbara Āgama texts |
| **Kalpa Sūtra** | traditionally associated with Bhadrabāhu; biographies/monastic material |
| **Tattvārtha Sūtra** | systematic Jain doctrine; accepted across sects with textual differences |
| **Pariśiṣṭaparvan** | **Hemacandra**; Jaina |
| **Triṣaṣṭilakṣaṇa Mahāpurāṇa** | **Jinasena** begun; **Guṇabhadra** completed; Jaina |
| **Hammīra-Mahākāvya** | **Nayachandra Sūri** |
| **Nītivākyāmṛta** | **Somadeva Sūri** |

##### 12. Jain sacred-site anchors

- **Pāvāpurī (Bihar):** Mahavira’s nirvāṇa.
- **Sammed Śikhar/Parasnath Hill (Jharkhand):** traditional nirvāṇa place of many Tirthankaras.
- **Girnar/Urjayanta (Gujarat):** strongly associated with **Neminātha (22nd)**.
- **Śatruñjaya/Palitana (Gujarat):** major Śvetāmbara pilgrimage landscape; Ādinātha/Rishabhanatha association.
- **Śravaṇabeḷagoḷa (Karnataka):** major Digambara centre; Bahubali/Gommateśvara; Chandragupta–Bhadrabahu tradition.
- For malformed `UPPCS-2021-GS1-Q057`, safe traditional matching anchors: **Rishabhanatha—Aṣṭāpada/Kailasa tradition; Vasupujya—Champapuri; Neminatha—Girnar; Mahavira—Pāvāpurī**.

#### B. Bhakti & Sufi Movements

##### 1. Bhakti — safe core

- **Bhakti = personal devotion/participation in relationship with deity**; roots are earlier than the medieval “movement” label, including Bhagavad Gita/Puranic traditions.
- Major early medieval popular devotional efflorescence in Tamil south: **Alvars (Vaiṣṇava)** + **Nayanars (Śaiva)**, roughly 6th–9th centuries CE.
- Common tendencies across many traditions: devotion over elaborate sacrificial ritual, vernacular poetry, emotionally direct relationship with deity, wider social participation.
- **Do not universalise:** some Bhakti traditions criticised caste/ritual/idolatry strongly; others worked within caste/temple/Brahmanical frameworks.

##### 2. Tamil Bhakti

| Tradition | Anchors |
|---|---|
| **Alvars** | 12 Vaiṣṇava poet-saints; Nammalvar, Periyalvar, **Andal**; hymns compiled in **Nālāyira Divya Prabandham** by Nathamuni tradition |
| **Nayanars** | 63 Śaiva saints; Appar, Sambandar, Sundarar, Karaikkal Ammaiyar; **Tēvāram** corpus; Manikkavachakar → Tiruvācakam |
| Social pattern | saints emerged from diverse backgrounds; temple pilgrimage and Tamil hymnody central; often polemical toward Jain/Buddhist rivals |

**Tamil Siddhas/Sittars:** heterogeneous Tamil yogic/mystical poet traditions; UPSC framing highlights monotheistic/anti-idolatrous tendencies. Do not treat every Siddha text as identical in doctrine.

##### 3. Virashaiva/Lingayat

- 12th-century Karnataka; **Basavanna/Basava**, Allama Prabhu, Akka Mahadevi and other śaraṇas.
- Personal **iṣṭaliṅga**; Kannada **vachanas**.
- Critique of caste hierarchy, ritual purity and several Brahmanical social conventions; women and lower-status groups visible in vachana community.
- UPSC trap: Lingayats **questioned rebirth** and rejected caste hierarchy in the formulation tested in 2016.
- Burial rather than standard Brahmanical cremation became a distinctive practice in the tradition.

##### 4. Vedantic teachers within Bhakti history

| Teacher | Doctrine | High-yield distinction |
|---|---|---|
| **Śaṅkara** | Advaita | non-dual Brahman; liberation through knowledge; not a medieval “Bhakti founder” |
| **Ramanuja** | Viśiṣṭādvaita | qualified non-dualism; personal Brahman/Narayana; **bhakti/prapatti** central to liberation |
| **Madhva** | Dvaita | real distinction between God, souls and matter; Vishnu supreme |
| **Nimbarka** | Dvaitādvaita / Bhedābheda | difference-and-non-difference; Krishna-Radha devotional tradition |
| **Vallabhacharya** | Śuddhādvaita | **Puṣṭimārga**; Krishna devotion; world treated as real manifestation of Brahman |

##### 5. Maharashtra / Varkari

| Saint | Approx. period | Anchor |
|---|---|---|
| **Jnaneshwar/Dnyaneshwar** | 13th c. | **Jnaneshwari/Bhāvārthadīpikā**, Marathi Gita commentary |
| **Namdev** | late 13th–14th c. | Vitthal/Pandharpur; abhang tradition; precedes Kabir/Nanak |
| **Eknath** | 16th c. | Marathi devotional scholarship; Bhāvārtha Rāmāyaṇa |
| **Tukaram** | 17th c. | Varkari; **abhangs**; Vitthal devotion |
| **Ramdas** | 17th c. | Dāsbodh; Rama/Hanuman devotion |

##### 6. North Indian saint traditions

| Saint/tradition | High-yield facts |
|---|---|
| **Ramananda** | North Indian Ramanandi Vaiṣṇava tradition; later hagiography links Kabir and other low-caste disciples to him |
| **Kabir** | Nirguna; critiques empty ritual, sectarianism and caste; **Bījak** is a major Kabir Panth compilation; not Dadu’s work |
| **Guru Nanak** | 1469–1539; nirguna monotheistic devotion, nām-simran, rejection of empty ritual/caste distinctions; contemporary of Lodi–Babur transition |
| **Dadu Dayal** | 16th c.; nirguna; Dadu Panth; **not author of Bijak** |
| **Chaitanya** | 1486–1533; ecstatic Krishna bhakti, Bengal–Odisha; saṅkīrtana |
| **Surdas** | Krishna bhakti; Vallabha/Puṣṭimārga association in tradition; Braj literature |
| **Mirabai** | Krishna devotion; Rajput background; vernacular devotional poems |
| **Tulsidas** | Rama bhakti; Rāmcharitmānas; Saguna Vaiṣṇava tradition |

**Chronology anchor for elimination:** **Namdev → Kabir → Guru Nanak → Chaitanya** (lifetimes overlap for the latter three, but birth/primary chronological placement follows this order).

##### 7. Devotional composers — cross with music

- **Annamacharya** (15th c.) → Telugu kīrtanas to **Venkateswara** of Tirumala.
- **Tyagaraja** (18th–19th c.) → Carnatic composer; most kritis praise **Rama**, not Krishna; created/used many ragas.
- Therefore Annamacharya and Tyagaraja are **not contemporaries**.

##### 8. Sufism — vocabulary / institutions

- **Tasawwuf:** Islamic mystical/spiritual tradition; developed over centuries, not at one single 10th-century “founding”.
- **Pir/shaikh/murshid:** master; **murīd:** disciple; **khalīfa:** authorised successor.
- **Khanqah:** hospice/lodge/teaching centre.
- **Silsila:** spiritual lineage/order; **ṭarīqa:** path/method.
- **Zikr/dhikr:** remembrance/invocation of God.
- **Samāʿ:** audition/musical spiritual assembly; especially important to many Chishtis, though contested among Islamic scholars and not universal to all Sufis.
- **Dargah:** tomb-shrine; **ziyārat:** pilgrimage/visit; **ʿurs:** death anniversary conceptualised as union with God.
- **Wali:** friend/saint of God; **baraka:** blessing/grace; **karāmat:** saintly miracle.
- **Ba-sharʿ / be-sharʿ:** broadly, Sufis observant of formal sharia norms vs antinomian/mendicant currents; not a simple good/bad binary.

##### 9. Major Sufi silsilas in India

| Order | Key Indian figures/centres | Distinction |
|---|---|---|
| **Chishti** | Muinuddin Chishti—**Ajmer**; Qutbuddin Bakhtiyar Kaki—Delhi; Baba Farid—Ajodhan/Pakpattan; Nizamuddin Auliya—Delhi/Ghiyaspur; Nasiruddin Chiragh-i-Delhi; later Gesu Daraz—Gulbarga | simplicity, service/love; early Chishtis generally maintained distance from court patronage; samāʿ prominent |
| **Suhrawardi** | **Bahauddin Zakariya—Multan** | more willing than Chishtis to accept grants/state association; scholarship + mysticism |
| **Qadiri** | spread in north India/Deccan; **Miyan Mir** prominent in Lahore; Dara Shikoh associated with Qadiri teachers | generally more accommodation with elite networks than early Chishtis; no single Indian practice universal |
| **Naqshbandi** | **Baqi Billah** introduced/established line in Mughal India; **Ahmad Sirhindi** major figure | sober/orthodox tendency; closer engagement with Mughal political-religious debates; Sirhindi is later than Kabir |
| **Shattari** | Muhammad Ghawth of Gwalior among important figures | rapid-path/yogic-interaction traditions; central India/Gujarat networks |
| **Rishi order (Kashmir)** | Nund Rishi/Sheikh Nuruddin | Kashmiri vernacular ascetic-mystical tradition |

##### 10. Chishti network / texts

- **Nizamuddin Auliya**: Delhi; disciple-successor line from Baba Farid; avoided routine court attendance; major urban khanqah.
- **Amir Khusrau**: disciple/associate of Nizamuddin; poet-musician; Chishti cultural milieu.
- **Fawāʾid-ul-Fuʾād:** malfūẓāt/conversations of Nizamuddin, compiled by **Amir Hasan Sijzi Dehlavi**.
- Source types: **malfūẓāt** (recorded conversations), **maktūbāt** (letters), **tazkira** (saint biographies), manuals such as **Kashf al-Maḥjūb** of al-Hujwiri.
- **Early Chishti samāʿ** is a recurring UPPCS anchor; do not infer from it that every Persian translation of Sanskrit music theory was caused by Chishtis.

#### C. Vedic Age, Upanishads & Philosophical Schools

##### 1. Vedic corpus — chronology first

- **Śruti:** Vedic revelation transmitted orally through recensional traditions (**śākhās**).
- Earliest stratum: especially **Rigveda family books 2–7**.
- Later Vedic stratum includes **Rigveda books 1, 8, 9, 10**, Samhitas of Sama/Yajur/Atharva Vedas, then Brahmanas, Aranyakas and Upanishads.
- Useful chronological heuristic inside later corpus: **mantra portions → Brahmanas → Aranyakas → early Upanishads**; composition overlapped and exact dates vary.

##### 2. Four Vedas

| Veda | Core character | Priest / high-yield association |
|---|---|---|
| **Rigveda** | hymns (sūktas) to deities; oldest Vedic collection; 10 mandalas | **Hotṛ** recites Rigvedic hymns; family books 2–7; Mandala 9 strongly Soma-focused |
| **Samaveda** | melodies/chants, largely adapted from Rigveda | **Udgātṛ**; liturgical singing |
| **Yajurveda** | sacrificial formulae + procedural material | **Adhvaryu**; **Śukla/White** and **Kṛṣṇa/Black** branches |
| **Atharvaveda** | hymns, domestic/royal rites, healing, charms and speculative material | associated priest **Brahman** in later śrauta system |

- **Vājasaneyi Saṃhitā = Śukla Yajurveda**; main surviving recensions: Mādhyaṃdina and Kāṇva.
- Kṛṣṇa Yajurveda includes Taittirīya, Maitrāyaṇī and Kāṭhaka traditions.
- “Vedatrayī” originally refers to Rig–Sama–Yajur liturgical triad; Atharva later fully integrated into four-Veda scheme.

##### 3. Brahmana → Aranyaka → Upanishad

- **Brahmanas:** prose ritual exegesis; sacrifice, meanings, procedures.
  - Rig → Aitareya, Kauṣītaki.
  - Sama → Pañcaviṃśa/Tāṇḍya etc.
  - Śukla Yajur → **Śatapatha Brahmana**.
  - Atharva → **Gopatha Brahmana**.
- **Aranyakas:** “forest texts”; ritual symbolism/speculation; bridge between external sacrifice and interiorised interpretation.
- **Upanishads:** philosophical inquiry through dialogues, arguments, parables and analogies; central issues = **ātman, brahman, karma, rebirth, knowledge and liberation**.

##### 4. Upanishadic anchors

- **Bṛhadāraṇyaka + Chāndogya**: among the oldest major prose Upanishads; avoid claiming one single text is indisputably “the oldest.”
- **Bṛhadāraṇyaka:** Yājñavalkya debates; **Gārgī**, Maitreyī; ātman/brahman inquiry.
- **Chāndogya:** Uddālaka Āruṇi–Śvetaketu teaching; **tat tvam asi** tradition; numerous parables/analogies.
- **Muṇḍaka (Atharvaveda):** **Satyameva Jayate**; higher/lower knowledge distinction.
- **Īśa/Iśāvāsya:** Śukla Yajurveda.
- **Kena:** Sama Veda tradition.
- **Kaṭha, Taittirīya, Śvetāśvatara:** Krishna Yajurveda-associated traditions.
- **Praśna, Muṇḍaka, Māṇḍūkya:** Atharvaveda-associated.
- UPSC trap: Upanishads **do use stories/parables**; they are substantially earlier than the classical Purāṇic corpus.

##### 5. Early Vedic religion

- Strongly sacrificial/ritual and nature-cosmological; deities invoked for cattle, rain, victory, offspring, protection, prosperity.
- Important: **Indra** (war/storm/rain), **Agni** (fire/sacrifice/intermediary), **Soma**, **Varuṇa** (linked to ṛta), Sūrya/Savitṛ, Uṣas, Aśvins, Vāyu, Maruts.
- Often described as **henotheistic/kathenotheistic**: a deity may be praised as supreme in a particular hymn without a fixed exclusive monotheism.
- **Yajña** central; prominent temple/image cult is not the defining feature of early Rigvedic religion.
- Later Vedic ritual becomes more elaborate; Prajāpati, Vishnu and Rudra gain salience; speculative questioning intensifies in late Vedic/Upanishadic material.

##### 6. Ṛta and dharma

- **Ṛta:** cosmic/natural/moral order; regularity and right order of universe and ritual; Varuṇa strongly associated with guarding it.
- **Dharma:** develops a wider semantic range; in the UPSC 2011 formulation, duties/obligations/right conduct toward self and others.
- Trap: ṛta is not merely “religious ritual”; it is a broader ordering principle.

##### 7. Vedic society/economy — only PYQ-relevant anchors

- Rigvedic society had a strong **pastoral** orientation but agriculture was also known; cattle central to wealth/exchange/status.
- Later Vedic phase: more settled **agrarian** expansion in western/middle Ganga plains; political territorialisation grows.
- `UPSC-CSE-2026-GS1-Q020`: Rigvedic text contains vocabulary/evidence relevant to wells/water-lifting and draught animals; focus on **what the textual evidence supports**, not a blanket “purely pastoral” stereotype.
- Later Vedic **ratnin** terminology includes **Bhāgadugha/Bhagadudha = collector of the king’s share/revenue**.
- **Sabha + Samiti:** important assemblies; their exact institutional distinction varies across Vedic passages.

##### 8. Six āstika darśanas — compact comparison

| School | Traditional founder / key text | Core ontology / method | Liberation / PYQ hook |
|---|---|---|---|
| **Sāṃkhya** | Kapila (traditional); **Īśvarakṛṣṇa’s Sāṃkhyakārikā** = earliest extant systematic classic | dualism: **puruṣa** (consciousness) + **prakṛti** (primordial nature); 25 tattvas; satkāryavāda | discriminative knowledge (viveka) separates puruṣa from prakṛti; accepts karma/rebirth framework |
| **Yoga** | **Patañjali, Yoga Sūtra** | shares Sāṃkhya categories; citta-vṛtti-nirodha; accepts special **Īśvara** | eight limbs: yama, niyama, āsana, prāṇāyāma, pratyāhāra, dhāraṇā, dhyāna, samādhi |
| **Nyāya** | **Akṣapāda Gautama, Nyāya Sūtra** | logic/epistemology; realist | 4 classic pramāṇas: perception, inference, comparison, verbal testimony; true knowledge removes error |
| **Vaiśeṣika** | **Kaṇāda, Vaiśeṣika Sūtra** | realist pluralism; categories (padārthas); atomism of material elements | knowledge of categories/reality; later Nyāya–Vaiśeṣika synthesis; theism more explicit in later interpretations |
| **Pūrva Mīmāṃsā** | **Jaimini, Mīmāṃsā Sūtra** | Vedic exegesis; dharma known through Vedic injunction; ritual action | emphasizes performance of Vedic duty; **apūrva** helps explain delayed ritual efficacy |
| **Vedānta/Uttara Mīmāṃsā** | **Bādarāyaṇa, Brahma Sūtra** | interpretation of Upanishadic Brahman/ātman teachings | multiple sub-schools; liberation through knowledge/devotion/grace in differing combinations |

**Six-system trap:** Lokāyata/Chārvāka, Buddhism, Jainism, Ājīvika and Kāpālika are **not** members of the canonical six āstika darśanas.

##### 9. Vedanta sub-schools

| Thinker | School | Core distinction |
|---|---|---|
| **Śaṅkara** | **Advaita** | Brahman non-dual; ātman = Brahman at ultimate level; ignorance/avidyā underlies apparent plurality; jñāna central |
| **Ramanuja** | **Viśiṣṭādvaita** | qualified non-dualism; souls/world real and dependent modes/body of Brahman; bhakti/prapatti central |
| **Madhva** | **Dvaita** | God, souls and matter genuinely distinct; Vishnu supreme |
| **Nimbarka** | **Dvaitādvaita / Bhedābheda** | simultaneous difference and non-difference between Brahman, souls, world |
| **Vallabha** | **Śuddhādvaita** | “pure non-dualism”; world real manifestation of Brahman; grace (**puṣṭi**) + Krishna devotion |

- `UPPCS-2022-GS1-Q066`: exact matching is **Ramanuja—Viśiṣṭādvaita; Madhva—Dvaita; Nimbarka—Dvaitādvaita; Vallabha—Śuddhādvaita**.
- `UPSC-CSE-2022-GS1-Q095`: durable Ramanuja fact = **devotion to a personal God is a central means/path to liberation**, not the statue/current-affairs wrapper.

##### 10. Heterodox / non-six-system anchors

- **Chārvāka/Lokāyata:** materialist/sceptical tradition; rejects Vedic authority and post-mortem/karma doctrines in standard accounts; perception privileged. “Founder Charvaka” is not a safe historical claim.
- **Ājīvika:** associated with **Makkhali Gosāla**; strong **niyati/determinism**; known largely through rival Buddhist/Jain sources. Do not import unsupported claims such as “rejected rebirth/soul” from simplified notes.
- Buddhism/Jainism: treated fully above; heterodox relative to Vedic authority, but internally sophisticated philosophical traditions.

### 6. UPPCS Extension Layer

- **Buddhist council order:** Rājagṛha → Vaiśālī → Pāṭaliputra → Kashmir/Kuṇḍalavana. Memorise order + patron/presiding monk only after the order itself.
- **Jain nirvāṇa-site grid:** Rishabhanatha—Aṣṭāpada/Kailasa tradition; Vasupujya—Champapuri; Neminatha—Girnar/Urjayanta; Mahavira—Pāvāpurī. Treat `UPPCS-2021-GS1-Q057` as malformed source evidence, not as a clean answer record.
- **Sufi centre grid:** Muinuddin Chishti—Ajmer; Bahauddin Zakariya—Multan; Nizamuddin Auliya—Delhi/Ghiyaspur; Burhanuddin Gharib—Daulatabad; Gesu Daraz—Gulbarga. This directly covers the saint–centre demand even where `UPPCS-2020-GS1-Q040` is damaged.
- **Guru–disciple / association:** Kabir—Ramananda tradition; Amir Khusrau—Nizamuddin Auliya; Mardana—Guru Nanak; Surdas—Vallabha tradition.
- **Vedic recall:** Vājasaneyi = Śukla Yajurveda; Bhāgadugha = revenue/king’s-share collector; Gautama = Nyāya; later Vedic society more agrarian vs Rigvedic pastoral emphasis.

### 7. Cross-Topic / Cross-Subtopic Traps

- **Theravāda ≠ generic “Hinayana”; Mahayana ≠ one sect born at 4th council.**
- **Lokottaravāda = Mahāsāṃghika branch; Sautrāntika/Sammitīya = Buddhist, not Jain.**
- **Mahāvastu = Lokottaravāda/Mahāsāṃghika-associated, not Theravāda.**
- **Nettipakaraṇa + Avadānaśataka = Buddhist; Pariśiṣṭaparvan + Triṣaṣṭilakṣaṇa Mahāpurāṇa = Jaina.**
- **Nāyaputta = Mahavira; Śākyamuni/Tathāgata = Buddha.**
- **Jain jīva doctrine ≠ “all inert matter is literally a soul”; distinguish jīva from ajīva while remembering elemental-bodied life categories.**
- **Sthānakavāsī = Śvetāmbara Jain; non-image-worshipping.**
- **Bījak = Kabir tradition; Puṣṭimārga = Vallabha.**
- **Tyagaraja → Rama; Annamacharya → Venkateswara; not contemporaries.**
- **Kabir predates Ahmad Sirhindi; Nimbarka is not an Akbar-era saint.**
- **Chishti generally distance from court ≠ all Sufis anti-state; Suhrawardis often accepted grants/official links.**
- **Samāʿ is important to Chishtis, but not universal to every Sufi order.**
- **Rigvedic religion = nature deities + yajña; do not project later temple/Bhakti worship backwards.**
- **Brahmana (text genre) ≠ Brahmana varna.**
- **Sāṃkhya accepts rebirth framework; liberation through discriminative knowledge.**
- **Classical Patañjali Yoga eight limbs ≠ Kundalini-chakra system.**
- **Nyāya—Gautama; Vaiśeṣika—Kaṇāda; Mīmāṃsā—Jaimini; Brahma Sūtra—Bādarāyaṇa.**
- **Ramanuja—Viśiṣṭādvaita; Madhva—Dvaita; Nimbarka—Dvaitādvaita; Vallabha—Śuddhādvaita.**
- **Satyameva Jayate = Muṇḍaka Upanishad.**
- Art sibling boundary: chaitya-vihāra, stupa architecture, mudrās and Ajanta paintings belong primarily to **Art & Culture**, though religion identity needed for elimination is retained here.

### 8. Correction / Verification Register

#### CORRECT

- **Buddhist sect history:** replace “4th council formally split Buddhism into Hinayana/Mahayana” with gradual, overlapping development; Mahayana could coexist with non-Mahayana monks in one saṅgha/monastery.
- **Theravāda/Hinayana:** do not use as exact synonyms.
- **Mahāvastu:** correct from “Theravāda text” → **Lokottaravāda/Mahāsāṃghika-associated**.
- **Pratītya-samutpāda:** do not equate with kṣaṇikavāda/momentariness.
- **Jain ontology:** replace “animate and inanimate souls” with **jīva/ajīva + elemental-bodied living beings** formulation.
- **Jain sect split:** replace single neat 1st-council split narrative with gradual Digambara–Śvetāmbara differentiation; famine/migration story retained as sectarian tradition only.
- **Buddha/Mahavira dates:** precise base-note years treated as traditional/contested; core pack prioritises sequence and sites.
- **Sāṃkhya:** replace “Sāṃkhya Sūtra = basic earliest text” with Kapila as traditional founder + **Sāṃkhyakārikā** as earliest extant systematic classic.
- **Yoga:** remove Kundalini/chakra claim from classical Patañjali Yoga payload.
- **Vaiśeṣika:** qualify “atoms moved by God’s will” as later theistic development, not defining earliest Kaṇāda atomism.
- **Vedānta:** Bādarāyaṇa = Brahma Sūtra author/compiler in tradition; avoid simplistic “founder”.
- **Bhakti:** remove movement-wide claim that every saint rejected caste, idols and ritual; preserve tradition-specific positions.
- **Sufism:** replace single-date “10th-century purification movement” origin story with gradual development in early Islamic centuries and Indian expansion from c. 11th–12th centuries onward.
- **UPPCS-2025-GS1-Q074:** canonical/source answer conflicts with independently supported chronology if transcribed names are Nanak/Namdev. Use **Namdev → Kabir → Nanak → Chaitanya**; flag answer record as suspicious.

#### VERIFY

- `UPSC-CSE-2012-GS1-Q072` — canonical status **review-required/SOURCE_UNCLEAR**; bhūmisparśa factual demand independently clear, but record answer integrity not relied upon.
- `UPSC-CSE-2019-GS1-Q009` — canonical status **review-required/SOURCE_UNCLEAR**; use only Mahayana demand cluster; avoid simplistic “all three define every Mahayana context” wording.
- `UPPCS-2021-GS1-Q057` — **review-required/TABLE_STRUCTURE_UNCLEAR**; option pairs are visibly damaged. Underlying Tirthankara-site facts supplied independently.
- `UPPCS-2020-GS1-Q040` — runtime says validated, but option text is visibly malformed/truncated (including blank Nizamuddin location). Use as demand only.
- `UPPCS-2022-GS1-Q066` — canonical record is review-required; the four Vedanta pairings are independently well resolved and included.
- `UPPCS-2020-GS1-Q021` — malformed matching structure; only broad Rigvedic/Later-Vedic demand retained.
- `UPSC-CSE-2014-GS1-Q025` and `UPSC-CSE-2015-GS1-Q039` — apparent near-verbatim duplicate question in canonical corpus with differently ordered options/keys; retain both IDs as a single repeated demand cluster.

#### OMIT

- Base-note claim that Rishabha/Arishtanemi references in Rigveda prove historical Jain Tirthankaras — unnecessary and source-sensitive for this taxonomy demand.
- “Ajivikas rejected soul/rebirth/God” blanket claim — not retained; determinism/niyati is the safe core.
- “Charvaka founded by a historical person named Charvaka” — not retained.
- Superlatives such as “oldest grammar/dictionary in the world” — low elimination value and unnecessary.
- Detailed Buddhist/Jain royal-patron lists unless tied to a PYQ/site/text.
- Current statue/anniversary hooks, including the 2022 Ramanuja statue wrapper.
- Full architecture treatment of chaitya, vihara, stupa, caves, mudrās and paintings → owned by Art & Culture.

### 9. Supplement Decision

`NO_SUPPLEMENT_NEEDED`

Base notes provide the principal content layer; Upinder Singh/Poonam Dahiya resolve conceptual/sectarian precision; Ghatna Chakra is sufficient for UPPCS-heavy recall. The damaged canonical PYQs do not prevent reconstruction of the underlying exam demand, so no additional source is required for this pack.

### 10. Synthesis Handoff

- **All child subtopics covered:** 3/3.
- **Unresolved VERIFY items:** canonical/transcription integrity of `UPSC-CSE-2012-GS1-Q072`, `UPSC-CSE-2019-GS1-Q009`, `UPPCS-2021-GS1-Q057`, `UPPCS-2020-GS1-Q040`, `UPPCS-2022-GS1-Q066`, `UPPCS-2020-GS1-Q021`; duplicated 2014/2015 Buddha-kingdom PYQ. These do **not** block factual synthesis.
- **Corrections that must override older wording:** Mahayana split narrative; Theravāda/Hinayana equivalence; Mahāvastu attribution; Jain jīva/ajīva wording; Jain sect split chronology; Sāṃkhya/Yoga/Vaiśeṣika simplifications; movement-wide Bhakti claims; single-origin Sufism claim; suspicious UPPCS 2025 saint-chronology key.
- **Explicitly excluded:** present-day polity; current statues/anniversaries/listings; pure geography; detailed architecture/sculpture/painting; unrelated dynastic narrative; generic exhaustive saint/patron catalogues with no PYQ/elimination value.
- **Synthesis priority:** build final short notes around (1) doctrine/terminology matrices, (2) sect-school genealogies, (3) text–author/tradition pairs, (4) saint/order/site chronology, (5) Vedic corpus + darśana comparison. Preserve the VERIFY flags separately rather than weakening the core payload.

---

<!-- SOURCE PACK: ART & CULTURE | ORIGINAL FILE: PRE-HISTCULT__Art-and-Culture__SOURCE-PACK__v01.md -->
## HISTORY & CULTURE → Art & Culture — Topic Source Pack v01

**Status:** PASS_WITH_CORRECTIONS  
**topic_taxonomy_id:** `prelims-history-and-culture-art-and-culture`  
**Child subtopics covered:** 6/6

### 1. Topic Scope

- **Includes:** durable Art & Culture preparation domain → architecture/sculpture; performing arts; literature/authors/travellers; painting/crafts/textiles; festivals/calendars/heritage-recognition mechanisms; durable rules/fields/institutions behind major awards and honours.
- **Excludes:** present-day polity mechanics except the narrow Article 18 awards link; pure spatial geography; current UNESCO additions, new GI tags, current award recipients and one-off cultural announcements unless needed only as PYQ-demand evidence.
- **UPSC depth:** comparison + feature discrimination; site/style/author/tradition matching; chronology; exceptions; statement-based elimination; obscure but stable cultural facts.
- **UPPCS depth:** greater builder–monument, author–text, treatise–author, prize/recipient and state/community pairing load; current-recipient questions treated as a replaceable dynamic layer, not permanent static payload.
- **Source order applied:** Taxonomy Gateway → canonical UPSC/UPPCS PYQs → user base notes → Upinder Singh/Poonam Dalal Dahiya/Ghatnachakra only for gaps/corrections → official sources only where durable statutory/institutional precision was needed.
- **Canonical PYQ scope used:** UPSC CSE Prelims GS-I **2011–2026** + UPPCS Prelims GS-I **2018–2025**. Questions were classified semantically; no corpus subject tag was assumed.

### 2. Child-Subtopic Coverage Ledger

| Child subtopic | taxonomy_id | UPSC PYQs | UPPCS PYQs | Base coverage | Status |
|---|---|---:|---:|---|---|
| Architecture & Sculpture | `prelims-history-and-culture-art-and-culture-architecture-and-sculpture` | 21 | 9 | Strong; several technical corrections | PASS_WITH_CORRECTIONS |
| Performing Arts: Music, Dance, Martial & Folk Traditions | `prelims-history-and-culture-art-and-culture-performing-arts-music-dance-martial-and-folk-traditions` | 14 | 6 | Strong; terminology/attribution corrections | PASS_WITH_CORRECTIONS |
| Literature, Authors & Foreign Travellers | `prelims-history-and-culture-art-and-culture-literature-authors-and-foreign-travellers` | 9 | 7 | Strong ancient/classical; partial Persian chronicle matrix | PASS_WITH_CORRECTIONS |
| Painting, Crafts & Textiles | `prelims-history-and-culture-art-and-culture-painting-crafts-and-textiles` | 10 | 2 | Strong painting; partial crafts/textiles/GI | PASS_WITH_CORRECTIONS |
| Festivals, Calendars & Heritage Recognition | `prelims-history-and-culture-art-and-culture-festivals-calendars-and-heritage-recognition` | 5 | 3 | Partial; calendar present, heritage mechanism thin | PASS_WITH_CORRECTIONS |
| Awards, Honours & Cultural Institutions | `prelims-history-and-culture-art-and-culture-awards-honours-and-cultural-institutions` | 3 | 14 dynamic-heavy | Weak/systematic gap; scattered award facts only | PASS_WITH_CORRECTIONS |

**Load interpretation:** raw counts are not equal to permanent-note weight. Architecture has the highest stable factual load. Awards show high UPPCS frequency, but most recent questions are recipient-of-the-year/current-prize items and therefore belong to the **CURRENT_DYNAMIC** layer rather than the permanent static core.

### 3. PYQ Demand Map

#### A. Architecture & Sculpture

##### UPSC

- **Temple architecture: styles + structural vocabulary** — `UPSC-CSE-2012-GS1-Q024`, `UPSC-CSE-2014-GS1-Q044`, `UPSC-CSE-2026-GS1-Q014`.
  - Nagara/Dravida/Vesara discrimination; Panchayatana layout; individual temple examples may not fit simplistic regional labels.
- **Rock-cut architecture / chaitya-vihara / cave-site religion** — `UPSC-CSE-2013-GS1-Q004`, `UPSC-CSE-2013-GS1-Q036`, `UPSC-CSE-2016-GS1-Q065`, `UPSC-CSE-2021-GS1-Q049`, `UPSC-CSE-2023-GS1-Q082`.
  - Barabar vs later Buddhist caves; chaitya ≠ vihara; Ajanta and Mahabalipuram can be compared through rock-cut construction; Waghora–Ajanta; Bhaja Buddhist / Sittanavasal Jain / Besnagar trap.
- **Stupa form and historical development** — `UPSC-CSE-2023-GS1-Q042`, `UPSC-CSE-2026-GS1-Q004`.
  - Mounded funerary/commemorative precedent predates Buddhism; Buddhist stupa = relic/votive/commemorative monument; Andhra/Amaravati-specific form and influence.
- **Sculpture + chronology** — `UPSC-CSE-2014-GS1-Q085` **[EDITABLE_REVIEW: SOURCE_UNCLEAR]**, `UPSC-CSE-2015-GS1-Q054`, `UPSC-CSE-2019-GS1-Q008`, `UPSC-CSE-2025-GS1-Q072`.
  - Ajanta Mahaparinirvana; Mamallapuram relief; Dhauli elephant earliest among compared works; Kanganahalli Ashoka portrait; Harappan Dancing Girl = bronze.
- **Temple/site obscurity + feature elimination** — `UPSC-CSE-2014-GS1-Q089`, `UPSC-CSE-2017-GS1-Q075`, `UPSC-CSE-2021-GS1-Q031`.
  - Himalayan Buddhist site-location pairs; Arasavalli Sun temple; Chausath Yogini circular plan and Kachchhapaghata association.
- **Indo-Islamic / Mughal cultural architecture** — `UPSC-CSE-2014-GS1-Q093`, `UPSC-CSE-2015-GS1-Q041`, `UPSC-CSE-2019-GS1-Q011`, `UPSC-CSE-2022-GS1-Q096`.
  - Ibadat Khana function; arch/dome/gunpowder chronology traps; Vijayanagara kalyana mandapa; Somnath’s durable historical-cultural facts separated from current inauguration hook.

##### UPPCS

- **Builder–monument / monument–place** — `UPPCS-2018-GS1-Q042`, `UPPCS-2018-GS1-Q117`, `UPPCS-2019-GS1-Q109`, `UPPCS-2025-GS1-Q049`, `UPPCS-2025-GS1-Q057`.
  - Khayr-ul-Manazil–Maham Anga; Adina Masjid–Pandua; Markandeshwar; Buland Darwaza–Gujarat victory; Mughal tomb cities.
- **Chronology** — `UPPCS-2018-GS1-Q113`, `UPPCS-2019-GS1-Q091`.
  - Pallava/Chola monument sequence; Atala Mosque → Sher Shah tomb → Humayun tomb → Bibi ka Maqbara sequence.
- **Regional/Andhra Buddhist architecture** — `UPPCS-2022-GS1-Q075` **[text corruption suspect despite validated status]**.
  - Amaravati → projecting ayaka platforms/pillars; use the concept, not damaged question wording.
- **Temple tradition/site lore** — `UPPCS-2020-GS1-Q014`.
  - Multan Sun-temple/traveller tradition; demands old sacred-site associations rather than modern geography alone.

##### Demand synthesis

- Highest-return preparation = **form → feature → site → patron/dynasty → chronology**.
- UPSC tests **comparative architecture and exceptions**; UPPCS increases **proper-noun recall** (builder, town, province, tomb, gateway).
- A compact style table is insufficient unless accompanied by rock-cut/stupa terminology and a site-builder matrix.

#### B. Performing Arts: Music, Dance, Martial & Folk Traditions

##### UPSC

- **Dance-form markers** — `UPSC-CSE-2012-GS1-Q068`, `UPSC-CSE-2013-GS1-Q079`, `UPSC-CSE-2014-GS1-Q083`, `UPSC-CSE-2014-GS1-Q088`, `UPSC-CSE-2017-GS1-Q012`.
  - Kuchipudi dialogue/Tarangam; tribhanga; Sattriya’s Vaishnavite Assam setting; Mohiniattam Kerala; Manipuri Sankirtana not reducible to cymbals alone.
- **Martial/folk/community traditions** — `UPSC-CSE-2014-GS1-Q087`, `UPSC-CSE-2014-GS1-Q091`, `UPSC-CSE-2018-GS1-Q022`.
  - Kalaripayattu; Manganiyars; Chapchar Kut/Khongjom Parba/Thang-Ta state pairing.
- **Music genres and composers** — `UPSC-CSE-2012-GS1-Q067`, `UPSC-CSE-2018-GS1-Q044`, `UPSC-CSE-2019-GS1-Q016`.
  - Dhrupad devotional/spiritual character and alap; Tyagaraja composition traps; Akbar gave Tansen **Mian**, not the name/title “Tansen”.
- **Institutions/gharana/raga detail** — `UPSC-CSE-2025-GS1-Q018`, `UPSC-CSE-2026-GS1-Q009`, `UPSC-CSE-2026-GS1-Q011`.
  - Gandharva Mahavidyalaya–Lahore; Mallikarjun Mansur–Jaipur-Atrauli; Carnatic Dheera Shankarabharanam ↔ Hindustani Bilawal proximity.

##### UPPCS

- **Treatise–author** — `UPPCS-2021-GS1-Q143` **[TABLE_STRUCTURE_UNCLEAR]**, `UPPCS-2022-GS1-Q091`.
  - Resolved matrix: Ragamala–Pundarika Vitthala; Rasa Kaumudi–Srikantha; Raga Vibodha–Somanatha; Chaturdandi Prakashika–Venkatamakhin.
- **Music and Indo-Persian interaction** — `UPPCS-2018-GS1-Q038`.
  - Persian translations of Sanskrit music works; Sufi sama; cultural synthesis.
- **Tansen patronage** — `UPPCS-2019-GS1-Q089`.
  - Before Akbar: Raja Ramchandra Singh of Rewa/Bandhavgarh.
- **Text/composition** — `UPPCS-2020-GS1-Q044`.
  - *Kitab-i-Nauras* → Ibrahim Adil Shah II.
- **Genre development** — `UPPCS-2023-GS1-Q038`.
  - Tappa/Punjabi camel-driver folk base → later court/semi-classical development; exam key associates encouragement with Muhammad Shah; later refinement also tied to Shori Mian/Awadh.

##### Demand synthesis

- Learn each classical dance through **state + movement/posture + repertoire/ritual context + music system + one distinctive prop/feature**.
- Music needs **Hindustani vs Carnatic framework + Dhrupad/Khayal/Tappa + major treatises + high-yield exponents/gharanas**.
- Martial/folk questions are state-pair elimination questions; broad encyclopaedic lists have low marginal value.

#### C. Literature, Authors & Foreign Travellers

##### UPSC

- **Sanskrit drama/authors** — `UPSC-CSE-2016-GS1-Q010`, `UPSC-CSE-2020-GS1-Q036`, `UPSC-CSE-2021-GS1-Q041`, `UPSC-CSE-2024-GS1-Q063`.
  - Kalidasa–*Malavikagnimitra* and Chandragupta II association; Bhavabhuti/Hastimalla/Kshemeshvara = playwrights; Bhasa → *Madhyama-vyayoga*.
- **Text–author elimination** — `UPSC-CSE-2023-GS1-Q046`.
  - *Devichandraguptam*–Vishakhadatta; *Hammira-Mahakavya*–Nayachandra Suri; *Nitivakyamrita*–Somadeva Suri; *Milindapanha* is not Nagarjuna.
- **Buddhist commentary** — `UPSC-CSE-2024-GS1-Q064`.
  - Sanghabhuti’s commentary concerns Sarvastivada Vinaya.
- **Foreign travellers** — `UPSC-CSE-2013-GS1-Q006`, `UPSC-CSE-2018-GS1-Q073`, `UPSC-CSE-2025-GS1-Q015`.
  - Xuanzang’s social observations; Tavernier and diamond mines; Fa-Hien–Chandragupta II.

##### UPPCS

- **Persian chronicle matrix** — `UPPCS-2019-GS1-Q016` **[TABLE_STRUCTURE_UNCLEAR but independently resolved]**, `UPPCS-2023-GS1-Q033` **[TABLE_STRUCTURE_UNCLEAR but independently resolved]**.
  - Tabaqat-i-Nasiri–Minhaj-i-Siraj; Tarikh-i-Firuzshahi–Afif/Barani same-title trap; Tughluqnama–Amir Khusrau, not Ibn Battuta; regional chronicles (Gujarat/Ahmadnagar/Bengal/Mahmud Gawan letters).
- **Translation/intellectual patronage** — `UPPCS-2023-GS1-Q037`.
  - Firoz Shah Tughlaq’s translation patronage; Nagarkot Sanskrit manuscripts.
- **Women poets / obscure matching** — `UPPCS-2023-GS1-Q039`.
  - Demand signal = author–composition pair; keep as extension, not disproportionate core.
- **Traveller chronology** — `UPPCS-2024-GS1-Q149`.
  - Fa-Hien → Xuanzang → I-Tsing → Al-Biruni.
- **Classical author elimination** — `UPPCS-2025-GS1-Q048`, `UPPCS-2025-GS1-Q086` **[OPTION_BOUNDARY_UNCLEAR]**.
  - *Shringar Shatak* = Bhartrihari, not Kalidasa; canonical option for 2025-Q086 is unsafe, but independent reconstruction gives Trivikrama–Nala Champu; Somadeva–Kathasaritsagara; Jayadeva–Gita Govinda; Kshemendra–Brihatkathamanjari.

##### Demand synthesis

- Core unit = **text ↔ author ↔ patron/period/genre**; for travellers = **origin ↔ ruler/period ↔ work ↔ distinctive observation**.
- UPPCS requires a denser Persian-chronicle matrix than UPSC.
- Do not memorize doubtful authorship when the historical tradition itself is uncertain; use secure associations and mark ambiguity.

#### D. Painting, Crafts & Textiles

##### UPSC

- **Murals / cave paintings** — `UPSC-CSE-2013-GS1-Q057`, `UPSC-CSE-2017-GS1-Q069`, `UPSC-CSE-2026-GS1-Q016`.
  - Ajanta + Lepakshi; Padmapani–Ajanta; Hallisalasya–Bagh cave = joyous folk-dance scene.
- **Painting schools** — `UPSC-CSE-2018-GS1-Q042`.
  - Bani Thani → Kishangarh.
- **Craft/textile–place pairing** — `UPSC-CSE-2014-GS1-Q076`, `UPSC-CSE-2015-GS1-Q096`, `UPSC-CSE-2018-GS1-Q054`.
  - Chanderi/Kancheepuram; Kalamkari cotton textile; Puthukkuli/Toda shawl–Tamil Nadu, Sujni–Bihar, Uppada Jamdani–Andhra Pradesh.
- **GI mechanism + examples** — `UPSC-CSE-2015-GS1-Q099`, `UPSC-CSE-2018-GS1-Q026`.
  - Banaras brocade/sarees; GI law linked to TRIPS/WTO obligations.
- **Current-hook anniversary with durable history** — `UPSC-CSE-2023-GS1-Q083`.
  - National Handloom Day = 7 August; durable reason = Swadeshi movement launch/handloom association. Current annual publicity is not a static note layer.

##### UPPCS

- **Craft terminology** — `UPPCS-2019-GS1-Q117` → *Venushilpa* = bamboo art; linked with Upendra Maharathi.
- **Prehistoric painting** — `UPPCS-2020-GS1-Q010` → V. S. Wakankar and Bhimbetka’s prehistoric significance.

##### Demand synthesis

- Painting needs **site/school → theme → patron/period → visual marker**.
- Crafts need **craft/textile → material/technique → state/region**; GI law is a separate legal-identification trap.
- New GI registrations are dynamic; use old high-frequency examples only as durable anchors.

#### E. Festivals, Calendars & Heritage Recognition

##### UPSC

- **National calendar** — `UPSC-CSE-2014-GS1-Q084`.
  - Chaitra 1 of Saka-based national calendar = 22 March in normal year; 21 March in leap year.
- **Community/tradition pairing** — `UPSC-CSE-2017-GS1-Q070`.
  - Chaliha Sahib–Sindhis; Nanda Raj Jaat not Gonds; Wari-Warkari not Santhals.
- **UNESCO ICH recency** — `UPSC-CSE-2024-GS1-Q060`.
  - Demand signal = ability to distinguish ICH elements/listing chronology; specific latest-entry fact remains dynamic.
- **UNESCO WHS listing-year question** — `UPSC-CSE-2024-GS1-Q065` **[EDITABLE_REVIEW: EMPTY_STATEMENT]**.
  - Missing property text prevents reliable reconstruction; retain only “UNESCO listing-year discrimination” as demand.
- **Heritage form behind current listing** — `UPSC-CSE-2026-GS1-Q027`.
  - Moidams = Tai-Ahom royal/noble mound-burial tradition of Assam; listing status/year is dynamic, cultural form is durable.

##### UPPCS

- **National calendar misconceptions** — `UPPCS-2019-GS1-Q023`.
  - Not Vikram Era; national calendar adoption ≠ 26 January 1950.
- **UNESCO session/listing** — `UPPCS-2019-GS1-Q035`.
  - Jaipur 2019 WHS listing = time-bound example; do not freeze session/year as core beyond demand evidence.
- **Kumbh location/current-year hook** — `UPPCS-2025-GS1-Q097` **[malformed text; CURRENT_DYNAMIC]**.
  - Use only as demand signal for festival-site/state association; do not preserve damaged current-year wording.

##### Demand synthesis

- Static preparation = **festival ↔ community/state + calendar mechanics + UNESCO recognition framework + durable cultural form**.
- Listing years, “latest inscription”, host session and year-specific mela questions require a separate current-affairs refresh.

#### F. Awards, Honours & Cultural Institutions

##### UPSC

- **Civilian awards + Article 18 + rules** — `UPSC-CSE-2021-GS1-Q096`.
  - Bharat Ratna/Padma are national awards, not prohibited titles; Padma awards have had more than one interruption; Bharat Ratna max three in a year.
- **Sports award purpose** — `UPSC-CSE-2023-GS1-Q095`.
  - Major Dhyan Chand Khel Ratna ↔ spectacular/outstanding performance over preceding four years; Dronacharya ↔ coaches; Arjuna ≠ lifetime award; Rashtriya Khel Protsahan Puruskar ≠ retired-sportsperson lifetime award.
- **Gandhi Peace Prize jury** — `UPSC-CSE-2025-GS1-Q093`.
  - PM + CJI + Lok Sabha opposition representative + two eminent persons; President is not a member of this jury.

##### UPPCS

- **CURRENT_DYNAMIC prize/recipient demand:** `UPPCS-2018-GS1-Q109`, `UPPCS-2019-GS1-Q113`, `UPPCS-2019-GS1-Q118`, `UPPCS-2021-GS1-Q129`, `UPPCS-2023-GS1-Q076`, `UPPCS-2023-GS1-Q079`, `UPPCS-2024-GS1-Q056`, `UPPCS-2024-GS1-Q140`, `UPPCS-2025-GS1-Q020`, `UPPCS-2025-GS1-Q052`, `UPPCS-2025-GS1-Q081`, `UPPCS-2025-GS1-Q096`, `UPPCS-2025-GS1-Q107`, `UPPCS-2025-GS1-Q148`.
  - Repeated formats: recipient ↔ award ↔ field/work/nationality; literary prize; film prize; sports honour; Padma category; Jnanpith/Booker/Sahitya Akademi.
  - These questions justify knowing **what the award is**, who administers it, its field/rule structure and a few foundational facts; the annual recipient list must remain replaceable.

##### Demand synthesis

- UPSC = rule/jury/purpose discrimination.
- UPPCS = much heavier annual-recipient recall.
- Permanent pack therefore stores **award architecture + institution identity**, while recipient-of-the-year facts are explicitly excluded from the static payload.

### 4. Base-Note Coverage

#### Architecture & Sculpture

- **Strong:** Mauryan art/sculpture, stupa/cave evolution, post-Mauryan schools, Gupta art, Pallava–Chola–Vijayanagara temple architecture, Sultanate/Mughal/Indo-Islamic architecture; base clusters roughly around lines 1428–1745, 2869–3815.
- **Partial:** precise Andhra stupa vocabulary; some obscure provincial Sultanate builder–monument pairs.
- **Missing:** clean PYQ-oriented “site → religion/style → dynasty/patron → defining feature” matrix.
- **Outdated/suspect:** Amaravati material called “white marble”; Dravida gopuram/vimana wording; Hoysala material; Vesara etymology; Vaikuntha Perumal patron attribution; sweeping Khajuraho/Kamasutra claim; “Dhauli caves” formulation; Bibi ka Maqbara commission wording.

#### Performing Arts: Music, Dance, Martial & Folk Traditions

- **Strong:** classical dances, theatre/folk forms, Hindustani and Carnatic music, Dhrupad/Khayal/Thumri/Tappa, instruments, gharanas; base concentrated around lines 4764–5133.
- **Partial:** UPPCS-specific music treatise–author pairs and modern institution/exponent hooks.
- **Missing:** compact comparative matrix keyed to actual PYQ traps.
- **Outdated/suspect:** “Bha-Ra-Ta” as historical etymology; oldest/second-oldest dance ranking; Khayal solely “invented by Amir Khusrau”; Bhatkhande said to popularise Carnatic music; Venkatamakhin misspelling; doubtful tala-count table; “four people won all top four civilian awards”.

#### Literature, Authors & Foreign Travellers

- **Strong:** Vedic/classical/Sanskrit, Buddhist/Jaina, Sangam/Tamil and substantial medieval literary material; base around lines 4477–4763 plus dynasty-specific sections.
- **Partial:** UPPCS-heavy Persian chronicles and regional-history texts; traveller matrix dispersed rather than consolidated.
- **Missing:** single author–work–patron/period table and traveller chronology.
- **Outdated/suspect:** *Abhidharmakosha* attributed to Dignaga; *Surya Siddhanta* conflated with Aryabhata; some inscription-author attributions; occasional title transliterations.

#### Painting, Crafts & Textiles

- **Strong:** prehistoric, mural, miniature, Mughal, Rajput/Pahari and regional painting; base lines 5134–5312.
- **Partial:** craft/state pairing, textile techniques, GI static framework.
- **Missing:** compact craft–material–technique–state matrix.
- **Outdated/suspect:** Kangra painting conflated with embroidery; Aripan treated as Madhubani subtype; Lepakshi “secular/absence of primary colours” generalization; Jahangir “great painter” wording; European influence pushed too late; “all art declined” under Aurangzeb.

#### Festivals, Calendars & Heritage Recognition

- **Strong:** none as a systematic subtopic.
- **Partial:** Vikram/Saka calendar facts and scattered festivals/sites.
- **Missing:** UNESCO World Heritage vs ICH framework; community–festival matrix; static heritage terminology.
- **Outdated/suspect:** Kanishka as certain originator of the Saka era. Treat the era’s **78 CE epoch** as secure; exact originator attribution as historiographically disputed/not required for the national-calendar rule.

#### Awards, Honours & Cultural Institutions

- **Strong:** none as a systematic subtopic.
- **Partial:** scattered references to Sangeet Natak Akademi and awards/exponents.
- **Missing:** Bharat Ratna/Padma/Gandhi Peace/Khel Ratna/Bhatnagar rules; award vs institution distinctions; Sahitya/Sangeet Natak/Lalit Kala Akademi identity.
- **Outdated/suspect:** cumulative “top four civilian awards” formulation; current recipient lists would age immediately.

### 5. Core Fact Payload

#### A. Architecture & Sculpture

##### 1. Architectural vocabulary: first-line eliminators

| Form | Core identification | High-yield distinction |
|---|---|---|
| **Stupa** | Mounded reliquary/commemorative monument; major Buddhist form | The mound concept is not uniquely Buddhist in origin; Buddhism institutionalised relic, votive and commemorative use |
| **Chaitya** | Congregational/prayer hall, commonly apsidal in early rock-cut tradition; often stupa at rear | **Not** the monks’ residential block |
| **Vihara** | Monastic residence; cells around hall/court | Later Mahayana viharas may include image-shrines, so “residence only” is too absolute |
| **Garbhagriha** | Sanctum | Houses principal deity; ritual core |
| **Mandapa** | Pillared hall | May multiply: ardha-/maha-/kalyana etc. by period/style |
| **Shikhara** | North Indian/Nagara sanctum superstructure | Curvilinear profile in classic Nagara; often amalaka + kalasha above |
| **Vimana** | In southern/Dravida usage, shrine/sanctum superstructure | Pyramidal/tiered **talas**; do not confuse with gateway tower |
| **Gopuram** | Monumental entrance gateway of southern temple enclosure | Becomes visually dominant especially in later South Indian complexes |
| **Panchayatana** | Main shrine + four subsidiary shrines at corners of platform/plan | Layout, not a sect or one regional style |
| **Pradakshinapatha** | Circumambulatory path | Around sanctum/stupa depending monument |

##### 2. Stupa anatomy + Andhra extension

- **Anda** → hemispherical mound.
- **Harmika** → small square railing/enclosure at summit.
- **Yashti + chhatra/chhatravali** → central mast + umbrella(s), sovereignty/honour symbolism.
- **Vedika** → railing; **torana** → ceremonial gateway; **medhi/pradakshinapatha** → circumambulatory arrangement.
- **Early aniconic Buddhist narrative:** Buddha may be evoked by empty throne, Bodhi tree, footprints, wheel, stupa rather than anthropomorphic image.
- **Bharhut / Sanchi:** narrative relief + donor inscriptions; railings/toranas key.
- **Amaravati / lower Krishna region:** pale limestone sculptural tradition; dense dynamic reliefs; major Andhra Buddhist centre. Projecting **ayaka platforms** at cardinal directions with sets of ayaka pillars are characteristic of Andhra stupa architecture.
- **Nagarjunakonda:** important Andhra Buddhist complex; stupas, monasteries, apsidal shrines; overseas/Sri Lankan Buddhist links in inscriptions.
- **Trap:** “stupa = only relic repository” is too narrow → also votive/commemorative functions.

##### 3. Rock-cut architecture matrix

| Site | Region | Affiliation/period cue | Exam marker |
|---|---|---|---|
| **Barabar Hills** | Bihar | Mauryan; caves dedicated by Ashoka to Ajivikas | Earliest surviving major rock-cut architecture in India; highly polished interiors |
| **Nagarjuni Hills** | Bihar | Mauryan-successor phase; Dasharatha inscriptions | Ajivika cave patronage continues |
| **Bhaja** | Maharashtra | Early Buddhist | Chaitya + viharas; UPSC/UPPCS Buddhist-site discriminator |
| **Karle/Karla** | Maharashtra | Buddhist | Monumental early chaitya hall; large apsidal prayer hall |
| **Kanheri** | Mumbai region | Buddhist; long occupation | Large cave complex; later Mahayana imagery incl. multi-headed Avalokiteshvara |
| **Ajanta** | Maharashtra, Waghora gorge | Buddhist; early phase + major Vakataka phase | Chaitya/vihara + murals; Padmapani; Jataka themes |
| **Ellora** | Maharashtra | Buddhist + Brahmanical + Jain | Multi-religious rock-cut complex; Kailasa = monolithic Hindu temple |
| **Elephanta** | Maharashtra | Shaiva | Maheshmurti/Trimurti and large Shiva relief programme |
| **Udayagiri** | Madhya Pradesh | Gupta, Brahmanical | Colossal Varaha relief; not to be confused with Odisha Udayagiri |
| **Udayagiri–Khandagiri** | Odisha | Jain, Kalinga/Chedi context | Hathigumpha association; early Jain rock-cut caves |
| **Badami** | Karnataka | Early Chalukya | Brahmanical + Jain cave temples |
| **Sittanavasal** | Tamil Nadu | Jain | Jain cave/shrine + mural tradition |
| **Mahabalipuram/Mamallapuram** | Tamil Nadu | Pallava | Rock-cut mandapas + monolithic rathas + later structural Shore Temple |

**Key correction:** Dhauli is crucial for Ashoka’s edicts and the rock-cut elephant emerging from the rock; it should not be flattened into the same “cave complex” category as Barabar/Nagarjuni.

##### 4. Sculpture: chronological discriminators

- **Harappan:** bronze **Dancing Girl** (Mohenjo-daro) → lost-wax/cire-perdue tradition; Priest-King in stone; terracotta figurines.
- **Mauryan court art:** monolithic polished sandstone pillars; animal capitals; Sarnath lion capital; Dhauli elephant; high polish. Popular/non-court traditions include yaksha/yakshi forms.
- **Post-Mauryan relief:** Bharhut–Sanchi–Amaravati narratives; donor-driven religious art expands.

| School | Material/region | Religious range | Visual cues |
|---|---|---|---|
| **Gandhara** | NW; grey schist + stucco common | Mainly Buddhist | Hellenistic/Roman naturalism; heavy drapery folds; wavy hair; anatomical modelling |
| **Mathura** | Mathura region; mottled red sandstone | Buddhist + Jain + Brahmanical | Indigenous yaksha-derived robust bodies; frontal iconic presence; multiple traditions |
| **Amaravati** | Andhra/lower Krishna; pale limestone | Buddhist | Dynamic, crowded narrative relief; movement and slender figures |
| **Gupta/Sarnath** | Gangetic north | Buddhist + Brahmanical | Refined idealisation; smooth body treatment; transparent robe effect; spiritual calm |
| **Chola bronze** | Tamil region | Shaiva/Vaishnava | Lost-wax; portable processional icons; Nataraja is canonical marker |

- **Kanganahalli/Sannati:** inscribed portrait labelled **Ranyo Ashoka** is a rare named sculptural representation of Ashoka.
- **Dhauli rock elephant** (3rd c. BCE) predates Udayagiri Varaha (Gupta), Mahabalipuram rock-cut monuments (Pallava) and Lingaraja Temple (early medieval).
- **Ajanta Cave 26:** Mahaparinirvana Buddha relief → use with caution in malformed 2014 PYQ, but the site association itself is secure.
- **Mamallapuram:** giant open-air relief commonly called **Descent of the Ganga / Arjuna’s Penance**.

##### 5. Temple styles: diagnostic comparison

| Feature | Nagara | Dravida | Deccan / “Vesara” usage |
|---|---|---|---|
| Core geography | North/central/east/west India, with regional variants | Tamil/Karnataka-Andhra south, with regional variants | Deccan hybrid/experimental zone, especially Chalukya–Hoysala discussions |
| Sanctum tower | Curvilinear **shikhara** | Pyramidal **vimana** of storeyed talas | Mixed vocabulary; not one rigid blueprint |
| Summit | Amalaka + kalasha frequent | Griva + shikhara/cupola + stupi/kalasha | Varies |
| Gateway emphasis | Usually less dominant than later southern gopurams | **Gopuram** important, especially later complexes | Varies |
| Plan | Square-based with projections; many regional variants | Axial, enclosure-oriented complexes common | Stellate/multi-projected plans especially Hoysalas |
| Trap | Boundary wall/tank are not universal diagnostic tests | Gopuram ≠ vimana | “Vesara” is a classificatory label; individual Deccan monuments may use Nagara and Dravida forms side by side |

###### Nagara regional anchors

- **Odisha/Kalinga:** sanctum tower = **rekha deul**; assembly hall commonly **jagamohana/pidha deul**; mature complexes may add **natamandira** + **bhogamandapa**.
  - **Lingaraja, Bhubaneswar** → mature Kalinga complex.
  - **Konark Sun Temple** → Eastern Ganga, Narasimhadeva I; monumental chariot imagery.
- **Central India/Chandela:** **Khajuraho** → high platforms, clustered ascending shikharas, rich exterior sculpture; erotic panels form only a fraction of total programme—do not reduce the complex to “Kamasutra temples”.
- **Gujarat/Rajasthan/Maru-Gurjara:** highly articulated exteriors, ornate columns/toranas; Modhera Sun Temple; Jain temple traditions (Dilwara etc.) show exceptional marble carving.
- **Sun-temple trap:** **Arasavalli (Andhra Pradesh)** is a genuine Sun-temple site; Amarkantak/Omkareshwar are not interchangeable Sun-temple answers.
- **Chausath Yogini, Morena:** circular hypaethral/roofless-type Yogini complex; Kachchhapaghata association; Shaiva-Shakta/Yogini context. “Only circular temple in India” is false.

###### Pallava → Chola → Vijayanagara progression

- **Pallava:**
  - **Mahendravarman I** → early rock-cut cave phase; Mandagapattu inscription is key structural-history evidence.
  - **Narasimhavarman I (Mamalla)** → monolithic rathas and major Mamallapuram rock-cut programme.
  - **Narasimhavarman II Rajasimha** → structural **Shore Temple** and **Kailasanatha, Kanchipuram**.
  - **Nandivarman II Pallavamalla** → **Vaikuntha Perumal Temple, Kanchipuram**; corrects a common misattribution to Rajasimha.
- **Chola:**
  - **Brihadisvara, Thanjavur** → Rajaraja I.
  - **Gangaikondacholisvaram / Gangaikondacholapuram** → Rajendra I.
  - Monumental stone temples + mature bronze tradition; processional bronzes supplement fixed stone icons.
- **Vijayanagara:** large temple compounds; **kalyana mandapas**, composite/yali pillars, expansion of enclosure/gopuram systems; **Vitthala Temple, Hampi** a key mature example.
- **UPSC marker:** kalyana mandapas are especially associated with Vijayanagara architectural development.

###### Chalukya–Rashtrakuta–Hoysala Deccan

- **Aihole:** architectural laboratory; early structural forms; both curvilinear and pyramidal experiments.
- **Pattadakal:** Nagara and Dravida forms coexist; **Virupaksha Temple** = major Dravida-form Chalukya monument.
- **Ellora Kailasa (Cave 16):** Rashtrakuta **Krishna I**; monolithic excavation from living rock; Dravida temple vocabulary translated into rock-cut form.
- **Hoysala:** Belur–Halebidu–Somanathapura; star/stellate plans, raised **jagati**, lathe-turned pillars, dense horizontal sculptural bands; **soapstone/chloritic schist** facilitates intricate carving.
  - Chennakeshava, Belur → Vishnuvardhana.
  - Hoysaleshvara, Halebidu → major 12th-c. Hoysala monument.
  - Kesava, Somanathapura → late Hoysala.

##### 6. Indo-Islamic architecture: feature logic

- **Arcuate** construction = true arch/vault/dome; **trabeate** = post-and-lintel. Early Sultanate buildings often reuse/translate trabeate craftsmanship and corbelled solutions before fully mature arcuate technique.
- **Mosque essentials:** prayer hall; **mihrab** marks qibla direction; **minbar** pulpit; courtyard often present; minaret is common but not universally necessary.
- **Tomb/garden architecture:** domed chamber + enclosure/garden planning becomes major Sultanate-Mughal field.

###### Sultanate + provincial anchors

| Monument / feature | Patron/dynasty/place | Recall point |
|---|---|---|
| Quwwat-ul-Islam + Qutb Minar complex | Aibak / Iltutmish phases, Delhi | Early Sultanate synthesis; Minar started by Aibak, substantially completed by Iltutmish |
| Alai Darwaza | Alauddin Khalji | Mature true-arch/dome technique; red sandstone + marble |
| Tughlaqabad | Ghiyasuddin Tughlaq | Battered/sloping walls, fortress austerity |
| Sultan Ghari | Iltutmish | Early Sultanate tomb tradition |
| Atala Mosque | Ibrahim Shah Sharqi, Jaunpur | Sharqi provincial architecture; 1408 marker in UPPCS chronology |
| Lal Darwaza Mosque | Jaunpur | Sharqi/Jaunpur school |
| Adina Mosque | **Pandua, Bengal** | Do not place at Mandu |
| Dakhil Darwaza | Gaur, Bengal | Bengal monument-place pair |
| Teen Darwaza | Ahmedabad, Gujarat | Gujarat Sultanate pair |
| Jahaz Mahal / Hindola Mahal | Mandu | Malwa provincial architecture; builder attributions may vary by individual structure—use secure monument-place association first |

###### Mughal anchors

- **Humayun’s Tomb, Delhi:** Persian garden-tomb idiom + Indian setting; major precursor to mature Mughal funerary architecture.
- **Akbar:** red sandstone, trabeate + arcuate synthesis; **Fatehpur Sikri** complex; Ibadat Khana = inter-religious discussion hall; **Buland Darwaza** commemorates Gujarat victory, not Jahangir’s birth.
- **Khayr-ul-Manazil, Delhi:** commissioned by **Maham Anga**; near Purana Qila—UPPCS-specific builder recall.
- **Jahangir/Noor Jahan phase:** **Itimad-ud-Daulah** → extensive white marble and pietra-dura/parchin kari; transition toward Shahjahani aesthetic.
- **Shah Jahan:** Taj Mahal; Red Fort/Shahjahanabad; Jama Masjid; heightened marble, symmetry, bulbous dome, pietra-dura and refined garden/axial planning.
- **Bibi ka Maqbara, Aurangabad:** commissioned by **Prince Azam Shah** for his mother Dilras Banu Begum; later Mughal echo of Taj form. Avoid saying Aurangzeb personally commissioned it.
- **Mughal tomb-place UPPCS set:** Babur–Kabul; Humayun–Delhi; Jahangir–Lahore; Shah Jahan–Agra.

##### 7. Uttar Pradesh / UPPCS monument extension

- **Jaunpur Sharqi:** Atala Mosque; Lal Darwaza Mosque; monumental propylon/pishtaq-like façade and reduced conventional minaret emphasis.
- **Fatehpur Sikri:** Jama Masjid, Buland Darwaza, Panch Mahal, Diwan-i-Khas, Salim Chishti tomb, Ibadat Khana context.
- **Agra:** Agra Fort/Mughal palaces; Itimad-ud-Daulah; Taj Mahal; Sikandra nearby.
- **Lucknow/Awadh:** **Bara Imambara + Rumi Darwaza** → Asaf-ud-Daula; Nawabi architectural layer useful for state exams.
- Builder questions should be revised as **monument → builder/dynasty → city → one identifying feature**, not as isolated names.

#### B. Performing Arts: Music, Dance, Martial & Folk Traditions

##### 1. Common performance vocabulary

- **Natyashastra** → traditionally attributed to **Bharata Muni**; drama, dance, music, aesthetics.
- **Rasa–bhava** logic: performance evokes aesthetic experience through states/emotions; avoid treating rasa as merely “facial expression”.
- **Four abhinayas:**
  - **Angika** → body/gesture.
  - **Vachika** → speech/song/voice.
  - **Aharya** → costume, make-up, stage properties.
  - **Sattvika** → internal/emotive expression.
- **Tribhanga** → body bent at three points; iconic Odissi visual marker but the pose appears in Indian sculpture beyond Odissi.
- Do **not** use “Bha-Ra-Ta = Bhava-Raga-Tala” as a historical derivation of Bharatanatyam; at best it is a modern mnemonic.

##### 2. Classical dance matrix

| Dance | Core region | High-yield markers | Music / textual cue |
|---|---|---|---|
| **Bharatanatyam** | Tamil Nadu | Geometric lines, araimandi, strong nritta–abhinaya repertoire; transformed from Sadir/devadasi context into modern stage form | Carnatic; varnam central repertoire item |
| **Kathak** | North India, strong UP associations | Tatkar footwork, chakkars, narrative/abhinaya; Lucknow–Jaipur–Banaras gharana traditions | Hindustani; Mughal-court + bhakti layers |
| **Kathakali** | Kerala | Highly codified dance-drama, elaborate make-up/costume, hand gestures, heroic/mythic stories | Kerala musical/ritual traditions; ensemble theatre |
| **Kuchipudi** | Andhra Pradesh | Dance-drama roots; spoken dialogue may occur; **Tarangam** can involve dancing on brass plate | Carnatic; Siddhendra Yogi tradition |
| **Odissi** | Odisha | **Tribhanga** + **chauka**; sculptural stance; Jayadeva/Gita Govinda devotional repertoire | Odissi music; Vaishnava/Jagannath context |
| **Manipuri** | Manipur | Raslila, rounded/soft movement; **Sankirtana** combines song, dance and instruments such as pung/cymbals | Vaishnava Krishna bhakti |
| **Mohiniyattam** | Kerala | Lasya-dominant solo tradition; white/gold costume; gentle swaying movement | Kerala/Carnatic-related repertoire |
| **Sattriya** | Assam | Sattra-monastery tradition; music + dance + drama; Vaishnavite | Sankaradeva/Madhavadeva tradition; **not** based on Tulsidas/Kabir/Mirabai compositions |

**PYQ traps**
- Kuchipudi → dialogue/Tarangam; brass plate is **not** Bharatanatyam marker.
- Mohiniattam → **Kerala**, not Odisha.
- Manipuri Sankirtana → not “cymbals only”; song/dance/percussion complex.
- “Oldest classical dance” rankings are not robust exam facts; eliminate by markers instead.

##### 3. Folk, martial and narrative performance pairs

| Tradition | State/region/community | Core marker |
|---|---|---|
| **Kalaripayattu** | Kerala | Martial art; weapon + unarmed systems |
| **Thang-Ta** | Manipur | Martial tradition; sword/spear techniques |
| **Chhau** | Odisha–Jharkhand–West Bengal | Martial/folk-derived dance; three major styles: Mayurbhanj, Seraikella, Purulia |
| **Gatka** | Punjab/Sikh tradition | Weapon-based martial display |
| **Silambam** | Tamil Nadu | Staff-based martial art |
| **Yakshagana** | Karnataka | Dance-drama, music, elaborate costume; not Kerala/Maharashtra |
| **Khongjom Parba** | Manipur | Ballad/narrative singing tradition linked to Khongjom war memory |
| **Manganiyars** | Rajasthan / western Rajasthan desert region | Hereditary musician community; devotional, folk and patron-linked repertoire |
| **Bihu dance** | Assam | Festival-linked folk dance |
| **Chapchar Kut** | Mizoram | Festival/tradition pair; cross-reference Festivals |

##### 4. Hindustani vs Carnatic: comparison frame

| Axis | Hindustani | Carnatic |
|---|---|---|
| Core geography | North/central India | South India |
| Major historical interaction | Strong Persian/Sufi/court interaction in medieval north | Strong temple/bhakti + South Indian court traditions |
| Melodic classification recall | Bhatkhande **thaat** system widely used pedagogically | **Melakarta** parent-raga framework associated with Venkatamakhin tradition |
| Major compositional forms | Dhrupad, Khayal, Thumri, Tappa, Tarana, Dhamar | Kriti/Kirtana, Varnam, Ragam–Tanam–Pallavi, Tillana |
| Typical percussion anchor | Tabla; pakhawaj especially Dhrupad | Mridangam; ghatam/kanjira also important |
| Shared principle | Raga + tala + improvisation | Raga + tala + improvisation |

- **Do not** say Vishnu Narayan Bhatkhande “popularised Carnatic music”; his major role is modern codification/classification of **Hindustani** music and thaats.
- **Dheera Shankarabharanam** (Carnatic) has close scalar relation to **Bilawal** (Hindustani) → 2026 UPSC eliminator.

##### 5. Hindustani forms

- **Dhrupad**
  - Older major north Indian classical vocal form; devotional/temple and court lineages.
  - Long, austere **alap**; composed dhrupad traditionally structured in sections such as sthayi–antara–sanchari–abhog.
  - **Pakhawaj** = principal percussion association; tanpura drone.
  - Raja **Man Singh Tomar of Gwalior** important patron; Tansen later major exponent.
  - UPSC trap: direct claim that it “originated and developed in Rajput kingdoms in the Mughal period” is too narrow/false; devotional/spiritual character and mantra-derived syllabic alap associations were accepted.
- **Khayal**
  - More improvisational/flexible than dhrupad; **bada** + **chhota khayal** common structure.
  - Later Mughal development especially linked with **Sadarang (Niyamat Khan)** and **Adarang** under Muhammad Shah.
  - Amir Khusrau is often traditionally associated with innovations, but sole “inventor of Khayal” is not secure enough for canonical notes.
- **Thumri** → lyrical/semi-classical, bhakti–shringara; Lucknow/Banaras traditions.
- **Tappa** → fast, knotty, ornamented phrases; folk roots commonly traced to Punjabi camel-driver songs; court/semi-classical refinement later. UPPCS key links encouragement to Muhammad Shah; **Shori Mian/Ghulam Nabi Shori** is also central to later refinement in Awadh—avoid a single-founder formulation.
- **Dhamar** → dhrupad-related; Holi/Krishna repertoire; dhamar tala.
- **Tarana** → mnemonic/non-lexical syllables, fast rhythmic treatment; traditional attribution to Amir Khusrau is common but should not be treated as documentary certainty.

##### 6. Carnatic anchors

- **Trinity:** Tyagaraja; Muthuswami Dikshitar; Syama Sastri.
- **Tyagaraja:** chiefly Rama devotion; numerous kritis; Pancharatna Kritis high-yield. UPSC trap → not “mostly Krishna”.
- **Purandaradasa:** major pedagogic/devotional predecessor; conventionally called “father”/foundational figure of Carnatic pedagogy.
- **Venkatamakhin:** *Chaturdandi Prakashika*; foundational 72-melakarta conceptual tradition. Correct spelling **Venkatamakhin**, not “Venkatamukhi/Venkatraman”.
- **Ragam–Tanam–Pallavi:** major improvisational concert architecture.

##### 7. Treatises, composers, institutions

| Work/person | Correct association | Trap value |
|---|---|---|
| **Natyashastra** | Bharata Muni | Performance theory, not Bhasa |
| **Brihaddeshi** | Matanga | Early major discussion/definition of raga |
| **Sangita Ratnakara** | Sharngadeva | Pre-modern compendium important to both later Hindustani/Carnatic traditions |
| **Ragamala** | Pundarika Vitthala | UPPCS author-match |
| **Rasa Kaumudi** | Srikantha | UPPCS author-match |
| **Raga Vibodha** | Somanatha | UPPCS author-match |
| **Chaturdandi Prakashika** | Venkatamakhin | Carnatic/melakarta association |
| **Kitab-i-Nauras** | Ibrahim Adil Shah II | Deccan court + music/cultural synthesis |
| **Tansen** | earlier Rewa patronage → Akbar’s court; trained in tradition of Swami Haridas | Akbar gave title **Mian**; he did not coin the name “Tansen” |
| **Vishnu Digambar Paluskar** | Founded first Gandharva Mahavidyalaya, Lahore, 1901 | UPSC 2025 location |
| **Vishnu Narayan Bhatkhande** | Hindustani theoretical codification; thaat framework | Not Carnatic systematiser |
| **Mallikarjun Mansur** | Jaipur-Atrauli gharana | UPSC 2026 |

#### C. Literature, Authors & Foreign Travellers

##### 1. Sanskrit/classical author matrix

| Author | Core works / association | Period/patron cue | Elimination trap |
|---|---|---|---|
| **Panini** | *Ashtadhyayi* | pre-Mauryan/early historic NW | Not contemporary of Pushyamitra Shunga |
| **Patanjali** | *Mahabhashya* | Shunga-period context | Not *Natyashastra* |
| **Bhasa** | *Svapnavasavadatta*, *Madhyama-vyayoga* etc. | early Sanskrit drama | UPSC 2024: Madhyama-vyayoga |
| **Kalidasa** | *Abhijnanasakuntalam*, *Malavikagnimitram*, *Vikramorvashiyam*, *Raghuvamsha*, *Kumarasambhava*, *Meghaduta* | Gupta age; conventionally Chandragupta II association | *Shringar Shatak* is not his |
| **Shudraka** | *Mrichchhakatika* | Sanskrit drama | — |
| **Vishakhadatta** | *Mudrarakshasa*, *Devichandraguptam* | Gupta-context political drama | *Devichandraguptam* ≠ Bilhana |
| **Bhavabhuti** | *Malatimadhava*, *Mahaviracharita*, *Uttararamacharita* | 8th c. Sanskrit playwright | UPSC grouped him with playwrights |
| **Bana/Banabhatta** | *Harshacharita*, *Kadambari* | Harsha’s court | *Harshacharita* = royal biography/prose |
| **Bharavi** | *Kiratarjuniya* | classical mahakavya | — |
| **Magha** | *Shishupalavadha* | classical mahakavya | — |
| **Dandin** | *Dashakumaracharita*, *Kavyadarsha* | prose/poetics | — |
| **Bilhana** | *Vikramankadevacharita* | Western Chalukya Vikramaditya VI | Not *Devichandraguptam* |
| **Nayachandra Suri** | *Hammira-Mahakavya* | Jain Sanskrit author | UPSC 2023 correct pair |
| **Somadeva Suri** | *Nitivakyamrita* | Jain political/ethical work | Not Somadeva of *Kathasaritsagara* |
| **Hastimalla / Kshemeshvara** | playwright traditions | medieval Sanskrit/Kannada literary sphere | UPSC 2021: both grouped as playwrights |

##### 2. Buddhist + Jaina textual anchors

- **Milindapanha/Milindapanho:** dialogue between Indo-Greek king **Menander (Milinda)** and monk **Nagasena**; authorship should not be casually assigned to Nagarjuna.
- **Ashvaghosha:** *Buddhacharita*, *Saundarananda*; Kushana/Kanishka-era association.
- **Nagarjuna:** Madhyamaka philosopher; *Mulamadhyamakakarika* association—do not conflate with Milindapanha.
- **Vasubandhu:** **Abhidharmakosha**; corrects base-note attribution to Dignaga.
- **Dignaga:** Buddhist logic/epistemology; **Pramanasamuccaya**.
- **Buddhaghosa:** **Visuddhimagga**; Theravada scholastic tradition.
- **Sanghabhuti:** commentary linked to **Sarvastivada Vinaya** → UPSC 2024.
- **Jaina canonical tradition:** Agamas transmitted in Prakrit/Ardhamagadhi traditions; Svetambara canon associated with later councils/redaction. Avoid overconfident one-date simplification.
- **Siddhasena Divakara:** *Nyayavatara* association; correct spelling/title over base’s “Nyayavartam”.
- **Hemachandra:** Jain polymath at Chaulukya/Solanki Gujarat; grammar/lexicography/literary scholarship.

##### 3. Regional/vernacular literature: durable anchors

| Text | Author | Cue |
|---|---|---|
| *Gathasaptasati* | **Hala** | Prakrit; Satavahana association |
| *Tolkappiyam* | Tolkappiyar (traditional attribution) | Early Tamil grammar/poetics |
| *Silappadikaram* | **Ilango Adigal** | Tamil epic; Kannagi–Kovalan story |
| *Manimekalai* | **Sattanar/Chithalai Sattanar** | Tamil Buddhist epic |
| *Tirukkural* | **Tiruvalluvar** | Ethics/polity/love; Tamil classic |
| *Kavirajamarga* | Associated with **Amoghavarsha I (Nripatunga)** and court literary milieu | Earliest major extant Kannada poetics/rhetoric work |
| *Gita Govinda* | **Jayadeva** | Lakshmana Sena court association; Radha-Krishna devotional lyric |
| *Nala Champu* | **Trivikrama Bhatta** | UPPCS 2025 mapping |
| *Kathasaritsagara* | **Somadeva** | Sanskrit narrative compendium |
| *Brihatkathamanjari* | **Kshemendra** | Sanskrit abridgement/reworking of Brihatkatha tradition |

##### 4. Medieval Persian chronicles and Mughal texts

| Work | Author | Period/context |
|---|---|---|
| *Taj-ul-Maasir* | Hasan Nizami | Early Delhi Sultanate |
| *Tabaqat-i-Nasiri* | Minhaj-us-Siraj Juzjani | Delhi Sultanate; dedicated to Nasiruddin Mahmud; Bengal/Bakhtiyar evidence |
| *Tarikh-i-Firuzshahi* | Ziauddin Barani | Sultanate history through early Firuz Shah period |
| *Fatawa-i-Jahandari* | Ziauddin Barani | Political thought/advice |
| *Tarikh-i-Firuzshahi* | Shams-i-Siraj Afif | Distinct later work with same title; Firuz Shah focus |
| *Khazain-ul-Futuh / Tarikh-i-Alai* | Amir Khusrau | Alauddin Khalji conquests |
| *Tughluqnama* | **Amir Khusrau** | Rise of Ghiyasuddin Tughlaq; **not Ibn Battuta** |
| *Futuh-us-Salatin* | Abdul Malik Isami | Sultanate narrative/history |
| *Futuhat-i-Firuz Shahi* | Firuz Shah Tughlaq | Sultan’s own account/inscriptional-memoir type work |
| *Baburnama / Tuzuk-i-Baburi* | Babur | Chagatai Turkish autobiography |
| *Humayun-nama* | Gulbadan Begum | Mughal family/history |
| *Akbarnama* / *Ain-i-Akbari* | Abul Fazl | Akbar’s reign/imperial administration |
| *Muntakhab-ut-Tawarikh* | Abdul Qadir Badauni | Contemporary critical chronicle |
| *Tabaqat-i-Akbari* | Nizamuddin Ahmad | General history to Akbar period |
| *Tuzuk-i-Jahangiri* | Jahangir (with continuation by court writers) | Imperial memoir |
| *Padshahnama/Badshahnama* | Abdul Hamid Lahori | Shah Jahan official history |
| *Shahjahannama* | Inayat Khan | Shah Jahan chronicle |
| *Tarikh-i-Sher Shahi* | Abbas Khan Sarwani | Sher Shah history |
| *Majma-ul-Bahrain* | Dara Shikoh | Comparative mystical/religious thought |
| *Sirr-i-Akbar* | Dara Shikoh | Persian translation of Upanishads |

###### UPPCS regional-chronicle extension

- **Mirat-i-Sikandari** → history/conquests of **Gujarat**.
- **Burhan-i-Ma’asir** → history of **Bahmani/Ahmadnagar-Deccan** political sphere.
- **Riyaz-us-Salatin** → history of **Bengal**.
- **Riyaz-ul-Insha** → collection associated with **Mahmud Gawan’s letters**.
- **Same-title trap:** both **Barani** and **Shams-i-Siraj Afif** wrote works called *Tarikh-i-Firuzshahi*; question wording/period cue determines which is intended.

##### 5. Foreign travellers: chronology + ruler + observation

| Traveller | Origin | Indian period/ruler anchor | Work / distinctive demand |
|---|---|---|---|
| **Megasthenes** | Greek/Seleucid world | Chandragupta Maurya | *Indica*; polity/society observations |
| **Fa-Hien (Faxian)** | China | Chandragupta II, early 5th c. | Buddhist pilgrimage; monastic sites; UPSC 2025 ruler association |
| **Xuanzang (Hiuen Tsang)** | China | Harsha, 7th c. | Buddhist pilgrimage/learning; social and administrative observations; Nalanda |
| **I-Tsing (Yijing)** | China | Later 7th c. | Buddhist monastic/educational practices; Nalanda connections |
| **Al-Biruni** | Khwarizm/Central Asia | Mahmud of Ghazni era, 11th c. | *Kitab-ul-Hind / Tahqiq-i-Hind*; Sanskrit learning; religion/science/society |
| **Marco Polo** | Venice/Italy | Late 13th c. South India, Pandya/Kakatiya-era world | South Indian economy/trade descriptions; Motupalli tradition |
| **Ibn Battuta** | Morocco | Muhammad bin Tughlaq | *Rihla*; Delhi qazi; court/city/social life |
| **Niccolo Conti** | Italy | Early 15th c. Vijayanagara | South Indian/Vijayanagara observations |
| **Abdur Razzaq** | Persian/Iranian envoy | Deva Raya II | Vijayanagara court/city description |
| **Domingo Paes** | Portugal | Krishnadevaraya | Vijayanagara/Hampi, court, festivals, economy |
| **Fernao Nuniz** | Portugal | Achyuta Raya-era Vijayanagara | Dynastic/history/city observations |
| **Duarte Barbosa** | Portugal | early 16th c. coastal India | Trade, ports, society of west/south coasts |
| **Jean-Baptiste Tavernier** | France | 17th-c. Mughal India | Gem merchant; diamond mines/trade → UPSC 2018 |
| **Francois Bernier** | France | Shah Jahan–Aurangzeb transition | Mughal economy, agrarian/property/social comparisons |
| **Niccolao Manucci** | Venice/Italy | 17th-c. Mughal India | *Storia do Mogor*; court/war/medicine observations |

**Chronology anchor:** Fa-Hien → Xuanzang → I-Tsing → Al-Biruni → Ibn Battuta → Vijayanagara Portuguese travellers → Tavernier/Bernier/Manucci.

#### D. Painting, Crafts & Textiles

##### 1. Prehistoric + mural painting

- **Bhimbetka, Madhya Pradesh:** prehistoric rock shelters; hunting, dancing, animals, social scenes across multiple phases; **V. S. Wakankar** identified their prehistoric significance in 1957.
- **Ajanta:** Buddhist murals; Jataka/Buddha/bodhisattva themes; famous **Padmapani** and **Vajrapani** in Cave 1; major later phase under Vakataka patronage, especially Harisena-era milieu.
  - Technical wording: wall paintings on prepared plaster, generally described as **tempera/fresco-secco-type** rather than true wet fresco; avoid “fresco” as an unqualified universal label.
- **Bagh Caves, Madhya Pradesh:** Buddhist monastic cave-mural tradition; **Hallisalasya** painting = joyous folk-dance scene (UPSC 2026).
- **Badami:** Chalukyan mural fragments; Brahmanical court/religious themes.
- **Sittanavasal, Tamil Nadu:** Jain cave/mural tradition; lotus-pond and religious imagery.
- **Lepakshi, Andhra Pradesh:** Vijayanagara-era Virabhadra temple murals; large narrative religious compositions. Avoid claiming a generally secular theme or “absence of primary colours”.

##### 2. Miniature schools

###### Early manuscript traditions

- **Pala/Eastern India:** Buddhist palm-leaf manuscript painting; elongated format dictated by leaf; Vajrayana/Mahayana iconography.
- **Western Indian/Jain:** Gujarat–Rajasthan merchant patronage; Jaina manuscripts; palm leaf → paper transition; bold line, intense colour and stylised eyes common.

###### Mughal

- **Humayun:** Persian painters **Mir Sayyid Ali** and **Abd al-Samad** associated with imperial atelier formation.
- **Akbar:** large illustrated manuscripts; Persian + Indian synthesis; narrative dynamism; **Hamzanama**; atelier/workshop patronage; Daswanth, Basawan etc.
- **Jahangir:** peak naturalistic observation, portraiture, flora/fauna studies, refined albums/muraqqa; **Ustad Mansur**, Abu’l Hasan, Bishandas. Call Jahangir a major **connoisseur/patron**, not simply “a great painter”.
- **Shah Jahan:** more formalised court portraiture, luxury, decorative finish.
- **Aurangzeb:** reduced imperial atelier patronage; artists dispersed to regional courts. Avoid “all art forms declined”.
- European prints/techniques influenced Mughal painting **from Akbar/Jahangir onward**, not only under Shah Jahan.

###### Rajput/Pahari/Deccani

| School | Marker |
|---|---|
| **Mewar** | Strong line/colour; devotional and courtly themes |
| **Bundi/Kota** | Lush landscape, hunting/court scenes, monsoon/nature |
| **Kishangarh** | Radha-Krishna lyricism; **Bani Thani** by Nihal Chand; patron Savant Singh/Nagari Das context |
| **Basohli** | Bold colour, strong faces; Rasamanjari illustrations |
| **Guler/Kangra** | Softer naturalism, lyrical landscapes, Radha-Krishna/Bhagavata/Gita-Govinda themes |
| **Deccani** | Ahmadnagar/Bijapur/Golconda courts; saturated colour, fantasy landscapes, Persian–local synthesis |

**Correction:** Kangra is a **Pahari miniature painting school**. Do not describe it as “painting + embroidery on cotton”. That confuses it with textile traditions such as Chamba Rumal.

##### 3. Craft/textile/state matrix

| Craft/textile | Region/state | Technique/material cue |
|---|---|---|
| **Kalamkari** | Andhra Pradesh/Telangana traditions | Cotton textile; hand-drawn/painted and block-printed traditions; Srikalahasti strongly hand-drawn religious narrative, Machilipatnam strongly block-print workshop tradition |
| **Banaras brocade / Banarasi sari** | Varanasi, Uttar Pradesh | Silk brocade, zari; durable GI example |
| **Chanderi** | Madhya Pradesh | Fine lightweight silk/cotton sari tradition |
| **Kanchipuram silk** | Tamil Nadu | Heavy silk sari, contrasting borders/pallu tradition |
| **Puthukkuli / Toda embroidery shawl** | Nilgiris, Tamil Nadu | Toda community geometric embroidery |
| **Sujni** | Bihar | Embroidery/quilted narrative textile; **not Maharashtra** |
| **Uppada Jamdani** | Andhra Pradesh | Fine jamdani weaving; **not Karnataka** |
| **Chikankari** | Lucknow, Uttar Pradesh | Whitework/shadow-work embroidery tradition |
| **Zardozi** | Strong north Indian/UP court-craft association | Metal-thread embroidery |
| **Kani/Pashmina shawl** | Kashmir | Fine wool; kani loom/pattern weaving |
| **Chamba Rumal** | Himachal Pradesh | Embroidered pictorial textile; distinguish from Kangra painting |
| **Venushilpa** | Bamboo-art terminology | UPPCS link: Upendra Maharathi associated with bamboo/craft revival/design |

##### 4. GI static core

- **GI = Geographical Indication** → sign/name identifying goods as originating in a territory/region/locality where a quality, reputation or other characteristic is essentially attributable to geographical origin.
- India’s **Geographical Indications of Goods (Registration and Protection) Act, 1999** operationalises GI protection and reflects TRIPS/WTO obligations.
- Registration is for goods, not a blanket copyright over a style; authorised producers/use rights matter.
- Static examples repeatedly used in exams: **Banaras Brocades and Sarees**, **Kalamkari-linked regional goods**, **Tirupati Laddu** (food example outside craft but useful for mechanism).
- **Dynamic exclusion:** newly registered GI tags of the latest year are not permanent payload; refresh separately before exam.

#### E. Festivals, Calendars & Heritage Recognition

##### 1. Festival/community/state pairs

| Festival/tradition | Community/state | Durable cue |
|---|---|---|
| **Chaliha Sahib** | Sindhi community | Sindhi religious-cultural observance; UPSC correct pair |
| **Nanda Devi Raj Jaat / Nanda Raj Jaat** | Uttarakhand Himalayan communities | Pilgrimage/festival associated with Goddess Nanda Devi; **not Gond** tradition |
| **Wari / Warkari pilgrimage** | Maharashtra | Varkari devotees; Pandharpur/Vitthal pilgrimage; **not Santhal** tradition |
| **Chapchar Kut** | Mizoram | Mizo spring/festival tradition linked to jhum-cycle context |
| **Garba** | Gujarat | Navratri community dance tradition |
| **Bihu** | Assam | Seasonal/agrarian festival complex; Bihu dance |
| **Onam** | Kerala | Harvest/cultural festival; Mahabali tradition |
| **Pongal** | Tamil Nadu | Harvest festival; January/Makar Sankranti season |
| **Baisakhi/Vaisakhi** | Punjab | Harvest + Sikh historical significance |
| **Hornbill Festival** | Nagaland | Multi-tribal cultural showcase; modern state festival—use state pairing, not year-specific programme |
| **Wangala** | Garo, Meghalaya | Harvest/fertility tradition; “hundred drums” association |
| **Nuakhai** | Western Odisha | New-rice/harvest festival |
| **Bathukamma** | Telangana | Floral festival |
| **Hemis** | Ladakh | Buddhist monastic festival, Hemis monastery |
| **Losar** | Tibetan/Himalayan Buddhist regions | New Year tradition; regional variants |
| **Sarhul** | Jharkhand/central-eastern tribal traditions | Spring/sal-tree and community ritual associations |

###### Kumbh static geography

- **Prayagraj** → Sangam/Ganga-Yamuna confluence tradition.
- **Haridwar** → Ganga.
- **Ujjain** → Shipra/Kshipra.
- **Nashik–Trimbakeshwar** → Godavari.
- Current year, branding, precise administrative schedule = **CURRENT_DYNAMIC**.

##### 2. Calendar and eras

- **Indian National Calendar:** based on **Saka Era**; officially adopted for civil purposes in **1957** alongside Gregorian calendar.
- **Epoch:** Saka Era = **78 CE**. Do not make “Kanishka certainly founded it” a mandatory fact; attribution has been debated.
- **First month:** **Chaitra**.
- **Chaitra 1:** **22 March** normal year; **21 March** leap year.
- **Vikram Samvat:** conventional epoch **57 BCE**; older North/West Indian era with lunisolar regional calendrical use.
- Trap: National Calendar is **not** based on Vikram Era and was **not** adopted on 26 January 1950.

##### 3. UNESCO heritage recognition: static mechanism

| Framework | What it protects/recognises | Core exam discriminator |
|---|---|---|
| **World Heritage Convention, 1972** | Cultural, natural, mixed **sites/properties** of Outstanding Universal Value | Tangible property + WH criteria/nomination/listing system |
| **Intangible Cultural Heritage Convention, 2003** | Living practices, expressions, knowledge, skills + associated cultural spaces/objects | Community-transmitted living heritage; not a “site” list |

**UNESCO ICH five broad domains**
1. Oral traditions and expressions, including language as a vehicle.
2. Performing arts.
3. Social practices, rituals and festive events.
4. Knowledge and practices concerning nature and the universe.
5. Traditional craftsmanship.

- ICH is **living heritage** → transmission/community practice matters; a festival/dance/craft can span more than one domain.
- Do not confuse **World Heritage List** with **Representative List of ICH**.
- **Dynamic exclusion:** “latest Indian inscription”, preceding-year WHS/ICH addition, session number and inscription year belong to current affairs.

###### Durable concept from a current listing hook: Moidams

- **Moidams/Maidams** → mound-burial/mortuary tradition of the **Tai-Ahom** polity/community in Assam; especially royal/noble burial mounds and associated funerary landscape.
- Memorise the cultural form and community, not merely the latest UNESCO listing year.

#### F. Awards, Honours & Cultural Institutions

##### 1. Major award architecture

| Award | Field/purpose | Admin/rule anchors | High-yield trap |
|---|---|---|---|
| **Bharat Ratna** | Exceptional service/performance of highest order in **any field of human endeavour** | Instituted 1954; PM recommends directly to President; **max 3 in a year**; Sanad + medallion; no monetary grant | National award ≠ prohibited title; cannot be used as prefix/suffix |
| **Padma Vibhushan** | Exceptional and distinguished service | Padma system instituted 1954 | Highest of three Padma categories, but below Bharat Ratna in civilian-honour hierarchy |
| **Padma Bhushan** | Distinguished service of high order | — | — |
| **Padma Shri** | Distinguished service | — | — |
| **Gandhi Peace Prize** | Gandhian/non-violent social, economic, political transformation / peace-oriented contribution | Government of India; instituted 1995; annual international character | Jury composition, not recipient trivia |
| **Major Dhyan Chand Khel Ratna** | Outstanding/spectacular performance in sports over preceding four years | National sports award | Do not confuse with lifetime award |
| **Arjuna Award** | Outstanding sports performance/qualities | National sports award | Not the lifetime-achievement category |
| **Dronacharya Award** | Outstanding coaches | National sports award | Coach, not athlete |
| **Rashtriya Khel Protsahan Puruskar** | Promotion/development of sports by entities/organisations | National sports award | Not retired-player lifetime award |
| **Shanti Swarup Bhatnagar Prize** | Outstanding Indian S&T research, fundamental/applied | CSIR; 7 science/engineering/medical disciplines; age ceiling rule traditionally 45 | Science research prize, not cultural/literary award |
| **Jnanpith Award** | Indian literature | Bharatiya Jnanpith; first award 1965 to G. Sankara Kurup | **Not** Sahitya Akademi award/government academy award |

##### 2. Article 18 + civilian awards

- Constitution Article 18 prohibits titles (except military/academic distinctions), but **Bharat Ratna/Padma awards have been judicially upheld as national honours, not titles**.
- Recipients must not use them as **prefix/suffix** to names.
- **Padma interruptions:** awards were not announced in **1978–1979** and **1993–1997** → UPSC statement “suspended only once” is false.
- This is the entire polity crossover needed here; detailed Article 18 doctrine remains with Polity & Governance.

##### 3. Gandhi Peace Prize jury

- **Prime Minister** → Chair.
- **Chief Justice of India**.
- **Leader of Opposition in Lok Sabha**; where formal LoP is absent, the leader of the largest opposition party is used under the current scheme wording/practice.
- **Two eminent persons**.
- **President of India is not a jury member** → UPSC 2025 trap.

##### 4. Bhatnagar Prize static rules

- Named for **Sir Shanti Swarup Bhatnagar**, founder-Director of CSIR.
- Annual award for notable/outstanding **fundamental or applied research**.
- Seven disciplines: **Biological; Chemical; Earth–Atmosphere–Ocean–Planetary; Engineering; Mathematical; Medical; Physical Sciences**.
- Traditional eligibility rule: Indian citizen engaged in S&T research, age up to **45 years** as reckoned on 31 December preceding the prize year; current administrative rules should be rechecked only if the exam asks a newly changed eligibility detail.

##### 5. National cultural institutions: identity map

| Institution | Identity / field | Static anchor |
|---|---|---|
| **Sangeet Natak Akademi (SNA)** | National academy for **music, dance and drama / performing arts** | Government resolution 1952; formally inaugurated 1953; preservation/promotion of performing arts |
| **Sahitya Akademi** | National academy/institution of **letters/literature** | Promotes literature in **24 recognised languages**; Fellowship is its highest honour and limited in number |
| **Lalit Kala Akademi** | National Academy of **Art / visual arts** | Inaugurated 1954; visual/plastic arts, exhibitions, scholarship |
| **National School of Drama (NSD)** | Theatre training/production institution | Set up in 1959 under SNA; later autonomous |
| **IGNCA** | Indira Gandhi National Centre for the Arts | Interdisciplinary documentation/research/resource centre across arts and culture; do not confuse with an award academy |
| **CCRT** | Centre for Cultural Resources and Training | Cultural education/training; connects education with cultural heritage |

##### 6. Award/institution traps

- **Sahitya Akademi Award ≠ Jnanpith Award**.
- **Sangeet Natak Akademi ≠ National School of Drama**; NSD is training/theatre, SNA is apex performing-arts academy.
- **Lalit Kala** → visual arts; **Sangeet Natak** → performing arts; **Sahitya** → literature.
- Bharat Ratna/Padma names are honours, **not constitutionally prohibited hereditary/nobility titles**.
- Recipient-of-the-year lists are disposable current-affairs data; do not pollute permanent short notes with them.

### 6. UPPCS Extension Layer

Only additional UPPCS-heavy recall beyond the UPSC-centred core:

| Area | UPPCS extension worth retaining |
|---|---|
| Sultanate/provincial architecture | Atala Mosque–Ibrahim Shah Sharqi–Jaunpur; Adina Mosque–Pandua/Bengal; Dakhil Darwaza–Gaur; Teen Darwaza–Ahmedabad; Bara Imambara/Rumi Darwaza–Asaf-ud-Daula–Lucknow |
| Mughal monument recall | Khayr-ul-Manazil–Maham Anga; Buland Darwaza–Akbar/Gujarat victory; Babur-Kabul / Humayun-Delhi / Jahangir-Lahore / Shah Jahan-Agra tomb matrix |
| Music treatises | Ragamala–Pundarika Vitthala; Rasa Kaumudi–Srikantha; Raga Vibodha–Somanatha; Chaturdandi Prakashika–Venkatamakhin |
| Court music | Tansen before Akbar → Raja Ramchandra of Rewa; *Kitab-i-Nauras* → Ibrahim Adil Shah II; Tappa question keyed to Muhammad Shah, with later Shori Mian/Awadh refinement kept as corrective nuance |
| Persian chronicles | Mirat-i-Sikandari–Gujarat; Burhan-i-Ma’asir–Bahmani/Ahmadnagar; Riyaz-us-Salatin–Bengal; Riyaz-ul-Insha–Mahmud Gawan letters |
| Travellers | Chronology: Fa-Hien → Xuanzang → I-Tsing → Al-Biruni; Ibn Battuta–Morocco/Rihla; Abdur Razzaq–Iran/Vijayanagara; Nuniz/Paes–Portuguese Vijayanagara accounts |
| Craft | *Venushilpa* = bamboo art; Upendra Maharathi association; Bhimbetka–V. S. Wakankar |
| Calendar | Saka national calendar; Chaitra 1 date; reject Vikram-era and 26 Jan 1950 misconceptions |
| Awards | Prepare current-year **recipient ↔ prize ↔ work/field** separately for Sahitya Akademi/Yuva Puraskar, Jnanpith, Booker/International Booker, major film prizes, Padma and sports awards |

**UPPCS dynamic protocol:** refresh only the **preceding ~12–18 months** of named literary/international/national recipients before the actual examination. Never merge that list permanently into this static Source Pack.

### 7. Cross-Topic / Cross-Subtopic Traps

- **Religion vs Art & Culture:** Buddhist/Jaina doctrine/sects belong to Religions; their caves, stupas, images, texts-as-author questions may belong here only where the demand is cultural form/authorship.
- **Dynasty vs architecture:** political history of Pallavas/Cholas/Vijayanagara belongs to Ancient & Medieval; architecture keeps only patron/style/site facts needed for monument questions.
- **Sangam:** society/polity belongs Ancient & Medieval; individual Tamil texts/authors can be cross-referenced here.
- **Ibadat Khana:** architecture/function = here; Akbar’s religious policy/Sulh-i-Kul = Mughal polity/religious history sibling.
- **UNESCO:** durable convention/type/domain = here; newest Indian inscription and session/year = CURRENT_DYNAMIC.
- **GI:** legal/static GI mechanism + old craft examples = here; newly notified GI tags = CURRENT_DYNAMIC; GI law mechanics may cross-reference Economy/IPR.
- **Awards:** Article 18 linkage only at elimination level; full constitutional doctrine = Polity.
- **National Handloom Day:** durable 7 August–Swadeshi connection can remain as a cross-topic trigger; annual event messaging is dynamic.
- **Tansen:** Akbar bestowed **Mian**; statement “Akbar gave him title Tansen” = trap.
- **Kangra vs Chamba:** Kangra = Pahari painting; Chamba Rumal = embroidery.
- **Kalamkari:** textile/painting craft, not a freestanding miniature school.
- **Nagara/Dravida:** labels describe architectural vocabularies; a temple’s location alone does not guarantee every formal feature.
- **Gopuram vs vimana:** entrance gateway tower vs sanctum superstructure.
- **Chaitya vs vihara:** prayer/congregational hall vs monastic residence; later viharas may contain shrines.
- **Udayagiri:** MP = Gupta Brahmanical caves/Varaha; Odisha Udayagiri-Khandagiri = Jain caves.
- **Somadeva:** *Kathasaritsagara* author Somadeva ≠ Jain author **Somadeva Suri** of *Nitivakyamrita*.
- **Tarikh-i-Firuzshahi:** Barani and Afif both wrote works of this title.
- **Saka Era:** 78 CE epoch is secure; “Kanishka founded it” should not be used as an unconditional elimination rule.
- **Sahitya Akademi vs Jnanpith:** different institutions/awards.

### 8. Correction / Verification Register

#### CORRECT

| Source item | Older/suspect wording | Correction to propagate |
|---|---|---|
| Base — Amaravati sculpture | “White marble” | Use **pale/white limestone**; lower Krishna/Andhra Buddhist sculptural school |
| Base — Mauryan caves | Dhauli treated as equivalent cave-architecture example | Rock-cut cave beginnings → **Barabar/Nagarjuni**; Dhauli = edict rock + sculpted elephant |
| Base — Dravida terminology | “very high vimanas on gopurams” type conflation | **Vimana** over sanctum; **gopuram** = gateway tower |
| Base — Hoysala material | Grey sandstone | Predominantly **soapstone/chloritic schist** |
| Base — Vesara | speculative etymology “Vishra/long path” | Omit etymology; treat Vesara as historiographical/classificatory label for Deccan hybrid/mixed temple vocabulary |
| Base — Pallava | Vaikuntha Perumal grouped under Rajasimha | **Vaikuntha Perumal, Kanchipuram → Nandivarman II Pallavamalla** |
| Base — Khajuraho | broad “inspired by Kamasutra” | Omit causal claim; erotic imagery is a minority within a much wider sacred/sculptural programme |
| Base — Bibi ka Maqbara | Aurangzeb personally commissioned | Commissioned by **Prince Azam Shah** for Dilras Banu Begum; Mughal/Aurangzeb-era context |
| Base — Bharatanatyam | “Bha-Ra-Ta” presented as etymological fact | Treat only as modern mnemonic; omit as historical derivation |
| Base — Khayal | sole invention by Amir Khusrau | Mark traditional association only; secure later development includes Sadarang/Adarang under Muhammad Shah |
| Base — Bhatkhande | popularised Carnatic | Bhatkhande = modern **Hindustani** codification/thaat system |
| Base — Venkatamakhin | misspelt/incorrect author form | **Venkatamakhin – Chaturdandi Prakashika** |
| Base — Buddhist literature | Abhidharmakosha → Dignaga | **Abhidharmakosha → Vasubandhu**; Dignaga → *Pramanasamuccaya*/logic |
| Base — science text | Surya Siddhanta → Aryabhata | Aryabhata → **Aryabhatiya**; do not assign *Surya Siddhanta* to him |
| Base — painting | Kangra described as painting+embroidery on cotton | Kangra = **Pahari miniature painting**; textile embroidery comparison belongs to Chamba Rumal |
| Base — Aripan | Madhubani “subtype” | Aripan = Mithila/Bihar ritual floor art tradition; keep distinct from Madhubani/Mithila painting classification |
| Base — Mughal painting | European influence begins under Shah Jahan | European prints/illusionistic influence visible from **Akbar/Jahangir** onward |
| Base — Aurangzeb arts | “all art forms declined” | Narrow to **reduced imperial patronage**, with regional dispersal/continuity |
| Base — Saka | Kanishka as certain originator | Keep **78 CE** epoch; originator attribution not used as settled fact |
| Base — civilian awards | cumulative “all top four civilian awards” claim | Omit; civilian honours are not a cumulative ladder requirement |
| Canonical `UPPCS-2025-GS1-Q086` | answer-option boundary conflicts with reconstructed table | Use factual mapping only: Trivikrama–Nala Champu; Somadeva–Kathasaritsagara; Jayadeva–Gita Govinda; Kshemendra–Brihatkathamanjari; do **not** trust canonical option letter |
| Canonical `UPPCS-2021-GS1-Q143` | damaged table structure | Resolve through duplicate/reference: Ragamala–Pundarika Vitthala; Rasa Kaumudi–Srikantha; Raga Vibodha–Somanatha; Chaturdandi Prakashika–Venkatamakhin |
| Canonical `UPPCS-2019-GS1-Q016` | table structure unclear | Tughluqnama = **Amir Khusrau**; Ibn Battuta = **Rihla**; remaining text-author pairs independently resolved |
| Canonical `UPPCS-2023-GS1-Q033` | table structure unclear | Regional chronicle mapping independently reconstructed; use mapping, not table geometry |

#### VERIFY

- **Tappa development wording:** UPPCS 2023 key/explanation associates development/encouragement with Muhammad Shah; later standard music history also strongly associates refinement with **Ghulam Nabi Shori (Shori Mian)** in Awadh. Keep both layers; avoid “single inventor” claims.
- **Saka-era originator:** Kanishka attribution is common in older exam literature, but not sufficiently secure to encode as an unconditional fact. Epoch 78 CE + national-calendar use are secure.
- **`UPSC-CSE-2014-GS1-Q085`** — `review-required / SOURCE_UNCLEAR`; the underlying monument associations used in this pack were independently checked, but the canonical answer is not used blindly.
- **`UPSC-CSE-2024-GS1-Q065`** — `review-required / EMPTY_STATEMENT`; property names are missing. Use only as demand evidence; no answer reconstruction attempted.
- **`UPPCS-2022-GS1-Q075`** — canonical status is validated but question text is visibly corrupted; Amaravati/ayaka-pillar concept is retained from independent art-history support.
- **`UPPCS-2025-GS1-Q097`** — malformed current-year Kumbh wording; dynamic demand only.
- **Current administrative award rules:** sports/science prize rules can be revised; permanent payload stores durable purpose/institution. Recheck current notification only when the live exam asks a changed rule.

#### OMIT

- Latest UNESCO WHS/ICH additions as permanent content.
- New GI registrations and yearly ODOP/handicraft announcements.
- Current award recipients (Padma, Sahitya Akademi, Booker, Jnanpith, film/sports prizes) from permanent payload.
- Encyclopaedic temple lists without PYQ/elimination value.
- Unsupported “oldest/second-oldest dance” rankings.
- Speculative etymologies and absolute claims such as “all arts declined”, “only circular temple”, “purely indigenous/no outside influence” when the evidence is more nuanced.
- Modern office-holder/member lists of cultural institutions.

### 9. Supplement Decision

`NO_SUPPLEMENT_NEEDED`

- Base notes were strong for the four largest cultural-form subtopics.
- Genuine static gaps in awards, cultural institutions and UNESCO mechanisms were filled from authoritative/official sources.
- Remaining year-specific award recipients, latest UNESCO inscriptions and new GI tags are **deliberately excluded** as CURRENT_DYNAMIC, not treated as missing source material.
- All malformed/review PYQs are either independently resolved at fact level or quarantined as demand-only evidence.

### 10. Synthesis Handoff

- **All child subtopics covered:** 6/6.
- **Unresolved VERIFY items:** Tappa single-origin/development wording; Saka-era founder attribution; malformed `UPSC-CSE-2024-GS1-Q065`; current administrative rules only if later amended.
- **Corrections that must override older wording:** Amaravati limestone; Barabar/Nagarjuni cave attribution; gopuram-vimana distinction; Hoysala soapstone; Vaikuntha Perumal–Nandivarman II; Bibi ka Maqbara–Azam Shah; Bhatkhande–Hindustani; Venkatamakhin spelling; Vasubandhu–Abhidharmakosha; Aryabhata–Aryabhatiya; Kangra ≠ embroidery; Saka-founder uncertainty; canonical `UPPCS-2025-GS1-Q086` option letter must not be propagated.
- **Material explicitly excluded:** current award recipients; latest UNESCO additions/listing-session trivia; new GI tags; modern one-off temple inaugurations; detailed present-day Article 18 doctrine; political/dynastic narrative not needed to identify a cultural form.
- **Synthesis priority:** Architecture & Sculpture > Performing Arts ≈ Literature/Travellers > Painting/Crafts > Festivals/Heritage static > Awards static rules. UPPCS annual awards should be attached later as a replaceable current-affairs insert, not merged into the durable note.

---

<!-- SOURCE PACK: COLONIAL RULE & SOCIAL CHANGE | ORIGINAL FILE: PRE-HISTCULT__COLONIAL-RULE-AND-SOCIAL-CHANGE__SOURCE-PACK__v01.md -->
## HISTORY & CULTURE → Colonial Rule & Social Change — Topic Source Pack v01

**Status:** PASS_WITH_CORRECTIONS  
**topic_taxonomy_id:** `prelims-history-and-culture-colonial-rule-and-social-change`  
**Child subtopics covered:** 5/5  
**Canonical PYQ scope used:** UPSC CSE Prelims GS-I 2011–2026 + UPPCS Prelims GS-I 2018–2025; semantic classification from untagged canonical corpus.  
**Primary content layer:** `PRE__HIS__BASE__SELF__2026__History-Modern-India__v01.md`  
**Gap/correction sources:** Spectrum 2020; Ghatna Chakra 2026 only for UPPCS-heavy extension/cross-checks.  
**Integrity note:** `UPSC-CSE-2024-GS1-Q062`, `UPSC-CSE-2018-GS1-Q076`, and `UPPCS-2020-GS1-Q020` are malformed/review-required canonical records; retained only as evidence of demand, not as answer authority.

### 1. Topic Scope

- **Includes:** colonial constitutional development; Company/Crown administration; land-revenue systems; economic impact and drain critique; education/civil-service/judicial policy; princely-state policy; socio-religious/women/anti-caste reform; European companies and early factories; British territorial expansion; tribal/peasant resistance; UPPCS-heavy 1857 layer.
- **Excludes:** present-day constitutional mechanics; current Constitution Day/event hooks; Indian National Movement material where the decisive knowledge is mass-movement strategy rather than constitutional proposal; purely geographic facts; current awards/listings.
- **UPSC depth:** feature-level constitutional distinctions; cause–effect economic reasoning; institution/person matching; obscure but repeated reform bodies; factories/permissions; common-cause reasoning for uprisings.
- **UPPCS depth:** Governor-General/Viceroy association; war/treaty chronology; education-commission chronology; 1857 leaders/centres; revolt/year/leader matching; additional regional reform bodies.
- **Boundary rule:** Champaran/Kheda, Poona Pact, Quit India and other national-movement episodes appear only where a PYQ directly tests their agrarian/social/constitutional fact; full movement narratives remain under **Indian National Movement**.

### 2. Child-Subtopic Coverage Ledger

| Child subtopic | taxonomy_id | UPSC PYQs | UPPCS PYQs | Base coverage | Status |
|---|---|---:|---:|---|---|
| Constitutional Development: Acts, Commissions & Constituent Assembly | `prelims-history-and-culture-colonial-rule-and-social-change-constitutional-development-acts-commissions-and-constituent-assembly` | 20 | 14 | Strong; 1773–1935 + 1940s proposals + CA present | **CORRECT** — several feature/date nuances tightened; 1 malformed UPSC record |
| British Administration, Economy & Policies | `prelims-history-and-culture-colonial-rule-and-social-change-british-administration-economy-and-policies` | 13 | 4 | Strong; land, admin, education, judiciary, economy present | **CORRECT** — civil-service, education, High Court, land-settlement wording fixed; 2 malformed demand records |
| Socio-Religious Reform & Anti-Caste Movements | `prelims-history-and-culture-colonial-rule-and-social-change-socio-religious-reform-and-anti-caste-movements` | 13 | 6 | Strong; reform bodies + women + anti-caste present | **CORRECT** — Rakhmabai, Savitribai, SNDP, Justice Party, Theosophy wording fixed |
| Europeans & British Expansion | `prelims-history-and-culture-colonial-rule-and-social-change-europeans-and-british-expansion` | 8 | 5 | Strong; Europeans + regional states + expansion wars present | **CORRECT** — voyage/factory/Diu/Farrukhsiyar chronology normalized |
| Tribal & Peasant Uprisings | `prelims-history-and-culture-colonial-rule-and-social-change-tribal-and-peasant-uprisings` | 8 | 9 | Strong; tribal + peasant + 1857 present | **CORRECT** — revolt chronology/leader and Rampa/Tana-Bhagat wording tightened |

> **Counting rule:** counts above are the materially relevant canonical questions explicitly retained in the demand map, not the taxonomy gateway’s older cluster counts. Cross-topic questions are assigned to their dominant demand to avoid artificial duplication; a few are cross-referenced where useful.

### 3. PYQ Demand Map

#### A. Constitutional Development: Acts, Commissions & Constituent Assembly

##### UPSC

- **Early Company/Charter Acts:** `UPSC-CSE-2019-GS1-Q004` (Charter Act 1813); `UPSC-CSE-2023-GS1-Q050` (Charter Act 1833 → Governor-General of India).
- **Government of India Act 1919 / Montagu–Chelmsford:** `UPSC-CSE-2012-GS1-Q027`, `UPSC-CSE-2015-GS1-Q028`, `UPSC-CSE-2016-GS1-Q064`, `UPSC-CSE-2017-GS1-Q062`, `UPSC-CSE-2021-GS1-Q042`, `UPSC-CSE-2022-GS1-Q051`, `UPSC-CSE-2026-GS1-Q008` → dyarchy, centre–province demarcation, reserved/transferred subjects, franchise/electorates.
- **Simon + Nehru Report:** `UPSC-CSE-2011-GS1-Q070`, `UPSC-CSE-2013-GS1-Q039` → all-white Simon Commission; Nehru Report = Dominion status + joint electorates with minority reservation + fundamental rights, not complete independence.
- **Government of India Act 1935:** `UPSC-CSE-2012-GS1-Q083`, `UPSC-CSE-2018-GS1-Q038`; `UPSC-CSE-2024-GS1-Q062` **DEMAND ONLY — malformed** → three-list federal scheme, residuary power with Governor-General, federation/princely-state accession, provincial autonomy.
- **Cripps/Cabinet Mission:** `UPSC-CSE-2013-GS1-Q040`, `UPSC-CSE-2015-GS1-Q051`, `UPSC-CSE-2016-GS1-Q093`, `UPSC-CSE-2022-GS1-Q054` → post-war Dominion status, province opt-out, princely representation, Cabinet Mission federal/union design.
- **Constituent Assembly:** `UPSC-CSE-2013-GS1-Q009`, `UPSC-CSE-2024-GS1-Q061` → indirect election by provincial legislatures; Sachchidananda Sinha as provisional president.

##### UPPCS

- **Constituent Assembly chronology/symbols/committees:** `UPPCS-2018-GS1-Q095`, `UPPCS-2020-GS1-Q134`, `UPPCS-2021-GS1-Q115`, `UPPCS-2023-GS1-Q003`, `UPPCS-2025-GS1-Q082`.
- **1919 institutional extension:** `UPPCS-2021-GS1-Q082` (portfolio/departmental system under ICA 1861), `UPPCS-2023-GS1-Q043` (Chamber of Princes linked to 1919 reforms).
- **Simon/Nehru chronology:** `UPPCS-2019-GS1-Q020`, `UPPCS-2021-GS1-Q037`.
- **1940s proposal chronology:** `UPPCS-2018-GS1-Q115`, `UPPCS-2019-GS1-Q094`, `UPPCS-2024-GS1-Q016`, `UPPCS-2024-GS1-Q133`, `UPPCS-2025-GS1-Q041`.

##### Demand synthesis

- UPSC repeatedly asks **feature discrimination**, not bare dates: what belongs to 1919 vs 1935; what operated only in provinces; who held residuary powers; which proposals allowed provincial non-accession; how CA members were chosen.
- High-value qualifiers: **“introduced” vs “extended”; “provided” vs “came into operation”; “province” vs “centre”; “elected” vs “nominated”; “Dominion status” vs “complete independence.”**
- UPPCS adds **chronology + committee-chairman + institutional founder/Act matching**. Every major constitutional milestone must therefore be stored as **date → mechanism → body/person → one distinctive feature → trap**.

#### B. British Administration, Economy & Policies

##### UPSC

- **Land revenue:** `UPSC-CSE-2011-GS1-Q053`, `UPSC-CSE-2012-GS1-Q037`, `UPSC-CSE-2017-GS1-Q013` → Permanent Settlement consequences; Ryotwari = direct settlement, patta/survey, Read–Munro.
- **Drain/economic critique:** `UPSC-CSE-2011-GS1-Q059`, `UPSC-CSE-2012-GS1-Q066`, `UPSC-CSE-2015-GS1-Q020` → Home Charges; Naoroji and other economic critics.
- **Colonial economic effects:** `UPSC-CSE-2018-GS1-Q052`, `UPSC-CSE-2020-GS1-Q023`, `UPSC-CSE-2020-GS1-Q033` → commercialization, handicraft decline, synthetic-dye shock to indigo.
- **Education:** `UPSC-CSE-2018-GS1-Q019`, `UPSC-CSE-2018-GS1-Q089`, `UPSC-CSE-2020-GS1-Q034`; `UPSC-CSE-2018-GS1-Q076` **DEMAND ONLY — malformed** → Wood’s Despatch, institution/founder, purpose of Fort William College, English-education policy.
- **Civil service chronology:** `UPSC-CSE-2018-GS1-Q080` → Satyendranath Tagore as first Indian to clear ICS examination; chronology against Arya Samaj/Neeldarpan/Anandamath.

##### UPPCS

- `UPPCS-2018-GS1-Q119` → Wood’s Despatch → Hunter → Sadler → Sargent chronology.
- `UPPCS-2020-GS1-Q030` → differentiated land-revenue systems and resulting agrarian classes.
- `UPPCS-2020-GS1-Q020` **DEMAND ONLY — table malformed** → Indian High Courts Act 1861 and other Act-year matching.
- `UPPCS-2025-GS1-Q040` → Governor-General/Viceroy ↔ policy association (Dalhousie/Curzon/Bentinck/Cornwallis).

##### Demand synthesis

- Treat land systems comparatively: **settlement party, region, permanence/revision, survey basis, intermediary status, liability, social consequence**.
- Economic questions reward causal reasoning: **colonial fiscal/industrial policy → deindustrialisation/commercialisation/debt/drain**, not slogans alone.
- Education/civil service are chronology-heavy and institution-founder prone; exact **“recommended” vs “established”** distinctions are recurring traps.
- UPPCS expects a compact **Governor-General/Viceroy policy matrix**, especially Cornwallis–Bentinck–Dalhousie–Curzon.

#### C. Socio-Religious Reform & Anti-Caste Movements

##### UPSC

- **Brahmo/Rammohan:** `UPSC-CSE-2012-GS1-Q074`, `UPSC-CSE-2025-GS1-Q011` → monotheism/rationalism; anti-idolatry/priestly monopoly; do not confuse with Arya Samaj’s Vedic infallibility.
- **Reform organisations:** `UPSC-CSE-2012-GS1-Q028` (National Social Conference), `UPSC-CSE-2016-GS1-Q069` (Keshab Sen → Tabernacle of New Dispensation + Indian Reform Association), `UPSC-CSE-2013-GS1-Q080` (Annie Besant ≠ founder of Theosophical Society).
- **Anti-caste:** `UPSC-CSE-2016-GS1-Q058`, `UPSC-CSE-2019-GS1-Q006`, `UPSC-CSE-2020-GS1-Q028`, `UPSC-CSE-2025-GS1-Q074`, `UPSC-CSE-2025-GS1-Q078` → Satyashodhak, Walangkar/Vital-Vidhvansak, Gandhi anti-untouchability, Self-Respect/Periyar.
- **Women/social law:** `UPSC-CSE-2020-GS1-Q032` (Rakhmabai: age of consent + restitution of conjugal rights), `UPSC-CSE-2021-GS1-Q046` (Vidyasagar + Bethune Female School).
- **Chronology cross-check:** `UPSC-CSE-2018-GS1-Q080` → Neeldarpan before Satyendranath ICS, Arya Samaj and Anandamath.

##### UPPCS

- `UPPCS-2021-GS1-Q069` → Vaikom = anti-untouchability/caste discrimination; canonical key treats Gandhi as participating. Retain the nuance that he intervened through visit/negotiation/support rather than being the original organiser.
- `UPPCS-2022-GS1-Q010`, `UPPCS-2024-GS1-Q017` → women-reform personalities and Age of Consent; Karve/Bethune/Vidyasagar/Malabari matching.
- `UPPCS-2022-GS1-Q040`, `UPPCS-2022-GS1-Q087` → Phule/Satyashodhak and anti-caste identification.
- `UPPCS-2024-GS1-Q013` → Justice Party = non-Brahmin representation and anti-Congress/Brahmin-dominance critique.

##### Demand synthesis

- Highest-return structure is **person ↔ organisation ↔ date ↔ core idea ↔ publication/legal episode**.
- Repeated traps arise from near-neighbour bodies: **Brahmo vs Arya; Theosophical founders vs Annie Besant; Phule vs Walangkar vs Ambedkar; SNDP founder/inspirers; Justice Party vs Self-Respect; Bethune vs Vidyasagar vs Karve vs Malabari**.
- UPSC increasingly tests **lesser bodies/legal cases**, so obscure names must be retained only where they have demonstrated elimination value.

#### D. Europeans & British Expansion

##### UPSC

- `UPSC-CSE-2021-GS1-Q033` → first-quarter 17th-century English factory locations; Broach valid, distractors from later/other geography.
- `UPSC-CSE-2022-GS1-Q059` → Dutch east-coast grant claim vs Albuquerque’s Goa capture vs Madras lease from Vijayanagara representative.
- `UPSC-CSE-2023-GS1-Q049` → Bahadur Shah of Gujarat and Diu.
- `UPSC-CSE-2024-GS1-Q056` → Krishnadevaraya permission for Portuguese fort at Bhatkal.
- `UPSC-CSE-2025-GS1-Q075` → papaya, pineapple, guava introduced by Portuguese.
- `UPSC-CSE-2012-GS1-Q081` → tobacco/red chillies and other “introduced by English?” traps; answer requires rejecting English attribution.
- `UPSC-CSE-2018-GS1-Q068` → Bengal export basket (cotton, silk, saltpetre, opium).
- `UPSC-CSE-2018-GS1-Q075` → Subsidiary Alliance purpose/feature discrimination.

##### UPPCS

- `UPPCS-2019-GS1-Q093` → Allahabad/Madras/Mangalore/Salbai treaty-year matching.
- `UPPCS-2020-GS1-Q018`, `UPPCS-2025-GS1-Q067` → Treaty of Aix-la-Chapelle ended First Carnatic War; Madras restored to English.
- `UPPCS-2025-GS1-Q026` → Anglo-French/Mysore/Afghan/Sikh war chronology.
- `UPPCS-2025-GS1-Q114` → Treaty of Sugauli and Himalayan territorial consequences.

##### Demand synthesis

- UPSC’s dominant mode is **specific location/permission/commodity introduction**, not generic “arrival chronology.”
- Must retain **factory + year + granting authority/political context** for high-value sites, but avoid encyclopaedic lists.
- UPPCS requires **war → decisive battle → treaty → territorial/political result** chains for Mysore, Marathas, Sikhs, Nepal and Carnatic wars.

#### E. Tribal & Peasant Uprisings

##### UPSC

- `UPSC-CSE-2011-GS1-Q055` → common factor in 19th-century tribal insurrection = disruption of older agrarian order.
- `UPSC-CSE-2018-GS1-Q051` → Santhal aftermath: Santhal Parganas + restrictions on alienation to non-Santhals.
- `UPSC-CSE-2020-GS1-Q035` → Ulgulan = Birsa Munda revolt, 1899–1900.
- `UPSC-CSE-2013-GS1-Q020` → Tebhaga: landlord share from one-half to one-third; bargadar retains two-thirds.
- `UPSC-CSE-2011-GS1-Q060` → Kheda: revenue remission after crop failure/drought, not Permanent Settlement.
- `UPSC-CSE-2018-GS1-Q069` → Champaran significance = joining peasant unrest with national movement.
- `UPSC-CSE-2019-GS1-Q006` → All India Kisan Sabha ↔ Sahajanand Saraswati.
- `UPSC-CSE-2026-GS1-Q019` → Bardoli = enhanced land revenue; Eka = excessive rent extraction.

##### UPPCS

- `UPPCS-2018-GS1-Q121`, `UPPCS-2019-GS1-Q018`, `UPPCS-2025-GS1-Q025` → revolt/year and chronology: Khasi/Kol/Santhal/Ahom; Pabna/Eka/Tana Bhagat; Sanyasi/Indigo/Kuka/Pabna.
- `UPPCS-2023-GS1-Q041`, `UPPCS-2023-GS1-Q047`, `UPPCS-2025-GS1-Q127` → UP Kisan Sabha, Moplah placement, Indigo/Awadh/Ilbert chronology.
- **1857 extension:** `UPPCS-2023-GS1-Q040`, `UPPCS-2023-GS1-Q046`, `UPPCS-2024-GS1-Q138` → start dates, Bareilly leader, Paika/Bareilly/Malabar/Sylhet leader matching.

##### Demand synthesis

- UPSC asks **cause/result/demand**; UPPCS adds **year + region + leader + sequence**.
- Tribal questions should be organised by **agrarian/forest disruption → outsider/moneylender/missionary/administrative intrusion → leader/region → settlement/legislative aftermath**.
- Peasant questions should retain the exact economic demand: **rent, revenue, tenancy, forced crop, debt, share of produce**—these are frequent distractor swaps.

### 4. Base-Note Coverage

#### Constitutional Development: Acts, Commissions & Constituent Assembly

- **Strong:** 1773–1935 statutory chain; 1919/1935 features; Simon/Nehru; August Offer; Cripps; Wavell/Simla; Cabinet Mission; Constituent Assembly/Interim Government.
- **Partial:** CA committee-chairmen and exact composition/election mechanics need sharper tabulation; distinction between **federal provisions enacted vs actually commenced** was not consistently foregrounded.
- **Missing:** compact “Act → one unique discriminator” matrix; Cabinet Mission’s Union/group/residuary structure in elimination-ready form.
- **Outdated/suspect:** several date/feature compressions could imply that all 1935 federal provisions operated; correct in payload.

#### British Administration, Economy & Policies

- **Strong:** Permanent/Ryotwari/Mahalwari; civil services; police/judiciary; education; conquest/princely policy; broad economic impact.
- **Partial:** drain mechanism and Home Charges need a tighter concept map; education entries mix recommendations with establishments.
- **Missing:** exact Read–Munro / Mackenzie–Bird pairing; 1861 High Courts Act → 1862 presidency High Courts; economic “mechanism → effect” matrix.
- **Outdated/suspect:** “Charter Act 1857” typo; open competition incorrectly shifted to 1833; Benares Sanskrit College described with Islamic education; Wood’s Despatch presented as directly creating universities rather than recommending them.

#### Socio-Religious Reform & Anti-Caste Movements

- **Strong:** Brahmo, Arya, Prarthana, Ramakrishna, Theosophy, Phule, SNDP, Self-Respect, Justice Party, women reform, Muslim/Sikh/Parsi reform.
- **Partial:** obscure UPSC-tested bodies (Tabernacle/New Dispensation, Vital-Vidhvansak) need explicit trap framing.
- **Missing:** compact legal/social-reform chronology; Ambedkar’s pre-independence anti-caste organisations/actions useful as stable bridge facts.
- **Outdated/suspect:** Savitribai “girls college” wording; Pandita Ramabai portrayed as leading the Rakhmabai case; sole-founder phrasing for SNDP; “South Indian Liberation Federation” instead of **South Indian Liberal Federation**.

#### Europeans & British Expansion

- **Strong:** Portuguese/Dutch/Danish/English/French sections; regional successor states; Carnatic/Mysore/Maratha/Sikh expansion; Subsidiary Alliance.
- **Partial:** some factory chronologies duplicated or inconsistent; exact Diu/Bassein sequence compressed.
- **Missing:** PYQ-facing table of factory/location/grant authority; Portuguese introductions from 2025 UPSC.
- **Outdated/suspect:** Vasco da Gama second voyage dated 1501 instead of 1502; Nuno da Cunha/HQ shift; 1715 mission vs 1717 Farrukhsiyar farmans; Masulipatnam trade/factory duplicate; Diu/Bassein conflation.

#### Tribal & Peasant Uprisings

- **Strong:** tribal and peasant tables; cause/result; 1857 causes/centres/leaders.
- **Partial:** post-revolt legal/administrative consequences (Santhal, Deccan, Pabna) need PYQ-ready emphasis.
- **Missing:** one chronology spine for UPPCS; exact economic demand matrix for Eka/Bardoli/Tebhaga/Kheda/Champaran.
- **Outdated/suspect:** Rampa chronology conflates different phases; Tana Bhagat tribal composition wording needs tightening; “complete communal harmony” in 1857 is too absolute.

### 5. Core Fact Payload

#### A. Constitutional Development: Acts, Commissions & Constituent Assembly

##### 1) Company rule → Crown rule: statutory spine

| Act | High-yield provisions | Elimination trap |
|---|---|---|
| **Regulating Act, 1773** | Governor of Bengal → **Governor-General of Bengal** (Warren Hastings); 4-member executive council; Bombay/Madras subordinated in war/peace; Supreme Court at Calcutta provided | First parliamentary control ≠ Crown takeover |
| **Amending/Act of Settlement, 1781** | Clarified Supreme Court jurisdiction; protected official acts/revenue matters from indiscriminate Court interference | Do not confuse with Pitt’s dual control |
| **Pitt’s India Act, 1784** | **Board of Control** for political affairs + Court of Directors for commercial affairs → “dual control” | Company continued; not 1858 transfer |
| **Charter Act, 1813** | Ended Company trade monopoly **except tea and China trade**; missionaries allowed; annual ₹1 lakh for education; Crown sovereignty over Company territories asserted | Monopoly not completely ended until 1833 |
| **Charter Act, 1833** | Governor-General of Bengal → **Governor-General of India**; Bentinck first; Company ceased commercial activity; legislative centralisation; first Law Member/Macaulay | Did **not** introduce open competitive ICS examination |
| **Charter Act, 1853** | Legislative/executive functions of GG’s council further separated; opened way to **competitive civil-service recruitment**; last Charter Act | “Open competition” belongs here, not 1833 |
| **Government of India Act, 1858** | Company rule ended; Crown rule; Secretary of State for India + Council of India; GG also **Viceroy** | Queen’s Proclamation follows in 1858; separate instrument |
| **Indian Councils Act, 1861** | Indians could be nominated to legislative council; legislative decentralisation restored; Viceroy’s departmental/**portfolio** working strengthened; ordinance power | “Election” still absent |
| **Indian Councils Act, 1892** | Enlarged councils; budget discussion + questions; indirect representative/elective element without using full democratic election language | No separate electorates yet |
| **Indian Councils Act, 1909 (Morley–Minto)** | Separate electorate for **Muslims**; enlarged councils; S.P. Sinha first Indian on Viceroy’s Executive Council | Dyarchy = 1919, not 1909 |

##### 2) Government of India Act, 1919 — repeated UPSC core

- Basis: **Montagu Declaration 1917 + Montagu–Chelmsford Report**.
- **Dyarchy only in provinces**:
  - **Reserved:** law & order/police, justice, land revenue, irrigation etc. → Governor/executive councillors.
  - **Transferred:** local self-government, education, public health, agriculture etc. → Indian ministers responsible to provincial legislature.
- Centre: bicameral legislature → **Council of State + Legislative Assembly**; direct elections introduced but franchise restricted.
- Separate electorates **retained/extended** beyond Muslims to Sikhs, Indian Christians, Anglo-Indians, Europeans; communal representation deepened.
- Central/provincial subjects separated; provincial budgets separated from central budget.
- Provision for Public Service Commission; first PSC established **1926** after Lee Commission.
- High Commissioner for India in London created.
- Statutory review after ten years → Simon Commission appointed early (1927).
- **Women:** 1919 did **not** grant universal female franchise; provinces could extend franchise; later 1935 reserved seats for women.
- **Trap:** “reserved subjects” is a **provincial dyarchy** term; centre remained non-responsible to legislature.

##### 3) Simon Commission → Nehru Report

- **Simon Commission (Indian Statutory Commission), 1927; arrived 1928; report 1930**.
- All members British → “Simon Go Back”; **no Indian member** = canonical elimination anchor.
- Key recommendations: abolish provincial dyarchy; extend provincial responsible government/autonomy; eventual federation of British India + princely states; retain communal electorates; no full parliamentary responsibility at centre.
- **Nehru Report, 1928** — Motilal Nehru committee:
  - **Dominion status**, not Purna Swaraj.
  - Federal polity; residuary powers with **Centre**.
  - Joint electorates + reservation for minorities where needed; opposed separate electorates.
  - Fundamental rights; responsible government; linguistic provinces; adult suffrage proposed.
- Trap: Congress Lahore 1929 later moved to **Purna Swaraj**; do not retroject this into Nehru Report.

##### 4) Government of India Act, 1935 — “provided” ≠ “operated”

- Proposed **All-India Federation**: Governors’ Provinces + Chief Commissioners’ Provinces + acceding princely states through **Instrument of Accession**.
- Federation **never came into operation** because requisite princely-state accession did not materialise.
- Three legislative lists: Federal, Provincial, Concurrent; **residuary legislative power at Governor-General’s discretion**.
- **Dyarchy at Centre** provided but **never commenced**.
- **Provincial dyarchy abolished** → provincial autonomy; responsible ministries subject to Governor’s safeguards; autonomy came into operation **1937**.
- Bicameral provincial legislatures in six provinces: Bengal, Bombay, Madras, Bihar, Assam, United Provinces.
- Franchise expanded but remained limited; communal electorates/weightage extended to additional interests incl. women/labour/depressed classes.
- Federal Court provided → established **1937**.
- **Instrument of Instructions** to Governors/Governor-General is an important constitutional antecedent for parts of the later **Directive Principles of State Policy**.
- Modern Indian Constitution’s Union/State/Concurrent distribution substantially inherits the 1935 scheme, but present mechanics belong to Polity.

##### 5) Wartime constitutional proposals, 1940–46

| Proposal | Core | Trap / why rejected |
|---|---|---|
| **August Offer, 1940** | Dominion status as ultimate objective; post-war constitution-making with Indian participation; expanded Viceroy’s Executive Council | Minority veto/consent principle constrained transfer; Congress sought immediate effective power |
| **Cripps Mission, 1942** | Post-war **Dominion status**; elected constitution-making body; princely representatives nominated; province could opt out and negotiate separate arrangement; interim defence retained by British | No immediate responsible national government; province opt-out carried partition potential |
| **Wavell Plan, 1945** | Reconstitute Viceroy’s Executive Council with Indian members except Viceroy/C-in-C; parity politics around caste-Hindu/Muslim representation | **Simla Conference** failed over Muslim League claim to nominate all Muslim members |
| **Cabinet Mission, 1946** | Rejected sovereign Pakistan; weak Union controlling **defence, foreign affairs, communications** + necessary finance; provinces retained residuary subjects; provincial grouping A/B/C; Constituent Assembly + Interim Government | Grouping/interpretation and Congress–League conflict destabilised plan |

##### 6) Cabinet Mission groups — retain for elimination

- **Group A:** Madras, Bombay, United Provinces, Bihar, Central Provinces & Berar, Orissa.
- **Group B:** Punjab, North-West Frontier Province, Sindh.
- **Group C:** Bengal, Assam.
- Provinces could reconsider group position after constitutional machinery began under the plan’s procedure; no immediate fully sovereign Pakistan.

##### 7) Constituent Assembly — formation, composition, work

- Cabinet Mission scheme: total **389** envisaged → **296 British Indian** seats (292 Governors’ Provinces + 4 Chief Commissioners’ Provinces) + **93 princely states**.
- Provincial seats: roughly one per million population; community allocation; members **indirectly elected by Provincial Legislative Assemblies through proportional representation by single transferable vote**. Princely-state representatives nominated by rulers.
- Provincial elections 1946: Congress 208, Muslim League 73; League initially boycotted CA.
- **9 Dec 1946:** first sitting; **Sachchidananda Sinha** provisional president.
- **11 Dec 1946:** **Rajendra Prasad** elected president.
- **13 Dec 1946:** Nehru moved **Objectives Resolution**; adopted **22 Jan 1947**.
- Independence Act 1947 made Indian CA fully sovereign; it also functioned as legislature.
- **Constitutional Adviser:** **B.N. Rau**.
- **Drafting Committee:** constituted **29 Aug 1947**; Chair **B.R. Ambedkar**; members included Alladi Krishnaswami Ayyar, N. Gopalaswami Ayyangar, K.M. Munshi, Saiyad Mohammad Saadulla, B.L. Mitter (replaced by N. Madhava Rao), D.P. Khaitan (after death replaced by T.T. Krishnamachari).
- Key committees:
  - Union Constitution Committee — **Jawaharlal Nehru**.
  - Union Powers Committee — **Jawaharlal Nehru**.
  - Provincial Constitution Committee — **Vallabhbhai Patel**.
  - Advisory Committee on Fundamental Rights, Minorities & Tribal/Excluded Areas — **Vallabhbhai Patel**.
  - Fundamental Rights Sub-Committee — **J.B. Kripalani**.
  - Minorities Sub-Committee — **H.C. Mookherjee**.
  - Rules of Procedure Committee — **Rajendra Prasad**.
- Second draft laid before Assembly **21 Feb 1948**; third reading 14–26 Nov 1949.
- **26 Nov 1949:** Constitution adopted/enacted; **24 Jan 1950:** 284 members signed; last CA meeting; National Anthem/National Song adopted, Rajendra Prasad elected first President.
- **22 Jul 1947:** National Flag adopted.
- From **26 Jan 1950** CA continued as Provisional Parliament until first general-election Parliament.

#### B. British Administration, Economy & Policies

##### 1) Land-revenue systems — comparison payload

| System | Makers / date | Settlement with | Main region | Revenue logic | High-yield consequences/traps |
|---|---|---|---|---|---|
| **Permanent / Zamindari** | Cornwallis; decennial 1790 → permanent **1793** | Zamindar | Bengal, Bihar; extended to Orissa, Banaras and parts of northern Madras | State demand fixed permanently; zamindar proprietary intermediary; “sunset” sale for arrears | Absentee landlordism, subinfeudation, tenant insecurity, rent extraction; do not generalise to all Madras |
| **Ryotwari** | Alexander Read + Thomas Munro; developed in Baramahal; Munro expanded as Madras governor from 1820 | Individual cultivator/ryot | Madras; Bombay; later some Assam/Coorg etc. | Direct state–ryot settlement; survey/assessment; patta; periodically revisable | No zamindar intermediary in principle; overassessment/coercion/debt; **UPSC: Read + Munro** |
| **Mahalwari** | Holt Mackenzie proposal **1822**; revised/implemented systematically under **R.M. Bird**, 1830s | Village/mahal/body of co-sharers, often via lambardar | North-Western Provinces, parts of Central India/Punjab | Joint village responsibility; periodic revision | Intermediary/community unit differs from ryotwari individual; not permanent |

- Permanent Settlement litigation PYQ: expansion of formal judicial machinery made disputes increasingly litigated; avoid simplistic “zamindar strengthened” as sole explanation.
- Colonial land systems differed by region but commonly sought predictable/high revenue and reshaped agrarian classes, credit dependence and property rights.

##### 2) Economic impact — mechanism → effect

- **Deindustrialisation:** influx of machine-made British goods + tariff/commercial asymmetry + loss of courtly/political patronage → contraction of many handicrafts; India increasingly supplied raw materials and purchased manufactures.
- **Commercialisation of agriculture:** cultivation increasingly driven by market/revenue/export demand — cotton, indigo, opium, jute, tea etc.; did not equal broad-based agricultural modernisation.
- **Indigo:** coercive planter system provoked 1859–60 revolt; later long-run decline accelerated because synthetic dyes/new inventions made natural indigo less profitable in world market — UPSC trap distinguishes this from resistance as the immediate 20th-century market cause.
- **Railways:** integrated commodity markets and administration; guaranteed-return system could transfer risk to Indian revenues; also intensified export orientation and market penetration.
- **Famines/indebtedness:** high/inflexible revenue demands, commercialization, moneylender dependence and limited rural investment increased vulnerability in many regions; avoid mono-causal famine claims.

##### 3) Drain of Wealth — durable core

- Economic nationalists: **Dadabhai Naoroji**, **R.C. Dutt**, **G. Subramania Iyer** among prominent critics of colonial economic extraction.
- Naoroji’s drain critique: part of India’s surplus transferred abroad **without equivalent economic return**.
- Main channels: salaries/pensions/remittances of European officials; interest/profits on foreign capital and public debt; purchase of stores/services abroad; India Office expenses; military/imperial expenditure charged to Indian revenues; guaranteed payments.
- **Home Charges** included India Office expenditure in Britain and payments such as pensions/salaries/interest and other obligations remitted abroad; UPSC tests composition rather than slogan.
- Distinguish: **trade export surplus can be a mechanism of remittance**; it is not automatically domestic capital accumulation.

##### 4) Education policy — chronology + exact verb

| Date | Institution / policy | What to retain |
|---|---|---|
| **1781** | Calcutta Madrasa — Warren Hastings | Islamic learning/law |
| **1791** | Sanskrit College, Benaras — Jonathan Duncan | Hindu/Sanskrit learning; **not Islamic education** |
| **1800** | Fort William College — Wellesley | Train Company civil servants in Indian languages/administration |
| **1817** | Hindu College, Calcutta | Western learning; Indian initiative with European support |
| **1813** | Charter Act | ₹1 lakh annual provision for education; missionaries permitted |
| **1835** | Macaulay Minute + Bentinck resolution | Government support shifted strongly toward English/Western learning; English for higher instruction |
| **1854** | **Wood’s Despatch** | Department of Public Instruction; grant-in-aid; teacher training; vernacular at primary, Anglo-vernacular at secondary, English higher; **recommended universities** at presidency towns |
| **1857** | Universities of Calcutta, Bombay, Madras | Established after Wood recommendations; do not say Wood itself “created” them |
| **1882–83** | Hunter Commission | Primary/secondary education; local bodies and private effort |
| **1902 / 1904** | Raleigh Commission / Indian Universities Act | Curzon-era university regulation/control |
| **1917–19** | Sadler University Commission | Calcutta University but wider recommendations; 12-year school/intermediate reorganisation influence |
| **1929** | Hartog Committee | Quality/“wastage and stagnation”; primary education and university standards |
| **1937** | Wardha Scheme / Basic Education | Gandhi-inspired craft-centred basic education |
| **1944** | **Sargent Plan** | Long-term post-war plan; universal free compulsory education for 6–14 as goal |

- Wood’s Despatch trap: did **not** recommend English as medium at *all* levels.
- Fort William trap: created mainly to train **Company civil servants**, not to revive Orientalism or employ missionaries.

##### 5) Civil services

- Cornwallis professionalised higher Company civil administration and raised salaries; senior covenanted services largely reserved for Europeans.
- **Charter Act 1833:** declared no subject should be debarred from Company office by religion, birth, descent etc.; principle did not immediately produce open recruitment.
- **Charter Act 1853** → recruitment opened to competition; **Macaulay Committee 1854** shaped competitive scheme; exam held in London, structurally disadvantaging Indians.
- **Satyendranath Tagore** became first Indian to qualify for ICS, 1863 examination (joined service 1864).
- **Aitchison Commission (1886–87):** classification/reorganisation; covenanted/uncovenanted distinction replaced by Imperial/Provincial/Subordinate services.
- **Islington Commission (1912–15)** and **Lee Commission (1923–24)** pushed greater Indianisation; Lee recommended PSC.
- **Public Service Commission established 1926**; 1935 Act provided Federal and Provincial PSC framework.

##### 6) Judicial/administrative anchors

- Warren Hastings: district **Diwani Adalats** for civil and **Faujdari Adalats** for criminal justice; appellate structures at Calcutta.
- Regulating Act → Supreme Court at Calcutta (opened 1774); 1781 settlement clarified conflicts of jurisdiction.
- Cornwallis reforms: stronger separation of revenue/judicial functions and codified regulations; European judges dominated higher judiciary.
- **Indian High Courts Act, 1861** → High Courts at Calcutta, Bombay, Madras established **1862**, replacing Supreme Courts/Sadar Adalats.
- 1935 Act → **Federal Court**, established 1937.

##### 7) Princely states / expansion by administrative policy

- **Ring-fence / buffer logic:** Company initially sought allied buffers around its possessions.
- **Subsidiary Alliance — Wellesley (from 1798):** ruler accepted Company force/resident; paid subsidy or ceded territory; foreign relations constrained; could not employ Europeans without permission; Company promised protection → sovereignty progressively hollowed out. **Hyderabad** first major state under Wellesley’s system (1798).
- **Doctrine of Lapse — Dalhousie:** dependent state lacking Company-recognised natural male heir could be annexed; Satara (1848), Jhansi, Nagpur among major examples. **Awadh 1856 was annexed on alleged misgovernment, not Doctrine of Lapse.**
- After 1858, annexation policy moderated; princes retained under Crown paramountcy and became allies of Raj.
- **Chamber of Princes** inaugurated 1921 under 1919-reform framework; consultative, not sovereign federal chamber.

#### C. Socio-Religious Reform & Anti-Caste Movements

##### 1) Bengal reform — Brahmo strands

- **Raja Rammohan Roy:** Atmiya Sabha (1815); Brahmo Sabha (1828; later Brahmo Samaj); monotheism, rationalism, opposition to idolatry and priestly monopoly, campaign against sati, advocacy of women’s rights/modern education/press freedom.
- Rammohan respected Indian philosophical traditions while arguing for rational/scientific inquiry and human dignity — avoid “wholesale rejection of Indian tradition.”
- **Debendranath Tagore:** Tattwabodhini Sabha (1839), Tattwabodhini Patrika; joined/revitalised Brahmo movement; emphasis on Upanishadic monotheism.
- **Keshab Chandra Sen:** Brahmo Samaj of India (1866 after split); **Indian Reform Association (1870)**; New Dispensation/Nava Vidhan; **Tabernacle of New Dispensation** association tested by UPSC.
- **Sadharan Brahmo Samaj (1878):** formed after further split, associated with Ananda Mohan Bose, Sivanath Sastri etc.
- Trap: **Vedic infallibility belongs to Arya Samaj**, not Brahmo Samaj.

##### 2) Maharashtra / western India reform

- **Prarthana Samaj (1867, Bombay):** founded by **Atmaram Pandurang**; M.G. Ranade, R.G. Bhandarkar prominent; monotheistic social reform, widow remarriage, female education, caste reform.
- **Paramahansa Mandali (1849):** Dadoba Pandurang and associates; secret anti-caste reform circle; inter-dining, widow remarriage, women’s education.
- **Indian Social Conference (1887):** associated especially with M.G. Ranade and Raghunath Rao; parallel social-reform platform as Congress avoided making social reform a central political agenda.

##### 3) Arya, Ramakrishna, Theosophy

- **Arya Samaj:** Dayanand Saraswati; founded Bombay **1875**, later strong Lahore branch; *Satyarth Prakash*; “Back to the Vedas”; Vedas infallible; opposition to idolatry/caste by birth; shuddhi and education networks later important.
- **Ramakrishna Mission, 1897:** Swami Vivekananda; practical Vedanta, social service; Ramakrishna Math/Ramakrishna Mission institutional distinction useful but not overlearned.
- **Theosophical Society:** founded **New York, 1875**, **H.P. Blavatsky + H.S. Olcott**; headquarters moved to **Adyar, Madras, 1882**. **Annie Besant was later leader, not founder**; also Home Rule leader and INC president (1917).

##### 4) Muslim/Sikh/Parsi reform — stable anchors

- **Aligarh Movement:** Sir Syed Ahmad Khan; Scientific Society (1864); Muhammadan Anglo-Oriental College at Aligarh (founded 1875, classes/institutional development 1877) → later AMU; modern Western/scientific education, social reform.
- **Deoband:** Darul Uloom, 1866, Muhammad Qasim Nanautavi and Rashid Ahmad Gangohi; orthodox/revivalist Islamic learning, distinct from Aligarh modernist path.
- **Ahmadiyya:** Mirza Ghulam Ahmad, Qadian, 1889 institutional movement.
- **Singh Sabha:** Sikh religious/educational reform from 1873; Chief Khalsa Diwan later organisational centre.
- **Parsi reform:** Rahnumai Mazdayasnan Sabha (1851), Dadabhai Naoroji and other reformers; religious/social reform and education.

##### 5) Anti-caste movements — PYQ-heavy matrix

| Person/movement | Organisation / date | Core | PYQ trap |
|---|---|---|---|
| **Jyotirao Phule + Savitribai Phule** | **Satyashodhak Samaj, 1873** | anti-Brahminical caste domination; education of women/lower castes; simple non-Brahmin-priest marriages | Satyashodhak = **Maharashtra anti-caste**, not tribal/peasant Punjab |
| **Savitribai Phule** | girls’ school at **Bhide Wada, Pune, 1848** with Jyotirao/Fatima Sheikh network | pioneering girls’ and oppressed-caste education | School, **not “girls college”** |
| **Gopal Baba Walangkar** | early Dalit mobilisation; **Vital-Vidhvansak** | critique of untouchability/caste; Mahar movement | UPSC directly tests journal attribution |
| **Sree Narayana Guru / SNDP** | Aruvippuram consecration 1888; SNDP Yogam registered **1903** | Ezhava uplift, education, access to roads/temples/jobs, anti-caste spiritual equality | SNDP organisational creation also owes major effort to **Dr Palpu**; Kumaran Asan secretary |
| **Justice Party / South Indian Liberal Federation** | **1916** Madras non-Brahmin movement | communal representation, jobs/education; critique of Brahmin dominance in Congress/admin | **Liberal**, not “Liberation” Federation |
| **Self-Respect Movement** | **Periyar E.V. Ramasamy, 1925** | anti-caste, anti-Brahminical hierarchy, rationalism, self-respect marriages | Distinguish from Justice Party; later overlap/political link |
| **Vaikom Satyagraha** | 1924–25, Travancore | access to public roads around Vaikom temple; anti-untouchability | Gandhi participated through intervention/visit/negotiation; he was not the original organiser |
| **B.R. Ambedkar** | Bahishkrit Hitakarini Sabha (1924); Mahad Satyagraha (1927); Kalaram Temple Entry (1930) | civic equality, water/temple access, annihilation of caste | Distinguish from Gandhi-led anti-untouchability bodies |
| **Gandhi** | All India Anti-Untouchability League 1932 → Harijan Sevak Sangh | anti-untouchability/social programme intensified after Poona Pact | UPSC 2025 links Harijan uplift programme to **Poona Pact** |

##### 6) Women reform + law

- **Sati abolished 1829** in Bengal Presidency under William Bentinck after sustained reform advocacy including Rammohan Roy; later extended.
- **Hindu Widows’ Remarriage Act, 1856:** strongly associated with Ishwar Chandra Vidyasagar’s campaign.
- **Bethune School:** J.E.D. Bethune founded Hindu Female School (1849); **Vidyasagar served as secretary** and championed female education.
- **D.K. Karve:** Widow Remarriage Association; widows’ education, later women’s university initiatives.
- **Behramji Malabari:** major campaigner against child marriage and for widow remarriage; advocated raising age of consent.
- **Rakhmabai case (1884 onward):** dispute over **restitution of conjugal rights** after child marriage; public debate also central to **age of consent/child-marriage reform**. Rakhmabai herself resisted cohabitation; reformers including Malabari and Ramabai Ranade supported her cause. Do not assign the case’s leadership to Pandita Ramabai.
- **Age of Consent Act, 1891:** raised age of consent for girls; Malabari reform advocacy important; Tilak and many conservatives/nationalists opposed state intervention, even when not defending the social practice itself.
- **Child Marriage Restraint/Sarda Act, 1929** (in force 1930): minimum marriage ages then 14 for girls, 18 for boys.

#### D. Europeans & British Expansion

##### 1) Arrival/order — minimal spine

- **Portuguese:** Vasco da Gama at Calicut, **1498**.
- **Dutch VOC:** **1602**; first Dutch factory in India **Masulipatnam, 1605**.
- **English EIC:** chartered **1600**; sustained Indian factory network from early 17th century.
- **Danish EIC:** **1616**; Tranquebar factory **1620**.
- **French EIC:** **1664**; last major European trading company to enter Indian competition.
- Recall order by effective entry: **Portuguese → Dutch → English → Danish → French**.

##### 2) Portuguese — PYQ-facing anchors

- **Francisco de Almeida (1505):** first Portuguese governor in India; naval supremacy/“Blue Water” orientation; cartaz/pass system associated with Portuguese sea control.
- **Alfonso de Albuquerque:** real consolidator; **Goa captured from Bijapur, 1510**; bases across Indian Ocean; encouraged Portuguese-local marriages; strengthened permit/maritime system.
- **Nuno (Nino) da Cunha:** governor from 1529; shifted HQ **Cochin → Goa, 1530**.
- **Bahadur Shah of Gujarat:** **1534** ceded Bassein and dependencies; Diu base/fortification followed in alliance context; canonical UPSC identifies Bahadur Shah with surrender of Diu. Avoid compressing “Treaty of Bassein 1534 = Diu ceded” as one identical transaction.
- **Bhatkal:** Krishnadevaraya permitted Portuguese fort construction — direct UPSC 2024 hook.
- **Introductions/agricultural exchange:** Portuguese associated with introduction/spread in India of **tobacco, cashew**, and New World fruits/crops; UPSC 2025 specifically confirms **papaya + pineapple + guava** were introduced by Portuguese in 16th–17th centuries. Red chilli also reached India through Portuguese-era Columbian exchange; do not attribute to English.
- Decline factors: Dutch/English competition; Portuguese religious intolerance/piracy reputation; union with Spain (1580); declining commercial focus; loss of Mughal favour; Maratha pressure incl. Bassein/Salsette (1739).

##### 3) Dutch / Danish / French factories

| Power | High-yield centres | Distinctive fact |
|---|---|---|
| **Dutch** | Masulipatnam 1605; Pulicat 1609; Surat 1616; Chinsurah; Kasimbazar; Balasore; Patna; Nagapattinam; Cochin | Main interest Indonesia/spice trade; Battle of Hooghly/Bedara 1759 checked Dutch political ambitions |
| **Danish** | Tranquebar 1620; Serampore principal Bengal settlement | More remembered for missionary/printing activity; sold Indian settlements to British in 1845 |
| **French** | Surat 1667; Masulipatnam 1669; **Chandernagore permission 1673**; **Pondicherry founded 1674**; later Mahe/Karaikal | François Martin developed Pondicherry; Dupleix = political expansion phase |

##### 4) English factory/grant chronology — high elimination value

- **1609–11:** Hawkins at Jahangir’s court; failed to secure Surat factory against Portuguese opposition.
- **1611:** English trading at Masulipatnam; **factory there 1616**.
- **1612:** Thomas Best defeats Portuguese off Surat → **1613 permanent Surat factory** under Thomas Aldworth.
- **1615–19:** Sir Thomas Roe at Jahangir’s court; privileges/factory permissions incl. **Agra, Ahmedabad, Broach**.
- **1632:** Golconda **Golden Farman** facilitates free trade for annual payment.
- **1639:** Francis Day obtained Madras site from representative of **Chandragiri/Vijayanagara** → Fort St George; Madras became southern base.
- **1651:** Shah Shuja allowed English trade in Bengal for annual payment; Hooghly factory and network (Kasimbazar/Patna/Rajmahal).
- **1662:** Bombay passed to Charles II as Portuguese dowry; **1668** transferred to EIC; **1687** Western Presidency HQ shifted Surat → Bombay.
- **1698:** Company acquired zamindari of Sutanuti, Gobindapur, Kalikata; Fort William/Calcutta developed.
- **1715 mission led by John Surman; 1717 Farrukhsiyar farmans** (“Magna Carta” of Company): customs/trade privileges, dastaks and land/rent concessions; keep mission date separate from farman date.
- UPSC 2021 first-quarter 17th-century factory trap: **Broach** yes; Chicacole/Trichinopoly no in that grouping.

##### 5) Carnatic wars — English–French struggle

| War | Trigger/context | Decisive items | End |
|---|---|---|---|
| **First Carnatic War, 1746–48** | Austrian Succession War spills into India | French capture Madras; Nawab’s force defeated at St Thomé/Adyar | **Treaty of Aix-la-Chapelle 1748** → Madras restored to English |
| **Second, 1749–54** | Hyderabad + Carnatic succession disputes | Dupleix-backed candidates vs English-backed; Clive’s Arcot exploit | **Treaty of Pondicherry 1754**; Dupleix recalled |
| **Third, 1758–63** | Seven Years’ War | **Wandiwash 1760:** Eyre Coote defeats Lally | **Treaty of Paris 1763**; French factories restored but political ambitions sharply constrained |

##### 6) British expansion — core battles/policies

- **Bengal:** Plassey 1757 → Company political leverage; Buxar 1764 against Mir Qasim–Shuja-ud-Daula–Shah Alam II; Treaty of Allahabad 1765 → Diwani of Bengal/Bihar/Orissa and enlarged political/fiscal control.
- **Successor states:** Mughal successor states retained nominal imperial links — **Bengal (Murshid Quli Khan), Awadh (Saadat Khan), Hyderabad (Nizam-ul-Mulk/Chin Qilich Khan)**; distinguish from rebellious/autonomous powers such as Marathas/Mysore/Sikh polity.
- **Mysore:**
  - I Anglo-Mysore 1767–69 → **Treaty of Madras (1769)**.
  - II 1780–84 → **Treaty of Mangalore (1784)**.
  - III 1790–92 → **Treaty of Seringapatam (1792)**; Tipu ceded territory/indemnity.
  - IV 1799 → Tipu killed; Mysore reduced/restructured under British dominance.
- **Marathas:**
  - I 1775–82 → **Treaty of Salbai (1782)**.
  - **Treaty of Bassein 1802** with Peshwa Baji Rao II = Subsidiary Alliance; precipitated II Anglo-Maratha War 1803–05.
  - III 1817–18/19 → Peshwaship abolished; paramountcy established over most Maratha power.
- **Nepal:** Anglo-Nepal War 1814–16 → **Treaty of Sugauli (1816)**; Company gained Kumaon/Garhwal and strategic Himalayan territories; UPPCS asks specific sites.
- **Sikhs:** I Anglo-Sikh 1845–46 → Treaty of Lahore + Bhairowal arrangements; II 1848–49 → Punjab annexed 1849.

#### E. Tribal & Peasant Uprisings

##### 1) Common-cause framework for tribal resistance

- Destruction/erosion of **customary collective land and forest rights** by colonial property/revenue systems.
- Penetration of **dikus**: moneylenders, traders, revenue farmers, zamindars, officials and contractors.
- Debt, land alienation, forced labour and new taxes.
- Forest reservation/restrictions on shifting cultivation, grazing, timber and traditional resource use.
- Missionary/cultural interference mattered in some areas but was **not the universal common denominator**.
- UPSC’s broad answer: **disruption of the old agrarian/social order** is the common factor; individual revolts had distinct triggers.

##### 2) Tribal/civil uprisings — compact chronology

| Movement | Date/region | Leader(s) / cause | Result / trap |
|---|---|---|---|
| **Sanyasi–Fakir** | c. 1760s–1800, Bengal | revenue/famine-era disruption; ascetic/fakir networks | earlier than 19c agrarian revolts |
| **Paika Rebellion** | **1817, Odisha** | **Bakshi Jagabandhu**; dispossession/revenue/admin grievances | UPPCS leader matching |
| **Bhil uprisings** | esp. 1818–31, Khandesh/west | British occupation, outsiders, administrative intrusion | Maharashtra/western tribal context |
| **Ahom revolt** | **1828–33, Assam** | Gomdhar Konwar; British failure to restore Ahom rule after Burmese war | UPPCS sometimes dates 1828; not 1815 |
| **Khasi uprising** | **1829–33** | **Tirot Singh**; road/territorial intrusion connecting Brahmaputra valley–Sylhet | NE frontier pattern |
| **Kol uprising** | **1831–32, Chotanagpur** | land alienation, outsiders/moneylenders | pre-Santhal |
| **Santhal Hul** | **1855–56**, Rajmahal/Damin-i-koh | **Sidhu, Kanhu** (with Chand/Bhairav); moneylenders, zamindars, officials, land alienation | aftermath: **Santhal Parganas**; restrictions on land transfer to non-Santhals |
| **Munda Ulgulan** | **1899–1900**, Chotanagpur | **Birsa Munda**; erosion of khuntkatti rights, dikus, forest/agrarian oppression, religious-political mobilisation | Ulgulan = “Great Tumult”; later tenancy protection incl. Chotanagpur Tenancy Act 1908 context |
| **Bastar rebellion** | **1910** | forest reservation, forced labour/levies, customary-right intrusion | central India forest revolt |
| **Tana Bhagat** | **1914 onward, Chotanagpur** | **Jatra Oraon (Jatra Bhagat)**; mainly Oraon religious/social reform evolving into anti-colonial mobilisation | not simply “Munda + Oraon” movement |
| **Rampa/Gudem** | major phases incl. 1879–80 and **1922–24**, Andhra hills | later phase led by **Alluri Sitarama Raju**; forest restrictions, forced labour/admin intrusion | do not conflate all Rampa phases into one date |

##### 3) Peasant movements — exact demand matrix

| Movement | Date/region | Core demand/trigger | Outcome/association |
|---|---|---|---|
| **Indigo Revolt** | **1859–60, Bengal** | coercive indigo cultivation, planter terms | Digambar Biswas, Bishnu Biswas; Indigo Commission 1860; planters’ coercive system weakened |
| **Pabna Agrarian unrest** | **1873–85, East Bengal** | illegal rent enhancement, eviction, occupancy-right disputes | legal/rent-strike methods; tenancy-reform pressure; Bengal Tenancy Act 1885 context |
| **Deccan Riots** | **1875, Maharashtra** | debt/moneylender oppression after revenue/price shocks | attacks on debt bonds; Deccan Agriculturists Relief Act 1879 |
| **Champaran** | **1917, Bihar** | indigo **tinkathia** system | Gandhi’s first major Indian satyagraha; linked peasant unrest to national movement |
| **Kheda** | **1918, Gujarat** | remission/suspension of land revenue after crop failure | revenue relief issue; **not** Permanent Settlement |
| **UP Kisan Sabha** | **1918** | high rents, bedakhali, taluqdari exactions | Gauri Shankar Mishra, Indra Narayan Dwivedi; later Baba Ramchandra/Jawaharlal Nehru connected to Awadh mobilisation |
| **Eka Movement** | **1921–22**, Hardoi/Sitapur/Barabanki belt | excessive rents, thekedari exactions, forced labour; pledge to pay recorded rent | grassroots leadership incl. **Madari Pasi**; UPSC contrasts with Bardoli |
| **Mappila/Moplah** | **1921, Malabar** | tenancy/jenmi oppression intertwined with Khilafat/NCM and later communal violence | do not reduce to a single religious or agrarian cause |
| **Bardoli** | **1928, Gujarat** | protest against **enhanced land revenue assessment** | Vallabhbhai Patel; assessment reduced/reviewed |
| **All India Kisan Sabha** | **1936** | nationwide peasant organisation | first president **Swami Sahajanand Saraswati** |
| **Tebhaga** | **1946–47, Bengal** | bargadars demanded **two-thirds produce**, landlord share reduced from 1/2 to **1/3** | Kisan Sabha/Communist influence; exact fraction = recurring UPSC anchor |

##### 4) Revolt of 1857 — UPPCS extension only

**Immediate spark + structural causes**
- Enfield cartridge controversy = immediate sepoy spark; deeper grievances: annexations/Doctrine of Lapse and Awadh annexation; taluqdari/agrarian disruption; sepoy pay/service/status issues; administrative and cultural-religious anxieties; dispossessed rulers/landed interests.
- **29 Mar 1857 Barrackpore:** Mangal Pandey episode; **10 May 1857 Meerut:** major outbreak → Delhi.

**Centres/leaders**

| Centre | Leader(s) |
|---|---|
| Delhi | Bahadur Shah II symbolic emperor; military leadership notably **Bakht Khan** |
| Kanpur | **Nana Saheb**, Tatya Tope; Azimullah Khan associated |
| Lucknow/Awadh | **Begum Hazrat Mahal**, Birjis Qadr; Maulvi Ahmadullah Shah active in Awadh/Faizabad |
| Bareilly | **Khan Bahadur Khan** |
| Jhansi | **Rani Lakshmibai** |
| Bihar/Jagdishpur | **Kunwar Singh** |
| Faizabad | **Maulvi Ahmadullah Shah** |

**Why it failed / consequences**
- Uneven geography; many rulers/groups stayed neutral or aided British; limited common political programme; weak coordination/supply and modern arms; leadership/local aims varied.
- Yet there was substantial Hindu–Muslim cooperation in several rebel centres; avoid the absolute claim of “complete” unity everywhere.
- **1858:** Company rule ended; Crown takeover; Queen’s Proclamation promised non-interference in religion and recognition of princes/territorial rights subject to paramountcy; army reorganised and divide-and-rule/social conservatism sharpened.

### 6. UPPCS Extension Layer

- **Governor-General/Viceroy associations:** Cornwallis → Permanent Settlement/Cornwallis Code; Bentinck → sati abolition/English-education turn; Wellesley → Subsidiary Alliance; Dalhousie → Doctrine of Lapse, rail/telegraph/post expansion; Canning → 1857/Crown transfer; Ripon → local self-government, Ilbert Bill; Curzon → 1904 Universities Act, Bengal partition 1905; Minto II → 1909 separate electorates; Chelmsford → 1919 reforms; Irwin → Simon-era/Gandhi-Irwin; Linlithgow → WWII/August Offer; Wavell → Wavell Plan/Simla; Mountbatten → transfer/partition.
- **Education chronology:** Wood 1854 → Hunter 1882 → Sadler 1917–19 → Hartog 1929 → Wardha 1937 → Sargent 1944.
- **Treaty spine:** Allahabad 1765 → Madras 1769 → Salbai 1782 → Mangalore 1784 → Seringapatam 1792 → Bassein 1802 → Sugauli 1816 → Lahore 1846.
- **War chronology:** 2nd Carnatic (1749–54) → 1st Anglo-Mysore (1767–69) → 1st Anglo-Maratha (1775–82) → 1st Anglo-Afghan (1839–42) → 1st Anglo-Sikh (1845–46).
- **UP-specific agrarian layer:** UP Kisan Sabha 1918; Awadh Kisan Sabha 1920; Eka 1921–22; 1857 centres Meerut–Delhi–Kanpur–Lucknow–Bareilly/Jhansi with exact leader matching.
- **Civil/tribal chronology frequently reusable:** Sanyasi/Fakir → Paika 1817 → Ahom/Khasi 1828–33 → Kol 1831–32 → Santhal 1855–56 → Indigo 1859–60 → Pabna 1873–85 → Deccan 1875 → Munda 1899–1900 → Tana Bhagat 1914 → Moplah 1921 → Rampa 1922–24 → Bardoli 1928 → Tebhaga 1946–47. **Kuka/Namdhari chronology trap:** origins lie in the mid-19th century, while the major 1872 clash/suppression is later; read the question’s dating convention before sequencing.

### 7. Cross-Topic / Cross-Subtopic Traps

- **1919 vs 1935:** provincial dyarchy = 1919; provincial autonomy + proposed central dyarchy = 1935. Central dyarchy under 1935 **never operated**.
- **1909 vs 1919:** separate Muslim electorates **introduced in 1909**; communal electorates **extended** in 1919.
- **Nehru Report vs Lahore 1929:** Nehru Report = Dominion status; Purna Swaraj adopted later.
- **Cripps vs Cabinet Mission:** Cripps allowed province opt-out after war; Cabinet Mission rejected sovereign Pakistan but created weak Union + province groups.
- **CA election:** provincial members **indirectly elected by provincial legislatures**, not direct adult franchise; princely representatives nominated.
- **1813 vs 1833 vs 1853:** Indian trade monopoly mostly ends 1813; Company commerce ends 1833; open competition begins 1853.
- **1833 vs 1853 ICS:** equality principle/eligibility language ≠ competitive exam mechanism.
- **Wood 1854 vs Universities 1857:** Despatch **recommended** universities; Acts/institutions followed in 1857.
- **High Courts:** Act 1861; presidency High Courts 1862. Do not write 1865.
- **Subsidiary Alliance vs Doctrine of Lapse:** Wellesley vs Dalhousie; **Awadh 1856 = misgovernment**, not lapse.
- **Brahmo vs Arya:** Brahmo rejected scriptural infallibility/idolatry; Arya treated Vedas as infallible and promoted “Back to Vedas.”
- **Theosophy:** Blavatsky + Olcott founders; Annie Besant later leader.
- **Justice Party vs Self-Respect:** Justice Party/South Indian Liberal Federation = 1916 non-Brahmin political representation; Self-Respect = Periyar, 1925, social-rationalist anti-caste movement.
- **Phule vs Walangkar:** Satyashodhak Samaj = Phule; Vital-Vidhvansak = Gopal Baba Walangkar.
- **Rakhmabai:** restitution of conjugal rights + age-of-consent debate; not “women’s right to education” as the central legal issue.
- **Portuguese chronology:** 1534 Bassein cession and Diu fortification/possession are related but not the same one-line treaty fact.
- **English factory chronology:** trade at Masulipatnam 1611; factory 1616; Surat victory 1612 → permanent factory 1613.
- **Farrukhsiyar:** Surman mission began 1715; famous farmans issued **1717**.
- **Tobacco/chilli/fruits:** Portuguese/Columbian exchange, not English introduction.
- **Santhal vs Munda:** Santhal 1855–56 → Parganas/land-transfer protection; Munda Ulgulan 1899–1900 → khuntkatti/diku/forest-land grievances.
- **Eka vs Bardoli vs Tebhaga:** Eka = excessive rent; Bardoli = land-revenue enhancement; Tebhaga = crop-share 1/2 → 1/3 for landlord.
- **Kheda vs Champaran:** Kheda = revenue remission after crop failure; Champaran = tinkathia indigo.
- **1857 boundary:** this topic retains UPPCS factual extension; mass-politics/nationalist interpretation belongs primarily to National Movement only where demanded.

### 8. Correction / Verification Register

#### CORRECT

1. **Vasco da Gama return voyage:** base “returned in 1501” → second major voyage was **1502**; do not retain 1501 wording.
2. **Nuno da Cunha:** standardise spelling; governor from 1529; HQ Cochin → Goa **1530**.
3. **Bassein/Diu:** base conflated “Treaty of Bassein 1534” with surrender of Diu. Correct: Bahadur Shah ceded **Bassein/dependencies in 1534**; Diu base/fortification followed in alliance context; later Portuguese control consolidated.
4. **English Masulipatnam/Surat:** separate trading presence (Masulipatnam 1611) from factory (1616); Surat naval victory 1612 → permanent factory 1613.
5. **Farrukhsiyar:** mission led by John Surman began 1715; famous trade farmans are **1717**.
6. **French chronology:** Surat 1667, Masulipatnam 1669, Chandernagore permission 1673, Pondicherry founded 1674; remove ambiguous base sequencing.
7. **Charter Act 1833 vs 1853:** 1833 equality/eligibility principle; **1853 competitive recruitment**. Base “Charter Act 1857” corrected to **1853**.
8. **Benares Sanskrit College:** for Sanskrit/Hindu learning, not “traditional Islamic education.”
9. **Wood’s Despatch:** recommended universities; presidency universities established **1857**. English was not prescribed as sole medium at every level.
10. **High Courts:** Indian High Courts Act **1861**; Calcutta/Bombay/Madras High Courts established **1862**, not 1865.
11. **Mahalwari:** Holt Mackenzie proposal/regulation **1822**; R.M. Bird’s 1830s revision/implementation. Remove base’s “UP 1819/Bird 1822” compression.
12. **Subsidiary Alliance:** Hyderabad under Wellesley **1798**; base’s 1789-style typo removed. Awadh 1856 not Doctrine of Lapse.
13. **Savitribai Phule:** first girls’ school at Bhide Wada, Pune (1848); not “girls college.”
14. **Rakhmabai:** no claim that Pandita Ramabai “led” the case; legal core = restitution of conjugal rights; broader child-marriage/age-of-consent debate.
15. **SNDP:** registered 1903 with Narayana Guru as permanent chairman, Kumaran Asan as secretary; Dr Palpu crucial organisational force. Avoid sole-founder oversimplification.
16. **Justice Party:** organisation = **South Indian Liberal Federation**, not “Liberation Federation.”
17. **Theosophical Society:** founders Blavatsky + Olcott, New York 1875; Annie Besant later leader.
18. **Tana Bhagat:** primarily an **Oraon** movement led by Jatra Bhagat; remove broad “Munda + Oraon” formulation.
19. **Rampa:** distinguish earlier Rampa revolts from **1922–24 Gudem/Rampa** phase under Alluri Sitarama Raju; base single-date chain was conflated.
20. **1857 communal wording:** replace “complete communal harmony” with evidence-safe “notable Hindu–Muslim cooperation in several rebel centres.”
21. **GoI 1935 operation:** federation and central dyarchy were only provided, **not brought into operation**; provincial autonomy operated from 1937.
22. **Constituent Assembly:** retain correct Drafting Committee membership from the detailed source text; ignore inconsistent summary-box variants in secondary material.

#### VERIFY

- **None blocking.** Minor micro-chronology beyond the PYQ-facing payload (e.g., every local factory’s exact opening year, every minor tribal phase) was intentionally omitted rather than carried as low-value uncertainty.
- **Malformed canonical records retained only for demand:** `UPSC-CSE-2024-GS1-Q062`; `UPSC-CSE-2018-GS1-Q076`; `UPPCS-2020-GS1-Q020`.

#### OMIT

- Current Constitution Day observance facts beyond durable CA date logic.
- Exhaustive lists of every European factory/trading post where no canonical/UPPCS elimination value is visible.
- Detailed National Movement narratives for Quit India, Civil Disobedience, Gandhi-Irwin, Poona Pact etc.; only facts directly needed for this topic’s constitutional/social/agricultural PYQs retained.
- Present-day constitutional provisions/mechanics except historical antecedent links.
- Over-detailed historiographical labels for 1857 and dynamic commemorative facts.
- Low-confidence coaching-book microfacts when base/Spectrum/canonical evidence did not require them.

### 9. Supplement Decision

`NO_SUPPLEMENT_NEEDED`

- Base notes are strong across all five children.
- Spectrum resolves substantive factual/chronological corrections and fills feature-level gaps.
- Ghatna Chakra is sufficient for UPPCS-heavy chronology/leader/treaty extension.
- No current statutory fact or unresolved primary-source conflict materially blocks the pack; therefore no web/official supplement is required.

### 10. Synthesis Handoff

- **All child subtopics covered:** 5/5, each independently mined against taxonomy, canonical UPSC PYQs, canonical UPPCS PYQs, base notes and targeted references.
- **Unresolved VERIFY items:** none blocking; three malformed canonical PYQs are demand-only and must not be used as answer-key authority.
- **Corrections that must override older wording:** 22 items in the CORRECT register, especially 1919/1935 distinctions, 1833/1853 civil-service distinction, High Courts 1861/62, Wood 1854 vs universities 1857, Bassein/Diu, 1715/1717 Farrukhsiyar, Rakhmabai/SNDP/Justice Party, and Rampa/Tana-Bhagat corrections.
- **Material explicitly excluded:** present-day polity mechanics; dynamic Constitution Day hook; sibling National Movement narratives except direct demand bridges; exhaustive low-yield factory/revolt lists; current cultural/political trivia.
- **Downstream synthesis priority:** allocate most space to **constitutional development**, then **British administration/economy** and **reform/anti-caste**; retain **Europeans/expansion** as dense location–permission–treaty matrices; keep **uprisings** cause/demand/result-led with extra UPPCS chronology/1857 layer.

---

<!-- SOURCE PACK: INDIAN NATIONAL MOVEMENT | ORIGINAL FILE: PRE-HISTCULT__INDIAN-NATIONAL-MOVEMENT__SOURCE-PACK__v01(1).md -->
## HISTORY & CULTURE → Indian National Movement — Topic Source Pack v01

**Status:** PASS_WITH_CORRECTIONS  
**topic_taxonomy_id:** `prelims-history-and-culture-indian-national-movement`  
**Child subtopics covered:** 4/4  
**Canonical PYQ scope:** UPSC CSE Prelims GS-I 2011–2026 + UPPCS Prelims GS-I 2018–2025 only  
**Primary content layer:** `PRE__HIS__BASE__SELF__2026__History-Modern-India__v01.md`  
**Gap/correction references used:** Spectrum 2020; Ghatna Chakra 2026; narrowly targeted official verification where recorded below.

> **PYQ-count note:** counts below are semantic relevance counts, not mutually exclusive totals. A question testing two child nodes is retained under both when it creates distinct factual demand. Malformed/suspicious canonical records are counted only as demand evidence and are explicitly flagged.

### 1. Topic Scope

- **Includes:** stable preparation domain of the Indian National Movement from pre-Congress political associations and early nationalism through Gandhian mass politics, revolutionary/left/labour currents, and person–organisation–book/newspaper matching.
- **Owns:**
  - Gandhian Phase & Mass Movements.
  - Early Nationalism, INC & Swadeshi.
  - Nationalist Personalities, Organisations & Books.
  - Revolutionary, Leftist & Labour Movements.
- **UPSC depth:** causes/triggers + programme + leaders + chronology + outcomes; movement-specific exceptions; comparative statements; “significance” and elimination-heavy person/organisation/book matching.
- **UPPCS depth:** denser chronology; INC sessions/presidents; organisation founders; newspapers/editors/places; revolutionary micro-facts; trade-union chronology.
- **Excludes / cross-references:**
  - detailed constitutional proposals/Acts/Cripps/Cabinet Mission → **Colonial Rule & Social Change → Constitutional Development**;
  - peasant/tribal movements whose decisive knowledge is agrarian rather than nationalist strategy → **Tribal & Peasant Uprisings**;
  - INA trials, RIN mutiny, Cabinet Mission, Interim Government, transfer of power → **Independence, Partition & Post-Independence Transition**;
  - time-bound anniversary hooks such as present-day Handloom Day observance → omit; retain only durable historical anchor.

### 2. Child-Subtopic Coverage Ledger

| Child subtopic | taxonomy_id | UPSC PYQs | UPPCS PYQs | Base coverage | Status |
|---|---|---:|---:|---|---|
| Gandhian Phase & Mass Movements | `prelims-history-and-culture-indian-national-movement-gandhian-phase-and-mass-movements` | 22 | 12 | Strong; several date/number corrections | PASS_WITH_CORRECTIONS |
| Early Nationalism, INC & Swadeshi | `prelims-history-and-culture-indian-national-movement-early-nationalism-inc-and-swadeshi` | 14 | 4 | Strong; association chronology + Swadeshi corrections required | PASS_WITH_CORRECTIONS |
| Nationalist Personalities, Organisations & Books | `prelims-history-and-culture-indian-national-movement-nationalist-personalities-organisations-and-books` | 10 | 4 | Partial–Strong; newspapers/books needed supplementation | PASS_WITH_CORRECTIONS |
| Revolutionary, Leftist & Labour Movements | `prelims-history-and-culture-indian-national-movement-revolutionary-leftist-and-labour-movements` | 8 | 10 | Strong on revolutionaries; partial on labour/left detail | PASS_WITH_CORRECTIONS |

### 3. PYQ Demand Map

#### A. Gandhian Phase & Mass Movements

##### UPSC

**Early Gandhian experiments / transition to mass politics**
- `UPSC-CSE-2011-GS1-Q060` → Kheda: trigger = crop failure / demand for revenue remission; movement-specific cause, not generic anti-British agitation.
- `UPSC-CSE-2018-GS1-Q069` → Champaran significance: ability to connect local peasant grievance with wider national politics; beware overbroad “all-India participation” claims.
- `UPSC-CSE-2015-GS1-Q016` → Rowlatt Satyagraha: Rowlatt/Sedition Committee background + Home Rule organisational network.
- `UPSC-CSE-2012-GS1-Q070` → Rowlatt Act: extraordinary coercive powers, detention/trial safeguards curtailed.

**Non-Cooperation / programme detail**
- `UPSC-CSE-2025-GS1-Q012` → programme discrimination: boycott of law courts/foreign cloth + strict non-violence + panchayats; retention of titles is false.
- `UPSC-CSE-2025-GS1-Q020` → Congress objective/programme: Swaraj through legitimate/peaceful means; phased non-cooperation.
- `UPSC-CSE-2025-GS1-Q073` → Chauri Chaura aftermath: legal defence association with Madan Mohan Malaviya and Krishna Kant.
- `UPSC-CSE-2019-GS1-Q014` → Gandhi chronology/actions: indentured-labour campaign; Salt Satyagraha and illegality of Congress organisations.

**Lahore → CDM → pact → RTC**
- `UPSC-CSE-2012-GS1-Q071`, `UPSC-CSE-2014-GS1-Q082` → Lahore 1929 = Purna Swaraj / complete independence as Congress goal.
- `UPSC-CSE-2015-GS1-Q046` → C. Rajagopalachari’s salt march: Trichinopoly/Tiruchirappalli → Vedaranyam on Tanjore coast.
- `UPSC-CSE-2025-GS1-Q071` → Gandhi’s “sedition” remark tied to public breach of the salt law at Dandi.
- `UPSC-CSE-2017-GS1-Q093` → sequence discipline: Second RTC before Quit India; later RIN belongs to transition topic.

**Communal Award / Poona / anti-untouchability turn**
- `UPSC-CSE-2012-GS1-Q036` → Gandhi’s 1932 fast = opposition to separate electorate for Depressed Classes under Communal Award.
- `UPSC-CSE-2019-GS1-Q006` → All India Anti-Untouchability League connected with Gandhi; retain as post-Poona institutional consequence.
- `UPSC-CSE-2025-GS1-Q074` → immediate post-Poona Gandhi focus on Harijan/anti-untouchability work.

**Quit India**
- `UPSC-CSE-2011-GS1-Q054` → nuanced nature: mass spontaneity after arrest of top leadership; do not describe the entire movement simplistically as centrally directed non-violence.
- `UPSC-CSE-2011-GS1-Q068` → Usha Mehta = underground Congress Radio.
- `UPSC-CSE-2013-GS1-Q040` → immediate political background = failure of Cripps Mission.
- `UPSC-CSE-2021-GS1-Q043` → AICC, Bombay, 8 August 1942 = Quit India resolution.

**Context/chronology support**
- `UPSC-CSE-2012-GS1-Q025` → Congress ministries resigned in 1939 after India’s unilateral entry into WWII.
- `UPSC-CSE-2013-GS1-Q039` → Simon Commission = no Indian member; important inter-movement chronology.

##### UPPCS

- `UPPCS-2019-GS1-Q020` → Ferozeshah Mehta death → Jallianwala → Simon → Dandi chronology.
- `UPPCS-2019-GS1-Q094` → CDM → Gandhi-Irwin → Poona → Cripps chronology.
- `UPPCS-2020-GS1-Q024` → Rajendra Prasad did **not** participate in Second RTC.
- `UPPCS-2021-GS1-Q037` → Simon 1927 → Nehru Report 1928 → Sharda Act 1929 → Dandi 1930.
- `UPPCS-2021-GS1-Q042` → Webb Miller associated with reporting Dharasana Salt Works repression.
- `UPPCS-2021-GS1-Q069` → Vaikom Satyagraha = anti-untouchability/caste-access struggle; Gandhi associated, but keep detailed Kerala reform material in sibling reform topic if required.
- `UPPCS-2023-GS1-Q047` → relative chronology: Home Rule / Jallianwala / Khilafat / Moplah; latest among listed = Moplah phase.
- `UPPCS-2023-GS1-Q048` → Quit India women: Matangini Hazra, Aruna Asaf Ali, Kanaklata Barua; **Shanti Ghosh is not a QIM actor**.
- `UPPCS-2024-GS1-Q133` → ministries resign 1939 → Ramgarh 1940 → August Offer 1940 → Cripps 1942.
- `UPPCS-2025-GS1-Q007` → Gandhi-Irwin → Second RTC → Poona → final withdrawal of CDM.
- `UPPCS-2025-GS1-Q135` → C. Sankaran Nair resigned from Viceroy’s Executive Council after Punjab/Jallianwala crisis. **Canonical answer mapping is corrupted; factual answer independently resolved.**
- `UPPCS-2019-GS1-Q019` → event-year table. **EDITABLE_REVIEW / TABLE_STRUCTURE_UNCLEAR**; demand only. Reliable chronology: Indian Navy Act 1927; CDM 1930; Second RTC 1931; Communal Award 1932.

##### Demand synthesis

- Highest-return structure = **chronology + programme + named local variant + consequence**.
- Repeated elimination pattern: one statement shifts an event by one year, attributes a later response to an earlier movement, or swaps a regional leader/location.
- QIM demand is not only date/slogan: underground organisation, women, parallel governments, spontaneity after leadership arrest.
- 1930–34 cluster requires **Gandhi-Irwin terms, RTC participation, Communal Award vs Poona Pact, exact order**.

#### B. Early Nationalism, INC & Swadeshi

##### UPSC

- `UPSC-CSE-2012-GS1-Q028` → National Social Conference kept separate from Congress so contentious social reform would not fracture the political platform.
- `UPSC-CSE-2012-GS1-Q066` → Dadabhai Naoroji’s central contribution = economic critique/drain of wealth.
- `UPSC-CSE-2013-GS1-Q080` → Annie Besant: Home Rule + INC president; **not** founder of Theosophical Society.
- `UPSC-CSE-2014-GS1-Q081` → Bengal partition annulled in 1911; Delhi Durbar context.
- `UPSC-CSE-2015-GS1-Q020` → Naoroji, G. Subramania Iyer, R.C. Dutt as economic critics of colonial rule.
- `UPSC-CSE-2015-GS1-Q048` → Congress-president firsts: Annie Besant first woman; Sarojini Naidu first Indian woman; Badruddin Tyabji first Muslim president.
- `UPSC-CSE-2015-GS1-Q068` → Swadeshi–Boycott agitation sharpened Moderate–Extremist split.
- `UPSC-CSE-2016-GS1-Q049` → Swadeshi/Boycott began as anti-partition response in Bengal.
- `UPSC-CSE-2016-GS1-Q092` → Surat split: strategic disagreement over Moderate constitutional negotiation vs wider militant/passive-resistance programme.
- `UPSC-CSE-2017-GS1-Q037` → association-founder/first-president elimination: Radhakanta Deb–British Indian Association true; Surendranath Banerjea–Indian Association true; Gazulu Lakshminarasu Chetty–Madras Mahajana Sabha founder claim false.
- `UPSC-CSE-2018-GS1-Q079` → All India Home Rule League → renamed **Swarajya Sabha** under Gandhi in 1920.
- `UPSC-CSE-2019-GS1-Q005` → Swadeshi promoted indigenous enterprise/crafts + national education.
- `UPSC-CSE-2020-GS1-Q026` → `Desher Katha` by Sakharam Ganesh Deuskar: critique of colonial domination; influence on Swadeshi milieu; avoid “desh meant Bengal alone”.
- `UPSC-CSE-2023-GS1-Q083` → 7 August as historical Swadeshi launch/boycott anchor; present-day Handloom Day is a current hook and excluded from permanent payload.

##### UPPCS

- `UPPCS-2018-GS1-Q024` → Dufferin and early official characterisation of Congress (“microscopic minority”).
- `UPPCS-2021-GS1-Q150` → Tilak never presided over an INC session.
- `UPPCS-2024-GS1-Q015` → chronology: East India Association 1866 → National Indian Association 1870/71 → Indian Society 1872 → Indian Association 1876.
- `UPPCS-2025-GS1-Q006` → 1911: annulment of Bengal partition + imperial capital shifted Calcutta → Delhi.

##### Demand synthesis

- Must know **association → year → place → founder/first president**, not merely names.
- Swadeshi is tested as a **political + educational + economic + cultural** movement.
- INC session questions are selective: 1905–07, 1916–17, 1920s, 1929, 1931, 1938–40 have much higher elimination value than exhaustive session lists.
- Home Rule is frequently confused with Swadeshi and Gandhian mass politics; retain separate organisations, areas and dates.

#### C. Nationalist Personalities, Organisations & Books

##### UPSC

- `UPSC-CSE-2011-GS1-Q067` → Gandhi’s intellectual influence: Ruskin’s `Unto This Last`.
- `UPSC-CSE-2012-GS1-Q066` → Dadabhai Naoroji = drain/economic nationalism.
- `UPSC-CSE-2013-GS1-Q080` → Annie Besant = Home Rule + INC presidency; Theosophical founder trap.
- `UPSC-CSE-2015-GS1-Q020` → economic-nationalist trio identification.
- `UPSC-CSE-2015-GS1-Q048` → president “firsts”.
- `UPSC-CSE-2018-GS1-Q011` → descriptive biography resolves to **Lala Lajpat Rai**.
- `UPSC-CSE-2019-GS1-Q015` → Tej Bahadur Sapru—All India Liberal Federation; K.C. Neogy—Constituent Assembly; P.C. Joshi—CPI general secretary.
- `UPSC-CSE-2020-GS1-Q026` → `Desher Katha`—S.G. Deuskar.
- `UPSC-CSE-2021-GS1-Q036` → Madanapalle: Tagore rendered the national anthem into English there.
- `UPSC-CSE-2021-GS1-Q044` → `Songs from Prison`—M.K. Gandhi.

##### UPPCS

- `UPPCS-2020-GS1-Q026` → book-author matching: `The Story of My Deportation`—Lajpat Rai; `Gita Rahasya`—Tilak; `A Nation in Making`—Surendranath Banerjea; `India Wins Freedom`—Abul Kalam Azad.
- `UPPCS-2021-GS1-Q150` → INC presidents / Tilak trap.
- `UPPCS-2022-GS1-Q125` → newspaper-place matching. **Canonical structured option mapping is corrupted; source reconstruction gives:** Swadesh—Gorakhpur; Bharat Bandhu—Hathras; Satyawadi—Agra; Shakti—Almora.
- `UPPCS-2024-GS1-Q015` → early associations and founders/chronology.

##### Demand synthesis

- Dominant form = **person ↔ institution ↔ newspaper/book ↔ office/session**.
- UPSC often uses biography-description and multi-pair statements; UPPCS adds editor/publication-place micro-recall.
- Build facts around identity bundles rather than isolated names.

#### D. Revolutionary, Leftist & Labour Movements

##### UPSC

- `UPSC-CSE-2014-GS1-Q086` → Ghadar = revolutionary association of Indians abroad; headquarters/organisational base in San Francisco.
- `UPSC-CSE-2015-GS1-Q026` → Congress Socialist Party: reject communist-dictatorship/separate-electorate caricatures; remained a socialist caucus inside Congress.
- `UPSC-CSE-2017-GS1-Q015` → Trade Disputes Act 1929 = adjudicatory/conciliation machinery + restrictions on strikes.
- `UPSC-CSE-2017-GS1-Q024` → Factories Act 1881 did **not** fix wages or permit trade-union formation; N.M. Lokhande associated with early labour organisation.
- `UPSC-CSE-2018-GS1-Q070` → Hind Mazdoor Sabha founders: Ashok Mehta, T.S. Ramanujam, G.G. Mehta.
- `UPSC-CSE-2019-GS1-Q015` → P.C. Joshi = CPI general secretary.
- `UPSC-CSE-2022-GS1-Q053` → of listed revolutionaries, Rash Behari Bose had Ghadar association; Barindra Ghosh/Jogesh Chandra Chatterjee belong other revolutionary streams.
- `UPSC-CSE-2026-GS1-Q006` → Forward Bloc context: Bose lacked Gandhi’s confidence; Congress Left was fragmented; Royists/socialists prioritised Congress unity; blanket claim that communists did not support Bose is unsafe/false in the question’s framing.

##### UPPCS

- `UPPCS-2018-GS1-Q120` → Abhinav Bharat associated with V.D. Savarkar.
- `UPPCS-2020-GS1-Q016` → **answer-integrity problem:** canonical record encodes option A (“V.P. Wadia”), but Ghatna Chakra reconstructs the printed option as **B.P. Wadia** and gives **N.M. Joshi** as the labour representative at the first ILO Conference, Washington 1919; B.P. Wadia accompanied him as adviser. Independent ILO archival material supports **N.M. Joshi**. Use the factual correction, not the canonical option key.
- `UPPCS-2021-GS1-Q094` → Ram Prasad Bismil durable anchor = Shahjahanpur + HRA/Kakori; omit anniversary framing.
- `UPPCS-2021-GS1-Q104` → Naujawan Bharat Sabha early membership: Bhagat Singh, Yashpal, Chhabil Das; **Ambika Chakravarti not in that set**.
- `UPPCS-2022-GS1-Q060` → chronology: Ghadar → Berlin/Indian Independence Committee → Central Legislative Assembly bombing → Chittagong Armoury Raid.
- `UPPCS-2022-GS1-Q070` → **suspicious question**: “Hindustan Socialist Democratic Union” is not the standard historically attested name; source commentary itself treats the item as defective. Use only as demand for HRA/HSRA founders; do not memorise canonical answer.
- `UPPCS-2022-GS1-Q144` → **EDITABLE_REVIEW / malformed matching table** on trade-union party affiliations; demand only, exact answer not trusted.
- `UPPCS-2023-GS1-Q042` → Hardinge bombing organisation-level attribution is coarse; retain event-level facts: Delhi conspiracy, Rash Behari Bose, Basanta Kumar Biswas, 23 Dec 1912.
- `UPPCS-2024-GS1-Q014` → Workers and Peasants Party: “all-India organisation in 1927” false; objective of working within Congress to radicalise/mass-base it true.
- `UPPCS-2024-GS1-Q131` → CSP: not “January 1934”; Nehru sympathised but did **not formally join**.

##### Demand synthesis

- Revolutionary questions test **organisation ↔ founder ↔ place ↔ event ↔ year**, with near-identical names as traps (HRA/HSRA, Anushilan/Jugantar, Ghadar/India House).
- Left questions test organisational positioning inside/outside Congress and exact dates of formation.
- Labour questions are legislation-heavy: what an Act **actually provided**, plus union founder/first-president matching.

#### Cross-topic canonical PYQs screened but deliberately not counted in the child totals

- `UPSC-CSE-2011-GS1-Q070` — Nehru Report recommendations → decisive payload belongs **Constitutional Development**; only its 1928 chronology is retained here.
- `UPSC-CSE-2021-GS1-Q047` — Shah Nawaz Khan / P.K. Sehgal / G.S. Dhillon → **INA trials / Independence transition**.
- `UPSC-CSE-2026-GS1-Q019` — Eka vs Bardoli → decisive agrarian payload belongs **Tribal & Peasant Uprisings**.
- `UPPCS-2019-GS1-Q096` — C.R. Formula, 1944 → post-QIM constitutional/partition negotiation; belongs **Independence, Partition & Post-Independence Transition**.
- Detailed Cripps/Cabinet Mission questions were similarly screened and retained only where they establish the trigger/chronology of Quit India.

### 4. Base-Note Coverage

#### Gandhian Phase & Mass Movements

- **Strong:** Champaran–Ahmedabad–Kheda; Rowlatt/Jallianwala; NCM; Lahore/Purna Swaraj; CDM; Gandhi-Irwin; RTCs; Communal Award/Poona; QIM chronology, underground network and parallel governments.
- **Partial:** exact UPPCS legal-defence/person micro-facts; Sankaran Nair; Webb Miller; QIM women discrimination.
- **Missing → filled:** explicit UPSC-2025 NCM programme trap; official Poona seat total; UPPCS chronology clusters.
- **Outdated/suspect → corrected:** Gandhi arrest date after NCM; Poona Pact seat total; one of Gandhi’s 1930 demands mislabeled in base notes; Tagore/knighthood placement where cross-mentioned.

#### Early Nationalism, INC & Swadeshi

- **Strong:** pre-Congress bodies; INC foundation; Moderate/Extremist contrast; Bengal partition; Swadeshi programme; Banaras–Calcutta–Surat; Home Rule.
- **Partial:** association first-presidents; National Indian Association / Indian Society chronology; exact Surat strategic distinction.
- **Missing → filled:** 1866→1876 association chronology demanded by UPPCS; National Social Conference rationale; first-president traps; `Desher Katha` PYQ framing.
- **Outdated/suspect → corrected:** East India Association year; name of V.O.C. shipping enterprise; Tagore knighthood wrongly attached to Swadeshi context.

#### Nationalist Personalities, Organisations & Books

- **Strong:** major nationalists, INC presidents, prominent newspapers, economic critics.
- **Partial:** books and lesser newspapers; publication places; colonial-era institutional descriptors.
- **Missing → filled:** `Songs from Prison`; `A Nation in Making`; `The Story of My Deportation`; Madanapalle national-anthem fact; selected newspaper-place pairs.
- **Outdated/suspect → corrected:** `Sudharak` attribution; malformed canonical newspaper-place option mapping.

#### Revolutionary, Leftist & Labour Movements

- **Strong:** Bengal/Maharashtra/North Indian revolutionary strands; Ghadar; HRA/HSRA; Chittagong; basic communist/trade-union timeline.
- **Partial:** CSP/WPP precision; labour statutes; HMS founders; Forward Bloc PYQ logic.
- **Missing → filled:** Trade Disputes Act 1929 exact demand; Factories Act trap; HMS founders; WPP/CSP date-position distinctions.
- **Outdated/suspect → corrected:** Pritilata chronology; defective “Hindustan Socialist Democratic Union” item quarantined; malformed union-affiliation table not trusted.

### 5. Core Fact Payload

#### A. Gandhian Phase & Mass Movements

##### A1. High-yield master chronology

| Year | Event | Minimum recall anchor |
|---|---|---|
| **1917** | Champaran Satyagraha | indigo `tinkathia`; Raj Kumar Shukla; inquiry → relief/abolition trajectory |
| **1918** | Ahmedabad Mill Strike | plague bonus/wage dispute; Anasuya Sarabhai; Gandhi fast; arbitration |
| **1918** | Kheda Satyagraha | crop failure; revenue remission; Vallabhbhai Patel; no-revenue campaign |
| **1919** | Rowlatt Satyagraha | extraordinary anti-sedition powers; first major all-India Gandhian agitation |
| **13 Apr 1919** | Jallianwala Bagh | Amritsar; Reginald Dyer; Punjab repression |
| **1919–20** | Khilafat mobilisation | Ali brothers, Azad, Ajmal Khan etc.; Gandhi seeks Hindu-Muslim united action |
| **1920–22** | Non-Cooperation | Calcutta special → Nagpur ratification/reorganisation; Chauri Chaura → withdrawal |
| **1927–28** | Simon Commission boycott | all-British commission; links to Nehru Report and constitutional debate |
| **Dec 1929** | Lahore INC | Jawaharlal Nehru; Purna Swaraj; 26 Jan 1930 Independence Day |
| **12 Mar–6 Apr 1930** | Dandi March | Sabarmati → Dandi; 78 chosen marchers; salt law broken 6 Apr |
| **1930–31** | Civil Disobedience I | salt → tax/forest/picketing/parallel regional forms |
| **5 Mar 1931** | Gandhi-Irwin Pact | CDM suspended; Congress to attend Second RTC; limited concessions |
| **Sep–Dec 1931** | Second RTC | Gandhi = sole Congress representative |
| **16 Aug 1932** | Communal Award | Ramsay MacDonald; separate electorate for Depressed Classes among provisions |
| **24 Sep 1932** | Poona Pact | joint electorate + reserved seats; Ambedkar/Malaviya settlement |
| **1934** | CDM withdrawn | final withdrawal; Congress strategic shift |
| **1939** | Congress ministries resign | protest over unilateral association of India with WWII |
| **1940** | Ramgarh / August Offer / Individual Satyagraha | wartime constitutional deadlock; Vinoba Bhave first Individual Satyagrahi |
| **Mar–Apr 1942** | Cripps Mission | failure supplies immediate political trigger for QIM |
| **8 Aug 1942** | Quit India resolution | AICC Bombay; Gandhi: “Do or Die”; mass arrests from 9 Aug |

##### A2. Gandhi’s first three Indian satyagrahas

| Movement | Trigger / constituency | Key people | Method | Outcome / PYQ significance |
|---|---|---|---|---|
| **Champaran, 1917** | indigo planters; `tinkathia` = indigo on 3/20 of holding | Gandhi; Raj Kumar Shukla; Rajendra Prasad; J.B. Kripalani etc. | inquiry + civil resistance | inquiry committee; planter refund reduced to 25%; tinkathia abolished subsequently; local peasant grievance fused with national politics |
| **Ahmedabad, 1918** | mill workers vs owners over plague bonus/wages | Gandhi; Anasuya Sarabhai; Ambalal Sarabhai on mill-owner side | strike + Gandhi fast | arbitration; workers obtained **35%** wage rise |
| **Kheda, 1918** | crop failure yet revenue demand | Gandhi; Vallabhbhai Patel; Indulal Yagnik; Narahari Parikh, Mohanlal Pandya etc. | revenue withholding | collection relaxed/suspended for affected cultivators; peasant organisation strengthened |

**Elimination:** Champaran = indigo; Ahmedabad = industrial labour/wages; Kheda = land revenue after crop failure.

##### A3. Rowlatt → Jallianwala

- **Rowlatt Committee:** chaired by Justice Sidney Rowlatt; examined revolutionary/seditious activity.
- **Anarchical and Revolutionary Crimes Act, 1919 / Rowlatt Act:** continuation of wartime-style coercive powers; detention/arrest and special trial safeguards curtailed.
- Gandhi organised **Satyagraha Sabha**; Home Rule networks aided mobilisation.
- **Jallianwala Bagh, Amritsar, 13 April 1919:** gathering followed Punjab repression/arrest of Saifuddin Kitchlew and Satyapal; Brig. Gen. Reginald Dyer ordered firing.
- **Aftermath anchors:**
  - Rabindranath Tagore renounced knighthood in protest.
  - **C. Sankaran Nair** resigned from Viceroy’s Executive Council amid the Punjab/Jallianwala crisis.
  - Do not place Tagore’s renunciation in the 1905 Swadeshi phase.

##### A4. Khilafat + Non-Cooperation (1920–22)

**Khilafat core**
- Ottoman Caliphate/Turkey settlement after WWI drove Indian Muslim mobilisation.
- Leaders: **Mohammad Ali, Shaukat Ali, Maulana Abul Kalam Azad, Hakim Ajmal Khan, Hasrat Mohani**; Gandhi supported alliance with anti-colonial struggle.

**Congress adoption / sessions**
- **Calcutta Special Session, Sept 1920:** Lala Lajpat Rai presided; non-cooperation approved in principle.
- **Nagpur, Dec 1920:** C. Vijayaraghavachariar; programme ratified; Congress organisation widened/restructured for mass politics.

**Programme — retain exact items**
- surrender/renunciation of titles and honours;
- boycott of government schools/colleges; establishment/support of national education;
- boycott of law courts by lawyers/litigants; encourage **panchayats**;
- boycott foreign cloth; khadi/charkha and indigenous production;
- boycott elections/councils in the initial programme;
- strict non-violence; phased escalation if required;
- aim: **Swaraj through legitimate/peaceful means**.

**End**
- **Chauri Chaura, 5 Feb 1922:** violent killing of policemen after confrontation.
- Gandhi pressed suspension; CWC/Bardoli decision ended mass civil-disobedience escalation.
- **Madan Mohan Malaviya + Krishna Kant** associated with legal defence of accused (UPSC 2025 demand).
- **CORRECTION:** Gandhi was arrested in **March 1922**, not on 12 February; 12 February relates to withdrawal/suspension decision sequence, not his arrest.

##### A5. Lahore 1929 → Civil Disobedience

**Lahore Congress, Dec 1929**
- President: **Jawaharlal Nehru**.
- Goal: **Purna Swaraj / complete independence**.
- **26 January 1930** observed as Independence Day.

**Gandhi’s 11 demands — keep categories, not noisy prose**
- reduction in land revenue;
- abolition of salt tax/monopoly;
- reduction in military expenditure + high official salaries;
- prohibition;
- release of political prisoners;
- reform of CID;
- Arms Act changes for citizen licences;
- protective tariff on foreign cloth;
- **Coastal Traffic Reservation Bill / protection for Indian shipping**;
- rupee–sterling exchange-ratio correction.
- **Trap:** do not convert the shipping demand into a “postal reservation/cheap postage” demand.

**Dandi / national spread**
- March began **12 March 1930**, Sabarmati Ashram; salt law breached at Dandi **6 April 1930**.
- Gandhi’s “sedition has become my religion” PYQ hook attaches to deliberate salt-law violation.
- Movement widened to foreign-cloth/liquor picketing, tax refusal, forest-law breaches and local salt actions.

**Regional anchors**
- **C. Rajagopalachari:** Tiruchirappalli/Trichinopoly → **Vedaranyam** salt march, Tanjore coast.
- **K. Kelappan:** Malabar salt activity.
- **Gopalbandhu Choudhuri:** Orissa coastal salt satyagraha.
- **Dharasana Salt Works:** non-violent raid after Gandhi’s arrest; journalist **Webb Miller** reported brutal repression internationally.

##### A6. Gandhi-Irwin Pact + RTC

**Gandhi-Irwin / Delhi Pact, 5 March 1931**

Government agreed, inter alia:
- release political prisoners **not convicted of violence**;
- remit fines not yet collected;
- return confiscated land not yet sold to third parties;
- leniency to government servants who resigned;
- coastal villagers may make salt for personal use;
- peaceful/non-aggressive picketing;
- withdraw emergency ordinances.

Government **did not accept**:
- public inquiry into police excesses;
- commutation of Bhagat Singh, Rajguru, Sukhdev death sentences.

Congress agreed:
- suspend Civil Disobedience;
- participate in next Round Table Conference.

**Second RTC, 1931**
- Gandhi attended as **sole Congress representative**.
- **Rajendra Prasad did not participate** (UPPCS).

##### A7. Communal Award → Poona Pact

**Communal Award, 16 Aug 1932 — Ramsay MacDonald**
- extended communal representation; Depressed Classes treated as a separate electorate category.
- Gandhi opposed separate electorates for Depressed Classes and began fast in Yeravada on **20 Sep 1932**.

**Poona Pact, 24 Sep 1932**
- settlement associated principally with **B.R. Ambedkar** for Depressed Classes and **Madan Mohan Malaviya** among caste-Hindu negotiators; Gandhi did not personally sign the pact.
- separate electorate for Depressed Classes abandoned → **joint electorates + reserved seats**.
- **148** seats reserved for Depressed Classes in provincial legislatures.
- Central Legislature: **18% of seats allotted to the general electorate for British India** reserved for Depressed Classes.
- primary-election panel mechanism before final joint-electorate vote.

**After Poona**
- Gandhi intensified anti-untouchability work.
- **All India Anti-Untouchability League** → later **Harijan Sevak Sangh**; G.D. Birla associated as first president.

##### A8. WWII → Quit India

**Run-up**
- 1939: Congress ministries resigned after India was committed to WWII without Indian consultation.
- 1940: August Offer; Individual Satyagraha (Vinoba Bhave first satyagrahi).
- 1942: Cripps Mission failed; wartime inflation/hardship + Japanese advance/British reverses intensified urgency.

**Launch**
- Wardha CWC resolution July 1942 → AICC Bombay **8 Aug 1942** at Gowalia Tank.
- Gandhi: **“Do or Die.”**
- major leaders arrested from **9 Aug**; Congress organisations banned.

**Nature / phases**
- after immediate decapitation of central leadership, much action became **spontaneous/decentralised**; violence occurred in several areas despite Congress/Gandhi’s declared non-violent strategy.
- labour response was uneven; do not infer uniform all-class participation.

**Underground network**
- **Usha Mehta:** Congress Radio.
- **Ram Manohar Lohia, Jayaprakash Narayan, Achyut Patwardhan, Aruna Asaf Ali, Sucheta Kripalani** among important underground/continuing actors.

**Parallel governments**
- **Ballia (UP):** Chittu Pandey.
- **Tamluk / Tamralipta Jatiya Sarkar (Midnapore):** durable parallel administration.
- **Satara / Prati Sarkar:** Nana Patil; sustained underground parallel authority.

**Women — discrimination set**
- QIM-linked: **Aruna Asaf Ali, Matangini Hazra, Kanaklata Barua**.
- **Shanti Ghosh:** earlier Bengal revolutionary stream; not a QIM figure in the UPPCS comparison.

---

#### B. Early Nationalism, INC & Swadeshi

##### B1. Pre-Congress political associations — chronology matrix

| Year | Organisation | Place | Founders / key office-holder | Elimination anchor |
|---|---|---|---|---|
| **1836** | Bangabhasha Prakasika Sabha | Calcutta | associates of Rammohan Roy | earliest association in UPPCS chronology sets |
| **1838** | Landholders’ Society / Zamindari Association | Calcutta | Dwarkanath Tagore + landlords | landlord interests; constitutional petitioning |
| **1843** | Bengal British India Society | Calcutta | George Thompson influence; Indian collaborators | merged with Landholders’ current into British Indian Association |
| **1851** | British Indian Association | Calcutta | Radhakanta Deb, Debendranath Tagore etc. | **Radhakanta Deb = first president** |
| **1852** | Bombay Association | Bombay | Jagannath Shankarseth and leading Bombay public men; Naoroji associated | do not confuse with 1885 Bombay Presidency Association |
| **1866** | **East India Association** | London | **Dadabhai Naoroji** | influence British public opinion; **not 1886** |
| **1870** | Poona Sarvajanik Sabha | Poona | G.V. Joshi, S.H. Sathe, S.H. Chiplunkar; M.G. Ranade later central | 1875 petition for direct Indian representation in British Parliament |
| **1870/71** | National Indian Association | Britain | Mary Carpenter; later Elizabeth Adelaide Manning prominent | educational/social association in Britain; UPPCS chronology |
| **1872** | Indian Society | Britain/London context | **Ananda Mohan Bose** | between National Indian Association and Indian Association |
| **1875** | Indian League | Calcutta | Sisir Kumar Ghosh | nationalism/political education |
| **1876** | Indian Association / Indian National Association | Calcutta | Surendranath Banerjea + Ananda Mohan Bose | major all-India precursor; Indian National Conference |
| **1884** | Madras Mahajana Sabha | Madras | M. Veeraraghavachariar, G. Subramania Iyer, P. Ananda Charlu | **P. Rangaiah Naidu = first president**; Gazulu Chetty founder claim = trap |
| **1885** | Bombay Presidency Association | Bombay | Pherozeshah Mehta, K.T. Telang, Badruddin Tyabji | Pherozeshah Mehta leading president |

**UPPCS chronology to memorise exactly:** **East India Association (1866) → National Indian Association (1870/71) → Indian Society (1872) → Indian Association (1876).**

##### B2. Indian National Congress — foundation + Moderate phase

**Foundation**
- A.O. Hume’s **Indian National Union** preceded the INC.
- First INC session: **28–30 Dec 1885**, Bombay, Gokuldas Tejpal Sanskrit College; **72 delegates**; **W.C. Bonnerjee** president.
- Second session 1886 Calcutta: **Dadabhai Naoroji**.

**Moderate leadership — core bundle**
- Dadabhai Naoroji; Pherozeshah Mehta; Surendranath Banerjea; M.G. Ranade; G.K. Gokhale; R.C. Dutt; Badruddin Tyabji; P. Ananda Charlu etc.
- Method: constitutional agitation, petitions/resolutions, legislative criticism, political education, propaganda in Britain, defence of civil liberties.
- Durable achievement: **economic critique of colonial rule** — drain, unproductive expenditure, discriminatory administration, poverty/deindustrialisation arguments.
- High-value economic critics: **Naoroji + R.C. Dutt + G. Subramania Iyer**.

**National Social Conference**
- social reformers including Ranade/Raghunath Rao developed a separate conference/platform alongside the Congress era.
- PYQ reason: Congress did not want divisive social questions to fracture the common political platform; social reform was therefore institutionally separated rather than made a compulsory Congress programme.

##### B3. Moderates vs Extremists

| Dimension | Moderates | Extremists / militant nationalists |
|---|---|---|
| Main phase | c.1885–1905 dominance | c.1905 onward; peak Swadeshi phase |
| Faith | constitutional pressure; British liberal opinion could be mobilised | self-reliance; pressure/mass mobilisation; British interests fundamentally opposed |
| Method | petitions, resolutions, councils, press, deputations | swadeshi, boycott, national education, passive resistance, wider non-cooperation |
| Social strategy | cautious, educated middle-class leadership | wider popular mobilisation; festivals/samitis/volunteers |
| Key names | Naoroji, Gokhale, Mehta, Banerjea | **Tilak, Bipin Chandra Pal, Lajpat Rai, Aurobindo Ghosh** |

**Trap:** difference was not simply “violence vs non-violence”; the major dispute concerned **scope, pace, mass action and boycott/non-cooperation with colonial institutions**.

##### B4. Partition of Bengal + Swadeshi

**Chronology**
- Curzon’s partition scheme announced **19 July 1905**.
- **7 Aug 1905, Calcutta Town Hall:** formal boycott resolution / major launch point of Swadeshi-Boycott agitation.
- Partition effective **16 Oct 1905**; observed through mourning, unity rituals, boycott/swadeshi mobilisation.
- Partition **annulled 1911**; Bihar and Orissa separated, Assam reorganised; imperial capital shifted Calcutta → Delhi.

**Programme — four axes**
- **Economic:** boycott foreign goods; swadeshi production/enterprise; indigenous banking/industry/crafts.
- **Educational:** boycott official institutions where movement permitted; national schools/colleges; **National Council of Education (1906)**.
- **Political:** meetings/processions; samitis; passive resistance; later proposal to boycott councils/courts/government service.
- **Cultural:** songs, literature, indigenous art/science, festivals, public mobilisation.

**High-yield people/institutions**
- **P.C. Ray:** Bengal Chemical / indigenous enterprise symbol.
- **S.G. Deuskar:** `Desher Katha` (1904), influential critique in Swadeshi milieu.
- **V.O. Chidambaram Pillai:** **Swadeshi Steam Navigation Company**, Tuticorin, 1906; challenge to British India Steam Navigation monopoly.
- Tagore contributed to Swadeshi cultural mobilisation, but **his renunciation of knighthood belongs to 1919/Jallianwala**, not 1905.

**Why movement declined by c.1908**
- repression; leaders jailed/deported/withdrawn;
- Moderate–Extremist split;
- weak sustained organisation/discipline;
- uneven social/geographical reach; limited peasant penetration in many regions.

**Significance**
- major transition from elite petitioning toward mass-oriented boycott/self-reliance;
- later Gandhian repertoire anticipated: non-cooperation, constructive work, indigenous production, public mobilisation;
- art/literature/science/industry became part of anti-colonial politics.

##### B5. Banaras 1905 → Calcutta 1906 → Surat 1907

| Session | President | What matters |
|---|---|---|
| **Banaras, 1905** | G.K. Gokhale | differences surface: Extremists seek wider boycott; Moderates prefer Bengal-focused/constitutional response |
| **Calcutta, 1906** | Dadabhai Naoroji | compromise; **Swaraj, Swadeshi, Boycott, National Education** resolutions; “Swaraj” formally foregrounded |
| **Surat, 1907** | Rash Behari Ghosh elected/Moderate choice | organisational rupture; disagreement over extending boycott geographically + to colonial institutions; Moderates vs Extremists split |

**Surat reasoning — exact elimination point**
- Moderates: restrict boycott mainly to Bengal and foreign goods; avoid broad boycott of councils/courts/services; await/rely more on constitutional concessions.
- Extremists: take movement across India and extend boycott/passive resistance to colonial institutions; press for mass agitation.

##### B6. Home Rule Movement

| Feature | Tilak’s League | Annie Besant’s League |
|---|---|---|
| Founded | **April 1916** | **September 1916** |
| HQ / first activity | Poona; first meeting Belgaum | Madras |
| Area | Maharashtra **excluding Bombay city**, Karnataka, Central Provinces, Berar | rest of India **including Bombay city** |
| Organisation | 6 branches | ~200 branches; looser structure |
| Key workers | Tilak; Joseph Baptista etc. | George Arundale (organising secretary), B.P. Wadia, C.P. Ramaswamy Aiyar |
| Demand | home rule/self-government; Tilak also stressed linguistic states + vernacular education | home rule/self-government within imperial framework |

**Programme:** political education, public meetings, libraries/reading rooms, pamphlets/newspapers, conferences, local organisation.

**Consequences**
- widened geography/social reach of nationalist politics;
- linked pre-1914 politics to later mass phase;
- assisted Moderate–Extremist reunion at **Lucknow 1916**.
- **1920:** Gandhi became president of All India Home Rule League; renamed it **Swarajya Sabha**; it soon merged into Congress current.

##### B7. Selected INC sessions/presidents — only high-yield

| Year / place | President | Anchor |
|---|---|---|
| 1885 Bombay | W.C. Bonnerjee | first session |
| 1886 Calcutta | Dadabhai Naoroji | second session |
| 1887 Madras | Badruddin Tyabji | first Muslim president |
| 1905 Banaras | G.K. Gokhale | Swadeshi debate |
| 1906 Calcutta | Dadabhai Naoroji | Swaraj/Swadeshi/Boycott/National Education |
| 1907 Surat | Rash Behari Ghosh | split |
| 1916 Lucknow | Ambica Charan Mazumdar | Extremists readmitted; Congress-League Pact |
| 1917 Calcutta | **Annie Besant** | first woman president |
| 1920 Calcutta (special) | Lala Lajpat Rai | NCM approval |
| 1920 Nagpur | C. Vijayaraghavachariar | NCM ratification + reorganisation |
| 1924 Belgaum | **M.K. Gandhi** | only INC session presided by Gandhi |
| 1925 Kanpur | **Sarojini Naidu** | first Indian woman president |
| 1929 Lahore | Jawaharlal Nehru | Purna Swaraj |
| 1931 Karachi | Vallabhbhai Patel | Gandhi-Irwin ratified; Fundamental Rights/National Economic Programme |
| 1938 Haripura | Subhas C. Bose | National Planning Committee initiative |
| 1939 Tripuri | Subhas C. Bose | re-elected; crisis → resignation |
| 1940 Ramgarh | Abul Kalam Azad | wartime phase; Azad remained Congress president 1940–46 |

**Trap:** Bal Gangadhar Tilak **never** served as INC president.

---

#### C. Nationalist Personalities, Organisations & Books

##### C1. Identity bundles

| Person | Organisation / role | Book / journal / distinctive anchor |
|---|---|---|
| **Dadabhai Naoroji** | East India Association (1866); INC pres. 1886, 1893, 1906; British MP | `Poverty and Un-British Rule in India`; `Rast Goftar`; drain theory |
| **Surendranath Banerjea** | Indian Association (1876); Indian National Conference | `The Bengalee`; `A Nation in Making` |
| **W.C. Bonnerjee** | first INC president, 1885 | — |
| **Badruddin Tyabji** | Bombay Presidency Association; first Muslim INC president, 1887 | — |
| **G.K. Gokhale** | Servants of India Society (1905); INC pres. Banaras 1905 | Moderate leader; Gandhi regarded him as political mentor |
| **Bal Gangadhar Tilak** | extremist; Home Rule League | `Kesari`, `Mahratta`; `Gita Rahasya`; **never INC president** |
| **Annie Besant** | Theosophical leader; All India Home Rule League; INC pres. 1917 | `New India`, `Commonweal`; **not founder of Theosophical Society** |
| **Sarojini Naidu** | INC pres. Kanpur 1925 | first Indian woman INC president |
| **Lala Lajpat Rai** | Lal-Bal-Pal; first AITUC president | `The Story of My Deportation`; writings/biographies on Mazzini, Garibaldi, Shivaji, Shri Krishna |
| **M.K. Gandhi** | Satyagraha/NCM/CDM/QIM leadership | `Young India`, `Navajivan`, `Harijan`; `Songs from Prison`; influenced by Ruskin’s `Unto This Last` |
| **Abul Kalam Azad** | Khilafat/nationalist leader; INC president 1940–46 | `Al-Hilal`, `Al-Balagh`; `India Wins Freedom` |
| **S.G. Deuskar** | Swadeshi intellectual | `Desher Katha` |
| **Tej Bahadur Sapru** | Liberal constitutionalist | president, All India Liberal Federation |
| **K.C. Neogy** | Constituent Assembly member | — |
| **P.C. Joshi** | Communist leader | CPI general secretary |
| **Subhas Chandra Bose** | INC pres. 1938/1939; Forward Bloc 1939 | National Planning Committee initiative during Haripura presidency |

##### C2. Descriptive leader identification — Lala Lajpat Rai

Retain for UPSC-style biography:
- nationalist from Punjab; Lal-Bal-Pal;
- associated with Arya Samaj milieu;
- first president of **AITUC (1920)**;
- wrote on/biographical works concerning **Mazzini, Garibaldi, Shivaji, Shri Krishna**;
- `The Story of My Deportation`.

##### C3. Books / authors — exam set

| Work | Author / association |
|---|---|
| `Poverty and Un-British Rule in India` | Dadabhai Naoroji |
| `A Nation in Making` | Surendranath Banerjea |
| `Gita Rahasya` | Bal Gangadhar Tilak |
| `The Story of My Deportation` | Lala Lajpat Rai |
| `India Wins Freedom` | Abul Kalam Azad |
| `Desher Katha` | Sakharam Ganesh Deuskar |
| `Songs from Prison` | Mahatma Gandhi |
| `Unto This Last` | John Ruskin — major influence on Gandhi |
| `Bandi Jiwan` | Sachindranath Sanyal |

##### C4. Newspapers / journals / editors

| Newspaper / journal | Person / editor association | Trap / note |
|---|---|---|
| `The Hindu` | **G. Subramania Iyer** | also associated with `Swadesamitran` |
| `The Bengalee` | **Surendranath Banerjea** | — |
| `Rast Goftar` | **Dadabhai Naoroji** | Gujarati reform/national public sphere |
| `Kesari` | **Bal Gangadhar Tilak** | Marathi |
| `Mahratta` | **Bal Gangadhar Tilak** | English |
| `Sudharak` | **Gopal Ganesh Agarkar** | **CORRECT base/coaching confusion with Gokhale** |
| `Hindustani` | **Ganga Prasad Verma** | UPPCS-style editor matching |
| `New India` | **Annie Besant** | — |
| `Commonweal` | **Annie Besant** | — |
| `Young India` | **M.K. Gandhi** | — |
| `Navajivan` | **M.K. Gandhi** | — |
| `Harijan` | **M.K. Gandhi** | anti-untouchability phase |
| `Al-Hilal` | **Abul Kalam Azad** | — |
| `Al-Balagh` | **Abul Kalam Azad** | — |
| `The Indian Sociologist` | **Shyamji Krishna Varma** | India House/revolutionary overseas current |
| `Ghadar` | Ghadar Party / Yugantar Ashram network | revolutionary propaganda |

##### C5. National-symbol linkage

- Rabindranath Tagore composed `Jana Gana Mana` in Bengali.
- **Madanapalle** PYQ anchor: Tagore rendered/translated it into English there during his stay; do not confuse with formal constitutional adoption, which belongs later constitutional/transition chronology.

---

#### D. Revolutionary, Leftist & Labour Movements

##### D1. Revolutionary organisations — compact genealogy

| Organisation / stream | Date / place | People | High-yield event / distinction |
|---|---|---|---|
| **Mitra Mela → Abhinav Bharat** | c.1899 / renamed c.1904, Maharashtra | V.D. Savarkar; Ganesh Savarkar | revolutionary secret society; UPPCS pairs Abhinav Bharat with **V.D. Savarkar** |
| **Anushilan Samiti** | early 1900s, Bengal; Calcutta/Dacca strands | P. Mitra, Barindra Ghosh, Aurobindo associates; Dacca: Pulin Behari Das | Bengal revolutionary network; avoid treating all cells as one simple founder chain |
| **Jugantar** | Bengal | Barindra Ghosh, Bhupendranath Dutta etc. | paper + revolutionary network |
| **India House / Indian Home Rule Society** | London, 1905 | Shyamji Krishna Varma; later Savarkar etc. | `Indian Sociologist`; overseas revolutionary centre |
| **Ghadar Party** | 1913, North America; HQ San Francisco/Yugantar Ashram | Sohan Singh Bhakna (first president), Lala Har Dayal key organiser; Kartar Singh Sarabha; later Rash Behari link | armed overthrow; `Ghadar` paper; WWI uprising plans |
| **Berlin / Indian Independence Committee** | 1914, Germany | Virendranath Chattopadhyaya and expatriate revolutionaries | WWI international revolutionary diplomacy |
| **HRA** | 1924, Kanpur/North India | Sachindranath Sanyal, Jogesh Chandra Chatterjee, Ram Prasad Bismil; Chandrashekhar Azad | **Kakori, 1925** |
| **Naujawan Bharat Sabha** | 1926, Lahore | Bhagat Singh and young associates; Yashpal, Chhabil Das in UPPCS set | youth mobilisation; Ambika Chakravarti = trap |
| **HSRA** | 1928, Feroz Shah Kotla, Delhi | Chandrashekhar Azad, Bhagat Singh, Sukhdev, Bhagwati Charan Vohra, Shiv Verma etc. | HRA reorganised on explicitly socialist-republican lines; Saunders/Assembly Bomb/Lahore case |
| **Indian Republican Army, Chittagong branch** | 1930 | **Surya Sen** | Chittagong Armoury Raid, 18 Apr 1930; Jalalabad fighting |

##### D2. Key revolutionary chronology

- **1908:** Muzaffarpur bomb attempt on Kingsford → Khudiram Bose + Prafulla Chaki; Alipore conspiracy trial follows in Bengal revolutionary crackdown.
- **23 Dec 1912:** bomb attack on Viceroy Hardinge at Delhi; **Rash Behari Bose** central planner; **Basanta Kumar Biswas** threw bomb. Organisation-label questions are less clean than these person/event facts.
- **1913:** Ghadar Party institutionalised in North America.
- **1914–15:** Ghadar/Berlin networks seek wartime uprising; Rash Behari Bose linked to 1915 plan.
- **1924:** HRA organised.
- **9 Aug 1925:** Kakori train action.
- **1928:** HRA reorganised as HSRA at Feroz Shah Kotla.
- **8 Apr 1929:** Bhagat Singh + Batukeshwar Dutt throw non-lethal bombs in Central Legislative Assembly; court/publicity used for revolutionary propaganda.
- **18 Apr 1930:** Chittagong Armoury Raid, Surya Sen.
- **24 Sep 1932:** **Pritilata Waddedar** led attack on Pahartali European Club; wounded, consumed cyanide to avoid capture. **Do not say she died in the 1930 Armoury Raid.**

**UP-specific anchor:** Ram Prasad Bismil—**Shahjahanpur**; HRA/Kakori; executed at Gorakhpur Jail (later detail useful for UPPCS, not UPSC core).

##### D3. Ghadar — PYQ payload

- revolutionary association of Indians abroad, particularly North America; founded/organised **1913**.
- operational centre: **San Francisco / Yugantar Ashram**.
- **Sohan Singh Bhakna** = first president; **Lala Har Dayal** = principal organiser/ideologue; `Ghadar` newspaper.
- objective: armed overthrow of British rule; WWI used as opportunity for attempted military uprising in India.
- **Rash Behari Bose** collaborated with Ghadar-linked 1915 revolutionary plan.
- **Trap:** Barindra Ghosh = Bengal revolutionary/Anushilan-Jugantar; Jogesh Chandra Chatterjee = HRA stream; neither should replace Rash Behari in a Ghadar association set.

##### D4. HRA → HSRA

**HRA, 1924**
- formed after disillusionment with suspension of NCM.
- key names: **Sachindranath Sanyal, Jogesh Chandra Chatterjee, Ram Prasad Bismil**; Chandrashekhar Azad joined North Indian revolutionary network.
- `Bandi Jiwan`—Sachindranath Sanyal.
- Kakori action (1925) sought state funds for revolutionary work.

**HSRA, 1928**
- reorganisation at **Feroz Shah Kotla, Delhi** under Chandrashekhar Azad/Bhagat Singh generation.
- **Socialist** added to organisational goal/name; republican revolution linked increasingly with social-economic transformation.
- key chain: Saunders assassination (1928) → Assembly Bomb (1929) → Lahore Conspiracy Case → Bhagat Singh/Rajguru/Sukhdev execution 23 Mar 1931.

**Malformed-PYQ warning:** do not memorise “Hindustan Socialist Democratic Union” as a standard organisation merely because `UPPCS-2022-GS1-Q070` uses that wording. Standard source vocabulary = **HRA / HSRA**.

##### D5. Chittagong revolutionary current

- leader: **Surya Sen (“Masterda”)**.
- objective of 18 Apr 1930 action: seize armouries, disrupt communications, challenge colonial authority in Chittagong.
- women revolutionaries included **Kalpana Dutta** and **Pritilata Waddedar**.
- Pritilata’s fatal action = **Pahartali European Club, 1932**, not the initial 1930 raid.

##### D6. Left / socialist current

**Communist movement**
- **1920 Tashkent group:** M.N. Roy + expatriate associates formed a Communist Party of India group abroad.
- **1925 Kanpur Communist Conference:** important formal organisational milestone within India; avoid treating the 1920/1925 dates as interchangeable.
- conspiracy prosecutions: Peshawar / **Kanpur (1924)** / **Meerut (1929–33)** aimed at communist/labour activists.
- **P.C. Joshi:** CPI general secretary; UPSC identity anchor.

**Workers and Peasants Parties**
- provincial formations emerged mid-1920s; Bengal’s Labour Swaraj current transformed into a Workers and Peasants Party.
- all-India coordination crystallised in **1928**, not 1927.
- aim: work within/around Congress mass politics, organise workers/peasants, push nationalist movement toward a radical/socialist programme.
- `UPPCS-2024-GS1-Q014`: statement that an all-India WPP was formed in 1927 = false; “work within Congress to radicalise/mass-base it” = true.

**Congress Socialist Party (CSP)**
- formed **1934** as an organised socialist group **within Congress**.
- **Acharya Narendra Dev** = first president/chair; **Jayaprakash Narayan** = general secretary/central organiser; Ram Manohar Lohia, Achyut Patwardhan, Minoo Masani, Yusuf Meherally, Ashok Mehta important.
- rejected colonialism + sought socialist reconstruction through mass mobilisation.
- **Jawaharlal Nehru sympathised with socialist ideas but did not formally join CSP.**
- **UPPCS trap:** not “January 1934”; organisational formation/conference belongs later in 1934 (Bombay phase).
- **UPSC trap:** CSP did not advocate communal electorates or a Soviet-style dictatorship as its defining Congress programme.

**Forward Bloc, 1939**
- formed by **Subhas Chandra Bose** after Tripuri crisis/resignation from Congress presidency.
- background tested in UPSC 2026: Gandhi–Bose leadership conflict + fragmented Congress Left + divergent tactics among socialists/Royists/communists.

##### D7. Labour movement + legislation

**Early labour organisation**
- **Sasipada Banerjea:** workingmen’s club / `Bharat Shramjeevi` current.
- **N.M. Lokhande:** early labour pioneer; `Deenbandhu`; Bombay Mill and Millhands Association.
- **Madras Labour Union, 1918:** B.P. Wadia + V. Kalyanasundaram; among India’s earliest modern trade unions.
- **Ahmedabad Textile Labour Association, 1920:** Gandhi + Anasuya Sarabhai; grew from Ahmedabad mill-labour organisation.

**AITUC**
- founded **31 Oct 1920, Bombay**.
- **Lala Lajpat Rai = first president**.
- **Dewan Chaman Lal = first general secretary**; N.M. Joshi major organiser.
- 1929 Nagpur session presided over by **Jawaharlal Nehru**; ideological split produced a separate reformist federation under N.M. Joshi/V.V. Giri/B. Shiva Rao current.

**Legislation — what it did / did not do**

| Act | Core provision | Exam trap |
|---|---|---|
| **Factories Act, 1881** | early statutory regulation of factory labour, especially child labour/working conditions within covered factories | **did not fix wages; did not create/permit trade unions** |
| **Factories Act, 1891** | widened labour regulation/age and working-condition protections | early nationalists often had ambivalent attitudes due concern for Indian industry competitiveness |
| **Trade Unions Act, 1926** | legal recognition/registration of trade unions; defined immunities under specified conditions | distinct from Trade Disputes Act |
| **Trade Disputes Act, 1929** | conciliation/inquiry machinery; restrictions on strikes/lockouts, especially public-utility services and politically coercive strikes | UPSC: **system of tribunals/boards + ban/restriction on strikes**; not worker participation in management |

**Hind Mazdoor Sabha (HMS), 1948 — UPSC extension**
- founders asked by UPSC: **Ashok Mehta, T.S. Ramanujam, G.G. Mehta**.
- post-independence date is retained only because taxonomy explicitly owns this labour-union extension and UPSC asked it.

### 6. UPPCS Extension Layer

Only additional UPPCS-heavy recall not already necessary for UPSC core:

#### Association chronology / first-office traps
- **1866 East India Association**—Dadabhai Naoroji, London.
- **1870/71 National Indian Association**—Mary Carpenter network, Britain.
- **1872 Indian Society**—Ananda Mohan Bose.
- **1876 Indian Association**—Surendranath Banerjea + Ananda Mohan Bose, Calcutta.
- **British Indian Association**—Radhakanta Deb first president.
- **Madras Mahajana Sabha**—P. Rangaiah Naidu first president; founders M. Veeraraghavachariar, G. Subramania Iyer, P. Ananda Charlu.

#### Newspaper ↔ place
- **Swadesh — Gorakhpur**.
- **Bharat Bandhu — Hathras**.
- **Satyawadi — Agra**.
- **Shakti — Almora**.
- Canonical `UPPCS-2022-GS1-Q125` structured option reconstruction is defective; these pairs come from the source question/explanation, not the corrupted parsed option key.

#### INC micro-recall
- Tilak never INC president.
- Gandhi presided only once: **Belgaum 1924**.
- Annie Besant = first woman INC president, **1917**.
- Sarojini Naidu = first Indian woman INC president, **1925 Kanpur**.
- Jawaharlal Nehru: Lahore 1929; Lucknow 1936; Faizpur 1936/37 annual-cycle session chronology often asked by state exams.
- Subhas Bose: Haripura 1938; Tripuri 1939 crisis.

#### UP / state-linked revolutionary recall
- **Ram Prasad Bismil — Shahjahanpur; HRA/Kakori; hanged Gorakhpur Jail**.
- Chauri Chaura accused: defence associated with **Madan Mohan Malaviya + Krishna Kant**.
- Ballia parallel government, 1942: **Chittu Pandey**.

#### Labour / left micro-recall
- Madras Labour Union 1918—**B.P. Wadia + V. Kalyanasundaram**.
- **First ILO Conference, Washington 1919:** **N.M. Joshi** represented Indian workers; **B.P. Wadia** accompanied/advised him. `UPPCS-2020-GS1-Q016` canonical option/answer mapping is unreliable.
- AITUC first president—**Lala Lajpat Rai**.
- AITUC Nagpur 1929—**Jawaharlal Nehru** presided.
- M.N. Roy—Tashkent communist initiative, 1920; first Indian prominently linked with Comintern leadership.
- `UPPCS-2022-GS1-Q144` trade-union–party matching table remains structurally malformed in canonical corpus → **do not use its option key for scoring/notes**.

#### QIM women
- **Aruna Asaf Ali**—Gowalia Tank / underground.
- **Matangini Hazra**—Bengal QIM martyr.
- **Kanaklata Barua**—Assam QIM martyr.
- **Shanti Ghosh**—earlier Bengal revolutionary; not QIM.

### 7. Cross-Topic / Cross-Subtopic Traps

- **Cripps Mission:** here only as immediate QIM trigger. Proposal clauses belong **Constitutional Development**.
- **Simon Commission / Nehru Report:** here only where they establish movement chronology or INC politics; detailed constitutional recommendations belong sibling constitutional node.
- **Bardoli / Eka / Tebhaga / peasant organisations:** if question turns on agrarian demand/share/revenue/peasant leadership rather than nationalist strategy, move to **Tribal & Peasant Uprisings**.
- **INA / INA trials / RIN mutiny / Cabinet Mission / Interim Government / partition:** chronology may touch this topic; decisive payload belongs **Independence, Partition & Post-Independence Transition**.
- **Anti-caste/reform bodies:** Gandhi’s post-Poona anti-untouchability work retained because directly demanded; wider anti-caste/reform history belongs **Socio-Religious Reform & Anti-Caste Movements**.
- **Annie Besant:** Home Rule leader + INC president; **not founder** of Theosophical Society.
- **Tagore:** Swadeshi cultural figure; **renounced knighthood in 1919 after Jallianwala**, not during Bengal partition agitation.
- **Naoroji:** East India Association **1866**, not 1886; 1886 is his first INC presidency.
- **First woman vs first Indian woman INC president:** Annie Besant (1917) vs Sarojini Naidu (1925).
- **HRA vs HSRA:** HRA 1924; socialist reorganisation HSRA 1928 at Feroz Shah Kotla.
- **Pritilata:** Chittagong revolutionary, but fatal Pahartali Club attack **1932**, not 1930 Armoury Raid.
- **Communal Award vs Poona Pact:** separate electorate → joint electorate + reservation; Poona provincial reserved seats **148**, not 147.
- **NCM withdrawal vs Gandhi arrest:** withdrawal decision Feb 1922; Gandhi arrested **March 1922**.
- **Factories Act vs Trade Unions Act vs Trade Disputes Act:** 1881 factory regulation ≠ 1926 union recognition ≠ 1929 industrial-dispute/strike restrictions.
- **Current hook trap:** 7 August may appear via National Handloom Day; permanent fact retained only as **7 Aug 1905 Swadeshi/Boycott historical anchor**.

### 8. Correction / Verification Register

#### CORRECT

1. **East India Association:** base-note `1886` → **1866**, London, Dadabhai Naoroji.
2. **Tagore’s knighthood:** move from Swadeshi-era implication → **renounced in 1919 after Jallianwala Bagh**.
3. **Shipping enterprise:** “Bharat Steam Navigation Company” → **Swadeshi Steam Navigation Company**, V.O. Chidambaram Pillai, Tuticorin, 1906.
4. **Gandhi arrest after NCM:** base-note February arrest wording → **March 1922**; February = Chauri Chaura/withdrawal sequence.
5. **Gandhi 1930 demands:** remove “Postal Reservation Bill/cheap postage” formulation → retain **Coastal Traffic Reservation Bill / Indian shipping protection** + separate exchange-ratio demand.
6. **Poona Pact provincial reserved seats:** ambiguous 147/148 secondary wording → **148** from text of pact; Central Legislature reservation = **18%** of general-electorate seats for British India.
7. **Pritilata Waddedar:** not “shot/died in 1930 Chittagong raid”; she led **Pahartali European Club attack, 24 Sep 1932**, was wounded and consumed cyanide.
8. **`Sudharak`:** base/coaching attribution to Gokhale → **Gopal Ganesh Agarkar**; retain Gokhale only where independently associated with the publication/biographical work, not as its principal founder-editor pair.
9. **`UPPCS-2022-GS1-Q125`:** canonical matching options are structurally/mapping-corrupted. Correct source pairs: Swadesh–Gorakhpur; Bharat Bandhu–Hathras; Satyawadi–Agra; Shakti–Almora.
10. **`UPPCS-2025-GS1-Q135`:** canonical answer-key mapping conflicts with its reconstructed structured options; factual answer = **C. Sankaran Nair only**, independently supported by historical chronology. Do not use canonical option letter as truth.
11. **`UPPCS-2019-GS1-Q019`:** `EDITABLE_REVIEW / TABLE_STRUCTURE_UNCLEAR`; historical sequence corrected to Indian Navy Act 1927; CDM 1930; Second RTC 1931; Communal Award 1932. Use question for demand only.
12. **`UPPCS-2020-GS1-Q016` ILO delegate:** canonical record incorrectly points to option A / OCR “V.P. Wadia”. Printed-source reconstruction + ILO archival evidence support **N.M. Joshi** as Indian workers’ representative at Washington 1919; **B.P. Wadia** attended as adviser.
13. **Workers and Peasants Party:** “all-India formed 1927” → provincial WPPs mid-1920s; all-India organisation crystallised **1928**.
14. **CSP:** formation not January 1934; **1934 Bombay organisational phase**; Nehru did not formally join.

#### VERIFY

1. **`UPPCS-2023-GS1-Q042` Hardinge bombing:** canonical/source answer labels **Anushilan Samiti**. For durable notes, prefer event-level facts—Rash Behari Bose-led Delhi conspiracy; Basanta Kumar Biswas threw the bomb (23 Dec 1912). Exact single-organisation attribution is too coarse to use as a standalone canonical fact.
2. **`UPPCS-2022-GS1-Q144` union-party affiliation:** canonical record is `EDITABLE_REVIEW / TABLE_STRUCTURE_UNCLEAR`; option encoding incomplete. Demand is legitimate, but exact source option is not safe enough for canonical payload without a clean question image/key.
3. **`UPPCS-2022-GS1-Q070` “Hindustan Socialist Democratic Union”:** source/reference commentary itself says the nomenclature is historically defective and none of the options is secure. Retain only demand for HRA/HSRA founders.

#### OMIT

- Present-day **National Handloom Day** framing; retain 7 Aug 1905 historical Swadeshi anchor.
- Anniversary/current-affairs hook around **Ram Prasad Bismil**; retain only durable person–place–organisation facts.
- Detailed Cripps/Cabinet Mission constitutional clauses.
- INA/RIN/transfer-of-power payload beyond chronology cross-reference.
- Exhaustive INC session list with no PYQ/elimination value.
- Post-independence one-off trade-union party-affiliation trivia from malformed `UPPCS-2022-GS1-Q144` until clean source is supplied.

### 9. Supplement Decision

`NO_SUPPLEMENT_NEEDED`

- Base notes were sufficiently strong for the topic’s main architecture.
- Spectrum was used only to sharpen programme terms, movement consequences and labour/left distinctions.
- Ghatna Chakra was used selectively for UPPCS micro-recall and to reconstruct malformed canonical questions.
- Official verification was sufficient for decisive corrections (notably Poona Pact seat total, Sankaran Nair chronology, Swadeshi Steam Navigation Company, Pritilata chronology).
- Remaining `VERIFY` entries are record-integrity/attribution issues and **do not prevent any reliable core PYQ demand from being answered**.

### 10. Synthesis Handoff

- **All child subtopics covered:** 4/4.
- **Coverage weighting:** highest space to Gandhian Phase; next Early Nationalism/Swadeshi; then Revolutionary–Left–Labour; personality/book material compressed into match-ready matrices.
- **Unresolved VERIFY items:** `UPPCS-2023-GS1-Q042`, `UPPCS-2022-GS1-Q144`, defective wording in `UPPCS-2022-GS1-Q070`; none should be used to establish an isolated fact beyond the safe reconstruction stated above.
- **Corrections that must override older wording:** East India Association 1866; Tagore knighthood 1919; Swadeshi Steam Navigation Company; Gandhi arrest March 1922; corrected 1930 demand wording; Poona Pact 148; Pritilata 1932; `Sudharak`—Agarkar; malformed canonical option mappings quarantined.
- **Explicitly excluded:** dynamic anniversaries/current hooks; detailed constitutional proposal mechanics; peasant/tribal demand detail owned by sibling node; INA/RIN/1946 transfer-of-power material beyond chronology.
- **Every material canonical PYQ demand identified above is answerable from §5 + §6 without relying on a malformed answer record.**

---

<!-- SOURCE PACK: INDEPENDENCE, PARTITION & POST-INDEPENDENCE TRANSITION | ORIGINAL FILE: PRE-HISTCULT__Independence-Partition-and-Post-Independence-Transition__SOURCE-PACK__v01.md -->
## HISTORY & CULTURE → Independence, Partition & Post-Independence Transition — Topic Source Pack v01

**Status:** PASS_WITH_CORRECTIONS  
**topic_taxonomy_id:** `prelims-history-and-culture-independence-partition-and-post-independence-transition`  
**Child subtopics covered:** 2/2  
**Canonical PYQ scope:** UPSC CSE Prelims GS-I 2011–2026 + UPPCS Prelims GS-I 2018–2025 only  
**Source priority applied:** Taxonomy Gateway → canonical PYQ corpus → base notes → Spectrum → Ghatna Chakra/primary-official verification where required

### 1. Topic Scope

- **Includes**
  - Late-colonial communal/partition settlement points directly demanded by PYQs: Communal Award/Poona Pact distinction; C.R. (Rajagopalachari) Formula; Wavell–Shimla/Cabinet Mission transition where needed to understand Partition; INA organisation and Red Fort trials; Interim Government chronology; Mountbatten Plan; Independence Act; Radcliffe boundary process.
  - **Early post-1947 political transition only:** first general election/opposition pattern; major party formations/splits and leader–party pairs; state reorganisation milestones; a compact 1950s–70s event sequence sufficient for direct chronology PYQs.
- **Excludes**
  - Present-day constitutional mechanics/institutions → **Polity & Governance**.
  - Detailed Cabinet Mission/Constituent Assembly constitutional design → principally **Colonial Rule & Social Change → Constitutional Development**; retained here only where indispensable to the 1946–47 transition.
  - Quit India programme, Gandhi–Irwin Pact, Round Table Conferences, broader Gandhian movement chronology → **Indian National Movement → Gandhian Phase**.
  - Full revolutionary biography of Subhas Bose/Forward Bloc → **Indian National Movement → Revolutionary, Leftist & Labour Movements**; retained here only for INA linkage.
  - Pure geography of borders and later current political-party mechanics.
- **UPSC depth**
  - Identification + elimination: Communal Award trigger; Radcliffe body; INA trial officers.
  - Post-1947: chronological ordering and party/opposition distinctions, especially 1953–61 and 1950s–70s party–leader pairs.
- **UPPCS depth**
  - Heavier 1932–47 recall: C.R. Formula, Red Fort/INA, Interim Government, Cabinet Mission withdrawal, chronology of 1945–46 transition, Independence/Partition dates.
  - Taxonomy evidence load: **8 UPPCS vs 3 UPSC** for Communal Politics/INA/Partition; no direct UPPCS question classified to the early post-Independence child in the canonical 2018–25 window.

### 2. Child-Subtopic Coverage Ledger

| Child subtopic | taxonomy_id | UPSC PYQs | UPPCS PYQs | Base coverage | Status |
|---|---|---:|---:|---|---|
| Communal Politics, INA & Partition | `prelims-history-and-culture-independence-partition-and-post-independence-transition-communal-politics-ina-and-partition` | 3 | 8 | Strong but contains date/number/attribution errors | PASS_WITH_CORRECTIONS |
| Post-Independence Political Transition | `prelims-history-and-culture-independence-partition-and-post-independence-transition-post-independence-political-transition` | 2 | 0 | Sparse/scattered; no integrated section | PASS — supplemented |

### 3. PYQ Demand Map

#### A. Communal Politics, INA & Partition

##### UPSC

| Canonical question ID | Year | Demand | Answer-bearing fact | Record status |
|---|---:|---|---|---|
| `UPSC-CSE-2012-GS1-Q036` | 2012 | Why Gandhi began fast unto death in 1932 | Immediate political trigger = **Communal Award** announced by Ramsay MacDonald, especially separate electorate for Depressed Classes | Validated |
| `UPSC-CSE-2014-GS1-Q015` | 2014 | Function of Radcliffe Committee | Delimitation of the **India–Pakistan boundary** in connection with Partition | Validated |
| `UPSC-CSE-2021-GS1-Q047` | 2021 | Identify Shah Nawaz Khan, Prem Kumar Sehgal, Gurbaksh Singh Dhillon | The three were **INA officers** tried jointly at the Red Fort | Validated |

##### UPPCS

| Canonical question ID | Year | Demand | Answer-bearing fact | Record status |
|---|---:|---|---|---|
| `UPPCS-2018-GS1-Q115` | 2018 | Assertion–Reason: League withdrawal from Cabinet Mission Plan vs later entry into Interim Government | Both occurred; joining the Interim Government does **not explain** the earlier withdrawal | Validated |
| `UPPCS-2019-GS1-Q019` | 2019 | Event–year mismatch | Communal Award = **1932**, not 1933 | **EDITABLE_REVIEW / malformed table structure**; demand independently resolved |
| `UPPCS-2019-GS1-Q021` | 2019 | Place of INA officers’ trial | **Red Fort, Delhi** | Validated |
| `UPPCS-2019-GS1-Q096` | 2019 | Author of C.R. Formula | **C. Rajagopalachari** | Validated |
| `UPPCS-2022-GS1-Q140` | 2022 | Date of announcement of first Interim National Government | **24 August 1946** announcement; government took office **2 September 1946** | Validated |
| `UPPCS-2023-GS1-Q045` | 2023 | Women’s regiment of Azad Hind Fauj | **Rani of Jhansi Regiment** | Validated |
| `UPPCS-2024-GS1-Q016` | 2024 | Chronology: UK Parliamentary Delegation → RIN revolt → Cabinet Mission → Interim Government | Correct sequence = **4 → 1 → 2 → 3** | **Canonical answer-integrity defect**: corpus marks A, but source paper/explanation gives B |
| `UPPCS-2025-GS1-Q041` | 2025 | Chronology: Cripps → Wavell → Shimla → Cabinet Mission | **Cripps (1942) → Wavell Plan (1945) → Shimla Conference (1945) → Cabinet Mission (1946)** | Validated |

##### Demand synthesis

- **No repeated exact cluster**, but the questions converge on a narrow elimination core:
  1. **1932:** Communal Award ↔ Poona Pact distinction.
  2. **1944–46 negotiation ladder:** C.R. Formula → Wavell/Simla → Cabinet Mission → Direct Action → Interim Government.
  3. **INA:** formation/leadership → Rani Jhansi Regiment → Red Fort three → defence agitation.
  4. **1947:** Mountbatten Plan → Independence Bill/Act → Radcliffe boundary process.
- **UPPCS style:** dates, sequence, place, person–proposal/regiment association.
- **UPSC style:** functional identification and discriminating associations rather than exhaustive narrative.

#### B. Post-Independence Political Transition

##### UPSC

| Canonical question ID | Year | Demand | Answer-bearing fact | Record status |
|---|---:|---|---|---|
| `UPSC-CSE-2018-GS1-Q001` | 2018 | First Lok Sabha opposition / formal Leader of Opposition | First Lok Sabha’s largest opposition party was **CPI**, not Swatantra; first formally recognised Lok Sabha LoP came in **1969**; “minimum 75 members” statement is false | Validated |
| `UPSC-CSE-2018-GS1-Q091` | 2018 | Chronology of post-1947 events | **Air India nationalisation (1953) → Imperial Bank renamed SBI (1955) → elected Communist government in Kerala (1957) → Goa incorporated after liberation (1961)** | Validated |

##### UPPCS

- **No materially relevant canonical UPPCS 2018–2025 question** classified to this child after semantic review.
- Later-party/current-politics and non-political post-Independence urban/economic questions were excluded rather than inflating coverage.

##### Demand synthesis

- Direct PYQ load is small: **2 UPSC, 0 UPPCS**.
- Required preparation is therefore **compact but not empty**:
  - first general election + opposition-party trap;
  - 1953–61 chronology;
  - durable party–leader pairs and major splits/formations through the 1970s;
  - key state-reorganisation milestones that frequently function as chronology distractors.
- Avoid turning this child into a full post-Independence textbook.

### 4. Base-Note Coverage

#### Communal Politics, INA & Partition

- **Strong**
  - Communal Award + Gandhi fast + Poona Pact.
  - C.R. Formula and Jinnah’s objections.
  - Desai–Liaquat/Wavell–Shimla transition.
  - 1945–46 election/Cabinet Mission/Interim Government chronology.
  - INA leaders, Rani Jhansi Regiment, Imphal campaign, Red Fort officers/defence team.
  - Mountbatten Plan, Independence Act, Radcliffe boundary commission.
- **Partial**
  - Communal Award is framed too narrowly as only a Depressed Classes measure; broader communal/interest representation is missing.
  - INA trial consequences and exact sentence terminology need sharpening.
  - Independence Bill/Act/Radcliffe timeline is compressed inaccurately.
- **Missing**
  - Clean “announcement vs formation” distinction for Interim Government.
  - Reliable correction layer for the malformed/suspicious canonical PYQs.
- **Outdated/suspect**
  - Poona Pact provincial reserved seats shown as **147** → primary pact gives **148**.
  - Bose shown as taking INA command in **April 1943** → leadership transfer occurred in **July 1943**; he became Supreme Commander on **25 August 1943**.
  - “India Independence Bill introduced June 3” → June 3 was the **Mountbatten Plan**; Bill was presented **4 July 1947**.
  - Radcliffe award/release shown as **15 August** → boundary awards were published **17 August 1947**.
  - Desai–Liaquat note says League would abandon Pakistan demand → not supported by the standard draft terms; remove.
  - Captain Lakshmi is liable to be conflated with the famous joint Red Fort trial of the three officers; keep separate.

#### Post-Independence Political Transition

- **Strong**
  - Only isolated facts/personality continuities (e.g., Sucheta Kripalani) occur elsewhere in the base notes.
- **Partial**
  - Scattered chronology but no usable 1947–70s political-transition spine.
- **Missing**
  - First general election and opposition distinction.
  - 1953–61 chronology explicitly demanded by UPSC 2018.
  - Jana Sangh/PSP/Swatantra/CPI split/Congress split/Janata durable pairs.
  - States Reorganisation sequence.
- **Outdated/suspect**
  - No major integrated section exists to correct; this child required genuine supplementation rather than rewriting the base.

### 5. Core Fact Payload

#### A. Communal Politics, INA & Partition

##### 1. Communal Award → Poona Pact (1932)

| Item | High-yield fact |
|---|---|
| **Communal Award** | Announced by British PM **Ramsay MacDonald, 16 Aug 1932** after failure to settle minority representation at the Round Table process |
| Representation | Continued/extended communal and special-interest representation; crucially accorded **Depressed Classes separate electorates** and minority political status |
| Gandhi’s response | Opposed separate electorate for Depressed Classes; began indefinite fast at Yeravada on **20 Sep 1932** |
| **Poona Pact** | **24 Sep 1932**; compromise replacing separate electorate for Depressed Classes with **joint electorates + reserved seats** |
| Provincial seats | Increased from Communal Award’s **71 to 148** reserved seats |
| Centre | **18%** of seats allotted to the general electorate in the Central Legislature reserved for Depressed Classes |
| Exam distinction | **Communal Award = separate electorate**; **Poona Pact = joint electorate + enhanced reservation** |

**Elimination hooks**
- Gandhi’s 1932 fast ≠ against Simon Commission / Cripps / Quit India repression → **Communal Award**.
- Do not reduce the Award itself to only one community; the **PYQ trigger** is its treatment of Depressed Classes.
- Poona Pact number: **148**, not 147.

##### 2. C.R. Formula → Wavell/Simla → Cabinet Mission: transition ladder

**C.R. / Rajagopalachari Formula (1944)**
- Proposed by **C. Rajagopalachari**; Gandhi backed negotiations on this basis.
- Muslim League to support the demand for Indian independence and cooperate in a provisional government.
- After the war, **entire population** of contiguous Muslim-majority areas in the North-West and North-East to decide by plebiscite whether to form a separate sovereign state.
- If partition accepted → common arrangements on **defence, commerce, communications**.
- Operative after Britain transferred full power.
- Jinnah’s objections: wanted recognition of the two-nation claim; objected to entire-population plebiscite and to a common-centre type arrangement.

**Desai–Liaquat draft (1945) — only the durable core**
- **Bhulabhai Desai + Liaquat Ali Khan**.
- Proposed parity between Congress and League nominees in an interim central government, with representation for minorities.
- Did not mature into an accepted Congress–League settlement.
- **Do not retain** the base-note claim that the League formally agreed to abandon Pakistan.

**Wavell Plan / Shimla Conference (June–July 1945)**
- Reconstruct Viceroy’s Executive Council: except **Viceroy + Commander-in-Chief**, members to be Indians.
- **Parity between caste Hindus and Muslims** in the reconstituted council.
- Council to function within the Government of India Act, 1935 framework pending a new constitutional settlement.
- Core deadlock: Muslim League insisted that **all Muslim nominees** must come through the League; Congress rejected being reduced to a solely caste-Hindu organisation.

**Cabinet Mission → breakdown → Interim Government (1946)**
- Cabinet Mission: **Pethick-Lawrence, Stafford Cripps, A.V. Alexander**; arrived **24 Mar 1946**.
- League accepted long-term plan **6 Jun**; Congress accepted entry into Constituent Assembly framework **24 Jun**.
- Nehru’s **10 Jul** remarks on Constituent Assembly sovereignty/grouping sharpened conflict.
- League withdrew acceptance **29 Jul** → Direct Action call for **16 Aug 1946**.
- Nehru-led Interim Government **announced 24 Aug 1946** → took office **2 Sep 1946**.
- Muslim League later joined on **26 Oct 1946**.

**UPPCS chronology anchor**
> UK Parliamentary Delegation to Delhi (**Jan 1946**) → RIN revolt (**Feb 1946**) → Cabinet Mission arrival (**24 Mar 1946**) → Interim Government announcement (**24 Aug**) / formation (**2 Sep**).

##### 3. INA / Azad Hind Fauj

**First phase**
- Japanese capture of Singapore produced a large pool of Indian POWs.
- **Captain Mohan Singh** organised the first INA from Indian POWs in 1942.
- **Rash Behari Bose** built the Indian Independence League framework in East/Southeast Asia and provided the organisational bridge to Subhas Bose.

**Subhas Bose phase**
- Rash Behari Bose transferred leadership of the IIL/INA to **Subhas Chandra Bose in July 1943**.
- Bose became INA **Supreme Commander, 25 Aug 1943**.
- **Provisional Government of Free India / Azad Hind Government:** **21 Oct 1943**, Singapore.
- **Rani of Jhansi Regiment:** women’s regiment; led by **Captain Lakshmi Swaminathan (Lakshmi Sahgal)**.
- INA HQ shifted to **Rangoon, Jan 1944**.
- INA/Japanese advance entered Indian territory; **Moirang, Manipur — 14 Apr 1944** became the best-known flag-hoisting anchor.
- Japanese retreat and Allied recovery ended the campaign; INA surrendered after Japan’s surrender in Aug 1945.

**Red Fort trials / INA agitation**
- First major joint trial began at **Red Fort, Delhi, Nov 1945**.
- Famous three:
  - **Shah Nawaz Khan** — Muslim
  - **Prem Kumar Sehgal** — Hindu
  - **Gurbaksh Singh Dhillon** — Sikh
- Defence included **Bhulabhai Desai, Tej Bahadur Sapru, K.N. Katju, Jawaharlal Nehru, Asaf Ali**; Bhulabhai Desai was the leading defence counsel.
- Convicted and sentenced to **transportation for life**; Commander-in-Chief **Claude Auchinleck remitted the sentences** amid intense public agitation.
- Separate agitation followed the **seven-year sentence of INA officer Rashid Ali** in Calcutta.
- Three winter 1945–46 upsurge anchors: INA protests (**Nov 1945**) → Rashid Ali agitation (**Feb 1946**) → RIN ratings’ revolt (**18 Feb 1946**).

**Trap**
- Captain Lakshmi Sahgal = Rani Jhansi Regiment commander; **not one of the famous Red Fort three**.

##### 4. Partition and Independence: exact date ladder

| Date | Event | Exam-useful precision |
|---|---|---|
| **20 Feb 1947** | Attlee statement | Britain would transfer power no later than June 1948; Mountbatten subsequently replaced Wavell |
| **3 Jun 1947** | **Mountbatten / 3 June Plan** | Accepted partition route; Punjab/Bengal assemblies to decide partition; referenda in NWFP and Sylhet; two successor dominions/constituent assemblies if partition proceeded |
| **4 Jul 1947** | **Indian Independence Bill presented** in House of Commons | Not 3 June |
| **18 Jul 1947** | **Indian Independence Act received Royal Assent** | Legal basis for creation of India and Pakistan as independent Dominions |
| **15 Aug 1947** | “Appointed day” under the Act | Statutory date from which the two Dominions were constituted; India observes Independence Day on 15 Aug; Pakistan observes on 14 Aug |
| **17 Aug 1947** | **Radcliffe boundary awards published** | Boundaries became public after independence ceremonies |

**Radcliffe / Boundary Commissions**
- Separate **Punjab and Bengal Boundary Commissions**; **Sir Cyril Radcliffe** chaired both.
- Task: delimit the new boundaries primarily using contiguous Muslim/non-Muslim majority areas, while taking other relevant factors into account.
- **Radcliffe Committee/Commission ≠ constitutional drafting body**; direct UPSC function = boundary delimitation between India and Pakistan.

##### 5. High-yield 1932–47 sequence

`Communal Award (Aug 1932)` → `Poona Pact (Sep 1932)` → `C.R. Formula (1944)` → `Wavell Plan + Shimla (1945)` → `INA Red Fort trial (Nov 1945)` → `RIN revolt (Feb 1946)` → `Cabinet Mission (Mar–May 1946)` → `League withdrawal (Jul 1946)` → `Direct Action (Aug 1946)` → `Interim Govt (Aug/Sep 1946)` → `Attlee statement (Feb 1947)` → `3 June Plan` → `Independence Bill (4 Jul)` → `Act (18 Jul)` → `Independence (Aug)` → `Radcliffe Awards (17 Aug)`

#### B. Post-Independence Political Transition

> **Depth control:** only durable chronology + party–leader pairs needed to satisfy the two direct UPSC demands and plausible elimination extensions. No full narrative of post-1947 governance.

##### 1. First general election and opposition trap

- **First general election:** **1951–52**; first Lok Sabha had **489 seats**.
- Congress won **364** seats.
- **Communist Party of India (CPI) won 16 seats** and was the largest opposition party in the first Lok Sabha.
- **Swatantra Party cannot be the first-Lok-Sabha opposition**: it was founded only in **1959**.
- First formally recognised **Leader of Opposition in Lok Sabha: Ram Subhag Singh, 1969**.
- UPSC’s “minimum 75 members” formulation is **false**; do not convert it into a memorised 75-seat rule.

##### 2. Direct UPSC chronology: 1953 → 1955 → 1957 → 1961

| Year/date | Event | Elimination hook |
|---|---|---|
| **1 Aug 1953** | Air transport nationalisation took effect; Air India International/Indian Airlines structure created under Air Corporations framework | Earliest of the four UPSC events |
| **1 Jul 1955** | Imperial Bank of India became **State Bank of India** | Before Kerala communist government |
| **5 Apr 1957** | **E.M.S. Namboodiripad** ministry assumed office in Kerala | Landmark elected communist state government |
| **19 Dec 1961** | Portuguese rule ended in Goa; Goa came under Indian administration after liberation | Latest of the four |

**Mnemonic sequence:** **Air → Bank → EMS → Goa = 1953 → 1955 → 1957 → 1961**.

##### 3. States and territorial reorganisation — compact transition spine

- **1948:** Dhar Commission advised against immediate linguistic reorganisation; **JVP Committee** (Nehru–Patel–Pattabhi Sitaramayya) followed in 1948–49.
- **1 Oct 1953:** Andhra State created after the Telugu linguistic movement/Potti Sriramulu episode.
- **Aug 1953:** States Reorganisation Commission appointed — **Fazl Ali (chair), K.M. Panikkar, H.N. Kunzru**.
- **1956:** States Reorganisation Act implemented → **14 states + 6 centrally administered territories**.
- **1960:** Bombay State bifurcated → **Maharashtra + Gujarat**.
- **1963:** **Nagaland** inaugurated as a state.
- **1966:** Punjab reorganisation → Punjab + Haryana; Chandigarh became a Union Territory/shared capital arrangement.
- **1975:** **Sikkim** became India’s 22nd state after referendum and constitutional change.

**Depth rule:** know **sequence + one identifying association**, not administrative minutiae.

##### 4. Major party formations/splits and leader pairs

| Year | Party/development | Durable pair / distinction |
|---:|---|---|
| **1948** | Congress Socialist tendency leaves Congress as Socialist Party | **Jayaprakash Narayan, Acharya Narendra Dev** among key socialist leaders |
| **1951** | **Bharatiya Jana Sangh** founded | **Syama Prasad Mookerjee** |
| **1952** | Socialist Party + Kisan Mazdoor Praja Party → **Praja Socialist Party (PSP)** | **J.B. Kripalani** chairman; **Ashoka Mehta** general secretary |
| **1959** | **Swatantra Party** | **C. Rajagopalachari, Minoo Masani, N.G. Ranga, K.M. Munshi** |
| **1964** | Communist movement split | **CPI** and **CPI(M)** |
| **1969** | Congress split | **Congress (R)** associated with Indira Gandhi; **Congress (O)** organisational faction |
| **1977** | Janata Party forms Union government after general election | **Morarji Desai** became PM, 24 Mar 1977 — first non-Congress Union government |

##### 5. Political-transition sequence: minimum viable recall

`Independence/Partition (1947)` → `Republic (1950)` → `1st General Election (1951–52)` → `Andhra + SRC (1953)` → `SBI (1955)` → `States Reorganisation (1956)` → `EMS Kerala (1957)` → `Swatantra (1959)` → `Maharashtra/Gujarat (1960)` → `Goa (1961)` → `Nagaland (1963)` → `CPI split (1964)` → `Congress reverses in states (1967)` → `LoP recognition + Congress split (1969)` → `Emergency (1975)` → `Janata government (1977)`

### 6. UPPCS Extension Layer

Only additional UPPCS-heavy recall beyond the common UPSC core:

- **1945–46 sequence precision**
  - Wavell Plan / Shimla Conference = **1945**.
  - UK Parliamentary Delegation, Delhi = **Jan 1946**.
  - RIN revolt = **18–23 Feb 1946**.
  - Cabinet Mission arrival = **24 Mar 1946**.
  - Direct Action Day = **16 Aug 1946**.
  - Interim Government **announced 24 Aug**, **formed 2 Sep**; League entered in **Oct 1946**.
- **INA recall**
  - Trial venue = **Red Fort, Delhi**.
  - Famous three = **Shah Nawaz Khan + Prem Kumar Sehgal + Gurbaksh Singh Dhillon**.
  - Rani Jhansi Regiment = **Captain Lakshmi Swaminathan/Sahgal**.
  - C.R. Formula = **C. Rajagopalachari**.
- **1947 recall**
  - Mountbatten Plan = **3 Jun**.
  - Independence Bill = **4 Jul**; Royal Assent = **18 Jul**.
  - Punjab/Bengal boundary commissions = **Cyril Radcliffe**.
  - Awards published = **17 Aug**.
- **Do not add large UPPCS-only post-1947 inventories**: the canonical 2018–25 set has no direct child-level demand here.

### 7. Cross-Topic / Cross-Subtopic Traps

- **Partition of Bengal (1905)** ≠ **Partition of India (1947)**. Search terms can easily retrieve the wrong “partition”.
- **Communal Award (1932)** ≠ **Poona Pact (1932)**: separate electorate proposal vs joint electorate with enhanced reserved seats.
- **148** provincial reserved seats under Poona Pact; base/Spectrum “147” is overridden by the primary pact text.
- **C.R. Formula (1944)** ≠ Cripps Offer (1942) ≠ Wavell Plan (1945) ≠ Cabinet Mission (1946).
- **Cabinet Mission constitutional architecture** belongs primarily to Constitutional Development; here retain only the **breakdown → Direct Action → Interim Government → Partition** chain.
- **Interim Government:** **announced 24 Aug 1946**, **took office 2 Sep 1946**.
- **INA first phase (Mohan Singh)** ≠ **Subhas Bose leadership phase**; Bose did not originate the first INA.
- **Rash Behari Bose** ≠ **Rashid Ali**; former linked to IIL/INA organisation, latter an INA officer whose sentence triggered a 1946 Calcutta agitation.
- **Lakshmi Sahgal** ≠ one of the famous Red Fort three.
- **3 Jun 1947 = Mountbatten Plan**, not presentation of Independence Bill.
- **4 Jul = Bill presented**; **18 Jul = Royal Assent**; **15 Aug = appointed day**; **17 Aug = Radcliffe Awards published**.
- Pakistan’s **14 Aug commemoration** should not be confused with the Act’s statutory **15 Aug appointed day**.
- **First Lok Sabha largest opposition party = CPI**, not Swatantra; Swatantra was founded only in 1959.
- **Swatantra** became a major parliamentary opposition force later; that does not retroactively apply to 1951–52.
- UPSC’s post-Independence chronology: **Air India (1953) → SBI (1955) → EMS Kerala (1957) → Goa (1961)**.
- Present-day LoP rules/mechanics belong to Polity; retain only the historical PYQ fact: first recognised Lok Sabha LoP in **1969** and “75 members” is false.

### 8. Correction / Verification Register

#### CORRECT

| Source/base wording | Corrected canonical wording for synthesis | Resolution basis |
|---|---|---|
| Communal Award described only as an award “for depressed classes” | Award dealt with multiple communal/special-interest representations; **Depressed Classes separate electorate** is the PYQ-relevant feature | Spectrum + standard historical record |
| Poona Pact: **71 → 147** provincial seats | **71 → 148** provincial reserved seats | Primary text of Poona Pact / Ambedkar writings |
| Subhas Bose “took command of INA in April 1943” | Leadership transferred **July 1943**; Bose became Supreme Commander **25 Aug 1943** | Spectrum chronology |
| Red Fort three “given hard imprisonment” | Convicted; **transportation for life**, later remitted by C-in-C Claude Auchinleck | Spectrum + Ghatna Chakra |
| Captain Lakshmi placed loosely under “INA trials” and released only after independence | Keep separate from famous joint Red Fort trial; she led Rani Jhansi Regiment and returned to India in 1946 | Historical/official biographical material |
| Desai–Liaquat: League “would abandon demand of separate nation” | Remove this claim; retain parity/interim-government draft terms only | Spectrum does not support abandonment condition |
| “June 3, 1947: Independence Bill introduced” | **3 Jun = Mountbatten Plan; 4 Jul = Independence Bill presented** | UK Parliamentary record |
| Act implies power to Pakistan on 14 Aug | Indian Independence Act’s **appointed day = 15 Aug 1947** for constitution of both Dominions; Pakistan observes 14 Aug as Independence Day | Statutory text + historical practice distinction |
| Radcliffe report “released Aug 15” | **Boundary awards published 17 Aug 1947** | UK archival/primary-source chronology |
| `UPPCS-2024-GS1-Q016` canonical key = A (4,3,2,1) | Evidence gives **B (4,1,2,3)**: UK delegation → RIN revolt → Cabinet Mission → Interim Govt | Ghatna Chakra source question/explanation; answer-integrity defect |
| `UPPCS-2019-GS1-Q019` parsed option/year table | Original item: Indian Navy Act–1927; CDM–1930; 2nd RTC–1931; Communal Award–1933; **D is mismatch because Award = 1932** | Ghatna Chakra source; canonical record correctly flagged review-required |

#### VERIFY

- **None unresolved.** All material corrections that affect answerability were resolved against a higher-authority or clearer reference.
- The canonical corpus itself should nevertheless retain its frozen status; this Source Pack records local synthesis overrides rather than silently rewriting corpus data.

#### OMIT

- Speculative base-note motive that Shimla Conference occurred because Churchill was “scared to lose elections”.
- Unsupported Desai–Liaquat “League abandons Pakistan” condition.
- Detailed Cabinet Mission federal/grouping mechanics beyond what is needed to answer the 1946 transition PYQs.
- `UPSC-CSE-2011-GS1-Q068` (Usha Mehta): INA appears only as a distractor; decisive knowledge = Quit India/Congress Radio.
- `UPSC-CSE-2015-GS1-Q051`: detailed Cabinet Mission design → Constitutional Development sibling.
- `UPSC-CSE-2025-GS1-Q074`: Harijan uplift after Poona Pact → principally Gandhian/anti-untouchability demand.
- `UPPCS-2025-GS1-Q007`: Poona Pact embedded in Gandhian chronology → Gandhian Phase sibling.
- `UPPCS-2022-GS1-Q016`: BSP/SP/TDP/TMC formation chronology → later contemporary party history, outside “early post-1947” depth.
- `UPPCS-2024-GS1-Q038`: post-Independence city/industrial-era matching → not political transition.
- `UPPCS-2025-GS1-Q006`, `UPPCS-2025-GS1-Q040`: “Partition of Bengal” = 1905, owned by Early Nationalism/Swadeshi.

### 9. Supplement Decision

`NO_SUPPLEMENT_NEEDED`

- A genuine **base-note gap** existed for **Post-Independence Political Transition**.
- It has been filled inside this pack using only demand-linked material from Spectrum and primary/official anchors (ECI, RBI, Civil Aviation, Kerala government/Goa government, Parliament/UK statutory records where necessary).
- No remaining factual gap materially prevents answering the identified canonical PYQs.

### 10. Synthesis Handoff

- **All child subtopics covered:** 2/2.
- **Unresolved VERIFY items:** none.
- **Corrections that must override older wording:**
  - Poona Pact = **148**, not 147.
  - Subhas Bose INA leadership transfer = **July 1943**; Supreme Commander = **25 Aug 1943**, not April.
  - Red Fort three sentence = **transportation for life; later remitted**, not generic “hard imprisonment”.
  - **3 Jun Plan → 4 Jul Bill → 18 Jul Act → 15 Aug appointed day → 17 Aug Radcliffe Awards**.
  - `UPPCS-2024-GS1-Q016`: use **4→1→2→3 / option B** for factual chronology despite frozen canonical key A.
  - `UPPCS-2019-GS1-Q019`: treat as malformed canonical record; original question confirms Communal Award **1932**.
- **Material explicitly excluded:** present-day constitutional mechanics; full Cabinet Mission/Constituent Assembly design; broad Gandhian movement narrative; full Subhas/Forward Bloc biography; 1905 Bengal Partition; later/current party-politics inventories.
- **Synthesis weighting:** Child A should occupy the larger learner-facing note block because it carries **11 direct canonical PYQs (3 UPSC + 8 UPPCS)**. Child B should remain compact: **2 direct UPSC PYQs, 0 UPPCS**, with only the minimum chronology/party-pair support needed for elimination.

#### Source anchors used in this pack

- **Taxonomy:** `PRE-HISTCULT__TAXONOMY_GATEWAY.md`.
- **Canonical questions/answers/status:** `canonical-pyq-v2-final.zip` + Canonical PYQ Gateway; semantic classification performed question-by-question because the corpus has no reliable subject taxonomy tags.
- **Primary content:** `PRE__HIS__BASE__SELF__2026__History-Modern-India__v01.md`.
- **Reference correction/gap-fill:** Rajiv Ahir, *A Brief History of Modern India* (Spectrum, 2020), only relevant sections.
- **Independent PYQ/source check:** Ghatna Chakra 2026 History compilation, especially Communal Award/Poona Pact, Interim Government, Partition and chronology pages.
- **Primary/official verification used only for disputed/high-risk facts:** Poona Pact primary text in Ambedkar writings; UK Parliament/Indian Independence Act for July–August 1947 dates; ECI for early Lok Sabha election data; RBI for SBI date; official civil-aviation, Kerala and Goa records for the 1953–61 chronology.

---

## SUBJECT AUDIT — FINAL HANDOFF

**History & Culture coverage:** `6/6 parent topics` · `29/29 child taxonomy nodes`

**Status:** `VERIFY — NON-BLOCKING`

**Claude import readiness:** `READY_WITH_VERIFY_GUARDRAILS`

Use this file as the complete History & Culture synthesis substrate for the existing Notes Reader.

### Import requirements

Before considering History & Culture complete, verify:

- 29/29 child nodes represented exactly once;
- all pack-level `CORRECT` entries propagated;
- all `OMIT` material excluded;
- unresolved `VERIFY` items remain isolated or are omitted from learner-facing assertions;
- no malformed/review PYQ answer is silently encoded as fact;
- cross-topic duplication removed while useful cross-links remain;
- dynamic current-affairs wrappers are separable from permanent notes;
- PYQ/Insights metadata preserves relevant canonical IDs;
- History & Culture cross-links correctly to existing Polity/Economy content where materially relevant;
- architecture, sync, editing, highlights, recall, progress, search, PWA/offline and exports are reused without redesign.

Do **not** rebuild the reader shell for this subject.
