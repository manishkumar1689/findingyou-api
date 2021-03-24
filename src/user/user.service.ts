import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService, mail } from '@nest-modules/mailer';
import { User } from './interfaces/user.interface';
import { CreateUserDTO } from './dto/create-user.dto';
import { hashMapToObject, extractObject } from '../lib/entities';
import * as bcrypt from 'bcrypt';
import { hashSalt } from '../.config';
import { generateHash } from '../lib/hash';
import * as moment from 'moment-timezone';
import { isNumber, isNumeric, notEmptyString } from 'src/lib/validators';
import roleValues from './settings/roles';
import { Role } from './interfaces/role.interface';
import { Status } from './interfaces/status.interface';
import { Payment } from './interfaces/payment.interface';
import { PaymentOption } from './interfaces/payment-option.interface';
import { PaymentDTO } from './dto/payment.dto';
import { ProfileDTO } from './dto/profile.dto';
import { simplifyChart } from '../astrologic/lib/member-charts';
const userSelectPaths = [
  '_id',
  'fullName',
  'nickName',
  'identifier',
  'roles',
  'mode',
  'gender',
  'active',
  'test',
  'geo',
  'placenames',
  'status',
  'profiles',
  'preferences',
  'preview',
  'login',
  'preview',
  'createdAt',
  'modifiedAt',
];

@Injectable()
export class UserService {
  constructor(
    @InjectModel('User') private readonly userModel: Model<User>,
    private readonly mailerService: MailerService,
  ) {}
  // fetch all Users
  async list(
    start: number,
    limit: number,
    criteria: any = null,
    activeOnly: boolean = true,
  ): Promise<User[]> {
    const filterCriteria = this.buildCriteria(criteria, activeOnly);
    const Users = await this.userModel
      .find(filterCriteria)
      .select(userSelectPaths.join(' '))
      .skip(start)
      .limit(limit)
      .sort({ createdAt: -1 })
      .exec();
    return Users;
  }
  // count users by criteria
  async count(
    criteria: any = null,
    activeOnly: boolean = true,
  ): Promise<number> {
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
        }
      }
      if (activeOnly) {
        filter.set('active', true);
      }
    }
    return hashMapToObject(filter);
  };

  // Get a single User
  async getUser(userID: string): Promise<User> {
    const user = await this.userModel
      .findById(userID)
      .select(userSelectPaths.join(' '))
      .exec();
    return user;
  }

  // Get a single User
  async findOneByToken(token): Promise<User> {
    return await this.userModel.findOne({ token }).exec();
  }

  // Get a single User
  async findOneByEmail(
    email: string,
    activeOnly: boolean = true,
  ): Promise<User> {
    const filter = new Map<string, any>();
    filter.set('identifier', email);
    if (activeOnly) {
      filter.set('active', true);
    }
    const user = await this.userModel.findOne(hashMapToObject(filter)).exec();
    return user;
  }

  async findByCriteria(
    criteria: any,
    activeOnly: boolean = true,
  ): Promise<string[]> {
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
    const userObj = this.transformUserDTO(createUserDTO, true, roles);

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
    isNew: boolean = false,
    roles: Array<Role> = [],
  ) {
    const userData = new Map<string, any>();
    const dt = new Date();
    if (isNew) {
      userData.set('roles', ['active']);
    }

    Object.entries(inData).forEach(entry => {
      const [key, val] = entry;
      switch (key) {
        case 'password':
          const tsSalt = dt.getTime() % 16;
          userData.set(key, bcrypt.hashSync(val, tsSalt));
          userData.set('mode', 'local');
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
          userData.set(key, val);
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
  async updateUser(userID, createUserDTO: CreateUserDTO): Promise<User> {
    const userObj = this.transformUserDTO(createUserDTO);
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userID,
      userObj,
      { new: true },
    );
    return updatedUser;
  }

  // Edit User password
  async updatePassword(userID, password: string): Promise<User> {
    const updatedUser = await this.userModel.findByIdAndUpdate(
      userID,
      {
        password: bcrypt.hashSync(password, hashSalt),
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
  ): Promise<User> {
    const user = await this.userModel.findById(userID);
    const validRole = roles.some(r => r.key === statusKey);
    if (user && validRole) {
      const userObj = extractObject(user);
      let payment = null;
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
            .toDate()!;
        }
      }
      const { status } = userObj;
      let statuses = status instanceof Array ? status : [];
      const currIndex = statuses.findIndex(
        s => s.role === statusKey && s.current,
      );
      let newPayments: Array<Payment> = [];
      if (payment instanceof Object) {
        if (currIndex < 0) {
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
      let active =
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
      let active =
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

  async registerLogin(userID: string): Promise<string> {
    const loginDt = new Date().toISOString();
    const user = await this.userModel.findByIdAndUpdate(userID, {
      login: loginDt,
    });
    if (user) {
      return loginDt;
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

  async members(start = 0, limit = 100, criteria = null) {
    const filter = new Map<string, any>();
    filter.set('active', true);
    const latLngDist = { lat: 0, lng: 0 };
    if (criteria instanceof Object) {
      Object.entries(criteria).forEach(entry => {
        const [key, value] = entry;
        switch (key) {
        }
      });
    }
    const matchCriteria = Object.fromEntries(filter.entries());
    const userCharts = await this.userModel.aggregate([
      { $match: matchCriteria },
      {
        $lookup: {
          from: 'charts',
          /*  localField: '_id',
          foreignField: 'user', */
          as: 'chart',
          let: { userId: '$_id' },
          pipeline: [
            {
              $match: {
                $expr: {
                  $and: [
                    { $eq: ['$user', '$$userId'] },
                    { $eq: ['$isDefaultBirthChart', true] },
                  ],
                },
              },
            },
          ],
        },
      },
      {
        $project: {
          _id: 0,
          roles: 1,
          preview: 1,
          fullName: 1,
          nickName: 1,
          active: 1,
          placenames: 1,
          geo: 1,
          profiles: 1,
          gender: 1,
          chart: {
            $filter: {
              input: '$chart',
              as: 'chart',
              cond: { isDefaultBirthChart: true },
            },
          },
        },
      },
      {
        $limit: limit,
      },
      {
        $skip: start,
      },
    ]);
    return userCharts.map(item => {
      let chart: any = {};
      let hasChart = false;
      if (item.chart instanceof Array) {
        if (item.chart.length > 0) {
          const index = item.chart.findIndex(c => c.isDefaultBirthChart);
          if (index >= 0) {
            chart = simplifyChart(item.chart[index]);
            hasChart = chart instanceof Object;
          }
        }
      }
      if (item.geo) {
        delete item.geo._id;
      }
      return { ...item, chart, hasChart };
    });
  }

  hasRole(user: User, role: string): boolean {
    let valid = false;
    if (user.roles.includes(role)) {
      return user.active;
    }
    return valid;
  }

  async savePreference(userID: string, preference = null) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object && preference instanceof Object) {
      const pKeys = Object.keys(preference);
      if (
        pKeys.includes('key') &&
        pKeys.includes('value') &&
        pKeys.includes('type')
      ) {
        const userData = user.toObject();
        const { preferences } = userData;
        const prefs = preferences instanceof Array ? preferences : [];
        const currPreferenceIndex = preferences.findIndex(
          pr => pr.key === preference.key,
        );
        if (currPreferenceIndex >= 0) {
          prefs[currPreferenceIndex].value = preference.value;
        } else {
          prefs.push(preference);
        }
        const dt = new Date();
        data.user = await this.userModel.findByIdAndUpdate(
          userID,
          { preferences: prefs, modifiedAt: dt },
          {
            new: true,
          },
        );
        data.valid = true;
      }
    }
    return data;
  }

  async saveProfile(userID: string, profile: ProfileDTO) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object) {
      const userData = user.toObject();
      if (user.profiles instanceof Array) {
        const profileIndex = await user.profiles.findIndex(
          up => up.type === profile.type,
        );
        if (profileIndex >= 0) {
          const { createdAt } = userData.profiles[profileIndex];
          userData.profiles[profileIndex] = { ...profile, createdAt };
        } else {
          userData.profiles.push(profile);
        }
      } else {
        userData.profiles = [profile];
      }
      const dt = new Date();
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

  async saveProfileImage(userID: string, type: string, fileRef = null) {
    const user = await this.userModel.findById(userID);
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object) {
      const userData = this.assignProfile(user, type, fileRef);
      const dt = new Date();
      data.user = await this.userModel.findByIdAndUpdate(
        userID,
        { profiles: userData.profiles, modifiedAt: dt },
        {
          new: true,
        },
      );
      data.valid = userData instanceof Object;
      data.user = userData;
    }
    return data;
  }

  assignProfile(user: User, profileRef = null, mediaItemRef = null) {
    const userData = user.toObject();
    let profile: any = {};
    let hasProfileData = false;
    if (profileRef instanceof Object) {
      profile = profileRef;
      hasProfileData = true;
    } else if (notEmptyString(profileRef)) {
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
              itemIndex = items.findIndex(
                mi => mi.filename === mediaItem.filename,
              );
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
        userData.profiles.push(profile);
      }
    } else {
      if (hasMediaItem) {
        profile.mediaItems = [mediaItem];
      }
      userData.profiles = [profile];
    }
    return userData;
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

  async isBlocked(userID: string): Promise<boolean> {
    return await this.isValidRoleUser(userID, 'blocked');
  }

  buildNearQuery(coordsStr = '') {
    if (
      notEmptyString(coordsStr) &&
      /^-?\d+(\.\d+),-?\d+(\.\d+)(\,\d+(\.\d+))?$/.test(coordsStr)
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
}
