import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lexeme } from './interfaces/lexeme.interface';
import { CreateLexemeDTO } from './dto/create-lexeme.dto';
import { TranslationDTO } from './dto/translation.dto';
import { CategoryKeys } from './interfaces/category-keys';
import { hashMapToObject } from 'src/lib/entities';

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

  async getCategoriesKeys(): Promise<Array<any>> {
    const keyRows = await this.lexemeModel
      .find({})
      .select(['key', '-_id'])
      .exec();
    let catKeys: Array<string> = [];
    if (keyRows.length > 0) {
      catKeys = keyRows.map(kr => kr.key);
    }
    return catKeys;
  }

  async getCategories(): Promise<Array<string>> {
    const keys = await this.getCategoriesKeys();
    let categories: Array<string> = [];
    if (keys.length > 0) {
      const catKeys = keys.map(k => k.split('__').shift());
      categories = catKeys.filter((key, ki) => catKeys.indexOf(key) === ki);
    }
    return categories;
  }

  async getCategoriesAndKeys(): Promise<Array<CategoryKeys>> {
    const keys = await this.getCategoriesKeys();
    let categoryKeys: Array<CategoryKeys> = [];
    if (keys.length > 0) {
      const catKeyPairs = keys.map(k => k.split('__'));
      const catKeys = catKeyPairs.map(pair => pair[0]);
      categoryKeys = catKeys
        .filter((ck, cki) => catKeys.indexOf(ck) === cki)
        .map(category => {
          const keys = catKeyPairs
            .filter(p => p[0] === category)
            .map(p => p[1]);
          return {
            category,
            keys,
          };
        });
    }
    return categoryKeys;
  }

  // post a single Lexeme
  async addLexeme(createLexemeDTO: CreateLexemeDTO): Promise<Lexeme> {
    const newLexeme = new this.lexemeModel(createLexemeDTO);
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
        let { lang, text, type, alpha } = translationDTO;
        if (!type) {
          type = 'standard';
        }
        if (!alpha) {
          alpha = 'lt';
        }
        let ti = -1;
        if (item.translations.length > 0) {
          ti = item.translations.findIndex(
            tr => tr.lang === lang && (tr.type === type || type === 'variant'),
          );
        }
        if (ti < 0) {
          item.translations.push({ lang, text, type, alpha });
        } else {
          item.translations[ti] = { lang, text, type, alpha };
        }
        item.modifiedAt = new Date();
      }
      await this.updateLexeme(key, item);
      return await this.getByKey(key);
    }
  }

  async deleteLexemeByKey(key: string) {
    const lexeme = await this.getByKey(key);
    const mp = new Map<string, any>();
    if (lexeme) {
      this.lexemeModel.deleteOne({ key }).exec();
      mp.set('valid', true);
      mp.set('lexeme', lexeme);
      mp.set('message', 'Successfully deleted');
    } else {
      mp.set('valid', false);
      mp.set('message', 'Lexeme with this key not found');
    }
    return hashMapToObject(mp);
  }
}
