import { HttpService, Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { Snippet } from './interfaces/snippet.interface';
import { CreateSnippetDTO } from './dto/create-snippet.dto';
import { BulkSnippetDTO } from './dto/bulk-snippet.dto';
import { extractDocId, hashMapToObject, extractObject } from '../lib/entities';
import { v2 }  from '@google-cloud/translate';
import { googleTranslate } from '../.config';
const { Translate } = v2;

@Injectable()
export class SnippetService {
  constructor(
    @InjectModel('Snippet') private readonly snippetModel: Model<Snippet>,
    private http: HttpService,
  ) {}
  // fetch all Snippets
  async list(publishedOnly = true, modFields = false): Promise<Snippet[]> {
    const filter = publishedOnly
      ? { values: { $exists: true, $ne: [] }, published: true }
      : {};
    const fields =
      publishedOnly && !modFields
        ? {
            _id: 0,
            key: 1,
            format: 1,
            values: 1,
          }
        : {};
    const Snippets = await this.snippetModel
      .find(filter)
      .select(fields)
      .exec();
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
    const Snippets = await this.snippetModel.find().exec();
    return Snippets;
  }
  // Get a single Snippet
  async getSnippet(snippetID): Promise<Snippet> {
    const snippet = await this.snippetModel.findById(snippetID).exec();
    return snippet;
  }

  // Get a single Snippet
  async getSnippetByKey(key: string): Promise<Snippet> {
    const snippet = await this.snippetModel.findOne({ key }).exec();
    return snippet;
  }

  async getSnippetByKeyStart(key: string): Promise<any> {
    const fields = {
      key: 1,
      values: 1,
      _id: 0,
    };
    const snippet = await this.snippetModel
      .findOne({ key })
      .select(fields)
      .exec();
    const data = { snippet, options: [] };
    const rgx = new RegExp('^' + key + '_option_');
    const related = await this.snippetModel
      .find({ key: rgx })
      .select(fields)
      .exec();
    if (related.length > 0) {
      data.options = related;
    }
    return data;
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
  async save(createSnippetDTO: CreateSnippetDTO): Promise<Snippet> {
    const { key, published, notes, format, values } = createSnippetDTO;
    const snippet = await this.snippetModel.findOne({ key });
    const exists = snippet instanceof Object;
    const dt = new Date();
    let filteredValues = [];
    const snippetObj = extractObject(snippet);
    if (values instanceof Array) {
      filteredValues = values.map(vl => {
        let isEdited = false;
        let isNew = true;
        let createdAt = null;
        if (exists) {
          const versionRow = snippetObj.values.find(v2 => v2.lang === vl.lang);
          if (versionRow) {
            isNew = false;
            isEdited = versionRow.text !== vl.text || versionRow.active !== vl.active || versionRow.approved !== vl.approved;
            createdAt = versionRow.createdAt;
            if (!isNew && !isEdited) {
              vl = versionRow;
            }
          }
        }
        if (isNew) {
          return { ...vl, modifiedAt: dt, createdAt: dt };
        } else if (isEdited) {
          return { ...vl, createdAt, modifiedAt: dt };
        } else {
          return vl;
        }
      });
    }
    const payload = {
      key,
      format,
      notes,
      published,
      values: filteredValues,
      modifiedAt: dt,
    };
    if (exists) {
      return await this.snippetModel.findByIdAndUpdate(
        extractDocId(snippet),
        payload,
        { new: true },
      );
    } else {
      const newSnippet = await new this.snippetModel({
        ...payload,
        createdAt: dt,
      });
      return newSnippet.save();
    }
  }

  async lastModified(lang = 'en') {
    const snippets = await this.list(true, true);
    const mods: number[] = [];
    const langMods: Map<string, number[]> = new Map();
    snippets.forEach(snippet => {
      mods.push(new Date(snippet.modifiedAt).getTime());
      snippet.values.forEach(vl => {
        const langModItems = langMods.has(vl.lang) ? langMods.get(vl.lang) : [];
        langModItems.push(new Date(vl.modifiedAt).getTime());
        langMods.set(vl.lang, langModItems);
      });
    });
    const enMods = langMods.has('en') ? langMods.get('en') : [];
    if (langMods.has('en-GB')) {
      const extraMods = langMods.get('en-GB');
      extraMods.forEach(md => {
        enMods.push(md);
      });
    }
    let localeMods = [];
    if (lang !== 'en' && lang !== 'en-GB') {
      if (langMods.has(lang)) {
        localeMods = langMods.get(lang);
      }
    }
    const ts = new Date().getTime();
    const maxGeneral = Math.max(...mods);
    const maxEn = Math.max(...enMods);
    const maxLocale = localeMods.length > 0 ? Math.max(...localeMods) : 0;
    const secsAgo = (modTs: number) => Math.ceil((ts - modTs) / 1000);
    return {
      general: secsAgo(maxGeneral),
      en: secsAgo(maxEn),
      locale: secsAgo(maxLocale),
      lang,
    };
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

  async fetchGoogleTranslation(text = "", target = "", source = "en") {
    const {key, projectId } = googleTranslate;
    const translate = new Translate({projectId, key});
    const [translation] = await translate.translate(text, { to: target, from: source });
    return { text, translation };
  }

}
