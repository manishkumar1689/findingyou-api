import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService } from '@nest-modules/mailer';
import { User } from './interfaces/user.interface';
import { CreateUserDTO } from './dto/create-user.dto';
import { hashMapToObject, extractObject } from '../lib/entities';
import * as bcrypt from 'bcrypt';
import { hashSalt } from '../.config';
import { generateHash } from '../lib/hash';
import * as moment from 'moment-timezone';
import { inRange, isNumeric, notEmptyString, validISODateString } from '../lib/validators';
import { Role } from './interfaces/role.interface';
import { Payment } from './interfaces/payment.interface';
import { PaymentOption } from './interfaces/payment-option.interface';
import { PaymentDTO } from './dto/payment.dto';
import { ProfileDTO } from './dto/profile.dto';
import { MatchedOption, PrefKeyValue } from './settings/preference-options';
import { smartCastBool, smartCastFloat } from '../lib/converters';
import { MediaItemDTO } from './dto/media-item.dto';
import { PreferenceDTO } from './dto/preference.dto';

const userSelectPaths = [
  '_id',
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
    return await this.userModel
      .find(filterCriteria)
      .select(userSelectPaths.join(' '))
      .skip(start)
      .limit(limit)
      .sort({ createdAt: -1 });
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
          case 'test':
            const boolVal = smartCastBool(val)
            filter.set('test', boolVal);
            if (boolVal) {
              filter.set('test', boolVal);
              filter.set('dob', { $exists: true });
            }
            break;
        }
      }
      if (activeOnly) {
        filter.set('active', true);
      }
    }
    return hashMapToObject(filter);
  };

  buildMemberCriteria = (criteria: object): object => {
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
        }
      }
    }
    filter.set('active', true);
    filter.set('roles', { $nin: ['superadmin', 'admin', 'blocked', 'editor']});
    return hashMapToObject(filter);
  };

  // Get a single User
  async getUser(userID: string, overrideSelectPaths = []): Promise<User> {
    const fields = (overrideSelectPaths instanceof Array && overrideSelectPaths.length > 0)? overrideSelectPaths : userSelectPaths;
    const user = await this.userModel
      .findById(userID)
      .select(fields.join(' '))
      .exec();
    return user;
  }

  async getUserDeviceToken(userID: string): Promise<string> {
    const tokenData = await this.getUser(userID, ['deviceToken']);
    const tokenRef = tokenData instanceof Object ? tokenData.deviceToken : '';
    return notEmptyString(tokenRef, 5)? tokenRef : '';
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
    currentUser = null
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
          const tsSalt = dt.getTime() % 16;
          userData.set(key, bcrypt.hashSync(val, tsSalt));
          userData.set('mode', 'local');
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
  async updateUser(userID: string, createUserDTO: CreateUserDTO, roles: Role[] = []): Promise<User> {
    const user = await this.userModel.findById(userID);
    const userObj = this.transformUserDTO(createUserDTO, false, roles, user);
    const hasProfileText = Object.keys(createUserDTO).includes("publicProfileText") && notEmptyString(createUserDTO.publicProfileText, 2);
    if (hasProfileText) {
      const profile = { type: 'public', text: createUserDTO.publicProfileText} as ProfileDTO;
      await this.saveProfile(userID, profile);
    }
    const hasPreferences = Object.keys(createUserDTO).includes("preferences") && createUserDTO.preferences instanceof Array && createUserDTO.preferences.length > 0;
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
    
    return this.removeHiddenFields(updatedUser);
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

  async registerLogin(userID: string, deviceToken = ""): Promise<string> {
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

  async members(start = 0, limit = 100, criteria = null) {
    const matchCriteria = this.buildMemberCriteria(criteria);
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
          'preferences.value': 1,
          gender: 1
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
    let valid = false;
    if (user.roles.includes(role)) {
      return user.active;
    }
    return valid;
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

  async savePreferences(userID: string, prefItems:PreferenceDTO[] = []) {
    const user = await this.userModel.findById(userID);
    const profileTextTypes = ['profileText', 'profile_text', 'publicProfileText', 'bio'];
    const otherTypes = [...profileTextTypes, 'user'];
    const stringFields = ['fullName', 'nickName'];
    const dtFields = ['dob'];
    const data = {
      user: null,
      valid: false,
    };
    if (user instanceof Object && prefItems instanceof Array) {
      const prefs = this.mergePreferences(user, prefItems.filter(pr => pr instanceof Object && otherTypes.includes(pr.type) === false));
      const dt = new Date();
      const editMap: Map<string, any> = new Map();
      editMap.set('preferences', prefs);
      editMap.set('modifiedAt', dt);
      const userOpts = prefItems.filter(pr => pr instanceof Object && pr.type === 'user');
      if (userOpts.length > 0) {
        userOpts.forEach(row => {
          const { key, value } = row;
          const dataType = typeof value;
          if (key === 'gender' && dataType === 'string') {
            editMap.set('gender', value);
          } else if (key === 'geo' && dataType === 'object') {
            const {lat, lng, altVal } = value;
            if (isNumeric(lat) && isNumeric(lng) && inRange(lng, [-180, 180]) && inRange(lat, [-90, 90])) {
              const alt = smartCastFloat(altVal, 10);
              editMap.set('geo', { lat, lng, alt});
              editMap.set('coords', [lng, lat]);
            }
          } else if (stringFields.includes(key)) {
            editMap.set(key, value);
          }  else if (dtFields.includes(key)) {
            if (validISODateString(value)) {
              editMap.set(key, value);
            }
          }
        });
      }
      const profileItem = prefItems.find(pr => pr instanceof Object && profileTextTypes.includes(pr.type));
      if (profileItem instanceof Object) {
        const profileType = ['private', 'protected'].includes(profileItem.type)? profileItem.type : 'public';
        const pubProfile = { type: profileType, text: profileItem.value } as ProfileDTO;
        const userObj = user.toObject();
        const profiles = userObj.profiles instanceof Array ? userObj.profiles : [];
        const currProfileIndex = profiles.findIndex(pr => pr.type === profileType);
        const currProfile = currProfileIndex < 0 ? null : profiles[currProfileIndex];
        const profile = this.updateProfile(pubProfile, currProfile, dt);
        if (currProfileIndex < 0) {
          profiles.unshift(profile);
        } else {
          profiles[currProfileIndex] = profile;
        }
        editMap.set('profiles', profiles);
      }
      const edited = Object.fromEntries(editMap.entries());
      const savedUser = await this.userModel.findByIdAndUpdate(
        userID,
        edited,
        {
          new: true,
        },
      );
      data.user = this.removeHiddenFields(savedUser);
      data.valid = true;
    }
    return data;
  }

  removeHiddenFields(user = null) {
    const userObj = user instanceof Object ? user.toObject() : {};
    const keys = Object.keys(userObj);
    if (keys.includes('password')) {
      delete userObj.password;
    }
    if (keys.includes('__v')) {
      delete userObj.__v;
    }
    return userObj;
  }

  mergePreferences(user, prefItems:PreferenceDTO[] = []) {
    const userData = user.toObject();
    const { preferences } = userData;
    const prefs = preferences instanceof Array ? preferences : [];
    const filteredPreferences = prefItems.filter(pr => pr instanceof Object && pr.type !== 'user');
    for (const prefItem of filteredPreferences) {
      const pKeys = Object.keys(prefItem);
      if (
          pKeys.includes('key') &&
          pKeys.includes('value') &&
          pKeys.includes('type')
        ) {
        const key = prefItem.key.split('__').pop();
        const edited = { ...prefItem, key};
        const currPreferenceIndex = preferences.findIndex(
          pr => pr.key === key,
        );
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
          const { createdAt } = userData.profiles[profileIndex];
          const editedProfile = this.updateProfile(profile, userData.profiles[profileIndex], dt);
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

  updateProfile(profile: ProfileDTO, currentProfile: any = null, modifiedAt = null) {
    const hasCurrent = currentProfile instanceof Object;
    if (hasCurrent) {
      const edited = Object.assign({}, currentProfile);
      Object.entries(profile).forEach( entry => {
        const [key, value] = entry;
        switch (key) {
          case 'text':
            edited.text = value;
            break;
        }
      })
      if (modifiedAt) {
        edited.modifiedAt = modifiedAt;
      }
      return edited;
    } else {
      return profile;
    }
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

  // aux. method to assign extra profile data
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

  async deleteMediaItemByRef(userID: string, mediaRef = "") {
    const user = await this.getUser(userID);
    const data = { 
      item: null,
      user: null,
      valid: user instanceof Object,
      deleted: false
    };
    if (data.valid) {
      const userObj = user.toObject();
      const { profiles } = userObj;
      if (profiles instanceof Array) {
        profiles.forEach((profile, index) => {
          const {mediaItems} = profile;
          if (mediaItems instanceof Array && mediaItems.length > 0) {
            const mediaIndex = mediaItems.findIndex(mi => mi.filename === mediaRef);
            if (mediaIndex >= 0) {
              data.item = Object.assign({}, mediaItems[mediaIndex]);
              userObj.profiles[index].mediaItems.splice(mediaIndex, 1);
              this.userModel.findByIdAndUpdate(userID, {
                profiles: userObj.profiles,
              }).exec();
              data.deleted = true;
            }
          }
        });
        data.user = userObj;
      }
    }
    return data;
  }

  async editMediaItemByRef(userID: string, mediaRef = "", item: MediaItemDTO, profileType = '') {
    const user = await this.getUser(userID);
    const data = { 
      item: null,
      user: null,
      valid: user instanceof Object,
      new: false,
      edited: false
    };
    if (data.valid && item instanceof Object) {
      const userObj = user.toObject();
      const { profiles } = userObj;
      const hasProfile = notEmptyString(profileType, 2);
      let matched = false;
      if (profiles instanceof Array) {
        profiles.forEach((profile, index) => {
          const {mediaItems} = profile;
          if (mediaItems instanceof Array && mediaItems.length > 0) {
            const mediaIndex = mediaItems.findIndex(mi => mi.filename === mediaRef || mi._id.toString() === mediaRef);
            if (mediaIndex >= 0) {
              matched = true;
              userObj.profiles[index].mediaItems[mediaIndex] = this.assignMediaItem(item, mediaItems[mediaIndex]);
            }
          }
        });
        if (!matched && hasProfile) {
          const profileIndex = profiles.findIndex(pr => pr.type === profileType);
          const newMediaItem = this.assignMediaItem(item);
          const itemKeys = Object.keys(newMediaItem);
          const valid = itemKeys.includes('filename') && itemKeys.includes('mime');
          if (valid) {
            if (profileIndex >= 0) {
              userObj.profiles[profileIndex].mediaItems.push(newMediaItem);
            } else {
              const newProfile = {
                type: profileType,
                text: '',
                mediaItems: [newMediaItem]
              }
              userObj.profiles.push(newProfile);
            }
            matched = true;
          }
        }
        if (matched) {
          this.userModel.findByIdAndUpdate(userID, {
            profiles: userObj.profiles,
          }).exec();
          data.edited = true;
        }
        data.new = !matched;
        data.user = userObj;
      }
    }
    return data;
  }

  assignMediaItem(item: MediaItemDTO, current: any = null) {
    const fields = ['filename',
    'mime',
    'source',
    'size',
    'attributes',
    'type',
    'title'];
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
    const filename = mp.has('filename')? mp.get('filename') : '';
    const mime = mp.has('mime')? mp.get('mime') : ''
    const valid = notEmptyString(filename, 5) && notEmptyString(mime, 3);
    const matchedSource = valid ? /^\w+:\/\/?/.test(filename)? 'remote' : 'local' : '';
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
      const excludeKeys = ['age', 'near', 'gender'];
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
          updatedUsers.push(ud);
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
}
