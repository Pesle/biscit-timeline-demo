import {Component} from '@angular/core';

import { TlCategory, TlData, TlItem, TlDataType, TlScale } from './timeline/timeline.component';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  dataIdInc: number;
  startDate: Date;
  scale: TlScale;

  categoryTree: TlCategory;

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
            data: this.randomData(10, "1", ""),
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
            data: this.randomData(10, "3", ""),
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
    var dataArray: Array<TlData>;
    for(var i = 0; i < events; i++){
      var dates = this.randomDates();
      var data: TlData = {
        startTime: dates[0],
        endTime: dates[1],
        dataId: this.dataIdInc+"",
        categoryId: categoryId,
        itemId: itemId,
        type: this.randomDataType()
      }
      dataArray.push(data);
    }
    return dataArray;
  }

  randomDataType(): TlDataType{
    return this.dataTypes[this.randomNumber(2)-1];
  }

  randomDates(): Date[]{
    var time1 = this.randomNumber(144);
    var time2 = time1 + this.randomNumber(288);
    var today = new Date();

    var dates: Array<Date>;
    dates.push(new Date(today.getTime()+(32-time1)*60*60*1000));
    dates.push(new Date(today.getTime()+time1*60*60*1000));
    return dates;
  }

  randomNumber(max): number{
    return Math.floor(Math.random() * Math.floor(max));
  }
}
