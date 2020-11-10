import {
  Component,
  ViewChild,
  Input,
  EventEmitter,
  Output,
  ChangeDetectorRef,
  AfterViewChecked
} from "@angular/core";
import { DomSanitizer } from "@angular/platform-browser";

@Component({
  selector: "timeline",
  templateUrl: "./timeline.component.html",
  styleUrls: ["./timeline.component.css"]
})
export class TimelineComponent implements AfterViewChecked {
  // Icons
  public matIconChevronUp = this.sanitizer.bypassSecurityTrustHtml(
    '<i class="material-icons" style="font-size:18px">expand_less</i>'
  );
  public matIconChevronDown = this.sanitizer.bypassSecurityTrustHtml(
    '<i class="material-icons" style="font-size:18px">expand_more</i>'
  );
  public matIconChevronLeft = this.sanitizer.bypassSecurityTrustHtml(
    '<i class="material-icons">chevron_left</i>'
  );
  public matIconChevronRight = this.sanitizer.bypassSecurityTrustHtml(
    '<i class="material-icons">chevron_right</i>'
  );
  public matIconFirstPage = this.sanitizer.bypassSecurityTrustHtml(
    '<i class="material-icons">first_page</i>'
  );
  public matIconLastPage = this.sanitizer.bypassSecurityTrustHtml(
    '<i class="material-icons">last_page</i>'
  );

  IsError: boolean;

  //Check for initialisation
  initialised: boolean = false;

  //Used for resizing bars
  rResizer; // Resizer element reference
  rBar; // Bar element reference
  rClicked: boolean = false; //If currently resizing
  rShiftX; // Original position
  rModal; // Modal reference

  //Used for hovering items
  hTimeout; //Timeout event when mouseover
  hSent: boolean = false; //If hover event triggered

  //Used for dragging bars
  dTargetId: string; //ID of the currently dragged bar
  dData: TlData; //Data of the currently dragged bar
  dRoot: string; //Root wrapper id
  dPreviousLeft: string; //Previous mouseover category on left
  dPreviousRight; //Previous mouseover category on right

  //Used for pagination
  lDisplayElements = new Set();
  lClickedQueue: string[] = [];
  lPreviousHeight: number = -1;
  lPreviousCount: number = -1;

  _startDate: Date; //Start date of the timeline
  round: boolean = true; //Whether or not to start weeks on Sunday, months on 1st
  timeframeWidth: number; //Updated every tick

  //Two Way Binding for startDate
  @Input("startDate") set startDate(value: Date) {
    this._startDate = this.roundDate(value);
  }
  get startDate(): Date {
    return this._startDate;
  }

  @Input("dataSource") categoryTree: TlCategory;
  @Input("period") period: number;
  @Input("scale") scale: TlScale;
  @Input("render") preRender: boolean; //Render html elements before sending events to controller, faster UI, but less accurate
  @Input("hoverWait") hWait: number; //Amount of time to wait to trigger item hover
  @Input("limiter") limiter: boolean;
  @Input("elementLimit") elementLimit: number;

  //TWO WAY BINDING OUTPUTS
  //Returns date if changed by timeline
  @Output() startDateChange = new EventEmitter();

  //On Hover Events
  @Output() ItemHover = new EventEmitter<TlItem>();

  //Returns category if clicked, displayed or hidden.
  @Output() CategoryClicked = new EventEmitter<TlCategory>();
  @Output() CategoryDisplayed = new EventEmitter<TlCategory>();
  @Output() CategoryHidden = new EventEmitter<TlCategory>();

  //Returns item that has been moved
  @Output() BarMoved = new EventEmitter<any>();

  //Returns data if a date is clicked or changed
  @Output() EmptyBarClicked = new EventEmitter<TlData>();

  //Returns category that has been clicked or changed
  @Output() BarChanged = new EventEmitter<TlData>();
  @Output() BarClicked = new EventEmitter<TlData>();

  @ViewChild("tlTimeframe", { static: false }) private tlTimeframe: any;
  constructor(
    protected ref: ChangeDetectorRef,
    private sanitizer: DomSanitizer
  ) {
    //Set default values
    if (this.elementLimit == undefined) this.elementLimit = 100;
    if (this.limiter == undefined) this.limiter = false;
    if (this.hWait == undefined) this.hWait = 1000;
    if (this.preRender == undefined) this.preRender = true;
    if (this._startDate == undefined)
      this._startDate = this.roundDate(new Date());
    if (this.period == undefined) this.period = 7;
    if (this.scale == undefined) this.scale = TlScale.Days;
  }

  async ngAfterViewChecked() {
    var _width = this.tlTimeframe.nativeElement.offsetWidth;
    if (_width != this.timeframeWidth) {
      this.timeframeWidth = _width;
    }

    //Recheck once data is loaded and displayed
    // Used to stop bars bunching up
    if (!this.rClicked && this.dRoot == undefined) {
      if (!this.initialised && this.tlTimeframe != undefined) {
        if (this.tlTimeframe.nativeElement.offsetWidth > 0) {
          this.initialised = true;
          this.ref.detectChanges();
        }
      }

      //Should trigger twice, once when the category is first clicked, and then when the data is received

      //If initialised
      //If limiter enabled
      //If category tree is defined
      //If Timeline height changes
      //If number of clicked categories changes
      if (
        (this.initialised &&
          this.limiter &&
          this.categoryTree != undefined &&
          this.lPreviousHeight !=
            this.tlTimeframe.nativeElement.offsetHeight) ||
        this.lPreviousCount != this.lClickedQueue.length
      ) {
        //Clear current page items, then update
        this.ref.detectChanges();
        this.ref.detach();
        this.lDisplayElements.clear();
        this.updateLimiter();

        //Delay to allow lDisplayElememts to fill
        setTimeout(() => {}, 100);

        //Detect changes
        this.ref.reattach();
        this.ref.detectChanges();

        //Update previous
        this.lPreviousHeight = this.tlTimeframe.nativeElement.offsetHeight;
        this.lPreviousCount = this.lClickedQueue.length;
      }
    }
  }

  //LIST FUNCTIONS
  //--Check if to display category or hide
  async categoryClicked(category: TlCategory) {
    this.CategoryClicked.emit(category);

    //If category defined
    if (category !== undefined) {
      // If displayed, hide
      if (category.displayed) {
        //Remove from display queue
        if (this.limiter) {
          const index: number = this.lClickedQueue.indexOf(category.categoryId);
          if (index !== -1) this.lClickedQueue.splice(index, 1);
          this.updateSubLimiter(category, false);
        }
        this.CategoryHidden.emit(category);
        category.displayed = false;
        // If not displayed, display
      } else {
        //Add to display queue
        if (this.limiter) this.lClickedQueue.unshift(category.categoryId);
        this.CategoryDisplayed.emit(category);
        category.displayed = true;
      }
    }
  }

  //--Return string with number of tabs
  tabs(tab: number): String {
    var output = String();
    for (var i = 0; i < tab; i++) {
      output += "– ";
    }
    return output;
  }

  //--Check if the inputted date rate is inside the timelines range
  checkDates(start: Date, end: Date): Boolean {
    //Check if dates are in date range
    if (
      end.getTime() >= this._startDate.getTime() &&
      start.getTime() <= this.endDate().getTime()
    ) {
      return true;
    }
    return false;
  }

  //--Move the start date by a select number
  changeStartDate(moveBy: number) {
    this.startDateChange.next(
      new Date(this._startDate.getTime() + 1000 * 60 * 60 * moveBy)
    );
  }

  //--Set start date
  setStartDate(ev, date: Date) {
    ev.stopPropagation();
    this.startDateChange.next(new Date(date.getTime()));
  }

  //--Round date to start of the day
  roundDate(date: Date): Date {
    if (this.round) {
      switch (this.scale) {
        case TlScale.Days:
          if (this.period == 7) {
            var day = date.getDay(),
              diff = date.getDate() - day;
            date.setDate(diff);
          }
      }
    }
    this.round = true;
    date.setHours(0);
    date.setMinutes(0, 0, 0);
    return date;
  }

  //--Move the start date by one position
  changeStartDateOne(forward: boolean) {
    this.round = false;
    var moveBy: number;
    switch (this.scale) {
      case TlScale.Hours:
        moveBy = 24;
        break;
      case TlScale.Days:
        moveBy = 24;
        break;
    }
    if (!forward) {
      moveBy = -moveBy;
    }
    this.startDateChange.next(
      new Date(this._startDate.getTime() + 1000 * 60 * 60 * moveBy)
    );
  }

  //Return information about
  dataBarClicked(data: TlData, event: MouseEvent) {
    event.stopPropagation();
    this.BarClicked.emit(data);
  }

  //Return information about
  categoryBarClicked(category: TlCategory, event: MouseEvent) {
    var newData = {
      startTime: this.getDateFromPosition(event.offsetX),
      endTime: null,
      dataId: null,
      categoryId: category.categoryId,
      itemId: null,
      type: null
    };
    event.stopPropagation();
    this.EmptyBarClicked.emit(newData);
  }

  itemBarClicked(item: TlItem, event: MouseEvent) {
    var newData = {
      startTime: this.getDateFromPosition(event.offsetX),
      endTime: null,
      dataId: null,
      categoryId: null,
      itemId: item.itemId,
      type: null
    };
    event.stopPropagation();
    this.EmptyBarClicked.emit(newData);
  }

  private getDateFromPosition(offset: number): Date {
    var widthToPeriod: number;
    var newStartDate: Date;

    switch (this.scale) {
      case TlScale.Hours:
        //Divide width by minutes
        widthToPeriod = this.timeframeWidth / (this.period * 60);
        //Convert Startdate to minutes, times by (Mouse position / width To Minutes) then convert back to millis
        newStartDate = new Date(
          (Math.round(this._startDate.getTime() / 1000 / 60) +
            offset / widthToPeriod) *
            1000 *
            60
        );
        //Round to Minutes
        newStartDate.setSeconds(0);
        break;

      case TlScale.Days:
        //Divide width by hours
        widthToPeriod = this.timeframeWidth / (this.period * 24);
        //Convert Startdate to hours, times by (Mouse position / width To Hours) then convert back to millis
        newStartDate = new Date(
          (Math.round(this._startDate.getTime() / 1000 / 60 / 60) +
            offset / widthToPeriod) *
            1000 *
            60 *
            60
        );
        //Round to Hours
        newStartDate.setMinutes(0);
        newStartDate.setSeconds(0);
        break;
    }
    return newStartDate;
  }

  //TIMEFRAME FUNCTIONS

  //Returns the width of the frames for displaying in the timeline
  getPeriods(): Array<Date> {
    var output = Array<Date>();
    for (let i = 0; i < this.period; i++) {
      //1000 Millis x 60 Seconds x 60 Minutes = 1 Hour
      var multiply: number = 1000 * 60 * 60;

      switch (this.scale) {
        case TlScale.Hours:
          multiply = multiply * i; // 1 Hour * I = 1 Hour
          break;
        case TlScale.Days:
          multiply = multiply * 24 * i; // 1 Hour * 24 Hours * I = 1 day
          break;
        case TlScale.Weeks:
          multiply = multiply * 24 * 7 * i; // 1 Hour * 24 Hours * 7 days * I = 1 week
          break;
      }
      output.push(new Date(this._startDate.getTime() + multiply));
    }
    return output;
  }

  getCurrentTimeStyle(marginOffset: number): Object {
    let start = new Date();
    let style: Object;

    //Check if current time is in time periods
    if (
      start.getTime() > this._startDate.getTime() &&
      start.getTime() < this.endDate().getTime()
    ) {
      var widthToPeriod: number;

      var startDateToPeriod: number;
      var startToPeriod: number;

      var _left: number;

      switch (this.scale) {
        case TlScale.Hours:
          //Divide width by minutes
          widthToPeriod = this.timeframeWidth / (this.period * 60);

          //Convert times to minutes
          startDateToPeriod = Math.round(this._startDate.getTime() / 1000 / 60);
          startToPeriod = Math.round(start.getTime() / 1000 / 60);
          break;

        case TlScale.Days:
          //Divide width by hours
          widthToPeriod = this.timeframeWidth / (this.period * 24);

          //Convert times to hours
          startDateToPeriod = Math.round(
            this._startDate.getTime() / 1000 / 60 / 60
          );
          startToPeriod = Math.round(start.getTime() / 1000 / 60 / 60);
          break;
      }

      //Difference between startDate and booking start times width to time ratio
      var _left =
        (startToPeriod - startDateToPeriod) * widthToPeriod + marginOffset;

      style = { "left.px": _left };
    } else {
      style = { display: "none" };
    }
    return style;
  }

  //Returns the width of the frames for displaying in the timeline
  getGraphStyle(
    start: Date,
    end: Date,
    dataType: TlDataType,
    widthOffset: number = 0,
    marginOffset: number = 0
  ): Object {
    let style: Object;

    var widthToPeriod: number;

    var startDateToPeriod: number;
    var endDateToPeriod: number;
    var startToPeriod: number;
    var endToPeriod: number;

    var _left: number;
    var _width: number = 100;

    switch (this.scale) {
      case TlScale.Hours:
        //Divide width by minutes
        widthToPeriod = this.timeframeWidth / (this.period * 60);

        //Convert times to minutes
        startDateToPeriod = Math.round(this._startDate.getTime() / 1000 / 60);
        endDateToPeriod = Math.round(this.endDate().getTime() / 1000 / 60);
        startToPeriod = Math.round(start.getTime() / 1000 / 60);
        endToPeriod = Math.round(end.getTime() / 1000 / 60);
        break;

      case TlScale.Days:
        //Divide width by hours
        widthToPeriod = this.timeframeWidth / (this.period * 24);

        //Convert times to hours
        startDateToPeriod = Math.round(
          this._startDate.getTime() / 1000 / 60 / 60
        );
        endDateToPeriod = Math.round(this.endDate().getTime() / 1000 / 60 / 60);
        startToPeriod = Math.round(start.getTime() / 1000 / 60 / 60);
        endToPeriod = Math.round(end.getTime() / 1000 / 60 / 60);
        break;
    }

    //CALCULATE LEFT
    //If off timeline, start at startDate
    if (startToPeriod < startDateToPeriod) {
      startToPeriod = startDateToPeriod;
    }
    //Difference between startDate and booking start times width to time ratio
    var _left =
      (startToPeriod - startDateToPeriod) * widthToPeriod + marginOffset;

    //CALCULATE WIDTH
    //If off timeline, start at startDate
    if (endToPeriod > endDateToPeriod) {
      endToPeriod = endDateToPeriod;
    }
    //Difference between end and start times width to time ratio plus offset
    var _width = (endToPeriod - startToPeriod) * widthToPeriod + widthOffset;

    var _right = this.timeframeWidth - (_left + _width);

    style = { "left.px": _left, "right.px": _right };
    if (dataType !== null)
      style = {
        "left.px": _left,
        "right.px": _right,
        "background-color": dataType.mainColor,
        "border-color": dataType.secondColor
      };
    return style;
  }

  //Returns the position of frames for the periods display
  getPeriodStyle(start: Date): Object {
    //Check if tlTimeframe is set
    if (this.tlTimeframe !== undefined) {
      //Get endDates
      var endDate: Date;
      switch (this.scale) {
        case TlScale.Hours:
          endDate = new Date(start.getTime() + 1000 * 60 * 60);
          break;
        case TlScale.Days:
          endDate = new Date(start.getTime() + 1000 * 60 * 60 * 24);
          break;
      }
      //Get graph style using endDates
      return this.getGraphStyle(start, endDate, null, -1, -1);
    }
    return null;
  }

  //PAGINATION FUNCTIONS

  //--Find Category in the Category Tree
  public updateLimiter() {
    if (this.lClickedQueue.length > 0) {
      //Go through the list of categories and add displayed to DisplayElements
      //Required for external data inputs
      for (let i = 0; i < this.lClickedQueue.length; i++) {
        let curCategory = this.findCategory(
          this.lClickedQueue[i],
          this.categoryTree
        );

        if (
          this.lDisplayElements.size < this.elementLimit &&
          curCategory.displayed
        )
          this.lDisplayElements.add(curCategory.categoryId);
        if (curCategory.items.length > 0) {
          for (var item of curCategory.items) {
            this.lDisplayElements.add(
              curCategory.categoryId + "-" + item.itemId
            );
          }
        }

        this.updateSubLimiter(curCategory, true);
      }

      //Delete old opened categories
      if (this.lDisplayElements.size > this.elementLimit) {
        //Root path of most recent open
        let rootPath = this.rootPath(this.lClickedQueue[0], this.categoryTree);

        //Loop until displayed elements size is under the element limit
        while (this.lDisplayElements.size > this.elementLimit) {
          //Get last element
          let i = this.lClickedQueue.length - 1;
          if (this.lClickedQueue[i] != undefined) {
            //Break if recent clicked
            if (i == 0) {
              console.log(
                "saving (" + this.lClickedQueue[i] + "). reason: recent"
              );
              break;
              //Break if apart of root and under 3 length
            } else if (
              rootPath.includes(this.lClickedQueue[i]) &&
              this.lClickedQueue.length < 3
            ) {
              console.log(
                "saving (" +
                  this.lClickedQueue[i] +
                  "). reason: limiting recent"
              );
              break;
              //Save if it is apart of the path of the most recent, and next isnt a root
            } else if (
              rootPath.includes(this.lClickedQueue[i]) &&
              !this.isRoot(this.lClickedQueue[i - 1]) &&
              this.lClickedQueue.length >= 2
            ) {
              console.log(
                "saving (" + this.lClickedQueue[i] + "). reason: path of recent"
              );
              this.array_move(this.lClickedQueue, i, i - 1);
              //Save if it is apart of the path of the most recent, and next is a root
            } else if (
              rootPath.includes(this.lClickedQueue[i]) &&
              this.isRoot(this.lClickedQueue[i - 1]) &&
              this.lClickedQueue.length >= 3
            ) {
              console.log(
                "saving (" +
                  this.lClickedQueue[i] +
                  "). reason: path of recent, and next is root"
              );
              this.array_move(this.lClickedQueue, i, i - 2);
              //Save if root and next is not root
            } else if (
              this.isRoot(this.lClickedQueue[i]) &&
              !this.isRoot(this.lClickedQueue[i - 1]) &&
              this.lClickedQueue.length >= 2
            ) {
              console.log(
                "saving (" + this.lClickedQueue[i] + "). reason: root category"
              );
              this.array_move(this.lClickedQueue, i, i - 1);

              //If not saved, close
            } else {
              //Get element in tree, then close it
              let curCat = this.findCategory(
                this.lClickedQueue[i],
                this.categoryTree
              );
              this.CategoryHidden.emit(curCat);
              console.log(
                "closing " + curCat.name + "(" + curCat.categoryId + ")"
              );
              if (curCat != undefined) {
                curCat.displayed = false;
                this.updateSubLimiter(curCat, false);
              }
              this.lClickedQueue.pop();
            }
          }
        }
      }
    }
  }

  //Go through subcategories and items to make all the same displayed value
  //Used to add and remove items and pre-displayed subcategories to displayElements
  updateSubLimiter(list: TlCategory, add: boolean) {
    if (list.subCategories.length > 0) {
      for (var sub of list.subCategories) {
        if (sub.categoryId !== undefined) {
          if (add && list.displayed) this.lDisplayElements.add(sub.categoryId);
          else {
            let index: number = this.lClickedQueue.indexOf(sub.categoryId);
            if (index !== -1) this.lClickedQueue.splice(index, 1);
            this.lDisplayElements.delete(sub.categoryId);
          }
          this.updateSubLimiter(sub, add);
          if (!list.displayed) sub.displayed = false;
        }

        if (sub.items.length > 0) {
          for (var item of sub.items) {
            if (add && sub.displayed)
              this.lDisplayElements.add(sub.categoryId + "-" + item.itemId);
            else
              this.lDisplayElements.delete(sub.categoryId + "-" + item.itemId);
          }
        }
      }
    }
  }

  //Moves element in array from old index to new
  //Used to save elements from being closed.
  array_move(arr, old_index, new_index) {
    if (new_index >= arr.length) {
      var k = new_index - arr.length + 1;
      while (k--) {
        arr.push(undefined);
      }
    }
    arr.splice(new_index, 0, arr.splice(old_index, 1)[0]);
  }

  //MODAL FUNCTIONS

  protected showModal(ev, text: string, topOffset: number) {
    //Get position for modal
    var bodyRect = document.body.getBoundingClientRect();
    var elemRect = ev.target.getBoundingClientRect();
    var offsetTop = elemRect.top - bodyRect.top;
    var offsetLeft = elemRect.left - bodyRect.left;

    this.rModal = document.getElementById("tl-modal") as HTMLElement;
    this.rModal.style.opacity = 1;
    //Top as target position plus offset
    this.rModal.style.top = offsetTop - topOffset + "px";
    //Center to the target
    this.rModal.style.left = offsetLeft + ev.target.offsetWidth / 2 + "px";
    this.rModal.innerHTML = text;
  }

  protected hideModal() {
    this.rModal = document.getElementById("tl-modal") as HTMLElement;
    this.rModal.style.opacity = 0;
    this.rModal.style.top = 0 + "px";
    this.rModal.style.left = 0 + "px";
    this.rModal.innerHTML = "";
  }

  //GENERAL FUNCTIONS

  //Emit Item to ItemHover if the user has their mouse hovering for more than hWait
  itemHover(ev, item: TlItem) {
    if (item == null) {
      ev.target.style.cursor = "default";
      clearTimeout(this.hTimeout);
      if (this.hSent == true) this.ItemHover.emit(null);
    } else {
      ev.target.style.cursor = "progress";
      this.hTimeout = setTimeout(() => {
        this.ItemHover.emit(item);
        this.hSent = true;
        ev.target.style.cursor = "default";
      }, this.hWait);
    }
  }

  overflowHover(ev, date: Date) {
    ev.preventDefault();
    ev.stopPropagation();
    //Copy of date so it doesnt round actual date
    this.showModal(
      ev,
      "<b>Goto Date: </b><br/>" +
        this.roundDate(new Date(date.getTime())).toLocaleDateString(),
      -7
    );
  }

  overflowOut() {
    this.hideModal();
  }

  resize(ev, data: TlData, side: string) {
    //When first dragged
    if (!this.rClicked) {
      //Check if its in range.
      //Offset by 100 to allow 12:00am to be draggable when on edge
      if (
        (data.startTime.getTime() + 100 >= this.startDate.getTime() &&
          side == "left") ||
        (data.endTime.getTime() - 100 <= this.endDate().getTime() &&
          side == "right")
      ) {
        this.rResizer = ev.target;
        this.rBar = ev.target.parentElement;
        this.rClicked = true;
        //Stop Angular from checking changes
        this.ref.detach();

        //Set shift to original mouse position +/- original side position
        if (side == "left")
          this.rShiftX =
            ev.clientX - parseInt(this.rBar.style.left.slice(0, -2));
        else
          this.rShiftX =
            ev.clientX + parseInt(this.rBar.style.right.slice(0, -2));
      }
    }
    if (this.rClicked) {
      //Prevents other drags or clicks
      ev.preventDefault();
      ev.stopPropagation();

      var date;
      var oldDate;

      //Set new left value
      if (ev.clientX != 0 && side == "left") {
        //Current xpos - starting xpos
        let newLeft = ev.clientX - this.rShiftX;

        //Check Edges
        if (newLeft < 0) newLeft = 0;
        let rightEdge = this.timeframeWidth;
        if (newLeft > rightEdge) newLeft = rightEdge;

        this.rBar.style.left = newLeft + "px";

        date = this.getDateFromPosition(newLeft);
        oldDate = new Date(data.startTime.getTime());
      } else if (ev.clientX != 0 && side == "right") {
        //Starting xpos - current xpos
        let newRight = this.rShiftX - ev.clientX;

        //Check Edges
        if (newRight < 0) newRight = 0;
        let rightEdge = this.timeframeWidth;
        if (newRight > rightEdge) newRight = rightEdge;

        this.rBar.style.right = newRight + "px";
        let width = this.timeframeWidth;

        date = this.getDateFromPosition(width - newRight);
        oldDate = new Date(data.endTime.getTime());
      }

      var mo = "";

      //Bold if day changes
      if (date.getDate() == oldDate.getDate()) mo += date.getDate() + "/";
      else mo += "<b>" + date.getDate() + "</b>/";
      //Bold if month changes
      if (date.getMonth() == oldDate.getMonth())
        mo += date.getMonth() + 1 + "/";
      else mo += "<b>" + (date.getMonth() + 1) + "</b>/";
      //Bold if year changes
      if (date.getFullYear() == oldDate.getFullYear())
        mo += date.getFullYear() + "<br/>";
      else mo += "<b>" + date.getFullYear() + "</b><br/>";
      //Arrow if time smaller
      if (
        date.getTime() > oldDate.getTime() &&
        this.formatAMPM(date) != this.formatAMPM(oldDate)
      ) {
        mo += "< ";
      }
      //Bold if time changes
      if (this.formatAMPM(date) == this.formatAMPM(oldDate)) {
        mo += this.formatAMPM(date);
      } else {
        mo += "<b>" + this.formatAMPM(date) + "</b>";
      }
      //Arrow if time greater
      if (
        date.getTime() < oldDate.getTime() &&
        this.formatAMPM(date) != this.formatAMPM(oldDate)
      ) {
        mo += " >";
      }

      this.showModal(ev, mo, -5);
    }
  }

  resizeUp(data: TlData, side: string) {
    //Prevent triggering after drag
    if (this.rClicked && this.dRoot == undefined) {
      let result: TlData = Object.assign({}, data);

      //Calculate new times
      let width = this.timeframeWidth;
      if (side == "left") {
        let time = this.getDateFromPosition(
          parseInt(this.rBar.style.left.slice(0, -2))
        );
        if (this.preRender)
          //Set new start time if preRender enabled
          data.startTime = time;
        result.startTime = time;
      } else {
        let time = this.getDateFromPosition(
          width - parseInt(this.rBar.style.right.slice(0, -2))
        );
        if (this.preRender)
          //Set new end time if preRender enabled
          data.endTime = time;
        result.endTime = time;
      }
      this.hideModal();

      //Restart Angular to check changes
      this.ref.reattach();
      //Send TlData changed
      this.BarChanged.emit(result);
      this.rClicked = false;
    }
  }

  allowDrop(ev, leftId: string, root: string) {
    ev.preventDefault();

    //Get leftSide element
    let leftElement = document.getElementById(leftId) as HTMLElement;
    let rightElement;
    if (ev.target.id == "tl-elem") rightElement = ev.target;

    //If matching root, highlight it
    if (this.dRoot == root) {
      leftElement.style.backgroundColor = "#cdcdcd";
      if (rightElement != null) rightElement.style.backgroundColor = "#cdcdcd";
    }

    //Reset previous leftSide element
    if (this.dPreviousLeft != undefined && this.dPreviousLeft != leftId) {
      let dPreviousElement = document.getElementById(
        this.dPreviousLeft
      ) as HTMLElement;

      if (this.dPreviousRight != null)
        this.dPreviousRight.style.backgroundColor = "";
      dPreviousElement.style.backgroundColor = "";
      this.dPreviousLeft = leftId;
      this.dPreviousRight = rightElement;
    }
    if (this.dPreviousLeft == undefined) this.dPreviousLeft = leftId;
    if (rightElement != null) this.dPreviousRight = rightElement;
  }

  //Return colors to original
  dragEnd() {
    //Prevent triggering after resize
    if (!this.rClicked && this.dRoot != undefined) {
      if (this.dPreviousLeft != undefined) {
        let dPreviousElement = document.getElementById(
          this.dPreviousLeft
        ) as HTMLElement;
        dPreviousElement.style.backgroundColor = "";
        if (this.dPreviousRight != null)
          this.dPreviousRight.style.backgroundColor = "";
        this.dPreviousLeft = null;
        this.dPreviousRight = null;
      }

      this.dTargetId = null;
      this.dData = null;
      this.dRoot = null;

      //Restart Angular to check changes
      this.ref.reattach();
    }
  }

  drag(ev, data: TlData, root: string) {
    if (!this.rClicked) {
      //Stop Angular from checking changes
      this.ref.detach();
      this.dTargetId = ev.target.id;
      this.dData = data;
      this.dRoot = root;
    }
  }

  //Event, ID of drop, Type of drop, category Root of item
  drop(ev, toId: string, toType: string, root: string) {
    ev.preventDefault();

    //Check if item is in the correct category group, and that the target is a empty bar
    if (!this.rClicked && this.dRoot == root && ev.target.id == "tl-elem") {
      //Set type and ID depending on source
      var fromType = "Category";
      var fromId = this.dData.categoryId;

      if (this.dData.itemId != null) {
        fromType = "Item";
        fromId = this.dData.itemId;
      }

      //Change bar to line manually before data refresh
      if (this.preRender) {
        ev.target.appendChild(document.getElementById(this.dTargetId));
      }

      //Return JSON data
      var result: string =
        '{"dataId": "' +
        this.dData.dataId +
        '", ' +
        '"fromType": "' +
        fromType +
        '", "fromId": "' +
        fromId +
        '", ' +
        '"toType": "' +
        toType +
        '", "toId": "' +
        toId +
        '"}';
      this.BarMoved.emit(JSON.parse(result));
    }
  }

  //--Find Category in the Category Tree
  public findCategory(id: string, list: TlCategory): TlCategory {
    var category: TlCategory;
    if (list.subCategories.length > 0) {
      for (var curCategory of list.subCategories) {
        if (
          curCategory.categoryId !== undefined &&
          curCategory.categoryId == id
        ) {
          category = curCategory;
          break;
        } else {
          //Recurse to find category
          if (curCategory.subCategories.length > 0) {
            var newCategory = this.findCategory(id, curCategory);
            if (newCategory !== undefined) {
              category = newCategory;
              break;
            }
          }
        }
      }
    }
    return category;
  }

  public isRoot(id: string): boolean {
    if (this.categoryTree.subCategories.length > 0) {
      for (var curCategory of this.categoryTree.subCategories) {
        if (curCategory.categoryId == id) {
          return true;
          break;
        }
      }
    }
    return false;
  }

  public rootPath(id: string, list: TlCategory): string[] {
    let result: string[] = [];
    if (list.subCategories.length > 0) {
      for (var curCategory of list.subCategories) {
        if (
          curCategory.categoryId !== undefined &&
          curCategory.categoryId == id
        ) {
          result.unshift(curCategory.categoryId);
          break;
        } else {
          //Recurse to find category
          if (curCategory.subCategories.length > 0) {
            var newCategory = this.rootPath(id, curCategory);
            if (newCategory.length > 0) {
              result = newCategory;
              result.unshift(curCategory.categoryId);
              break;
            }
          }
        }
      }
    }
    return result;
  }

  public findRoot(id: string, list: TlCategory): string {
    var result: string = "";
    if (list.subCategories.length > 0) {
      for (var curCategory of list.subCategories) {
        if (
          curCategory.categoryId == id ||
          this.findCategory(id, curCategory) != null
        ) {
          result = curCategory.categoryId;
          break;
        }
      }
    }
    return result;
  }

  //--If the category is currently being displayed
  isDisplayed(id: string): boolean {
    if (id == undefined) return true;
    return this.findCategory(id, this.categoryTree).displayed;
  }

  endDate(): Date {
    var multiple: number = 1;
    if (this.scale == TlScale.Days) {
      multiple = 24;
    }
    return new Date(
      this._startDate.getTime() + 1000 * 60 * 60 * multiple * this.period - 1
    );
  }

  formatAMPM(date): string {
    var hours = date.getHours();
    var minutes = date.getMinutes();
    var ampm = hours >= 12 ? "pm" : "am";
    hours = hours % 12;
    hours = hours ? hours : 12; // the hour '0' should be '12'
    minutes = minutes < 10 ? "0" + minutes : minutes;
    var strTime = hours + ":" + minutes + " " + ampm;
    return strTime;
  }
}

export interface TlCategory {
  name: string;
  categoryId: string;
  subCategoryCount: number;
  subCategories: TlCategory[];
  items: TlItem[];
  data: TlData[];
  displayed: boolean;
}

export interface TlItem {
  name: string;
  itemId: string;
  data: TlData[];
  disabled: boolean;
  available: boolean;
}

export interface TlData {
  startTime: Date;
  endTime: Date;
  dataId: string;
  categoryId: string;
  itemId: string;
  type: TlDataType;
}

export interface TlDataType {
  name: string;
  mainColor: string;
  secondColor: string;
}

export enum TlScale {
  Hours = "Hours",
  Days = "Days",
  Weeks = "Weeks",
  Months = "Months",
  Years = "Years"
}
