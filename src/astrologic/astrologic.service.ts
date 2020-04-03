import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { BodySpeed } from './interfaces/body-speed.interface';
import { BodySpeedDTO } from './dto/body-speed.dto';
import { calcRetroGrade, calcAcceleration, calcStation } from './lib/astro-motion'
import grahaValues from './lib/settings/graha-values';
import { calcJulianDate, calcJulDate } from './lib/date-funcs';

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

  async savePlanetStations(num:number, datetime:string, days:number):Promise<any> {
    const jd = calcJulDate(datetime);
    const body = grahaValues.find(b => b.num === num);
    let prevSpeed = 0;
    let data:any = { valid: false };
    for (let i = 0; i < days; i++) {
      
      const refJd = jd + i;
      data = await calcAcceleration(refJd, body);
      const {start, end} = data;

      if (i > 0) {
        const sd1:BodySpeedDTO = {
          num,
          speed: start.spd,
          lng: start.lng,
          jd: start.jd,
          datetime: start.dt,
          acceleration: start.spd / prevSpeed,
          station: 'sample'
        };
        await this.saveBodySpeed(sd1);
      }
      
      const sd2:BodySpeedDTO = {
        num,
        speed: end.spd,
        lng: end.lng,
        jd: end.jd,
        datetime: end.dt,
        acceleration: data.rate,
        station: 'sample'
      };
      await this.saveBodySpeed(sd2);
      prevSpeed = end.spd;
    }
    return data;
  }

  async saveBodySpeedStation(jd:number ,num:number, station:string ) {
    const bs = await calcStation(jd, num, station);
    console.log(bs)
    this.saveBodySpeed(bs);
  }

  async speedPatternsByPlanet(num:number):Promise<Array<BodySpeed>> {
    const data = await this.bodySpeedModel.find({num}).sort({ jd: 1 }).exec();
    let results:Array<BodySpeed> = [];
    if (data instanceof Array && data.length > 0) {
      let maxSpd = 0;
      let minSpd = 0;
      let maxMatched = false;
      let minMatched = false;
      let currPolarity = 1;
      let prevPolarity = 1;
      let prevRow:any = null;
      let rowsMatched = 0;
      data.forEach(row => {
        currPolarity = row.speed >= 0? 1 : -1;
        if (currPolarity > 0) {
          if (row.speed > maxSpd) {
            maxSpd = row.speed;
          } else if (!maxMatched && prevRow instanceof Object) {
            results.push(prevRow);
            maxMatched = true;
            if (rowsMatched < 4) {
              this.saveBodySpeedStation(prevRow.jd, num, 'peak');
            }
            rowsMatched++;
            maxSpd = -1;
          }
        }
        if (currPolarity < 0) {
          if (row.speed < minSpd) {
            minSpd = row.speed;
          } else if (!minMatched && prevRow instanceof Object) {
            results.push(prevRow);
            minMatched = true;
            if (rowsMatched < 4) {
              this.saveBodySpeedStation(prevRow.jd, num, 'retro-peak');
            }
            rowsMatched++;
            minSpd = 1;
          }
        }
        if (currPolarity !== prevPolarity) {
          results.push(row);
          rowsMatched++;
          maxMatched = false;
          minMatched = false;
          maxSpd = -1;
          minSpd = 1;
          const rs = prevPolarity < 0 ? 'retro-end' : 'retro-start';
          if (rowsMatched < 4) {
            this.saveBodySpeedStation(prevRow.jd, num, rs);
          }
        }
        prevPolarity = currPolarity;
        prevRow = Object.assign({}, row.toObject());
        if (rowsMatched >= 4) {
          rowsMatched = 0;
        }
      });
    }
    return results;
  }

}
