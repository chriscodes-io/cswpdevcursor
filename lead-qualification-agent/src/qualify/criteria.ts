export const QUALIFICATION_RUBRIC = `
Score leads 1-10 using these criteria:

High-Value Indicators (+2-3 points each):
- Mentions specific budget over $5,000
- Urgent timeline (immediate, ASAP, this week/month)
- References specific products/services by name
- Company name and professional email domain
- Mentions existing pain points or current solutions

Medium-Value Indicators (+1-2 points each):
- General budget discussion without specific amounts
- Timeline within 3-6 months
- Professional language and detailed inquiry
- Includes contact phone number
- References competitors or market research

Low-Value Indicators (0-1 points each):
- Generic inquiry templates
- No timeline mentioned
- Personal email addresses only (gmail/yahoo/hotmail without company context)
- Vague or very brief messages
- No budget or price sensitivity mentioned

Return score as integer 1-10. Qualified threshold is typically >= 7.
`;
