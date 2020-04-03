import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Lexeme } from './interfaces/lexeme.interface';
import { CreateLexemeDTO } from './dto/create-lexeme.dto';

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

  // post a single Lexeme
  async addLexeme(createLexemeDTO: CreateLexemeDTO): Promise<Lexeme> {
    const newLexeme = new this.lexemeModel(createLexemeDTO);
    return newLexeme.save();
  }
  // Edit Lexeme details
  async updateLexeme(
    LexemeID,
    createLexemeDTO: CreateLexemeDTO,
  ): Promise<Lexeme> {
    const updatedLexeme = await this.lexemeModel.findByIdAndUpdate(
      LexemeID,
      createLexemeDTO,
      { new: true },
    );
    return updatedLexeme;
  }
}
