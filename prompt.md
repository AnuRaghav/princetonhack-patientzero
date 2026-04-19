You are modifying an existing medical training web app to reflect a **new product pivot**.

## Product pivot
This app is no longer centered around a broad AI standardized patient simulation experience.

Instead, we are now focusing on a much narrower MVP:

- only **2 curated cases**
- each case has a **fixed patient**
- each case has a **fixed flow**
- each case lives at a **fixed URL**
- the experience should feel more like a **competitive, deterministic puzzle/challenge**
- inspired by the feeling of:
  - Zetamac
  - Wordle
  - LeetCode
  - fast, repeatable, skill-based drills

We still want to keep the broader simulation screens for the future, but for this task we are introducing **2 special curated case routes** and making the homepage reflect that new focus.

---

# Scope of this task
Implement the following:

1. Update the **homepage**
2. Create **2 curated case screens** with fixed URLs
3. Keep the rest of the simulation/case system intact for now
4. For these 2 curated screens, make them a **blank slate** for now:
   - include the **3D body model area**
   - include the **text-based user/patient conversation area**
   - keep the layout ready for future puzzle/test logic
5. Do not build the full gameplay logic yet
6. Do not overengineer the backend
7. Use clean mock data / configuration for the 2 curated cases

---

# Product framing for the UI
The app should now present itself more like:

**Competitive clinical case drills**
or
**Curated medical encounter challenges**

It should feel:
- focused
- sharp
- competitive
- deterministic
- high signal
- minimal but premium

The homepage should communicate that there are currently **2 featured curated cases** to attempt.

---

# Main UX goals

## Homepage
Redesign the homepage so it clearly pushes users toward these 2 curated cases.

The homepage should:
- present the product as a focused medical challenge platform
- feature exactly **2 curated cases**
- feel more like challenge selection than an open simulation sandbox
- still allow room for future/general simulations elsewhere if needed, but the curated cases should dominate the page

### Homepage content requirements
Include:
- strong hero section
- headline/subheadline about curated medical encounter drills
- two featured case cards
- each card should have:
  - title
  - short description
  - difficulty
  - topic/system
  - estimated time
  - button to enter case
- make these 2 cases the primary CTA on the page

### Suggested homepage tone
Use language like:
- Curated case challenges
- Deterministic medical drills
- Train on focused encounters
- Master high-yield case patterns
- Competitive clinical reasoning
- Two featured cases available now

Avoid old language centered around:
- immersive AI SP platform
- broad AI patient simulation
- full virtual patient replacement
- open-ended realism-first messaging

---

## Curated case screens
Create 2 dedicated curated case pages with fixed URLs.

These pages should currently be a **blank slate shell** for the future puzzle/test experience.

### Important
Do not build complex interaction logic yet.
Do not fully implement scoring or puzzle mechanics yet.
Just create the structure and page shell.

### Each curated case page should include
A clean two-panel or split layout that contains:

#### 1. 3D body model area
- a large section reserved for the body / anatomy model
- if an existing 3D model component already exists, reuse it
- if it does not cleanly fit yet, create a placeholder container that clearly marks this area for the model
- this section should visually feel important

#### 2. Text conversation area
- a panel for text-based user/patient conversation
- use a chat/transcript-style UI shell
- include placeholder messages or empty-state content
- this is not a full chat system yet, just a clean blank slate container ready for future implementation

#### 3. Case header / metadata
At the top of each curated case page, include:
- case title
- short one-line case summary
- metadata badges such as difficulty / topic / time
- optional “curated case” badge

#### 4. Future-action area
Include a simple placeholder action area such as:
- Start Challenge
- Begin Encounter
- Coming next: scoring / timed logic / structured prompts

This should signal that the page is intentionally staged for the next build step.

---

# Fixed routes to create
Create two fixed curated routes. Use whatever routing pattern best matches the existing app, but preserve clean semantics.

Preferred route structure:

- `/cases/chest-pain-workup`
- `/cases/acute-abdominal-pain`

If the existing router structure makes another equivalent pattern cleaner, use that, but keep the URLs readable and fixed.

---

# Curated case content to use

## Case 1
Slug: chest-pain-workup
Title: Chest Pain Workup
Short description: A focused, high-yield chest pain encounter with a fixed patient and deterministic challenge flow.
Difficulty: Medium
Estimated time: 6 min
Topic: Cardiology

## Case 2
Slug: acute-abdominal-pain
Title: Acute Abdominal Pain
Short description: A curated abdominal pain scenario designed for structured reasoning and repeatable testing.
Difficulty: Medium-Hard
Estimated time: 7 min
Topic: Gastrointestinal

You can improve the writing slightly, but keep the same meaning.

---

# Architecture / implementation guidance

## Data setup
Create a small central config or mock-data file for these 2 curated cases, for example:
- `lib/curatedCases.ts`
- or `data/curatedCases.ts`

This file should store:
- slug
- title
- description
- difficulty
- estimated time
- topic
- fixed route

Use this data both on the homepage and on the curated case pages where appropriate.

## Page implementation
Please:
- inspect the existing homepage and current simulation pages
- reuse existing layout primitives/components where it makes sense
- do not break existing general simulation flows
- build these curated pages as additive, clean routes
- keep the codebase organized and easy to extend later

## UI style
Use the app’s current design system if one exists, but push it toward:
- cleaner hierarchy
- better challenge-card presentation
- premium modern spacing
- strong visual separation between the model area and transcript/chat area

For the curated case screen layout, aim for:
- desktop: split layout
- mobile: stacked layout

---

# What to do with the existing simulation pages
Do not delete them.
Do not fully refactor them.
Leave them intact unless small routing or copy changes are needed.

The curated cases are a **new primary path** on top of the older system.

---

# Deliverables
Please implement all of the following:

1. Redesign the homepage around the 2 curated cases
2. Add a small curated-case data/config source
3. Create the fixed curated routes:
   - `/cases/chest-pain-workup`
   - `/cases/acute-abdominal-pain`
4. Build the case screens as blank-slate shells with:
   - header/meta
   - 3D model area
   - text conversation area
   - placeholder action area
5. Keep the rest of the app intact
6. Use clean, production-quality code

At the end, provide a concise summary of:
- files changed
- new routes added
- data/config added
- what was intentionally left as placeholder for the next step

Design note:
Make the homepage and curated case pages feel more like a polished challenge product than a hospital dashboard. The homepage should feel like a focused “pick your drill” screen. The curated case page should feel like a premium blank challenge workspace with strong layout, clean empty states, and obvious future extensibility.