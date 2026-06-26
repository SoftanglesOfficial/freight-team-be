import { BadRequestException, Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PDFParse } from 'pdf-parse';
import { ParseBolResponseDto, ParsedBolDataDto } from './dto/parse-bol-response.dto';

const BOL_FIELD_KEYS = [
  'shipper_zip',
  'consignee_zip',
  'carrier_name',
  'pro_number',
  'special_instructions',
  'consignee_name',
  'pickup_date',
  'weight',
] as const;

type BolFieldKey = (typeof BOL_FIELD_KEYS)[number];

@Injectable()
export class BolParserService {
  constructor(private readonly configService: ConfigService) {}

  async parseBolPdf(file: Express.Multer.File): Promise<ParseBolResponseDto> {
    if (!file) {
      throw new BadRequestException('No file provided');
    }

    if (file.mimetype !== 'application/pdf') {
      throw new BadRequestException('Only PDF files are supported');
    }

    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File exceeds the 10MB size limit');
    }

    const apiKey = this.configService.get<string>('OPENAI_API_KEY');
    if (!apiKey) {
      return {
        success: false,
        error: 'BOL parsing is not configured. Please contact support.',
      };
    }

    let extractedText = '';
    const parser = new PDFParse({ data: file.buffer });
    try {
      const textResult = await parser.getText();
      extractedText = (textResult.text || '').replace(/\s+/g, ' ').trim();
    } catch {
      return {
        success: false,
        error: 'Could not read this PDF. Please fill in the form manually.',
      };
    } finally {
      await parser.destroy();
    }

    if (extractedText.length < 40) {
      return {
        success: false,
        error:
          'Could not extract text from this PDF. It may be a scanned image — please fill in the form manually.',
      };
    }

    try {
      const structured = await this.extractFieldsWithAi(extractedText, apiKey);

      if (structured.error) {
        return {
          success: false,
          error: structured.error,
        };
      }

      const data = this.normalizeParsedData(structured);
      if (Object.keys(data).length === 0) {
        return {
          success: false,
          error: 'No shipment fields could be identified in this BOL.',
        };
      }

      return { success: true, data };
    } catch {
      return {
        success: false,
        error: 'Failed to parse BOL. Please fill in the form manually.',
      };
    }
  }

  private async extractFieldsWithAi(
    text: string,
    apiKey: string,
  ): Promise<Record<string, string | undefined> & { error?: string }> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: this.configService.get<string>('OPENAI_MODEL', 'gpt-4o-mini'),
        temperature: 0,
        response_format: { type: 'json_object' },
        messages: [
          {
            role: 'system',
            content: [
              'You extract structured shipment fields from Bill of Lading (BOL) document text.',
              'Return JSON only.',
              'Allowed keys (all optional): shipper_zip, consignee_zip, carrier_name, pro_number, special_instructions, consignee_name, pickup_date, weight.',
              'pickup_date must be ISO format YYYY-MM-DD when possible.',
              'weight must be a numeric string in pounds.',
              'If the text is not a BOL or is unreadable, return {"error":"reason"}.',
              'Otherwise omit keys you cannot confidently determine.',
            ].join(' '),
          },
          {
            role: 'user',
            content: `Extract BOL fields from this text:\n\n${text.slice(0, 20000)}`,
          },
        ],
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error('OpenAI BOL parse failed:', response.status, errorBody);
      throw new Error('OpenAI request failed');
    }

    const payload = (await response.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };

    const content = payload.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('Empty OpenAI response');
    }

    return JSON.parse(content) as Record<string, string | undefined> & {
      error?: string;
    };
  }

  private normalizeParsedData(
    raw: Record<string, string | undefined>,
  ): ParsedBolDataDto {
    const data: ParsedBolDataDto = {};

    for (const key of BOL_FIELD_KEYS) {
      const value = raw[key];
      if (typeof value !== 'string') continue;

      const trimmed = value.trim();
      if (!trimmed) continue;

      if (key === 'pickup_date') {
        const parsed = new Date(trimmed);
        if (!isNaN(parsed.getTime())) {
          data.pickup_date = parsed.toISOString().slice(0, 10);
        }
        continue;
      }

      if (key === 'weight') {
        const numeric = trimmed.replace(/[^\d.]/g, '');
        if (numeric) data.weight = numeric;
        continue;
      }

      data[key as BolFieldKey] = trimmed;
    }

    return data;
  }
}
