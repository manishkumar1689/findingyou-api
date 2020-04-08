import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lexeme } from './interfaces/lexeme.interface';
import { CreateLexemeDTO } from './dto/create-lexeme.dto';
import { TranslationDTO } from './dto/translation.dto';

@Injectable()
export class DictionaryService {
  constructor(
    @InjectModel('Lexeme')
    private lexemeModel: Model<Lexeme>,
  ) {}

  async getAll(criteria: any): Promise<Lexeme[]> {
    const filter = new Map<string, any>();
    if (criteria instanceof Object) {
      Object.entries(criteria).forEach(entry => {
        const [k, v] = entry;
        switch (k) {
          case 'category':
            filter.set('key', new RegExp('^' + v + '__'));
            break;
          case 'init':
            filter.set('key', new RegExp('^' + v));
            break;
        }
      });
    }
    const filteredCriteria = Object.fromEntries(filter);
    const lexemes = await this.lexemeModel.find(filteredCriteria).exec();
    return lexemes;
  }

  async getByKey(key: string): Promise<Lexeme> {
    return await this.lexemeModel.findOne({ key }).exec();
  }

  // post a single Lexeme
  async addLexeme(createLexemeDTO: CreateLexemeDTO): Promise<Lexeme> {
    const newLexeme = new this.lexemeModel(createLexemeDTO);
    console.log(newLexeme, createLexemeDTO);
    return newLexeme.save();
  }
  // Edit Lexeme details
  async updateLexeme(
    key: string,
    createLexemeDTO: CreateLexemeDTO,
  ): Promise<Lexeme> {
    const item = { ...createLexemeDTO };
    item.modifiedAt = new Date();
    const updatedLexeme = await this.lexemeModel.findOneAndUpdate(
      { key },
      createLexemeDTO,
      { new: true },
    );
    return updatedLexeme;
  }

  async saveTranslationByKey(
    key: string,
    translationDTO: TranslationDTO,
  ): Promise<Lexeme> {
    const lexeme = await this.getByKey(key);
    if (lexeme) {
      const item = lexeme.toObject();
      if (item.translations) {
        let { lang, text, type } = translationDTO;
        if (!type) {
          type = 'standard';
        }
        let ti = -1;
        if (item.translations.length > 0) {
          ti = item.translations.findIndex(
            tr => tr.lang === lang && (tr.type === type || type === 'variant'),
          );
        }
        if (ti < 0) {
          item.translations.push({ lang, text, type });
        } else {
          item.translations[ti] = { lang, text, type };
        }
        item.modifiedAt = new Date();
      }
      await this.updateLexeme(key, item);
      return await this.getByKey(key);
    }
  }
}
