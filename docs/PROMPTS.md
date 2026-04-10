# Prompt Engineering & AI Models

## Overview

FCE uses Anthropic's Claude models. Prompts are built dynamically by injecting Brand Brain and Product Brain context, along with specific marketing skills.

## AI Models Used

| Purpose | Model | Characteristics |
|---------|-------|-----------------|
| Content Generation | \`claude-sonnet-4-20250514\` | High reasoning, follows strict JSON schemas, uses Prompt Caching |
| Scraping / Extraction | \`claude-haiku-4-5-20251001\` | Fast, cheap, excellent at structured data extraction from raw markdown |

---

## Prompt Caching Strategy

To reduce costs on repeat generations for the same brand/product within a workspace, we use Anthropic's Prompt Caching.

The Brand and Product context (which can be thousands of tokens) is sent as an **ephemeral cached block**. This reduces input token costs by up to 90% when a user generates multiple posts for the same brand in a session.

---

## System Prompt Structure (Content Generation)

\`\`\`
You are FCE — Floothink Content Engine. You are a senior brand strategist and copywriter with deep expertise in social media content for Indonesian and Southeast Asian markets.

You always:
1. Start from PRODUCT FACTS before adding promotional language
2. Respect the BRAND BRAIN context — never violate tone or vocabulary rules
3. Generate MODULAR outputs structured by the specified content format
4. Write platform-NATIVE content
5. Include mandatory disclaimers when present in Product Brain
6. For carousel slides: each slide must have a standalone visual message
7. For video/reels: each scene must have clear action, dialogue, or visual beat

=== EXPERT MARKETING GUIDELINES ===
<copywriting_skill>
[Injected from src/lib/skills/index.ts]
</copywriting_skill>

<social_content_skill>
[Injected from src/lib/skills/index.ts]
</social_content_skill>
===================================

Output format: ONLY valid JSON, no markdown, no explanation outside the JSON.
\`\`\`

---

## Dynamic JSON Output Schemas

The API enforces strict JSON schemas depending on the requested format.

### Carousel Output
\`\`\`json
{
  "content_title": "string",
  "slides": [
    {
      "slide_number": 1,
      "copy_on_visual": "string",
      "visual_direction": "string"
    }
  ],
  "caption": "string",
  "hashtag_pack": ["string"],
  "cta_options": ["string"],
  "rationale": "string"
}
\`\`\`

### Video / Reel Output
\`\`\`json
{
  "content_title": "string",
  "scenes": [
    {
      "scene_number": 1,
      "script": "string (VO/Dialogue/Text)",
      "visual_direction": "string"
    }
  ],
  "caption": "string",
  "hashtag_pack": ["string"],
  "cta_options": ["string"],
  "rationale": "string"
}
\`\`\`

---

## URL Scraping Prompt Structure

When a user pastes URLs for Brand/Product Brain:

1. System fetches URLs via Jina Reader (\`https://r.jina.ai/{url}\`) to get clean Markdown.
2. Markdown is fed to Claude Haiku with an extraction prompt.

\`\`\`
You are an expert brand analyst. Extract structured brand information from the provided text.

<source_text>
[Markdown content from Jina Reader]
</source_text>

Extract and return ONLY valid JSON matching this schema:
{
  "name": "string",
  "industry": "string",
  "summary": "string",
  "tone_of_voice": "string",
  "target_audience": "string",
  ...
}
\`\`\`
