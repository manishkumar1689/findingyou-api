import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { ObjectId } from 'mongoose/lib/types';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService } from '@nest-modules/mailer';
import { User } from './interfaces/user.interface';
import { CreateUserDTO } from './dto/create-user.dto';
import {
  hashMapToObject,
  extractObject,
  extractSimplified,
  extractDocId,
} from '../lib/entities';
import * as bcrypt from 'bcrypt';
import { generateHash } from '../lib/hash';
import * as moment from 'moment-timezone';
import {
  inRange,
  isNumeric,
  isSystemFileName,
  notEmptyString,
  validEmail,
  validISODateString,
  validUri,
} from '../lib/validators';
import { Role } from './interfaces/role.interface';
import { Payment } from './interfaces/payment.interface';
import { PaymentOption } from './interfaces/payment-option.interface';
import { PaymentDTO } from './dto/payment.dto';
import { ProfileDTO } from './dto/profile.dto';
import { MatchedOption, PrefKeyValue } from './settings/preference-options';
import { smartCastBool, smartCastFloat, smartCastInt } from '../lib/converters';
import { MediaItemDTO } from './dto/media-item.dto';
import { PreferenceDTO } from './dto/preference.dto';
import { matchFileTypeAndMime } from '../lib/files';
import { PublicUser } from './interfaces/public-user.interface';
import { normalizedToPreference } from '../setting/lib/mappers';

const userEditPaths = [
  'fullName',
  'nickName',
  'identifier',
  'roles',
  'mode',
  'gender',
  'active',
  'dob',
  'test',
  'geo',
  'placenames',
  'preview',
  'login',
  'preview',
];

const userSelectPaths = [
  '_id',
  ...userEditPaths,
  'status',
  'profiles',
  'preferences',
  'createdAt',
  'modifiedAt',
];

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    @InjectModel('PublicUser')
    private readonly publicUserModel: Model<PublicUser>,
    private readonly mailerService: MailerService,
  ) {}
  // fetch all Users
  async list(
    start: number,
    limit: number,
    criteria: any = null,
    activeOnly = true,
  ): Promise<User[]> {
    const filterCriteria = this.buildCriteria(criteria, activeOnly);
    return await this.userModel
      .find(filterCriteria)
      .select(userSelectPaths.join(' '))
      .skip(start)
      .limit(limit)
      .sort({ createdAt: -1 });
  }
  // count users by criteria

  mapBasicUser(item: any = null) {
    const obj =
      item instanceof Object
        ? item
        : { _id: '', nickName: '', roles: [], profiles: [] };
    const { _id, nickName, roles, profiles } = obj;
    let profileImg = '';
    if (profiles instanceof Array && profiles.length > 0) {
      const { mediaItems } = profiles[0];
      if (mediaItems instanceof Array && mediaItems.length > 0) {
        profileImg = mediaItems[0].filename;
      }
    }
    return { _id, nickName, roles, profileImg };
  }

  async getBasicByIds(ids: string[], uid: string) {
    const isActive = await this.isActive(uid);
    let users = [];
    if (isActive) {
      const items = await this.userModel
        .find({
          _id: {
            $in: ids,
          },
          active: true,
        })
        .select('_id nickName roles profiles');
      if (items.length > 0) {
        users = items.map(this.mapBasicUser);
      }
    }
    return users;
  }

  async getBasicById(uid: string) {
    const items = await this.userModel
      .find({
        _id: uid,
        active: true,
      })
      .select('_id active nickName roles profiles');
    let user = null;
    if (items.length > 0) {
      const users = items.map(this.mapBasicUser);
      user = users[0];
    }
    return user;
  }

  async count(criteria: any = null, activeOnly = true): Promise<number> {
    const filterCriteria = this.buildCriteria(criteria, activeOnly);
    return await this.userModel.count(filterCriteria).exec();
  }

  buildCriteria = (criteria: object, activeOnly: boolean): object => {
    const filter = new Map<string, any>();
    if (criteria instanceof Object) {
      const keys = Object.keys(criteria);
      for (const key of keys) {
        const val = criteria[key];
        switch (key) {
          case 'roles':
            if (val instanceof Array) {
              filter.set(key, val);
            }
            break;
          case 'active':
            filter.set(key, val > 0 ? true : false);
            break;
          case 'fullName':
          case 'nickName':
            filter.set(key, new RegExp(val, 'i'));
            break;
          case 'email':
          case 'identifier':
            filter.set('identifier', new RegExp(val, 'i'));
            break;
          case 'usearch':
            const rgx = new RegExp('\\b' + val, 'i');
            filter.set('$or', [
              { identifier: rgx },
              { nickName: rgx },
              { fullName: rgx },
            ]);
            break;
          case 'near':
            filter.set('coords', this.buildNearQuery(val));
            break;
          case 'test':
            const boolVal = smartCastBool(val);
            filter.set('test', boolVal);
            if (boolVal) {
              filter.set('test', boolVal);
              filter.set('dob', { $exists: true });
            }
            break;
          case 'createdAt':
            filter.set('createdAt', val);
            break;
        }
      }
      if (activeOnly) {
        filter.set('active', true);
      }
    }
    return hashMapToObject(filter);
  };

  buildMemberCriteria = (
    criteria: object,
    excludedIds: string[] = [],
  ): object => {
    const filter = new Map<string, any>();
    if (criteria instanceof Object) {
      const keys = Object.keys(criteria);
      for (const key of keys) {
        const val = criteria[key];
        switch (key) {
          case 'roles':
            if (val instanceof Array) {
              filter.set(key, val);
            }
            break;
          case 'fullName':
          case 'nickName':
            filter.set(key, new RegExp(val, 'i'));
            break;
          case 'usearch':
            const rgx = new RegExp('\\b' + val, 'i');
            filter.set('$or', [{ nickName: rgx }, { fullName: rgx }]);
            break;
          case 'gender':
            filter.set(
              'gender',
              val
                .trim()
                .toLowerCase()
                .substring(0, 1),
            );
            break;
          case 'age':
            filter.set('dob', this.translateAgeRange(val));
            break;
          case 'genders':
            filter.set('preferences', this.translateTargetGenders(val));
            break;
          case 'age_range':
          case 'ageRange':
          case 'agerange':
            filter.set('preferences', this.translateAgeRangeWithin(val));
            break;
          case 'ids':
            if (val instanceof Array) {
              filter.set('_id', {
                $in: val.filter(
                  id => excludedIds.some(exId => exId === id) === false,
                ),
              });
            }
            break;
        }
      }
    }
    filter.set('active', true);
    filter.set('roles', { $nin: ['superadmin', 'admin', 'blocked', 'editor'] });
    if (excludedIds.length > 0) {
      if (!filter.has('_id')) {
        filter.set('_id', { $nin: excludedIds.map(_id => new ObjectId(_id)) });
      }
    }
    return hashMapToObject(filter);
  };

  // Get a single User
  async getUser(userID: string, overrideSelectPaths = []): Promise<User> {
    const fields =
      overrideSelectPaths instanceof Array && overrideSelectPaths.length > 0
        ? overrideSelectPaths
        : userSelectPaths;
    const user = await this.userModel
      .findById(userID)
      .select(fields.join(' '))
      .exec();
    return user;
  }

  // Get a single User
  async memberRoles(userID: string): Promise<string[]> {
    const fields = ['roles'];
    const user = await this.userModel
      .findById(userID)
      .select(fields.join(' '))
      .exec();
    const roles = user instanceof Object ? user.roles : [];
    return roles;
  }

  async getUserDeviceToken(userID: string): Promise<string> {
    const tokenData = await this.getUser(userID, ['deviceToken']);
    const tokenRef = tokenData instanceof Object ? tokenData.deviceToken : '';
    return notEmptyString(tokenRef, 5) ? tokenRef : '';
  }

  async getUserStatus(userID: string): Promise<any> {
    const statusData = await this.getUser(userID, [
      'active',
      'roles',
      'status',
    ]);
    return statusData instanceof Model ? statusData.toObject() : {};
  }

  // Get a single User
  async findOneByToken(token): Promise<User> {
    return await this.userModel.findOne({ token }).exec();
  }

  // Get a single User
  async findOneByEmail(email: string, activeOnly = true): Promise<User> {
    const filter = new Map<string, any>();
    filter.set('identifier', email);
    if (activeOnly) {
      filter.set('active', true);
    }
    const user = await this.userModel.findOne(hashMapToObject(filter)).exec();
    return user;
  }

  async findByCriteria(criteria: any, activeOnly = true): Promise<string[]> {
    let users = [];
    if (criteria instanceof Object) {
      const filter = new Map<string, any>();
      const keys = Object.keys(criteria);

      for (const key of keys) {
        const val = criteria[key];
        const words = val.split(' ');
        let preLen = 0;
        if (val.length > 2) {
          preLen = val.length > 6 ? 4 : val.length - 2;
        }
        const rgx = new RegExp(
          '^.{0,' +
            preLen +
            '}' +
            val.toLowerCase().replace(/[^a-z0-9]/i, '.*?'),
          'i',
        );
        const fNameRgx = new RegExp('^\\s*' + words[0], 'i');
        const lNameRgx =
          words.length > 1
            ? new RegExp('^\\s*' + words.slice(1), 'i')
            : fNameRgx;

        switch (key) {
          case 'fullName':
          case 'nickName':
            filter.set(key, rgx);
            break;
          case 'email':
          case 'identifier':
            filter.set('identifier', rgx);
            break;
          case 'role':
            filter.set('roles', {
              $in: [val],
            });
            break;
          case 'roles':
            if (notEmptyString(val)) {
              const roles = val
                .split(',')
                .filter(notEmptyString)
                .map(r => r.trim());
              if (roles.length > 1) {
                filter.set('roles', {
                  $in: val,
                });
              }
            }
            break;
          case 'usearch':
            filter.set('$or', [
              { nickName: fNameRgx },
              { fullName: lNameRgx },
              { $and: [{ fullName: fNameRgx }, { nickName: lNameRgx }] },
              { identifier: rgx },
            ]);
            break;
        }
      }
      if (activeOnly) {
        filter.set('active', true);
      }
      users = await this.userModel
        .find(hashMapToObject(filter))
        .select('_id')
        .exec();
    }
    return users.map(u => u._id);
  }

  // create a single user with basic data
  async addUser(
    createUserDTO: CreateUserDTO,
    roles: Array<Role> = [],
  ): Promise<User> {
    const userObj = this.transformUserDTO(
      createUserDTO,
      true,
      roles,
      null,
      true,
    );
    const newUser = new this.userModel(userObj);
    return newUser.save();
  }

  // create a single user with basic data
  async create(inData = null): Promise<User> {
    const userObj = this.transformUserDTO(inData, true);

    const newUser = new this.userModel(userObj);
    return newUser.save();
  }

  transformUserDTO(
    inData = null,
    isNew = false,
    roles: Array<Role> = [],
    currentUser = null,
    mayEditPassword = false,
  ) {
    const hasCurrentUser = currentUser instanceof Object;
    const userObj = hasCurrentUser ? currentUser.toObject() : {};
    const userData = new Map<string, any>();
    const dt = new Date();
    if (isNew) {
      userData.set('roles', ['active']);
    } else if (hasCurrentUser) {
      userData.set('status', userObj.status);
    }
    Object.entries(inData).forEach(entry => {
      const [key, val] = entry;
      switch (key) {
        case 'password':
          if (mayEditPassword) {
            const tsSalt = dt.getTime() % 16;
            userData.set(key, bcrypt.hashSync(val, tsSalt));
            userData.set('mode', 'local');
          }
          break;
        case 'role':
          if (typeof val === 'string') {
            const roles = hasCurrentUser ? userObj.roles : [];
            if (roles.indexOf(val) < 0) {
              roles.push(val);
              userData.set('roles', roles);
            }
          }
          break;
        case 'roles':
          if (val instanceof Array) {
            userData.set('roles', val);
          }
          break;
        case 'nickName':
        case 'fullName':
        case 'imageUri':
        case 'mode':
          userData.set(key, val);
          break;
        case 'identifier':
        case 'email':
          userData.set('identifier', val);
          break;
        case 'geo':
          if (val instanceof Object) {
            const map = new Map(Object.entries(val));
            const lng = map.get('lng');
            const lat = map.get('lat');
            if (isNumeric(lat) && isNumeric(lng)) {
              userData.set(key, val);
              userData.set('coords', [lng, lat]);
            }
          }
          break;
        default:
          if (userEditPaths.includes(key)) {
            userData.set(key, val);
          }
          break;
      }
    });

    const roleKeys = userData.get('roles');
    if (roleKeys instanceof Array) {
      const statusValues: Array<any> = [];
      roleKeys.forEach(role => {
        if (notEmptyString(role, 2) && roles.some(r => r.key === role)) {
          if (!userData.has('status') && typeof role === 'string') {
            const status = {
              role,
              current: true,
              createdAt: dt,
              modifiedAt: dt,
            };
            statusValues.push(status);
          }
        }
      });
      userData.set('status', statusValues);
    }
    if (isNew) {
      userData.set('active', true);
      userData.set('createdAt', dt);
    }
    userData.set('modifiedAt', dt);
    return hashMapToObject(userData);
  }

  // Edit User details
  async updateUser(
    userID: string,
    createUserDTO: CreateUserDTO,
    roles: Role[] = [],
  ): Promise<{ user: User; keys: string[]; message: string }> {
    const user = await this.userModel.findById(userID);
    let message = 'User has been updated successfully';
    const hasPassword = notEmptyString(createUserDTO.password);
    let hasOldPassword = false;
    let mayEditPassword =
      user instanceof Object && notEmptyString(user.password);
    if (hasPassword) {
      hasOldPassword = notEmptyString(createUserDTO.oldPassword, 6);
      if (hasOldPassword) {
        mayEditPassword = bcrypt.compareSync(
          createUserDTO.oldPassword,
          user.password,
        );
      } else {
        const hasAdmin = notEmptyString(createUserDTO.admin, 12);
        mayEditPassword = hasAdmin
          ? await this.isAdminUser(createUserDTO.admin)
          : false;
      }
    }
    if (hasPassword && !mayEditPassword) {
      message = hasOldPassword
        ? `May not edit password as the old password could not be matched`
        : `Not authorised to edit the password`;
    }
    const userObj = this.transformUserDTO(
      createUserDTO,
      false,
      roles,
      user,
      mayEditPassword,
    );
    const hasProfileText =
      Object.keys(createUserDTO).includes('publicProfileText') &&
      notEmptyString(createUserDTO.publicProfileText, 2);
    if (hasProfileText) {
      const profile = {
        type: 'public',
        text: createUserDTO.publicProfileText,
      } as ProfileDTO;
      await this.saveProfile(userID, profile);
    }
    const hasPreferences =
      Object.keys(createUserDTO).includes('preferences') &&
      createUserDTO.preferences instanceof Array &&
      createUserDTO.preferences.length > 0;
    if (hasPreferences) {
      const user = await this.userModel.findById(userID);
      const prefs = this.mergePreferences(user, createUserDTO.preferences);
      userObj.preferences = prefs;
    }
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userID,
      userObj,
      { new: true },
    );

    return {
      keys: Object.keys(userObj).filter(k => {
        return k === 'status' ? userObj[k].length > 0 : true;
      }),
      user: this.removeHiddenFields(updatedUser),
      message,
    };
  }

  // Edit User password
  async updatePassword(userID, password: string): Promise<User> {
    const tsSalt = new Date().getTime() % 16;
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userID,
      {
        password: bcrypt.hashSync(password, tsSalt),
        token: '',
      },
      { new: true },
    );
    return updatedUser;
  }

  async updateStatus(
    userID,
    statusKey: string,
    roles: Array<Role> = [],
    paymentOption: PaymentOption = null,
    payData: PaymentDTO = null,
    expiryDt: Date = null,
    numBoosts = 0,
  ): Promise<User> {
    const user = await this.userModel.findById(userID);
    const validRole = roles.some(r => r.key === statusKey);
    if (user && validRole) {
      const userObj = extractObject(user);
      let payment = null;
      const { boosts } = userObj;
      if (payData instanceof Object) {
        const { service, ref, amount, curr, createdAt } = payData;
        payment = { service, ref, amount, curr, createdAt };
      }
      const currDt = new Date();
      let expiryDate = null;
      if (expiryDt instanceof Date) {
        expiryDate = expiryDt;
      } else if (paymentOption instanceof Object) {
        const { period, duration } = paymentOption;
        if (duration > 0 && notEmptyString(period)) {
          expiryDate = moment()
            .add(duration, period)
            .toDate();
        }
      }
      const { status } = userObj;
      let statuses = status instanceof Array ? status : [];
      const currIndex = statuses.findIndex(
        s => s.role === statusKey && s.current,
      );
      let newPayments: Array<Payment> = [];
      if (payment instanceof Object) {
        if (currIndex >= 0) {
          const prevPayments = statuses[currIndex].payments;
          if (prevPayments instanceof Array) {
            newPayments = [...prevPayments, payment];
          } else {
            newPayments = [payment];
          }
        } else {
          newPayments = [payment];
        }
      }

      if (currIndex < 0) {
        const newStatus = {
          role: statusKey,
          current: true,
          payments: newPayments,
          createdAt: currDt,
          expiresAt: expiryDate,
          modifiedAt: currDt,
        };
        statuses.push(newStatus);
      } else {
        const currStatus = statuses[currIndex];
        const editedStatus = {
          role: currStatus.role,
          current: true,
          payments: newPayments,
          createdAt: currStatus.createdAt,
          expiresAt: expiryDate,
          modifiedAt: currDt,
        };
        statuses[currIndex] = editedStatus;
      }
      statuses = statuses.map(st => {
        if (st.expiresAt) {
          switch (st.role) {
            case 'active':
              break;
            default:
              st.current = moment(currDt) <= moment(st.expiresAt);
              break;
          }
        }
        return st;
      });
      const newRoles = statuses.filter(st => st.current).map(st => st.role);
      const active =
        newRoles.length > 0 && newRoles.includes('blocked') === false;
      const edited: any = {
        active,
        roles: newRoles,
        status: statuses,
        modifiedAt: currDt,
      };
      if (numBoosts > 0) {
        const currBoosts = isNumeric(boosts) ? smartCastInt(boosts, 0) : 0;
        edited.boosts = currBoosts + numBoosts;
      }
      return await this.userModel.findByIdAndUpdate(userID, edited, {
        new: true,
      });
    }
  }

  async decrementBoost(userID = '') {
    const user = await this.userModel.findById(userID).select('boosts');
    const result = { valid: false, boosts: 0 };
    if (user instanceof Model) {
      const { boosts } = user;
      if (isNumeric(boosts)) {
        const currBoosts = smartCastInt(boosts);
        if (currBoosts > 0) {
          const edited = {
            boosts: currBoosts - 1,
          };
          const editedUser = await this.userModel.findByIdAndUpdate(
            userID,
            edited,
            { new: true },
          );
          if (editedUser) {
            result.boosts = currBoosts - 1;
            result.valid = true;
          }
        }
      }
    }
    return result;
  }

  async updateActive(
    userID = '',
    active = false,
    reason = '',
    expiryDate = null,
    removeLastBlock = false,
  ) {
    const user = await this.userModel.findById(userID);
    if (user instanceof Model) {
      const userObj = user.toObject();
      const { status } = userObj;
      const statusItems = status instanceof Array ? status : [];
      const numItems = statusItems.length;
      const reverseBlockIndex = statusItems
        .map(st => st)
        .reverse()
        .findIndex(st => st.role === 'block');
      const lastBlockIndex =
        reverseBlockIndex >= 0 ? numItems - 1 - reverseBlockIndex : -1;
      const dt = new Date();
      const expiresAt =
        expiryDate instanceof Date
          ? expiryDate
          : validISODateString(expiryDate)
          ? new Date(expiryDate)
          : new Date(dt.getTime() + 7 * 24 * 60 * 60 * 1000);
      const block =
        lastBlockIndex >= 0
          ? statusItems[lastBlockIndex]
          : {
              role: 'block',
              current: active,
              expiresAt,
              createdAt: dt,
              modifiedAt: dt,
            };
      if (notEmptyString(reason)) {
        block.reason = reason;
      }
      if (active) {
        if (lastBlockIndex >= 0) {
          if (removeLastBlock) {
            statusItems.splice(lastBlockIndex, 1);
          } else {
            block.current = false;
            block.expiresAt = new Date(dt.getTime() - 3600 * 1000);
            block.reason = 'unblocked';
          }
        }
      } else {
        if (lastBlockIndex >= 0) {
          if (!removeLastBlock) {
            block.expiresAt = expiresAt;
            block.modifiedAt = dt;
          }
        }
      }
      if (lastBlockIndex < 0 && !active) {
        statusItems.push(block);
      } else if (!removeLastBlock) {
        statusItems[lastBlockIndex] = block;
      }
      await this.userModel.findByIdAndUpdate(userID, {
        active,
        roles: statusItems.filter(st => st.current).map(st => st.role),
        status: statusItems,
        modifiedAt: dt,
      });
      return { ...userObj, active, status: statusItems, modifiedAt: dt };
    }
    return {};
  }

  async removeStatus(userID, statusKey: string): Promise<User> {
    const user = await this.userModel.findById(userID);
    if (user) {
      const userObj = extractObject(user);
      const currDt = new Date();
      const { status } = userObj;
      let statuses = status instanceof Array ? status : [];
      statuses = statuses.filter(
        s => s.role !== statusKey && notEmptyString(s.role),
      );
      const newRoles = statuses.filter(st => st.current).map(st => st.role);
      const active =
        newRoles.length > 0 && newRoles.includes('blocked') === false;
      return await this.userModel.findByIdAndUpdate(
        userID,
        {
          active,
          roles: newRoles,
          status: statuses,
          modifiedAt: currDt,
        },
        { new: true },
      );
    }
  }

  async requestReset(userID: string, mode: string) {
    const user = await this.userModel.findById(userID);
    if (user) {
      if (user.active || mode === 'pending') {
        const modifiedAt = new Date().toISOString();
        const token = generateHash();
        return await this.userModel.findByIdAndUpdate(
          userID,
          {
            token,
            modifiedAt,
          },
          { new: true },
        );
      }
    }
  }

  async registerLogin(userID: string, deviceToken = ''): Promise<string> {
    const login = new Date().toISOString();
    const hasDeviceToken = notEmptyString(deviceToken, 5);
    const edited = hasDeviceToken ? { login, deviceToken } : { login };
    const user = await this.userModel.findByIdAndUpdate(userID, edited);
    if (user) {
      return login;
    } else {
      return '-';
    }
  }

  // Delete a User
  async deleteUser(UserID: string): Promise<any> {
    const deletedUser = await this.userModel.findByIdAndRemove(UserID);
    return deletedUser;
  }

  async isValidRoleUser(userID: string, role: string): Promise<boolean> {
    const user = await this.getUser(userID);
    if (user) {
      return this.hasRole(user, role);
    }
    return false;
  }

  async members(
    start = 0,
    limit = 100,
    criteria = null,
    excludedIds: string[] = [],
  ) {
    //const userID = Object.keys(criteria).includes('user')? criteria.user : '';
    const matchCriteria = this.buildMemberCriteria(criteria, excludedIds);
    let nearStage = null;
    if (Object.keys(criteria).includes('near')) {
      const geoMatch = this.buildNearQuery(criteria.near);
      if (geoMatch instanceof Object) {
        const { $near } = geoMatch;
        if ($near instanceof Object) {
          const { $geometry, $minDistance, $maxDistance } = $near;
          nearStage = {
            $geoNear: {
              near: $geometry,
              minDistance: $minDistance,
              maxDistance: $maxDistance,
              spherical: true,
              distanceField: 'distance',
            },
          };
        }
      }
    }
    const steps = [
      { $match: matchCriteria },
      {
        $project: {
          roles: 1,
          preview: 1,
          fullName: 1,
          nickName: 1,
          active: 1,
          dob: 1,
          'placenames.fullname': 1,
          'placenames.type': 1,
          'placenames.name': 1,
          'geo.lat': 1,
          'geo.lng': 1,
          'geo.alt': 1,
          distance: 1,
          profiles: 1,
          'preferences.key': 1,
          'preferences.type': 1,
          'preferences.value': 1,
          gender: 1,
        },
      },
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
    ];
    if (nearStage instanceof Object) {
      steps.unshift(nearStage);
    }
    const users = await this.userModel.aggregate(steps);
    return users;
  }

  hasRole(user: User, role: string): boolean {
    if (user.roles.includes(role)) {
      return user.active;
    }
    return false;
  }

  async savePreference(userID: string, preference: PreferenceDTO) {
    const data = {
      user: null,
      valid: false,
    };
    if (notEmptyString(userID, 16) && preference instanceof Object) {
      const sd = await this.savePreferences(userID, [preference]);
      if (sd.valid) {
        data.user = sd.user;
        data.valid = true;
      }
    }
    return data;
  }

  async savePreferences(userID: string, prefItems: PreferenceDTO[] = []) {
    const user = await this.userModel.findById(userID);
    const profileTextTypes = [
      'profileText',
      'profile_text',
      'publicProfileText',
      'bio',
    ];
    const otherTypes = [...profileTextTypes, 'user'];
    const stringFields = ['fullName', 'nickName'];
    const dtFields = ['dob'];
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object && prefItems instanceof Array) {
      const prefs = this.mergePreferences(
        user,
        prefItems.filter(
          pr => pr instanceof Object && otherTypes.includes(pr.type) === false,
        ),
      );
      const dt = new Date();
      const editMap: Map<string, any> = new Map();
      editMap.set('preferences', prefs);
      editMap.set('modifiedAt', dt);
      const userOpts = prefItems.filter(
        pr => pr instanceof Object && pr.type === 'user',
      );
      if (userOpts.length > 0) {
        userOpts.forEach(row => {
          const { key, value } = row;
          const dataType = typeof value;
          if (key === 'gender' && dataType === 'string') {
            editMap.set('gender', value);
          } else if (key === 'geo' && dataType === 'object') {
            const { lat, lng, altVal } = value;
            if (
              isNumeric(lat) &&
              isNumeric(lng) &&
              inRange(lng, [-180, 180]) &&
              inRange(lat, [-90, 90])
            ) {
              const alt = smartCastFloat(altVal, 10);
              editMap.set('geo', { lat, lng, alt });
              editMap.set('coords', [lng, lat]);
            }
          } else if (stringFields.includes(key)) {
            editMap.set(key, value);
          } else if (dtFields.includes(key)) {
            if (validISODateString(value)) {
              editMap.set(key, value);
            }
          }
        });
      }
      const profileItem = prefItems.find(
        pr => pr instanceof Object && profileTextTypes.includes(pr.type),
      );
      if (profileItem instanceof Object) {
        const profileType = ['private', 'protected'].includes(profileItem.type)
          ? profileItem.type
          : 'public';
        const pubProfile = {
          type: profileType,
          text: profileItem.value,
        } as ProfileDTO;
        const userObj = user.toObject();
        const profiles =
          userObj.profiles instanceof Array ? userObj.profiles : [];
        const currProfileIndex = profiles.findIndex(
          pr => pr.type === profileType,
        );
        const currProfile =
          currProfileIndex < 0 ? null : profiles[currProfileIndex];
        const profile = this.updateProfile(pubProfile, currProfile, dt);
        if (currProfileIndex < 0) {
          profiles.unshift(profile);
        } else {
          profiles[currProfileIndex] = profile;
        }
        editMap.set('profiles', profiles);
      }
      const edited = Object.fromEntries(editMap.entries());
      const savedUser = await this.userModel.findByIdAndUpdate(userID, edited, {
        new: true,
      });
      data.user = this.removeHiddenFields(savedUser);
      data.valid = true;
    }
    return data;
  }

  removeHiddenFields(user = null) {
    const userObj = user instanceof Object ? user.toObject() : {};
    const keys = Object.keys(userObj);
    const hiddenKeys = ['password', 'coords', '__v'];
    hiddenKeys.forEach(key => {
      if (keys.includes(key)) {
        delete userObj[key];
      }
    });
    return userObj;
  }

  mergePreferences(user: User, prefItems: PreferenceDTO[] = []) {
    const userData = user.toObject();
    const { preferences } = userData;
    const prefs = preferences instanceof Array ? preferences : [];
    const filteredPreferences = prefItems.filter(
      pr => pr instanceof Object && pr.type !== 'user',
    );
    for (const prefItem of filteredPreferences) {
      const pKeys = Object.keys(prefItem);
      if (
        pKeys.includes('key') &&
        pKeys.includes('value') &&
        pKeys.includes('type')
      ) {
        const key = prefItem.key.split('__').pop();
        const edited = { ...prefItem, key };
        const currPreferenceIndex = preferences.findIndex(pr => pr.key === key);
        if (currPreferenceIndex >= 0) {
          prefs[currPreferenceIndex].value = prefItem.value;
        } else {
          prefs.push(edited);
        }
      }
    }
    return prefs;
  }

  async saveProfile(userID: string, profile: ProfileDTO) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object) {
      const userData = user.toObject();
      const dt = new Date();
      if (user.profiles instanceof Array) {
        const profileIndex = await user.profiles.findIndex(
          up => up.type === profile.type,
        );
        if (profileIndex >= 0) {
          //const { createdAt } = userData.profiles[profileIndex];
          const editedProfile = this.updateProfile(
            profile,
            userData.profiles[profileIndex],
            dt,
          );
          userData.profiles[profileIndex] = { ...editedProfile };
        } else {
          userData.profiles.push(profile);
        }
      } else {
        userData.profiles = [profile];
      }
      data.user = await this.userModel.findByIdAndUpdate(
        userID,
        { profiles: userData.profiles, modifiedAt: dt },
        {
          new: true,
        },
      );
      data.valid = true;
    }
    return data;
  }

  updateProfile(
    profile: ProfileDTO,
    currentProfile: any = null,
    modifiedAt = null,
  ) {
    const hasCurrent = currentProfile instanceof Object;
    if (hasCurrent) {
      const edited = Object.assign({}, currentProfile);
      Object.entries(profile).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
          case 'text':
            edited.text = value;
            break;
        }
      });
      if (modifiedAt) {
        edited.modifiedAt = modifiedAt;
      }
      return edited;
    } else {
      return profile;
    }
  }

  async saveProfileImage(
    userID: string,
    type: string,
    fileRef = null,
    mediaRef = '',
  ) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object) {
      const dt = new Date().toISOString();
      const userData = this.assignProfile(user, type, fileRef, mediaRef, dt);
      data.user = await this.userModel.findByIdAndUpdate(
        userID,
        { profiles: userData.profiles, modifiedAt: dt },
        {
          new: true,
        },
      );
      data.valid = userData instanceof Object;
      data.user = extractSimplified(userData, ['password', 'coords']);
    }
    return data;
  }

  /**
   * aux. method to assign extra profile data
   * @param user User,
   * profileRef Object | string either the profile type or profile object
   * mediaItemRef Object
   * mediaRef string name of file to be replaced
   */
  assignProfile(
    user: User,
    profileRef = null,
    mediaItemRef = null,
    mediaRef = '',
    dtRef = '',
  ) {
    const userData = user.toObject();
    let profile: any = {};
    let hasProfileData = false;
    if (profileRef instanceof Object) {
      profile = profileRef;
      hasProfileData = true;
    } else if (notEmptyString(profileRef)) {
      hasProfileData = true;
      profile = {
        type: profileRef,
        text: '',
      };
    }
    let mediaItem: any = null;
    let hasMediaItem = false;
    if (mediaItemRef instanceof Object) {
      const mediaKeys = Object.keys(mediaItemRef);
      if (mediaKeys.includes('filename')) {
        mediaItem = mediaItemRef;
        hasMediaItem = true;
      }
    }
    if (user.profiles instanceof Array) {
      const profileIndex = user.profiles.findIndex(
        up => up.type === profile.type,
      );
      if (profileIndex >= 0) {
        const currProfile = userData.profiles[profileIndex];
        const editedProfile: Map<string, any> = new Map(
          Object.entries(currProfile),
        );
        Object.entries(currProfile).forEach(entry => {
          const [k, v] = entry;
          switch (k) {
            case 'createdAt':
              break;
            case 'text':
              if (typeof v === 'string') {
                editedProfile.set(k, v);
              }
              break;
          }
        });
        if (hasMediaItem) {
          if (editedProfile.has('mediaItems')) {
            let items = editedProfile.get('mediaItems');
            let itemIndex = -1;
            if (items instanceof Array) {
              const fileName =
                isSystemFileName(mediaRef) || validUri(mediaRef)
                  ? mediaRef
                  : mediaItem.filename;
              itemIndex = items.findIndex(mi => mi.filename === fileName);
            } else {
              items = [];
            }
            if (itemIndex >= 0) {
              items[itemIndex] = mediaItem;
            } else {
              items.push(mediaItem);
            }
          }
        }
        editedProfile.set('createdAt', currProfile.createdAt);
        userData.profiles[profileIndex] = Object.fromEntries(
          editedProfile.entries(),
        );
      } else {
        if (hasMediaItem) {
          profile.mediaItems = [mediaItem];
        }
        if (validISODateString(dtRef)) {
          profile.modifiedAt = dtRef;
        }
        userData.profiles.push(profile);
      }
    } else if (hasProfileData) {
      if (hasMediaItem) {
        profile.mediaItems = [mediaItem];
      }
      userData.profiles = [profile];
    }
    return userData;
  }

  async deleteMediaItemByRef(userID: string, mediaRef = '') {
    const user = await this.getUser(userID);
    const data = {
      item: null,
      user: null,
      valid: user instanceof Object,
      deleted: false,
    };
    if (data.valid) {
      const userObj = user.toObject();
      const { profiles } = userObj;
      if (profiles instanceof Array) {
        profiles.forEach((profile, index) => {
          const { mediaItems } = profile;
          if (mediaItems instanceof Array && mediaItems.length > 0) {
            const mediaIndex = mediaItems.findIndex(
              mi => mi.filename === mediaRef,
            );
            if (mediaIndex >= 0) {
              data.item = Object.assign({}, mediaItems[mediaIndex]);
              userObj.profiles[index].mediaItems.splice(mediaIndex, 1);
              this.userModel
                .findByIdAndUpdate(userID, {
                  profiles: userObj.profiles,
                })
                .exec();
              data.deleted = true;
            }
          }
        });
        data.user = userObj;
      }
    }
    return data;
  }

  async editMediaItemByRef(
    userID: string,
    mediaRef = '',
    item: MediaItemDTO,
    profileType = '',
  ) {
    const user = await this.getUser(userID);
    const data = {
      item: null,
      user: null,
      valid: user instanceof Object,
      new: false,
      edited: false,
    };
    if (data.valid && item instanceof Object) {
      const userObj = user.toObject();
      const { profiles } = userObj;
      const hasProfile = notEmptyString(profileType, 2);
      let matched = false;
      if (profiles instanceof Array) {
        profiles.forEach((profile, index) => {
          const { mediaItems } = profile;
          if (mediaItems instanceof Array && mediaItems.length > 0) {
            const mediaIndex = mediaItems.findIndex(
              mi => mi.filename === mediaRef || mi._id.toString() === mediaRef,
            );
            if (mediaIndex >= 0) {
              matched = true;
              userObj.profiles[index].mediaItems[
                mediaIndex
              ] = this.assignMediaItem(item, mediaItems[mediaIndex]);
            }
          }
        });
        if (!matched && hasProfile) {
          const profileIndex = profiles.findIndex(
            pr => pr.type === profileType,
          );
          const newMediaItem = this.assignMediaItem(item);
          const itemKeys = Object.keys(newMediaItem);
          const valid =
            itemKeys.includes('filename') && itemKeys.includes('mime');
          if (valid) {
            if (profileIndex >= 0) {
              userObj.profiles[profileIndex].mediaItems.push(newMediaItem);
            } else {
              const newProfile = {
                type: profileType,
                text: '',
                mediaItems: [newMediaItem],
              };
              userObj.profiles.push(newProfile);
            }
            matched = true;
          }
        }
        if (matched) {
          this.userModel
            .findByIdAndUpdate(userID, {
              profiles: userObj.profiles,
            })
            .exec();
          data.edited = true;
        }
        data.new = !matched;
        data.user = userObj;
      }
    }
    return data;
  }

  assignMediaItem(item: MediaItemDTO, current: any = null) {
    const fields = [
      'filename',
      'mime',
      'source',
      'size',
      'attributes',
      'type',
      'title',
    ];
    const hasCurrent = current instanceof Object && current !== null;
    const currentKeys = hasCurrent ? Object.keys(current) : [];
    const newKeys = Object.keys(item);
    const mp: Map<string, any> = new Map();
    fields.forEach(key => {
      if (newKeys.includes(key)) {
        mp.set(key, item[key]);
      } else if (currentKeys.includes(key)) {
        mp.set(key, current[key]);
      }
    });
    const filename = mp.has('filename') ? mp.get('filename') : '';
    const mime = mp.has('mime') ? mp.get('mime') : '';
    const valid = notEmptyString(filename, 5) && notEmptyString(mime, 3);
    const matchedSource = valid
      ? /^\w+:\/\/?/.test(filename)
        ? 'remote'
        : 'local'
      : '';
    if (valid) {
      fields.forEach(field => {
        if (!mp.has(field)) {
          switch (field) {
            case 'attributes':
              mp.set(field, {});
              break;
            case 'size':
              mp.set(field, 0);
              break;
            case 'source':
              mp.set(field, matchedSource);
              break;
            case 'type':
              mp.set(field, mime.split('/').shift());
              break;
          }
        }
      });
    }
    return Object.fromEntries(mp.entries());
  }

  hasAdminRole(user: User): boolean {
    const adminRoles = ['admin', 'superadmin'];
    return adminRoles.some(role => this.hasRole(user, role));
  }

  async isActive(userID: string): Promise<boolean> {
    const user = await this.getUser(userID);
    return user instanceof Object ? user.active : false;
  }

  async isAdminUser(userID: string): Promise<boolean> {
    const user = await this.getUser(userID);
    return user instanceof Object ? this.hasAdminRole(user) : false;
  }

  async isPaidMember(userID: string): Promise<boolean> {
    const roles = await this.getRoles(userID);
    return (
      roles.length > 0 && roles.filter(rk => rk.includes('member')).length > 0
    );
  }

  async getRoles(userID: string): Promise<string[]> {
    const user = await this.userModel.findById(userID).select('active roles');
    return user instanceof Model ? (user.active ? user.roles : []) : [];
  }

  async getAdminIds(): Promise<string[]> {
    const users = await this.userModel
      .find({ roles: 'superadmin', active: true })
      .select('roles');
    return users instanceof Array
      ? users
          .filter(
            u =>
              u.roles instanceof Array && u.roles.includes('blocked') === false,
          )
          .map(u => u._id)
      : [];
  }

  async isBlocked(userID: string): Promise<boolean> {
    return await this.isValidRoleUser(userID, 'blocked');
  }

  async findWithoutCharts(start = 0, limit = 2000) {
    const users = await this.userModel
      .find({ roles: { $in: ['active'] }, test: true })
      .select('_id geo nickName gender dob placenames preferences')
      .skip(start)
      .limit(limit);
    return users;
  }

  buildNearQuery(coordsStr = '') {
    if (
      notEmptyString(coordsStr) &&
      /^-?\d+(\.\d+),-?\d+(\.\d+)(\,\d+(\.\d+)?)?$/.test(coordsStr)
    ) {
      const [lat, lng, km] = coordsStr
        .split(',')
        .filter(isNumeric)
        .map(str => parseFloat(str));
      const distance = isNumeric(km) && km > 0 ? km * 1000 : 100000;
      return {
        $near: {
          $geometry: { type: 'Point', coordinates: [lng, lat] },
          $minDistance: 0,
          $maxDistance: distance,
        },
      };
    } else {
      return {};
    }
  }

  translateAgeRange(strAges = '') {
    let min = 18;
    let max = 30;
    if (/^\d+(,\d+)$/.test(strAges.trim())) {
      const parts = strAges.split(',');
      min = parseInt(parts.shift(), 10);
      const targetMax =
        parts.length > 0 ? parseInt(parts.shift(), 10) : min + 10;
      if (targetMax > min) {
        max = targetMax;
      } else {
        max = min + 10;
      }
    }
    const startDate = moment()
      .subtract(max, 'years')
      .toISOString();
    const endDate = moment()
      .subtract(min, 'years')
      .toISOString();
    return {
      $gte: new Date(startDate),
      $lte: new Date(endDate),
    };
  }

  translateTargetGenders(val = null) {
    const availableKeys = ['f', 'm', 'nb'];
    const opts =
      typeof val === 'string'
        ? val.split(',')
        : val instanceof Array
        ? val.filter(s => typeof s === 'string')
        : [];
    const matchedOpts = opts.filter(k => availableKeys.includes(k));
    const optList: string[][] = [matchedOpts];
    if (matchedOpts.length > 1) {
      optList.push([matchedOpts[0]]);
      optList.push([matchedOpts[1]]);
      optList.push([matchedOpts[1], matchedOpts[0]]);
    }
    if (matchedOpts.length === 3) {
      optList.push([matchedOpts[2]]);
      optList.push([matchedOpts[1], matchedOpts[2]]);
      optList.push([matchedOpts[2], matchedOpts[1]]);
      optList.push([matchedOpts[2], matchedOpts[1], matchedOpts[0]]);
      optList.push([matchedOpts[2], matchedOpts[0], matchedOpts[1]]);
      optList.push([matchedOpts[1], matchedOpts[0], matchedOpts[2]]);
      optList.push([matchedOpts[1], matchedOpts[2], matchedOpts[0]]);
      optList.push([matchedOpts[0], matchedOpts[2], matchedOpts[1]]);
    }
    return {
      $elemMatch: {
        key: { $in: ['gender', 'genders'] },
        value: { $in: optList },
      },
    };
  }

  translateAgeRangeWithin(val = null) {
    const age = smartCastInt(val, 0);
    return {
      $elemMatch: {
        key: 'age_range',
        value: { $gte: age, $lte: age },
      },
    };
  }

  async fetchMaxImages(userID = '', permData = null) {
    const user = await this.userModel
      .findById(userID)
      .select('active roles profiles');
    const hasUser = user instanceof Model;
    const userObj = hasUser ? user.toObject() : {};
    const roles = hasUser ? userObj.roles : [];
    const active = hasUser ? userObj.active : false;
    const permKeys = permData instanceof Object ? Object.keys(permData) : [];
    const isAdmin = roles.some(rk => ['superadmin', 'admin'].includes(rk));
    const permRoles =
      !isAdmin && permKeys.includes('roles') && permData.roles instanceof Array
        ? permData.roles
            .filter(r => roles.includes(r.key))
            .map(r => r.permissions)
        : [];
    const permLimits =
      !isAdmin &&
      permKeys.includes('limits') &&
      permData.limits instanceof Array
        ? permData.limits.map(r => {
            const value = smartCastInt(r.value);
            return { ...r, value };
          })
        : [];

    const perms = permRoles
      .reduce((a, b) => a.concat(b), [])
      .filter(key => key.endsWith('image_upload'));
    const limits = permLimits.filter(pl => perms.includes(pl.key));
    limits.sort((a, b) => b.value - a.value);
    const limit = limits.length > 0 ? limits[0].value : 0;
    let numUploaded = 0;
    if (active && roles.length > 0 && roles.includes('blocked') === false) {
      const profiles =
        userObj.profiles instanceof Array ? userObj.profiles : [];
      profiles.forEach(pr => {
        if (
          pr instanceof Object &&
          Object.keys(pr).includes('mediaItems') &&
          pr.mediaItems instanceof Array
        ) {
          pr.mediaItems.forEach(mi => {
            const { fileType } = matchFileTypeAndMime(mi.filename, mi.mime);
            if (fileType === 'image') {
              numUploaded++;
            }
          });
        }
      });
    }
    const mayUploadMore = isAdmin || numUploaded < limit;
    return {
      limit,
      isAdmin,
      numUploaded,
      active,
      roles,
      mayUploadMore,
      valid: hasUser,
    };
  }

  mapPreferenceKey(key: string) {
    const machineName = key.toLowerCase();
    switch (machineName) {
      case 'sex':
      case 'sexuality':
        return 'gender';
      case 's_age':
      case 'sage':
      case 'search_age':
        return 'age_range';
      default:
        return machineName;
    }
  }

  filterByPreferences(
    items = [],
    query = null,
    prefOpts = [],
    matchByDefault = true,
  ) {
    if (query instanceof Object) {
      const excludeKeys = ['age', 'near', 'gender', 'genders', 'age_range'];
      const matchedOptions: MatchedOption[] = Object.entries(query)
        .filter(entry => excludeKeys.includes(entry[0]) == false)
        .map(entry => {
          const [key, value] = entry;
          const row = prefOpts.find(
            po => po.key === this.mapPreferenceKey(key),
          );
          return row instanceof Object ? { ...row, value } : null;
        })
        .filter(po => po instanceof Object);
      if (matchedOptions.length > 0) {
        return items.filter(item => {
          let valid = true;
          let hasMatchedPreferences = false;
          const { preferences } = item;
          if (preferences instanceof Array && preferences.length > 0) {
            hasMatchedPreferences = true;
            matchedOptions.forEach(mo => {
              const matchedPref = preferences.find(p => p.key === mo.key);
              if (matchedPref instanceof Object) {
                const validOpt = this.validatePreference(mo, matchedPref);
                if (!validOpt) {
                  valid = false;
                }
              }
            });
          }
          return matchByDefault || matchByDefault
            ? valid
            : hasMatchedPreferences && valid;
        });
      }
    }
    return items;
  }

  async fixPreferences(start = 0, limit = 1000, prefOpts: any[] = []) {
    const users = await this.list(start, limit);
    const updatedUsers = [];
    for (const user of users) {
      const { _id, preferences, gender, test } = user.toObject();
      if (preferences instanceof Array) {
        for (let i = 0; i < preferences.length; i++) {
          if (preferences[i] instanceof Object) {
            const opt = prefOpts.find(po => po.key === preferences[i].key);
            if (opt instanceof Object) {
              preferences[i].type = opt.type;
              if (preferences[i].key === 'gender' && test) {
                const isHo = Math.random() < 1 / 30;
                const isBi = Math.random() < 1 / 30;
                const first =
                  (gender === 'm' && !isHo) || (gender === 'f' && isHo)
                    ? 'f'
                    : 'm';
                const opts = [first];
                if (isBi) {
                  const sec = first === 'f' ? 'm' : 'f';
                  opts.push(sec);
                }
                preferences[i].value = opts;
              }
            }
          }
        }
        const edited = { preferences } as CreateUserDTO;
        const ud = await this.updateUser(_id, edited);
        if (ud instanceof Object) {
          updatedUsers.push(ud.user);
        }
        //updatedUsers.push(test,gender, preferences.find(po => po.key === 'gender'));
      }
    }
    return { updated: updatedUsers.length };
  }

  validatePreference(mo: MatchedOption, matchedPref: PrefKeyValue) {
    let valid = false;
    let { value } = mo;
    const itemVal = matchedPref.value;
    switch (mo.key) {
      case 'gender':
        value = value.split(',');
        break;
      case 'age_range':
        value = parseInt(value);
        break;
    }
    switch (mo.key) {
      case 'gender':
        if (itemVal instanceof Array) {
          valid = itemVal.some(v => value.includes(v));
        }
        break;
      case 'age_range':
        if (itemVal instanceof Array && itemVal.length > 1) {
          valid = value >= itemVal[0] && value <= itemVal[1];
        }
        break;
    }
    return valid;
  }

  // save / update a single user with basic data
  async savePublic(inData = null): Promise<PublicUser> {
    const obj = inData instanceof Object ? inData : {};
    const keys = Object.keys(obj);
    let publicUser = null;
    const dt = new Date();
    if (keys.includes('_id') && notEmptyString(obj._id, 16)) {
      publicUser = await this.publicUserModel.findById(obj._id);
    } else if (
      keys.includes('identifier') &&
      notEmptyString(obj.identifier, 2)
    ) {
      publicUser = await this.publicUserModel.findOne({
        identifier: obj.identifier,
      });
      if (!publicUser) {
        const idRgx = new RegExp(obj.identifier, 'i');
        publicUser = await this.publicUserModel.findOne({ identifier: idRgx });
      }
    }
    const isNew = !(publicUser instanceof Model);
    const uMap: Map<string, any> = new Map();
    keys.forEach(k => {
      if (
        [
          'nickName',
          'identifier',
          'useragent',
          'gender',
          'dob',
          'geo',
        ].includes(k)
      ) {
        uMap.set(k, obj[k]);
      }
    });
    if (
      keys.includes('preferences') &&
      obj.preferences instanceof Array &&
      obj.preferences.length > 0
    ) {
      const userObj = isNew ? {} : publicUser.toObject();
      const currentPreferences = isNew
        ? []
        : userObj.preferences instanceof Array && userObj.preferences.length > 0
        ? userObj.preferences
        : [];
      obj.preferences
        .filter(obj => obj instanceof Object)
        .forEach(pref => {
          const { key, value, type } = pref;
          if (notEmptyString(key) && isNumeric(value) && notEmptyString(type)) {
            const currIndex = currentPreferences.findIndex(
              pr => pr.key === pref.key,
            );
            const newPref = normalizedToPreference(
              { key, value: smartCastInt(value, 0) },
              type,
            );
            if (currIndex < 0) {
              currentPreferences.push(newPref);
            } else {
              currentPreferences[currIndex] = newPref;
            }
          }
        });
      uMap.set('preferences', currentPreferences);
    }
    uMap.set('modifiedAt', dt);
    if (isNew) {
      uMap.set('createdAt', dt);
    }
    let savedUser = null;
    const edited = Object.fromEntries(uMap);
    if (isNew) {
      const newUser = new this.publicUserModel(edited);
      savedUser = await newUser.save();
    } else {
      const userID = extractDocId(publicUser);
      await this.publicUserModel.findByIdAndUpdate(userID, edited);
      savedUser = await this.publicUserModel.findById(userID);
    }
    return savedUser;
  }

  async savePublicPreference(
    id = '',
    preference: PreferenceDTO,
  ): Promise<boolean> {
    let valid = false;
    const pUser = await this.publicUserModel.findById(id);
    if (pUser instanceof Model) {
      const { key } = preference;
      const userObj = pUser.toObject();
      const keys = Object.keys(userObj);
      const preferences =
        keys.includes('preferences') && userObj.preferences instanceof Array
          ? userObj.preferences
          : [];
      const prefIndex = preferences.findIndex(pr => pr.key === key);
      if (prefIndex < 0) {
        preferences.push(preference);
      } else {
        preferences[prefIndex] = preference;
      }
      await this.publicUserModel
        .findByIdAndUpdate(id, {
          preferences,
        })
        .exec();
      valid = true;
    }
    return valid;
  }

  async getPublicUser(ref = '', refType = 'identifier') {
    const filter: Map<string, any> = new Map();
    let matchEmail = false;
    switch (refType) {
      case 'identifier':
      case 'email':
        matchEmail = true;
        break;
      case 'id':
      case '_id':
        matchEmail = false;
        break;
      default:
        matchEmail = validEmail(ref);
        break;
    }
    if (matchEmail) {
      const rgx = new RegExp(ref, 'i');
      filter.set('identifier', rgx);
    } else {
      filter.set('_id', ref);
    }
    const criteria = Object.fromEntries(filter.entries());
    return await this.publicUserModel.findOne(criteria);
  }

  async getPublicUsers(start = 0, limit = 100, criteria = null) {
    const critObj = criteria instanceof Object ? criteria : {};

    const filter: Map<string, any> = new Map();
    Object.entries(critObj).forEach(([key, val]) => {
      switch (key) {
        case 'usearch':
          const rgx = new RegExp('\\b' + val, 'i');
          filter.set('$or', [{ identifier: rgx }, { nickName: rgx }]);
          break;
        case 'active':
          filter.set('active', smartCastBool(val, true));
          break;
        case 'answers':
          filter.set('numPrefs', {
            $gt: smartCastInt(val, 0),
          });
          break;
      }
    });
    const matchCriteria = Object.fromEntries(filter.entries());
    const steps = [
      { $match: matchCriteria },
      {
        $project: {
          nickName: 1,
          identifier: 1,
          useragent: 1,
          active: 1,
          'geo.lat': 1,
          'geo.lng': 1,
          gender: 1,
          numPrefs: {
            $cond: {
              if: { $isArray: '$preferences' },
              then: { $size: '$preferences' },
              else: 0,
            },
          },
          'preferences.key': 1,
          'preferences.type': 1,
          'preferences.value': 1,
          dob: 1,
          createdAt: 1,
          modifiedAt: 1,
        },
      },
      {
        $match: matchCriteria,
      },
      {
        $skip: start,
      },
      {
        $limit: limit,
      },
    ];

    return await this.publicUserModel.aggregate(steps);
  }

  async fetchPublicAstroPairs(start = 0, maxUsers = 100) {
    const steps = [
      {
        $match: {
          'preferences.type': 'simple_astro_pair',
        },
      },
      {
        $project: {
          identifier: 1,
          nickName: 1,
          simplePairs: {
            $filter: {
              input: '$preferences',
              as: 'pc',
              cond: { $eq: ['$$pc.type', 'simple_astro_pair'] },
            },
          },
        },
      },
      {
        $sort: {
          modifiedAt: -1,
        },
      },
      {
        $skip: start,
      },
      {
        $limit: maxUsers,
      },
    ];
    const items = await this.publicUserModel.aggregate(steps);
    return items
      .map(row => {
        return row.simplePairs
          .filter(sp => sp.value instanceof Object)
          .map(sp => {
            return {
              email: row.identifier,
              userName: row.nickName,
              key: sp.key,
              ...sp.value,
            };
          });
      })
      .reduce((a, b) => a.concat(b));
  }
}
