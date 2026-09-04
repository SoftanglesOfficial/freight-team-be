import { Injectable, NotFoundException, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { EmailTemplate, EmailTemplateDocument } from './entities/email-template.entity';
import { DEFAULT_TEMPLATES } from './default-templates';
import { EmailBlock, renderBlocksToHtml, renderText } from './email-blocks.util';

export interface RenderedTemplate {
  key: string;
  name: string;
  description: string;
  variables: string[];
  subject: string;
  blocks: EmailBlock[];
  isCustomized: boolean;
}

/**
 * Templates are edited via the admin API/UI, but consumed by fire-and-forget
 * Action classes that are plain `new X()` instances outside Nest's DI graph
 * (same pattern the codebase already uses for ConfigService in those files).
 * A static in-memory cache lets those classes read the latest override
 * synchronously without needing an injected instance.
 */
@Injectable()
export class EmailTemplateService implements OnModuleInit {
  private static cache = new Map<string, { subject: string; blocks: EmailBlock[] }>();

  constructor(
    @InjectModel(EmailTemplate.name) private readonly model: Model<EmailTemplateDocument>,
  ) {}

  async onModuleInit() {
    await this.refreshCache();
  }

  private async refreshCache() {
    const docs = await this.model.find().exec();
    EmailTemplateService.cache.clear();
    for (const doc of docs) {
      EmailTemplateService.cache.set(doc.key, { subject: doc.subject, blocks: doc.blocks });
    }
  }

  /**
   * Render the effective (override, falling back to built-in default) email
   * for a template key, with variables substituted. Used by Action classes.
   * Returns null if the key isn't a known template (caller should fall back
   * to its own hardcoded email).
   */
  static getEffective(key: string, vars: Record<string, string>): { subject: string; html: string } | null {
    const def = DEFAULT_TEMPLATES[key];
    if (!def) return null;
    const override = EmailTemplateService.cache.get(key);
    const subject = renderText(override?.subject ?? def.defaultSubject, vars);
    const html = renderBlocksToHtml(override?.blocks ?? def.defaultBlocks, vars);
    return { subject, html };
  }

  private assertKnownKey(key: string) {
    if (!DEFAULT_TEMPLATES[key]) {
      throw new NotFoundException(`Unknown email template key: ${key}`);
    }
  }

  async listAll(): Promise<RenderedTemplate[]> {
    return Object.entries(DEFAULT_TEMPLATES).map(([key, def]) => {
      const override = EmailTemplateService.cache.get(key);
      return {
        key,
        name: def.name,
        description: def.description,
        variables: def.variables,
        subject: override?.subject ?? def.defaultSubject,
        blocks: override?.blocks ?? def.defaultBlocks,
        isCustomized: !!override,
      };
    });
  }

  async getOne(key: string): Promise<RenderedTemplate> {
    this.assertKnownKey(key);
    const def = DEFAULT_TEMPLATES[key];
    const override = EmailTemplateService.cache.get(key);
    return {
      key,
      name: def.name,
      description: def.description,
      variables: def.variables,
      subject: override?.subject ?? def.defaultSubject,
      blocks: override?.blocks ?? def.defaultBlocks,
      isCustomized: !!override,
    };
  }

  async update(key: string, dto: { subject: string; blocks: EmailBlock[] }): Promise<RenderedTemplate> {
    this.assertKnownKey(key);
    await this.model
      .findOneAndUpdate(
        { key },
        { key, subject: dto.subject, blocks: dto.blocks },
        { upsert: true, new: true },
      )
      .exec();
    await this.refreshCache();
    return this.getOne(key);
  }

  async resetToDefault(key: string): Promise<RenderedTemplate> {
    this.assertKnownKey(key);
    await this.model.deleteOne({ key }).exec();
    await this.refreshCache();
    return this.getOne(key);
  }

  /** Renders subject/blocks with placeholder sample values so admins can preview before saving. */
  preview(key: string, subject: string, blocks: EmailBlock[]): { subject: string; html: string } {
    this.assertKnownKey(key);
    const def = DEFAULT_TEMPLATES[key];
    const sampleVars: Record<string, string> = {};
    for (const v of def.variables) {
      sampleVars[v] = `[${v}]`;
    }
    return {
      subject: renderText(subject, sampleVars),
      html: renderBlocksToHtml(blocks, sampleVars),
    };
  }
}
