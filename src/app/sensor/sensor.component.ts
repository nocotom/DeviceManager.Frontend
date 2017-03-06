import { Component, NgZone, Input } from '@angular/core';
import { MessageBus } from '../shared/messaging/message-bus';
import { DeviceComponent } from '../device/device.component';
import { Events, MeasurementOccured } from '../device/models';
import { MeasurementsRepository, QueryDescriptor, OrderType } from './measurements-repository';
import { DateRange } from './date-range.directive';
import { Point } from './line-chart.directive';

@Component({
    selector: 'dm-sensor',
    templateUrl: './sensor.component.html'
})
export class SensorComponent extends DeviceComponent {

    @Input()
    private measurementUnit: string;

    private dateRange: DateRange = new DateRange(() => new Date(), () => new Date(), "Any");
    private points: Array<Point> = [];
    private lastMeasurement: any;

    constructor(private repository: MeasurementsRepository, messageBus: MessageBus, zone: NgZone) {
        super(messageBus, zone);
        this.handlersMap.set(Events.MeasurementOccured, data => this.handleMeasurment(data));
    }

    dateRangeSelected(dateRange: DateRange) {
        this.dateRange = dateRange;
        let queries: Array<QueryDescriptor> = [];
        queries.push({ deviceId: this.device.deviceId, dateFrom: dateRange.startDate, dateTo: dateRange.endDate });
        queries.push({ deviceId: this.device.deviceId, order: OrderType.Descending, limit: 1 });
        this.repository.getMeasurements(queries).subscribe(
            result => {
                this.evaluatePoints(result[0].points.map<Point>(point => { return { x: point.timestamp, y: point.value } }))
                this.lastMeasurement = result[1].points[0];
            },
            error => console.log("Cannot get measurements from repository."));
    }

    private evaluatePoints(points: Array<Point>) {
        this.points = points.filter(point => this.dateRange.startDate <= point.x && this.dateRange.endDate >= point.x);
    }

    private handleMeasurment(measurement: MeasurementOccured) {
        let points = measurement.points.map<Point>(point => { return { x: point.timestamp, y: point.value } });
        points.push(...this.points);
        this.evaluatePoints(points);
        this.lastMeasurement = measurement.points.sort((p1, p2) => p1.timestamp > p2.timestamp ? -1 : 1 )[0];
    }
}