export type EmailBlockType = 'paragraph' | 'heading' | 'list';

export interface EmailBlock {
  type: EmailBlockType;
  /** Used by 'paragraph' and 'heading' blocks. */
  text?: string;
  /** Used by 'list' blocks — one bullet per array entry. */
  items?: string[];
}

const PARAGRAPH_STYLE = 'font-size: 16px; color: #34495E; line-height: 1.6; margin: 8px 0;';
const HEADING3_STYLE = 'font-size: 18px; font-weight: 600; color: #34495E; margin: 12px 0 8px 0;';
const LINK_STYLE = 'color: #FF6B35; text-decoration: none; font-weight: 500;';
const STRONG_STYLE = 'font-weight: 600; color: #2C3E50;';
const CONTAINER_STYLE = 'max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;';

/** Replace {{variable}} tokens with their values. Missing variables render as empty string. */
export function renderText(template: string, vars: Record<string, string>): string {
  return template.replace(/{{\s*(\w+)\s*}}/g, (_match, k: string) =>
    Object.prototype.hasOwnProperty.call(vars, k) ? vars[k] : '',
  );
}

/**
 * Turns the admin's plain text into safe HTML: escapes any literal HTML the
 * admin typed (so it always displays as text, never breaks the layout),
 * then applies the two bits of "formatting" admins are allowed to use —
 * **bold** and bare https:// links — without ever exposing raw HTML to them.
 */
function escapeHtml(text: string): string {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function formatInline(text: string): string {
  const escaped = escapeHtml(text);
  const withBold = escaped.replace(/\*\*(.+?)\*\*/g, `<b style="${STRONG_STYLE}">$1</b>`);
  return withBold.replace(
    /(https?:\/\/[^\s<]+)/g,
    (url) => `<a href="${url}" style="${LINK_STYLE}">${url}</a>`,
  );
}

/** Renders a template's blocks (with variables already known) into the final email HTML. */
export function renderBlocksToHtml(blocks: EmailBlock[], vars: Record<string, string>): string {
  const signature = `<br /><p style="${PARAGRAPH_STYLE}">Warm Regards,<br /><b style="${STRONG_STYLE}">FTL Warehouse, Inc.</b><br />Freight Team Logistics</p>`;

  const body = blocks
    .map((block) => {
      if (block.type === 'heading') {
        return `<h3 style="${HEADING3_STYLE}">${formatInline(renderText(block.text || '', vars))}</h3>`;
      }
      if (block.type === 'list') {
        const items = (block.items || [])
          .map(
            (item) =>
              `<li style="${PARAGRAPH_STYLE} margin: 4px 0;">${formatInline(renderText(item, vars))}</li>`,
          )
          .join('');
        return `<ul style="margin: 16px 0; padding-left: 20px;">${items}</ul>`;
      }
      // paragraph
      return `<p style="${PARAGRAPH_STYLE}">${formatInline(renderText(block.text || '', vars))}</p>`;
    })
    .join('');

  return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="${CONTAINER_STYLE}">${body}${signature}</body></html>`;
}
