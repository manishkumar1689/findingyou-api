import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BodySpeed } from './interfaces/body-speed.interface';
import { BodySpeedDTO } from './dto/body-speed.dto';

@Injectable()
export class AstrologicService {

  constructor(
    @InjectModel('BodySpeed')
    private bodySpeedModel: Model<BodySpeed>,
  ) {}

  // post a single Submission
  async saveBodySpeed(
    data: BodySpeedDTO,
  ): Promise<BodySpeed> {
    const record = await this.bodySpeedModel.findOne({jd: data.jd}).exec();
    if (record instanceof Object) {
      const { _id } = record;
      await this.bodySpeedModel.findByIdAndUpdate(
        _id,
        data,
        { new: false },
      ).exec();
      return await this.bodySpeedModel.findById(_id);
    } else {
      const newBodySpeed = await this.bodySpeedModel.create(data);
      return newBodySpeed.save();
    }
  }

}
