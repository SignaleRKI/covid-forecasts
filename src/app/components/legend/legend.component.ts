import { Component, OnInit, Input, Output, EventEmitter, OnChanges, SimpleChanges, ViewChildren, QueryList, AfterViewInit } from '@angular/core';
import * as _ from 'lodash';
import { ForecastPlotService } from 'src/app/services/forecast-plot.service';
import { map } from 'rxjs/operators';
import { combineLatest, forkJoin, Observable } from 'rxjs';
import { SeriesInfo, DataSourceSeriesInfo, ForecastSeriesInfo, ModelInfo } from 'src/app/models/series-info';
import { TruthToPlotSource, TruthToPlotValue } from 'src/app/models/truth-to-plot';
import { faChevronLeft, faChevronRight, faExclamationTriangle, faEye, faEyeSlash } from '@fortawesome/free-solid-svg-icons';
import { faQuestionCircle } from '@fortawesome/free-regular-svg-icons';
import { LocationLookupItem } from 'src/app/models/lookups';
import { contributorsByModelName } from 'src/app/models/contributors';
import { kitModelsByModelName } from 'src/app/models/kit-models';

type LegendItem = ForecastLegendItem | DataSourceLegendItem;

interface ForecastLegendItem {
  $type: 'ForecastLegendItem';

  model: ModelInfo;
  tooltipText: string;
  enabled: boolean;
  hasSeries: boolean;
}

interface DataSourceLegendItem {
  $type: 'DataSourceLegendItem';

  model: ModelInfo;
  enabled: boolean;

  forecasts: ForecastLegendItem[];
  shiftedForecasts: { origin: TruthToPlotSource, forecasts: ForecastLegendItem[] };
}

@Component({
  selector: 'app-legend',
  templateUrl: './legend.component.html',
  styleUrls: ['./legend.component.scss']
})
export class LegendComponent implements OnInit, AfterViewInit {
  dataContext$: Observable<{ plotValue: TruthToPlotValue, location: LocationLookupItem, ensembleModelNames: string[], allModelNames: string[], items: DataSourceLegendItem[], shiftToSource: TruthToPlotSource }>;
  TruthToPlotSource = TruthToPlotSource;
  TruthToPlotValue = TruthToPlotValue;

  icons = {
    left: faChevronLeft,
    right: faChevronRight,
    adjusted: faExclamationTriangle,
    visible: faEye,
    invisible: faEyeSlash,
    help: faQuestionCircle
  }

  scrollPostionStore = new Map<string, number>();

  constructor(private stateService: ForecastPlotService) { }

  ngOnInit(): void {
    this.dataContext$ = combineLatest([this.stateService.series$, this.stateService.availableModels$, this.stateService.enabledModelNames$, this.stateService.allModelNames$, this.stateService.shiftToSource$])
      .pipe(map(([series, availableModels, enabledSeriesNames, allModelNames, shiftToSource]) => {
        return {
          plotValue: series.settings.plotValue,
          location: series.settings.location,
          ensembleModelNames: ForecastPlotService.EnsembleModelNames,
          shiftToSource: shiftToSource,
          allModelNames: allModelNames,
          items: this._createLegendItems(availableModels, series.data, series.settings.shiftToSource, enabledSeriesNames)
        };
      }));
  }

  ngAfterViewInit(): void {

  }

  storeScrollPosition(scrollKey: string, scrollTop: number) {
    this.scrollPostionStore[scrollKey] = scrollTop;
  }

  private createForecastLegendItems(forecastModels: ModelInfo[], forecastSeries: SeriesInfo[], enabledSeriesNames: string[]) {
    return _.chain(forecastModels)
      // .orderBy(m => m.name)
      .map(m => {
        const hasSeries = forecastSeries.some(f => f.model.name === m.name && f.data && f.data.length > 0);
        let tooltipText = m.name;
        if (contributorsByModelName.has(m.name)) {
          const contrib = contributorsByModelName.get(m.name);
          tooltipText = `${m.name}: ${contrib.method}`;
        }

        if (kitModelsByModelName.has(m.name)) {
          const contrib = kitModelsByModelName.get(m.name);
          tooltipText = `${m.name}: ${contrib.method}`;
        }

        return {
          $type: 'ForecastLegendItem',
          model: m,
          tooltipText: tooltipText,
          enabled: enabledSeriesNames && enabledSeriesNames.indexOf(m.name) > -1,
          hasSeries: hasSeries
        } as ForecastLegendItem;
      })
      .value();
  }

  private _createLegendItems(availableModels: ModelInfo[], series: SeriesInfo[], shiftTo: TruthToPlotSource, enabledSeriesNames: string[]): DataSourceLegendItem[] {
    if (!series || series.length === 0) return [];
    const dataSourceSeries = series.filter(x => x.$type === 'DataSourceSeriesInfo') as DataSourceSeriesInfo[];
    const forecastSeries = series.filter(x => x.$type === 'ForecastDateSeriesInfo' || x.$type === 'ForecastHorizonSeriesInfo') as ForecastSeriesInfo[];

    return _.map(dataSourceSeries, x => {
      const ownModels = _.filter(availableModels, m => m.source === x.model.source);
      const shiftedForecasts = shiftTo && this.createForecastLegendItems(_.without(availableModels, ...ownModels), forecastSeries, enabledSeriesNames);
      // const isEnabled = enabledSeriesNames && enabledSeriesNames.indexOf(x.model.name) > -1;

      return {
        $type: 'DataSourceLegendItem',
        model: x.model,
        enabled: true,
        forecasts: this.createForecastLegendItems(ownModels, forecastSeries, enabledSeriesNames),
        shiftedForecasts: shiftedForecasts && shiftedForecasts.length > 0 && { forecasts: shiftedForecasts, origin: _.head(shiftedForecasts).model.source }
      };
    });
  }

  onMouseOver(item: LegendItem) {
    let highlight: ModelInfo[];
    if (item === null) {
      highlight = null;
    } else if (item.$type === 'DataSourceLegendItem') {
      highlight = [item.model, ...item.forecasts.concat(item.shiftedForecasts ? item.shiftedForecasts.forecasts : []).map(x => x.model)]
    } else {
      highlight = [item.model];
    }
    this.stateService.highlightedSeries = highlight;
  }

  toggleEnabled(item: LegendItem, dsItems: DataSourceLegendItem[]) {
    item.enabled = !item.enabled

    // if (item.$type === 'ForecastLegendItem' && item.enabled) {
    //   const parent = _.find(dsItems, d => d.forecasts.indexOf(item) > -1 || d.shiftedForecasts.forecasts.indexOf(item) > -1);
    //   parent.enabled = true;
    // }

    const enabledModelnames = item.enabled ? [item.model.name].concat(this.stateService.enabledModelNames) : this.stateService.enabledModelNames.filter(x => x !== item.model.name);
    this.stateService.enabledModelNames = enabledModelnames;
  }

  changeWhiteListing(whitelist: string[]) {
    this.stateService.enabledModelNames = whitelist || [];
  }

  changePlotValue(plotValue: TruthToPlotValue) {
    this.stateService.plotValue = plotValue;
  }

  changeLocation(location: LocationLookupItem) {
    this.stateService.userLocation = location;
  }

  changeShiftToSource(source: TruthToPlotSource) {
    this.stateService.shiftToSource = source;
  }

  // private _collectEnabledModels(rootItems: DataSourceLegendItem[]): ModelInfo[] {
  //   try {
  //     return _.filter(_.flatMap(rootItems, x => [<LegendItem>x].concat(x.forecasts).concat(x.shiftedForecasts ? x.shiftedForecasts.forecasts : [])), x => x.enabled).map(x => x.model);
  //   } catch (error) {
  //     return null;
  //   }

  // }
}
