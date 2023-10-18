import React, { Component, Fragment } from "react";
import PropTypes from "prop-types";
import classnames from "classnames";
import dayjs from "dayjs";
import intl from "react-intl-universal";
import Picker from "@seafile/seafile-calendar/lib/Picker";
import RangeCalendar from "@seafile/seafile-calendar/lib/RangeCalendar";
import { CELL_TYPE, FORMULA_RESULT_TYPE } from "dtable-sdk";
import DtableSelect from "./dtable-select";
import Switch from "./switch";
import { translateCalendar } from "../utils/seafile-calendar-translate";
import {
  SETTING_KEY,
  zIndexes,
  RECORD_END_TYPE,
  GRID_VIEWS,
  DATE_UNIT,
  DATE_FORMAT,
} from "../constants";

import "@seafile/seafile-calendar/assets/index.css";
import "../css/timeline-setting.css";
import { link } from "graceful-fs";

const RECORD_END_TYPES = [
  RECORD_END_TYPE.END_TIME,
  RECORD_END_TYPE.RECORD_DURATION,
];

const propTypes = {
  tables: PropTypes.array,
  views: PropTypes.array,
  dtable: PropTypes.object,
  columnIconConfig: PropTypes.object,
  selectedTable: PropTypes.object,
  selectedView: PropTypes.object,
  settings: PropTypes.object,
  gridStartDate: PropTypes.string,
  gridEndDate: PropTypes.string,
  selectedGridView: PropTypes.string,
  onModifyTimelineSettings: PropTypes.func,
  onHideTimelineSetting: PropTypes.func,
  updateDateRange: PropTypes.func,
};

class GanttSettings extends Component {
  constructor(props) {
    super(props);
    this.state = {
      dateRange: [dayjs(props.gridStartDate), dayjs(props.gridEndDate)],
    };
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    if (
      nextProps.gridStartDate !== this.props.gridStartDate ||
      nextProps.gridEndDate !== this.props.gridEndDate
    ) {
      this.setState({
        dateRange: [
          dayjs(nextProps.gridStartDate),
          dayjs(nextProps.gridEndDate),
        ],
      });
    }
  }

  getSelectorFields = () => {
    const { dtable, selectedView, selectedTable, columnIconConfig } =
      this.props;
    const columns = dtable.getViewShownColumns(selectedView, selectedTable);
    let dateFields = [];
    let numberFields = [];
    let colorFields = [];
    let labelFields = [];
    let linkFields = [];
    Array.isArray(columns) &&
      columns.forEach((column) => {
        const { type, name } = column;
        const columnOption = {
          name,
          value: name,
          iconClass: columnIconConfig[type],
        };
        switch (type) {
          case CELL_TYPE.TEXT:
          case CELL_TYPE.COLLABORATOR: {
            labelFields.push(columnOption);
            break;
          }
          case CELL_TYPE.DATE: {
            dateFields.push(columnOption);
            break;
          }
          case CELL_TYPE.FORMULA: {
            if (column.data.result_type === FORMULA_RESULT_TYPE.DATE) {
              dateFields.push(columnOption);
            }
            labelFields.push(columnOption);
            break;
          }
          case CELL_TYPE.LINK_FORMULA: {
            const { result_type, array_type } = column.data;
            if (
              result_type == CELL_TYPE.DATE ||
              (result_type == FORMULA_RESULT_TYPE.ARRAY &&
                array_type == CELL_TYPE.DATE)
            ) {
              dateFields.push(columnOption);
            }
            labelFields.push(columnOption);
            break;
          }
          case CELL_TYPE.NUMBER: {
            numberFields.push(columnOption);
            break;
          }
          case CELL_TYPE.SINGLE_SELECT: {
            labelFields.push(columnOption);
            colorFields.push(columnOption);
            break;
          }
          case CELL_TYPE.LINK: {
            linkFields.push(columnOption);
            break;
          }
          default: {
            break;
          }
        }
      });
    return { dateFields, numberFields, colorFields, labelFields, linkFields };
  };

  createOptions(source, settingKey, valueKey) {
    if (!Array.isArray(source)) {
      return [];
    }
    return source.map((item) => ({
      value: item[valueKey],
      setting_key: settingKey,
      label: (
        <Fragment>
          {item.iconClass && (
            <span className="header-icon">
              <i className={item.iconClass}></i>
            </span>
          )}
          <span className="select-module select-module-name">{item.name}</span>
        </Fragment>
      ),
    }));
  }

  renderSelector = (options, settingKey) => {
    const { settings } = this.props;
    let selectedOption = options.find(
      (item) => item.value === settings[settingKey]
    );
    if (!selectedOption) {
      if (
        settingKey === SETTING_KEY.TABLE_NAME ||
        settingKey === SETTING_KEY.VIEW_NAME ||
        settingKey === SETTING_KEY.LABEL_COLUMN_NAME
      ) {
        selectedOption = options[0];
      }
    }
    return (
      <DtableSelect
        classNamePrefix={"timeline-view-setting-selector"}
        value={selectedOption}
        options={options}
        onChange={this.onModifySettings}
      />
    );
  };

  renderColorSelector = (options) => {
    const { settings } = this.props;
    const { colored_by_row_color, single_select_column_name } = settings;
    let selectedOption;
    if (colored_by_row_color) {
      selectedOption = options.find(
        (option) => option.setting_key === SETTING_KEY.COLORED_BY_ROW_COLOR
      );
    } else {
      selectedOption = options.find(
        (option) => option.value === single_select_column_name
      );
    }
    if (!selectedOption) {
      selectedOption = options[0];
    }
    return (
      <DtableSelect
        classNamePrefix={"timeline-view-setting-selector"}
        value={selectedOption}
        options={options}
        onChange={this.onSelectColoredBy}
      />
    );
  };

  renderRecordEndType = () => {
    const { settings } = this.props;
    let { record_end_type } = settings;
    record_end_type = record_end_type || RECORD_END_TYPE.END_TIME;
    return RECORD_END_TYPES.map((r) => {
      const title = r === RECORD_END_TYPE.END_TIME ? "End_date" : "Duration";
      return (
        <div
          key={`record_end_type_${r}`}
          onClick={() => this.onChangeRecordEndType(r)}
          className={classnames({
            "record-end-type-item": true,
            selected: r === record_end_type,
          })}
        >
          <span>{intl.get(title)}</span>
        </div>
      );
    });
  };

  renderRecordEndItem = (endDateFieldOptions, numberFieldOptions) => {
    return (
      <div className="setting-item end-time">
        {this.renderSelector(
          endDateFieldOptions,
          SETTING_KEY.END_TIME_COLUMN_NAME
        )}
      </div>
    );
  };

  onModifySettings = (selectedOption, evt) => {
    let { settings } = this.props;
    let { setting_key, value } = selectedOption;
    let updated;
    if (setting_key === SETTING_KEY.TABLE_NAME) {
      updated = { [setting_key]: value }; // Need init settings after select new table.
    } else {
      updated = Object.assign({}, settings, { [setting_key]: value });
    }
    this.props.onModifyTimelineSettings(updated);
  };

  onChangeRecordEndType = (recordEndType) => {
    const updated = { [SETTING_KEY.RECORD_END_TYPE]: recordEndType };
    this.props.onModifyTimelineSettings(
      Object.assign({}, this.props.settings, updated)
    );
  };

  onSelectColoredBy = (selectedOption) => {
    const { setting_key, value } = selectedOption;
    let update = {};
    if (setting_key === SETTING_KEY.COLORED_BY_ROW_COLOR) {
      update[SETTING_KEY.COLORED_BY_ROW_COLOR] = true;
      update[SETTING_KEY.SINGLE_SELECT_COLUMN_NAME] = null;
    } else {
      update[SETTING_KEY.COLORED_BY_ROW_COLOR] = false;
      update[SETTING_KEY.SINGLE_SELECT_COLUMN_NAME] = value;
    }
    this.props.onModifyTimelineSettings(
      Object.assign({}, this.props.settings, update)
    );
  };

  renderDatePicker = () => {
    const { dateRange } = this.state;
    return (
      <Picker
        value={dateRange}
        calendar={this.renderRangeCalendar()}
        style={{ zIndex: zIndexes.RC_CALENDAR }}
        onOpenChange={this.onOpenChange}
        onChange={this.onDatePickerChange}
      >
        {({ value }) => {
          return (
            <span>
              <input
                readOnly
                className="ant-calendar-picker-input ant-input"
                value={
                  value && value[0] && value[1]
                    ? `${value[0].format("YYYY")} - ${value[1].format("YYYY")}`
                    : ""
                }
              />
            </span>
          );
        }}
      </Picker>
    );
  };

  renderRangeCalendar = () => {
    const { dateRange } = this.state;
    return (
      <RangeCalendar
        className={"timeline-date-range-calendar"}
        locale={translateCalendar()}
        showToday={false}
        mode={[DATE_UNIT.YEAR, DATE_UNIT.YEAR]}
        format={DATE_FORMAT.YEAR}
        defaultValue={dateRange}
        onPanelChange={this.onChangeSelectedRangeDates}
      />
    );
  };

  disabledDate = (current) => {
    const { dateRange } = this.state;
    if (!dateRange || dateRange.length === 0) {
      return false;
    }
    const tooLate =
      dateRange[0] && current.diff(dateRange[0], DATE_UNIT.YEAR) > 3;
    const tooEarly =
      dateRange[1] && dateRange[1].diff(current, DATE_UNIT.YEAR) > 3;
    return tooEarly || tooLate;
  };

  onDatePickerChange = (dates) => {
    this.setState({ dateRange: dates });
  };

  onChangeSelectedRangeDates = (dates) => {
    this.setState({ dateRange: dates });
  };

  onOpenChange = (open) => {
    if (!open) {
      const { dateRange } = this.state;
      const { selectedGridView, gridStartDate, gridEndDate } = this.props;

      // not changed.
      if (
        dateRange[0].isSame(gridStartDate) &&
        dateRange[1].isSame(gridEndDate)
      ) {
        return;
      }

      // not allowed date range.
      const startDate = dateRange[0]
        .startOf(DATE_UNIT.YEAR)
        .format(DATE_FORMAT.YEAR_MONTH_DAY);
      const endDate = dateRange[1]
        .endOf(DATE_UNIT.YEAR)
        .format(DATE_FORMAT.YEAR_MONTH_DAY);
      const diffs = dateRange[1].diff(dateRange[0], DATE_UNIT.YEAR);
      if (
        (selectedGridView === GRID_VIEWS.YEAR && diffs < 2) ||
        ((selectedGridView === GRID_VIEWS.QUARTER ||
          selectedGridView === GRID_VIEWS.MONTH ||
          selectedGridView === GRID_VIEWS.WEEK ||
          selectedGridView === GRID_VIEWS.DAY) &&
          dateRange[1].isBefore(dateRange[0]))
      ) {
        const { gridStartDate, gridEndDate } = this.props;
        this.setState({
          dateRange: [dayjs(gridStartDate), dayjs(gridEndDate)],
        });
        return;
      }

      this.props.updateDateRange(startDate, endDate);
    }
  };

  onTimelineSettingClick = (evt) => {
    evt.stopPropagation();
  };

  onToggleDisplayInOneLine = (evt) => {
    const updated = { [SETTING_KEY.DISPLAY_AS_SWIMLANE]: evt.target.checked };
    this.props.onModifyTimelineSettings(
      Object.assign({}, this.props.settings, updated)
    );
  };

  getSelectorOptions = () => {
    const { tables, views } = this.props;
    const { dateFields, numberFields, colorFields, labelFields, linkFields } =
      this.getSelectorFields();
    const tableOptions = this.createOptions(
      tables,
      SETTING_KEY.TABLE_NAME,
      "name"
    );
    const viewOptions = this.createOptions(
      views,
      SETTING_KEY.VIEW_NAME,
      "name"
    );
    const startDateFieldOptions = this.createOptions(
      dateFields,
      SETTING_KEY.START_TIME_COLUMN_NAME,
      "value"
    );
    const endDateFieldOptions = this.createOptions(
      dateFields,
      SETTING_KEY.END_TIME_COLUMN_NAME,
      "value"
    );
    const linkFieldOptions = this.createOptions(
      linkFields,
      SETTING_KEY.LINK_CELL_COLUMN_NAME,
      "value"
    );
    const numberFieldOptions = this.createOptions(
      numberFields,
      SETTING_KEY.RECORD_DURATION_COLUMN_NAME,
      "value"
    );
    const colorFieldOptions = this.createOptions(
      colorFields,
      SETTING_KEY.SINGLE_SELECT_COLUMN_NAME,
      "value"
    );
    colorFieldOptions.unshift({
      value: "plugin_timeline_row_color",
      setting_key: SETTING_KEY.COLORED_BY_ROW_COLOR,
      label: (
        <span className={"select-module select-module-name"}>
          {intl.get("Row_color")}
        </span>
      ),
    });
    if (colorFieldOptions.length) {
      colorFieldOptions.unshift({
        value: "",
        setting_key: SETTING_KEY.SINGLE_SELECT_COLUMN_NAME,
        label: (
          <span className={"select-module select-module-name null-option-name"}>
            {intl.get("Not_used")}
          </span>
        ),
      });
    }
    const labelFieldOptions = this.createOptions(
      labelFields,
      SETTING_KEY.LABEL_COLUMN_NAME,
      "value"
    );
    labelFieldOptions.unshift({
      value: "",
      setting_key: SETTING_KEY.LABEL_COLUMN_NAME,
      label: (
        <span className={"select-module select-module-name null-option-name"}>
          {intl.get("Not_used")}
        </span>
      ),
    });
    return {
      tableOptions,
      viewOptions,
      startDateFieldOptions,
      endDateFieldOptions,
      numberFieldOptions,
      linkFieldOptions,
      colorFieldOptions,
      labelFieldOptions,
    };
  };

  isGroupView = () => {
    const { dtable, selectedTable, selectedView } = this.props;
    if (!selectedTable || !selectedView) {
      return false;
    }
    return dtable.isGroupView(selectedView, selectedTable.columns);
  };

  render() {
    const {
      tableOptions,
      viewOptions,
      startDateFieldOptions,
      endDateFieldOptions,
      numberFieldOptions,
      linkFieldOptions,
      colorFieldOptions,
      labelFieldOptions,
    } = this.getSelectorOptions();
    const isGroupView = this.isGroupView();
    return (
      <div
        className="plugin-timeline-setting"
        style={{ zIndex: zIndexes.TIMELINE_SETTING }}
        ref={(ref) => (this.timelineSetting = ref)}
        onClick={this.onTimelineSettingClick}
      >
        <div className="setting-container">
          <div className="setting-header">
            <div className="setting-header-container">
              <h3 className="h5 m-0">{intl.get("Settings")}</h3>
              <i
                className="dtable-font dtable-icon-x btn-close"
                onClick={this.props.onHideTimelineSetting}
              ></i>
            </div>
          </div>
          <div className="setting-body">
            <div className="setting-list">
              <div className="setting-item table-setting">
                <div className="title">{intl.get("Table")}</div>
                {this.renderSelector(tableOptions, SETTING_KEY.TABLE_NAME)}
              </div>
              <div className="setting-item view-setting">
                <div className="title">{intl.get("View")}</div>
                {this.renderSelector(viewOptions, SETTING_KEY.VIEW_NAME)}
              </div>
              <div className="setting-item start-time">
                <div className="title">Label</div>
                {this.renderSelector(
                  labelFieldOptions,
                  SETTING_KEY.LABEL_COLUMN_NAME
                )}
              </div>
              <div className="split-line"></div>
              <div className="setting-item start-time">
                <div className="title">Start</div>
                {this.renderSelector(
                  startDateFieldOptions,
                  SETTING_KEY.START_TIME_COLUMN_NAME
                )}
              </div>
              <div className="setting-item end-time">
                <div className="title">Finish</div>
                {this.renderSelector(
                  endDateFieldOptions,
                  SETTING_KEY.END_TIME_COLUMN_NAME
                )}
              </div>
              <div className="split-line"></div>
              <div className="setting-item end-time">
                <div className="title">Link</div>
                {this.renderSelector(
                  linkFieldOptions,
                  SETTING_KEY.LINK_CELL_COLUMN_NAME
                )}
              </div>
              <div className="setting-item date-range">
                <div className="title">{intl.get("Date_range")}</div>
                <div className="btn-date-range">{this.renderDatePicker()}</div>
              </div>
              {isGroupView && (
                <>
                  <div className="split-line"></div>
                  <Switch
                    checked={
                      this.props.settings[SETTING_KEY.DISPLAY_AS_SWIMLANE]
                    }
                    placeholder={intl.get("Display_as_swimlane_mode")}
                    onChange={this.onToggleDisplayInOneLine}
                  />
                </>
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }
}

GanttSettings.propTypes = propTypes;

export default GanttSettings;
