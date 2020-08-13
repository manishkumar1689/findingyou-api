import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Snippet } from './interfaces/snippet.interface';
import { CreateSnippetDTO } from './dto/create-snippet.dto';
import { BulkSnippetDTO } from './dto/bulk-snippet.dto';
import { extractDocId } from '../lib/entities';

@Injectable()
export class SnippetService {
  constructor(
    @InjectModel('Snippet') private readonly snippetModel: Model<Snippet>,
  ) {}
  // fetch all Snippets
  async getAllSnippet(): Promise<Snippet[]> {
    const Snippets = await this.snippetModel.find().exec();
    return Snippets;
  }
  // fetch all snippets with core fields only
  async getAll(): Promise<Snippet[]> {
    const Snippets = await this.snippetModel
      .find()
      .select({ key: 1, value: 1, format: 1, _id: 0 })
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
        const { key, value } = item;
        const sn = await this.getByKey(key);
        const snId = sn instanceof Object ? extractDocId(sn) : '';
        if (value.length > 2) {
          if (snId.length > 3) {
            await this.snippetModel.findByIdAndUpdate(
              extractDocId(sn),
              {
                value,
              },
              { new: false },
            );
          } else {
            const newSnippet = await this.snippetModel({
              key,
              value,
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
    const newSnippet = await this.snippetModel(createSnippetDTO);
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
}
