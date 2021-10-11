import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { yearsAgoString } from '../astrologic/lib/date-funcs';
import { extractDocId, extractSimplified } from '../lib/entities';
import { notEmptyString, validISODateString } from '../lib/validators';
import { CreateFlagDTO } from './dto/create-flag.dto';
import { Feedback } from './interfaces/feedback.interface';
import { Flag, SimpleFlag } from './interfaces/flag.interface';
import { mapUserFlag } from '../lib/notifications';

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

  async getAllUserInteractions(user: string, startDate = null, otherUserIds = []) {
    const dt = validISODateString(startDate)? startDate : typeof startDate === 'number' ? yearsAgoString(startDate) : yearsAgoString(1);
    const criteria: Map<string, any> = new Map();
    if (otherUserIds.length > 0) {
      criteria.set('$or', [{user: user, targetUser: { $in: otherUserIds }}, {targetUser: user, user: { $in: otherUserIds } }]);
    } else {
      criteria.set('$or', [{user: user}, {targetUser: user}]);
    }
    criteria.set('active', true);
    criteria.set('modifiedAt', { $gte: dt });
    const criteriaObj = Object.fromEntries(criteria.entries());
    const rows = await this.flagModel.find(criteriaObj).select({ _id: 0, __v: 0, isRating: 0, options: 0, active: 0 });
    const hasRows = rows instanceof Array && rows.length > 0;
    const userID = user.toString();
    const likeKey = 'likeability';
    const excludeKeys = [likeKey];
    const likeRows = rows.filter(row => row.key === likeKey);
    const hasLikeRows = likeRows.length > 0;
    
    const likeability = { 
      from: hasLikeRows? likeRows.filter(row => row.user.toString() === userID).map(row => mapUserFlag(row, false, true)) : [],
      to: hasLikeRows? likeRows.filter(row => row.targetUser.toString() === userID).map(row => mapUserFlag(row, true, true)) : [],
    }
    return {
      from: hasRows? rows.filter(row => row.user.toString() === userID && excludeKeys.includes(row.key) === false).map(row => mapUserFlag(row)) : [],
      to: hasRows? rows.filter(row => row.targetUser.toString() === userID && excludeKeys.includes(row.key) === false).map(row => mapUserFlag(row, true)) : [],
      likeability
    }
  }

  async fetchByLikeability(userId = '', startDate = null, refNum = 1, gte = false, mutualMode = 0) {
    const valueFilter = gte ? { $gte: refNum } : refNum;
    const dt = validISODateString(startDate)? startDate : typeof startDate === 'number' ? yearsAgoString(startDate) : yearsAgoString(1);
    const criteriaObj = {
      key: 'likeability',
      value: valueFilter,
      modifiedAt: { $gte: dt }
    };
    const criteriaObj1 = {...criteriaObj, targetUser: userId };
    
    const rows = await this.flagModel.find(criteriaObj1).select({ _id: 0, __v: 0, type: 0, isRating: 0, options: 0, active: 0, targetUser: 0 });
    const filterMutual = mutualMode !== 0;
    if (filterMutual) {
      const mutualValueFilter = mutualMode > 0 ? valueFilter : { $ne: 0 };
      const mutualRows = await this.flagModel.find({
        targetUser: { $in: rows.map(r => r.user )},
        user: userId,
        value: mutualValueFilter
      }).select({_id: 0, __v: 0, key: 0, type: 0, isRating: 0, options: 0, active: 0 });
      const mutualIds = mutualRows.map(r => r.targetUser.toString());
      return rows.map(r => {
        const isMutual = mutualIds.includes(r.user.toString());
        return { ...r.toObject(), isMutual }
      });
    } else {
      return rows
    };
  }

  async fetchFilteredUserInteractions(userId = "", notFlags = [], preFetchFlags = false) {
    const userFlags = preFetchFlags? await this.getAllUserInteractions(userId, 1) : { to: [], from: [], likeability: { to: [], from: [] } };

    const notFlagItems = notFlags.map(flagKey => {
      switch (flagKey) {
        case 'like':
          return { key: 'likeability', value: 1};
        case 'superlike':
          return { key: 'likeability', value: 2};
        case 'pass':
        case 'not_interested':
          return { key: 'likeability', value: 0};
        default:
          return { key: flagKey, value: true};
      }
    });

    
    const { from, likeability } = userFlags;
    const fromLikeFlags = likeability.from.map(fi => {
      return {...fi, key: 'likeability' }
    });
    const fromFlags = preFetchFlags? [...fromLikeFlags, ...from] : [];
    const excludedIds = preFetchFlags? fromFlags.filter(flag => notFlagItems.some(fi => fi.key === flag.key && fi.value === flag.value)).map(flag => flag.user) : [];
    return { userFlags, excludedIds };
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

  async countRecentLikeability(userId: string, refNum = 1) {
    const nowTs = new Date().getTime();
    const oneDayAgo = new Date(nowTs - (24 * 60 * 60 * 1000));
    const criteria = {
      key: 'likeability',
      user: userId,
      value: refNum,
      modifiedAt: { $gte: oneDayAgo }
    };
    return await this.flagModel.count(criteria);
  }

  async prevSwipe(userId: string, otherUserId = '') {
    const nowTs = new Date().getTime();
    const oneDayAgo = new Date(nowTs - (24 * 60 * 60 * 1000));
    const criteria = {
      key: 'likeability',
      user: userId,
      targetUser: otherUserId,
    };
    const flag = await this.flagModel.findOne(criteria);
    return flag instanceof Model ? {...flag.toObject(), valid: true } : { valid: false };
  }

  matchLikeabilityKey(keyRef = 'like') {
    const key = keyRef.toLowerCase();
    switch (key) {
      case 'like':
        return 1;
      case 'superlike':
        return 2;
      case 'pass':
        return 0;
      default:
        return -5;
    }
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
