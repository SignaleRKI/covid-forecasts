import { Component, OnInit } from '@angular/core';
import { faChartLine } from '@fortawesome/free-solid-svg-icons';
import { contributors } from 'src/app/models/contributors';

@Component({
  selector: 'app-contribs',
  templateUrl: './contribs.component.html',
  styleUrls: ['./contribs.component.scss']
})
export class ContribsComponent implements OnInit {

  logoForecastHub = faChartLine;
  contribs = contributors;

  constructor() { }

  ngOnInit(): void {
  }

}
