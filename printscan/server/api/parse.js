const express = require('express');
const router = express.Router();
const Anthropic = require('@anthropic-ai/sdk');
const logger = require('../utils/logger');

const SYSTEM_PROMPT = `You are a print specification parser for a UK commercial print broker.
Extract structured print job specifications from customer messages.

Return a JSON array (to handle multiple items in one request) where each item contains:

{
  "product_type": string,
  "size": string,
  "quantity": number,
  "paper_stock": string,
  "paper_weight_gsm": number,
  "print_sides": "single" | "double",
  "colour": "full_colour" | "black_and_white" | "spot",
  "lamination": string | null,
  "folding": string | null,
  "pages": number | null,
  "binding": string | null,
  "turnaround": string | null,
  "delivery_postcode": string | null,
  "other_requirements": string | null,
  "confidence_notes": string[]
}

Valid product_type values: "Business Cards", "Flyers/Leaflets", "Folded Leaflets", "Brochures/Booklets", "Posters", "Postcards", "Compliment Slips", "Letterheads", "NCR Pads/Sets", "Presentation Folders", "Large Format Posters", "Roller Banners", "PVC Banners", "Canvas Prints", "Stickers/Labels", "Envelopes", "Other"

Valid size values: "A6", "A5", "A4", "A3", "A2", "A1", "A0", "DL", "85x55mm", "Custom"

Valid lamination values: null, "None", "Matt Lamination (one side)", "Matt Lamination (both sides)", "Gloss Lamination (one side)", "Gloss Lamination (both sides)", "Soft Touch Lamination", "Spot UV"

Valid folding values: null, "None", "Half Fold", "Tri-Fold (letter)", "Tri-Fold (Z-fold)", "Gate Fold", "Concertina/Accordion", "Roll Fold", "Cross Fold"

Valid binding values: null, "None", "Saddle Stitch", "Perfect Bound", "Wiro Bound", "Comb Bound"

Valid turnaround values: "Next Day", "2-3 Days", "3-5 Days", "5-7 Days", "7-10 Days", or a specific date string

The "confidence_notes" array should flag any assumptions made or ambiguities, e.g.:
- "Assumed 'glossy' means gloss lamination, not gloss paper"
- "No paper weight specified - defaulted to 170gsm silk for flyers"
- "Turnaround unclear - 'need them soon' interpreted as 3-5 days"

UK print industry conventions:
- Business cards are typically 85x55mm on 400gsm or 450gsm
- Standard flyer weights: 130gsm (economy), 150gsm (standard), 170gsm (premium)
- "Silk" and "satin" are interchangeable terms
- "Matt lam" = matt lamination
- "Both sides" / "front and back" / "double sided" all mean the same thing
- Self-cover means the cover is the same stock as the inner pages
- Page counts for booklets include the cover (e.g. 8pp = 8 pages total)

IMPORTANT: Return ONLY a valid JSON array, no markdown, no explanation, just the JSON array.`;

router.post('/', async (req, res) => {
  const { text } = req.body;

  if (!text || !text.trim()) {
    return res.status(400).json({ error: 'No text provided' });
  }

  if (!process.env.ANTHROPIC_API_KEY) {
    return res.status(500).json({ error: 'ANTHROPIC_API_KEY not configured' });
  }

  try {
    logger.info('Parsing spec from text', { length: text.length });

    const client = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });

    const message = await client.messages.create({
      model: 'claude-opus-4-5',
      max_tokens: 4096,
      system: SYSTEM_PROMPT,
      messages: [
        {
          role: 'user',
          content: text,
        },
      ],
    });

    const rawContent = message.content[0].text;
    logger.debug('AI response received', { rawContent });

    // Parse the JSON response
    let specs;
    try {
      // Strip any markdown code fences if present
      const cleaned = rawContent.replace(/```(?:json)?\n?/g, '').trim();
      specs = JSON.parse(cleaned);
      if (!Array.isArray(specs)) {
        specs = [specs];
      }
    } catch (parseErr) {
      logger.error('Failed to parse AI response as JSON', { rawContent, error: parseErr.message });
      return res.status(200).json({
        specs: [],
        rawResponse: rawContent,
        parseError: 'AI response could not be parsed as JSON. Please review and correct manually.',
      });
    }

    res.json({ specs, rawResponse: rawContent });
  } catch (err) {
    logger.error('AI parse error', err.message);
    res.status(500).json({ error: `Failed to parse: ${err.message}` });
  }
});

module.exports = router;
