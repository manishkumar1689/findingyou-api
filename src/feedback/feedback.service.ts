import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { extractDocId, extractSimplified } from '../lib/entities';
import { notEmptyString } from '../lib/validators';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { Feedback } from './interfaces/feedback.interface';
import { Flag, SimpleFlag } from './interfaces/flag.interface';

@Injectable()
export class FeedbackService {
  constructor(
    @InjectModel('Feedback') private readonly feedbackModel: Model<Feedback>,
    @InjectModel('Flag') private flagModel: Model<Flag>,
  ) {}

  async getByTargetUserOrKey(
    userRef: string = '',
    keyRef: string = '',
    otherCriteria = null,
  ) {
    const criteria = this.buildFilterCriteria(userRef, keyRef, otherCriteria);
    return await this.flagModel.find(criteria).select({ _id: 0, __v: 0 });
  }

  async countByTargetUserOrKey(
    userRef: string = '',
    keyRef: string = '',
    otherCriteria = null,
  ) {
    const criteria = this.buildFilterCriteria(userRef, keyRef, otherCriteria);
    return await this.flagModel.count(criteria);
  }

  async getAllbySourceUser(uid: string) {
    const criteria = this.buildFilterCriteria('', '', { uid });
    return await this.flagModel.find(criteria);
  }

  async getAllbyTargetUser(user: string) {
    const criteria = this.buildFilterCriteria(user, '');
    return await this.flagModel.find(criteria);
  }


  async getAllUserInteractions(user: string) {
    const criteria = { $or: [{user: user}, {targetUser: user}], active: true };
    const rows = await this.flagModel.find(criteria).select({ _id: 0, __v: 0, isRating: 0, options: 0, active: 0 });
    const hasRows = rows instanceof Array && rows.length > 0;
    const userID = user.toString();
    return {
      userId: user.toString(),
      from: hasRows? rows.filter(row => row.user.toString() === userID).map(row => extractSimplified(row, ['user'])) : [],
      to: hasRows? rows.filter(row => row.targetUser.toString() === userID).map(row => extractSimplified(row, ['targetUser'])) : [],
    }
  }

  async getMemberSet(user: string, uid: string) {
    const ratingCriteria = { targetUser: user, isRating: true, active: true };
    const ratingRows = await this.flagModel.find(ratingCriteria).select({
      _id: 0,
      __v: 0,
      createdAt: 0,
      modifiedAt: 0,
      user: 0,
      targetUser: 0,
    });
    const flagCriteria = { targetUser: user, user: uid, active: true };
    const flags = await this.flagModel
      .find(flagCriteria)
      .select({ _id: 0, __v: 0, user: 0, targetUser: 0 });
    const otherFlagCriteria = { targetUser: uid, user, active: true };
    const otherFlags = await this.flagModel
      .find(otherFlagCriteria)
      .select({ _id: 0, __v: 0, user: 0, targetUser: 0 });
    const ratingsMap: Map<string, { total: number; count: number }> = new Map();
    for (const row of ratingRows) {
      const currRow = ratingsMap.get(row.key);
      const hasRow = currRow instanceof Object;
      const dblVal = hasRow ? currRow.total : 0;
      const count = hasRow ? currRow.count + 1 : 1;
      ratingsMap.set(row.key, {
        total: row.value + dblVal,
        count,
      });
    }

    return {
      ratings: Object.fromEntries(ratingsMap.entries()),
      flags,
      otherFlags,
    };
  }

  buildFilterCriteria(
    userRef: string = '',
    keyRef: string = '',
    otherCriteria = null,
  ) {
    const filterByUser = notEmptyString(userRef, 8);
    const filterByKey = notEmptyString(keyRef, 2);
    const filter = new Map<string, any>();
    filter.set('active', true);
    if (filterByKey) {
      filter.set('key', keyRef);
    }
    if (filterByUser) {
      filter.set('targetUser', userRef);
    }
    if (otherCriteria instanceof Object) {
      Object.entries(otherCriteria).forEach(entry => {
        const [key, val] = entry;
        switch (key) {
          case 'after':
            filter.set('modifiedAt', {
              $gte: val,
            });
            break;
          case 'uid':
            filter.set('user', val);
            break;
        }
      });
    }
    return Object.fromEntries(filter.entries());
  }

  async saveFlag(flagDto: CreateFlagDTO | SimpleFlag) {
    const { user, targetUser, key, type, value, isRating } = flagDto;
    const uid = user;
    const criteria = this.buildFilterCriteria(targetUser, key, { uid });
    const fbItem = await this.flagModel.findOne(criteria);
    const dt = new Date();
    let data: any = null;
    if (fbItem instanceof Object) {
      const newFields = {
        value,
        isRating: isRating === true,
        modifiedAt: dt,
      };
      const fbId = extractDocId(fbItem);
      data = await this.flagModel.findByIdAndUpdate(fbId, newFields);
    } else {
      const fields = {
        user: uid,
        targetUser,
        key,
        type,
        value,
        isRating: isRating === true,
        createdAt: dt,
        modifiedAt: dt,
      };
      const newFB = new this.flagModel(fields);
      data = await newFB.save();
    }
    return data instanceof Object? extractSimplified(data, ['_id', '__v', 'active']) : { valid: false};
  }

  async activateUser(user: string, active = true) {
    const criteria = this.buildFilterCriteria(user, '');
    return await this.flagModel.updateMany(criteria, {
      active,
    });
  }

  async deactivateUser(user: string) {
    return this.activateUser(user, false);
  }
}
