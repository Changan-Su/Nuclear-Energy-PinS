# The Power of Nuclear Energy — PinS Digital Project

## Team Members

- **James Bradley** — `james.r.bradley@durham.ac.uk`
- **Lucy Desmulliez** — `lucy.desmulliez@durham.ac.uk`
- **Dylan Huish** — `dylan.huish@durham.ac.uk`
- **Magnus Muir** — `magnus.muir@durham.ac.uk`
- **Zixuan Zhu** — `zixuan.zhu@durham.ac.uk`

## Project Content

This website is a static, browser-ready educational digital object for a-level students, produced for the Durham Physics in Society (PinS) Digital Media Project, presented in an **Apple-like website style** (clean layout, bold typography, and section-based storytelling).  
It presents a structured learning journey around nuclear energy and related energy systems.

Core learning modules include:

- Nuclear fission fundamentals (physics, chain reaction, control, safety history, future fission)
- Fusion fundamentals (confinement types, key equations, fusion vs fission)
- Molten Salt Reactors (MSR concepts, operation, recycling potential, safety and engineering trade-offs)
- Renewable energy pathways (solar, wind, hydro, geothermal, comparative analysis)
- Fossil fuel comparison (efficiency, environmental impact, safety, economic cost)
- **Interactive quizzes and visual learning blocks embedded across sections**
- **An AI-assisted Q&A module for guided, domain-focused exploration**

## Tech Stack and Implementation

### Stack

- Frontend: `HTML` + `CSS` + vanilla `JavaScript`
- Content source: `material.json` (data-driven section configuration)
- Assets: local media under `docs/uploads/`
- AI Chat: OpenAI-compatible API endpoint (proxy-ready), front-end retrieval pipeline
- Deployment model: static hosting (e.g., GitHub Pages)

### How It Is Implemented

1. **Static viewer architecture**
   - `index.html` renders the full site directly in the browser.
   - No server-side rendering is required for normal page access.

2. **Data-driven content rendering**
   - Text, section ordering, cards, quiz data, references, and media bindings are configured in `material.json`.
   - This keeps content updates separate from layout logic.

3. **Modular front-end scripts**
   - JavaScript modules handle section rendering, template behavior, quiz interactions, and media display.
   - This supports iterative updates without rewriting the whole page.

4. **AI Q&A integration**
   - The chat module follows a retrieval-augmented pattern:
     - query scope check
     - relevant content retrieval from local knowledge chunks
     - model response generation via OpenAI-compatible API
     - response formatting with source handling

5. **Run locally**
   - Open `index.html` directly in a modern browser, or
   - Start a local static server (recommended):
     - `npx serve .`

## Notes

- This `docs` folder is the deliverable-facing static site package.
- Media references and content should be finalized before your final submission zip is produced.

## WYSIWYG Editor (Separate Project)

To support producing this project, we also developed a separate WYSIWYG content editor:

- [Apple Style Website Engine — CMS Editor](<REPO_URL>)
  - For content authoring and layout iteration
  - For maintaining `material.json` and media configuration
  - Can export/generate the viewer-only static site for deployment (this `docs/` package)
