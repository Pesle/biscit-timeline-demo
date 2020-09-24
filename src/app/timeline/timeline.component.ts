import { AfterViewInit, Component, ElementRef, ViewChild, Input, EventEmitter, Output } from '@angular/core';

@Component({
  selector: 'app-timeline',
  templateUrl: './timeline.component.html',
  styleUrls: ['./timeline.component.css']
})
export class TimelineComponent implements AfterViewInit {

	// Used for Category Opened/Closed Icon
	faChevronUp = "⌃";
	faChevronDown = "⌄";
	faChevronLeft = "<";
	faChevronRight = ">";
	
	IsError: boolean;
	
	event: MouseEvent;
	
	@Input('startDate') startDate: Date;
	@Input('dataSource') categoryTree: TlCategory;
	@Input('period') period: number;
	@Input('scale') scale: TlScale;
	
	//Returns date if changed by timeline
	@Output() StartDateChanged = new EventEmitter<Date>();
	
	//Returns category if clicked, displayed or hidden.
	@Output() CategoryClicked = new EventEmitter<TlCategory>();
	@Output() CategoryDisplayed = new EventEmitter<TlCategory>();
	@Output() CategoryHidden = new EventEmitter<TlCategory>();

	//Returns data if a date is clicked or changed
	@Output() EmptyBarClicked = new EventEmitter<TlData>();
	
	//Returns category that has been clicked or changed
	@Output() BarChanged = new EventEmitter<TlData>();
	@Output() BarClicked = new EventEmitter<TlData>();
	
	@ViewChild('tlTimeframe', { static: false }) public tlTimeframe: ElementRef;

	constructor() {
		
		//If startDate not set, set to today
		if(this.startDate == undefined)
			this.startDate = new Date();
		
		//If Period not set, set to 7
		if(this.period == undefined)
			this.period = 7;
		
		//If Scale not set, set to Days
		if(this.scale == undefined)
			this.scale = TlScale.Days;
		
	}
	
	ngAfterViewInit() {
	}
	

//LIST FUNCTIONS
	//--Check if to display category or hide
	protected async categoryClicked(category: TlCategory){
		
		this.CategoryClicked.emit(category);
		
		//If category defined
		if(category !== undefined){
			// If displated, hide
			if(category.displayed){
				this.CategoryHidden.emit(category);
				category.displayed = false;
			// If not displayed, display
			}else{
				this.CategoryDisplayed.emit(category);
				category.displayed = true;
			}
		}
	}
	
	//--Return string with number of tabs
	protected tabs(tab: number) : String{
		var output = String();
		for(var i = 0; i < tab; i++){
			output += "– ";
		}
		return output;
	}
	
	protected checkDates(start: Date, end: Date): Boolean{
		//Check if dates are in date range
		if(end.getTime() >= this.startDate.getTime() && start.getTime() <= this.endDate().getTime()){
			return true;
		}
		return false;
	}
	
	protected changeStartDate(moveBy: number){
		this.startDate = new Date(this.startDate.getTime() + 1000 * 60 * 60 * moveBy);
		this.StartDateChanged.emit(this.startDate);
	}
	
	protected changeStartDateOne(forward: boolean){
		var moveBy: number;
		switch(this.scale){
			case TlScale.Hours:
				moveBy = 24;
				break;
			case TlScale.Days:
				moveBy = 24;
				break;
		}
		if(!forward){
			moveBy = -moveBy;
		}
		this.startDate = new Date(this.startDate.getTime() + 1000 * 60 * 60 * moveBy);
		this.StartDateChanged.emit(this.startDate);
	}
	
	protected categoryBarClicked(category: TlCategory, event: MouseEvent){
		var newData = {
			startTime: this.getDateFromPosition(event.offsetX),
			endTime: null,
			dataId: null,
			categoryId: category.categoryId,
			itemId: null,
			type: null
		}
		this.BarClicked.emit(newData);
	}
	
	protected itemBarClicked(item: TlItem, event: MouseEvent){
		var newData = {
			startTime: this.getDateFromPosition(event.offsetX),
			endTime: null,
			dataId: null,
			categoryId: null,
			itemId: item.itemId,
			type: null
		}
		this.BarClicked.emit(newData);
	}
	
	private getDateFromPosition(offset: number): Date{
		var tlWidth: number = this.tlTimeframe.nativeElement.offsetWidth;
		
		var widthToPeriod: number;
		var newStartDate: Date;
		
		switch(this.scale){
		case TlScale.Hours:
				//Divide width by minutes
			 	widthToPeriod = tlWidth / (this.period * 60);
				//Convert Startdate to minutes, times by (Mouse position / width To Minutes) then convert back to millis
				newStartDate = new Date((Math.round(this.startDate.getTime() / 1000 / 60) + (offset / widthToPeriod)) * 1000 * 60);
				//Round to Minutes
				newStartDate.setMinutes(0);
				break;
				
			case TlScale.Days:
				//Divide width by hours
			 	widthToPeriod = tlWidth / (this.period * 24);
				//Convert Startdate to hours, times by (Mouse position / width To Hours) then convert back to millis
				newStartDate = new Date((Math.round(this.startDate.getTime() / 1000 / 60 / 60) + (offset / widthToPeriod)) * 1000 * 60 * 60);
				//Round to Hours
				newStartDate.setMinutes(0);
				newStartDate.setSeconds(0);
				break;
		}
		return newStartDate;
	}
	
//TIMEFRAME FUNCTIONS
	
	//Returns the width of the frames for displaying in the timeline
	protected getPeriods(): Array<Date>{
		var output = Array<Date>();
		
		
		for (let i = 0; i < this.period; i++) {
			
			//1000 Millis x 60 Seconds x 60 Minutes = 1 Hour
			var multiply: number = 1000 * 60 * 60;
			
			switch(this.scale){
				case TlScale.Hours:
					multiply = multiply * i; // 1 Hour * I = 1 Hour
					break;
				case TlScale.Days:
					multiply = multiply * 24 * i; // 1 Hour * 24 Hours * I = 1 day
					break;
				case TlScale.Weeks:
					multiply = multiply * 24 * 7 * i;// 1 Hour * 24 Hours * 7 days * I = 1 week
					break;
			}
			output.push(new Date(this.startDate.getTime() + multiply));
		}
		return output;
		
	}
	
	//Returns the width of the frames for displaying in the timeline
	protected getGraphStyle(start: Date, end: Date, dataType: TlDataType, offset: number): Object{

		//Get width of timeframe
		var tlWidth: number = this.tlTimeframe.nativeElement.offsetWidth;
		
		var widthToPeriod: number;
		
		var startDateToPeriod: number;
		var endDateToPeriod: number;
		var startToPeriod: number;
		var endToPeriod: number;
		
		var _left: number;
		var _width: number = 100;
		
		switch(this.scale){
			case TlScale.Hours:
				//Divide width by minutes
			 	widthToPeriod = tlWidth / (this.period * 60);
			
				//Convert times to minutes
				startDateToPeriod = Math.round(this.startDate.getTime() / 1000 / 60);
				endDateToPeriod = Math.round(this.endDate().getTime() / 1000 / 60);
			 	startToPeriod = Math.round(start.getTime() / 1000 / 60);
				endToPeriod= Math.round(end.getTime() / 1000 / 60);
				break;
				
			case TlScale.Days:
				//Divide width by hours
			 	widthToPeriod = tlWidth / (this.period*24);
			
				//Convert times to hours	
				startDateToPeriod = Math.round(this.startDate.getTime() / 1000 / 60 / 60);
				endDateToPeriod = Math.round(this.endDate().getTime() / 1000 / 60 / 60);
			 	startToPeriod = Math.round(start.getTime() / 1000 / 60 / 60);
				endToPeriod = Math.round(end.getTime() / 1000 / 60 / 60);
				break;
		}
		
		
		//CALCULATE LEFT
		//If off timeline, start at startDate
		if(startToPeriod < startDateToPeriod){
			startToPeriod = startDateToPeriod;
		}
		//Difference between startDate and booking start times width to time ratio
		var _left = (startToPeriod - startDateToPeriod) * widthToPeriod;
		
		//CALCULATE WIDTH
		//If off timeline, start at startDate
		if(endToPeriod > endDateToPeriod){
			endToPeriod = endDateToPeriod;
		}
		//Difference between end and start times width to time ratio plus offset
		var _width = ((endToPeriod - startToPeriod) * widthToPeriod) + offset;
		
		let style: Object;		
		style = {'margin-left.px': _left, 'width.px': _width};
		if(dataType !== null)
			style = {'margin-left.px': _left, 'width.px': _width, 'background-color': dataType.mainColor, 'border-color': dataType.secondColor};	
		return style;
	}

	//Returns the position of frames for the periods display
	protected getPeriodStyle(start: Date): Object{
		if(this.tlTimeframe !== undefined){
			var endDate: Date;
			switch(this.scale){
				case TlScale.Hours:
					endDate = new Date(start.getTime() + 1000 * 60);
					break;
				case TlScale.Days:
					endDate = new Date(start.getTime() + 1000 * 60 * 60);
					break;
			}
			return this.getGraphStyle(start, endDate, null, -1);
		}
		return null;
	}
	
//GENERAL FUNCTIONS
	
	//--Find Category in the Category Tree
	private findCategory(id: string, list: TlCategory) : TlCategory{
		var category: TlCategory;
		if(list.subCategories.length > 0){
			for(var curCategory of list.subCategories){
				if(curCategory.categoryId!==undefined && curCategory.categoryId == id){
					category = curCategory;
					break;
				}else{
					//Recurse to find category
					if(curCategory.subCategories.length > 0){
						var newCategory = this.findCategory(id, curCategory);
						if(newCategory!==undefined){
							category = newCategory;
							break;
						}
					}
				}
			}
		}
		return category;
	}
	
	//--If the category is currently being displayed
	protected isDisplayed(id: string) : boolean{
		if(id==undefined)
			return true;
		return this.findCategory(id, this.categoryTree).displayed;
	}
	
	protected endDate(): Date{
		var multiple: number = 1;
		if(this.scale == TlScale.Days){
			multiple = 24;
		}
		return new Date((this.startDate.getTime() + 1000 * 60 * 60 * multiple * this.period)-1);
	}


}

export interface TlCategory {
	name: string,
	categoryId: string,
	subCategoryCount: number,
	subCategories: TlCategory[],
	items: TlItem[],
	data: TlData[],
	displayed: boolean
}

export interface TlItem {
	name: string,
	itemId: string,
	data: TlData[],
	disabled: boolean,
	available: boolean
}

export interface TlData {
	startTime: Date,
	endTime: Date,
	dataId: string,
	categoryId: string,
	itemId: string,
	type: TlDataType
}

export interface TlDataType {
	name: string,
	mainColor: string,
	secondColor: string
}

export enum TlScale {
	Hours = "Hours",
	Days  = "Days",
	Weeks = "Weeks",
	Months= "Months",
	Years = "Years"
}
