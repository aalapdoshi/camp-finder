# About & Homepage Content Update — Implementation Plan

**Overall Progress:** `100%`

**Implementation status:** 🟩 All planned copy blocks are reflected on `about.html` and `index.html` (verify in browser after deploy).

## TLDR

Interleave Crystal Hoppe’s narrative with the existing About page story; set the main heading to **Welcome**; give **Crystal, Komal, and Aalap** each a short “About [name]” subsection (same pattern, no horizontal rules). Refresh the **homepage hero subtitle** and **trust section** using language aligned with the About page, with links to **About**. Keep the **feedback** invitation on About.

## Critical Decisions

- **Interleaving:** Crystal’s voice leads (Welcome → spreadsheet → Why this exists → What this has become → Thank you); **What this has become** keeps the compact product bullet list; **From Komal and Aalap** follows Crystal’s sign-off; then **Who we are** with parallel bios.
- **`<h1>`:** “Welcome” (not “About This Project”).
- **Bios:** Three parallel **`<h3>`** blocks: About Crystal, About Komal, About Aalap — each one short paragraph; Crystal’s longer personal bio is reflected in the story above, not repeated in full under “About Crystal.”
- **No `<hr>`** between sections (including before About Crystal).
- **Homepage:** Hero subtitle + trust blurb echo About themes; both link to `about.html`.
- **Spreadsheet URL:** Use Crystal’s canonical link: `https://docs.google.com/spreadsheets/d/1FfiziYg5Ow-BlHqFRSWl2d3I-Uh7iy8W53lmpLSVfEU/edit?usp=sharing`

## Interleave map (structure only)

| Block | Source |
|-------|--------|
| `<h1>` Welcome | New |
| Opening paragraphs + spreadsheet | Crystal (Welcome) |
| Bridge before Why this exists | None (addition/replacement framing is in **From Komal and Aalap**) |
| `<h2>` Why this exists | Crystal |
| `<h2>` What this has become | Crystal + **interleave** product bullet list after partnership sentences |
| `<h2>` Thank you | Crystal (closing can include “—Crystal Hoppe” as plain text, no rule) |
| `<h2>` From Komal and Aalap | Komal & Aalap narrative (after Crystal sign-off, before Who we are) |
| `<h2>` Who we are | Section title |
| `<h3>` About Crystal | **Short** bio (condensed from Crystal’s “About Crystal”) |
| `<h3>` About Komal | Short bio (from current About) |
| `<h3>` About Aalap | Short bio (from current About) |
| d. Studio line | One line + link (from current About) |
| Feedback | Keep current invitation paragraph |

## Tasks

- [x] 🟩 **Step 1:** Replace `about.html` main content with the **Combined About copy** below (semantic HTML: `h1`–`h3`, lists, links, `target`/`rel` on external links).
- [x] 🟩 **Step 2:** Update `index.html` hero subtitle and trust section per **Homepage snippets** below; ensure `about.html` links use clear CTAs.
- [x] 🟩 **Step 3:** Adjust `css/styles.css` only if new headings need spacing (prefer existing `.about-content` patterns).
- [x] 🟩 **Step 4:** Proofread in browser; confirm meta description still accurate or tweak one line.

---

## Combined About page copy (draft for your review)

Below is the full interleaved text as it would appear on the About page (you can edit wording before implementation).

---

# Welcome

About ten years ago, this started as a simple spreadsheet.

At the time, my youngest son was still a toddler, and I was trying to figure out what summer would look like once both of my kids were out of daycare and in elementary school. I started asking other parents what they did for childcare in the summer and quickly realized the answer was camps. A lot of camps.

Then I did the math.

Between registration timelines, weekly scheduling, and cost, summer planning felt overwhelming. Camps opened at different times, filled quickly, and required more coordination than I expected. I needed a way to keep it all straight, so I built a spreadsheet for myself.

Each year, I added more camps, more details, and more notes. I shared it with a few friends, then a few more. Over time, it spread across the Ann Arbor parent community. What started as a personal tool became something much bigger.

Today, that spreadsheet has been shared thousands of times. Every year, parents reach out or stop me to say it helped them plan their summer, saved them hours of work, or made the process feel manageable. That’s why I’ve kept it going.

For anyone who prefers the original format or wants to see where this all started, you can still access the spreadsheet here:  
[Google Sheet — Summer camp list](https://docs.google.com/spreadsheets/d/1FfiziYg5Ow-BlHqFRSWl2d3I-Uh7iy8W53lmpLSVfEU/edit?usp=sharing)

## Why this exists

Summer camp registration can feel intense.

Most camps open between January and March, often at very specific times. The most popular ones can fill within minutes. Planning ahead is not optional if you are trying to piece together a full summer.

This resource was always meant to help parents:

- Get organized early  
- Understand their options  
- Reduce stress during registration season  
- Avoid last-minute scrambling  

I’m not a camp expert. I’m just a parent who has been doing this for a long time and wanted to make it easier for others.

## What this has become

Over the years, the spreadsheet has grown into a widely used community resource. But as it grew, it also became harder to navigate.

That’s where this next chapter comes in.

I’ve been lucky to partner with Komal and Aalap Doshi to turn this into a more user-friendly, searchable tool. They brought both the technical expertise and a clear understanding of what parents actually need.

Through their work at d. Studio, they build practical, community-centered tools, and this is exactly that.

Because of their work, parents can now:

- Filter camps by age, interest, and schedule  
- Explore options more easily  
- Save favorites and compare choices  
- Plan their summer with a simple summer plan view  

## Thank you

To the thousands of parents who have used, shared, and contributed to this list over the years, thank you. This has always been a community-driven resource.

And to Komal and Aalap, thank you for being thoughtful partners in bringing this to life in a new way. I’ve really appreciated working together on this.

—Crystal Hoppe

------

From Komal and Aalap
We found Crystal's spreadsheet the way most parents in Ann Arbor do. Someone forwarded it to us. For years after that, it was how we planned our summers. It saved us hours and probably kept us from missing a registration more than once.
A few summers in, we started wishing the information was easier to filter. Which camps fit our kids' ages, which weeks were already booked up, what was near the house, what overlapped with our work schedules. The spreadsheet had all of it, but scrolling it on a phone at 7am before a registration window opened was not fun.
That wish turned into this.
We built A2CampFinder as an addition to Crystal's work, not a replacement for it. You can still open her original sheet any time. Some parents prefer it, and that's fine. What we wanted was a second way in: something that would let you filter by age, interest, and schedule, save the camps you liked, compare options side by side, and build a summer plan you could share with a co-parent or grandparent.
We're still building. If something is missing, broken, or you wish it did more, tell us through the Feedback link at the bottom of the page. The list of things we want to add is already long, but what you ask for moves to the top.
Summer planning for kids is hard. Our goal is to make it a little less so.

## Who we are

### About Crystal

Crystal Hoppe is an Ann Arbor parent and the creator of the summer camp spreadsheet families have shared across the community for over a decade. She works in advancement at the University of Michigan’s Stephen M. Ross School of Business.

### About Komal

Komal Doshi leads electrification and mobility at Walker Miller Energy Services and previously worked on innovation initiatives at Ann Arbor Spark. She and Aalap are long-time Ann Arbor parents who care about building practical tools for the community.

### About Aalap

Aalap Doshi is Director of IT at ICPSR and teaches at the University of Michigan School of Information. He and Komal partnered with Crystal to build this site so families could explore the camp list more easily.

Komal and Aalap run [d. Studio](https://topaz-objective-b71.notion.site/d-Studio-142e07d99c47808098bcca62dd59f28e), where they work on community-centered projects like this one.

If there’s something you wish this tool could do or something that would make it more useful, please tell us using the **Feedback** button at the bottom of the page—your input shapes what we build next.

---

## Homepage snippets (draft)

**Hero subtitle (replace current line under the main title):**

> From a parent-built spreadsheet shared thousands of times—to a searchable way to plan summer in Ann Arbor. [Read our story →](about.html)

*(Alternative shorter line if you prefer less text in the hero:)*

> Built from Crystal Hoppe’s community camp list—now easier to search and plan. [Our story →](about.html)

**Trust section (replace current heading + paragraph):**

**Heading:** Trusted by Ann Arbor families

**Paragraph:**

> For over a decade, parents have used Crystal Hoppe’s summer camp spreadsheet to get organized before registration season. Komal and Aalap Doshi partnered with Crystal to build this site so you can filter camps, save favorites, and plan your summer with less friction—without replacing the original sheet. [Read the full story →](about.html)

---

## File summary

| File | Action |
|------|--------|
| `about.html` | Replace `.about-content` body with structured HTML from combined copy |
| `index.html` | Update hero subtitle + `.trust-section` copy; add About link(s) |
| `css/styles.css` | Optional spacing tweaks for new `h3` under About |
