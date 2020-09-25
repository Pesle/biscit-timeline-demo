import {Component} from '@angular/core';

import { TlCategory, TlData, TlItem, TlDataType, TlScale } from './timeline/timeline.component';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  dataIdInc: number = 0;
  public startDate: Date;
  public scale: TlScale;

  public categoryTree: TlCategory;

  dataTypes: Array<TlDataType>;

  constructor(){
    this.startDate = new Date();
    this.scale = TlScale.Days;

    this.dataTypes = [
      {name: "Reservation", mainColor: '#090', secondColor: '#070'},
      {name: "Expression Of Interest", mainColor: '#099', secondColor: '#077'}
    ];

    this.categoryTree = {
      name: "ROOT",
      categoryId: "0",
      subCategoryCount: 2,
      subCategories: [
        {
          name: "Rooms",
          categoryId: "1",
          subCategoryCount: 0,
          subCategories: [],
          items: [{
            name: "Lounge Room",
            itemId: "1",
            data: this.randomData(5, "1", ""),
            disabled: false,
            available: true
          },{
            name: "BoardRoom",
            itemId: "2",
            data: this.randomData(5, "2", ""),
            disabled: false,
            available: true
          }],
          data: [],
          displayed: false
        },{
          name: "Equipment",
          categoryId: "2",
          subCategoryCount: 0,
          subCategories: [],
          items: [{
            name: "Whiteboard",
            itemId: "3",
            data: this.randomData(5, "3", ""),
            disabled: false,
            available: true
          }],
          data: [],
          displayed: false
        }
      ],
      items: [],
      data: [],
      displayed: true
    }
  }

  randomData(events: number, itemId: string, categoryId: string): TlData[]{
    var dataArray: Array<TlData> = [];
    //Start random data dates at 72 hours before startDate
    var nextDate: Date = new Date(this.startDate.getTime() - 72 * 60 * 60 * 1000);
    for(var i = 0; i < events; i++){
      var dates = this.randomDates(nextDate);
      var data: TlData = {
        startTime: dates[0],
        endTime: dates[1],
        dataId: this.dataIdInc+"",
        categoryId: categoryId,
        itemId: itemId,
        type: this.randomDataType()
      }
      //Update nextDate to previous finish date
      nextDate = dates[1];
      this.dataIdInc++;
      dataArray.push(data);
    }
    return dataArray;
  }

  randomDataType(): TlDataType{
    if(this.randomNumber(10) > 5)
      return this.dataTypes[1];
    return this.dataTypes[0];
  }

  randomDates(previousDate: Date): Date[]{
    //Generate random hours
    var time1 = this.randomNumber(72);
    var time2 = this.randomNumber(72)+12;

    var dates: Array<Date> = [];
    //Add random hours to previous date
    dates.push(new Date(previousDate.getTime()+time1*60*60*1000));
    //Add random hours to start date
    dates.push(new Date(dates[0].getTime()+time2*60*60*1000));
    return dates;
  }

  randomNumber(max): number{
    return Math.floor(Math.random() * Math.floor(max));
  }
}
