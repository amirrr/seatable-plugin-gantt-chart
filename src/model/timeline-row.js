export default class TimelineRow {

  constructor(object = {}) {
    this.min_date = object.min_date || '';
    this.max_date = object.max_date || '';
    this.events = object.events || [];
  }
}
