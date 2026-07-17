# Launch Submission Checklist

## Preconditions — must be complete before any submission

All three preconditions must be live and verified before proceeding to channel steps.

**Precondition 1 — npm packages live**
- [ ] `agentoolbox-mcp@0.1.3` published to npm
  - Verify: `npm info agentoolbox-mcp version` returns `0.1.3`
  - Smoke test: `npx -y agentoolbox-mcp --help` (or connect an MCP client and confirm tools list)
- [ ] `agent-toolbox-sdk@1.0.5` published to npm
  - Verify: `npm info agent-toolbox-sdk version` returns `1.0.5`

**Precondition 2 — /docs page live**
- [ ] `https://agent-toolbox.ai/docs` (or equivalent docs path) is publicly accessible
  - Verify: HTTP 200, all 26 endpoints documented, code examples render correctly
  - Check canonical install command on docs page: `npx -y agentoolbox-mcp`

**Precondition 3 — MCP registry server.json submitted**
- [ ] `server.json` submitted to the official MCP registry (modelcontextprotocol/servers GitHub repo
  or equivalent registry submission process)
  - Fields required: `name`, `description`, `install.command` (`npx -y agentoolbox-mcp`),
    `homepage`, `license`, `categories`
  - Verify: PR or submission acknowledged; entry visible in registry

---

## Channel Submissions (in order)

Work through these in order. Each channel links to its submission URL and lists the exact fields
needed. Copy from `directory-listings.md` unless a field-specific override is noted.

---

### 1. MCP Registry

**URL:** https://github.com/modelcontextprotocol/servers (PR to add entry) or the registry's current
submission path.

**Fields:**
- `name`: `agentoolbox-mcp`
- `short description` (≤160 chars): use **MCP Registry short blurb** from `directory-listings.md`
- `long description`: use **MCP Registry long blurb** from `directory-listings.md`
- `install.command`: `npx -y agentoolbox-mcp`
- `homepage`: `https://agent-toolbox.ai`
- `repository`: `https://github.com/solhammer/agentoolbox`
- `license`: (confirm from package.json, e.g. MIT)
- `categories`: `["security", "finance", "developer-tools", "compliance"]`

**Steps:**
1. Fork the registry repo (if PR-based).
2. Add entry following the repo's contributing guide.
3. Submit PR; note PR URL here for tracking.
4. Check back after CI passes and maintainer reviews.

---

### 2. Smithery

**URL:** https://smithery.ai/submit (or current submission form link)

**Fields:**
- **Name:** `Agentoolbox`
- **npm package:** `agentoolbox-mcp`
- **Short description (≤160 chars):** use **Smithery short blurb** from `directory-listings.md`
- **Long description:** use **Smithery long blurb** from `directory-listings.md`
- **Install command:** `npx -y agentoolbox-mcp`
- **Homepage:** `https://agent-toolbox.ai`
- **GitHub:** `https://github.com/solhammer/agentoolbox`
- **Categories / tags:** Developer Tools, Security, AI Agents

**Steps:**
1. Navigate to the submission form.
2. Paste fields from above.
3. Submit and save the confirmation/receipt URL.

---

### 3. mcp.so

**URL:** https://mcp.so/submit (or current listing submission path)

**Fields:**
- **Server name:** `agentoolbox-mcp`
- **Short description (≤160 chars):** use **mcp.so short blurb** from `directory-listings.md`
- **Full description:** use **mcp.so long blurb** from `directory-listings.md`
- **Install:** `npx -y agentoolbox-mcp`
- **Homepage:** `https://agent-toolbox.ai`
- **Repository:** `https://github.com/solhammer/agentoolbox`
- **Tags:** security, finance, agents, compliance, mcp

**Steps:**
1. Create an account if needed (note credentials securely).
2. Fill submission form with above fields.
3. Submit; confirm the listing appears in search.

---

### 4. Glama

**URL:** https://glama.ai/mcp/submit (or current submission path)

**Fields:**
- **Package name:** `agentoolbox-mcp`
- **Display name:** `Agentoolbox`
- **Short description (≤160 chars):** use **Glama short blurb** from `directory-listings.md`
- **Description:** use **Glama long blurb** from `directory-listings.md`
- **Install command:** `npx -y agentoolbox-mcp`
- **Website:** `https://agent-toolbox.ai`
- **Source:** `https://github.com/solhammer/agentoolbox`

**Steps:**
1. Submit via form or GitHub-based submission (check current Glama process).
2. Confirm listing appears and install command is correct.

---

### 5. PulseMCP

**URL:** https://pulsemcp.com/submit (or current submission path)

**Fields:**
- **Name:** `Agentoolbox`
- **npm package:** `agentoolbox-mcp`
- **Short description (≤160 chars):** use **PulseMCP short blurb** from `directory-listings.md`
- **Description:** use **PulseMCP long blurb** from `directory-listings.md`
- **Install:** `npx -y agentoolbox-mcp`
- **Homepage:** `https://agent-toolbox.ai`
- **GitHub:** `https://github.com/solhammer/agentoolbox`
- **Tags / categories:** agents, security, finance, developer-tools, compliance

**Steps:**
1. Navigate to submission form.
2. Paste fields.
3. Submit and record confirmation.

---

### 6. Product Hunt

**URL:** https://www.producthunt.com/posts/new

**Fields (from `launch-producthunt.md`):**
- **Product name:** `Agentoolbox`
- **Tagline:** `26 deterministic safety gates for AI agents` (55 chars)
- **Description:** paste from **Product Hunt Description** section of `launch-producthunt.md`
- **Topics:** Artificial Intelligence, Developer Tools, APIs, Security, Open Source, TypeScript, Productivity
- **Links:** Website `https://agent-toolbox.ai` · GitHub `https://github.com/solhammer/agentoolbox`
- **Thumbnail / OG image:** required (export a 240×240 logo PNG before submitting)
- **Gallery images:** minimum 1 screenshot (see Gallery / Media Notes in `launch-producthunt.md`)

**Steps:**
1. Schedule the post for a Tuesday–Thursday, before 12:01 AM PT (product hunts reset at midnight PT).
2. Paste all fields; upload thumbnail + gallery images.
3. Enable "Notify followers" if applicable.
4. After going live, immediately post the **Maker's First Comment** from `launch-producthunt.md`.
5. Share the Product Hunt link in the HN thread and X thread.
6. Monitor comments and respond within the first 2 hours.

---

### 7. Hacker News — Show HN

**URL:** https://news.ycombinator.com/submit

**Fields (from `launch-hackernews.md`):**
- **Title:** `Show HN: Agentoolbox – 26 deterministic, offline pre-action gates for AI agents (REST/MCP)`
- **URL:** `https://agent-toolbox.ai`
- **Text:** leave blank (HN Show HN posts link to the URL; the body goes in a self-comment)

**Steps:**
1. Submit the post with title + URL above. Do NOT paste the body as the submission text — HN Show HN
   convention is to link to the site and use a top-level comment for the explanation.
2. Immediately after submission, post the **Body** from `launch-hackernews.md` as a top-level comment
   on your own thread.
3. Post the **First Technical Comment** from `launch-hackernews.md` as a reply to your own body comment.
4. Monitor for the first 2 hours and respond to technical questions promptly.
5. Note: optimal HN submission windows are weekday mornings (8–10 AM ET). Avoid Monday and Friday.

---

### 8. X / Twitter

**Steps (from `launch-social.md`):**
1. Post **Post 1 (anchor)** and start a thread.
2. Reply to Post 1 with **Post 2** through **Post 8** in sequence.
3. Pin Post 1 to your profile for launch day.
4. After each directory listing goes live, quote-tweet Post 1 linking to the listing.
5. Reply with the Product Hunt link once that post is live.

---

### 9. Reddit — r/LocalLLaMA

**URL:** https://www.reddit.com/r/LocalLLaMA/submit

**Fields (from `launch-social.md`):**
- **Post type:** Text
- **Title:** `Agentoolbox — 26 deterministic pre-action gates for AI agents (MCP + REST, offline, free tier)`
- **Body:** paste **r/LocalLLaMA body** from `launch-social.md`

**Steps:**
1. Check r/LocalLLaMA posting rules (no self-promotion spam; frame as a technical share).
2. Respond to all top-level comments within the first 3 hours.
3. Cross-link to the HN thread in a comment once both are live.

---

### 10. Reddit — r/mcp

**URL:** https://www.reddit.com/r/mcp/submit

**Fields (from `launch-social.md`):**
- **Post type:** Text
- **Title:** `Agentoolbox MCP server — 26 safety gate tools for agents (deterministic, offline, free)`
- **Body:** paste **r/mcp body** from `launch-social.md`

**Steps:**
1. Post after r/LocalLLaMA post is live (avoids appearing as coordinated spam).
2. Link the two Reddit threads to each other in comments.
3. Respond to technical questions about MCP integration promptly.

---

## Post-Launch Tracking

After all submissions are live, record the following:

| Channel | Submission URL / Link | Status | Notes |
|---|---|---|---|
| MCP Registry | | | |
| Smithery | | | |
| mcp.so | | | |
| Glama | | | |
| PulseMCP | | | |
| Product Hunt | | | |
| Hacker News | | | |
| X / Twitter | | | |
| r/LocalLLaMA | | | |
| r/mcp | | | |
