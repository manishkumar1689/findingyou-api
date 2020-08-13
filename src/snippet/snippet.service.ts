import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Snippet } from './interfaces/snippet.interface';
import { CreateSnippetDTO } from './dto/create-snippet.dto';
import { BulkSnippetDTO } from './dto/bulk-snippet.dto';
import { extractDocId, hashMapToObject } from '../lib/entities';

@Injectable()
export class SnippetService {
  constructor(
    @InjectModel('Snippet') private readonly snippetModel: Model<Snippet>,
  ) {}
  // fetch all Snippets
  async list(publishedOnly = true): Promise<Snippet[]> {
    const filter = publishedOnly
      ? { values: { $exists: true, $ne: [] }, published: true }
      : {};
    const Snippets = await this.snippetModel.find(filter).exec();
    return Snippets;
  }

  async categories(): Promise<string[]> {
    const rows = await this.snippetModel
      .find()
      .select({ _id: 0, key: 1 })
      .exec();
    const categories: Array<string> = [];
    rows.forEach(row => {
      const item = row.toObject();
      const { key } = row;
      if (key) {
        const category = key.split('__').shift();
        if (categories.indexOf(category) < 0) {
          categories.push(category);
        }
      }
    });
    return categories;
  }

  // fetch all snippets with core fields only
  async getAll(): Promise<Snippet[]> {
    const Snippets = await this.snippetModel
      .find()
      .select({ key: 1, values: 1, format: 1, _id: 0 })
      .exec();
    return Snippets;
  }
  // Get a single Snippet
  async getSnippet(snippetID): Promise<Snippet> {
    const snippet = await this.snippetModel.findById(snippetID).exec();
    return snippet;
  }

  // Bulk-edit submission status fields
  async bulkUpdate(bulkSnippetDTO: BulkSnippetDTO): Promise<BulkSnippetDTO> {
    const { items } = bulkSnippetDTO;
    if (items.length > 0) {
      for (const item of items) {
        const { key, values } = item;
        const sn = await this.getByKey(key);
        const snId = sn instanceof Object ? extractDocId(sn) : '';
        if (values.length > 2) {
          if (snId.length > 3) {
            await this.snippetModel.findByIdAndUpdate(
              extractDocId(sn),
              {
                values,
              },
              { new: false },
            );
          } else {
            const newSnippet = await new this.snippetModel({
              key,
              values,
              format: 'text',
            });
            newSnippet.save();
          }
        }
      }
    }
    return bulkSnippetDTO;
  }

  // Get a single Snippet by key
  async getByKey(snippetKey): Promise<Snippet> {
    return await this.snippetModel.findOne({ key: snippetKey }).exec();
  }

  // post a single Snippet
  async addSnippet(createSnippetDTO: CreateSnippetDTO): Promise<Snippet> {
    const newSnippet = await new this.snippetModel(createSnippetDTO);
    return newSnippet.save();
  }
  // Edit Snippet details
  async updateSnippet(
    snippetID,
    createSnippetDTO: CreateSnippetDTO,
  ): Promise<Snippet> {
    const updatedSnippet = await this.snippetModel.findByIdAndUpdate(
      snippetID,
      createSnippetDTO,
      { new: true },
    );
    return updatedSnippet;
  }

  async deleteByKey(key: string) {
    const lexeme = await this.getByKey(key);
    const mp = new Map<string, any>();
    if (lexeme) {
      let mayDelete =
        lexeme.published === false &&
        lexeme.values.some(vl => vl.active === true || vl.approved === true) ===
          false;
      if (mayDelete) {
        this.snippetModel.deleteOne({ key }).exec();
        mp.set('valid', true);
        mp.set('lexeme', lexeme);
        mp.set('message', 'Successfully deleted');
      } else {
        mp.set('valid', false);
        mp.set('lexeme', lexeme);
        mp.set('message', 'This item may still be used somewhere');
      }
    } else {
      mp.set('valid', false);
      mp.set('message', 'Lexeme with this key not found');
    }
    return hashMapToObject(mp);
  }
}
