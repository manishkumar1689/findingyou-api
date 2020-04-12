import { Injectable } from '@nestjs/common';
import { Model } from 'mongoose';
import { InjectModel } from '@nestjs/mongoose';
import { MailerService, mail } from '@nest-modules/mailer';
import { User } from './interfaces/user.interface';
import { CreateUserDTO } from './dto/create-user.dto';
import { hashMapToObject } from '../lib/entities';
import * as bcrypt from 'bcrypt';
import { hashSalt } from '../.config';
import { generateHash } from '../lib/hash';
import * as moment from 'moment-timezone';
import { notEmptyString } from 'src/lib/validators';
import roleValues from './settings/roles';

const userSelectPaths = [
  '_id',
  'fullName',
  'nickName',
  'identifier',
  'roles',
  'mode',
  'active',
  'test',
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
  async getAllUser(
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
            filter.set(key, new RegExp(val));
            break;
          case 'email':
          case 'identifier':
            filter.set('identifier', new RegExp(val));
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
  async getUser(userID): Promise<User> {
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

  // post a single User
  async addUser(createUserDTO: CreateUserDTO): Promise<User> {
    const userObj = this.transformUserDTO(createUserDTO, true);
    const saveObj = { ...userObj };
    const newUser = new this.userModel(saveObj);
    return newUser.save();
  }

  transformUserDTO(createUserDTO: CreateUserDTO, isNew: boolean = false) {
    const userData = new Map<string, any>();
    let activate = false;
    const dtStr = new Date().toISOString();
    Object.entries(createUserDTO).forEach(entry => {
      const [key, val] = entry;
      switch (key) {
        case 'password':
          if (createUserDTO.password) {
            userData.set(key, bcrypt.hashSync(val, hashSalt));
          }
          break;
        case 'roles':
          if (val instanceof String) {
            userData.set('roles', val);
            //this.setRoles();
          }
          break;
        default:
          userData.set(key, val);
          break;
      }
    });
    if (isNew) {
      userData.set('createdAt', dtStr);
    }
    userData.set('modifiedAt', dtStr);
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

  async updateStatus(userID, status: string): Promise<User> {
    const user = await this.userModel.findById(userID);
    if (user) {
      let active = false;
      switch (status) {
        case 'active':
          active = true;
          break;
      }
      const current = user.status.find(s => s.current);
      let currStatus = '';
      if (current) {
        currStatus = current.role;
      }
      if (currStatus !== status) {
        const currDt = new Date();
        const expiryDate: Date = moment()
          .add(1, 'year')
          .toDate()!;
        const statuses = user.status.map(row => {
          return {
            role: status,
            current: false,
            createdAt: row.createdAt,
            expiresAt: row.expiresAt,
            modifiedAt: currDt,
          };
        });

        statuses.push({
          role: status,
          current: true,
          createdAt: currDt,
          expiresAt: expiryDate,
          modifiedAt: currDt,
        });
        return await this.userModel.findByIdAndUpdate(
          userID,
          {
            active,
            status: statuses,
            modifiedAt: currDt,
          },
          { new: true },
        );
      }
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

  async registerLogin(userID: string) {
    const loginDt = new Date().toDateString();
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
    const adminUser = await this.getUser(userID);
    if (adminUser) {
      if (adminUser.roles.includes(role)) {
        return adminUser.active;
      }
    }
    return false;
  }

  async isAdminUser(userID: string): Promise<boolean> {
    return await this.isValidRoleUser(userID, 'admin');
  }

  async isBlocked(userID: string): Promise<boolean> {
    return await this.isValidRoleUser(userID, 'blocked');
  }
}
