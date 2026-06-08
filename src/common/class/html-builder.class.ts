export class HtmlBuilder {
  private html: string = '';
  private styles: Record<string, string> = {
    primaryButton:
      'background-color: #FF6B35; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;',
    secondaryButton:
      'background-color: #00A8CC; color: #FFFFFF; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block; font-weight: 600;',
    heading1: 'font-size: 32px; font-weight: bold; color: #FFFFFF; margin: 0 0 16px 0;',
    heading2: 'font-size: 24px; font-weight: bold; color: #2C3E50; margin: 16px 0 12px 0;',
    heading3: 'font-size: 18px; font-weight: 600; color: #34495E; margin: 12px 0 8px 0;',
    paragraph: 'font-size: 16px; color: #34495E; line-height: 1.6; margin: 8px 0;',
    container: 'max-width: 600px; margin: 0 auto; padding: 20px; font-family: Arial, sans-serif;',
    gradientBackground:
      'background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 40px 20px;',
    card: 'background-color: #FFFFFF; border-radius: 8px; padding: 24px; margin: 16px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1);',
    link: 'color: #FF6B35; text-decoration: none; font-weight: 500;',
    strong: 'font-weight: 600; color: #2C3E50;',
  };

  hello(name: string) {
    this.html += `<p style="${this.styles.paragraph}">Hi <b style="${this.styles.strong}">${name}</b>,</p>`;
    return this;
  }

  heading(level: 1 | 2 | 3 | 4, text: string) {
    const style = this.styles[`heading${level}`];
    this.html += `<h${level} style="${style}">${text}</h${level}>`;
    return this;
  }

  button(text: string, url: string, variant: 'primary' | 'secondary' = 'primary') {
    const style = variant === 'primary' ? this.styles.primaryButton : this.styles.secondaryButton;
    this.html += `<br /><a href="${url}" style="${style}">${text} →</a>`;
    return this;
  }

  line(text: string, config?: { strong?: boolean }) {
    let content = text;
    if (config?.strong) {
      content = `<strong style="${this.styles.strong}">${text}</strong>`;
    }
    this.html += `<p style="${this.styles.paragraph}">${content}</p>`;
    return this;
  }

  space() {
    this.html += `<br />`;
    return this;
  }

  link(text: string, url: string) {
    this.html += `<br /><a href="${url}" style="${this.styles.link}">${text}</a><br />`;
    return this;
  }

  divider() {
    this.html += `<hr style="border: 0; border-top: 1px solid #E1E8ED; margin: 24px 0;" />`;
    return this;
  }

  list(items: string[]) {
    this.html += `<ul style="margin: 16px 0; padding-left: 20px;">`;
    items.forEach((item) => {
      this.html += `<li style="${this.styles.paragraph} margin: 4px 0;">${item}</li>`;
    });
    this.html += `</ul>`;
    return this;
  }

  bold(text: string) {
    return `<b style="${this.styles.strong}">${text}</b>`;
  }

  build() {
    this.html += `<br /><p style="${this.styles.paragraph}">Warm Regards,<br /><b style="${this.styles.strong}">FTL Warehouse, Inc.</b><br />Freight Team Logistics</p>`;
    return `<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head><body style="${this.styles.container}">${this.html}</body></html>`;
  }
}
