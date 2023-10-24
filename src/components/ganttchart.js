import React, { Fragment } from "react";
import PropTypes from "prop-types";
import dayjs from "dayjs";
import html2canvas from "html2canvas";
import GanttSettings from "./gantt-setting";
import Toolbar from "./toolbar";
import VIEWS from "./grid-views";
import SelectExportDateRangeDialog from "./dialog/select-export-date-range-dialog";
import { dates, getDtableUuid } from "../utils";
import {
  PLUGIN_NAME,
  NAVIGATE,
  GRID_VIEWS,
  DATE_FORMAT,
  DATE_UNIT,
} from "../constants";
import * as EventTypes from "../constants/event-types";
import { ExportViewGenerator } from "./export/export-view-generator";

import {
  Gantt,
  Task,
  EventOption,
  StylingOption,
  ViewMode,
  DisplayOption,
} from "gantt-task-react";

import "gantt-task-react/dist/index.css";

const KEY_SELECTED_GRID_VIEWS = `${PLUGIN_NAME}-selectedGridViews`;

class Ganttchart extends React.Component {
  constructor(props) {
    super(props);
    this.gridViews = this.getGridViews();
    this.state = {
      isShowUsers: true,
      selectedGridView: this.getSelectedGridView(
        props.selectedTimelineView._id
      ),
      selectedDate: dates.getToday(DATE_FORMAT.YEAR_MONTH_DAY),
      changedSelectedByScroll: false,
      canScrollToLeft: true,
      canScrollToRight: true,
      canNavigateToday: true,
      isShowSelectExportDateRangeDialog: false,
      isExporting: false,
      isAfterDelay: false,
      ...this.getInitDateRange(props.settings),
    };
  }

  componentDidMount() {
    this.timer = setTimeout(() => {
      this.setState({ isAfterDelay: true });
      clearTimeout(this.timer);
      this.timer = null;
    }, 300);
  }

  UNSAFE_componentWillReceiveProps(nextProps) {
    let { selectedTimelineView: oldSelectedTimelineView } = this.props;
    let { selectedTimelineView, settings } = nextProps;
    if (
      selectedTimelineView &&
      oldSelectedTimelineView !== selectedTimelineView
    ) {
      let selectedGridView = this.getSelectedGridView(selectedTimelineView._id);
      let initDateRange = this.getInitDateRange(settings);
      this.setState(
        {
          selectedGridView,
          selectedDate: dates.getToday(DATE_FORMAT.YEAR_MONTH_DAY),
          changedSelectedByScroll: false,
          ...initDateRange,
        },
        () => {
          this.onResetViewportScroll();
        }
      );
    }
  }

  getInitDateRange = (settings) => {
    const { gridStartDate, gridEndDate } = settings || {};
    if (gridStartDate && gridEndDate) {
      return { gridStartDate, gridEndDate };
    }
    return {
      gridStartDate: dayjs()
        .subtract(2, DATE_UNIT.YEAR)
        .startOf(DATE_UNIT.YEAR)
        .format(DATE_FORMAT.YEAR_MONTH_DAY),
      gridEndDate: dayjs()
        .add(2, DATE_UNIT.YEAR)
        .endOf(DATE_UNIT.YEAR)
        .format(DATE_FORMAT.YEAR_MONTH_DAY),
    };
  };

  getSelectedGridViews = () => {
    let selectedGridViews = window.localStorage.getItem(
      KEY_SELECTED_GRID_VIEWS
    );
    return selectedGridViews ? JSON.parse(selectedGridViews) : {};
  };

  storeSelectedGridViews = (gridView) => {
    let { selectedTimelineView } = this.props;
    let viewId = selectedTimelineView._id;
    let dtableUuid = getDtableUuid();
    let selectedGridViews = this.getSelectedGridViews();
    selectedGridViews[`${dtableUuid}-${viewId}`] = gridView;
    window.localStorage.setItem(
      KEY_SELECTED_GRID_VIEWS,
      JSON.stringify(selectedGridViews)
    );
  };

  getSelectedGridView = (viewId) => {
    let dtableUuid = getDtableUuid();
    let localGridViews = this.getSelectedGridViews();
    let localGridView = localGridViews[`${dtableUuid}-${viewId}`];
    if (!localGridView || !this.gridViews[localGridView]) {
      return GRID_VIEWS.MONTH;
    }
    return localGridView;
  };

  onShowUsersToggle = () => {
    this.setState({ isShowUsers: !this.state.isShowUsers });
  };

  onSelectGridView = (selectedGridView) => {
    if (selectedGridView === this.state.selectedGridView) {
      return;
    }

    this.setState(
      {
        selectedGridView,
      },
      () => {
        this.storeSelectedGridViews(selectedGridView);
        this.onResetViewportScroll();
      }
    );
  };

  setupGantt = (dtable, selectedTable, selectedView, settings) => {
    if (!settings) {
      settings = {
        table_name: "",
        start_time_column_name: "",
        end_time_column_name: "",
        record_end_type: "",
        label_column_name: "",
        link_cell_column_name: "",
      };
    }

    let subtables = dtable.getTables();
    let collaborators = dtable.getRelatedUsers();

    let table = dtable.getTableByName(settings.table_name);

    if (!table) {
      table = dtable.getActiveTable();
    }

    const columnNameInfo = settings.label_column_name
      ? dtable.getColumnByName(table, settings.label_column_name)
      : null;

    const columnFinishInfo = settings.end_time_column_name
      ? dtable.getColumnByName(table, settings.end_time_column_name)
      : null;

    const columnStartInfo = settings.start_time_column_name
      ? dtable.getColumnByName(table, settings.start_time_column_name)
      : null;

    const columnLinkInfo = settings.link_cell_column_name
      ? dtable.getColumnByName(table, settings.link_cell_column_name)
      : null;

    const columnName = columnNameInfo ? columnNameInfo.key : "";
    const columnFinish = columnFinishInfo ? columnFinishInfo.key : "";
    const columnStart = columnStartInfo ? columnStartInfo.key : "";
    const columnLink = columnLinkInfo ? columnLinkInfo.key : "";

    const view = dtable.getViewByName(table, selectedView);
    const rows = dtable.getViewRows(view, table);
    const findLinkRows = rows.slice(0, 5);
    const links = dtable.getTableLinkRows(findLinkRows, table);

    const tasks = rows.map((row, index) => {
      const startDate = columnStart ? new Date(row[columnStart]) : new Date();
      const endDate = columnFinish ? new Date(row[columnFinish]) : new Date();

      if (!columnName || !columnFinish || !columnStart) {
        // If any of the specified variables is empty, return an empty object
        return {
          start: new Date(),
          end: new Date(),
          name: columnName ? row[columnName] : "",
          id: index,
          progress: 0,
          dependencies: [],
          type: "task",
          project: "",
        };
      }

      return {
        start: startDate,
        end: endDate,
        name: row[columnName],
        id: row._id,
        progress: 0,
        dependencies: columnLink ? links[row._id][columnLink] : [],
        type: "task",
        project: "ProjectSample",
      };
    });

    // Create a new milestone task
    // const milestoneTask = {
    //   start: new Date(),
    //   end: new Date(),
    //   name: "Milestone",
    //   id: "milestone-1", // You can use any unique identifier for the milestone
    //   progress: 0,
    //   dependencies: [], // Milestones typically have no dependencies
    //   type: "milestone",
    //   project: "ProjectSample",
    // };

    // // Add the milestone task to the end of the tasks array
    // tasks.push(milestoneTask);

    return tasks;
  };

  onNavigate = (action) => {
    let { selectedDate, selectedGridView } = this.state;
    let todayDate = dates.getToday(DATE_FORMAT.YEAR_MONTH_DAY);
    selectedDate = selectedDate || todayDate;
    let calcDateUnit;
    if (selectedGridView === GRID_VIEWS.YEAR) {
      calcDateUnit = DATE_UNIT.YEAR;
    } else if (selectedGridView === GRID_VIEWS.QUARTER) {
      calcDateUnit = DATE_UNIT.QUARTER;
    } else if (
      selectedGridView === GRID_VIEWS.MONTH ||
      selectedGridView === GRID_VIEWS.WEEK ||
      selectedGridView === GRID_VIEWS.DAY
    ) {
      calcDateUnit = DATE_UNIT.MONTH;
    }
    if (action === NAVIGATE.PREVIOUS) {
      if (!this.state.canScrollToLeft) {
        return;
      }
      selectedDate = dayjs(selectedDate)
        .subtract(1, calcDateUnit)
        .format(DATE_FORMAT.YEAR_MONTH_DAY);
    } else if (action === NAVIGATE.NEXT && this.state.canScrollToRight) {
      if (!this.state.canScrollToRight) {
        return;
      }
      selectedDate = dayjs(selectedDate)
        .add(1, calcDateUnit)
        .format(DATE_FORMAT.YEAR_MONTH_DAY);
    } else if (action === NAVIGATE.TODAY) {
      selectedDate = todayDate;
    }
    if (selectedDate !== this.state.selectedDate) {
      this.updateSelectedDate(selectedDate, false);
    }
  };

  updateSelectedDate = (selectedDate, changedSelectedByScroll) => {
    this.setState({ selectedDate, changedSelectedByScroll });
  };

  isToday = () => {
    let { selectedDate, selectedGridView } = this.state;
    let today = dayjs();
    let yearOfSelectedDate = dayjs(selectedDate).year();
    let yearOfToday = today.year();
    if (selectedGridView === GRID_VIEWS.YEAR) {
      return yearOfSelectedDate === yearOfToday;
    }
    if (
      selectedGridView === GRID_VIEWS.QUARTER ||
      selectedGridView === GRID_VIEWS.MONTH ||
      selectedGridView === GRID_VIEWS.WEEK ||
      selectedGridView === GRID_VIEWS.DAY
    ) {
      let monthOfSelectedDate = dayjs(selectedDate).month();
      let monthOfToday = today.month();
      return (
        yearOfSelectedDate === yearOfToday &&
        monthOfSelectedDate === monthOfToday
      );
    }
    return false;
  };

  onResetViewportScroll = () => {
    this.props.eventBus.dispatch(EventTypes.RESET_VIEWPORT_SCROLL_TOP);
  };

  getGridViews = () => {
    const views = Object.values(GRID_VIEWS);
    let viewObject = {};
    views.forEach((v) => {
      viewObject[v] = VIEWS[v];
    });
    return viewObject;
  };

  getGridView = (selectedGridView) => {
    return this.gridViews[selectedGridView];
  };

  onViewportRightScroll = (
    viewportRightScrollLeft,
    viewportRightWidth,
    viewportRightScrollWidth
  ) => {
    const { canScrollToLeft, canScrollToRight } = this.state;
    if (canScrollToLeft && viewportRightScrollLeft <= 0) {
      this.setState({ canScrollToLeft: false });
    } else if (!canScrollToLeft && viewportRightScrollLeft > 0) {
      this.setState({ canScrollToLeft: true });
    }
    if (
      canScrollToRight &&
      viewportRightScrollWidth - viewportRightWidth - viewportRightScrollLeft <=
        0
    ) {
      this.setState({ canScrollToRight: false });
    } else if (
      !canScrollToRight &&
      viewportRightScrollWidth - viewportRightWidth - viewportRightScrollLeft >
        0
    ) {
      this.setState({ canScrollToRight: true });
    }
  };

  updateDateRange = (gridStartDate, gridEndDate) => {
    const { selectedGridView } = this.state;
    const viewport = window.timelineViewport;
    const days = dayjs(gridEndDate).diff(gridStartDate, DATE_UNIT.DAY);
    const middleDate = dayjs(gridStartDate)
      .add(Math.floor(days / 2), DATE_UNIT.DAY)
      .format(DATE_FORMAT.YEAR_MONTH_DAY);
    const today = dates.getToday(DATE_FORMAT.YEAR_MONTH_DAY);
    const canNavigateToday =
      dates.isDateInRange(today, gridStartDate, gridEndDate) &&
      viewport.viewportRight.canNavigateToday(
        selectedGridView,
        today,
        gridStartDate,
        gridEndDate
      );
    this.props.onModifyTimelineSettings(
      Object.assign({}, this.props.settings, { gridStartDate, gridEndDate })
    );
    this.setState({
      gridStartDate,
      gridEndDate,
      canNavigateToday,
      selectedDate: middleDate,
    });
  };

  onExportAsImage = () => {
    this.setState({ isShowSelectExportDateRangeDialog: true });
  };

  onSelectDateRangeToggle = () => {
    this.setState({
      isExporting: false,
      isShowSelectExportDateRangeDialog:
        !this.state.isShowSelectExportDateRangeDialog,
    });
  };

  onConfirmExport = (gridStartDate, gridEndDate) => {
    const { isShowUsers, selectedGridView, selectedDate } = this.state;
    const GridView = this.gridViews[selectedGridView];
    this.setState({ isExporting: true });
    ExportViewGenerator({
      isShowUsers,
      selectedGridView,
      selectedDate,
      gridStartDate,
      gridEndDate,
      GridView,
      ...this.props,
    });
    setTimeout(() => {
      const ele = document.querySelector(
        "#timeline-export-container .timeline-container"
      );
      if (!ele) return;
      html2canvas(ele, {
        windowWidth: ele.scrollWidth,
        windowHeight: ele.scrollHeight,
        ignoreElements: (element) => {
          if (element.tagName === "IFRAME") return true;
          return false;
        },
      }).then((canvas) => {
        this.setState({
          isExporting: false,
          isShowSelectExportDateRangeDialog: false,
        });
        let eleA = document.createElement("a");
        eleA.href = canvas.toDataURL("image/png");
        eleA.download = `${this.props.selectedTimelineView.name}.png`;
        eleA.click();
        document.body.removeChild(
          document.querySelector("#timeline-export-container")
        );
      });
    });
  };

  render() {
    const {
      isShowUsers,
      selectedGridView,
      selectedDate,
      changedSelectedByScroll,
      gridStartDate,
      gridEndDate,
      canNavigateToday,
      isShowSelectExportDateRangeDialog,
      isExporting,
      isAfterDelay,
    } = this.state;
    const {
      tables,
      views,
      isShowGanttChartSetting,
      settings,
      rows,
      columns,
      isGroupView,
      groups,
      collaborators,
    } = this.props;
    const GridView = this.gridViews[selectedGridView];
    const isToday = this.isToday();
    let task2 = this.setupGantt(
      this.props.dtable,
      tables,
      this.props.selectedView.name,
      settings
    );
    return (
      <div
        className="timeline-container o-hidden"
        ref={(ref) => (this.timeline = ref)}
      >
        {isAfterDelay && (
          <Fragment>
            <Gantt
              tasks={task2}
              onExpanderClick={this.handleExpanderClick}
              listCellWidth={"155px"}
              barBackgroundColor="blue"
              rowHeight={40}
              fontSize={12}
            />
          </Fragment>
        )}
        {isShowGanttChartSetting && (
          <GanttSettings
            tables={tables}
            views={views}
            dtable={this.props.dtable}
            columnIconConfig={this.props.columnIconConfig}
            selectedTable={this.props.selectedTable}
            selectedView={this.props.selectedView}
            selectedGridView={selectedGridView}
            settings={settings}
            gridStartDate={gridStartDate}
            gridEndDate={gridEndDate}
            onModifyTimelineSettings={this.props.onModifyTimelineSettings}
            onHideTimelineSetting={this.props.onHideTimelineSetting}
            updateDateRange={this.updateDateRange}
          />
        )}
        {isShowSelectExportDateRangeDialog && (
          <SelectExportDateRangeDialog
            isExporting={isExporting}
            onSelectDateRangeToggle={this.onSelectDateRangeToggle}
            onConfirmExportDateRange={this.onConfirmExport}
          />
        )}
      </div>
    );
  }
}

Ganttchart.propTypes = {
  tableID: PropTypes.string,
  collaborators: PropTypes.array,
  formulaRows: PropTypes.object,
  tables: PropTypes.array,
  views: PropTypes.array,
  dtable: PropTypes.object,
  selectedTimelineView: PropTypes.object,
  selectedTable: PropTypes.object,
  selectedView: PropTypes.object,
  rows: PropTypes.array,
  isGroupView: PropTypes.bool,
  groups: PropTypes.array,
  columns: PropTypes.array,
  columnIconConfig: PropTypes.object,
  settings: PropTypes.object,
  isShowTimelineSetting: PropTypes.bool,
  eventBus: PropTypes.object,
  onModifyTimelineSettings: PropTypes.func,
  onHideTimelineSetting: PropTypes.func,
  onRowExpand: PropTypes.func,
  onTimelineSettingToggle: PropTypes.func,
  onModifyRow: PropTypes.func,
};

export default Ganttchart;
