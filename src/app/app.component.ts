import {Component} from '@angular/core';

//import { TlCategory, TlData, TlItem, TlDataType, TlScale } from './timeline/timeline.component';

@Component({
  selector: 'my-app',
  templateUrl: './app.component.html',
  styleUrls: [ './app.component.css' ]
})
export class AppComponent  {
  name = 'Angular ' + VERSION.major;
}
